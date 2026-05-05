/**
 * NigWrite - Document Scan API
 * POST /api/scan
 * Created by: Wabi The Tech Nurse
 *
 * Accepts a document text, runs it through the Winnowing Engine
 * for plagiarism detection (Turnitin-style word-based scoring),
 * AI detection, enhanced web search (multi-query, classified, deep extraction),
 * and returns a complete scan report.
 *
 * GET /api/scan — Returns scan history
 */

import { NextRequest, NextResponse } from 'next/server';
import { WinnowingEngine, type CorpusMatchEntry, type ExclusionSettings, DEFAULT_EXCLUSION_SETTINGS } from '@/lib/winnowing-engine';
import { AIDetector } from '@/lib/ai-detector';
import { getFingerprintStore, type FingerprintEntry } from '@/lib/fingerprint-store';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ═══════════════════════════════════════════════════════════════
// Web Search Enhancement — Configuration & Types
// ═══════════════════════════════════════════════════════════════

const WEB_SEARCH_CONFIG = {
  maxTotalTimeoutMs: 15_000,   // Hard cap on total web search time
  maxPrimaryQueries: 3,        // 3 diverse queries from the document
  maxSecondarySearches: 5,     // Up to 5 secondary deep-content searches
  resultsPerQuery: 5,          // Results per primary query
  maxContentPerSource: 3000,   // Cap content per source to reduce noise
  perQueryTimeoutMs: 5000,     // Timeout per individual search call
};

/** Internal representation of a deduplicated, classified web result. */
interface ClassifiedWebResult {
  url: string;
  title: string;
  snippet: string;
  hostname: string;
  sourceType: 'internet' | 'publication';
  extraContent: string;
}

// ═══════════════════════════════════════════════════════════════
// Helper: Find the most unique sentence from the middle 60%
// ═══════════════════════════════════════════════════════════════

function findMostUniqueSentence(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30);

  if (sentences.length === 0) return '';
  if (sentences.length < 3) return sentences[0] || '';

  // Build word frequency map from the whole document
  const wordFreq = new Map<string, number>();
  const allWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  for (const word of allWords) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }
  // Consider only sentences from the middle 60% of the document
  const startIdx = Math.floor(sentences.length * 0.2);
  const endIdx = Math.ceil(sentences.length * 0.8);
  const middleSentences = sentences.slice(startIdx, endIdx);

  let bestScore = -1;
  let bestSentence = '';

  for (const sentence of middleSentences) {
    const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let score = 0;
    for (const word of words) {
      const freq = wordFreq.get(word) || 1;
      // Rare words contribute more: longer word × inverse frequency
      score += word.length * (1 / freq);
    }
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  return bestSentence || sentences[Math.floor(sentences.length / 2)] || '';
}

// ═══════════════════════════════════════════════════════════════
// Helper: Extract 3 diverse search queries from the document
// ═══════════════════════════════════════════════════════════════

function extractSearchQueries(text: string): string[] {
  const queries: string[] = [];

  // 1. First 200 characters (general topic / opening)
  const firstPart = text.substring(0, 200).trim();
  if (firstPart.length > 10) {
    queries.push(firstPart);
  }

  // 2. Most unique sentence from middle 60%
  const uniqueSentence = findMostUniqueSentence(text);
  if (uniqueSentence && uniqueSentence.length > 20) {
    queries.push(uniqueSentence.substring(0, 200));
  }

  // 3. Last 200 characters (conclusion area)
  const lastPart = text.substring(Math.max(0, text.length - 200)).trim();
  if (lastPart.length > 10 && lastPart !== firstPart) {
    queries.push(lastPart);
  }

  return queries;
}

// ═══════════════════════════════════════════════════════════════
// Helper: Classify web sources by type (internet vs publication)
// ═══════════════════════════════════════════════════════════════

