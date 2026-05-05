/**
 * NigWrite - Document Scan API
 * POST /api/scan
 * Created by: Wabi The Tech Nurse
 *
 * Accepts a document text, runs it through the Winnowing Engine
 * for plagiarism detection, and returns a complete scan report.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WinnowingEngine } from '@/lib/winnowing-engine';
import { AIDetector } from '@/lib/ai-detector';
import { getFingerprintStore } from '@/lib/fingerprint-store';
import { db } from '@/lib/db';

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

    // Initialize engines
    const winnowing = new WinnowingEngine();
    const aiDetector = new AIDetector();
    const store = getFingerprintStore();

    // Step 1: Run Plagiarism Detection (Winnowing Algorithm)
    const fingerprints = winnowing.generateFingerprints(content);
    const corpusMatches = store.search(fingerprints.map(fp => fp.hash));
    const scanResult = winnowing.matchDocument(content, corpusMatches);

    // Step 2: Run AI Content Detection
    const aiResult = aiDetector.analyzeText(content);

    // Step 3: Save document to database
    const document = await db.document.create({
      data: {
        title: title || 'Untitled Document',
        contentBody: content,
        userId: userId || null,
      },
    });

    // Step 4: Save scan report
    const report = await db.scanReport.create({
      data: {
        documentId: document.id,
        similarityScore: scanResult.overallSimilarity,
        aiScore: aiResult.aiProbability,
        status: 'completed',
      },
    });

    // Step 5: Save flagged segments
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

    // Also save AI-flagged indicators
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

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        documentId: document.id,
        title: document.title,
        createdAt: document.createdAt,
        plagiarism: {
          similarityScore: scanResult.overallSimilarity,
          totalFingerprints: fingerprints.length,
          matchingFingerprints: scanResult.matches.length,
          flaggedSegments: scanResult.flaggedSegments,
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
        },
        verdict: getOverallVerdict(scanResult.overallSimilarity, aiResult.aiProbability),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Get scan history
export async function GET() {
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
