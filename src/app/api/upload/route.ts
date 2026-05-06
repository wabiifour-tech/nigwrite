/**
 * NigWrite - File Upload API
 * POST /api/upload
 *
 * Accepts a single file (PDF, DOCX, DOC, TXT, MD, CSV) via FormData,
 * extracts text, and returns it along with the file title.
 * No file size restriction — documents of any size are accepted.
 *
 * Created by: Wabi The Tech Nurse
 */

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Dynamically load pdf-parse to avoid ESM/CJS compatibility issues at build time
let pdfParseModule: any = null;
async function getPdfParse() {
  if (!pdfParseModule) {
    try {
      // pdf-parse v2 exports PDFParse class
      const mod = require('pdf-parse');
      if (mod.PDFParse) {
        pdfParseModule = mod;
      } else if (mod.default) {
        pdfParseModule = mod.default;
      } else {
        pdfParseModule = mod;
      }
    } catch {
      pdfParseModule = null;
    }
  }
  return pdfParseModule;
}

type SupportedExt = 'txt' | 'md' | 'csv' | 'text' | 'pdf' | 'docx' | 'doc';

const SUPPORTED_EXTENSIONS: SupportedExt[] = ['txt', 'md', 'csv', 'text', 'pdf', 'docx', 'doc'];

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
}

function isSupported(ext: string): ext is SupportedExt {
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExt);
}

/**
 * Extract text from a DOCX/DOC buffer using mammoth.
 */
async function extractDocx(buffer: ArrayBuffer): Promise<{ text: string; partial: boolean }> {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return { text: result.value, partial: result.messages.length > 0 };
  } catch (err) {
    console.error('[upload] mammoth extraction error:', err);
    return { text: '', partial: true };
  }
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 * Supports both v1 (default export) and v2 (PDFParse class).
 */
async function extractPdf(buffer: ArrayBuffer): Promise<{ text: string; partial: boolean }> {
  try {
    const mod = await getPdfParse();
    if (!mod) {
      return { text: '', partial: true };
    }

    // v2: PDFParse class
    if (mod.PDFParse) {
      const parser = new mod.PDFParse();
      let text = '';
      // Try different method names that may exist
      if (typeof parser.getRawTextContent === 'function') {
        text = await parser.getRawTextContent(Buffer.from(buffer));
      } else if (typeof parser.getText === 'function') {
        text = await parser.getText(Buffer.from(buffer));
      } else if (typeof parser.load === 'function') {
        await parser.load(Buffer.from(buffer));
        text = parser.text || '';
      }
      return { text: text || '', partial: !text };
    }

    // v1 style: default function call
    if (typeof mod === 'function') {
      const result = await mod(Buffer.from(buffer));
      return { text: (result?.text || '').trim(), partial: false };
    }

    // v2 without PDFParse: try rawTextContent directly
    if (typeof mod.getRawTextContent === 'function') {
      const text = await mod.getRawTextContent(Buffer.from(buffer));
      return { text: text || '', partial: false };
    }

    return { text: '', partial: true };
  } catch (err) {
    console.error('[upload] pdf-parse extraction error:', err);
    return { text: '', partial: true };
  }
}

/**
 * Extract text from plain-text formats (txt, md, csv, text).
 * Respects UTF-8 encoding; falls back to latin1 if UTF-8 decoding produces replacement chars.
 */
async function extractText(buffer: ArrayBuffer): Promise<{ text: string; partial: boolean }> {
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
    if (replacementCount > buffer.byteLength * 0.05) {
      const latin1 = new TextDecoder('iso-8859-1').decode(buffer);
      return { text: latin1, partial: false };
    }
    return { text: utf8, partial: false };
  } catch (err) {
    console.error('[upload] text extraction error:', err);
    const latin1 = new TextDecoder('iso-8859-1').decode(buffer);
    return { text: latin1, partial: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided. Please upload a document.' },
        { status: 400 }
      );
    }

    const ext = getExtension(file.name);

    if (!ext || !isSupported(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type ".${ext}". Supported formats: PDF, DOCX, DOC, TXT, MD, CSV`,
        },
        { status: 400 }
      );
    }

    // Read file into ArrayBuffer — no size limit
    const buffer = await file.arrayBuffer();

    let text = '';
    let isPartial = false;

    switch (ext) {
      case 'pdf':
        ({ text, partial: isPartial } = await extractPdf(buffer));
        break;
      case 'docx':
      case 'doc':
        ({ text, partial: isPartial } = await extractDocx(buffer));
        break;
      case 'txt':
      case 'md':
      case 'csv':
      case 'text':
      default:
        ({ text, partial: isPartial } = await extractText(buffer));
        break;
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not extract any text from "${file.name}". The file may be empty, corrupted, or image-based.`,
        },
        { status: 400 }
      );
    }

    const title = file.name.replace(/\.[^/.]+$/, '') || 'Untitled Document';

    return NextResponse.json({
      success: true,
      data: {
        title,
        content: text,
        isPartial,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  } catch (error: unknown) {
    console.error('[upload] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed unexpectedly';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
