/**
 * NigWrite - Winnowing Engine (Plagiarism Detection Core)
 * Created by: Wabi The Tech Nurse
 *
 * Implements the Winnowing Algorithm for document fingerprinting:
 *   1. Text Normalization (lowercase, remove punctuation)
 *   2. N-Gram Generation (overlapping k-grams)
 *   3. Rolling Hash (Rabin-Karp)
 *   4. Winnowing Selection (pick representative hashes per window)
 *   5. Matching & Scoring (compare fingerprints against corpus)
 *
 * Reference: Schleimer, S., Wilkerson, D. & Aiken, A. (2003).
 * "Winnowing: Local Algorithms for Document Fingerprinting."
 * SIGMOD Conference Proceedings.
 */

// Configuration constants for the Winnowing Algorithm
const WINNOWING_CONFIG = {
  nGramSize: 5,          // k-gram size (number of words per n-gram)
  windowSize: 4,         // w - window size for winnowing selection
  basePrime: 257,        // Base for Rabin-Karp rolling hash
  hashModulus: 2 ** 32,  // Modulus to keep hashes within 32-bit range
};

// Result of generating document fingerprints
export interface Fingerprint {
  hash: number;
  position: number;
  ngram: string;
}

// Result of a plagiarism match
export interface PlagiarismMatch {
  text: string;            // The matching text segment
  sourceTitle: string;     // Title of the matched source document
  sourceUrl?: string;      // URL of the matched source
  similarityContribution: number; // How much this match adds to total score
  startPosition: number;   // Position in the submitted document
}

// Complete scan result
export interface ScanResult {
  overallSimilarity: number;  // 0-100 percentage
  matches: PlagiarismMatch[];
  flaggedSegments: string[];  // Array of flagged text paragraphs
}

export class WinnowingEngine {
  private config = WINNOWING_CONFIG;

  /**
   * Step 1: Normalize text by lowercasing and removing punctuation.
   * This ensures that "Hello, World!" and "hello world" produce the same fingerprints.
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')    // Remove all non-alphanumeric, non-whitespace characters
      .replace(/\s+/g, ' ')       // Collapse multiple whitespace into single space
      .trim();
  }

  /**
   * Step 2: Generate k-grams (n-grams) from normalized text.
   * Returns overlapping sequences of k words.
   */
  generateNGrams(text: string): string[] {
    const words = text.split(' ').filter(w => w.length > 0);
    const ngrams: string[] = [];

    if (words.length < this.config.nGramSize) {
      // If text is shorter than n-gram size, use the entire text as one n-gram
      if (words.length > 0) ngrams.push(words.join(' '));
      return ngrams;
    }

    for (let i = 0; i <= words.length - this.config.nGramSize; i++) {
      const ngram = words.slice(i, i + this.config.nGramSize).join(' ');
      ngrams.push(ngram);
    }

    return ngrams;
  }

