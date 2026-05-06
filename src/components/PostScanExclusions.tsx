/**
 * NigWrite - Post-Scan Exclusion Controls
 * Task ID: 1b
 *
 * Allows users to modify exclusion settings AFTER a scan has been completed
 * and dynamically re-calculate the score.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  RefreshCw,
  Globe,
  BookOpen,
  GraduationCap,
  FileText,
  TextQuote,
  BookMarked,
  Quote,
  Loader2,
  Ban,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ExclusionSettingsData {
  excludeQuotes: boolean;
  excludeBibliography: boolean;
  excludeCitations: boolean;
  excludeInternetSources: boolean;
  excludePublications: boolean;
  excludeStudentPapers: boolean;
  excludeSmallMatches: number;
}

export interface SourceInfo {
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  percentageOfDocument: number;
  matchedWords: number;
  matchCount: number;
}

export interface RescoreResult {
  similarityScore: number;
  totalWords: number;
  matchedWords: number;
  excludedWords: number;
  sourceBreakdown: SourceInfo[];
  matchRegions: Array<{
    startWordIndex: number;
    endWordIndex: number;
    text: string;
    sourceId: string;
    sourceTitle: string;
    sourceType: 'internet' | 'publication' | 'student_paper';
    sourceUrl?: string;
    wordCount: number;
    isPrimary?: boolean;
  }>;
  sourceTypeBreakdown: {
    internet: { matchedWords: number; percentage: number; sourceCount: number };
    publications: { matchedWords: number; percentage: number; sourceCount: number };
    studentPapers: { matchedWords: number; percentage: number; sourceCount: number };
    primarySources: { matchedWords: number; percentage: number; sourceCount: number };
  };
  primarySources: SourceInfo[];
  flaggedSegments: string[];
  matches: Array<{
    text: string;
    sourceTitle: string;
    sourceUrl?: string;
    contribution: number;
  }>;
  totalFingerprints: number;
  matchingFingerprints: number;
}

export interface PostScanExclusionsProps {
  currentExclusions: ExclusionSettingsData;
  onExclusionsChange: (newExclusions: ExclusionSettingsData) => void;
  onRescore: (result: RescoreResult) => void;
  documentId: string;
  originalContent: string;
  sources: SourceInfo[];
  originalScore: number;
}

export const DEFAULT_EXCLUSION_SETTINGS: ExclusionSettingsData = {
  excludeQuotes: true,
  excludeBibliography: true,
  excludeCitations: true,
  excludeInternetSources: false,
  excludePublications: false,
  excludeStudentPapers: false,
  excludeSmallMatches: 0,
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function PostScanExclusions({
  currentExclusions,
  onExclusionsChange,
  onRescore,
  documentId,
  originalContent,
  sources,
  originalScore,
}: PostScanExclusionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [excludedSourceIds, setExcludedSourceIds] = useState<Set<string>>(new Set());
  const [rescoreResult, setRescoreResult] = useState<RescoreResult | null>(null);
  const [rescoreError, setRescoreError] = useState<string | null>(null);

  // Update a single exclusion setting
  const updateSetting = useCallback(<K extends keyof ExclusionSettingsData>(
    key: K,
    value: ExclusionSettingsData[K],
  ) => {
    const updated = { ...currentExclusions, [key]: value };
    onExclusionsChange(updated);
  }, [currentExclusions, onExclusionsChange]);

  // Toggle a source exclusion
  const toggleSourceExclusion = useCallback((sourceId: string) => {
    setExcludedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  // Exclude all sources
  const excludeAllSources = useCallback(() => {
    setExcludedSourceIds(new Set(sources.map(s => s.sourceId)));
  }, [sources]);

  // Include all sources
  const includeAllSources = useCallback(() => {
    setExcludedSourceIds(new Set());
  }, []);

  // Handle re-score
  const handleRescore = useCallback(async () => {
    setIsRescoring(true);
    setRescoreError(null);
    setRescoreResult(null);

    try {
      const response = await fetch('/api/rescore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          content: originalContent,
          exclusionSettings: {
            excludeQuotes: currentExclusions.excludeQuotes,
            excludeBibliography: currentExclusions.excludeBibliography,
            excludeCitations: currentExclusions.excludeCitations,
            excludeSmallMatches: currentExclusions.excludeSmallMatches,
          },
          excludedSourceIds: Array.from(excludedSourceIds),
          sourceTypeExclusions: [
            ...(currentExclusions.excludeInternetSources ? ['internet'] as const : []),
            ...(currentExclusions.excludePublications ? ['publication'] as const : []),
            ...(currentExclusions.excludeStudentPapers ? ['student_paper'] as const : []),
          ],
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setRescoreResult(result.data);
        onRescore(result.data);
      } else {
        setRescoreError(result.error || 'Re-score failed. Please try again.');
      }
    } catch {
      setRescoreError('Network error. Please check your connection and try again.');
    } finally {
      setIsRescoring(false);
    }
  }, [documentId, originalContent, currentExclusions, excludedSourceIds, onRescore]);

  const newScore = rescoreResult?.similarityScore ?? null;
  const scoreDiff = newScore !== null ? newScore - originalScore : null;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filter &amp; Exclude</span>
          {excludedSourceIds.size > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
              {excludedSourceIds.size} excluded
            </Badge>
          )}
          {newScore !== null && (
            <Badge
              variant="outline"
              className={`text-xs ${
                scoreDiff !== null && scoreDiff < 0
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                  : scoreDiff !== null && scoreDiff > 0
                    ? 'border-red-300 text-red-700 bg-red-50'
                    : 'border-gray-300 text-gray-600 bg-gray-50'
              }`}
            >
              Updated: {newScore}%
              {scoreDiff !== null && scoreDiff !== 0 && (
                <span className="ml-1">
                  ({scoreDiff > 0 ? '+' : ''}{scoreDiff}%)
                </span>
              )}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
          <div className="space-y-4 pt-4">
            {/* Text exclusion toggles */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text Exclusions</p>

              {/* Exclude quoted text */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <TextQuote className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Exclude quoted text</label>
                    <p className="text-xs text-muted-foreground">Remove text within quotation marks</p>
                  </div>
                </div>
                <Switch
                  checked={currentExclusions.excludeQuotes}
                  onCheckedChange={(checked) => updateSetting('excludeQuotes', checked)}
                />
              </div>

              {/* Exclude bibliography */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <BookMarked className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Exclude bibliography</label>
                    <p className="text-xs text-muted-foreground">Skip references and works cited</p>
                  </div>
                </div>
                <Switch
                  checked={currentExclusions.excludeBibliography}
                  onCheckedChange={(checked) => updateSetting('excludeBibliography', checked)}
                />
              </div>

              {/* Exclude citations */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <Quote className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Exclude citations</label>
                    <p className="text-xs text-muted-foreground">Remove APA, MLA, IEEE citations</p>
                  </div>
                </div>
                <Switch
                  checked={currentExclusions.excludeCitations}
                  onCheckedChange={(checked) => updateSetting('excludeCitations', checked)}
                />
              </div>
            </div>

            {/* Source type exclusions */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Type Filters</p>

              {/* Exclude Internet Sources */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Exclude Internet Sources</label>
                    <p className="text-xs text-muted-foreground">Remove matches from web sources</p>
                  </div>
                </div>
                <Switch
                  checked={currentExclusions.excludeInternetSources}
                  onCheckedChange={(checked) => updateSetting('excludeInternetSources', checked)}
                />
              </div>

              {/* Exclude Publications */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Exclude Publications</label>
                    <p className="text-xs text-muted-foreground">Remove matches from academic publications</p>
                  </div>
                </div>
                <Switch
                  checked={currentExclusions.excludePublications}
                  onCheckedChange={(checked) => updateSetting('excludePublications', checked)}
                />
              </div>

              {/* Exclude Student Papers */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Exclude Student Papers</label>
                    <p className="text-xs text-muted-foreground">Remove matches from student submissions</p>
                  </div>
                </div>
                <Switch
                  checked={currentExclusions.excludeStudentPapers}
                  onCheckedChange={(checked) => updateSetting('excludeStudentPapers', checked)}
                />
              </div>
            </div>

            {/* Minimum match size slider */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Minimum match size</label>
                    <p className="text-xs text-muted-foreground">Ignore matches shorter than this word count</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#008751] bg-[#008751]/10 px-2.5 py-0.5 rounded-md">
                  {currentExclusions.excludeSmallMatches} words
                </span>
              </div>
              <Slider
                value={[currentExclusions.excludeSmallMatches]}
                onValueChange={([val]) => updateSetting('excludeSmallMatches', val)}
                min={0}
                max={50}
                step={1}
                className="mt-1"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">0 (all matches)</span>
                <span className="text-[10px] text-muted-foreground">50 words</span>
              </div>
            </div>

            {/* Exclude Specific Sources */}
            {sources.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Exclude Specific Sources
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={excludeAllSources}
                    >
                      Exclude all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={includeAllSources}
                    >
                      Include all
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {sources.map((source) => {
                    const isExcluded = excludedSourceIds.has(source.sourceId);
                    return (
                      <div
                        key={source.sourceId}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isExcluded ? 'bg-red-50/50 opacity-60' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isExcluded ? 'line-through' : ''}`}>
                            {source.sourceTitle}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {source.matchedWords} words
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {source.percentageOfDocument}%
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleSourceExclusion(source.sourceId)}
                          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            isExcluded
                              ? 'bg-red-100 text-red-600 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                          }`}
                          title={isExcluded ? 'Include this source' : 'Exclude this source'}
                        >
                          {isExcluded ? (
                            <Ban className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {excludedSourceIds.size > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {excludedSourceIds.size} of {sources.length} sources excluded
                  </p>
                )}
              </div>
            )}

            {/* Re-score button */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRescore}
                  disabled={isRescoring}
                  className="gap-2 bg-[#008751] hover:bg-[#006b40] flex-1 sm:flex-none"
                >
                  {isRescoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Re-scoring...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Re-score with New Settings
                    </>
                  )}
                </Button>

                {/* Score comparison */}
                {newScore !== null && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Original</p>
                      <p className="text-sm font-bold text-gray-600">{originalScore}%</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">New</p>
                      <p className={`text-sm font-bold ${
                        scoreDiff !== null && scoreDiff < 0
                          ? 'text-emerald-600'
                          : scoreDiff !== null && scoreDiff > 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }`}>
                        {newScore}%
                      </p>
                    </div>
                    {scoreDiff !== null && scoreDiff !== 0 && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          scoreDiff < 0
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                            : 'border-red-300 text-red-700 bg-red-50'
                        }`}
                      >
                        {scoreDiff < 0 ? '↓' : '↑'} {Math.abs(scoreDiff)}%
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Error display */}
              {rescoreError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{rescoreError}</p>
                </div>
              )}

              {/* Success display */}
              {rescoreResult && !isRescoring && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700">
                    Score updated to {rescoreResult.similarityScore}%
                    {' '}(from {originalScore}%)
                    {' '}— {rescoreResult.matchedWords} words matched across {rescoreResult.sourceBreakdown.length} sources
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
