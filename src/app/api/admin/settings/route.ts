/**
 * NigWrite — Admin System Settings API
 * GET/PUT /api/admin/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logAuditAction } from '@/lib/audit-logger';

const DEFAULT_SETTINGS: Record<string, string> = {
  similarity_threshold_warning: '25',
  similarity_threshold_flagged: '40',
  similarity_threshold_critical: '60',
  ai_threshold_flagged: '60',
  default_exclusion_settings: JSON.stringify({ excludeQuotes: true, excludeBibliography: true, excludeCitations: true, excludeSmallMatches: 0 }),
  max_file_size_mb: '50',
  allowed_file_types: JSON.stringify(['txt', 'md', 'csv', 'pdf', 'docx', 'doc']),
};

const updateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1),
    value: z.string(),
  })),
});

async function ensureDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.systemSettings.findUnique({ where: { key } });
    if (!existing) {
      await db.systemSettings.create({
        data: {
          key,
          value,
          description: `Default setting: ${key}`,
        },
      });
    }
  }
}

export async function GET() {
  try {
    await ensureDefaults();
    const settings = await db.systemSettings.findMany({
      orderBy: { key: 'asc' },
    });
    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const updatedSettings: Array<{ id: string; key: string; value: string; description: string | null }> = [];
    for (const setting of parsed.data.settings) {
      const updated = await db.systemSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
      updatedSettings.push({ id: updated.id, key: updated.key, value: updated.value, description: updated.description });
    }

    await logAuditAction({
      action: 'update_settings',
      resource: 'SystemSettings',
      details: { updatedKeys: parsed.data.settings.map(s => s.key) },
    });

    return NextResponse.json({ success: true, data: updatedSettings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
