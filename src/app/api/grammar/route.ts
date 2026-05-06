/**
 * NigWrite - Grammar Check API
 * POST /api/grammar
 * Task ID: 2b
 *
 * Accepts text and returns a comprehensive grammar/mechanics/style report.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGrammar, type GrammarResult } from '@/lib/grammar-checker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text: string };

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (text.length > 200000) {
      return NextResponse.json(
        { success: false, error: 'Text is too long. Maximum 200,000 characters allowed.' },
        { status: 400 }
      );
    }

    const result: GrammarResult = checkGrammar(text);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Grammar check failed';
    console.error('[NigWrite] Grammar check error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
