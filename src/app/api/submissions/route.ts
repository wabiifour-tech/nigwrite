/**
 * NigWrite - Submissions API
 * POST /api/submissions  — Submit a document to an assignment
 * GET  /api/submissions?assignmentId=xxx — List submissions for an assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, documentId, studentId, reportId } = body as {
      assignmentId: string;
      documentId: string;
      studentId?: string;
      reportId?: string;
    };

    if (!assignmentId || !documentId) {
      return NextResponse.json(
        { error: 'assignmentId and documentId are required' },
        { status: 400 }
      );
    }

    const submission = await db.submission.create({
      data: {
        assignmentId,
        documentId,
        studentId: studentId || null,
        reportId: reportId || null,
        status: 'submitted',
      },
      include: {
        document: { select: { id: true, title: true } },
        student: { select: { id: true, name: true, email: true } },
        report: { select: { id: true, similarityScore: true, aiScore: true } },
      },
    });

    return NextResponse.json({ success: true, data: submission }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    const where = assignmentId ? { assignmentId } : {};

    const submissions = await db.submission.findMany({
      where,
      include: {
        document: { select: { id: true, title: true } },
        student: { select: { id: true, name: true, email: true } },
        report: { select: { id: true, similarityScore: true, aiScore: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch submissions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
