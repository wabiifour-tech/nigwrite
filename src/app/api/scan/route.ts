/**
 * NigWrite - Document Scan API
 * POST /api/scan
 * Created by: Wabi The Tech Nurse
 *
 * Accepts a document text, runs it through the Winnowing Engine
 * for plagiarism detection (Turnitin-style word-based scoring),
 * AI detection, optional web search, and returns a complete scan report.
 *
 * GET /api/scan — Returns scan history
 */

import { NextRequest, NextResponse } from 'next/server';
import { WinnowingEngine, type CorpusMatchEntry } from '@/lib/winnowing-engine';
import { AIDetector } from '@/lib/ai-detector';
import { getFingerprintStore, type FingerprintEntry } from '@/lib/fingerprint-store';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Search the web for matching content using z-ai-web-dev-sdk.
 * Returns additional fingerprint matches found via web search.
 */
async function searchWebForMatches(text: string): Promise<{
  text: string;
  sourceTitle: string;
  sourceUrl: string;
}[]> {
  try {
    const zai = await ZAI.create();
    const query = text.substring(0, 200).trim();

    const searchResult = await zai.functions.invoke('web_search', {
      query,
      num: 5,
    });

    const results = Array.isArray(searchResult) ? searchResult as Array<{
      url?: string;
      name?: string;
      snippet?: string;
      host_name?: string;
    }> : [];

    const webMatches: { text: string; sourceTitle: string; sourceUrl: string }[] = [];

    for (const result of results.slice(0, 5)) {
      const url = result.url;
      const title = result.name || 'Web Source';

      if (!url) continue;

      try {
        const fetchedContent = result.snippet || '';

        if (fetchedContent && typeof fetchedContent === 'string' && fetchedContent.length > 20) {
          webMatches.push({
            text: fetchedContent.substring(0, 2000),
            sourceTitle: title,
            sourceUrl: url,
          });
        }
      } catch {
        continue;
      }
    }

    return webMatches;
  } catch {
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
 * Uses Turnitin-style word-based scoring with quote/bibliography exclusion.
 */
async function runScanPipeline(title: string, content: string, userId?: string) {
  const winnowing = new WinnowingEngine();
  const aiDetector = new AIDetector();
  const store = getFingerprintStore();

  // ── Stage 1: Exclude quotes and bibliography ──
  const { cleanedText, excludedWordCount } = winnowing.excludeQuotesAndBibliography(content);

  // ── Stage 2: Fingerprint the cleaned text ──
  const fingerprints = winnowing.generateFingerprints(cleanedText);

  // ── Stage 3: Local Corpus Matching ──
  const corpusMatchMap = store.search(fingerprints.map(fp => fp.hash));

  // Convert to CorpusMatchEntry format
  const corpusMatches = new Map<number, CorpusMatchEntry[]>();
  for (const [hash, entries] of corpusMatchMap) {
    corpusMatches.set(hash, toCorpusMatchEntries(entries));
  }

  const scanResult = winnowing.matchDocument(cleanedText, corpusMatches, excludedWordCount);

  // ── Stage 4: Web Search (optional, for documents >100 words) ──
  let webSourcesSearched = 0;
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount > 100) {
    try {
      const webMatches = await searchWebForMatches(content);
      webSourcesSearched = webMatches.length;

      if (webMatches.length > 0) {
        // Build web fingerprint entries
        const webFingerprintEntries = new Map<number, CorpusMatchEntry[]>();
        for (const wm of webMatches) {
          const webFingerprints = winnowing.generateFingerprints(wm.text);
          for (const fp of webFingerprints) {
            const existing = webFingerprintEntries.get(fp.hash) || [];
            existing.push({
              documentId: `web-${wm.sourceUrl}`,
              ngram: fp.ngram,
              sourceTitle: wm.sourceTitle,
              sourceUrl: wm.sourceUrl,
              sourceType: 'internet' as const,
              position: fp.position,
            });
            webFingerprintEntries.set(fp.hash, existing);
          }
        }

        // Combine corpus + web matches
        const combinedMatches = new Map<number, CorpusMatchEntry[]>();
        for (const [hash, entries] of corpusMatches) {
          combinedMatches.set(hash, [...entries]);
        }
        for (const [hash, entries] of webFingerprintEntries) {
          const existing = combinedMatches.get(hash) || [];
          existing.push(...entries);
          combinedMatches.set(hash, existing);
        }

        // Re-run match with combined corpus
        const combinedResult = winnowing.matchDocument(cleanedText, combinedMatches, excludedWordCount);

        // Use the combined result
        scanResult.overallSimilarity = combinedResult.overallSimilarity;
        scanResult.matchedWords = combinedResult.matchedWords;
        scanResult.sourceBreakdown = combinedResult.sourceBreakdown;
        scanResult.matchRegions = combinedResult.matchRegions;
        scanResult.flaggedSegments = combinedResult.flaggedSegments;
        scanResult.matches = combinedResult.matches;
      }
    } catch {
      // Web search unavailable — continue with local corpus only
    }
  }

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

  // Build final result
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
        regions: sb.regions.map(r => ({
          startWordIndex: r.startWordIndex,
          endWordIndex: r.endWordIndex,
          text: r.text,
          sourceId: r.sourceId,
          sourceTitle: r.sourceTitle,
          sourceType: r.sourceType,
          sourceUrl: r.sourceUrl,
          wordCount: r.wordCount,
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
    const { title, content, userId } = body as {
      title?: string;
      content: string;
      userId?: string;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }

    // Run the full scan pipeline synchronously — returns complete report
    const resultData = await runScanPipeline(title || 'Untitled Document', content, userId);

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