function classifyWebSource(url: string, snippet: string): 'internet' | 'publication' {
  const academicDomains = [
    '.edu', '.ac.', '.gov', 'scholar.google', 'researchgate',
    'springer', 'elsevier', 'wiley', 'ieee', 'acm', 'nature.com', 'science.org',
    'jstor', 'tandfonline', 'sagepub', 'mdpi', 'plos', 'bmc', 'frontiersin',
    'doi.org', 'arxiv.org', 'pubmed', 'ncbi',
  ];

  const journalIndicators = [
    'journal', 'proceedings', 'conference', 'paper',
    'abstract', 'doi', 'issn', 'volume', 'issue', 'pp.', 'pages',
  ];

  const lowerUrl = url.toLowerCase();
  const lowerSnippet = (snippet || '').toLowerCase();

  // Check academic domains in URL
  for (const domain of academicDomains) {
    if (lowerUrl.includes(domain)) return 'publication';
  }

  // Check journal indicators in snippet (need ≥2 matches for confidence)
  let indicatorCount = 0;
  for (const indicator of journalIndicators) {
    if (lowerSnippet.includes(indicator)) indicatorCount++;
  }
  if (indicatorCount >= 2) return 'publication';

  return 'internet';
}

// ═══════════════════════════════════════════════════════════════
// Helper: Execute a single web search with timeout
// ═══════════════════════════════════════════════════════════════

type ZAISdk = Awaited<ReturnType<typeof ZAI.create>>;
type RawSearchResult = { url?: string; name?: string; snippet?: string; host_name?: string };

