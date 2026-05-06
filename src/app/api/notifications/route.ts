/**
 * NigWrite - Notifications API
 * GET  /api/notifications              — List notifications (with optional ?userId=xxx)
 * GET  /api/notifications?count=true   — Get unread count
 * POST /api/notifications              — Mark a notification as read or create one
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications — List notifications or count unread
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const countOnly = searchParams.get('count') === 'true';

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;

    if (countOnly) {
      const unreadCount = await db.notification.count({
        where: { ...where, read: false },
      });
      return NextResponse.json({ success: true, data: { unread: unreadCount } });
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/notifications — Mark as read or create new
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId, title, message: msg, type } = body as {
      notificationId?: string;
      userId?: string;
      title?: string;
      message?: string;
      type?: string;
    };

    // Mark as read
    if (notificationId) {
      const updated = await db.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Create new notification
    if (title && msg) {
      const notification = await db.notification.create({
        data: {
          userId: userId || null,
          title,
          message: msg,
          type: type || 'info',
        },
      });
      return NextResponse.json({ success: true, data: notification }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Provide notificationId to mark as read, or title+message to create' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Notification operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
