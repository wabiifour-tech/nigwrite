/**
 * NigWrite — Revision Assistant API Route
 * POST: Analyze text and return revision feedback with signal checks.
 * Optionally uses LLM to generate enhanced revision suggestions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revisionSchema, formatValidationErrors } from '@/lib/validations';
import { analyzeRevision, RevisionResult } from '@/lib/revision-assistant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = revisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: formatValidationErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const { text, title, useAI } = parsed.data;

    // Run heuristic analysis
    const result = analyzeRevision({ text, title });

    // If useAI is true, generate an enhanced AI revision prompt
    let aiRevisionPrompt: string | null = null;
    if (useAI) {
      try {
        aiRevisionPrompt = await generateAIRevisionPrompt(text, title, result);
      } catch {
        // Graceful fallback — use the heuristic prompt
        aiRevisionPrompt = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        aiRevisionPrompt: aiRevisionPrompt || undefined,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during analysis.',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate an enhanced AI-powered revision prompt using the LLM.
 */
async function generateAIRevisionPrompt(
  text: string,
  title: string | undefined,
  result: RevisionResult
): Promise<string> {
  try {
    // Dynamic import to avoid bundling z-ai-web-dev-sdk on the client
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const weakSignals = result.signals.filter(s => s.status === 'needs_work');
    const devSignals = result.signals.filter(s => s.status === 'developing');
    const strongSignals = result.signals.filter(s => s.status === 'strong');

    const signalsSummary = result.signals
      .map(s => `- ${s.name}: ${s.score}/100 (${s.status}) — ${s.feedback}`)
      .join('\n');

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert academic writing tutor. You provide specific, actionable revision guidance to students. Be encouraging but honest. Format your response in clear sections with bold headings. Use numbered action items. Keep it concise but thorough.`,
        },
        {
          role: 'user',
          content: `Analyze this academic paper and provide a detailed revision guide.

Title: "${title || 'Untitled'}"
Overall Score: ${result.overallScore}/100
Strong Areas: ${strongSignals.map(s => s.name).join(', ') || 'None'}
Developing Areas: ${devSignals.map(s => s.name).join(', ') || 'None'}
Needs Work: ${weakSignals.map(s => s.name).join(', ') || 'None'}

Signal Details:
${signalsSummary}

Paper text (first 2000 characters):
${text.slice(0, 2000)}

Provide a structured revision plan with:
1. **What's Working Well** — praise the strong areas
2. **Priority Revisions** — specific actions for the weakest areas
3. **Quick Wins** — easy improvements for developing areas
4. **Revision Checklist** — a bulleted checklist the student can follow

Keep it to under 400 words. Be encouraging and specific.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || result.revisionPrompt;
  } catch {
    throw new Error('LLM generation failed');
  }
}
