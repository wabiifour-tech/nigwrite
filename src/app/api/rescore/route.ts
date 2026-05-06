/**
 * NigWrite - Re-score API
 * POST /api/rescore
 * Task ID: 1b
 *
 * Re-runs the winnowing engine with new exclusion settings WITHOUT re-doing web search.
 * Uses previously matched data (local corpus only) for fast re-scoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WinnowingEngine, type ExclusionSettings, DEFAULT_EXCLUSION_SETTINGS, type CorpusMatchEntry } from '@/lib/winnowing-engine';
import { getPersistentFingerprintStore, type FingerprintEntry } from '@/lib/persistent-fingerprint-store';

/**
 * Convert FingerprintEntry[] to CorpusMatchEntry[] for the engine.
 */
function toCorpusMatchEntries(entries: FingerprintEntry[]): CorpusMatchEntry[] {
  return entries.map(e => ({
    documentId: e.documentId,
    ngram: e.ngram,
    sourceTitle: e.sourceTitle,
    sourceUrl: e.sourceUrl,
    sourceType: e.sourceType,
    position: e.position,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      documentId,
      content,
      exclusionSettings,
      excludedSourceIds,
      sourceTypeExclusions,
    } = body as {
      documentId: string;
      content: string;
      exclusionSettings?: Partial<ExclusionSettings>;
      excludedSourceIds?: string[];
      sourceTypeExclusions?: Array<'internet' | 'publication' | 'student_paper'>;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document content is required' },
        { status: 400 }
      );
    }

    const winnowing = new WinnowingEngine();
    const store = await getPersistentFingerprintStore();

    // Apply exclusion settings
    const settings: ExclusionSettings = {
      ...DEFAULT_EXCLUSION_SETTINGS,
      ...exclusionSettings,
    };

    // Step 1: Clean text and generate fingerprints
    const { cleanedText, excludedWordCount } = winnowing.applyExclusions(content, settings);
    const fingerprints = winnowing.generateFingerprints(cleanedText);

    // Step 2: Search local corpus only (NO web search for speed)
    const corpusMatchMap = await store.search(fingerprints.map(fp => fp.hash));

    // Build the combined matches map
    const combinedMatches = new Map<number, CorpusMatchEntry[]>();
    for (const [hash, entries] of corpusMatchMap) {
      combinedMatches.set(hash, toCorpusMatchEntries(entries));
    }

    // Step 3: Run full scan with exclusions
    const scanResult = winnowing.runFullScan(content, combinedMatches, settings);

    // Step 4: Filter out excluded source IDs
    const excludedIds = new Set(excludedSourceIds || []);
    const excludedTypes = new Set(sourceTypeExclusions || []);

    // Filter matchRegions
    const filteredRegions = scanResult.matchRegions.filter(r =>
      !excludedIds.has(r.sourceId) && !excludedTypes.has(r.sourceType)
    );

    // Filter sourceBreakdown
    const filteredSourceBreakdown = scanResult.sourceBreakdown.filter(s =>
      !excludedIds.has(s.sourceId) && !excludedTypes.has(s.sourceType)
    );

    // Recalculate scores based on filtered regions
    const filteredMatchedWords = new Set<number>();
    for (const region of filteredRegions) {
      for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
        filteredMatchedWords.add(w);
      }
    }

    const totalWords = scanResult.totalWords;
    const matchedWords = filteredMatchedWords.size;
    const overallSimilarity = totalWords > 0
      ? Math.round((matchedWords / totalWords) * 100)
      : 0;

    // Recalculate source type breakdown
    const internetWords = new Set<number>();
    const publicationWords = new Set<number>();
    const studentPaperWords = new Set<number>();
    const internetSourceIds = new Set<string>();
    const publicationSourceIds = new Set<string>();
    const studentPaperSourceIds = new Set<string>();

    for (const source of filteredSourceBreakdown) {
      const wordSet = new Set<number>();
      for (const region of source.regions) {
        for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
          wordSet.add(w);
        }
      }

      switch (source.sourceType) {
        case 'internet':
          for (const w of wordSet) internetWords.add(w);
          internetSourceIds.add(source.sourceId);
          break;
        case 'publication':
          for (const w of wordSet) publicationWords.add(w);
          publicationSourceIds.add(source.sourceId);
          break;
        case 'student_paper':
          for (const w of wordSet) studentPaperWords.add(w);
          studentPaperSourceIds.add(source.sourceId);
          break;
      }
    }

    const base = matchedWords > 0 ? matchedWords : 1;

    // Identify primary sources (top 3 by matched words)
    const primarySourceIds = new Set<string>();
    const sortedSources = [...filteredSourceBreakdown].sort((a, b) => b.matchedWords - a.matchedWords);
    const primaryCount = Math.min(3, sortedSources.length);
    const primaryWordSet = new Set<number>();

    for (let i = 0; i < primaryCount; i++) {
      if (sortedSources[i] && sortedSources[i].matchedWords > 0) {
        primarySourceIds.add(sortedSources[i].sourceId);
        for (const region of sortedSources[i].regions) {
          for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
            primaryWordSet.add(w);
          }
        }
      }
    }

    const sourceTypeBreakdown = {
      internet: {
        matchedWords: internetWords.size,
        percentage: Math.round((internetWords.size / base) * 100 * 10) / 10,
        sourceCount: internetSourceIds.size,
      },
      publications: {
        matchedWords: publicationWords.size,
        percentage: Math.round((publicationWords.size / base) * 100 * 10) / 10,
        sourceCount: publicationSourceIds.size,
      },
      studentPapers: {
        matchedWords: studentPaperWords.size,
        percentage: Math.round((studentPaperWords.size / base) * 100 * 10) / 10,
        sourceCount: studentPaperSourceIds.size,
      },
      primarySources: {
        matchedWords: primaryWordSet.size,
        percentage: totalWords > 0
          ? Math.round((primaryWordSet.size / totalWords) * 100 * 10) / 10
          : 0,
        sourceCount: primaryCount,
      },
    };

    // Filter and tag primary sources
    const taggedSourceBreakdown = filteredSourceBreakdown.map(sb => ({
      ...sb,
      isPrimary: primarySourceIds.has(sb.sourceId),
    }));

    const taggedRegions = filteredRegions.map(r => ({
      ...r,
      isPrimary: primarySourceIds.has(r.sourceId),
    }));

    const primarySources = sortedSources.slice(0, primaryCount).map(ps => ({
      sourceId: ps.sourceId,
      sourceTitle: ps.sourceTitle,
      sourceType: ps.sourceType,
      sourceUrl: ps.sourceUrl,
      matchCount: ps.matchCount,
      matchedWords: ps.matchedWords,
      percentageOfDocument: ps.percentageOfDocument,
      isPrimary: true,
    }));

    // Build backward-compatible matches
    const matches = taggedRegions.map(r => ({
      text: r.text,
      sourceTitle: r.sourceTitle,
      sourceUrl: r.sourceUrl,
      similarityContribution: totalWords > 0
        ? Math.round((r.wordCount / totalWords) * 100 * 10) / 10
        : 0,
    }));

    // Build flagged segments
    const flaggedSegments = taggedRegions.map(r => r.text);

    return NextResponse.json({
      success: true,
      data: {
        similarityScore: Math.min(overallSimilarity, 100),
        totalWords,
        matchedWords,
        excludedWords: scanResult.excludedWords,
        sourceBreakdown: taggedSourceBreakdown,
        matchRegions: taggedRegions,
        sourceTypeBreakdown,
        primarySources,
        flaggedSegments,
        matches,
        totalFingerprints: fingerprints.length,
        matchingFingerprints: matches.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Re-score failed';
    console.error('[NigWrite] Rescore error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
