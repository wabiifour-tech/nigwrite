/**
 * NigWrite - Winnowing Engine (Plagiarism Detection Core)
 * Created by: Wabi The Tech Nurse
 *
 * Implements the Winnowing Algorithm for document fingerprinting
 * with Turnitin-style word-based similarity scoring:
 *   1. Text Normalization (lowercase, remove punctuation)
 *   2. N-Gram Generation (overlapping k-grams, k=8)
 *   3. Rolling Hash (Rabin-Karp)
 *   4. Winnowing Selection (pick representative hashes per window)
 *   5. Quote & Bibliography Exclusion
 *   6. Match Region Merging (contiguous word ranges)
 *   7. Word-Based Similarity Scoring (matched words / total words × 100)
 *   8. Per-Source Scoring with Overall Deduplication
 *
 * Reference: Schleimer, S., Wilkerson, D. & Aiken, A. (2003).
 * "Winnowing: Local Algorithms for Document Fingerprinting."
 * SIGMOD Conference Proceedings.
 */

// Configuration constants for the Winnowing Algorithm
const WINNOWING_CONFIG = {
  nGramSize: 8,          // k-gram size — Turnitin uses 7-10
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

// Result of a plagiarism match (backward compat)
export interface PlagiarismMatch {
  text: string;
  sourceTitle: string;
  sourceUrl?: string;
  similarityContribution: number;
  startPosition: number;
}

// A contiguous region of matched words in the submitted document
export interface MatchRegion {
  startWordIndex: number;
  endWordIndex: number;
  text: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  wordCount: number;
}

// Per-source breakdown of matches
export interface SourceBreakdown {
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  matchCount: number;
  matchedWords: number;
  percentageOfDocument: number;
  regions: MatchRegion[];
}

// Complete scan result
export interface ScanResult {
  overallSimilarity: number;
  totalWords: number;
  matchedWords: number;
  excludedWords: number;
  sourceBreakdown: SourceBreakdown[];
  matchRegions: MatchRegion[];
  flaggedSegments: string[];
  matches: PlagiarismMatch[];
}

// Internal representation of a matched n-gram position
interface RawMatch {
  startWordIndex: number;
  endWordIndex: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
}

// Corpus match entry used by the search system
export interface CorpusMatchEntry {
  documentId: string;
  ngram: string;
  sourceTitle: string;
  sourceUrl?: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  position: number;
}

export class WinnowingEngine {
  private config = WINNOWING_CONFIG;

  /**
   * Step 1: Normalize text by lowercasing and removing punctuation.
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Split text into word array while preserving structure.
   */
  splitIntoWords(text: string): string[] {
    return this.normalizeText(text).split(' ').filter(w => w.length > 0);
  }

  /**
   * Exclude quoted text and bibliography sections from content.
   * Returns the cleaned text and the count of excluded words.
   */
  excludeQuotesAndBibliography(text: string): { cleanedText: string; excludedWordCount: number } {
    let excludedWords = 0;

    // 1. Remove text in quotes (both single and double quotes)
    let cleaned = text.replace(/"([^"]+)"/g, (_match, _content) => {
      const words = _content.split(/\s+/).filter(w => w.length > 0);
      excludedWords += words.length;
      return '';
    });

    cleaned = cleaned.replace(/'([^']+)'/g, (_match, _content) => {
      const words = _content.split(/\s+/).filter(w => w.length > 0);
      excludedWords += words.length;
      return '';
    });

    // 2. Remove bibliography / references / works cited sections
    // These sections typically start with a header and continue to end of document
    const biblioHeaders = [
      /^references\s*$/im,
      /^bibliography\s*$/im,
      /^works\s+cited\s*$/im,
      /^reference\s+list\s*$/im,
      /^list\s+of\s+references\s*$/im,
    ];

    for (const header of biblioHeaders) {
      const match = cleaned.match(header);
      if (match && match.index !== undefined) {
        const afterHeader = cleaned.substring(match.index);
        const headerWords = afterHeader.split(/\s+/).filter(w => w.length > 0);
        excludedWords += headerWords.length;
        cleaned = cleaned.substring(0, match.index);
      }
    }

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return { cleanedText: cleaned, excludedWordCount: excludedWords };
  }

  /**
   * Step 2: Generate k-grams (n-grams) from normalized text.
   */
  generateNGrams(text: string): string[] {
    const words = text.split(' ').filter(w => w.length > 0);
    const ngrams: string[] = [];

    if (words.length < this.config.nGramSize) {
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
   */
  winnow(hashes: { hash: number; position: number; ngram: string }[]): Fingerprint[] {
    if (hashes.length === 0) return [];

    const w = this.config.windowSize;
    const selected: Fingerprint[] = [];
    const selectedHashes = new Set<number>();

    if (hashes.length < w) {
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

    let rightmostMinPos = -1;

    for (let i = 0; i <= hashes.length - w; i++) {
      let minInWindow = hashes[i];
      for (let j = i + 1; j < i + w; j++) {
        if (hashes[j].hash < minInWindow.hash) {
          minInWindow = hashes[j];
        }
      }

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
   * Merge overlapping or adjacent raw matches into contiguous regions.
   */
  private mergeRawMatches(rawMatches: RawMatch[]): MatchRegion[] {
    if (rawMatches.length === 0) return [];

    // Sort by sourceId first, then by startWordIndex
    const sorted = [...rawMatches].sort((a, b) => {
      const cmp = a.sourceId.localeCompare(b.sourceId);
      if (cmp !== 0) return cmp;
      return a.startWordIndex - b.startWordIndex;
    });

    const regions: MatchRegion[] = [];
    let current: RawMatch | null = null;

    for (const match of sorted) {
      if (!current) {
        current = { ...match };
      } else if (match.startWordIndex <= current.endWordIndex + 1) {
        // Overlapping or adjacent — extend
        current.endWordIndex = Math.max(current.endWordIndex, match.endWordIndex);
      } else {
        // Finalize current region
        regions.push({
          startWordIndex: current.startWordIndex,
          endWordIndex: current.endWordIndex,
          wordCount: current.endWordIndex - current.startWordIndex + 1,
          text: '',
          sourceId: current.sourceId,
          sourceTitle: current.sourceTitle,
          sourceType: current.sourceType || 'publication',
          sourceUrl: current.sourceUrl,
        });
        current = { ...match };
      }
    }

    if (current) {
      regions.push({
        startWordIndex: current.startWordIndex,
        endWordIndex: current.endWordIndex,
        wordCount: current.endWordIndex - current.startWordIndex + 1,
        text: '',
        sourceId: current.sourceId,
        sourceTitle: current.sourceTitle,
        sourceType: current.sourceType || 'publication',
        sourceUrl: current.sourceUrl,
      });
    }

    return regions;
  }

  /**
   * Convert a RawMatch (with word indices) into a MatchRegion.
   * The text is reconstructed from the original words later.
   */
  private rawMatchToRegion(match: RawMatch, words: string[]): MatchRegion {
    const start = Math.max(0, match.startWordIndex);
    const end = Math.min(words.length - 1, match.endWordIndex);
    const text = words.slice(start, end + 1).join(' ');

    return {
      startWordIndex: start,
      endWordIndex: end,
      text,
      sourceId: match.sourceId,
      sourceTitle: match.sourceTitle,
      sourceType: match.sourceType,
      sourceUrl: match.sourceUrl,
      wordCount: end - start + 1,
    };
  }

  /**
   * Step 5: Match submitted document fingerprints against the corpus.
   * Uses word-based similarity scoring: (matched words / total words) × 100.
   * Supports per-source scoring with overall deduplication.
   */
  matchDocument(
    submittedText: string,
    corpusMatches: Map<number, CorpusMatchEntry[]>,
    excludedWords: number = 0,
  ): ScanResult {
    const fingerprints = this.generateFingerprints(submittedText);
    const words = this.splitIntoWords(submittedText);
    const totalWords = words.length;

    if (fingerprints.length === 0 || totalWords === 0) {
      return {
        overallSimilarity: 0,
        totalWords,
        matchedWords: 0,
        excludedWords,
        sourceBreakdown: [],
        matchRegions: [],
        flaggedSegments: [],
        matches: [],
      };
    }

    // Collect raw matches: for each fingerprint that hits the corpus,
    // record the word range it covers in the submitted document
    const rawMatches: RawMatch[] = [];

    for (const fp of fingerprints) {
      const entries = corpusMatches.get(fp.hash);
      if (entries && entries.length > 0) {
        // Each fingerprint at position `fp.position` covers words
        // [fp.position, fp.position + nGramSize - 1]
        const startWord = fp.position;
        const endWord = fp.position + this.config.nGramSize - 1;

        for (const entry of entries) {
          rawMatches.push({
            startWordIndex: startWord,
            endWordIndex: Math.min(endWord, totalWords - 1),
            sourceId: entry.documentId,
            sourceTitle: entry.sourceTitle,
            sourceType: entry.sourceType || 'publication',
            sourceUrl: entry.sourceUrl,
          });
        }
      }
    }

    // Merge overlapping/adjacent raw matches into contiguous regions
    // First, group by source for per-source merging
    const bySource = new Map<string, RawMatch[]>();
    for (const rm of rawMatches) {
      const list = bySource.get(rm.sourceId) || [];
      list.push(rm);
      bySource.set(rm.sourceId, list);
    }

    // Per-source merging and scoring
    const sourceBreakdown: SourceBreakdown[] = [];
    const allRegions: MatchRegion[] = [];

    for (const [sourceId, sourceRawMatches] of bySource) {
      const merged = this.mergeRawMatches(sourceRawMatches);

      // Reconstruct text from words
      const regionsWithText: MatchRegion[] = merged.map(r => ({
        ...r,
        text: words.slice(r.startWordIndex, r.endWordIndex + 1).join(' '),
        wordCount: r.endWordIndex - r.startWordIndex + 1,
      }));

      // Calculate matched words for this source (deduped within source)
      const matchedWordSet = new Set<number>();
      for (const region of regionsWithText) {
        for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
          matchedWordSet.add(w);
        }
      }

      const matchedWordsForSource = matchedWordSet.size;
      const percentageOfDocument = totalWords > 0
        ? Math.round((matchedWordsForSource / totalWords) * 100 * 10) / 10
        : 0;

      const firstMatch = sourceRawMatches[0];
      sourceBreakdown.push({
        sourceId,
        sourceTitle: firstMatch.sourceTitle,
        sourceType: firstMatch.sourceType || 'publication',
        sourceUrl: firstMatch.sourceUrl,
        matchCount: regionsWithText.length,
        matchedWords: matchedWordsForSource,
        percentageOfDocument,
        regions: regionsWithText,
      });

      allRegions.push(...regionsWithText);
    }

    // Overall score: deduplicate across sources
    // A word matched by multiple sources counts only once
    const globalMatchedWordSet = new Set<number>();
    for (const region of allRegions) {
      for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
        globalMatchedWordSet.add(w);
      }
    }

    const matchedWords = globalMatchedWordSet.size;
    const overallSimilarity = totalWords > 0
      ? Math.round((matchedWords / totalWords) * 100)
      : 0;

    // Sort source breakdown by matchedWords descending
    sourceBreakdown.sort((a, b) => b.matchedWords - a.matchedWords);

    // Sort match regions by startWordIndex
    allRegions.sort((a, b) => a.startWordIndex - b.startWordIndex);

    // Build backward-compatible flaggedSegments
    const flaggedSegments: string[] = allRegions.map(r => r.text);

    // Build backward-compatible matches (PlagiarismMatch)
    const matches: PlagiarismMatch[] = allRegions.map((r, idx) => ({
      text: r.text,
      sourceTitle: r.sourceTitle,
      sourceUrl: r.sourceUrl,
      similarityContribution: totalWords > 0
        ? Math.round((r.wordCount / totalWords) * 100 * 10) / 10
        : 0,
      startPosition: r.startWordIndex,
    }));

    return {
      overallSimilarity: Math.min(overallSimilarity, 100),
      totalWords,
      matchedWords,
      excludedWords,
      sourceBreakdown,
      matchRegions: allRegions,
      flaggedSegments,
      matches,
    };
  }

  /**
   * Re-scan a document after correction to verify similarity has decreased.
   */
  rescanAfterCorrection(
    originalText: string,
    correctedText: string,
    corpusMatches: Map<number, CorpusMatchEntry[]>,
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
