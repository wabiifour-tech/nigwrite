/**
 * NigWrite - File Upload API
 * POST /api/upload
 * Created by: Wabi The Tech Nurse
 *
 * Accepts file uploads (TXT, PDF, DOCX) and extracts text content
 * for plagiarism scanning. Returns the extracted text to the client.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt') {
      const text = await file.text();
      return NextResponse.json({
        success: true,
        data: {
          title: file.name.replace(/\.[^.]+$/, ''),
          content: text,
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
          fileType: ext,
        },
      });
    }

    if (ext === 'md') {
      const text = await file.text();
      return NextResponse.json({
        success: true,
        data: {
          title: file.name.replace(/\.[^.]+$/, ''),
          content: text,
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
          fileType: ext,
        },
      });
    }

    if (ext === 'csv') {
      const text = await file.text();
      return NextResponse.json({
        success: true,
        data: {
          title: file.name.replace(/\.[^.]+$/, ''),
          content: text,
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
          fileType: ext,
        },
      });
    }

    // For PDF/DOCX, extract what we can from the raw bytes
    // In production, you'd use pdf-parse or mammoth for proper extraction
    if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Attempt basic text extraction from the buffer
      const rawText = buffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
      const extractedText = rawText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500000); // Safety limit

      // Check if we got meaningful text
      const wordCount = extractedText.split(/\s+/).filter(w => w.length > 2).length;

      if (wordCount < 10) {
        return NextResponse.json({
          success: true,
          data: {
            title: file.name.replace(/\.[^.]+$/, ''),
            content: `Note: Full ${ext.toUpperCase()} text extraction requires a document processing library. For best results, please copy and paste your document text directly.\n\nPartial content extracted: ${extractedText}`,
            wordCount: wordCount,
            fileType: ext,
            isPartial: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          title: file.name.replace(/\.[^.]+$/, ''),
          content: extractedText,
          wordCount,
          fileType: ext,
        },
      });
    }

    return NextResponse.json(
      { error: `Unsupported file type: .${ext}. Supported formats: .txt, .md, .csv, .pdf, .docx` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
