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
 *   5. Quote, Bibliography & Citation Exclusion
 *   6. Match Region Merging (contiguous word ranges)
 *   7. Word-Based Similarity Scoring (matched words / total words × 100)
 *   8. Per-Source Scoring with Overall Deduplication
 *   9. Source-Type Categorized Scoring (internet, publications, student papers)
 *  10. Primary Sources Identification (top 3 sources)
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

// Exclusion settings for fine-grained control over what is excluded
export interface ExclusionSettings {
  excludeQuotes: boolean;       // default true
  excludeBibliography: boolean; // default true
  excludeCitations: boolean;    // default true
  excludeSmallMatches: number;  // default 0 (minimum word count to count as a match)
}

// Default exclusion settings
export const DEFAULT_EXCLUSION_SETTINGS: ExclusionSettings = {
  excludeQuotes: true,
  excludeBibliography: true,
  excludeCitations: true,
  excludeSmallMatches: 0,
};

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
  isPrimary?: boolean; // true if this region belongs to a primary source
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
  isPrimary?: boolean; // true if this is one of the top 3 most-matched sources
}

// Per-source-type breakdown (Turnitin-style)
export interface SourceTypeBreakdown {
  internet: { matchedWords: number; percentage: number; sourceCount: number };
  publications: { matchedWords: number; percentage: number; sourceCount: number };
  studentPapers: { matchedWords: number; percentage: number; sourceCount: number };
  primarySources: { matchedWords: number; percentage: number; sourceCount: number };
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
  // New Turnitin-style fields
  sourceTypeBreakdown: SourceTypeBreakdown;
  primarySources: SourceBreakdown[]; // top 3 sources by matched word count
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

// Empty source-type breakdown
function emptySourceTypeBreakdown(): SourceTypeBreakdown {
  return {
    internet: { matchedWords: 0, percentage: 0, sourceCount: 0 },
    publications: { matchedWords: 0, percentage: 0, sourceCount: 0 },
    studentPapers: { matchedWords: 0, percentage: 0, sourceCount: 0 },
    primarySources: { matchedWords: 0, percentage: 0, sourceCount: 0 },
  };
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
   * Exclude quoted text from content.
   * Returns the cleaned text and the count of excluded words.
   */
  private excludeQuotes(text: string): { cleanedText: string; excludedWordCount: number } {
    let excludedWords = 0;

    // Remove text in quotes (both single and double quotes)
    let cleaned = text.replace(/"([^"]+)"/g, (_match, content) => {
      const words = content.split(/\s+/).filter(w => w.length > 0);
      excludedWords += words.length;
      return '';
    });

    cleaned = cleaned.replace(/'([^']+)'/g, (_match, content) => {
      const words = content.split(/\s+/).filter(w => w.length > 0);
      excludedWords += words.length;
      return '';
    });

    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return { cleanedText: cleaned, excludedWordCount: excludedWords };
  }

  /**
   * Exclude bibliography / references / works cited sections from content.
   * Returns the cleaned text and the count of excluded words.
   */
  private excludeBibliography(text: string): { cleanedText: string; excludedWordCount: number } {
    let excludedWords = 0;

    const biblioHeaders = [
      /^references\s*$/im,
      /^bibliography\s*$/im,
      /^works\s+cited\s*$/im,
      /^reference\s+list\s*$/im,
      /^list\s+of\s+references\s*$/im,
    ];

    let cleaned = text;
    for (const header of biblioHeaders) {
      const match = cleaned.match(header);
      if (match && match.index !== undefined) {
        const afterHeader = cleaned.substring(match.index);
        const headerWords = afterHeader.split(/\s+/).filter(w => w.length > 0);
        excludedWords += headerWords.length;
        cleaned = cleaned.substring(0, match.index);
      }
    }

    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return { cleanedText: cleaned, excludedWordCount: excludedWords };
  }

  /**
   * Exclude in-text citation patterns before fingerprinting.
   * Detects and removes:
   *   - Parenthetical citations: (Author, Year), (Author, Year, p. 123)
   *   - Bracket citations: [1], [Author, Year]
   *   - Narrative citations: Author (Year) when followed by findings/says/states/etc.
   *   - APA-style: et al. (Year), (Eds.), (Trans.)
   *
   * Returns the cleaned text and the count of excluded words.
   */
  excludeCitations(text: string): { cleanedText: string; excludedWordCount: number } {
    let excludedWords = 0;

    let cleaned = text;

    // 1. Parenthetical citations: (Author, Year) with optional page number
    //    e.g. (Smith, 2020), (Smith & Jones, 2020), (Smith et al., 2020, p. 15)
    cleaned = cleaned.replace(
      /\([^)]*\b(?:19|20)\d{2}\b[^)]*\)/g,
      (match) => {
        // Only match if it looks like a citation (has a year pattern and author-like content)
        if (/^\([^)]*\b(?:19|20)\d{2}\b[^)]*\)$/.test(match)) {
          const words = match.split(/\s+/).filter(w => w.length > 0);
          excludedWords += words.length;
          return '';
        }
        return match;
      }
    );

    // 2. Bracket numeric citations: [1], [2, 3], [1, pp. 15-20]
    cleaned = cleaned.replace(
      /\[\d+(?:\s*[;,]\s*\d+)*(?:\s*[;,]\s*pp?\.\s*\d+(?:\s*-\s*\d+)?)?\]/g,
      (match) => {
        const words = match.split(/\s+/).filter(w => w.length > 0);
        excludedWords += words.length;
        return '';
      }
    );

    // 3. Bracket author citations: [Author, Year], [Author et al., Year]
    cleaned = cleaned.replace(
      /\[[^\]]*\b(?:19|20)\d{2}\b[^\]]*\]/g,
      (match) => {
        const words = match.split(/\s+/).filter(w => w.length > 0);
        excludedWords += words.length;
        return '';
      }
    );

    // 4. Narrative citations: Author (Year) followed by reporting verbs
    //    e.g. "Smith (2020) found", "Johnson and Lee (2019) argue", "et al. (2021) report"
    cleaned = cleaned.replace(
      /(?:[A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?(?:\s+et\s+al\.?)?)\s*\((?:19|20)\d{2}\)\s+(?:found|argue|argues|state|states|suggest|suggests|report|reports|claim|claims|show|shows|demonstrate|demonstrates|note|notes|conclude|concludes|assert|asserts|maintain|maintains|propose|proposes|indicate|indicates|reveal|reveals|observe|observes|highlight|highlights|emphasize|emphasizes|explain|explains|describe|describes|discuss|discusses|mention|mentions)/g,
      (match) => {
        // Remove just the citation part "Author (Year)" but keep the reporting verb
        const citationPart = match.replace(
          /((?:[A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?(?:\s+et\s+al\.?)?)\s*\((?:19|20)\d{2}\)\s*)/,
          ''
        );
        const beforeVerb = match.replace(citationPart, '');
        if (beforeVerb.trim().length > 0) {
          const citationWords = beforeVerb.split(/\s+/).filter(w => w.length > 0);
          excludedWords += citationWords.length;
          return citationPart;
        }
        return match;
      }
    );

    // 5. APA-style editorial markers: (Eds.), (Trans.), (Ed.), (Trans.),
    cleaned = cleaned.replace(
      /\(\s*(?:Eds?\.|Trans\.|Rev\.|Comp\.|Eds?,?\s*Trans\.?)\s*\)/gi,
      (match) => {
        const words = match.split(/\s+/).filter(w => w.length > 0);
        excludedWords += words.length;
        return '';
      }
    );

    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return { cleanedText: cleaned, excludedWordCount: excludedWords };
  }

  /**
   * Exclude quoted text and bibliography sections from content.
   * Returns the cleaned text and the count of excluded words.
   * (Backward-compatible method that combines quote and bibliography exclusion)
   */
  excludeQuotesAndBibliography(text: string): { cleanedText: string; excludedWordCount: number } {
    const { cleanedText: noQuotes, excludedWordCount: quoteWords } = this.excludeQuotes(text);
    const { cleanedText: noBiblio, excludedWordCount: biblioWords } = this.excludeBibliography(noQuotes);

    return {
      cleanedText: noBiblio,
      excludedWordCount: quoteWords + biblioWords,
    };
  }

  /**
   * Apply all exclusions based on the given settings.
   * Returns cleaned text and total excluded word count.
   */
  applyExclusions(text: string, settings: ExclusionSettings): { cleanedText: string; excludedWordCount: number } {
    let current = text;
    let totalExcluded = 0;

    if (settings.excludeQuotes) {
      const result = this.excludeQuotes(current);
      current = result.cleanedText;
      totalExcluded += result.excludedWordCount;
    }

    if (settings.excludeBibliography) {
      const result = this.excludeBibliography(current);
      current = result.cleanedText;
      totalExcluded += result.excludedWordCount;
    }

    if (settings.excludeCitations) {
      const result = this.excludeCitations(current);
      current = result.cleanedText;
      totalExcluded += result.excludedWordCount;
    }

    return { cleanedText: current, excludedWordCount: totalExcluded };
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
   * Compute source-type breakdown and identify primary sources.
   * Primary sources = top 3 individual sources by matched word count.
   */
  private computeSourceTypeBreakdown(
    sourceBreakdown: SourceBreakdown[],
    matchedWords: number,
    totalWords: number,
  ): { sourceTypeBreakdown: SourceTypeBreakdown; primarySources: SourceBreakdown[] } {
    const breakdown = emptySourceTypeBreakdown();

    // Calculate per-source-type word counts
    const internetWords = new Set<number>();
    const publicationWords = new Set<number>();
    const studentPaperWords = new Set<number>();
    const internetSourceIds = new Set<string>();
    const publicationSourceIds = new Set<string>();
    const studentPaperSourceIds = new Set<string>();

    for (const source of sourceBreakdown) {
      const wordSet = new Set<number>();
      for (const region of source.regions) {
        for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
          wordSet.add(w);
        }
      }

      switch (source.sourceType) {
        case 'internet':
          for (const w of wordSet) internetWords.add(w);
          internetSourceIds.add(source.sourceId);
          break;
        case 'publication':
          for (const w of wordSet) publicationWords.add(w);
          publicationSourceIds.add(source.sourceId);
          break;
        case 'student_paper':
          for (const w of wordSet) studentPaperWords.add(w);
          studentPaperSourceIds.add(source.sourceId);
          break;
      }
    }

    const base = matchedWords > 0 ? matchedWords : 1;

    breakdown.internet.matchedWords = internetWords.size;
    breakdown.internet.percentage = Math.round((internetWords.size / base) * 100 * 10) / 10;
    breakdown.internet.sourceCount = internetSourceIds.size;

    breakdown.publications.matchedWords = publicationWords.size;
    breakdown.publications.percentage = Math.round((publicationWords.size / base) * 100 * 10) / 10;
    breakdown.publications.sourceCount = publicationSourceIds.size;

    breakdown.studentPapers.matchedWords = studentPaperWords.size;
    breakdown.studentPapers.percentage = Math.round((studentPaperWords.size / base) * 100 * 10) / 10;
    breakdown.studentPapers.sourceCount = studentPaperSourceIds.size;

    // Primary sources: top 3 sources by matched word count
    // They are already sorted by matchedWords descending
    const primaryCount = Math.min(3, sourceBreakdown.length);
    const primarySources: SourceBreakdown[] = [];
    const primaryWordSet = new Set<number>();

    for (let i = 0; i < primaryCount; i++) {
      const source = sourceBreakdown[i];
      if (source.matchedWords <= 0) break;

      primarySources.push({
        ...source,
        isPrimary: true,
      });

      for (const region of source.regions) {
        for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
          primaryWordSet.add(w);
        }
      }
    }

    breakdown.primarySources.matchedWords = primaryWordSet.size;
    breakdown.primarySources.percentage = totalWords > 0
      ? Math.round((primaryWordSet.size / totalWords) * 100 * 10) / 10
      : 0;
    breakdown.primarySources.sourceCount = primaryCount;

    return { sourceTypeBreakdown: breakdown, primarySources };
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
        sourceTypeBreakdown: emptySourceTypeBreakdown(),
        primarySources: [],
      };
    }

    return this.buildScanResult(fingerprints, words, corpusMatches, excludedWords);
  }

  /**
   * Build scan result from fingerprints, words, and corpus matches.
   * Internal method used by both matchDocument and runFullScan.
   */
  private buildScanResult(
    fingerprints: Fingerprint[],
    words: string[],
    corpusMatches: Map<number, CorpusMatchEntry[]>,
    excludedWords: number,
    excludeSmallMatches: number = 0,
  ): ScanResult {
    const totalWords = words.length;

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

      // Filter out small matches if excludeSmallMatches is set
      const filteredRegions = excludeSmallMatches > 0
        ? regionsWithText.filter(r => r.wordCount >= excludeSmallMatches)
        : regionsWithText;

      if (filteredRegions.length === 0) continue;

      // Calculate matched words for this source (deduped within source)
      const matchedWordSet = new Set<number>();
      for (const region of filteredRegions) {
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
        matchCount: filteredRegions.length,
        matchedWords: matchedWordsForSource,
        percentageOfDocument,
        regions: filteredRegions,
      });

      allRegions.push(...filteredRegions);
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

    // Compute source-type breakdown and identify primary sources
    const { sourceTypeBreakdown, primarySources } = this.computeSourceTypeBreakdown(
      sourceBreakdown,
      matchedWords,
      totalWords,
    );

    // Tag primary sources in sourceBreakdown
    const primarySourceIds = new Set(primarySources.map(ps => ps.sourceId));
    for (const source of sourceBreakdown) {
      source.isPrimary = primarySourceIds.has(source.sourceId);
    }

    // Sort match regions by startWordIndex
    allRegions.sort((a, b) => a.startWordIndex - b.startWordIndex);

    // Tag regions that belong to primary sources
    for (const region of allRegions) {
      region.isPrimary = primarySourceIds.has(region.sourceId);
    }

    // Build backward-compatible flaggedSegments
    const flaggedSegments: string[] = allRegions.map(r => r.text);

    // Build backward-compatible matches (PlagiarismMatch)
    const matches: PlagiarismMatch[] = allRegions.map((r) => ({
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
      sourceTypeBreakdown,
      primarySources,
    };
  }

  /**
   * Run a full scan with exclusion settings support (Turnitin-style).
   * This is the enhanced scan pipeline that supports citation exclusion,
   * small match filtering, and returns source-type breakdown + primary sources.
   *
   * @param submittedText - The raw document text
   * @param corpusMatches - Pre-computed corpus match map
   * @param exclusionSettings - Optional exclusion settings (defaults used if not provided)
   */
  runFullScan(
    submittedText: string,
    corpusMatches: Map<number, CorpusMatchEntry[]>,
    exclusionSettings?: Partial<ExclusionSettings>,
  ): ScanResult {
    const settings: ExclusionSettings = {
      ...DEFAULT_EXCLUSION_SETTINGS,
      ...exclusionSettings,
    };

    // Apply exclusions
    const { cleanedText, excludedWordCount } = this.applyExclusions(submittedText, settings);

    // Generate fingerprints from cleaned text
    const fingerprints = this.generateFingerprints(cleanedText);
    const words = this.splitIntoWords(cleanedText);
    const totalWords = words.length;

    if (fingerprints.length === 0 || totalWords === 0) {
      return {
        overallSimilarity: 0,
        totalWords,
        matchedWords: 0,
        excludedWords: excludedWordCount,
        sourceBreakdown: [],
        matchRegions: [],
        flaggedSegments: [],
        matches: [],
        sourceTypeBreakdown: emptySourceTypeBreakdown(),
        primarySources: [],
      };
    }

    return this.buildScanResult(
      fingerprints,
      words,
      corpusMatches,
      excludedWordCount,
      settings.excludeSmallMatches,
    );
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
