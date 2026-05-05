/**
 * NigWrite - Documents API
 * GET/POST /api/documents
 * Created by: Wabi The Tech Nurse
 *
 * CRUD operations for document management.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const documentCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(500_000, "Content must be 500,000 characters or less"),
  userId: z.string().optional(),
});

export async function GET() {
  try {
    const documents = await db.document.findMany({
      include: {
        reports: {
          include: { flaggedSegments: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = documentCreateSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { title, content, userId } = validation.data;

    const document = await db.document.create({
      data: {
        title,
        contentBody: content,
        userId: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
