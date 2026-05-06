/**
 * NigWrite - Peer Review Single Item API
 * GET  /api/peer-reviews/[id]  — Get peer review with scores
 * PUT  /api/peer-reviews/[id]  — Update peer review (save draft scores/comments)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const review = await db.peerReview.findUnique({
      where: { id },
      include: {
        assignment: { select: { id: true, title: true, description: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        reviewee: { select: { id: true, name: true, email: true } },
        submission: {
          include: {
            document: { select: { id: true, title: true, contentBody: true } },
            student: { select: { id: true, name: true, email: true } },
            report: { select: { id: true, similarityScore: true, aiScore: true } },
          },
        },
        rubric: {
          select: {
            id: true,
            title: true,
            description: true,
            criteria: {
              select: {
                id: true,
                title: true,
                description: true,
                maxScore: true,
                weight: true,
                order: true,
                levels: {
                  select: { id: true, label: true, description: true, score: true, order: true },
                  orderBy: { order: 'asc' },
                },
              },
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
    });

    if (!review) {
      return NextResponse.json({ error: 'Peer review not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch peer review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { overallScore, overallComment, status } = body as {
      overallScore?: number;
      overallComment?: string;
      status?: string;
    };

    // Check review exists
    const existing = await db.peerReview.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Peer review not found' }, { status: 404 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Cannot modify a completed review' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (overallScore !== undefined) updateData.overallScore = overallScore;
    if (overallComment !== undefined) updateData.overallComment = overallComment;
    if (status) updateData.status = status;

    const updated = await db.peerReview.update({
      where: { id },
      data: updateData,
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
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update peer review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
