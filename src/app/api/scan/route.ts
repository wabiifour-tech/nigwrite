/**
 * NigWrite - Document Scan API
 * POST /api/scan
 * Created by: Wabi The Tech Nurse
 *
 * Accepts a document text, runs it through the Winnowing Engine
 * for plagiarism detection, AI detection, optional web search,
 * and returns a complete scan report with real-time progress.
 *
 * POST returns scanId immediately; actual processing happens in background.
 * Client should listen to /api/scan-progress?id=scanId for progress,
 * then fetch GET /api/scan-result?id=scanId for the completed report.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WinnowingEngine } from '@/lib/winnowing-engine';
import { AIDetector } from '@/lib/ai-detector';
import { getFingerprintStore, type FingerprintEntry } from '@/lib/fingerprint-store';
import { db } from '@/lib/db';
import { scanProgressTracker, type ScanProgress } from '@/app/api/scan-progress/route';
import ZAI from 'z-ai-web-dev-sdk';

// In-memory store for completed scan results
const scanResults = new Map<string, unknown>();

function updateProgress(scanId: string, stage: ScanProgress['stage'], progress: number, message: string) {
  scanProgressTracker.set(scanId, {
    id: scanId,
    stage,
    progress,
    message,
    timestamp: Date.now(),
  });
}

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
        // Use search snippets as content proxy (web_reader not available)
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
 * The main scan pipeline — runs in background after POST returns scanId.
 */
async function runScanPipeline(
  scanId: string,
  title: string,
  content: string,
  userId?: string
) {
  try {
    const winnowing = new WinnowingEngine();
    const aiDetector = new AIDetector();
    const store = getFingerprintStore();

    // ── Stage 1: Fingerprinting ──
    updateProgress(scanId, 'fingerprinting', 10, 'Generating document fingerprints...');
    const fingerprints = winnowing.generateFingerprints(content);
    updateProgress(scanId, 'fingerprinting', 25, `Generated ${fingerprints.length} fingerprints`);

    // ── Stage 2: Local Corpus Matching ──
    updateProgress(scanId, 'matching', 30, 'Matching against local corpus (60+ academic sources)...');
    const corpusMatches = store.search(fingerprints.map(fp => fp.hash));
    const scanResult = winnowing.matchDocument(content, corpusMatches);
    updateProgress(scanId, 'matching', 50, `Found ${scanResult.matches.length} local corpus matches`);

    // ── Stage 3: Web Search (optional, for documents >100 words) ──
    let webMatches: { text: string; sourceTitle: string; sourceUrl: string }[] = [];
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount > 100) {
      updateProgress(scanId, 'web_search', 55, 'Searching the web for matching content...');
      try {
        webMatches = await searchWebForMatches(content);

        if (webMatches.length > 0) {
          const webFingerprintMatches = new Map<number, FingerprintEntry[]>();
          for (const wm of webMatches) {
            const webFingerprints = winnowing.generateFingerprints(wm.text);
            for (const fp of webFingerprints) {
              const existing = webFingerprintMatches.get(fp.hash) || [];
              existing.push({
                hash: fp.hash,
                documentId: `web-${wm.sourceUrl}`,
                position: fp.position,
                ngram: fp.ngram,
                sourceTitle: wm.sourceTitle,
                sourceUrl: wm.sourceUrl,
              });
              webFingerprintMatches.set(fp.hash, existing);
            }
          }

          // Re-run match with combined corpus
          const combinedMatches = new Map(corpusMatches);
          for (const [hash, entries] of webFingerprintMatches) {
            const existing = combinedMatches.get(hash) || [];
            existing.push(...entries);
            combinedMatches.set(hash, existing);
          }

          const combinedResult = winnowing.matchDocument(content, combinedMatches);
          const existingSourceIds = new Set(scanResult.matches.map(m => m.sourceTitle));
          for (const match of combinedResult.matches) {
            if (!existingSourceIds.has(match.sourceTitle) && match.sourceUrl) {
              scanResult.matches.push(match);
            }
          }

          const allFingerprints = winnowing.generateFingerprints(content);
          let totalMatchCount = 0;
          for (const fp of allFingerprints) {
            if (corpusMatches.has(fp.hash) || webFingerprintMatches.has(fp.hash)) {
              totalMatchCount++;
            }
          }
          const combinedSimilarity = Math.round(
            (totalMatchCount / Math.max(allFingerprints.length, 1)) * 100
          );
          scanResult.overallSimilarity = Math.min(Math.max(scanResult.overallSimilarity, combinedSimilarity), 100);

          updateProgress(scanId, 'web_search', 65, `Found ${webMatches.length} additional web sources`);
        }
      } catch {
        updateProgress(scanId, 'web_search', 65, 'Web search unavailable, using local corpus');
      }
    } else {
      updateProgress(scanId, 'web_search', 65, 'Document too short for web search (skipped)');
    }

    // ── Stage 4: AI Detection ──
    updateProgress(scanId, 'ai_detection', 70, 'Analyzing for AI-generated content...');
    const aiResult = aiDetector.analyzeText(content);

    updateProgress(scanId, 'ai_detection', 80, 'Running per-sentence AI analysis...');
    const aiSentences = aiDetector.analyzeBySentence(content);

    updateProgress(scanId, 'ai_detection', 85, `AI analysis complete — ${aiSentences.filter(s => s.isFlagged).length} sentences flagged`);

    // ── Stage 5: Save to Database ──
    updateProgress(scanId, 'saving', 90, 'Saving scan report...');

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
    const resultData = {
      reportId: report.id,
      documentId: document.id,
      title: document.title,
      createdAt: document.createdAt,
      scanId,
      plagiarism: {
        similarityScore: scanResult.overallSimilarity,
        totalFingerprints: fingerprints.length,
        matchingFingerprints: scanResult.matches.length,
        flaggedSegments: scanResult.flaggedSegments,
        webSourcesSearched: webMatches.length,
        matches: scanResult.matches.map(m => ({
          text: m.text,
          sourceTitle: m.sourceTitle,
          sourceUrl: m.sourceUrl,
          contribution: m.similarityContribution,
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

    scanResults.set(scanId, { success: true, data: resultData });

    // ── Stage 6: Complete ──
    updateProgress(scanId, 'complete', 100, 'Scan complete!');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    scanResults.set(scanId, { success: false, error: message });
    updateProgress(scanId, 'complete', 100, `Scan failed: ${message}`);
  }
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

    // Generate scan ID
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Store initial progress
    updateProgress(scanId, 'fingerprinting', 5, 'Initializing scan...');

    // Start background scan pipeline (fire and forget)
    runScanPipeline(scanId, title || 'Untitled Document', content, userId);

    // Return scanId immediately
    return NextResponse.json({
      success: true,
      scanId,
      message: 'Scan started. Track progress via /api/scan-progress',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Get completed scan result
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (id && id.startsWith('scan-')) {
    // Fetch a specific scan result
    const result = scanResults.get(id);
    if (result) {
      return NextResponse.json(result);
    }

    // No result yet — check progress
    const progress = scanProgressTracker.get(id);
    if (progress) {
      return NextResponse.json({
        success: false,
        stillProcessing: progress.stage !== 'complete',
        progress,
      });
    }

    return NextResponse.json({ success: false, error: 'Scan not found or expired' }, { status: 404 });
  }

  // Get scan history
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
