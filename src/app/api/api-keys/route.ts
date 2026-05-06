/**
 * NigWrite - API Key Management
 * GET    /api/api-keys  — List API keys (masked)
 * POST   /api/api-keys  — Create new API key (returns full key once)
 * DELETE /api/api-keys  — Revoke an API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/** Generate a random API key prefixed with nig_ */
function generateApiKey(): string {
  const bytes = crypto.randomBytes(32);
  return `nig_${bytes.toString('hex')}`;
}

/** Mask an API key for display: nig_abc...xyz */
function maskKey(key: string): string {
  if (key.length <= 12) return '***';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

// ── GET: List all API keys for a user (masked) ──
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

    const keys = await db.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        name: true,
        permissions: true,
        lastUsed: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Mask the keys before returning
    const maskedKeys = keys.map(k => ({
      ...k,
      key: maskKey(k.key),
    }));

    return NextResponse.json({ success: true, data: maskedKeys });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch API keys';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── POST: Create a new API key ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, permissions, expiresInDays } = body as {
      userId: string;
      name?: string;
      permissions?: string;
      expiresInDays?: number;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const rawKey = generateApiKey();
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Default expiry: 365 days from now, or custom
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const apiKey = await db.apiKey.create({
      data: {
        userId,
        key: hashedKey,
        name: name || 'My API Key',
        permissions: permissions || 'scan',
        expiresAt,
      },
    });

    // Return full key only on creation
    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        key: rawKey, // Full key — shown only once!
        name: apiKey.name,
        permissions: apiKey.permissions,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── DELETE: Revoke an API key ──
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId } = body as { keyId: string };

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: 'keyId is required' },
        { status: 400 }
      );
    }

    await db.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to revoke API key';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
