/**
 * NigWrite — Admin Course Detail API
 * GET/PUT/DELETE /api/admin/courses/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logAuditAction } from '@/lib/audit-logger';

const updateCourseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  instructorId: z.string().nullable().optional(),
  institutionId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        institution: { select: { id: true, name: true } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        assignments: {
          include: {
            _count: { select: { submissions: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Compute average similarity for course submissions
    const submissions = await db.submission.findMany({
      where: {
        assignment: { courseId: id },
        reportId: { not: null },
      },
      include: {
        report: { select: { similarityScore: true, aiScore: true } },
      },
    });

    const avgSimilarity = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.report?.similarityScore || 0), 0) / submissions.length
      : 0;

    const avgAiScore = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.report?.aiScore || 0), 0) / submissions.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...course,
        stats: {
          totalSubmissions: submissions.length,
          avgSimilarity: Math.round(avgSimilarity * 100) / 100,
          avgAiScore: Math.round(avgAiScore * 100) / 100,
          highRiskSubmissions: submissions.filter(s => (s.report?.similarityScore || 0) > 60).length,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;

    const course = await db.course.update({
      where: { id },
      data,
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, assignments: true } },
      },
    });

    await logAuditAction({
      action: 'update_course',
      resource: 'Course',
      resourceId: id,
      details: { changes: parsed.data },
    });

    return NextResponse.json({ success: true, data: course });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    await db.course.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditAction({
      action: 'archive_course',
      resource: 'Course',
      resourceId: id,
      details: { name: existing.name, code: existing.code },
    });

    return NextResponse.json({ success: true, message: 'Course archived' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
