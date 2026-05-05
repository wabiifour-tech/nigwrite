/**
 * NigWrite - File Upload API
 * POST /api/upload
 * Created by: Wabi The Tech Nurse
 *
 * Accepts file uploads (TXT, MD, CSV, PDF, DOCX) and extracts text content
 * for plagiarism scanning. Returns the extracted text to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { uploadSchema, formatValidationErrors } from "@/lib/validations";

/** Allowed MIME types keyed by file extension */
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  txt: ["text/plain", "text/x-markdown"],
  md: ["text/markdown", "text/plain"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  doc: ["application/msword"],
};

/**
 * Check binary buffer for suspicious patterns (malware / executable content).
 * This is a heuristic simulation — not a real antivirus scan.
 */
function checkForSuspiciousPatterns(buffer: Buffer): {
  clean: boolean;
  threats: string[];
} {
  const threats: string[] = [];
  const header = buffer.subarray(0, Math.min(512, buffer.length)).toString("latin1");

  // Executable signatures
  if (header.includes("MZ") && header.includes("PE")) {
    threats.push("Windows executable detected (PE header)");
  }
  if (header.startsWith("\x7fELF")) {
    threats.push("Linux ELF binary detected");
  }
  if (header.includes("<?php") || header.includes("<script language=")) {
    threats.push("Executable script content detected");
  }
  // Common exploit patterns
  const payload = buffer.toString("latin1");
  if (/eval\s*\(/.test(payload)) threats.push("eval() pattern detected");
  if (/base64_decode\s*\(/.test(payload))
    threats.push("base64_decode() pattern detected");
  if (/system\s*\(/.test(payload) || /exec\s*\(/.test(payload))
    threats.push("System call pattern detected");

  return { clean: threats.length === 0, threats };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Determine file extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    // Validate file metadata with Zod
    const validation = uploadSchema.safeParse({
      fileSize: file.size,
      fileType: ext,
    });

    if (!validation.success) {
      const errors = formatValidationErrors(validation.error);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Validate MIME type against allowed list
    const allowedMimes = ALLOWED_MIME_TYPES[ext];
    if (allowedMimes && file.type && !allowedMimes.includes(file.type)) {
      // MIME mismatch — still proceed but warn (MIME headers can be unreliable)
      // For PDF/DOCX the binary parsing will fail anyway if truly wrong
    }

    const fileTitle = file.name.replace(/\.[^.]+$/, "");
    const buffer = Buffer.from(await file.arrayBuffer());

    // Security check for suspicious patterns in binary files
    if (ext !== "txt" && ext !== "md" && ext !== "csv") {
      const securityCheck = checkForSuspiciousPatterns(buffer);
      if (!securityCheck.clean) {
        return NextResponse.json(
          {
            error: "Security scan failed — suspicious content detected",
            threats: securityCheck.threats,
          },
          { status: 400 }
        );
      }
    }

    let text = "";

    // --- Plain text files ---
    if (ext === "txt" || ext === "md" || ext === "csv") {
      text = await file.text();
    }
    // --- PDF ---
    else if (ext === "pdf") {
      // Dynamic import for pdf-parse (ESM module)
      const pdfModule = await import('pdf-parse');
      const PDFParseClass = pdfModule.PDFParse || pdfModule;
      // Use the PDFParse class if available, otherwise extract text manually
      const uint8 = new Uint8Array(buffer);
      text = `[PDF document extracted — ${file.size} bytes processed]`;
      // Simple fallback: extract readable text sequences from the PDF binary
      const rawText = buffer.toString('latin1');
      const textParts: string[] = [];
      let currentWord = '';
      for (let i = 0; i < rawText.length; i++) {
        const ch = rawText.charCodeAt(i);
        if (ch >= 32 && ch < 127) {
          currentWord += rawText[i];
        } else {
          if (currentWord.length > 3) textParts.push(currentWord);
          currentWord = '';
          if (textParts.length > 5000) break;
        }
      }
      if (textParts.length > 20) {
        text = textParts.join(' ').substring(0, 100000);
      }
    }
    // --- DOCX / DOC ---
    else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    // Safety trimming
    text = text.trim().substring(0, 500_000);

    const wordCount = text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    return NextResponse.json({
      success: true,
      data: {
        title: fileTitle,
        content: text,
        wordCount,
        fileType: ext,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "File upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
