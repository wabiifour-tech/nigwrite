/**
 * NigWrite - Authorship Analysis Engine
 * Analyzes writing style through linguistic feature extraction.
 * Compares current text against historical submissions to detect anomalies.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface WritingProfile {
  avgSentenceLength: number;
  avgWordLength: number;
  vocabularyRichness: number; // type-token ratio
  sentenceLengthVariance: number;
  paragraphLengthAvg: number;
  transitionWordFrequency: number;
  passiveVoiceFrequency: number;
  punctuationPatterns: Record<string, number>;
  topWords: string[];
}

export interface AuthorshipResult {
  profile: WritingProfile;
  consistencyScore: number; // 0-100 (how consistent is this writing style internally)
  anomalyScore: number; // 0-100 (100 = likely different author)
  anomalies: string[];
  comparisonWithHistory?: {
    isConsistent: boolean;
    matchScore: number; // 0-100 similarity with previous submissions
    differences: string[];
  };
}

interface HistoricalProfile {
  profile: WritingProfile;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const TRANSITION_WORDS = new Set([
  'however', 'therefore', 'moreover', 'furthermore', 'additionally',
  'consequently', 'nevertheless', 'meanwhile', 'subsequently',
  'accordingly', 'thus', 'hence', 'indeed', 'notably',
  'alternatively', 'conversely', 'similarly', 'likewise',
  'in contrast', 'in addition', 'as a result', 'for example',
  'for instance', 'in particular', 'in conclusion', 'to summarize',
  'in summary', 'on the other hand', 'in other words',
  'as a matter of fact', 'at the same time', 'in fact',
  'first', 'second', 'third', 'finally', 'lastly',
  'above all', 'after all', 'all in all', 'as a consequence',
  'in the first place', 'on the contrary', 'otherwise',
  'that is', 'namely', 'specifically', 'generally',
]);

const PASSIVE_VOICE_PATTERNS = [
  /\b(am|are|is|was|were|be|been|being)\s+(being\s+)?(\w+ed|written|taken|given|made|known|shown|born|drawn|grown|held|kept|left|meant|met|paid|put|read|run|said|seen|sent|set|spoken|spent|stood|told|thought|understood)\b/gi,
  /\b(am|are|is|was|were|be|been|being)\s+being\s+\w+ed\b/gi,
  /\bhas\s+been\s+\w+ed\b/gi,
  /\bhave\s+been\s+\w+ed\b/gi,
  /\bhad\s+been\s+\w+ed\b/gi,
  /\bwill\s+be\s+\w+ed\b/gi,
  /\bwould\s+be\s+\w+ed\b/gi,
  /\bcan\s+be\s+\w+ed\b/gi,
  /\bcould\s+be\s+\w+ed\b/gi,
  /\bshould\s+be\s+\w+ed\b/gi,
  /\bmust\s+be\s+\w+ed\b/gi,
  /\bmay\s+be\s+\w+ed\b/gi,
  /\bmight\s+be\s+\w+ed\b/gi,
];

// Common English stop words to exclude from "top words" analysis
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'if', 'about', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'also', 'up', 'out', 'any', 'many',
  'much', 'get', 'got', 'like', 'well', 'back', 'even', 'still', 'way',
  'take', 'come', 'go', 'know', 'see', 'think', 'make', 'say', 'new',
  'one', 'two', 'also',
]);

// ──────────────────────────────────────────────
// Text preprocessing
// ──────────────────────────────────────────────

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation, preserving abbreviations
  const raw = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/);
  return raw
    .map(s => s.trim())
    .filter(s => s.length > 5 && /\w/.test(s));
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 10);
}

function getWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

// ──────────────────────────────────────────────
// Feature extraction
// ──────────────────────────────────────────────

function extractAvgSentenceLength(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + getWords(s).length, 0);
  return totalWords / sentences.length;
}

function extractAvgWordLength(words: string[]): number {
  if (words.length === 0) return 0;
  return words.reduce((sum, w) => sum + w.length, 0) / words.length;
}

function extractVocabularyRichness(words: string[]): number {
  if (words.length === 0) return 0;
  const unique = new Set(words);
  // Type-token ratio, adjusted for text length using moving average
  // to reduce bias from short texts
  const sampleSize = Math.min(words.length, 200);
  const sampledWords = words.slice(0, sampleSize);
  const uniqueSampled = new Set(sampledWords);
  return uniqueSampled.size / sampledWords.length;
}

function extractSentenceLengthVariance(sentences: string[]): number {
  if (sentences.length < 2) return 0;
  const lengths = sentences.map(s => getWords(s).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length;
  return Math.sqrt(variance); // standard deviation
}

function extractParagraphLengthAvg(paragraphs: string[]): number {
  if (paragraphs.length === 0) return 0;
  const totalWords = paragraphs.reduce((sum, p) => sum + getWords(p).length, 0);
  return totalWords / paragraphs.length;
}

function extractTransitionWordFrequency(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const allWords = getWords(sentences.join(' '));
  let transitionCount = 0;
  for (const word of allWords) {
    if (TRANSITION_WORDS.has(word)) transitionCount++;
  }
  return allWords.length > 0 ? (transitionCount / allWords.length) * 100 : 0;
}

function extractPassiveVoiceFrequency(text: string): number {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return 0;

  let passiveSentences = 0;
  for (const sentence of sentences) {
    for (const pattern of PASSIVE_VOICE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(sentence)) {
        passiveSentences++;
        break;
      }
    }
  }
  return (passiveSentences / sentences.length) * 100;
}

function extractPunctuationPatterns(text: string): Record<string, number> {
  const patterns: Record<string, number> = {};

  // Count different punctuation types per 1000 words
  const words = getWords(text);
  const wordCount = Math.max(words.length, 1);

  const commaCount = (text.match(/,/g) || []).length;
  const semicolonCount = (text.match(/;/g) || []).length;
  const colonCount = (text.match(/:/g) || []).length;
  const dashCount = (text.match(/[—–-]/g) || []).length;
  const parenCount = (text.match(/[()]/g) || []).length;
  const exclaimCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const quoteCount = (text.match(/[""]/g) || []).length;

  patterns.commas = (commaCount / wordCount) * 1000;
  patterns.semicolons = (semicolonCount / wordCount) * 1000;
  patterns.colons = (colonCount / wordCount) * 1000;
  patterns.dashes = (dashCount / wordCount) * 1000;
  patterns.parentheses = (parenCount / wordCount) * 1000;
  patterns.exclamations = (exclaimCount / wordCount) * 1000;
  patterns.questions = (questionCount / wordCount) * 1000;
  patterns.quotes = (quoteCount / wordCount) * 1000;

  return patterns;
}

function extractTopWords(words: string[], count = 20): string[] {
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (w.length > 3 && !STOP_WORDS.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

// ──────────────────────────────────────────────
// Internal consistency analysis
// ──────────────────────────────────────────────

function analyzeConsistency(text: string, sentences: string[], profile: WritingProfile): {
  score: number;
  anomalies: string[];
} {
  const anomalies: string[] = [];
  let penalty = 0;

  // Check for extreme sentence length outliers
  const sentenceLengths = sentences.map(s => getWords(s).length);
  const mean = profile.avgSentenceLength;
  const outliers = sentenceLengths.filter(l => {
    return l > mean * 3 || (l < mean * 0.2 && l > 0);
  });
  if (outliers.length > sentences.length * 0.15) {
    anomalies.push('High sentence length variation detected — some sentences are abnormally long or short compared to your usual style');
    penalty += 15;
  }

  // Check vocabulary shifts between halves
  const midPoint = Math.floor(sentences.length / 2);
  const firstHalf = sentences.slice(0, midPoint).join(' ');
  const secondHalf = sentences.slice(midPoint).join(' ');
  const firstWords = new Set(getWords(firstHalf));
  const secondWords = new Set(getWords(secondHalf));

  // Jaccard similarity between vocabulary of first and second halves
  let intersection = 0;
  for (const w of firstWords) {
    if (secondWords.has(w)) intersection++;
  }
  const union = firstWords.size + secondWords.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  if (jaccard < 0.3 && sentences.length > 10) {
    anomalies.push('Significant vocabulary shift between the first and second half of the document — possibly written by different authors');
    penalty += 20;
  } else if (jaccard < 0.4 && sentences.length > 10) {
    anomalies.push('Moderate vocabulary shift detected between document sections');
    penalty += 10;
  }

  // Check for abrupt style changes (look at sentence complexity transition points)
  if (sentences.length > 8) {
    const windowSize = Math.max(4, Math.floor(sentences.length / 5));
    for (let i = windowSize; i < sentences.length; i += windowSize) {
      const prevWindow = sentences.slice(Math.max(0, i - windowSize), i);
      const currWindow = sentences.slice(i, Math.min(i + windowSize, sentences.length));
      const prevAvg = prevWindow.reduce((s, st) => s + getWords(st).length, 0) / prevWindow.length;
      const currAvg = currWindow.reduce((s, st) => s + getWords(st).length, 0) / currWindow.length;
      const diff = Math.abs(prevAvg - currAvg) / Math.max(prevAvg, 1);

      if (diff > 0.6 && prevAvg > 5 && currAvg > 5) {
        anomalies.push('Abrupt change in sentence complexity detected partway through the document');
        penalty += 12;
        break;
      }
    }
  }

  // Check passive voice consistency
  if (profile.passiveVoiceFrequency > 40) {
    anomalies.push('Unusually high frequency of passive voice constructions');
    penalty += 8;
  } else if (profile.passiveVoiceFrequency < 2 && sentences.length > 10) {
    anomalies.push('Very low passive voice usage — may indicate a different writing style');
    penalty += 5;
  }

  // Check punctuation extremes
  const { commas, semicolons, exclamations } = profile.punctuationPatterns;
  if (semicolons > 15) {
    anomalies.push('Unusually high use of semicolons for academic writing');
    penalty += 5;
  }
  if (exclamations > 5) {
    anomalies.push('Frequent exclamatory sentences — unusual for formal writing');
    penalty += 8;
  }

  const consistencyScore = Math.max(0, Math.min(100, 100 - penalty));
  return { score: consistencyScore, anomalies };
}

// ──────────────────────────────────────────────
// Historical comparison
// ──────────────────────────────────────────────

function compareWithHistory(
  currentProfile: WritingProfile,
  historicalProfiles: HistoricalProfile[]
): {
  isConsistent: boolean;
  matchScore: number;
  differences: string[];
} {
  if (historicalProfiles.length === 0) {
    return { isConsistent: true, matchScore: -1, differences: [] };
  }

  const differences: string[] = [];
  let totalSimilarity = 0;

  // Average the historical profiles
  const avgHistory: WritingProfile = {
    avgSentenceLength: 0,
    avgWordLength: 0,
    vocabularyRichness: 0,
    sentenceLengthVariance: 0,
    paragraphLengthAvg: 0,
    transitionWordFrequency: 0,
    passiveVoiceFrequency: 0,
    punctuationPatterns: {},
    topWords: [],
  };

  for (const hp of historicalProfiles) {
    avgHistory.avgSentenceLength += hp.profile.avgSentenceLength;
    avgHistory.avgWordLength += hp.profile.avgWordLength;
    avgHistory.vocabularyRichness += hp.profile.vocabularyRichness;
    avgHistory.sentenceLengthVariance += hp.profile.sentenceLengthVariance;
    avgHistory.paragraphLengthAvg += hp.profile.paragraphLengthAvg;
    avgHistory.transitionWordFrequency += hp.profile.transitionWordFrequency;
    avgHistory.passiveVoiceFrequency += hp.profile.passiveVoiceFrequency;
  }

  const n = historicalProfiles.length;
  avgHistory.avgSentenceLength /= n;
  avgHistory.avgWordLength /= n;
  avgHistory.vocabularyRichness /= n;
  avgHistory.sentenceLengthVariance /= n;
  avgHistory.paragraphLengthAvg /= n;
  avgHistory.transitionWordFrequency /= n;
  avgHistory.passiveVoiceFrequency /= n;

  // Compare each metric and compute similarity
  const metrics: { name: string; current: number; historical: number; weight: number; threshold: number }[] = [
    { name: 'Average sentence length', current: currentProfile.avgSentenceLength, historical: avgHistory.avgSentenceLength, weight: 25, threshold: 0.35 },
    { name: 'Average word length', current: currentProfile.avgWordLength, historical: avgHistory.avgWordLength, weight: 10, threshold: 0.25 },
    { name: 'Vocabulary richness', current: currentProfile.vocabularyRichness, historical: avgHistory.vocabularyRichness, weight: 20, threshold: 0.2 },
    { name: 'Sentence length variance', current: currentProfile.sentenceLengthVariance, historical: avgHistory.sentenceLengthVariance, weight: 15, threshold: 0.4 },
    { name: 'Average paragraph length', current: currentProfile.paragraphLengthAvg, historical: avgHistory.paragraphLengthAvg, weight: 15, threshold: 0.35 },
    { name: 'Transition word frequency', current: currentProfile.transitionWordFrequency, historical: avgHistory.transitionWordFrequency, weight: 10, threshold: 0.5 },
    { name: 'Passive voice frequency', current: currentProfile.passiveVoiceFrequency, historical: avgHistory.passiveVoiceFrequency, weight: 5, threshold: 0.6 },
  ];

  let totalWeight = 0;

  for (const metric of metrics) {
    const histVal = Math.max(metric.historical, 0.01);
    const diff = Math.abs(metric.current - metric.historical) / histVal;
    const similarity = Math.max(0, 1 - diff / metric.threshold);
    const weightedScore = similarity * metric.weight;
    totalSimilarity += weightedScore;
    totalWeight += metric.weight;

    if (diff > metric.threshold * 0.8) {
      let direction = metric.current > metric.historical ? 'higher' : 'lower';
      differences.push(
        `${metric.name} is ${direction} than your usual writing (${Math.round(metric.current * 10) / 10} vs ${Math.round(metric.historical * 10) / 10})`
      );
    }
  }

  // Compare top words overlap
  const historicalTopWords = new Set<string>();
  for (const hp of historicalProfiles) {
    for (const w of hp.profile.topWords) {
      historicalTopWords.add(w);
    }
  }
  const currentTopWords = new Set(currentProfile.topWords);
  let overlapCount = 0;
  for (const w of currentTopWords) {
    if (historicalTopWords.has(w)) overlapCount++;
  }
  const wordOverlap = currentTopWords.size > 0 ? overlapCount / currentTopWords.size : 0;
  const wordSimilarity = Math.min(1, wordOverlap * 1.5);
  totalSimilarity += wordSimilarity * 10;
  totalWeight += 10;

  // Compare punctuation patterns
  for (const hp of historicalProfiles) {
    for (const key of Object.keys(currentProfile.punctuationPatterns)) {
      if (key in hp.profile.punctuationPatterns) {
        const currVal = currentProfile.punctuationPatterns[key];
        const histVal = hp.profile.punctuationPatterns[key];
        if (histVal > 0) {
          const punctDiff = Math.abs(currVal - histVal) / histVal;
          if (punctDiff > 1.0) {
            differences.push(`Unusual ${key} usage pattern compared to previous submissions`);
          }
        }
      }
    }
  }

  const matchScore = totalWeight > 0 ? Math.round((totalSimilarity / totalWeight) * 100) : 50;
  const isConsistent = matchScore >= 55;

  return { isConsistent, matchScore: Math.max(0, Math.min(100, matchScore)), differences };
}

// ──────────────────────────────────────────────
// Main analysis function
// ──────────────────────────────────────────────

export function analyzeAuthorship(
  text: string,
  historicalProfiles?: HistoricalProfile[]
): AuthorshipResult {
  // Basic text validation
  if (!text || text.trim().length < 50) {
    return {
      profile: {
        avgSentenceLength: 0,
        avgWordLength: 0,
        vocabularyRichness: 0,
        sentenceLengthVariance: 0,
        paragraphLengthAvg: 0,
        transitionWordFrequency: 0,
        passiveVoiceFrequency: 0,
        punctuationPatterns: {},
        topWords: [],
      },
      consistencyScore: 0,
      anomalyScore: 0,
      anomalies: ['Text is too short for reliable authorship analysis (minimum 50 characters)'],
    };
  }

  // Extract features
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);
  const words = getWords(text);

  if (words.length < 20 || sentences.length < 2) {
    return {
      profile: {
        avgSentenceLength: extractAvgSentenceLength(sentences),
        avgWordLength: extractAvgWordLength(words),
        vocabularyRichness: extractVocabularyRichness(words),
        sentenceLengthVariance: extractSentenceLengthVariance(sentences),
        paragraphLengthAvg: extractParagraphLengthAvg(paragraphs),
        transitionWordFrequency: extractTransitionWordFrequency(sentences),
        passiveVoiceFrequency: extractPassiveVoiceFrequency(text),
        punctuationPatterns: extractPunctuationPatterns(text),
        topWords: extractTopWords(words),
      },
      consistencyScore: 50,
      anomalyScore: 50,
      anomalies: ['Text is too short for reliable authorship analysis'],
    };
  }

  const profile: WritingProfile = {
    avgSentenceLength: extractAvgSentenceLength(sentences),
    avgWordLength: extractAvgWordLength(words),
    vocabularyRichness: extractVocabularyRichness(words),
    sentenceLengthVariance: extractSentenceLengthVariance(sentences),
    paragraphLengthAvg: extractParagraphLengthAvg(paragraphs),
    transitionWordFrequency: extractTransitionWordFrequency(sentences),
    passiveVoiceFrequency: extractPassiveVoiceFrequency(text),
    punctuationPatterns: extractPunctuationPatterns(text),
    topWords: extractTopWords(words),
  };

  // Internal consistency analysis
  const { score: consistencyScore, anomalies: consistencyAnomalies } = analyzeConsistency(text, sentences, profile);

  // Historical comparison
  const allAnomalies = [...consistencyAnomalies];
  let comparisonWithHistory: AuthorshipResult['comparisonWithHistory'];

  if (historicalProfiles && historicalProfiles.length > 0) {
    const comparison = compareWithHistory(profile, historicalProfiles);
    comparisonWithHistory = comparison;
    allAnomalies.push(...comparison.differences);
  }

  // Compute anomaly score: inverse of consistency + historical mismatch
  let anomalyScore = 100 - consistencyScore;
  if (comparisonWithHistory && comparisonWithHistory.matchScore >= 0) {
    const historicalAnomaly = 100 - comparisonWithHistory.matchScore;
    anomalyScore = Math.round((anomalyScore * 0.4 + historicalAnomaly * 0.6));
  }

  anomalyScore = Math.max(0, Math.min(100, anomalyScore));

  return {
    profile,
    consistencyScore,
    anomalyScore,
    anomalies: allAnomalies,
    comparisonWithHistory,
  };
}
