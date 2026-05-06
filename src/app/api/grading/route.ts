/**
 * NigWrite - Grading API
 * POST /api/grading  — Save grade for a submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { calculateLetterGrade } from '@/lib/grade-calculator';

const rubricScoreSchema = z.object({
  criteriaId: z.string().min(1),
  levelId: z.string().optional(),
  score: z.number().min(0),
  feedback: z.string().optional(),
});

const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  gradedBy: z.string().min(1),
  grade: z.number().min(0),
  gradeScale: z.string().default('0-100'),
  feedbackSummary: z.string().optional(),
  rubricScores: z.array(rubricScoreSchema).optional(),
  rubricId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = gradeSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { submissionId, gradedBy, grade, gradeScale, feedbackSummary, rubricScores, rubricId } = parsed.data;
    const letterGrade = calculateLetterGrade(grade, gradeScale);

    // Use a transaction to update submission and rubric scores
    const result = await db.$transaction(async (tx) => {
      // Update the submission
      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: {
          grade,
          gradeScale,
          letterGrade,
          feedbackSummary: feedbackSummary || null,
          gradedAt: new Date(),
          gradedBy,
          status: 'graded',
        },
        include: {
          document: { select: { id: true, title: true } },
          student: { select: { id: true, name: true, email: true } },
          report: { select: { id: true, similarityScore: true, aiScore: true } },
        },
      });

      // Delete existing rubric scores for this submission if new ones are provided
      if (rubricScores && rubricScores.length > 0 && rubricId) {
        await tx.rubricScore.deleteMany({
          where: { submissionId, rubricId },
        });

        // Create new rubric scores
        await tx.rubricScore.createMany({
          data: rubricScores.map((rs) => ({
            submissionId,
            rubricId,
            criteriaId: rs.criteriaId,
            levelId: rs.levelId || null,
            score: rs.score,
            feedback: rs.feedback || null,
            gradedBy,
          })),
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save grade';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
