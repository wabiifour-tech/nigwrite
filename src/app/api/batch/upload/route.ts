/**
 * NigWrite - Batch Upload API (ZIP)
 * POST /api/batch/upload
 *
 * Accepts a ZIP file containing multiple documents (.txt, .md, .csv).
 * Extracts text from each file, scans them all, and returns combined results.
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { db } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher';

const MAX_ZIP_SIZE = 9999 * 1024 * 1024; // No practical limit
const MAX_FILES_IN_ZIP = 200; // Generous limit
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.csv', '.text'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Send a ZIP file as "file" field.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        { success: false, error: `ZIP file too large. Maximum size is ${MAX_ZIP_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { success: false, error: 'Only .zip files are accepted' },
        { status: 400 }
      );
    }

    // Parse ZIP
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    const entries: { filename: string; content: string }[] = [];

    // Extract text from each supported file
    const fileNames = Object.keys(zip.files);
    if (fileNames.length > MAX_FILES_IN_ZIP) {
      return NextResponse.json(
        { success: false, error: `ZIP contains too many files. Maximum is ${MAX_FILES_IN_ZIP}.` },
        { status: 400 }
      );
    }

    for (const filename of fileNames) {
      const zipEntry = zip.files[filename];
      if (zipEntry.dir) continue;

      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

      const content = await zipEntry.async('string');
      if (content.trim().length < 10) continue;

      const title = filename.replace(/\.[^/.]+$/, '');
      entries.push({ filename, content });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No supported text files found in ZIP. Supported: .txt, .md, .csv' },
        { status: 400 }
      );
    }

    // Use the batch scan endpoint internally
    const documents = entries.map(e => ({ title: e.filename.replace(/\.[^/.]+$/, ''), content: e.content }));

    const batchResponse = await fetch(new URL('/api/batch/scan', request.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents, userId: userId || undefined }),
    });

    const batchResult = await batchResponse.json();

    if (!batchResult.success) {
      return NextResponse.json(
        { success: false, error: batchResult.error || 'Batch scan failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        zipFileName: file.name,
        filesExtracted: entries.length,
        totalDocuments: batchResult.data.totalDocuments,
        successfulScans: batchResult.data.successfulScans,
        failedScans: batchResult.data.failedScans,
        results: batchResult.data.results,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Batch upload failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
