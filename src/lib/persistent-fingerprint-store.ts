/**
 * NigWrite - Persistent Fingerprint Store
 * Database-backed replacement for the in-memory fingerprint store.
 * Seeds the corpus from the original hardcoded documents on first init.
 */

import { PrismaClient } from '@prisma/client';
import { WinnowingEngine } from './winnowing-engine';
import { CORPUS_DOCUMENTS } from './corpus-data';

export interface FingerprintEntry {
  hash: number;
  documentId: string;
  position: number;
  ngram: string;
  sourceTitle: string;
  sourceUrl?: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
}

// Map corpus document IDs to disciplines
const DISCIPLINE_MAP: Record<string, string> = {
  'cs-': 'Computer Science',
  'med-': 'Medicine & Health',
  'env-': 'Environmental Science',
  'soc-': 'Social Sciences',
  'biz-': 'Business & Economics',
  'edu-': 'Education',
  'eng-': 'Engineering',
  'hist-': 'History & Culture',
  'law-': 'Law & Politics',
  'agr-': 'Agriculture',
  'student-': 'Student Papers',
};

function getDiscipline(id: string): string {
  for (const [prefix, discipline] of Object.entries(DISCIPLINE_MAP)) {
    if (id.startsWith(prefix)) return discipline;
  }
  return 'Other';
}

function getSourceType(id: string): 'publication' | 'internet' | 'student_paper' {
  if (id.startsWith('student-')) return 'student_paper';
  return 'publication';
}

class PersistentFingerprintStore {
  private prisma: PrismaClient;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize: seed the corpus if not already seeded.
   * Thread-safe via promise deduplication.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this._initialize();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _initialize(): Promise<void> {
    try {
      // Check if corpus documents exist
      const count = await this.prisma.sourceDocument.count({
        where: { isUserDocument: false },
      });

      if (count === 0) {
        console.log('[NigWrite] Seeding corpus into database...');
        await this.seedCorpus();
        console.log('[NigWrite] Corpus seeding complete.');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[NigWrite] Failed to initialize fingerprint store:', error);
      throw error;
    }
  }

  /**
   * Seed all academic documents from the original hardcoded corpus.
   */
  private async seedCorpus(): Promise<void> {
    const engine = new WinnowingEngine();
    const batchSize = 100; // documents per batch

    for (let i = 0; i < CORPUS_DOCUMENTS.length; i += batchSize) {
      const batch = CORPUS_DOCUMENTS.slice(i, i + batchSize);

      for (const doc of batch) {
        try {
          const discipline = getDiscipline(doc.id);
          const sourceType = getSourceType(doc.id);

          // Create the SourceDocument record
          const sourceDocument = await this.prisma.sourceDocument.create({
            data: {
              externalId: doc.id,
              title: doc.title,
              content: doc.content,
              sourceType,
              sourceUrl: doc.url,
              discipline,
              isUserDocument: false,
            },
          });

          // Generate fingerprints for this document
          const fingerprints = engine.generateFingerprints(doc.content);

          if (fingerprints.length > 0) {
            // Batch insert fingerprints (createMany in chunks of 500)
            const fpBatchSize = 500;
            for (let j = 0; j < fingerprints.length; j += fpBatchSize) {
              const fpBatch = fingerprints.slice(j, j + fpBatchSize);
              await this.prisma.fingerprint.createMany({
                data: fpBatch.map(fp => ({
                  hashValue: fp.hash,
                  documentId: sourceDocument.id,
                  position: fp.position,
                  ngram: fp.ngram,
                })),
              });
            }
          }
        } catch (error) {
          console.error(`[NigWrite] Failed to seed document ${doc.id}:`, error);
        }
      }

      console.log(`[NigWrite] Seeded ${Math.min(i + batchSize, CORPUS_DOCUMENTS.length)}/${CORPUS_DOCUMENTS.length} documents`);
    }
  }

  /**
   * Search fingerprints by hash values — THE CRITICAL LOOKUP.
   * Returns a map of hash -> FingerprintEntry[].
   */
  async search(hashes: number[]): Promise<Map<number, FingerprintEntry[]>> {
    const matches = new Map<number, FingerprintEntry[]>();
    if (hashes.length === 0) return matches;

    // Query in batches of 100 to avoid SQLite limits
    const batchSize = 100;
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize);

      const fingerprints = await this.prisma.fingerprint.findMany({
        where: {
          hashValue: { in: batch },
        },
        include: {
          document: true,
        },
      });

      for (const fp of fingerprints) {
        const entry: FingerprintEntry = {
          hash: fp.hashValue,
          documentId: fp.document.externalId,
          position: fp.position,
          ngram: fp.ngram,
          sourceTitle: fp.document.title,
          sourceUrl: fp.document.sourceUrl || undefined,
          sourceType: fp.document.sourceType as 'internet' | 'publication' | 'student_paper',
        };

        const existing = matches.get(fp.hashValue) || [];
        existing.push(entry);
        matches.set(fp.hashValue, existing);
      }
    }

