/**
 * NigWrite - Webhook Management API
 * GET    /api/webhooks  — List webhooks for a user
 * POST   /api/webhooks  — Create webhook
 * PUT    /api/webhooks  — Update webhook
 * DELETE /api/webhooks  — Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

function generateWebhookSecret(): string {
  const bytes = crypto.randomBytes(24);
  return `whsec_${bytes.toString('hex')}`;
}

// ── GET: List webhooks for a user ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const webhooks = await db.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggered: true,
        createdAt: true,
        // Never expose the secret in list endpoint
      },
    });

    return NextResponse.json({ success: true, data: webhooks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch webhooks';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── POST: Create a new webhook ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, url, events } = body as {
      userId: string;
      url: string;
      events?: string;
    };

    if (!userId || !url) {
      return NextResponse.json(
        { success: false, error: 'userId and url are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const secret = generateWebhookSecret();

    const webhook = await db.webhook.create({
      data: {
        userId,
        url,
        events: events || 'scan.complete',
        secret,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret, // Only shown once on creation
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create webhook';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── PUT: Update a webhook ──
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId, url, events, isActive } = body as {
      webhookId: string;
      url?: string;
      events?: string;
      isActive?: boolean;
    };

    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: 'webhookId is required' },
        { status: 400 }
      );
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.isActive = isActive;

    const webhook = await db.webhook.update({
      where: { id: webhookId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        lastTriggered: webhook.lastTriggered,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update webhook';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── DELETE: Delete a webhook ──
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId } = body as { webhookId: string };

    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: 'webhookId is required' },
        { status: 400 }
      );
    }

    await db.webhook.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({ success: true, message: 'Webhook deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete webhook';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
