/**
 * NigWrite - Peer Reviews API
 * GET  /api/peer-reviews?assignmentId=xxx&reviewerId=xxx&status=xxx  — List peer reviews
 * POST /api/peer-reviews  — Create peer review assignments (auto-distribute pairings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const reviewerId = searchParams.get('reviewerId');
    const revieweeId = searchParams.get('revieweeId');
    const status = searchParams.get('status');
    const submissionId = searchParams.get('submissionId');

    const where: Record<string, unknown> = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (revieweeId) where.revieweeId = revieweeId;
    if (status) where.status = status;
    if (submissionId) where.submissionId = submissionId;

    const reviews = await db.peerReview.findMany({
      where,
      include: {
        assignment: { select: { id: true, title: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        reviewee: { select: { id: true, name: true, email: true } },
        submission: {
          select: {
            id: true,
            document: { select: { id: true, title: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        },
        rubric: {
          select: {
            id: true,
            title: true,
            criteria: {
              select: { id: true, title: true, description: true, maxScore: true, weight: true, order: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        criteriaScores: {
          include: {
            criteria: { select: { id: true, title: true, maxScore: true, weight: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch peer reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, reviewerIds, revieweeIds, rubricId, isAnonymous } = body as {
      assignmentId: string;
      reviewerIds: string[];
      revieweeIds: string[];
      rubricId?: string;
      isAnonymous?: boolean;
    };

    if (!assignmentId || !reviewerIds?.length || !revieweeIds?.length) {
      return NextResponse.json(
        { error: 'assignmentId, reviewerIds, and revieweeIds are required' },
        { status: 400 }
      );
    }

    // Verify assignment exists
    const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get submissions for each reviewee in this assignment
    const submissions = await db.submission.findMany({
      where: {
        assignmentId,
        studentId: { in: revieweeIds },
      },
      include: {
        document: { select: { id: true } },
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json(
        { error: 'No submissions found for the specified students in this assignment' },
        { status: 400 }
      );
    }

    // Build a map of studentId -> submissionId
    const studentSubmissionMap = new Map<string, string>();
    for (const sub of submissions) {
      if (sub.studentId) {
        studentSubmissionMap.set(sub.studentId, sub.id);
      }
    }

    // Auto-distribute pairings (round-robin with shuffle to avoid self-review)
    // Each reviewer reviews multiple reviewees if there are more reviewees than reviewers
    const reviewers = shuffle(reviewerIds);
    const reviewees = shuffle(revieweeIds).filter(
      rid => studentSubmissionMap.has(rid)
    );

    if (reviewees.length === 0) {
      return NextResponse.json(
        { error: 'No reviewable submissions found (students must have submitted)' },
        { status: 400 }
      );
    }

    // Distribute: reviewer[i % reviewers.length] reviews reviewees[i]
    // Also ensure no self-review
    const pairings: Array<{ reviewerId: string; revieweeId: string; submissionId: string }> = [];
    const reviewsPerReviewer = Math.ceil(reviewees.length / reviewers.length);

    for (let rIdx = 0; rIdx < reviewers.length; rIdx++) {
      const reviewer = reviewers[rIdx];
      let assigned = 0;
      for (let eIdx = rIdx; eIdx < reviewees.length && assigned < reviewsPerReviewer; eIdx += reviewers.length) {
        const reviewee = reviewees[eIdx];
        if (reviewer === reviewee) continue; // Skip self-review
        const subId = studentSubmissionMap.get(reviewee);
        if (subId) {
          pairings.push({ reviewerId: reviewer, revieweeId: reviewee, submissionId: subId });
          assigned++;
        }
      }
    }

    // If some reviewers got fewer assignments, redistribute
    // (simple round-robin already handles this)

    // Delete existing pending reviews for this assignment to avoid duplicates
    await db.peerReview.deleteMany({
      where: { assignmentId, status: 'pending' },
    });

    // Create peer review assignments
    const createdReviews = await db.peerReview.createMany({
      data: pairings.map(p => ({
        assignmentId,
        reviewerId: p.reviewerId,
        revieweeId: p.revieweeId,
        submissionId: p.submissionId,
        rubricId: rubricId || null,
        isAnonymous: isAnonymous ?? true,
        status: 'pending',
      })),
    });

    // Fetch created reviews with relations
    const allReviews = await db.peerReview.findMany({
      where: { assignmentId },
      include: {
        assignment: { select: { id: true, title: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        reviewee: { select: { id: true, name: true, email: true } },
        submission: {
          select: {
            id: true,
            document: { select: { id: true, title: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        },
        rubric: {
          select: {
            id: true,
            title: true,
            criteria: {
              select: { id: true, title: true, description: true, maxScore: true, weight: true, order: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        created: createdReviews.count,
        reviews: allReviews,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create peer reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
