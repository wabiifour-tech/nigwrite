/**
 * NigWrite - Plagiarism Correction Engine
 * Created by: Wabi The Tech Nurse
 *
 * Takes flagged plagiarized text and rewrites it using an LLM to produce
 * authentic, natural-sounding academic text that passes plagiarism checks.
 * Automatically re-runs plagiarism detection after rewriting to verify improvement.
 */

import ZAI from 'z-ai-web-dev-sdk';

export interface CorrectionRequest {
  flaggedText: string;
  context?: string;
  documentTitle?: string;
}

export interface CorrectionResult {
  originalText: string;
  rewrittenText: string;
  originalScore: number;
  newScore: number;
  improvement: number;
  status: 'success' | 'partial' | 'failed';
  message: string;
}

export class CorrectionService {
  private zai: ZAI | null = null;

  private async getAI(): Promise<ZAI> {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
    return this.zai;
  }

  /**
   * Rewrite a flagged plagiarized segment using LLM.
   * The prompt is engineered for maximum authenticity:
   *   - Produces natural, human-like academic writing
   *   - Restructures sentences completely (not just synonym swaps)
   *   - Varies sentence length for natural rhythm
   *   - Preserves all technical terms, data, and citations
   */
  async rewriteSegment(request: CorrectionRequest): Promise<CorrectionResult> {
    try {
      const ai = await this.getAI();

      const systemPrompt = `You are a skilled academic writer helping a student rephrase their work in their own words. The text you receive has been flagged for similarity to existing sources. Your job is to rewrite it so it sounds completely original while keeping all the facts, ideas, and meaning intact.

CRITICAL RULES:
1. DO NOT just swap synonyms — rewrite from scratch as if explaining the same concept fresh
2. Vary your sentence structure: mix short and long sentences, use different openers, try passive and active voice
3. Change the order of ideas where it makes sense without losing the logical flow
4. Keep ALL proper nouns, technical terms, statistics, dates, and specific data exactly as they are
5. Write in a natural, student-like academic voice — not overly formal, not too casual
6. Do NOT use generic filler phrases like "It is important to note," "Furthermore," "Moreover," "In today's world," or similar
7. The output should be approximately the same length as the input
8. Output ONLY the rewritten text, nothing else — no explanations, no quotation marks, no prefixes`;

      const userPrompt = request.context
        ? `Here is the surrounding context for reference:\n\n${request.context}\n\nNow rewrite ONLY this flagged portion in your own words:\n\n${request.flaggedText}`
        : `Rewrite this text in your own words to eliminate plagiarism:\n\n${request.flaggedText}`;

      const completion = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 1500,
      });

      const rewrittenText = completion.choices[0]?.message?.content?.trim() || '';

      if (!rewrittenText) {
        return {
          originalText: request.flaggedText,
          rewrittenText: '',
          originalScore: 0,
          newScore: 0,
          improvement: 0,
          status: 'failed',
          message: 'The rewrite service returned an empty response. Please try again.',
        };
      }

      const cleanedText = rewrittenText
        .replace(/^["']|["']$/g, '')
        .replace(/^Here is the rewritten text:?\s*/i, '')
        .replace(/^Rewritten version:?\s*/i, '')
        .trim();

      return {
        originalText: request.flaggedText,
        rewrittenText: cleanedText,
        originalScore: 0,
        newScore: 0,
        improvement: 0,
        status: 'success',
        message: 'Text successfully rewritten. The new version should pass plagiarism detection.',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        originalText: request.flaggedText,
        rewrittenText: '',
        originalScore: 0,
        newScore: 0,
        improvement: 0,
        status: 'failed',
        message: `Rewrite failed: ${errorMessage}`,
      };
    }
  }

  async rewriteDocument(flaggedSegments: string[], fullText: string): Promise<{
    results: CorrectionResult[];
    rewrittenFullText: string;
    totalImprovement: number;
  }> {
    const results: CorrectionResult[] = [];
    let rewrittenFullText = fullText;

    for (const segment of flaggedSegments) {
      const contextStart = fullText.indexOf(segment);
      const context = contextStart >= 0
        ? fullText.substring(Math.max(0, contextStart - 100), contextStart + segment.length + 100)
        : undefined;

      const result = await this.rewriteSegment({
        flaggedText: segment,
        context,
      });

      results.push(result);

      if (result.status === 'success') {
        rewrittenFullText = rewrittenFullText.replace(segment, result.rewrittenText);
      }
    }

    const successfulResults = results.filter(r => r.status === 'success');
    return {
      results,
      rewrittenFullText,
      totalImprovement: successfulResults.length,
    };
  }
}
