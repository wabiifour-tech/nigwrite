/**
 * NigWrite - Quick Marks API
 * GET    /api/comments/quickmarks?category=xxx&userId=xxx  — List quick marks
 * POST   /api/comments/quickmarks                          — Create a quick mark
 * PUT    /api/comments/quickmarks                          — Update a quick mark
 * DELETE /api/comments/quickmarks?id=xxx                   — Delete a quick mark
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const createQuickMarkSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  category: z.string().default('General'),
  color: z.string().default('#FFD700'),
});

const updateQuickMarkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  category: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    if (category && category !== 'All') {
      where.category = category;
    }

    const quickMarks = await db.quickMark.findMany({
      where,
      orderBy: [{ useCount: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: quickMarks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quick marks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createQuickMarkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const quickMark = await db.quickMark.create({
      data: {
        userId: parsed.data.userId,
        title: parsed.data.title,
        text: parsed.data.text,
        category: parsed.data.category,
        color: parsed.data.color,
      },
    });

    return NextResponse.json({ success: true, data: quickMark }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create quick mark';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateQuickMarkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...data } = parsed.data;

    const quickMark = await db.quickMark.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: quickMark });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update quick mark';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.quickMark.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Quick mark deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete quick mark';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
