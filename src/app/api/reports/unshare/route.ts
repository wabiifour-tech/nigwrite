/**
 * NigWrite - Report Unshare API
 * POST /api/reports/unshare — Revoke a share link
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const unshareSchema = z.object({
  shareToken: z.string().min(1, 'Share token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = unshareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { shareToken } = parsed.data;

    const share = await db.reportShare.findUnique({
      where: { shareToken },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    await db.reportShare.delete({
      where: { shareToken },
    });

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to revoke share link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