  /**
   * Step 3: Compute Rabin-Karp rolling hash for a string.
   * Uses a polynomial rolling hash with a prime base.
   */
  rabinKarpHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hash = (hash * this.config.basePrime + charCode) % this.config.hashModulus;
    }
    return hash;
  }

  /**
   * Step 4: Apply Winnowing selection to pick representative fingerprints.
   * For each window of size w, select the minimum hash value.
   * If the minimum appears in multiple windows, only record it once.
   */
  winnow(hashes: { hash: number; position: number; ngram: string }[]): Fingerprint[] {
    if (hashes.length === 0) return [];

    const w = this.config.windowSize;
    const selected: Fingerprint[] = [];
    const selectedHashes = new Set<number>();

    // Handle case where document is smaller than window
    if (hashes.length < w) {
      // Pick the minimum hash from all available
      let minHash = hashes[0];
      for (let i = 1; i < hashes.length; i++) {
        if (hashes[i].hash < minHash.hash) {
          minHash = hashes[i];
        }
      }
      selected.push({
        hash: minHash.hash,
        position: minHash.position,
        ngram: minHash.ngram,
      });
      return selected;
    }

    // For each window position, track the minimum hash
    let rightmostMinPos = -1;

    for (let i = 0; i <= hashes.length - w; i++) {
      // Find minimum hash in current window [i, i+w-1]
      let minInWindow = hashes[i];
      for (let j = i + 1; j < i + w; j++) {
        if (hashes[j].hash < minInWindow.hash) {
          minInWindow = hashes[j];
        }
      }

      // Only select if this minimum is rightmost (haven't been selected yet)
      if (minInWindow.position >= rightmostMinPos) {
        if (!selectedHashes.has(minInWindow.hash) || minInWindow.position > rightmostMinPos) {
          selected.push({
            hash: minInWindow.hash,
            position: minInWindow.position,
            ngram: minInWindow.ngram,
          });
          selectedHashes.add(minInWindow.hash);
          rightmostMinPos = minInWindow.position;
        }
      }
    }

    return selected;
  }

  /**
   * Full fingerprinting pipeline: normalize → n-grams → hash → winnow.
   * Returns the complete set of document fingerprints.
   */
  generateFingerprints(text: string): Fingerprint[] {
    const normalized = this.normalizeText(text);
    const ngrams = this.generateNGrams(normalized);
    const hashes = ngrams.map((ngram, index) => ({
      hash: this.rabinKarpHash(ngram),
      position: index,
      ngram,
    }));
    return this.winnow(hashes);
  }

  /**
   * Step 5: Match submitted document fingerprints against the corpus.
   * Compares each fingerprint hash against the indexed store.
   * Returns matches grouped by source document with similarity scores.
   */
  matchDocument(
    submittedText: string,
    corpusMatches: Map<number, { documentId: string; ngram: string; sourceTitle: string; sourceUrl?: string; position: number }[]>
  ): ScanResult {
    const fingerprints = this.generateFingerprints(submittedText);

    if (fingerprints.length === 0) {
      return { overallSimilarity: 0, matches: [], flaggedSegments: [] };
    }

    // Count matching and total fingerprints
    let matchCount = 0;
    const matchDetails = new Map<string, { matches: PlagiarismMatch[]; sourceTitle: string; sourceUrl?: string }>();
    const matchedPositions = new Set<number>();

    for (const fp of fingerprints) {
      const corpusEntries = corpusMatches.get(fp.hash);
      if (corpusEntries && corpusEntries.length > 0) {
        matchCount++;
        matchedPositions.add(fp.position);

        // Group matches by source document
        for (const entry of corpusEntries) {
          const existing = matchDetails.get(entry.documentId) || {
            matches: [],
            sourceTitle: entry.sourceTitle,
            sourceUrl: entry.sourceUrl,
          };
          existing.matches.push({
            text: fp.ngram,
            sourceTitle: entry.sourceTitle,
            sourceUrl: entry.sourceUrl,
            similarityContribution: 0,
            startPosition: fp.position,
          });
          matchDetails.set(entry.documentId, existing);
        }
      }
    }

    // Calculate overall similarity score (Jaccard-like coefficient)
    const overallSimilarity = Math.round(
      (matchCount / Math.max(fingerprints.length, 1)) * 100
    );

    // Distribute similarity contribution across matches
    const totalMatches = Array.from(matchDetails.values()).reduce(
      (sum, d) => sum + d.matches.length, 0
    );

    const matches: PlagiarismMatch[] = [];
    for (const details of matchDetails.values()) {
      for (const match of details.matches) {
        match.similarityContribution = totalMatches > 0
          ? Math.round((1 / totalMatches) * overallSimilarity * 10) / 10
          : 0;
        matches.push(match);
      }
    }

    // Extract flagged text segments (from original text, preserving structure)
    const normalized = this.normalizeText(submittedText);
    const words = normalized.split(' ');
    const flaggedSegments: string[] = [];
    let currentSegment: string[] = [];

    for (let i = 0; i <= words.length - this.config.nGramSize; i++) {
      const ngramStart = i;
      if (matchedPositions.has(ngramStart)) {
        currentSegment.push(words[i]);
      } else {
        if (currentSegment.length > 0) {
          flaggedSegments.push(currentSegment.join(' '));
          currentSegment = [];
        }
      }
    }
    if (currentSegment.length > 0) {
      flaggedSegments.push(currentSegment.join(' '));
    }

    // Merge overlapping segments for cleaner display
    const mergedSegments = this.mergeSegments(flaggedSegments);

    return {
      overallSimilarity: Math.min(overallSimilarity, 100),
      matches,
      flaggedSegments: mergedSegments,
    };
  }

  /**
   * Merge overlapping or adjacent flagged segments into coherent paragraphs.
   */
  private mergeSegments(segments: string[]): string[] {
    if (segments.length === 0) return [];

    const merged: string[] = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      // If segments share common words, merge them
      const lastMerged = merged[merged.length - 1];
      const lastWords = lastMerged.split(' ');
      const currentWords = segments[i].split(' ');
      const overlap = lastWords.filter(w => currentWords.includes(w));

      if (overlap.length > 2) {
        // Merge by combining and deduplicating
        merged[merged.length - 1] = this.deduplicateAndMerge(lastMerged, segments[i]);
      } else {
        merged.push(segments[i]);
      }
    }
    return merged;
  }

  /**
   * Deduplicate words when merging two overlapping segments.
   */
  private deduplicateAndMerge(a: string, b: string): string {
    const wordsA = a.split(' ');
    const wordsB = b.split(' ');
    const overlapStart = this.findOverlapIndex(wordsA, wordsB);

    if (overlapStart === -1) {
      return a + ' ' + b;
    }

    // Combine: take all of A, then the non-overlapping part of B
    return [...wordsA, ...wordsB.slice(overlapStart)].join(' ');
  }

  /**
   * Find where array B starts overlapping with the end of array A.
   */
  private findOverlapIndex(a: string[], b: string[]): number {
    for (let len = Math.min(a.length, b.length); len > 1; len--) {
      const tailA = a.slice(-len);
      const headB = b.slice(0, len);
      if (tailA.every((word, i) => word === headB[i])) {
        return len;
      }
    }
    return -1;
  }

  /**
   * Re-scan a document after correction to verify similarity has decreased.
   * Returns the new similarity score and remaining flagged segments.
   */
  rescanAfterCorrection(
    originalText: string,
    correctedText: string,
    corpusMatches: Map<number, { documentId: string; ngram: string; sourceTitle: string; sourceUrl?: string; position: number }[]>
  ): { originalScore: number; newScore: number; improvement: number; newMatches: PlagiarismMatch[] } {
    const originalResult = this.matchDocument(originalText, corpusMatches);
    const newResult = this.matchDocument(correctedText, corpusMatches);

    return {
      originalScore: originalResult.overallSimilarity,
      newScore: newResult.overallSimilarity,
      improvement: originalResult.overallSimilarity - newResult.overallSimilarity,
      newMatches: newResult.matches,
    };
  }
}
