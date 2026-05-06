/**
 * NigWrite — Revision Assistant Engine
 * Analyzes writing quality using 5 signal checks with regex/heuristics.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface SignalCheck {
  name: string;
  score: number; // 0-100
  status: 'strong' | 'developing' | 'needs_work';
  feedback: string;
  suggestions: string[];
}

export interface RevisionResult {
  overallScore: number;
  signals: SignalCheck[];
  revisionPrompt: string;
}

export interface RevisionAnalysisInput {
  text: string;
  title?: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

function getSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

function wordFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length > 2) {
      freq.set(lower, (freq.get(lower) || 0) + 1);
    }
  }
  return freq;
}

function uniqueRatio(words: string[]): number {
  if (words.length === 0) return 0;
  const freq = wordFrequency(words);
  const unique = new Set([...freq.keys()]).size;
  return unique / words.length;
}

function classifyScore(score: number): SignalCheck['status'] {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'developing';
  return 'needs_work';
}

// ──────────────────────────────────────────────
// Signal 1: Thesis Clarity
// ──────────────────────────────────────────────
function checkThesisClarity(text: string): SignalCheck {
  const paragraphs = getParagraphs(text);
  const firstPara = paragraphs[0] || '';
  const firstSentences = firstPara.split(/(?<=[.!?])\s+/).slice(0, 5).map(s => s.trim().toLowerCase());
  const score: { raw: number; max: number } = { raw: 0, max: 0 };
  const suggestions: string[] = [];

  // Check for thesis indicators in first paragraph
  const thesisIndicators = [
    /\b(this\s+(paper|essay|study|research|thesis|dissertation|article))\b/i,
    /\b(i\s+(will|shall|aim|intend|argue|propose|demonstrate|examine|explore|discuss|analyze|investigate))\b/i,
    /\b(the\s+(purpose|goal|objective|aim|focus|main\s+argument|central\s+claim|thesis))\b/i,
    /\b(this\s+(research|study|work)\s+(aims?|seeks?|attempts?|intends?))\b/i,
    /\b(it\s+(is|was)\s+(argued|contended|claimed|asserted|maintained))\b/i,
    /\b(we\s+(will|shall|aim|intend|argue|propose))\b/i,
    /\b(the\s+(following|ensuing|subsequent))\b.*\b(will|shall)\b/i,
  ];

  // Has thesis indicator (30 pts)
  score.max += 30;
  const hasThesisIndicator = thesisIndicators.some(rx => rx.test(firstPara));
  if (hasThesisIndicator) {
    score.raw += 30;
  } else {
    suggestions.push('Add a clear thesis statement in the first paragraph (e.g., "This paper argues that...")');
  }

  // Has claim/assertion language (20 pts)
  score.max += 20;
  const claimPatterns = [
    /\b(important|significant|crucial|essential|critical|vital|fundamental)\b/i,
    /\b(shows?|reveals?|indicates?|demonstrates?|suggests?|proves?)\b/i,
    /\b(argues?|claims?|asserts?|contends?|maintains?)\b/i,
    /\b(because|therefore|thus|consequently|as\s+a\s+result|due\s+to)\b/i,
  ];
  const claimCount = claimPatterns.filter(rx => rx.test(firstPara)).length;
  score.raw += Math.min(20, claimCount * 7);
  if (claimCount === 0) {
    suggestions.push('Include assertion or argumentative language (e.g., "This is significant because...")');
  }

  // First paragraph is substantial (15 pts)
  score.max += 15;
  const firstParaWords = getWords(firstPara).length;
  if (firstParaWords >= 50) {
    score.raw += 15;
  } else if (firstParaWords >= 30) {
    score.raw += 8;
    suggestions.push('Expand your introduction — aim for at least 50 words in the opening paragraph');
  } else {
    suggestions.push('Your introduction is too short. Aim for at least 50 words with a clear thesis');
  }

  // Contains "because" / causal reasoning (15 pts)
  score.max += 15;
  const causalPatterns = [/\bbecause\b/i, /\btherefore\b/i, /\bthus\b/i, /\bdue\s+to\b/i, /\bas\s+a\s+result\b/i, /\bconsequently\b/i];
  const causalCount = causalPatterns.filter(rx => rx.test(text)).length;
  score.raw += Math.min(15, causalCount * 5);
  if (causalCount === 0) {
    suggestions.push('Use causal reasoning words (because, therefore, due to) to support your claims');
  }

  // Not purely descriptive (20 pts)
  score.max += 20;
  const descriptiveOnly = /^(?:the|a|an|this|that|these|those)\s+(is|are|was|were)\s/i.test(firstPara.trim()) &&
    !claimPatterns.some(rx => rx.test(firstPara));
  if (!descriptiveOnly || hasThesisIndicator) {
    score.raw += 20;
  } else {
    suggestions.push('Move beyond description — include an analytical claim or argument');
  }

  const finalScore = Math.round((score.raw / score.max) * 100);
  const feedback = hasThesisIndicator
    ? 'Your thesis statement is clearly articulated in the introduction.'
    : firstParaWords > 30
      ? 'Your introduction contains relevant context but lacks a clear, explicit thesis statement.'
      : 'The introduction needs a clearly stated thesis with your main argument or claim.';

  return {
    name: 'Thesis Clarity',
    score: finalScore,
    status: classifyScore(finalScore),
    feedback,
    suggestions,
  };
}

// ──────────────────────────────────────────────
// Signal 2: Evidence Quality
// ──────────────────────────────────────────────
function checkEvidenceQuality(text: string): SignalCheck {
  const words = getWords(text);
  const sentences = getSentences(text);
  const score: { raw: number; max: number } = { raw: 0, max: 0 };
  const suggestions: string[] = [];

  // Citation detection (25 pts)
  score.max += 25;
  const citationPatterns = [
    /\(\s*\w[\w\s,.;:&]*\s*\d{4}\s*\)/,           // (Author, 2024)
    /\(\s*\w[\w\s,.;:&]*\s*,\s*\d{4}\s*,?\s*p\.?\s*\d+\s*\)/, // (Author, 2024, p.5)
    /\[\d+\]/,                                       // [1]
    /\(\s*see\s+/i,                                   // (see
    /\b( According to | as noted by | as stated by | cited in )\b/i,
    /\b( Smith et al\.| et al\.)\b/i,
    /\b( (APA|MLA|IEEE|Harvard|Chicago)\s+style )\b/i,
    /\b( doi:|https?:\/\/doi\.org\/)/i,
    /\b( research shows | studies show | studies have shown | evidence suggests )\b/i,
  ];
  const citationMatches = citationPatterns.filter(rx => rx.test(text)).length;
  score.raw += Math.min(25, citationMatches * 5);
  if (citationMatches === 0) {
    suggestions.push('Add in-text citations to support your claims (e.g., APA: (Author, Year))');
  }

  // Data / statistics (25 pts)
  score.max += 25;
  const dataPatterns = [
    /\d+(\.\d+)?%/,
    /\b\d{2,}(?:,\d{3})*(?:\.\d+)?\b/,            // Numbers like 1,234 or 45.6
    /\b(statistic|statistics|survey|data|findings?|results?|study|experiment|trial|meta-analysis|sample)\b/i,
    /\b( percent | percentage | proportion | ratio | frequency | incidence | prevalence )\b/i,
  ];
  const dataMatches = dataPatterns.filter(rx => rx.test(text)).length;
  score.raw += Math.min(25, dataMatches * 7);
  if (dataMatches === 0) {
    suggestions.push('Include specific data, statistics, or research findings to strengthen your argument');
  }

  // Specific examples / named entities (25 pts)
  score.max += 25;
  const examplePatterns = [
    /\b(for example|for instance|such as|e\.g\.|i\.e\.|specifically|in particular|notably|namely)\b/i,
    /\b(case study|case in point|illustrated by|demonstrated by|exemplified by)\b/i,
    /\b(research by|a study by|according to|findings from|report by)\b/i,
  ];
  const exampleMatches = examplePatterns.filter(rx => rx.test(text)).length;
  score.raw += Math.min(25, exampleMatches * 9);
  if (exampleMatches === 0) {
    suggestions.push('Use specific examples or case studies to illustrate your points');
  }

  // Evidence density (sentences with evidence markers / total sentences) (25 pts)
  score.max += 25;
  if (sentences.length > 0) {
    const evidenceSentencePatterns = [
      /\d+(\.\d+)?%/, /\(\s*\w/, /\[\d+\]/, /\bet al\./i,
      /\b(according|study|research|data|statistics|survey|evidence|finding|result|report)\b/i,
    ];
    const evidenceSentences = sentences.filter(s => evidenceSentencePatterns.some(rx => rx.test(s))).length;
    const density = evidenceSentences / sentences.length;
    score.raw += Math.min(25, Math.round(density * 100));
    if (density < 0.1) {
      suggestions.push('Spread evidence throughout your paper — aim for evidence in most paragraphs');
    }
  }

  const finalScore = Math.round((score.raw / score.max) * 100);
  const feedback = citationMatches >= 3 && dataMatches >= 2
    ? 'Strong evidence base with multiple citations and data points.'
    : citationMatches > 0 || dataMatches > 0
      ? 'Some evidence present but could be strengthened with more diverse sources and data.'
      : 'Your paper lacks supporting evidence. Add citations, data, and specific examples.';

  return {
    name: 'Evidence Quality',
    score: finalScore,
    status: classifyScore(finalScore),
    feedback,
    suggestions,
  };
}

// ──────────────────────────────────────────────
// Signal 3: Organization
// ──────────────────────────────────────────────
function checkOrganization(text: string): SignalCheck {
  const paragraphs = getParagraphs(text);
  const sentences = getSentences(text);
  const score: { raw: number; max: number } = { raw: 0, max: 0 };
  const suggestions: string[] = [];

  // Transition words (25 pts)
  score.max += 25;
  const transitionWords = [
    'however', 'therefore', 'moreover', 'furthermore', 'in addition', 'consequently',
    'nevertheless', 'nonetheless', 'meanwhile', 'similarly', 'likewise', 'in contrast',
    'on the other hand', 'in conclusion', 'to begin with', 'first', 'second', 'third',
    'finally', 'lastly', 'subsequently', 'additionally', 'alternatively', 'otherwise',
    'for instance', 'as a result', 'in other words', 'that is', 'in particular',
    'above all', 'after all', 'at last', 'at the same time', 'besides', 'equally',
    'for example', 'for this reason', 'in fact', 'in summary', 'in the same way',
    'on the contrary', 'otherwise', 'then', 'thus', 'hence', 'accordingly',
    'notably', 'importantly', 'significantly', 'specifically', 'conversely',
  ];
  const textLower = text.toLowerCase();
  const foundTransitions = transitionWords.filter(tw => textLower.includes(tw));
  score.raw += Math.min(25, foundTransitions.length * 3);
  if (foundTransitions.length < 3) {
    suggestions.push('Use more transition words between paragraphs and ideas (e.g., "However", "Furthermore", "In addition")');
  }

  // Paragraph structure (25 pts)
  score.max += 25;
  const adequateParagraphs = paragraphs.filter(p => getWords(p).length >= 30);
  if (paragraphs.length >= 3) {
    score.raw += 10;
    if (adequateParagraphs.length >= 3) {
      score.raw += 15;
    } else {
      score.raw += 7;
      suggestions.push('Some paragraphs are too short — develop each idea with at least 3-4 sentences');
    }
  } else if (paragraphs.length >= 2) {
    score.raw += 10;
    suggestions.push('Consider breaking your text into more paragraphs for better structure');
  } else {
    suggestions.push('Your text needs more paragraph breaks. Each main idea should have its own paragraph');
  }

  // Logical ordering — check for topic sentence patterns (25 pts)
  score.max += 25;
  const topicSentencePatterns = [
    /\b(this|these|such)\s+(shows?|reveals?|indicates?|demonstrates?|suggests?|means?)\b/i,
    /^\s*(therefore|however|moreover|furthermore|additionally|consequently|nevertheless)/im,
    /\b(another|one|first|second|third|next|finally)\b/i,
  ];
  const midParagraphs = paragraphs.slice(1, -1);
  let topicScore = 0;
  for (const para of midParagraphs) {
    const firstSentence = para.split(/(?<=[.!?])\s+/)[0] || '';
    if (topicSentencePatterns.some(rx => rx.test(firstSentence))) {
      topicScore++;
    }
  }
  if (midParagraphs.length > 0) {
    const topicRatio = topicScore / midParagraphs.length;
    score.raw += Math.min(25, Math.round(topicRatio * 30));
    if (topicRatio < 0.5) {
      suggestions.push('Start each paragraph with a clear topic sentence that introduces the main idea');
    }
  } else {
    score.raw += 15; // neutral for very short texts
  }

  // Has introduction AND conclusion (25 pts)
  score.max += 25;
  const introIndicators = [
    /\b(introduction|background|context|overview)\b/i,
    /\b(this\s+paper|this\s+essay|this\s+study|this\s+research)\b/i,
  ];
  const conclusionIndicators = [
    /\b(in\s+conclusion|to\s+conclude|in\s+summary|to\s+summarize|in\s+summary|overall|in\s+brief|all\s+in\s+all|to\s+wrap\s+up)\b/i,
    /\b(conclusion|summary|concluding\s+remarks|final\s+thoughts?|closing)\b/i,
  ];
  const hasIntro = introIndicators.some(rx => rx.test(paragraphs[0] || ''));
  const lastPara = paragraphs[paragraphs.length - 1] || '';
  const hasConclusion = conclusionIndicators.some(rx => rx.test(lastPara));
  if (hasIntro && hasConclusion) {
    score.raw += 25;
  } else if (hasIntro || hasConclusion) {
    score.raw += 13;
    if (!hasConclusion) suggestions.push('Add a clear conclusion section that summarizes your key findings');
    if (!hasIntro) suggestions.push('Begin with an introduction that provides context and states your purpose');
  } else {
    if (paragraphs.length >= 2) {
      score.raw += 8; // likely has implicit structure
      suggestions.push('Add explicit introduction and conclusion markers for better readability');
    } else {
      suggestions.push('Structure your paper with a clear introduction and conclusion');
    }
  }

  const finalScore = Math.round((score.raw / score.max) * 100);
  const feedback = foundTransitions.length >= 5 && paragraphs.length >= 4
    ? 'Well-organized with clear transitions and logical paragraph structure.'
    : foundTransitions.length >= 2 || paragraphs.length >= 3
      ? 'Basic structure is present but could benefit from more transitions between ideas.'
      : 'The paper needs better organization with clear transitions and paragraph breaks.';

  return {
    name: 'Organization',
    score: finalScore,
    status: classifyScore(finalScore),
    feedback,
    suggestions,
  };
}

// ──────────────────────────────────────────────
// Signal 4: Language
// ──────────────────────────────────────────────
function checkLanguage(text: string): SignalCheck {
  const words = getWords(text);
  const sentences = getSentences(text);
  const score: { raw: number; max: number } = { raw: 0, max: 0 };
  const suggestions: string[] = [];

  // Word choice variety (unique ratio) (25 pts)
  score.max += 25;
  const uniq = uniqueRatio(words);
  if (uniq >= 0.65) {
    score.raw += 25;
  } else if (uniq >= 0.5) {
    score.raw += 17;
  } else if (uniq >= 0.4) {
    score.raw += 10;
    suggestions.push('Increase vocabulary variety — avoid repeating the same words throughout');
  } else {
    score.raw += 5;
    suggestions.push('Your vocabulary is limited. Use a thesaurus to find alternative words and phrases');
  }

  // Sentence length variation (25 pts)
  score.max += 25;
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, l) => a + (l - mean) ** 2, 0) / lengths.length;
    const stddev = Math.sqrt(variance);
    // Coefficient of variation (relative variation)
    const cv = mean > 0 ? stddev / mean : 0;
    if (cv >= 0.35) {
      score.raw += 25;
    } else if (cv >= 0.2) {
      score.raw += 18;
    } else if (cv >= 0.1) {
      score.raw += 10;
      suggestions.push('Vary your sentence lengths — mix short, punchy sentences with longer, complex ones');
    } else {
      score.raw += 4;
      suggestions.push('Your sentences are all similar in length. Vary them for better readability and rhythm');
    }

    // Penalize overly long average
    if (mean > 30) {
      suggestions.push('Some sentences are too long — break them into shorter, clearer statements');
    }
    if (mean < 10 && sentences.length > 5) {
      suggestions.push('Your sentences are very short on average. Combine related ideas for smoother flow');
    }
  } else {
    score.raw += 10; // neutral for very short texts
  }

  // Academic tone (25 pts)
  score.max += 25;
  const academicPatterns = [
    /\b(thus|therefore|hence|consequently|furthermore|moreover|nevertheless|nonetheless|accordingly)\b/i,
    /\b(demonstrates?|indicates?|suggests?|reveals?|establishes?|corroborates?)\b/i,
    /\b(significant|substantial|considerable|notable|remarkable|profound)\b/i,
    /\b(analysis|framework|methodology|perspective|approach|concept|theory|paradigm)\b/i,
    /\b(examine|investigate|explore|evaluate|assess|analyze|scrutinize)\b/i,
    /\b(argue|contend|assert|maintain|propose|posit|postulate)\b/i,
  ];
  const academicMatches = academicPatterns.filter(rx => rx.test(text)).length;
  score.raw += Math.min(25, academicMatches * 5);
  if (academicMatches < 3) {
    suggestions.push('Use more academic language (e.g., "demonstrates", "furthermore", "significant")');
  }

  // Informal language penalty detection (25 pts)
  score.max += 25;
  const informalPatterns = [
    /\b(don't|can't|won't|isn't|aren't|wasn't|weren't|couldn't|shouldn't|wouldn't|haven't|hasn't)\b/i,
    /\b(gonna|wanna|gotta|kinda|sorta|dunno)\b/i,
    /\b(awesome|cool|nice|great|huge|super|really|very|totally|basically|obviously|stuff|things)\b/i,
    /\b(ok|okay|well|so|but|and|or)\s*(,|\s*$)/m, // trailing filler at sentence start
    /\b(lot|lots|a lot|tons)\b/i,
    /\b(good|bad|big|small|important)\b/i, // generic adjectives
    /\b(like)\b/i, // filler like
    /\b(you|your|we|our|us)\b/i, // second person
    /\b(!{2,})/, // multiple exclamation marks
  ];
  // For informal penalty, we don't subtract — we just don't award points
  const informalMatches = informalPatterns.filter(rx => rx.test(text)).length;
  if (informalMatches === 0) {
    score.raw += 25;
  } else if (informalMatches <= 2) {
    score.raw += 18;
  } else if (informalMatches <= 5) {
    score.raw += 10;
    suggestions.push('Replace some informal words with academic alternatives');
  } else {
    score.raw += 4;
    suggestions.push('Your tone is too informal. Avoid contractions, slang, and conversational phrases in academic writing');
  }

  const finalScore = Math.round((score.raw / score.max) * 100);
  const feedback = uniq >= 0.55 && academicMatches >= 4
    ? 'Strong academic language with good vocabulary variety and professional tone.'
    : uniq >= 0.45 || academicMatches >= 2
      ? 'Language is generally appropriate but could be more varied and academic in tone.'
      : 'Consider elevating your language — use academic vocabulary, vary sentence lengths, and maintain a formal tone.';

  return {
    name: 'Language',
    score: finalScore,
    status: classifyScore(finalScore),
    feedback,
    suggestions,
  };
}

// ──────────────────────────────────────────────
// Signal 5: Conclusion
// ──────────────────────────────────────────────
function checkConclusion(text: string): SignalCheck {
  const paragraphs = getParagraphs(text);
  const sentences = getSentences(text);
  const score: { raw: number; max: number } = { raw: 0, max: 0 };
  const suggestions: string[] = [];

  const lastPara = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1] : text;
  const lastSentences = lastPara.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 5);

  // Has conclusion indicators (25 pts)
  score.max += 25;
  const conclusionIndicators = [
    /\b(in\s+conclusion|to\s+conclude)\b/i,
    /\b(in\s+summary|to\s+summarize|to\s+sum\s+up)\b/i,
    /\b(all\s+in\s+all|overall|in\s+brief|in\s+short)\b/i,
    /\b(to\s+wrap\s+up|in\s+closing|finally|as\s+a\s+final\s+point)\b/i,
    /\b(the\s+findings?|this\s+(paper|essay|study|research|thesis)\s+(shows?|reveals?|demonstrates?|suggests?|indicates?|concludes?))\b/i,
    /\b(conclusion|concluding|summary)\b/i,
  ];
  const hasIndicator = conclusionIndicators.some(rx => rx.test(lastPara));
  if (hasIndicator) {
    score.raw += 25;
  } else {
    suggestions.push('Begin your conclusion with a clear indicator (e.g., "In conclusion," "To summarize,")');
  }

  // Summary / restatement of main points (25 pts)
  score.max += 25;
  const summaryPatterns = [
    /\b(summar\w*|restate|recap|review|reflect)\w*\b/i,
    /\b(has\s+shown|has\s+demonstrated|has\s+revealed|findings?\s+(show|indicate|suggest|reveal))\b/i,
    /\b(key\s+(finding|point|result|theme|argument|insight|takeaway))\b/i,
    /\b(main\s+(argument|point|finding|theme|result|conclusion|idea))\b/i,
    /\b(overall|in\s+general|broadly|taken\s+together|collectively)\b/i,
  ];
  const summaryMatches = summaryPatterns.filter(rx => rx.test(lastPara)).length;
  score.raw += Math.min(25, summaryMatches * 9);
  if (summaryMatches === 0) {
    suggestions.push('Summarize your key findings and main arguments in the conclusion');
  }

  // Conclusion is substantial (20 pts)
  score.max += 20;
  const conclusionWords = getWords(lastPara).length;
  if (conclusionWords >= 50) {
    score.raw += 20;
  } else if (conclusionWords >= 30) {
    score.raw += 12;
    suggestions.push('Expand your conclusion — aim for at least 50 words');
  } else if (conclusionWords >= 15) {
    score.raw += 6;
    suggestions.push('Your conclusion is too brief. Provide a more thorough summary and closing thoughts');
  } else {
    suggestions.push('Add a proper conclusion paragraph that summarizes your work');
  }

  // Forward-looking / implications (15 pts)
  score.max += 15;
  const forwardPatterns = [
    /\b(future\s+research|further\s+research|future\s+studies?|future\s+work)\b/i,
    /\b(implications?|recommendations?|suggestions?\s+for)\b/i,
    /\b(limitations?|caveats?|constraints?)\b/i,
    /\b(would\s+benefit|could\s+improve|should\s+consider|it\s+would\s+be)\b/i,
    /\b(remains?\s+to\s+be|open\s+question|merits?\s+further)\b/i,
  ];
  const hasForward = forwardPatterns.some(rx => rx.test(lastPara));
  if (hasForward) {
    score.raw += 15;
  } else {
    suggestions.push('Consider discussing implications, limitations, or future research directions');
  }

  // Not abruptly ending / not just last paragraph of body (15 pts)
  score.max += 15;
  const allParagraphsEndClean = paragraphs.every(p => {
    const trimmed = p.trim();
    return /[.!?\-:"']$/.test(trimmed);
  });
  if (allParagraphsEndClean && paragraphs.length >= 3) {
    score.raw += 15;
  } else if (allParagraphsEndClean) {
    score.raw += 10;
  } else {
    score.raw += 5;
    suggestions.push('Ensure all paragraphs end with proper punctuation and your conclusion provides closure');
  }

  const finalScore = Math.round((score.raw / score.max) * 100);
  const feedback = hasIndicator && conclusionWords >= 50
    ? 'Strong conclusion with clear summary and closure.'
    : hasIndicator || conclusionWords >= 30
      ? 'Conclusion is present but could be more comprehensive.'
      : 'Your paper needs a clear conclusion that summarizes main points and provides closure.';

  return {
    name: 'Conclusion',
    score: finalScore,
    status: classifyScore(finalScore),
    feedback,
    suggestions,
  };
}

// ──────────────────────────────────────────────
// Main Analysis
// ──────────────────────────────────────────────
export function analyzeRevision(input: RevisionAnalysisInput): RevisionResult {
  const { text, title } = input;

  if (text.trim().length < 20) {
    return {
      overallScore: 0,
      signals: [
        { name: 'Thesis Clarity', score: 0, status: 'needs_work', feedback: 'Not enough text to evaluate.', suggestions: ['Write at least 50 words for meaningful feedback.'] },
        { name: 'Evidence Quality', score: 0, status: 'needs_work', feedback: 'Not enough text to evaluate.', suggestions: ['Write at least 50 words for meaningful feedback.'] },
        { name: 'Organization', score: 0, status: 'needs_work', feedback: 'Not enough text to evaluate.', suggestions: ['Write at least 50 words for meaningful feedback.'] },
        { name: 'Language', score: 0, status: 'needs_work', feedback: 'Not enough text to evaluate.', suggestions: ['Write at least 50 words for meaningful feedback.'] },
        { name: 'Conclusion', score: 0, status: 'needs_work', feedback: 'Not enough text to evaluate.', suggestions: ['Write at least 50 words for meaningful feedback.'] },
      ],
      revisionPrompt: '',
    };
  }

  const signals: SignalCheck[] = [
    checkThesisClarity(text),
    checkEvidenceQuality(text),
    checkOrganization(text),
    checkLanguage(text),
    checkConclusion(text),
  ];

  const overallScore = Math.round(
    signals.reduce((sum, s) => sum + s.score, 0) / signals.length
  );

  // Build a heuristic revision prompt based on signals
  const revisionPrompt = buildRevisionPrompt(signals, title);

  return { overallScore, signals, revisionPrompt };
}

function buildRevisionPrompt(signals: SignalCheck[], title?: string): string {
  const weak = signals.filter(s => s.status === 'needs_work');
  const developing = signals.filter(s => s.status === 'developing');

  if (weak.length === 0 && developing.length === 0) {
    return `Great work on "${title || 'your paper'}"! Your writing demonstrates strong quality across all areas. Consider minor polishing for an even more polished final draft.`;
  }

  const areas: string[] = [];

  if (weak.some(s => s.name === 'Thesis Clarity') || developing.some(s => s.name === 'Thesis Clarity')) {
    areas.push('1) **Clarify your thesis** — Rewrite the first paragraph to explicitly state your main argument. Try: "This [paper/essay] argues that [your claim] because [reason 1], [reason 2], and [reason 3]."');
  }
  if (weak.some(s => s.name === 'Evidence Quality') || developing.some(s => s.name === 'Evidence Quality')) {
    areas.push('2) **Strengthen your evidence** — For each major claim, add at least one supporting citation or data point. Ask yourself: "What research or statistic backs this up?"');
  }
  if (weak.some(s => s.name === 'Organization') || developing.some(s => s.name === 'Organization')) {
    areas.push('3) **Improve organization** — Review paragraph transitions. Each paragraph should begin with a clear topic sentence that connects to your thesis. Use transition words (however, furthermore, in addition) between ideas.');
  }
  if (weak.some(s => s.name === 'Language') || developing.some(s => s.name === 'Language')) {
    areas.push('4) **Elevate your language** — Replace informal words with academic alternatives. Vary your sentence lengths (short for emphasis, long for complex ideas). Avoid contractions in academic writing.');
  }
  if (weak.some(s => s.name === 'Conclusion') || developing.some(s => s.name === 'Conclusion')) {
    areas.push('5) **Write a stronger conclusion** — Begin with "In conclusion" or "To summarize," restate your main findings, and discuss implications or future directions.');
  }

  return `Here is your guided revision plan for "${title || 'your paper'}":\n\n${areas.join('\n\n')}\n\nFocus on these areas one at a time. After revising, re-analyze your text to track improvement.`;
}
