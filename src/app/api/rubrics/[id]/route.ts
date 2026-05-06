/**
 * NigWrite - Single Rubric API
 * GET    /api/rubrics/[id] — Get rubric with criteria and levels
 * PUT    /api/rubrics/[id] — Update rubric
 * DELETE /api/rubrics/[id] — Delete rubric
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const updateRubricSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  assignmentId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rubric = await db.rubric.findUnique({
      where: { id },
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        assignment: { select: { id: true, title: true, gradeScale: true, maxGrade: true } },
      },
    });

    if (!rubric) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rubric });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rubric';
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
    const parsed = updateRubricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const rubric = await db.rubric.update({
      where: { id },
      data: {
        ...parsed.data,
        assignmentId: parsed.data.assignmentId ?? undefined,
      },
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: rubric });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update rubric';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.rubric.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Rubric deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete rubric';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
