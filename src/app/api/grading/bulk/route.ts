/**
 * NigWrite - Bulk Grading API
 * POST /api/grading/bulk  — Bulk grade multiple submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { calculateLetterGrade } from '@/lib/grade-calculator';

const gradeEntrySchema = z.object({
  submissionId: z.string().min(1),
  grade: z.number().min(0),
  feedbackSummary: z.string().optional(),
});

const bulkGradeSchema = z.object({
  gradedBy: z.string().min(1),
  gradeScale: z.string().default('0-100'),
  grades: z.array(gradeEntrySchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bulkGradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { gradedBy, gradeScale, grades } = parsed.data;
    const results: Array<{ submissionId: string; success: boolean; error?: string }> = [];

    await db.$transaction(async (tx) => {
      for (const entry of grades) {
        try {
          const letterGrade = calculateLetterGrade(entry.grade, gradeScale);

          await tx.submission.update({
            where: { id: entry.submissionId },
            data: {
              grade: entry.grade,
              gradeScale,
              letterGrade,
              feedbackSummary: entry.feedbackSummary || null,
              gradedAt: new Date(),
              gradedBy,
              status: 'graded',
            },
          });

          results.push({ submissionId: entry.submissionId, success: true });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.push({ submissionId: entry.submissionId, success: false, error: msg });
        }
      }
    });

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: { total: grades.length, succeeded, failed },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to bulk grade';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
