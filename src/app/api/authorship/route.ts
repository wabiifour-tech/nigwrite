/**
 * NigWrite - Authorship Analysis API
 * POST /api/authorship - Analyze writing style and detect anomalies
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeAuthorship, type WritingProfile } from '@/lib/authorship-analyzer';
import { db } from '@/lib/db';

const authorshipSchema = z.object({
  text: z
    .string()
    .min(50, 'Text must be at least 50 characters for authorship analysis')
    .max(500_000, 'Text must be 500,000 characters or less'),
  userId: z.string().optional(),
});

// In-memory store for writing profiles keyed by userId
const profileCache = new Map<string, { profile: WritingProfile; createdAt: string }[]>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = authorshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { text, userId } = parsed.data;

    // Fetch historical writing profiles for the user
    let historicalProfiles: { profile: WritingProfile; createdAt: string }[] = [];

    if (userId) {
      // Try to load from cache first
      const cached = profileCache.get(userId);
      if (cached && cached.length > 0) {
        historicalProfiles = cached;
      } else {
        // Fetch previous submissions from DB to build historical profiles
        try {
          const documents = await db.document.findMany({
            where: {
              userId: userId,
            },
            orderBy: { createdAt: 'desc' },
            take: 10, // Use last 10 submissions for comparison
            select: {
              contentBody: true,
              createdAt: true,
            },
          });

          if (documents.length > 0) {
            for (const doc of documents) {
              if (doc.contentBody && doc.contentBody.length > 100) {
                const result = analyzeAuthorship(doc.contentBody);
                historicalProfiles.push({
                  profile: result.profile,
                  createdAt: doc.createdAt.toISOString(),
                });
              }
            }

            // Cache for future requests
            profileCache.set(userId, historicalProfiles);
          }
        } catch {
          // DB error - proceed without historical comparison
          console.warn('Could not fetch historical documents for authorship comparison');
        }
      }
    }

    // Run the authorship analysis
    const result = analyzeAuthorship(text, historicalProfiles);

    // If we have a userId and the text is substantial, save the profile
    if (userId && text.length > 200 && result.consistencyScore > 30) {
      const existing = profileCache.get(userId) || [];
      existing.push({
        profile: result.profile,
        createdAt: new Date().toISOString(),
      });
      // Keep only the last 20 profiles per user
      profileCache.set(userId, existing.slice(-20));
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Authorship analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during authorship analysis',
      },
      { status: 500 }
    );
  }
}
