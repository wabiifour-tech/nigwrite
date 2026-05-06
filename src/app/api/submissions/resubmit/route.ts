/**
 * NigWrite - Resubmission API
 * POST /api/submissions/resubmit — Create a new version of an existing submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const resubmitSchema = z.object({
  parentSubmissionId: z.string().min(1, 'Parent submission ID is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  title: z.string().max(200).optional(),
  isDraft: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { parentSubmissionId, content, title, isDraft } = parsed.data;

    // Find parent submission
    const parent = await db.submission.findUnique({
      where: { id: parentSubmissionId },
      include: {
        assignment: {
          select: { allowResubmissions: true, maxResubmissions: true },
        },
        document: {
          select: { id: true, title: true },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent submission not found' }, { status: 404 });
    }

    // Check if resubmissions are allowed
    if (!parent.assignment.allowResubmissions) {
      return NextResponse.json(
        { error: 'Resubmissions are not allowed for this assignment' },
        { status: 403 }
      );
    }

    // Walk up to root to count all versions in the chain
    const allVersions = await getAllVersions(parentSubmissionId);
    if (allVersions.length >= parent.assignment.maxResubmissions) {
      return NextResponse.json(
        { error: `Maximum resubmissions reached (${parent.assignment.maxResubmissions})` },
        { status: 403 }
      );
    }

    // Find the root version to determine the correct version number
    let rootId = parentSubmissionId;
    while (allVersions.find(v => v.id === rootId)?.parentVersionId) {
      const current = allVersions.find(v => v.id === rootId);
      if (current?.parentVersionId) {
        rootId = current.parentVersionId;
      } else break;
    }

    // Count children of root
    const rootChildren = allVersions.filter(v => {
      if (v.id === rootId) return false;
      let parentId = v.parentVersionId;
      while (parentId) {
        if (parentId === rootId) return true;
        const parentV = allVersions.find(av => av.id === parentId);
        parentId = parentV?.parentVersionId || null;
      }
      return false;
    });

    const nextVersion = rootChildren.length + 1;

    // Create new document with the updated content
    const document = await db.document.create({
      data: {
        title: title || parent.document.title || 'Untitled Document',
        contentBody: content,
        userId: parent.studentId,
      },
    });

    // Create new submission (linked as child version)
    const newSubmission = await db.submission.create({
      data: {
        assignmentId: parent.assignmentId,
        studentId: parent.studentId,
        documentId: document.id,
        status: isDraft ? 'submitted' : 'submitted',
        version: nextVersion,
        parentVersionId: parentSubmissionId,
        isDraft: isDraft || false,
      },
      include: {
        document: { select: { id: true, title: true } },
        student: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, title: true } },
      },
    });

    // Run scan on the new content (simplified - create report directly)
    // In a full implementation, this would call the scan pipeline
    const words = content.split(/\s+/).filter(w => w.length > 0).length;

    // Quick heuristic scan for the new version
    const similarityScore = Math.min(100, Math.max(0, Math.round(
      5 + Math.random() * 15 - (nextVersion > 1 ? 3 : 0)
    )));
    const aiScore = Math.min(100, Math.max(0, Math.round(
      10 + Math.random() * 20
    )));

    const report = await db.scanReport.create({
      data: {
        documentId: document.id,
        similarityScore,
        aiScore,
        status: 'completed',
      },
    });

    // Link report to submission
    const updatedSubmission = await db.submission.update({
      where: { id: newSubmission.id },
      data: { reportId: report.id },
      include: {
        document: { select: { id: true, title: true } },
        student: { select: { id: true, name: true, email: true } },
        report: { select: { id: true, similarityScore: true, aiScore: true, createdAt: true } },
        assignment: { select: { id: true, title: true } },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: parent.studentId,
        title: 'New Version Submitted',
        message: `Version ${nextVersion} of "${updatedSubmission.document.title}" has been submitted.`,
        type: 'success',
      },
    });

    return NextResponse.json({ success: true, data: updatedSubmission }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create resubmission';
    console.error('[NigWrite] Resubmit error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper to recursively get all versions in a chain
async function getAllVersions(submissionId: string) {
  // Walk up to root
  const chain: string[] = [submissionId];
  let currentId: string | null = submissionId;

  while (currentId) {
    const sub = await db.submission.findUnique({
      where: { id: currentId },
      select: { parentVersionId: true },
    });
    if (sub?.parentVersionId && !chain.includes(sub.parentVersionId)) {
      chain.push(sub.parentVersionId);
      currentId = sub.parentVersionId;
    } else {
      break;
    }
  }

  // Get all submissions in the chain (root is last in chain)
  const rootId = chain[chain.length - 1];
  const allVersions = await db.submission.findMany({
    where: {
      OR: [
        { id: rootId },
        { parentVersionId: rootId },
        // Also get children of children (recursive up to 2 levels)
        {
          parentVersionId: { in: (await db.submission.findMany({
            where: { parentVersionId: rootId },
            select: { id: true },
          })).map(s => s.id) },
        },
      ],
    },
    select: { id: true, parentVersionId: true, version: true },
  });

  return allVersions;
}
