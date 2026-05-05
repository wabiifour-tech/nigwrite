/**
 * NigWrite - AI Detection API
 * POST /api/ai-detect
 * Created by: Wabi The Tech Nurse
 *
 * Standalone AI content detection endpoint.
 * Analyzes text for patterns indicative of LLM-generated content
 * using perplexity, burstiness, and vocabulary diversity metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { AIDetector } from "@/lib/ai-detector";
import { aiDetectSchema, formatValidationErrors } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = aiDetectSchema.safeParse(body);
    if (!validation.success) {
      const errors = formatValidationErrors(validation.error);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    const detector = new AIDetector();
    const result = detector.analyzeText(content);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "AI detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
