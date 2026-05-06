/**
 * NigWrite - Report View (Public) API
 * GET /api/reports/view?token=xxx&password=xxx — View a shared report (public, no auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const password = searchParams.get('password');

    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    const share = await db.reportShare.findUnique({
      where: { shareToken: token },
      include: {
        scanReport: {
          include: {
            document: true,
            flaggedSegments: true,
          },
        },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check password
    if (share.password && share.password !== password) {
      return NextResponse.json(
        { error: 'PASSWORD_REQUIRED', message: 'This report is password protected' },
        { status: 403 }
      );
    }

    // Check expiry
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Check max views
    if (share.maxViews && share.viewCount >= share.maxViews) {
      return NextResponse.json({ error: 'Maximum views reached for this share link' }, { status: 410 });
    }

    // Increment view count
    await db.reportShare.update({
      where: { shareToken: token },
      data: { viewCount: { increment: 1 } },
    });

    const report = share.scanReport;
    const document = report.document;

    return NextResponse.json({
      success: true,
      data: {
        report: {
          id: report.id,
          similarityScore: report.similarityScore,
          aiScore: report.aiScore,
          createdAt: report.createdAt,
        },
        document: {
          id: document.id,
          title: document.title,
          contentBody: document.contentBody,
        },
        flaggedSegments: report.flaggedSegments.map(fs => ({
          segmentText: fs.segmentText,
          sourceLink: fs.sourceLink,
          similarityType: fs.similarityType,
        })),
        shareInfo: {
          expiresAt: share.expiresAt,
          maxViews: share.maxViews,
          currentViews: share.viewCount + 1,
          createdAt: share.createdAt,
          creatorName: share.creator?.name || null,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to view shared report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
