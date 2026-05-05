/**
 * NigWrite - Fingerprint Store
 * In-memory hash storage simulating Elasticsearch fingerprint index.
 * Created by: Wabi The Tech Nurse
 *
 * In production, this would be replaced with an Elasticsearch cluster
 * storing billions of document fingerprints. This implementation uses
 * a Map-based in-memory store for demonstration purposes.
 */

import { WinnowingEngine } from './winnowing-engine';

// Fingerprint entry stored in the index
interface FingerprintEntry {
  hash: number;
  documentId: string;
  position: number;    // Character position in the source document
  ngram: string;       // Original n-gram text (for display)
  sourceTitle: string;
  sourceUrl?: string;
}

// Singleton fingerprint database
class FingerprintStore {
  private store: Map<number, FingerprintEntry[]>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Index a batch of fingerprints from a document into the store.
   * In production, this would use Elasticsearch bulk indexing API.
   * @param fingerprints - Array of fingerprint entries to index
   */
  indexFingerprints(fingerprints: FingerprintEntry[]): void {
    for (const fp of fingerprints) {
      const existing = this.store.get(fp.hash) || [];
      existing.push(fp);
      this.store.set(fp.hash, existing);
    }
  }

  /**
   * Search for matching fingerprints by hash values.
   * Returns all source documents that share any hash with the query.
   * @param hashes - Array of hash values to look up
   * @returns Map of hash -> matching entries
   */
  search(hashes: number[]): Map<number, FingerprintEntry[]> {
    const matches = new Map<number, FingerprintEntry[]>();
    for (const hash of hashes) {
      const entries = this.store.get(hash);
      if (entries && entries.length > 0) {
        matches.set(hash, [...entries]);
      }
    }
    return matches;
  }

  /**
   * Get total number of unique fingerprints stored.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Clear all fingerprints (useful for testing).
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Seed the store with sample academic content for demonstration.
   * This simulates having a large corpus of reference documents.
   */
  seedSampleData(): void {
    const sampleDocuments = [
      {
        id: "src-001",
        title: "Introduction to Machine Learning",
        url: "https://example.com/ml-intro",
        content: "Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. These systems improve their performance on a specific task over time without being explicitly programmed. Machine learning algorithms use historical data as input to predict new output values. Supervised learning, unsupervised learning, and reinforcement learning are the three main types of machine learning. Deep learning is a specialized branch that uses neural networks with many layers to analyze various factors of data. The field has seen remarkable advances in recent years, particularly in areas such as image recognition, natural language processing, and autonomous vehicles."
      },
      {
        id: "src-002",
        title: "Climate Change and Global Warming",
        url: "https://example.com/climate-change",
        content: "Climate change refers to long-term shifts in global temperatures and weather patterns. While natural processes can cause climate variations, since the 1800s human activities have been the main driver of climate change, primarily due to the burning of fossil fuels like coal, oil, and gas. Global warming is the long-term heating of Earth's surface observed since the pre-industrial period due to human activities. The primary cause of global warming is the greenhouse effect, where certain gases in Earth's atmosphere trap heat. Carbon dioxide, methane, and nitrous oxide are the primary greenhouse gases. Rising sea levels, melting ice caps, and increasing frequency of extreme weather events are among the most visible consequences of climate change."
      },
      {
        id: "src-003",
        title: "The Impact of Social Media on Society",
        url: "https://example.com/social-media-impact",
        content: "Social media has fundamentally transformed the way people communicate and interact with each other. Platforms like Facebook, Twitter, and Instagram have created new avenues for connection while also raising concerns about privacy, mental health, and the spread of misinformation. The rise of social media has democratized information sharing, allowing individuals to reach global audiences instantly. However, the algorithmic curation of content on these platforms has led to the formation of echo chambers, where users are primarily exposed to information that reinforces their existing beliefs. Studies have shown that excessive social media use can contribute to feelings of anxiety, depression, and loneliness, particularly among young people."
      },
      {
        id: "src-004",
        title: "Advances in Quantum Computing",
        url: "https://example.com/quantum-computing",
        content: "Quantum computing represents a paradigm shift in computational technology, leveraging the principles of quantum mechanics to process information in fundamentally new ways. Unlike classical computers that use bits representing either zero or one, quantum computers use quantum bits or qubits, which can exist in a superposition of states simultaneously. This property enables quantum computers to explore multiple solutions to a problem at the same time, offering exponential speedups for certain classes of computations. Key applications include cryptography, drug discovery, optimization problems, and simulating complex molecular interactions. Major technology companies including IBM, Google, and Microsoft have invested heavily in quantum computing research."
      },
      {
        id: "src-005",
        title: "The History of the Internet",
        url: "https://example.com/internet-history",
        content: "The Internet originated from ARPANET, a project funded by the United States Department of Defense in the late 1960s. The initial goal was to create a decentralized communication network that could withstand a nuclear attack. In 1989, Tim Berners-Lee invented the World Wide Web, which revolutionized how information was shared and accessed over the Internet. The introduction of web browsers in the early 1990s made the Internet accessible to the general public, leading to explosive growth in users and content. E-commerce, social networking, cloud computing, and mobile connectivity have all emerged as transformative applications built upon the Internet's infrastructure. Today, over five billion people worldwide have Internet access."
      }
    ];

    // Process each sample document through the winnowing pipeline
    const engine = new WinnowingEngine();

    for (const doc of sampleDocuments) {
      const fingerprints = engine.generateFingerprints(doc.content);
      const entries: FingerprintEntry[] = fingerprints.map(fp => ({
        hash: fp.hash,
        documentId: doc.id,
        position: fp.position,
        ngram: fp.ngram,
        sourceTitle: doc.title,
        sourceUrl: doc.url,
      }));
      this.indexFingerprints(entries);
    }
  }
}

// Export singleton instance
let instance: FingerprintStore | null = null;

export function getFingerprintStore(): FingerprintStore {
  if (!instance) {
    instance = new FingerprintStore();
    instance.seedSampleData();
  }
  return instance;
}

export type { FingerprintEntry };
