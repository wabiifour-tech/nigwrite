/**
 * NigWrite - Search API
 * GET /api/search?q=xxx&page=1&limit=20
 *
 * Searches documents by title or content using Prisma's contains filter.
 * Returns matching documents with their latest scan report score.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { title: { contains: query } },
        { contentBody: { contains: query } },
      ],
    };

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          reports: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              similarityScore: true,
              aiScore: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.document.count({ where }),
    ]);

    const results = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
      latestReport: doc.reports[0] || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