async function executeWebSearch(
  zai: ZAISdk,
  query: string,
  num: number,
  timeoutMs: number,
): Promise<RawSearchResult[]> {
  try {
    const result = await Promise.race([
      zai.functions.invoke('web_search', { query, num }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Web search timeout')), timeoutMs)
      ),
    ]);

    if (Array.isArray(result)) {
      return result as RawSearchResult[];
    }
    return [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper: Extract hostname from URL
// ═══════════════════════════════════════════════════════════════

function extractHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

// ═══════════════════════════════════════════════════════════════
// Enhanced Web Search — Multi-Query, Classified, Deep Extraction
//
// Improvements over the original single-query approach:
//   A) Multi-Query Search: 3 diverse queries (opening, unique middle, conclusion)
//   B) Full Snippet Extraction: up to 3000 chars per source via secondary searches
//   C) Source Type Classification: academic domains/snippets → 'publication'
//   D) Secondary Targeted Search: "exact phrase" site:hostname for deeper matches
//   E) Deduplication: same URL never fingerprinted twice
//
// Total API calls: max 3 primary + 5 secondary = 8
// Total timeout: 15 seconds hard cap
// Graceful degradation: failures are silently skipped
// ═══════════════════════════════════════════════════════════════

async function searchWebForMatches(
  text: string,
  winnowing: WinnowingEngine,
): Promise<CorpusMatchEntry[]> {
  try {
    const zai = await ZAI.create();
    const startTime = Date.now();
    const cfg = WEB_SEARCH_CONFIG;

    // ── Step 1: Extract 3 diverse search queries ──
    const queries = extractSearchQueries(text);
    const queriesToRun = queries.slice(0, cfg.maxPrimaryQueries);

    if (queriesToRun.length === 0) return [];

    // ── Step 2: Execute primary searches (up to 3 queries × 5 results = 15 sources) ──
    const allRawResults: RawSearchResult[] = [];

    for (const query of queriesToRun) {
      const elapsed = Date.now() - startTime;
      const remaining = cfg.maxTotalTimeoutMs - elapsed;
      if (remaining <= 0) break;

      const perQueryTimeout = Math.min(cfg.perQueryTimeoutMs, remaining);
      const results = await executeWebSearch(zai, query, cfg.resultsPerQuery, perQueryTimeout);
      allRawResults.push(...results);
    }

    // ── Step 3: Deduplicate by URL and classify each source ──
    const seenUrls = new Set<string>();
    const uniqueResults: ClassifiedWebResult[] = [];

    for (const raw of allRawResults) {
      const url = raw.url;
      if (!url || seenUrls.has(url)) continue;

      seenUrls.add(url);
      const snippet = raw.snippet || '';
      if (snippet.length < 20) continue;

      uniqueResults.push({
        url,
        title: raw.name || 'Web Source',
        snippet,
        hostname: raw.host_name || extractHostname(url),
        sourceType: classifyWebSource(url, snippet),
        extraContent: '',
      });
    }

    if (uniqueResults.length === 0) return [];

    // ── Step 4: Secondary targeted search for deeper content extraction ──
    // Pick key phrases from different parts of the document
    const docWords = text.split(/\s+/).filter(w => w.length > 3);
    const keyPhrases: string[] = [];
    if (docWords.length >= 5) {
      const step = Math.max(1, Math.floor(docWords.length / 5));
      for (let i = 0; i < docWords.length - 4 && keyPhrases.length < 5; i += step) {
        keyPhrases.push(docWords.slice(i, i + 5).join(' '));
      }
    }

    let secondaryCount = 0;
    for (const result of uniqueResults) {
      if (secondaryCount >= cfg.maxSecondarySearches) break;

      const elapsed = Date.now() - startTime;
      const remaining = cfg.maxTotalTimeoutMs - elapsed;
      if (remaining <= 1000) break;

      // Build a targeted query: exact phrase + site:hostname
      const phrase = keyPhrases[secondaryCount % keyPhrases.length];
      if (!phrase) break;

      const targetedQuery = `"${phrase}" site:${result.hostname}`;
      const secondaryResults = await executeWebSearch(
        zai, targetedQuery, 3, Math.min(3000, remaining),
      );

      // Extract additional snippet content from secondary search
      let extraText = '';
      for (const sr of secondaryResults) {
        if (sr.snippet && sr.snippet.length > 20) {
          extraText += ' ' + sr.snippet;
        }
      }

      // Cap additional content at 1500 characters
      result.extraContent = extraText.trim().substring(0, 1500);
      secondaryCount++;
    }

    // ── Step 5: Combine content, cap per source, fingerprint, return CorpusMatchEntry[] ──
    const allEntries: CorpusMatchEntry[] = [];

    for (const result of uniqueResults) {
      // Combine original snippet + extra content from secondary search
      let combinedText = result.snippet;
      if (result.extraContent.length > 0) {
        combinedText = combinedText + ' ' + result.extraContent;
      }

      // Cap total content per source at maxContentPerSource to avoid noise
      combinedText = combinedText.substring(0, cfg.maxContentPerSource);
      if (combinedText.length < 20) continue;

      // Fingerprint the combined content using the winnowing engine
      const fingerprints = winnowing.generateFingerprints(combinedText);

      for (const fp of fingerprints) {
        allEntries.push({
          documentId: `web-${result.url}`,
          ngram: fp.ngram,
          sourceTitle: result.title,
          sourceUrl: result.url,
          sourceType: result.sourceType,
          position: fp.position,
        });
      }
    }

    return allEntries;
  } catch {
    // Any failure in web search → gracefully return empty (local corpus still works)
    return [];
  }
}

/**
 * Convert FingerprintEntry[] to CorpusMatchEntry[] for the engine.
 */
function toCorpusMatchEntries(entries: FingerprintEntry[]): CorpusMatchEntry[] {
  return entries.map(e => ({
    documentId: e.documentId,
    ngram: e.ngram,
    sourceTitle: e.sourceTitle,
    sourceUrl: e.sourceUrl,
    sourceType: e.sourceType,
    position: e.position,
  }));
}

/**
 * The main scan pipeline — runs synchronously and returns the full report.
 * Uses Turnitin-style word-based scoring with exclusion settings,
 * source-type breakdown, primary sources identification,
 * enhanced multi-query web search, and dynamic user document indexing.
 */
async function runScanPipeline(
  title: string,
  content: string,
  userId?: string,
  exclusionSettings?: Partial<ExclusionSettings>,
) {
  const winnowing = new WinnowingEngine();
  const aiDetector = new AIDetector();
  const store = getFingerprintStore();

  const settings: ExclusionSettings = {
    ...DEFAULT_EXCLUSION_SETTINGS,
    ...exclusionSettings,
  };

  // ── Stage 1: Fingerprint cleaned text for corpus search ──
  const { cleanedText, excludedWordCount } = winnowing.applyExclusions(content, settings);
  const fingerprints = winnowing.generateFingerprints(cleanedText);

  // ── Stage 2: Local Corpus Matching ──
  const corpusMatchMap = store.search(fingerprints.map(fp => fp.hash));

  // Convert to CorpusMatchEntry format
  const corpusMatches = new Map<number, CorpusMatchEntry[]>();
  for (const [hash, entries] of corpusMatchMap) {
    corpusMatches.set(hash, toCorpusMatchEntries(entries));
  }

  // ── Stage 3: Enhanced Web Search (optional, for documents >100 words) ──
  // Multi-query search with source classification and secondary deep extraction.
  // Max 8 API calls, 15s timeout, graceful degradation on failure.
  let webSourcesSearched = 0;
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  let combinedMatches = corpusMatches;

  if (wordCount > 100) {
    try {
      const webEntries = await searchWebForMatches(content, winnowing);

      // Count unique web sources (by documentId)
      webSourcesSearched = new Set(webEntries.map(e => e.documentId)).size;

      if (webEntries.length > 0) {
        // Build web fingerprint map from returned CorpusMatchEntry[]
        // Hash is computed from ngram using the same rabinKarpHash the engine uses
        const webFingerprintEntries = new Map<number, CorpusMatchEntry[]>();
        for (const entry of webEntries) {
          const hash = winnowing.rabinKarpHash(entry.ngram);
          const existing = webFingerprintEntries.get(hash) || [];
          existing.push(entry);
          webFingerprintEntries.set(hash, existing);
        }

        // Combine corpus + web matches
        combinedMatches = new Map<number, CorpusMatchEntry[]>();
        for (const [hash, entries] of corpusMatches) {
          combinedMatches.set(hash, [...entries]);
        }
        for (const [hash, entries] of webFingerprintEntries) {
          const existing = combinedMatches.get(hash) || [];
          existing.push(...entries);
          combinedMatches.set(hash, existing);
        }
      }
    } catch {
      // Web search unavailable — continue with local corpus only
    }
  }

  // ── Stage 4: Run Full Scan with Turnitin-style features ──
  const scanResult = winnowing.runFullScan(content, combinedMatches, settings);

  // ── Stage 5: AI Detection ──
  const aiResult = aiDetector.analyzeText(content);
  const aiSentences = aiDetector.analyzeBySentence(content);

  // ── Stage 6: Save to Database ──
  const document = await db.document.create({
    data: {
      title: title || 'Untitled Document',
      contentBody: content,
      userId: userId || null,
    },
  });

  const report = await db.scanReport.create({
    data: {
      documentId: document.id,
      similarityScore: scanResult.overallSimilarity,
      aiScore: aiResult.aiProbability,
      status: 'completed',
    },
  });

  for (const segment of scanResult.flaggedSegments) {
    const matchingSource = scanResult.matches.find(
      m => segment.toLowerCase().includes(m.text.toLowerCase().split(' ').slice(0, 3).join(' '))
    );
    await db.flaggedSegment.create({
      data: {
        reportId: report.id,
        segmentText: segment,
        sourceLink: matchingSource?.sourceUrl || null,
        similarityType: 'plagiarism',
      },
    });
  }

  if (aiResult.aiProbability > 40) {
    await db.flaggedSegment.create({
      data: {
        reportId: report.id,
        segmentText: aiResult.indicators.join('\n'),
        sourceLink: null,
        similarityType: 'ai_generated',
      },
    });
  }

  // ── Stage 7: Index user submission for future cross-checking ──
  try {
    store.addUserDocument(
      `user-doc-${document.id}`,
      title || 'Untitled Document',
      content,
      'student_paper',
    );
  } catch {
    // Indexing failure should not block the scan response
    console.warn('[NigWrite] Failed to index user document for cross-checking');
  }

  // Build final result with enriched Turnitin-style data
  return {
    reportId: report.id,
    documentId: document.id,
    title: document.title,
    createdAt: document.createdAt,
    plagiarism: {
      similarityScore: scanResult.overallSimilarity,
      totalWords: scanResult.totalWords,
      matchedWords: scanResult.matchedWords,
      excludedWords: scanResult.excludedWords,
      totalFingerprints: fingerprints.length,
      matchingFingerprints: scanResult.matches.length,
      flaggedSegments: scanResult.flaggedSegments,
      webSourcesSearched,
      matches: scanResult.matches.map(m => ({
        text: m.text,
        sourceTitle: m.sourceTitle,
        sourceUrl: m.sourceUrl,
        contribution: m.similarityContribution,
      })),
      sourceBreakdown: scanResult.sourceBreakdown.map(sb => ({
        sourceId: sb.sourceId,
        sourceTitle: sb.sourceTitle,
        sourceType: sb.sourceType,
        sourceUrl: sb.sourceUrl,
        matchCount: sb.matchCount,
        matchedWords: sb.matchedWords,
        percentageOfDocument: sb.percentageOfDocument,
        isPrimary: sb.isPrimary,
        regions: sb.regions.map(r => ({
          startWordIndex: r.startWordIndex,
          endWordIndex: r.endWordIndex,
          text: r.text,
          sourceId: r.sourceId,
          sourceTitle: r.sourceTitle,
          sourceType: r.sourceType,
          sourceUrl: r.sourceUrl,
          wordCount: r.wordCount,
          isPrimary: r.isPrimary,
        })),
      })),
      matchRegions: scanResult.matchRegions.map(r => ({
        startWordIndex: r.startWordIndex,
        endWordIndex: r.endWordIndex,
        text: r.text,
        sourceId: r.sourceId,
        sourceTitle: r.sourceTitle,
        sourceType: r.sourceType,
        sourceUrl: r.sourceUrl,
        wordCount: r.wordCount,
        isPrimary: r.isPrimary,
      })),
      // New Turnitin-style enriched fields
      sourceTypeBreakdown: scanResult.sourceTypeBreakdown,
      primarySources: scanResult.primarySources.map(ps => ({
        sourceId: ps.sourceId,
        sourceTitle: ps.sourceTitle,
        sourceType: ps.sourceType,
        sourceUrl: ps.sourceUrl,
        matchCount: ps.matchCount,
        matchedWords: ps.matchedWords,
        percentageOfDocument: ps.percentageOfDocument,
        isPrimary: true,
      })),
    },
    aiDetection: {
      aiProbability: aiResult.aiProbability,
      perplexity: aiResult.perplexityScore,
      burstiness: aiResult.burstinessScore,
      vocabularyDiversity: aiResult.vocabularyDiversity,
      averageSentenceLength: aiResult.averageSentenceLength,
      sentenceLengthVariance: aiResult.sentenceLengthVariance,
      confidence: aiResult.confidence,
      indicators: aiResult.indicators,
      sentences: aiSentences.filter(s => s.aiScore > 0).map(s => ({
        sentence: s.sentence,
        aiScore: s.aiScore,
        startOffset: s.startOffset,
        endOffset: s.endOffset,
        isFlagged: s.isFlagged,
      })),
    },
    verdict: getOverallVerdict(scanResult.overallSimilarity, aiResult.aiProbability),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, userId, exclusionSettings } = body as {
      title?: string;
      content: string;
      userId?: string;
      exclusionSettings?: Partial<ExclusionSettings>;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }

    // Run the full scan pipeline synchronously — returns complete report
    const resultData = await runScanPipeline(
      title || 'Untitled Document',
      content,
      userId,
      exclusionSettings,
    );

    return NextResponse.json({
      success: true,
      data: resultData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    console.error('[NigWrite] Scan error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// Get scan history
export async function GET(request: NextRequest) {
  try {
    const reports = await db.scanReport.findMany({
      include: {
        document: true,
        flaggedSegments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Generate an overall academic integrity verdict.
 */
function getOverallVerdict(plagiarismScore: number, aiScore: number): {
  status: 'original' | 'warning' | 'flagged' | 'critical';
  label: string;
  description: string;
  color: string;
} {
  const maxScore = Math.max(plagiarismScore, aiScore);

  if (maxScore < 15) {
    return {
      status: 'original',
      label: 'Original Work',
      description: 'This document appears to be original with minimal similarity to existing sources and no significant AI-generated patterns detected.',
      color: 'emerald',
    };
  } else if (maxScore < 35) {
    return {
      status: 'warning',
      label: 'Minor Similarity Detected',
      description: 'Some similarity to existing sources was found. Review the flagged sections and ensure proper citations are included where needed.',
      color: 'amber',
    };
  } else if (maxScore < 60) {
    return {
      status: 'flagged',
      label: 'Significant Similarity Detected',
      description: 'Substantial similarity to existing sources and/or AI-generated content patterns were detected. Significant revision is recommended.',
      color: 'orange',
    };
  } else {
    return {
      status: 'critical',
      label: 'High Similarity / Likely AI-Generated',
      description: 'This document has very high similarity to existing sources or shows strong indicators of AI-generated content. Major revision required before submission.',
      color: 'red',
    };
  }
}
