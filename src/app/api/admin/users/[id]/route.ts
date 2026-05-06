/**
 * NigWrite — Admin User Detail API
 * GET/PUT/DELETE /api/admin/users/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logAuditAction } from '@/lib/audit-logger';

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.enum(['student', 'lecturer', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        institutionId: true,
        institution: { select: { id: true, name: true } },
        _count: {
          select: {
            documents: true,
            submissions: true,
            assignments: true,
            enrollments: true,
            taughtCourses: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get scan stats
    const scanReports = await db.scanReport.findMany({
      where: {
        document: { userId: id },
      },
      select: { id: true, similarityScore: true, aiScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        recentScans: scanReports,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (parsed.data.email && parsed.data.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (emailExists) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
      }
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAuditAction({
      action: 'update_user',
      resource: 'User',
      resourceId: id,
      details: { changes: parsed.data },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditAction({
      action: 'deactivate_user',
      resource: 'User',
      resourceId: id,
      details: { name: existingUser.name, email: existingUser.email },
    });

    return NextResponse.json({ success: true, message: 'User deactivated' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
