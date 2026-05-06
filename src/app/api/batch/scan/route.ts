/**
 * NigWrite - Batch Scan API
 * POST /api/batch/scan
 *
 * Accepts multiple documents in a single request, scans each one,
 * and returns an array of scan results.
 * Maximum 10 documents per request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WinnowingEngine, type ExclusionSettings, DEFAULT_EXCLUSION_SETTINGS } from '@/lib/winnowing-engine';
import { AIDetector } from '@/lib/ai-detector';
import { getPersistentFingerprintStore, type FingerprintEntry } from '@/lib/persistent-fingerprint-store';
import { db } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher';

interface BatchDocument {
  title?: string;
  content: string;
}

const MAX_BATCH_SIZE = 10;

/** Convert FingerprintEntry[] to CorpusMatchEntry[] for the engine. */
function toCorpusMatchEntries(entries: FingerprintEntry[]) {
  return entries.map(e => ({
    documentId: e.documentId,
    ngram: e.ngram,
    sourceTitle: e.sourceTitle,
    sourceUrl: e.sourceUrl,
    sourceType: e.sourceType,
    position: e.position,
  }));
}

/** Generate an overall academic integrity verdict. */
function getOverallVerdict(plagiarismScore: number, aiScore: number) {
  const maxScore = Math.max(plagiarismScore, aiScore);
  if (maxScore < 15) {
    return { status: 'original', label: 'Original Work', color: 'emerald' };
  } else if (maxScore < 35) {
    return { status: 'warning', label: 'Minor Similarity', color: 'amber' };
  } else if (maxScore < 60) {
    return { status: 'flagged', label: 'Significant Similarity', color: 'orange' };
  }
  return { status: 'critical', label: 'High Similarity / AI-Generated', color: 'red' };
}

/** Scan a single document (lightweight — skips web search for batch performance). */
async function scanSingleDocument(
  title: string,
  content: string,
  userId?: string,
  exclusionSettings?: Partial<ExclusionSettings>,
) {
  const winnowing = new WinnowingEngine();
  const aiDetector = new AIDetector();
  const store = await getPersistentFingerprintStore();

  const settings: ExclusionSettings = { ...DEFAULT_EXCLUSION_SETTINGS, ...exclusionSettings };

  const { cleanedText } = winnowing.applyExclusions(content, settings);
  const fingerprints = winnowing.generateFingerprints(cleanedText);

  const corpusMatchMap = await store.search(fingerprints.map(fp => fp.hash));
  const corpusMatches = new Map<number, ReturnType<typeof toCorpusMatchEntries>[number][]>();
  for (const [hash, entries] of corpusMatchMap) {
    corpusMatches.set(hash, toCorpusMatchEntries(entries));
  }

  const scanResult = winnowing.runFullScan(content, corpusMatches, settings);
  const aiResult = aiDetector.analyzeText(content);
  const aiSentences = aiDetector.analyzeBySentence(content);

  // Save to DB
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

  // Index user document for cross-checking
  try {
    await store.addUserDocument(
      `user-doc-${document.id}`,
      title || 'Untitled Document',
      content,
      'student_paper',
      userId,
    );
  } catch {
    // Indexing failure should not block
  }

  const verdict = getOverallVerdict(scanResult.overallSimilarity, aiResult.aiProbability);

  return {
    index: -1, // Will be set by caller
    reportId: report.id,
    documentId: document.id,
    title: document.title,
    success: true,
    plagiarism: {
      similarityScore: scanResult.overallSimilarity,
      totalWords: scanResult.totalWords,
      matchedWords: scanResult.matchedWords,
      flaggedSegments: scanResult.flaggedSegments,
      sourceBreakdown: scanResult.sourceBreakdown.map(sb => ({
        sourceId: sb.sourceId,
        sourceTitle: sb.sourceTitle,
        sourceType: sb.sourceType,
        sourceUrl: sb.sourceUrl,
        matchCount: sb.matchCount,
        matchedWords: sb.matchedWords,
        percentageOfDocument: sb.percentageOfDocument,
      })),
      sourceTypeBreakdown: scanResult.sourceTypeBreakdown,
    },
    aiDetection: {
      aiProbability: aiResult.aiProbability,
      perplexity: aiResult.perplexityScore,
      burstiness: aiResult.burstinessScore,
      vocabularyDiversity: aiResult.vocabularyDiversity,
      confidence: aiResult.confidence,
      indicators: aiResult.indicators,
      sentences: aiSentences.filter(s => s.aiScore > 0).map(s => ({
        sentence: s.sentence,
        aiScore: s.aiScore,
        isFlagged: s.isFlagged,
      })),
    },
    verdict,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documents, exclusionSettings, userId } = body as {
      documents: BatchDocument[];
      exclusionSettings?: Partial<ExclusionSettings>;
      userId?: string;
    };

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'documents array is required' },
        { status: 400 }
      );
    }

    if (documents.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_BATCH_SIZE} documents per request` },
        { status: 400 }
      );
    }

    // Validate each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.content || doc.content.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: `Document at index ${i} must have at least 10 characters of content` },
          { status: 400 }
        );
      }
    }

    // Scan all documents concurrently
    const scanPromises = documents.map((doc, index) =>
      scanSingleDocument(
        doc.title || `Document ${index + 1}`,
        doc.content,
        userId,
        exclusionSettings,
      ).then(result => ({ ...result, index }))
        .catch(err => ({
          index,
          success: false,
          title: doc.title || `Document ${index + 1}`,
          error: err instanceof Error ? err.message : 'Scan failed',
        }))
    );

    const results = await Promise.all(scanPromises);

    // Dispatch webhook events for each successful scan
    for (const result of results) {
      if (result.success && userId && 'reportId' in result) {
        dispatchWebhookEvent(userId, 'scan.complete', {
          reportId: (result as any).reportId,
          documentId: (result as any).documentId,
          title: result.title,
          similarityScore: (result as any).plagiarism?.similarityScore,
          aiScore: (result as any).aiDetection?.aiProbability,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        totalDocuments: documents.length,
        successfulScans: successCount,
        failedScans: documents.length - successCount,
        results,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Batch scan failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
