/**
 * NigWrite - Voice Comments API
 * POST /api/comments/voice  — Upload voice comment
 * GET  /api/comments/voice?submissionId=xxx — Get voice comments for a submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const createVoiceCommentSchema = z.object({
  submissionId: z.string().min(1),
  userId: z.string().min(1),
  audioData: z.string().min(1),
  duration: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createVoiceCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const voiceComment = await db.voiceComment.create({
      data: {
        submissionId: parsed.data.submissionId,
        userId: parsed.data.userId,
        audioData: parsed.data.audioData,
        duration: parsed.data.duration,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: voiceComment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create voice comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const voiceComments = await db.voiceComment.findMany({
      where: { submissionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: voiceComments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch voice comments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
