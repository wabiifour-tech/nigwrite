/**
 * NigWrite - AI Content Detection Module
 * Created by: Wabi The Tech Nurse
 *
 * Detects LLM-generated text (ChatGPT, GPT-4, Claude, etc.) using
 * statistical analysis of text patterns:
 *
 *   1. Perplexity Analysis — Measures how predictable the text is.
 *      LLM text tends to have LOW perplexity (very predictable).
 *      Human text has HIGHER perplexity (more creative/unexpected choices).
 *
 *   2. Burstiness Analysis — Measures sentence length variance.
 *      LLM text tends to have UNIFORM sentence lengths (low burstiness).
 *      Human text has VARIED sentence lengths (high burstiness).
 *
 *   3. Vocabulary Diversity — Measures unique word usage patterns.
 *      LLM text often uses more limited vocabulary in certain contexts.
 *
 *   4. Structural Patterns — Analyzes paragraph structure and transitions.
 *      LLM text follows more rigid organizational patterns.
 *
 * Note: In production, this would integrate a fine-tuned RoBERTa model.
 * This implementation uses lightweight statistical heuristics for demonstration.
 */

export interface AISentenceResult {
  sentence: string;
  aiScore: number;
  startOffset: number;
  endOffset: number;
  isFlagged: boolean;
}

export interface AIDetectionResult {
  aiProbability: number;         // 0-100 percentage
  perplexityScore: number;       // Lower = more likely AI-generated
  burstinessScore: number;       // Lower = more likely AI-generated
  vocabularyDiversity: number;   // Type-Token Ratio
  averageSentenceLength: number;
  sentenceLengthVariance: number;
  confidence: 'low' | 'medium' | 'high';
  indicators: string[];          // Human-readable explanation of signals
}

