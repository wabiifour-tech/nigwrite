/**
 * NigWrite — Admin Course Enrollments API
 * GET/POST/DELETE /api/admin/courses/[id]/enrollments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logAuditAction } from '@/lib/audit-logger';

const enrollSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['student', 'teaching_assistant']).default('student'),
});

const removeEnrollSchema = z.object({
  userId: z.string().min(1),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const enrollments = await db.enrollment.findMany({
      where: { courseId: id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: enrollments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch enrollments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = enrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const course = await db.course.findUnique({ where: { id } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const enrollment = await db.enrollment.create({
      data: {
        courseId: id,
        userId: parsed.data.userId,
        role: parsed.data.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logAuditAction({
      action: 'enroll_user',
      resource: 'Enrollment',
      resourceId: enrollment.id,
      details: { courseId: id, userId: parsed.data.userId, role: parsed.data.role },
    });

    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to enroll user';
    // Handle unique constraint violation
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'User is already enrolled in this course' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = removeEnrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    await db.enrollment.deleteMany({
      where: { courseId: id, userId: parsed.data.userId },
    });

    await logAuditAction({
      action: 'remove_enrollment',
      resource: 'Enrollment',
      details: { courseId: id, userId: parsed.data.userId },
    });

    return NextResponse.json({ success: true, message: 'Enrollment removed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove enrollment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
