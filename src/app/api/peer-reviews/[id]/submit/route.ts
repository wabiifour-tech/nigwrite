/**
 * NigWrite - Submit Peer Review API
 * POST /api/peer-reviews/[id]/submit  — Submit completed peer review with criteria scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { overallScore, overallComment, criteriaScores } = body as {
      overallScore: number;
      overallComment?: string;
      criteriaScores: Array<{
        criteriaId: string;
        score: number;
        comment?: string;
      }>;
    };

    if (overallScore === undefined || !criteriaScores?.length) {
      return NextResponse.json(
        { error: 'overallScore and criteriaScores are required' },
        { status: 400 }
      );
    }

    // Check review exists and is not already completed
    const existing = await db.peerReview.findUnique({
      where: { id },
      include: { rubric: { select: { id: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Peer review not found' }, { status: 404 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Review has already been submitted' }, { status: 400 });
    }

    // Delete old criteria scores for this review (if any)
    await db.peerReviewCriteriaScore.deleteMany({ where: { reviewId: id } });

    // Create new criteria scores
    await db.peerReviewCriteriaScore.createMany({
      data: criteriaScores.map(cs => ({
        reviewId: id,
        criteriaId: cs.criteriaId,
        score: cs.score,
        comment: cs.comment || null,
      })),
    });

    // Update review as completed
    const completedReview = await db.peerReview.update({
      where: { id },
      data: {
        status: 'completed',
        overallScore,
        overallComment: overallComment || null,
        completedAt: new Date(),
      },
      include: {
        assignment: { select: { id: true, title: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        reviewee: { select: { id: true, name: true, email: true } },
        submission: {
          select: {
            id: true,
            document: { select: { id: true, title: true } },
          },
        },
        criteriaScores: {
          include: {
            criteria: { select: { id: true, title: true, maxScore: true, weight: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: completedReview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit peer review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
