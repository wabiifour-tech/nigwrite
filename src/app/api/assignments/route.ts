/**
 * NigWrite - Assignments API
 * GET  /api/assignments       — List all assignments with submission counts
 * POST /api/assignments       — Create a new assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const assignments = await db.assignment.findMany({
      include: {
        _count: { select: { submissions: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch assignments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, courseId, institutionId, deadline, createdBy } = body as {
      title: string;
      description: string;
      courseId?: string;
      institutionId?: string;
      deadline?: string;
      createdBy?: string;
    };

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const assignment = await db.assignment.create({
      data: {
        title,
        description,
        courseId: courseId || null,
        institutionId: institutionId || null,
        deadline: deadline ? new Date(deadline) : null,
        createdBy: createdBy || 'anonymous',
      },
      include: {
        _count: { select: { submissions: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create assignment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
