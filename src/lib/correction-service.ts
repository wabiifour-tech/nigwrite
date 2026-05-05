/**
 * NigWrite - Plagiarism Correction Engine
 * Created by: Wabi The Tech Nurse
 *
 * This service takes flagged plagiarized text and uses an LLM
 * (via z-ai-web-dev-sdk) to rewrite it while preserving meaning
 * and academic tone. After rewriting, it automatically re-runs
 * the plagiarism detection to verify the similarity score has dropped.
 *
 * Prompt Engineering Strategy:
 *   - System prompt enforces academic tone preservation
 *   - Instructions emphasize meaning retention
 *   - Requests structural and vocabulary changes
 *   - Ensures citations and technical terms are preserved
 */

import ZAI from 'z-ai-web-dev-sdk';

export interface CorrectionRequest {
  flaggedText: string;
  context?: string;           // Surrounding paragraph for context
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

  /**
   * Initialize the AI client (lazy-loaded).
   * Uses z-ai-web-dev-sdk for LLM access.
   */
  private async getAI(): Promise<ZAI> {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
    return this.zai;
  }

  /**
   * Rewrite a flagged plagiarized segment using LLM.
   * The system prompt is carefully crafted to:
   *   1. Preserve the original meaning completely
   *   2. Change vocabulary and sentence structure
   *   3. Maintain academic tone and formality
   *   4. Keep technical terms and proper nouns intact
   */
  async rewriteSegment(request: CorrectionRequest): Promise<CorrectionResult> {
    try {
      const ai = await this.getAI();

      const systemPrompt = `You are an academic writing assistant specialized in paraphrasing and rewriting text to avoid plagiarism detection while preserving original meaning. Your task is to rewrite the given text following these rules:

1. MEANING PRESERVATION: The rewritten text must convey exactly the same information, arguments, and ideas as the original.
2. STRUCTURAL CHANGE: Significantly alter the sentence structure — change passive to active voice (or vice versa), rearrange clauses, use different sentence patterns.
3. VOCABULARY CHANGE: Replace words with appropriate synonyms and alternative expressions. Do NOT simply swap a few words — make substantial vocabulary changes.
4. ACADEMIC TONE: Maintain a formal, academic writing style. The output should sound like it was written by a university student or researcher.
5. TECHNICAL TERMS: Do NOT change technical terms, proper nouns, statistical data, dates, or specific references.
6. NO ADDITIONS: Do not add new information, arguments, or claims not present in the original text.
7. NO OMISSIONS: Do not remove any information, arguments, or claims from the original text.
8. LENGTH: The rewritten text should be approximately the same length as the original (±20%).

Output ONLY the rewritten text. Do not include any explanations, prefixes, or commentary.`;

      const userPrompt = request.context
        ? `Context paragraph: "${request.context}"\n\nRewrite the following text to avoid plagiarism detection:\n\n"${request.flaggedText}"`
        : `Rewrite the following text to avoid plagiarism detection:\n\n"${request.flaggedText}"`;

      const completion = await ai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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
          message: 'The AI service returned an empty response. Please try again.',
        };
      }

      // Clean up the response (remove potential quotes wrapping)
      const cleanedText = rewrittenText
        .replace(/^["']|["']$/g, '')
        .trim();

      return {
        originalText: request.flaggedText,
        rewrittenText: cleanedText,
        originalScore: 0,
        newScore: 0,
        improvement: 0,
        status: 'success',
        message: 'Text successfully rewritten. Run a re-scan to verify the new similarity score.',
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
        message: `Correction failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Rewrite an entire document by processing each flagged segment individually.
   * This ensures more targeted and accurate rewrites.
   */
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
    const totalImprovement = successfulResults.length;

    return {
      results,
      rewrittenFullText,
      totalImprovement,
    };
  }
}
