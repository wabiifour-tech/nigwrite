/**
 * NigWrite - Grade Calculator Utilities
 * Calculates letter grades and weighted rubric scores
 */

export function calculateLetterGrade(numericGrade: number, scale: string): string {
  const clamped = Math.max(0, Math.min(100, numericGrade));

  if (scale === 'A-F' || scale === 'a-f') {
    if (clamped >= 93) return 'A';
    if (clamped >= 90) return 'A-';
    if (clamped >= 87) return 'B+';
    if (clamped >= 83) return 'B';
    if (clamped >= 80) return 'B-';
    if (clamped >= 77) return 'C+';
    if (clamped >= 73) return 'C';
    if (clamped >= 70) return 'C-';
    if (clamped >= 67) return 'D+';
    if (clamped >= 63) return 'D';
    if (clamped >= 60) return 'D-';
    return 'F';
  }

  if (scale === '1-5') {
    const mapped = Math.round((clamped / 100) * 5 * 10) / 10;
    return mapped.toFixed(1);
  }

  // Default: 0-100 scale with letter grade mapping
  if (clamped >= 90) return 'A';
  if (clamped >= 80) return 'B';
  if (clamped >= 70) return 'C';
  if (clamped >= 60) return 'D';
  return 'F';
}

export function calculateWeightedRubricScore(
  scores: Array<{ score: number; maxScore: number; weight: number }>
): { total: number; maxTotal: number; percentage: number } {
  if (scores.length === 0) {
    return { total: 0, maxTotal: 0, percentage: 0 };
  }

  let totalWeightedScore = 0;
  let totalWeightedMax = 0;

  for (const s of scores) {
    const normalizedScore = s.maxScore > 0 ? (s.score / s.maxScore) * 10 : 0;
    totalWeightedScore += normalizedScore * s.weight;
    totalWeightedMax += 10 * s.weight;
  }

  const percentage = totalWeightedMax > 0 ? Math.round((totalWeightedScore / totalWeightedMax) * 100) : 0;

  return {
    total: Math.round(totalWeightedScore * 10) / 10,
    maxTotal: Math.round(totalWeightedMax * 10) / 10,
    percentage,
  };
}
