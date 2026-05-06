/**
 * NigWrite - Submission Versions API
 * GET /api/submissions/versions?submissionId=xxx — Get all versions of a submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submissionId query parameter is required' },
        { status: 400 }
      );
    }

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

    const rootId = chain[chain.length - 1];

    // Get all versions by walking the tree from root
    const allVersions = await getAllDescendants(rootId);

    // Enrich with report data
    const enriched = await Promise.all(
      allVersions.map(async (v) => {
        const report = v.reportId
          ? await db.scanReport.findUnique({
              where: { id: v.reportId! },
              select: { id: true, similarityScore: true, aiScore: true, createdAt: true },
            })
          : null;

        return {
          id: v.id,
          version: v.version,
          isDraft: v.isDraft,
          status: v.status,
          createdAt: v.createdAt,
          document: { id: v.document.id, title: v.document.title },
          parentVersionId: v.parentVersionId,
          report: report
            ? { id: report.id, similarityScore: report.similarityScore, aiScore: report.aiScore }
            : null,
        };
      })
    );

    // Sort by version number
    enriched.sort((a, b) => a.version - b.version);

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch versions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getAllDescendants(rootId: string) {
  const result: Array<{
    id: string;
    version: number;
    isDraft: boolean;
    status: string;
    createdAt: Date;
    document: { id: string; title: string };
    parentVersionId: string | null;
    reportId: string | null;
  }> = [];

  // Get root
  const root = await db.submission.findUnique({
    where: { id: rootId },
    include: { document: { select: { id: true, title: true } } },
  });

  if (root) {
    result.push({
      id: root.id,
      version: root.version,
      isDraft: root.isDraft,
      status: root.status,
      createdAt: root.createdAt,
      document: root.document,
      parentVersionId: root.parentVersionId,
      reportId: root.reportId,
    });
  }

  // Get all direct children of root
  let children = await db.submission.findMany({
    where: { parentVersionId: rootId },
    include: { document: { select: { id: true, title: true } } },
  });

  result.push(
    ...children.map(c => ({
      id: c.id,
      version: c.version,
      isDraft: c.isDraft,
      status: c.status,
      createdAt: c.createdAt,
      document: c.document,
      parentVersionId: c.parentVersionId,
      reportId: c.reportId,
    }))
  );

  // Get grandchildren (one more level)
  const childIds = children.map(c => c.id);
  if (childIds.length > 0) {
    const grandchildren = await db.submission.findMany({
      where: { parentVersionId: { in: childIds } },
      include: { document: { select: { id: true, title: true } } },
    });

    result.push(
      ...grandchildren.map(gc => ({
        id: gc.id,
        version: gc.version,
        isDraft: gc.isDraft,
        status: gc.status,
        createdAt: gc.createdAt,
        document: gc.document,
        parentVersionId: gc.parentVersionId,
        reportId: gc.reportId,
      }))
    );
  }

  return result;
}
