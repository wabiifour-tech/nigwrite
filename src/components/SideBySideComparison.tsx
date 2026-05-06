/**
 * NigWrite - Side-by-Side Source Comparison View (Turnitin-style)
 * Task ID: 1b
 *
 * Split-pane view showing the student's submitted text on the LEFT
 * and the matched source content on the RIGHT, with synchronized highlighting.
 */

'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  BookOpen,
  GraduationCap,
  FileText,
  Star,
  X,
  ChevronRight,
  Columns,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface MatchRegion {
  startWordIndex: number;
  endWordIndex: number;
  text: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  wordCount: number;
  isPrimary?: boolean;
}

export interface SourceBreakdown {
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  matchCount: number;
  matchedWords: number;
  percentageOfDocument: number;
  isPrimary?: boolean;
  regions: MatchRegion[];
}

export interface SideBySideProps {
  documentContent: string;
  matchRegions: MatchRegion[];
  sourceBreakdown: SourceBreakdown[];
  selectedSourceId?: string;
  onBack: () => void;
}

// ──────────────────────────────────────────────
// Color Palette (matches PlagiarismReport)
// ──────────────────────────────────────────────

const SOURCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D2B4DE',
  '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5DBDB', '#EDBB99',
];

function getSourceColor(sourceId: string): string {
  let hash = 0;
  for (let i = 0; i < sourceId.length; i++) {
    hash = sourceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SOURCE_COLORS[Math.abs(hash) % SOURCE_COLORS.length];
}

function getSourceTypeIcon(type: string) {
  switch (type) {
    case 'internet': return <Globe className="h-3.5 w-3.5" />;
    case 'publication': return <BookOpen className="h-3.5 w-3.5" />;
    case 'student_paper': return <GraduationCap className="h-3.5 w-3.5" />;
    default: return <FileText className="h-3.5 w-3.5" />;
  }
}

function getSourceTypeLabel(type: string): string {
  switch (type) {
    case 'internet': return 'Internet';
    case 'publication': return 'Publication';
    case 'student_paper': return 'Student Paper';
    default: return 'Source';
  }
}

// ──────────────────────────────────────────────
// Highlighted text segment type
// ──────────────────────────────────────────────

interface TextSegment {
  text: string;
  highlighted: boolean;
  color: string;
  regionIndex?: number;
}

// ──────────────────────────────────────────────
// Panel Segment: A section of text in one panel
// ──────────────────────────────────────────────

interface PanelSegment {
  segments: TextSegment[];
  regionInfo?: {
    regionIndex: number;
    wordCount: number;
    startWordIndex: number;
    endWordIndex: number;
  };
}

// ──────────────────────────────────────────────
// Build document segments for left panel (student text)
// ──────────────────────────────────────────────

function buildStudentSegments(
  documentContent: string,
  regions: MatchRegion[],
): { paragraphs: TextSegment[][] } {
  if (!documentContent || regions.length === 0) {
    const lines = (documentContent || 'No document content available.').split('\n');
    return { paragraphs: lines.map(l => [{ text: l || ' ', highlighted: false, color: '' }]) };
  }

  const normalized = documentContent
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ').filter(w => w.length > 0);

  // Map word index to region
  const wordToRegion = new Map<number, number>(); // wordIndex → regionIndex
  regions.forEach((region, ri) => {
    for (let w = region.startWordIndex; w <= region.endWordIndex && w < words.length; w++) {
      if (!wordToRegion.has(w)) wordToRegion.set(w, ri);
    }
  });

  // Build segments
  const allSegments: TextSegment[] = [];
  let currentText = '';
  let currentHighlighted = false;
  let currentRegionIdx = -1;

  for (let i = 0; i < words.length; i++) {
    const ri = wordToRegion.get(i);
    const isHighlighted = ri !== undefined;

    if (isHighlighted !== currentHighlighted || (isHighlighted && ri !== currentRegionIdx)) {
      if (currentText) {
        allSegments.push({
          text: currentText.trim(),
          highlighted: currentHighlighted,
          color: currentRegionIdx >= 0 ? getSourceColor(regions[currentRegionIdx].sourceId) : '',
          regionIndex: currentRegionIdx >= 0 ? currentRegionIdx : undefined,
        });
      }
      currentText = '';
      currentHighlighted = isHighlighted;
      currentRegionIdx = ri ?? -1;
    }
    currentText += (currentText ? ' ' : '') + words[i];
  }

  if (currentText) {
    allSegments.push({
      text: currentText.trim(),
      highlighted: currentHighlighted,
      color: currentRegionIdx >= 0 ? getSourceColor(regions[currentRegionIdx].sourceId) : '',
      regionIndex: currentRegionIdx >= 0 ? currentRegionIdx : undefined,
    });
  }

  // Group into paragraphs (~20 words each)
  const paragraphs: TextSegment[][] = [];
  let group: TextSegment[] = [];
  let wc = 0;

  for (const seg of allSegments) {
    const sw = seg.text.split(/\s+/).filter(w => w.length > 0).length;
    if (wc + sw > 20 && group.length > 0) {
      paragraphs.push(group);
      group = [];
      wc = 0;
    }
    group.push(seg);
    wc += sw;
  }
  if (group.length > 0) paragraphs.push(group);

  return { paragraphs };
}

// ──────────────────────────────────────────────
// Build source segments for right panel
// ──────────────────────────────────────────────

function buildSourceContent(regions: MatchRegion[]): { paragraphs: PanelSegment[] } {
  if (regions.length === 0) {
    return { paragraphs: [] };
  }

  const segments: PanelSegment[] = [];

  for (let ri = 0; ri < regions.length; ri++) {
    const region = regions[ri];
    if (!region.text) continue;

    // Add a matched segment
    segments.push({
      segments: [{
        text: region.text,
        highlighted: true,
        color: getSourceColor(region.sourceId),
        regionIndex: ri,
      }],
      regionInfo: {
        regionIndex: ri,
        wordCount: region.wordCount,
        startWordIndex: region.startWordIndex,
        endWordIndex: region.endWordIndex,
      },
    });

    // Add separator (unmatched context)
    if (ri < regions.length - 1) {
      segments.push({
        segments: [{
          text: ' · · · ',
          highlighted: false,
          color: '',
        }],
      });
    }
  }

  return { paragraphs: segments };
}

// ──────────────────────────────────────────────
// Synchronized scroll hook
// ──────────────────────────────────────────────

function useSynchronizedScroll(
  leftRef: React.RefObject<HTMLDivElement | null>,
  rightRef: React.RefObject<HTMLDivElement | null>,
) {
  const isScrollingLeft = useRef(false);
  const isScrollingRight = useRef(false);

  useEffect(() => {
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!leftEl || !rightEl) return;

    const handleLeftScroll = () => {
      if (isScrollingRight.current) return;
      isScrollingLeft.current = true;
      const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
      const rightMax = rightEl.scrollHeight - rightEl.clientHeight;
      if (leftMax > 0) {
        const ratio = leftEl.scrollTop / leftMax;
        rightEl.scrollTop = ratio * rightMax;
      }
      requestAnimationFrame(() => { isScrollingLeft.current = false; });
    };

    const handleRightScroll = () => {
      if (isScrollingLeft.current) return;
      isScrollingRight.current = true;
      const rightMax = rightEl.scrollHeight - rightEl.clientHeight;
      const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
      if (rightMax > 0) {
        const ratio = rightEl.scrollTop / rightMax;
        leftEl.scrollTop = ratio * leftMax;
      }
      requestAnimationFrame(() => { isScrollingRight.current = false; });
    };

    leftEl.addEventListener('scroll', handleLeftScroll, { passive: true });
    rightEl.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll);
      rightEl.removeEventListener('scroll', handleRightScroll);
    };
  }, [leftRef, rightRef]);
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function SideBySideComparison({
  documentContent,
  matchRegions,
  sourceBreakdown,
  selectedSourceId: initialSourceId,
  onBack,
}: SideBySideProps) {
  const [activeSourceId, setActiveSourceId] = useState<string | null>(initialSourceId || null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  // Synchronized scrolling
  useSynchronizedScroll(leftScrollRef, rightScrollRef);

  // Get regions for the active source
  const activeRegions = useMemo(() => {
    if (!activeSourceId) return matchRegions.slice(0, 10);
    return matchRegions.filter(r => r.sourceId === activeSourceId);
  }, [matchRegions, activeSourceId]);

  // Get source breakdown for active source
  const activeSource = useMemo(() => {
    if (!activeSourceId) return null;
    return sourceBreakdown.find(s => s.sourceId === activeSourceId) || null;
  }, [sourceBreakdown, activeSourceId]);

  // Build student text segments
  const { paragraphs: studentParagraphs } = useMemo(() => {
    return buildStudentSegments(documentContent, activeRegions);
  }, [documentContent, activeRegions]);

  // Build source content segments
  const { paragraphs: sourceParagraphs } = useMemo(() => {
    return buildSourceContent(activeRegions);
  }, [activeRegions]);

  // Auto-select first source if none selected
  useEffect(() => {
    if (!activeSourceId && sourceBreakdown.length > 0) {
      const timer = setTimeout(() => {
        setActiveSourceId(sourceBreakdown[0].sourceId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSourceId, sourceBreakdown]);

  const highlightColor = activeSourceId ? getSourceColor(activeSourceId) : '#FF6B6B';

  // Calculate match percentage of source
  const sourceMatchPct = useMemo(() => {
    if (!activeSource || !documentContent) return 0;
    const docWords = documentContent.split(/\s+/).filter(w => w.length > 0).length;
    if (docWords === 0) return 0;
    return Math.round((activeSource.matchedWords / docWords) * 100 * 10) / 10;
  }, [activeSource, documentContent]);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Report
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-[#008751]" />
            <span className="text-sm font-semibold">Source Comparison</span>
          </div>
        </div>

        {activeSource && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-[#008751] text-[#008751]">
              Match: {sourceMatchPct}% of document
            </Badge>
            {activeSource.sourceUrl && (
              <a
                href={activeSource.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#008751] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Source Selector ── */}
      {sourceBreakdown.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Compare with:</span>
              {sourceBreakdown.map((source) => {
                const isActive = activeSourceId === source.sourceId;
                const color = getSourceColor(source.sourceId);
                return (
                  <button
                    key={source.sourceId}
                    onClick={() => setActiveSourceId(source.sourceId)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? 'shadow-sm ring-1'
                        : 'border-transparent hover:bg-white hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: isActive ? color + '15' : undefined,
                      borderColor: isActive ? color : undefined,
                      color: isActive ? color : '#6b7280',
                    }}
                  >
                    {getSourceTypeIcon(source.sourceType)}
                    <span className="truncate max-w-[120px]">{source.sourceTitle}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                      style={{ backgroundColor: color + '20', color: color }}
                    >
                      {source.percentageOfDocument}%
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Source metadata header ── */}
      {activeSource && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="w-1.5 h-8 rounded-full shrink-0"
                style={{ backgroundColor: highlightColor }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">{activeSource.sourceTitle}</h3>
                  {activeSource.isPrimary && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" fill="currentColor" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Primary Source</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getSourceTypeIcon(activeSource.sourceType)}
                    {getSourceTypeLabel(activeSource.sourceType)}
                  </span>
                  <span>{activeSource.matchCount} match regions</span>
                  <span>{activeSource.matchedWords} matched words</span>
                  <span>{sourceMatchPct}% of document</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Split Pane ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl border overflow-hidden">
        {/* Left Panel: Student Document */}
        <div className="border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Student Submission</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {documentContent.split(/\s+/).filter(w => w.length > 0).length} words
            </Badge>
          </div>
          <div
            ref={leftScrollRef}
            className="max-h-[550px] overflow-y-auto p-4 sm:p-5"
          >
            {studentParagraphs.length > 0 ? (
              <div className="flex">
                <div className="flex-shrink-0 pr-3 select-none">
                  {studentParagraphs.map((_, pi) => (
                    <div
                      key={pi}
                      className="text-xs text-gray-300 leading-relaxed text-right"
                      style={{ minHeight: '1.75em' }}
                    >
                      {pi + 1}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  {studentParagraphs.map((segments, pi) => (
                    <p key={pi} className="text-sm leading-relaxed text-gray-800 mb-3">
                      {segments.map((seg, si) => {
                        if (seg.highlighted) {
                          return (
                            <TooltipProvider key={`${pi}-${si}`} delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <mark
                                    className="px-0.5 rounded-sm transition-all cursor-default"
                                    style={{
                                      backgroundColor: seg.color + 'CC',
                                      color: '#1a1a1a',
                                    }}
                                  >
                                    {seg.text}
                                  </mark>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                  <p className="font-medium">{activeSource?.sourceTitle || 'Matched Source'}</p>
                                  <p className="text-muted-foreground">
                                    {seg.regionIndex !== undefined && activeRegions[seg.regionIndex]
                                      ? `${activeRegions[seg.regionIndex].wordCount} words at position ${activeRegions[seg.regionIndex].startWordIndex}`
                                      : 'Matched region'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }
                        return <span key={`${pi}-${si}`}>{seg.text}</span>;
                      })}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No matching content for this source.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Source Content */}
        <div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: highlightColor }}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                Source: {activeSource?.sourceTitle || 'Select a source'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Matched passages only</span>
            </div>
          </div>
          <div
            ref={rightScrollRef}
            className="max-h-[550px] overflow-y-auto p-4 sm:p-5"
          >
            {sourceParagraphs.length > 0 ? (
              <div className="flex">
                <div className="flex-shrink-0 pr-3 select-none">
                  {sourceParagraphs.map((_, pi) => (
                    <div
                      key={pi}
                      className="text-xs text-gray-300 leading-relaxed text-right"
                      style={{ minHeight: '1.75em' }}
                    >
                      {pi + 1}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {sourceParagraphs.map((panelSeg, pi) => {
                    if (panelSeg.regionInfo) {
                      return (
                        <div key={pi}>
                          {/* Region info header */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                              style={{
                                borderColor: highlightColor,
                                color: highlightColor,
                              }}
                            >
                              Region {panelSeg.regionInfo.regionIndex + 1}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {panelSeg.regionInfo.wordCount} words
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              pos {panelSeg.regionInfo.startWordIndex}–{panelSeg.regionInfo.endWordIndex}
                            </span>
                          </div>
                          {panelSeg.segments.map((seg, si) => (
                            <p key={`${pi}-${si}`} className="text-sm leading-relaxed text-gray-800">
                              {seg.highlighted ? (
                                <mark
                                  className="px-0.5 rounded-sm"
                                  style={{
                                    backgroundColor: seg.color + 'CC',
                                    color: '#1a1a1a',
                                  }}
                                >
                                  {seg.text}
                                </mark>
                              ) : (
                                <span>{seg.text}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <p key={pi} className="text-sm text-gray-400 italic">
                        {panelSeg.segments.map((seg, si) => (
                          <span key={`${pi}-${si}`}>{seg.text}</span>
                        ))}
                      </p>
                    );
                  })}
                </div>
              </div>
            ) : activeSource ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">Source content preview not available</p>
                {activeSource.sourceUrl && (
                  <a
                    href={activeSource.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#008751] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View source at original URL
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Columns className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">Select a source to compare</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Match Statistics ── */}
      {activeRegions.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-gray-700">{activeRegions.length}</span> matched regions
                </span>
                <span>
                  <span className="font-semibold text-gray-700">
                    {activeRegions.reduce((sum, r) => sum + r.wordCount, 0)}
                  </span> total matched words
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: highlightColor,
                      width: `${Math.min(sourceMatchPct * 3, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold" style={{ color: highlightColor }}>
                  {sourceMatchPct}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
