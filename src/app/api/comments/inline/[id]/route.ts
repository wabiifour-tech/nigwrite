/**
 * NigWrite - Single Inline Comment API
 * PUT    /api/comments/inline/[id] — Update comment text or mark resolved
 * DELETE /api/comments/inline/[id] — Delete comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const updateCommentSchema = z.object({
  text: z.string().min(1).optional(),
  color: z.string().optional(),
  isResolved: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const comment = await db.inlineComment.update({
      where: { id },
      data: parsed.data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.inlineComment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
