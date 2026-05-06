/**
 * NigWrite - Rubrics API
 * GET  /api/rubrics?assignmentId=xxx  — List rubrics
 * POST /api/rubrics                   — Create a rubric with criteria and levels
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const levelSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
  score: z.number().min(0),
  order: z.number().int().default(0),
});

const criteriaSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  maxScore: z.number().min(0).default(10),
  weight: z.number().min(0).default(1),
  levels: z.array(levelSchema).min(1),
  order: z.number().int().default(0),
});

const createRubricSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignmentId: z.string().optional(),
  criteria: z.array(criteriaSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    const where = assignmentId ? { assignmentId } : {};

    const rubrics = await db.rubric.findMany({
      where,
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: rubrics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rubrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createRubricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, description, assignmentId, criteria } = parsed.data;

    const rubric = await db.rubric.create({
      data: {
        title,
        description: description || null,
        assignmentId: assignmentId || null,
        criteria: {
          create: criteria.map((c) => ({
            title: c.title,
            description: c.description || null,
            maxScore: c.maxScore,
            weight: c.weight,
            order: c.order,
            levels: {
              create: c.levels.map((l) => ({
                label: l.label,
                description: l.description,
                score: l.score,
                order: l.order,
              })),
            },
          })),
        },
      },
      include: {
        criteria: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: rubric }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create rubric';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