    return matches;
  }

  /**
   * Add a user-submitted document to the corpus for future cross-checking.
   */
  async addUserDocument(
    documentId: string,
    title: string,
    content: string,
    sourceType: 'student_paper' | 'internet',
    userId?: string,
  ): Promise<void> {
    try {
      // Check if already exists by externalId
      const existing = await this.prisma.sourceDocument.findUnique({
        where: { externalId: documentId },
      });

      if (existing) return; // Already indexed

      // Create SourceDocument
      const sourceDocument = await this.prisma.sourceDocument.create({
        data: {
          externalId: documentId,
          title,
          content,
          sourceType,
          isUserDocument: true,
          userId,
        },
      });

      // Generate and store fingerprints
      const engine = new WinnowingEngine();
      const fingerprints = engine.generateFingerprints(content);

      if (fingerprints.length > 0) {
        const fpBatchSize = 500;
        for (let i = 0; i < fingerprints.length; i += fpBatchSize) {
          const fpBatch = fingerprints.slice(i, i + fpBatchSize);
          await this.prisma.fingerprint.createMany({
            data: fpBatch.map(fp => ({
              hashValue: fp.hash,
              documentId: sourceDocument.id,
              position: fp.position,
              ngram: fp.ngram,
            })),
          });
        }
      }
    } catch (error) {
      console.error('[NigWrite] Failed to add user document:', error);
    }
  }

  /**
   * Get the count of user-submitted documents.
   */
  async getUserDocumentCount(): Promise<number> {
    return this.prisma.sourceDocument.count({
      where: { isUserDocument: true },
    });
  }

  /**
   * Search only user-submitted documents.
   */
  async searchUserDocuments(hashes: number[]): Promise<Map<number, FingerprintEntry[]>> {
    const matches = new Map<number, FingerprintEntry[]>();
    if (hashes.length === 0) return matches;

    const batchSize = 100;
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize);

      const fingerprints = await this.prisma.fingerprint.findMany({
        where: {
          hashValue: { in: batch },
          document: { isUserDocument: true },
        },
        include: {
          document: true,
        },
      });

      for (const fp of fingerprints) {
        const entry: FingerprintEntry = {
          hash: fp.hashValue,
          documentId: fp.document.externalId,
          position: fp.position,
          ngram: fp.ngram,
          sourceTitle: fp.document.title,
          sourceUrl: fp.document.sourceUrl || undefined,
          sourceType: fp.document.sourceType as 'internet' | 'publication' | 'student_paper',
        };

        const existing = matches.get(fp.hashValue) || [];
        existing.push(entry);
        matches.set(fp.hashValue, existing);
      }
    }

    return matches;
  }

  /**
   * Get total corpus fingerprint count (for stats).
   */
  async getTotalFingerprintCount(): Promise<number> {
    return this.prisma.fingerprint.count();
  }

  /**
   * Get total source document count.
   */
  async getTotalDocumentCount(): Promise<number> {
    return this.prisma.sourceDocument.count();
  }
}

// Singleton
let store: PersistentFingerprintStore | null = null;

export async function getPersistentFingerprintStore(): Promise<PersistentFingerprintStore> {
  if (!store) {
    store = new PersistentFingerprintStore();
  }
  await store.initialize();
  return store;
}