export class AIDetector {
  /**
   * Analyze text for AI-generated content patterns.
   * Returns a comprehensive detection result with multiple metrics.
   */
  analyzeText(text: string): AIDetectionResult {
    if (!text || text.trim().length === 0) {
      return this.getEmptyResult();
    }

    const sentences = this.tokenizeSentences(text);
    const words = this.tokenizeWords(text);

    if (sentences.length < 2 || words.length < 10) {
      return this.getInsufficientDataResult(sentences, words);
    }

    // Run all detection analyses
    const perplexity = this.calculatePerplexity(words);
    const burstiness = this.calculateBurstiness(sentences);
    const vocabDiversity = this.calculateVocabularyDiversity(words);
    const avgSentenceLen = words.length / sentences.length;
    const sentenceVariance = this.calculateSentenceLengthVariance(sentences);

    // Compile indicators (human-readable signals)
    const indicators: string[] = [];

    if (perplexity < 3.5) {
      indicators.push(`Very low perplexity (${perplexity.toFixed(2)}) — text is highly predictable, suggesting AI generation`);
    } else if (perplexity < 5.0) {
      indicators.push(`Low perplexity (${perplexity.toFixed(2)}) — somewhat predictable word choices`);
    }

    if (burstiness < 30) {
      indicators.push(`Very low burstiness (${burstiness.toFixed(1)}) — unusually uniform sentence lengths`);
    } else if (burstiness < 50) {
      indicators.push(`Low burstiness (${burstiness.toFixed(1)}) — sentence lengths are more uniform than typical human writing`);
    }

    if (avgSentenceLen > 20 && avgSentenceLen < 28) {
      indicators.push(`Average sentence length (${avgSentenceLen.toFixed(1)} words) falls in the typical LLM range of 18-28 words`);
    }

    if (sentenceVariance < 40) {
      indicators.push(`Low sentence length variance (${sentenceVariance.toFixed(1)}) — human writing typically shows more variation`);
    }

    if (vocabDiversity > 0.65) {
      indicators.push(`High vocabulary diversity (${(vocabDiversity * 100).toFixed(1)}%) — could indicate AI's tendency to use varied synonyms`);
    }

    // Check for common LLM transition phrases
    const llmPhrases = this.detectLLMPhrases(text);
    if (llmPhrases.length > 0) {
      indicators.push(`Detected ${llmPhrases.length} common AI transition phrase(s): "${llmPhrases.slice(0, 3).join('", "')}"`);
    }

    // Calculate overall AI probability using weighted scoring
    const aiProbability = this.calculateAIProbability({
      perplexity,
      burstiness,
      vocabDiversity,
      avgSentenceLen,
      sentenceVariance,
      llmPhraseCount: llmPhrases.length,
    });

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high';
    if (aiProbability < 25 || aiProbability > 75) {
      confidence = 'high';
    } else if (aiProbability < 40 || aiProbability > 60) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      aiProbability: Math.round(aiProbability),
      perplexityScore: Math.round(perplexity * 100) / 100,
      burstinessScore: Math.round(burstiness * 100) / 100,
      vocabularyDiversity: Math.round(vocabDiversity * 1000) / 1000,
      averageSentenceLength: Math.round(avgSentenceLen * 10) / 10,
      sentenceLengthVariance: Math.round(sentenceVariance * 10) / 10,
      confidence,
      indicators,
    };
  }

  /**
   * Analyze text for AI-generated content on a per-sentence basis.
   * Returns an array of results with individual AI scores and offsets.
   * A sentence is flagged as AI if its individual score > 60.
   */
  analyzeBySentence(text: string): AISentenceResult[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || text.split(/\n+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) {
      return [];
    }

    const results: AISentenceResult[] = [];
    let currentOffset = 0;

    for (const rawSentence of sentences) {
      const trimmed = rawSentence.trim();
      if (trimmed.length < 10) {
        currentOffset += rawSentence.length;
        continue;
      }

      // Find the actual position in the original text
      const startOffset = text.indexOf(trimmed, currentOffset);
      const endOffset = startOffset + trimmed.length;
      currentOffset = endOffset;

      if (startOffset === -1) continue;

      const words = this.tokenizeWords(trimmed);
      if (words.length < 5) {
        results.push({
          sentence: trimmed,
          aiScore: 0,
          startOffset,
          endOffset,
          isFlagged: false,
        });
        continue;
      }

      const subSentences = [trimmed];
      const perplexity = this.calculatePerplexity(words);
      const burstiness = this.calculateBurstiness(subSentences);
      const vocabDiversity = this.calculateVocabularyDiversity(words);
      const avgSentenceLen = words.length;
      const llmPhrases = this.detectLLMPhrases(trimmed);

      const aiScore = this.calculateAIProbability({
        perplexity,
        burstiness,
        vocabDiversity,
        avgSentenceLen,
        sentenceVariance: 0,
        llmPhraseCount: llmPhrases.length,
      });

      const isFlagged = aiScore > 60;

      results.push({
        sentence: trimmed,
        aiScore: Math.round(aiScore),
        startOffset,
        endOffset,
        isFlagged,
      });
    }

    return results;
  }

  /**
   * Perplexity estimation using word frequency analysis.
   * Lower perplexity = more predictable = more likely AI-generated.
   *
   * We approximate perplexity using the Zipf-like distribution of words.
   * Real perplexity requires a language model; we use statistical proxies.
   */
  private calculatePerplexity(words: string[]): number {
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      const lower = word.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    }

    // Calculate Shannon entropy as a proxy for perplexity
    let entropy = 0;
    const totalWords = words.length;

    for (const count of wordFreq.values()) {
      const probability = count / totalWords;
      entropy -= probability * Math.log2(probability);
    }

    // Convert entropy to perplexity: PP = 2^H
    const perplexity = Math.pow(2, entropy);

    // Normalize to a 1-10 scale (human text typically scores 4-7)
    // AI text typically scores 2-4 due to more uniform distributions
    return Math.min(Math.max(perplexity / (totalWords * 0.01), 1), 10);
  }

  /**
   * Burstiness measures the variance in sentence lengths.
   * Human writing shows high burstiness (mix of short and long sentences).
   * LLM text shows low burstiness (more uniform sentence lengths).
   *
   * Returns a burstiness score (coefficient of variation in percentage).
   */
  private calculateBurstiness(sentences: string[]): number {
    const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    if (mean === 0) return 0;

    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation as percentage
    const cv = (stdDev / mean) * 100;

    // Human writing typically has CV of 50-80%
    // AI writing typically has CV of 25-45%
    return cv;
  }

  /**
   * Vocabulary diversity using Type-Token Ratio (TTR).
   * TTR = unique words / total words
   * AI text sometimes shows higher TTR due to systematic synonym use.
   */
  private calculateVocabularyDiversity(words: string[]): number {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    return uniqueWords.size / words.length;
  }

  /**
   * Calculate the variance of sentence lengths.
   */
  private calculateSentenceLengthVariance(sentences: string[]): number {
    const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    return lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  }

  /**
   * Detect common phrases used frequently by LLMs.
   * These transition phrases and hedging patterns are characteristic of AI output.
   */
  private detectLLMPhrases(text: string): string[] {
    const llmPhrases = [
      "in conclusion",
      "it is important to note",
      "it's worth noting",
      "as a language model",
      "as an ai",
      "in summary",
      "furthermore",
      "moreover",
      "additionally",
      "consequently",
      "nevertheless",
      "it is essential to",
      "it is crucial to",
      "plays a vital role",
      "delve into",
      "navigate the complexities",
      "in today's world",
      "in today's digital age",
      "landscape of",
      "underscores the importance",
      "shed light on",
      "paramount importance",
      "multifaceted",
      "a testament to",
      "paves the way for",
      "at the heart of",
      "in the realm of",
      "it is imperative",
      "not only",
      "but also",
      "in order to",
      "the fact that",
      "a wide range of",
      "a variety of",
      "it should be noted that",
      "bear in mind",
      "taking into account",
      "on the other hand",
      "when it comes to",
    ];

    const lowerText = text.toLowerCase();
    const found: string[] = [];

    for (const phrase of llmPhrases) {
      if (lowerText.includes(phrase)) {
        found.push(phrase);
      }
    }

    return found;
  }

  /**
   * Calculate overall AI probability using a weighted scoring model.
   * Each metric contributes to the final score based on its discriminative power.
   */
  private calculateAIProbability(metrics: {
    perplexity: number;
    burstiness: number;
    vocabDiversity: number;
    avgSentenceLen: number;
    sentenceVariance: number;
    llmPhraseCount: number;
  }): number {
    let score = 0;

    // Perplexity: Lower = more AI (weight: 25%)
    // Range: 1-10, human ~4-7, AI ~2-4
    if (metrics.perplexity < 3) score += 25;
    else if (metrics.perplexity < 4) score += 20;
    else if (metrics.perplexity < 5) score += 12;
    else if (metrics.perplexity < 6) score += 5;

    // Burstiness: Lower = more AI (weight: 25%)
    // Range: CV%, human ~50-80, AI ~25-45
    if (metrics.burstiness < 30) score += 25;
    else if (metrics.burstiness < 40) score += 20;
    else if (metrics.burstiness < 50) score += 12;
    else if (metrics.burstiness < 60) score += 5;

    // Sentence length variance: Lower = more AI (weight: 20%)
    // Human: higher variance, AI: lower variance
    if (metrics.sentenceVariance < 20) score += 20;
    else if (metrics.sentenceVariance < 40) score += 15;
    else if (metrics.sentenceVariance < 60) score += 8;
    else if (metrics.sentenceVariance < 80) score += 3;

    // Average sentence length: 18-28 is typical AI range (weight: 15%)
    if (metrics.avgSentenceLen >= 18 && metrics.avgSentenceLen <= 28) score += 15;
    else if (metrics.avgSentenceLen >= 15 && metrics.avgSentenceLen <= 32) score += 8;

    // LLM phrases: More phrases = more likely AI (weight: 15%)
    const phraseScore = Math.min(metrics.llmPhraseCount * 3, 15);
    score += phraseScore;

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Tokenize text into sentences using regex-based sentence boundary detection.
   */
  private tokenizeSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5); // Filter out very short fragments
  }

  /**
   * Tokenize text into words, filtering out empty strings.
   */
  private tokenizeWords(text: string): string[] {
    return text
      .split(/\s+/)
      .map(w => w.replace(/[^\w'-]/g, '').toLowerCase())
      .filter(w => w.length > 0);
  }

  private getEmptyResult(): AIDetectionResult {
    return {
      aiProbability: 0,
      perplexityScore: 0,
      burstinessScore: 0,
      vocabularyDiversity: 0,
      averageSentenceLength: 0,
      sentenceLengthVariance: 0,
      confidence: 'low',
      indicators: ['Insufficient text provided for analysis'],
    };
  }

  private getInsufficientDataResult(sentences: string[], words: string[]): AIDetectionResult {
    return {
      aiProbability: 50,
      perplexityScore: 0,
      burstinessScore: 0,
      vocabularyDiversity: words.length > 0 ? new Set(words).size / words.length : 0,
      averageSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
      sentenceLengthVariance: 0,
      confidence: 'low',
      indicators: ['Text too short for reliable AI detection analysis. Submit at least 2-3 sentences for accurate results.'],
    };
  }
}
