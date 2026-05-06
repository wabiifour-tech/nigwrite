/**
 * NigWrite - Submission Diff API
 * GET /api/submissions/diff?version1Id=xxx&version2Id=xxx — Get text diff between two versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const version1Id = searchParams.get('version1Id');
    const version2Id = searchParams.get('version2Id');

    if (!version1Id || !version2Id) {
      return NextResponse.json(
        { error: 'version1Id and version2Id query parameters are required' },
        { status: 400 }
      );
    }

    if (version1Id === version2Id) {
      return NextResponse.json(
        { error: 'version1Id and version2Id must be different' },
        { status: 400 }
      );
    }

    // Fetch both submissions with their document content
    const [v1, v2] = await Promise.all([
      db.submission.findUnique({
        where: { id: version1Id },
        include: { document: { select: { contentBody: true, title: true } } },
      }),
      db.submission.findUnique({
        where: { id: version2Id },
        include: { document: { select: { contentBody: true, title: true } } },
      }),
    ]);

    if (!v1 || !v2) {
      return NextResponse.json({ error: 'One or both submissions not found' }, { status: 404 });
    }

    const text1 = v1.document.contentBody;
    const text2 = v2.document.contentBody;

    const diff = computeWordDiff(text1, text2);

    return NextResponse.json({
      success: true,
      data: {
        version1: { id: v1.id, title: v1.document.title },
        version2: { id: v2.id, title: v2.document.title },
        ...diff,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to compute diff';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

function computeWordDiff(text1: string, text2: string) {
  const words1 = text1.split(/(\s+)/).filter(w => w.length > 0);
  const words2 = text2.split(/(\s+)/).filter(w => w.length > 0);

  // Use LCS-based diff algorithm
  const lcs = computeLCS(words1, words2);

  // Build diff segments
  const segments: DiffSegment[] = [];
  let i = 0, j = 0, k = 0;

  while (i < words1.length || j < words2.length) {
    if (k < lcs.length && i < words1.length && j < words2.length &&
        words1[i] === lcs[k] && words2[j] === lcs[k]) {
      segments.push({ type: 'unchanged', text: words1[i] });
      i++; j++; k++;
    } else if (k < lcs.length && j < words2.length && words2[j] === lcs[k]) {
      // words1[i] is removed
      const removedWords: string[] = [];
      while (i < words1.length && (k >= lcs.length || words1[i] !== lcs[k])) {
        removedWords.push(words1[i]);
        i++;
      }
      segments.push({ type: 'removed', text: removedWords.join('') });
    } else if (k < lcs.length && i < words1.length && words1[i] === lcs[k]) {
      // words2[j] is added
      const addedWords: string[] = [];
      while (j < words2.length && (k >= lcs.length || words2[j] !== lcs[k])) {
        addedWords.push(words2[j]);
        j++;
      }
      segments.push({ type: 'added', text: addedWords.join('') });
    } else {
      // Remaining: handle remaining removals and additions
      if (i < words1.length) {
        const removedWords: string[] = [];
        while (i < words1.length) {
          removedWords.push(words1[i]);
          i++;
        }
        segments.push({ type: 'removed', text: removedWords.join('') });
      }
      if (j < words2.length) {
        const addedWords: string[] = [];
        while (j < words2.length) {
          addedWords.push(words2[j]);
          j++;
        }
        segments.push({ type: 'added', text: addedWords.join('') });
      }
      break;
    }
  }

  // Compute stats
  const additions = segments.filter(s => s.type === 'added').map(s => s.text);
  const deletions = segments.filter(s => s.type === 'removed').map(s => s.text);
  const unchanged = segments.filter(s => s.type === 'unchanged').map(s => s.text);

  const addedWordCount = additions.join('').split(/\s+/).filter(w => w.length > 0).length;
  const removedWordCount = deletions.join('').split(/\s+/).filter(w => w.length > 0).length;
  const unchangedWordCount = unchanged.join('').split(/\s+/).filter(w => w.length > 0).length;

  return {
    additions,
    deletions,
    unchanged,
    segments,
    stats: {
      added: addedWordCount,
      removed: removedWordCount,
      unchanged: unchangedWordCount,
    },
  };
}

// Simple LCS computation (optimized for typical document sizes)
function computeLCS(a: string[], b: string[]): string[] {
  const MAX_LEN = 5000;
  const sliceA = a.length > MAX_LEN ? a.slice(0, MAX_LEN) : a;
  const sliceB = b.length > MAX_LEN ? b.slice(0, MAX_LEN) : b;

  const m = sliceA.length;
  const n = sliceB.length;

  // For large documents, use a simpler approach
  if (m * n > 10_000_000) {
    return computeLCSFast(sliceA, sliceB);
  }

  // Standard DP approach
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (sliceA[i - 1] === sliceB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (sliceA[i - 1] === sliceB[j - 1]) {
      lcs.unshift(sliceA[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// Faster LCS for very large documents (hash-based)
function computeLCSFast(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return a.filter(token => bSet.has(token));
}
