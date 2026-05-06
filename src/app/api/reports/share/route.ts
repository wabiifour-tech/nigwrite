/**
 * NigWrite - Report Share API
 * POST /api/reports/share — Create a share link for a report
 * GET /api/reports/share?reportId=xxx — List shares for a report
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '@/lib/db';

const createShareSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  expiresAt: z.string().datetime().optional().nullable(),
  password: z.string().min(1).max(100).optional().nullable(),
  maxViews: z.number().int().min(1).optional().nullable(),
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reportId, expiresAt, password, maxViews, userId } = parsed.data;

    // Verify report exists
    const report = await db.scanReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');

    const share = await db.reportShare.create({
      data: {
        reportId,
        shareToken,
        password: password || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxViews: maxViews || null,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: share.id,
        shareUrl: `/shared/report/${shareToken}`,
        token: shareToken,
        expiresAt: share.expiresAt,
        maxViews: share.maxViews,
        createdAt: share.createdAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create share link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'reportId query parameter is required' },
        { status: 400 }
      );
    }

    const shares = await db.reportShare.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shareToken: true,
        expiresAt: true,
        viewCount: true,
        maxViews: true,
        password: true,
        createdAt: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Map boolean-like hasPassword (we stored it as password, check if non-null)
    const enriched = shares.map(s => ({
      ...s,
      hasPassword: !!s.password,
      password: undefined,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shares';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
