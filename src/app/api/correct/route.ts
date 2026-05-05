/**
 * NigWrite - Correction API
 * POST /api/correct
 * Created by: Wabi The Tech Nurse
 *
 * Takes flagged text, sends it to the LLM-powered Correction Engine,
 * and returns a rewritten version. Then automatically re-scans to verify.
 */

import { NextRequest, NextResponse } from "next/server";
import { CorrectionService } from "@/lib/correction-service";
import { WinnowingEngine } from "@/lib/winnowing-engine";
import { getFingerprintStore } from "@/lib/fingerprint-store";
import { correctSchema, formatValidationErrors } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = correctSchema.safeParse(body);
    if (!validation.success) {
      const errors = formatValidationErrors(validation.error);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { flaggedText, documentContent, documentTitle, reportId } =
      validation.data;

    // Step 1: Rewrite using LLM
    const correctionService = new CorrectionService();
    const correctionResult = await correctionService.rewriteSegment({
      flaggedText,
      context: documentContent,
      documentTitle,
    });

    if (correctionResult.status !== "success") {
      return NextResponse.json({
        success: false,
        error: correctionResult.message,
        data: correctionResult,
      });
    }

    // Step 2: Re-check - Run the rewritten text through plagiarism detection
    const winnowing = new WinnowingEngine();
    const store = getFingerprintStore();

    // Get original similarity for comparison
    const originalFingerprints = winnowing.generateFingerprints(flaggedText);
    const originalMatches = store.search(
      originalFingerprints.map((fp) => fp.hash)
    );
    const originalScan = winnowing.matchDocument(flaggedText, originalMatches);

    // Get new similarity for the rewritten text
    const newFingerprints = winnowing.generateFingerprints(
      correctionResult.rewrittenText
    );
    const newMatches = store.search(newFingerprints.map((fp) => fp.hash));
    const newScan = winnowing.matchDocument(
      correctionResult.rewrittenText,
      newMatches
    );

    // Step 3: Update the correction result with scores
    correctionResult.originalScore = originalScan.overallSimilarity;
    correctionResult.newScore = newScan.overallSimilarity;
    correctionResult.improvement =
      originalScan.overallSimilarity - newScan.overallSimilarity;

    // Update message based on improvement
    if (correctionResult.improvement > 20) {
      correctionResult.message = `Excellent! Similarity dropped by ${correctionResult.improvement}%. The rewritten text is significantly more original.`;
    } else if (correctionResult.improvement > 5) {
      correctionResult.message = `Similarity decreased by ${correctionResult.improvement}%. Consider further manual edits for better results.`;
    } else if (correctionResult.improvement >= 0) {
      correctionResult.message = `Minimal improvement (${correctionResult.improvement}%). The rewrite may need further refinement or the original text was already fairly unique.`;
    } else {
      correctionResult.message = `The rewrite increased similarity. This is rare — try running the correction again for a different version.`;
    }

    return NextResponse.json({
      success: true,
      data: correctionResult,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Correction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
