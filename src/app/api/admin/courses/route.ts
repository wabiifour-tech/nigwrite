/**
 * NigWrite — Admin Courses API
 * GET/POST /api/admin/courses
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logAuditAction } from '@/lib/audit-logger';

const listCoursesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  department: z.string().optional(),
  instructorId: z.string().optional(),
});

const createCourseSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  department: z.string().optional(),
  instructorId: z.string().optional(),
  institutionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = listCoursesSchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!query.success) {
      return NextResponse.json({ error: 'Invalid query', details: query.error.issues }, { status: 400 });
    }

    const { page, limit, department, instructorId } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (department) where.department = department;
    if (instructorId) where.instructorId = instructorId;

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { id: true, name: true, email: true } },
          institution: { select: { id: true, name: true } },
          _count: {
            select: {
              enrollments: true,
              assignments: true,
            },
          },
        },
      }),
      db.course.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        courses,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch courses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const course = await db.course.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description || null,
        department: parsed.data.department || null,
        instructorId: parsed.data.instructorId || null,
        institutionId: parsed.data.institutionId || null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, assignments: true } },
      },
    });

    await logAuditAction({
      action: 'create_course',
      resource: 'Course',
      resourceId: course.id,
      details: { name: course.name, code: course.code },
    });

    return NextResponse.json({ success: true, data: course }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
