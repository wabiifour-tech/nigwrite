/**
 * NigWrite - Inline Comments API
 * GET  /api/comments/inline?submissionId=xxx  — List comments for a submission
 * POST /api/comments/inline                     — Create an inline comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const createCommentSchema = z.object({
  submissionId: z.string().min(1),
  userId: z.string().min(1),
  text: z.string().min(1),
  position: z.number().int().min(0),
  rangeLength: z.number().int().min(0).default(0),
  color: z.string().default('#FFD700'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const comments = await db.inlineComment.findMany({
      where: { submissionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch comments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const comment = await db.inlineComment.create({
      data: {
        submissionId: parsed.data.submissionId,
        userId: parsed.data.userId,
        text: parsed.data.text,
        position: parsed.data.position,
        rangeLength: parsed.data.rangeLength,
        color: parsed.data.color,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
