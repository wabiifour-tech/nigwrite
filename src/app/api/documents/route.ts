/**
 * NigWrite - Documents API
 * GET/POST /api/documents
 * Created by: Wabi The Tech Nurse
 *
 * CRUD operations for document management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const documents = await db.document.findMany({
      include: {
        reports: {
          include: { flaggedSegments: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, userId } = body as {
      title: string;
      content: string;
      userId?: string;
    };

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const document = await db.document.create({
      data: {
        title,
        contentBody: content,
        userId: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
