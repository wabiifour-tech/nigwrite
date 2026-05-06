/**
 * NigWrite - Plagiarism Report Component (Turnitin-style Originality Report)
 * Created by: Wabi The Tech Nurse
 *
 * Displays the full plagiarism report with Turnitin-style originality report:
 * - Header with document title, date, verdict badge
 * - Two score circles (Similarity Index + AI Detection)
 * - Stacked source type breakdown bar
 * - Document viewer with inline highlighted match regions, line numbers, source filter toolbar
 * - Source panel with clickable sources (grouped by type, collapsible)
 * - "Fix This" rewrite buttons for flagged segments
 * - AI detection per-sentence analysis
 */

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Bot,
  Globe,
  BookOpen,
  GraduationCap,
  FileText,
  ShieldCheck,
  Ban,
  Star,
  Filter,
  Settings2,
  Eye,
  Info,
  Download,
  Loader2,
  GitCompare,
  Columns,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';
import { AuthorshipReport } from '@/components/authorship/AuthorshipReport';
import { SideBySideComparison, type SourceBreakdown as SBS_SourceBreakdown, type MatchRegion as SBS_MatchRegion } from '@/components/SideBySideComparison';
import { PostScanExclusions, type ExclusionSettingsData, type RescoreResult, type SourceInfo } from '@/components/PostScanExclusions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScoreGauge } from '@/components/ScoreGauge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ──────────────────────────────────────────────
// Types matching the API response
// ──────────────────────────────────────────────

interface MatchRegion {
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

interface SourceBreakdown {
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

interface MatchDetail {
  text: string;
  sourceTitle: string;
  sourceUrl?: string;
  contribution: number;
}

interface AISentence {
  sentence: string;
  aiScore: number;
  startOffset: number;
  endOffset: number;
  isFlagged: boolean;
}

interface AIDetectionData {
  aiProbability: number;
  perplexity: number;
  burstiness: number;
  vocabularyDiversity: number;
  averageSentenceLength: number;
  sentenceLengthVariance: number;
  confidence: 'low' | 'medium' | 'high';
  indicators: string[];
  sentences?: AISentence[];
}

interface Verdict {
  status: 'original' | 'warning' | 'flagged' | 'critical';
  label: string;
  description: string;
  color: string;
}

interface SourceTypeBreakdown {
  internet: { matchedWords: number; percentage: number; sourceCount: number };
  publications: { matchedWords: number; percentage: number; sourceCount: number };
  studentPapers: { matchedWords: number; percentage: number; sourceCount: number };
  primarySources: { matchedWords: number; percentage: number; sourceCount: number };
}

interface PrimarySource {
  sourceId: string;
  sourceTitle: string;
  matchedWords: number;
  percentage: number;
}

interface ReportData {
  reportId: string;
  documentId: string;
  title: string;
  createdAt: string;
  plagiarism: {
    similarityScore: number;
    totalWords: number;
    matchedWords: number;
    excludedWords: number;
    totalFingerprints: number;
    matchingFingerprints: number;
    flaggedSegments: string[];
    matches: MatchDetail[];
    webSourcesSearched?: number;
    sourceBreakdown?: SourceBreakdown[];
    matchRegions?: MatchRegion[];
    sourceTypeBreakdown?: SourceTypeBreakdown;
    primarySources?: PrimarySource[];
  };
  aiDetection: AIDetectionData;
  verdict: Verdict;
}

interface PlagiarismReportProps {
  report: ReportData;
  documentContent?: string;
  onReportUpdate?: (updatedReport: Partial<ReportData>) => void;
}

interface SegmentRewriteState {
  originalText: string;
  rewrittenText: string;
  isRewriting: boolean;
  isDone: boolean;
  originalScore: number;
  newScore: number;
  improvement: number;
  message: string;
  error?: string;
}

// ──────────────────────────────────────────────
// Color Palette for Sources (Turnitin-style)
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

// ──────────────────────────────────────────────
// Source type colors (for the stacked bar)
// ──────────────────────────────────────────────

const SOURCE_TYPE_COLORS = {
  internet: '#3B82F6',       // blue
  publications: '#8B5CF6',   // purple
  studentPapers: '#F97316',  // orange
  primarySources: '#10B981', // green
};

const SOURCE_TYPE_LABELS = {
  internet: 'Internet Sources',
  publications: 'Publications',
  studentPapers: 'Student Papers',
  primarySources: 'Primary Sources',
};

// ──────────────────────────────────────────────
// Utility functions
// ──────────────────────────────────────────────

function getAIScoreColor(score: number): string {
  if (score < 30) return 'bg-emerald-500';
  if (score < 50) return 'bg-amber-500';
  if (score < 70) return 'bg-orange-500';
  return 'bg-red-500';
}

function getAIScoreBadgeColor(score: number): string {
  if (score < 30) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score < 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (score < 70) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function getAIScoreTextColor(score: number): string {
  if (score < 30) return 'text-emerald-600';
  if (score < 50) return 'text-amber-600';
  if (score < 70) return 'text-orange-600';
  return 'text-red-600';
}

function getSimScoreColor(score: number): string {
  if (score < 25) return 'text-emerald-600';
  if (score < 50) return 'text-amber-600';
  if (score < 75) return 'text-orange-600';
  return 'text-red-600';
}

function getSimScoreLabel(score: number): string {
  if (score < 25) return 'Low similarity';
  if (score < 50) return 'Moderate similarity';
  if (score < 75) return 'High similarity';
  return 'Very high similarity';
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
// Similarity Score Circle Component (Turnitin-style)
// ──────────────────────────────────────────────

function SimilarityScoreCircle({ score, label, size = 120 }: { score: number; label: string; size?: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const getColor = (s: number) => {
    if (s < 25) return '#10b981';
    if (s < 50) return '#f59e0b';
    if (s < 75) return '#f97316';
    return '#ef4444';
  };
  const color = getColor(clampedScore);

  // SVG circle calculations
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {Math.round(clampedScore)}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Stacked Source Bar Component
// ──────────────────────────────────────────────

function StackedSourceBar({ sourceTypeBreakdown }: { sourceTypeBreakdown: SourceTypeBreakdown | undefined }) {
  const breakdown = sourceTypeBreakdown || {
    internet: { matchedWords: 0, percentage: 0, sourceCount: 0 },
    publications: { matchedWords: 0, percentage: 0, sourceCount: 0 },
    studentPapers: { matchedWords: 0, percentage: 0, sourceCount: 0 },
    primarySources: { matchedWords: 0, percentage: 0, sourceCount: 0 },
  };

  const segments = [
    { key: 'internet' as const, ...breakdown.internet, color: SOURCE_TYPE_COLORS.internet, icon: <Globe className="h-3 w-3" /> },
    { key: 'publications' as const, ...breakdown.publications, color: SOURCE_TYPE_COLORS.publications, icon: <BookOpen className="h-3 w-3" /> },
    { key: 'studentPapers' as const, ...breakdown.studentPapers, color: SOURCE_TYPE_COLORS.studentPapers, icon: <GraduationCap className="h-3 w-3" /> },
    { key: 'primarySources' as const, ...breakdown.primarySources, color: SOURCE_TYPE_COLORS.primarySources, icon: <Star className="h-3 w-3" /> },
  ].filter(s => s.percentage > 0);

  const totalPct = segments.reduce((sum, s) => sum + s.percentage, 0);

  if (totalPct === 0) return null;

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
        {segments.map((seg) => (
          <TooltipProvider key={seg.key} delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="h-full transition-all duration-700 cursor-pointer hover:opacity-80 relative group"
                  style={{
                    width: `${(seg.percentage / totalPct) * 100}%`,
                    backgroundColor: seg.color,
                    minWidth: segments.length === 1 ? '100%' : '2px',
                  }}
                >
                  {segments.length <= 4 && (seg.percentage / totalPct) > 0.08 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white whitespace-nowrap">
                      {seg.percentage}%
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-medium">{SOURCE_TYPE_LABELS[seg.key]}</div>
                <div>{seg.percentage}% of matches · {seg.sourceCount} source{seg.sourceCount !== 1 ? 's' : ''}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {seg.icon}
              {SOURCE_TYPE_LABELS[seg.key]}
            </span>
            <span className="text-xs font-semibold">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Document Viewer with Inline Highlighting
// ──────────────────────────────────────────────

interface DocumentViewerProps {
  documentContent: string;
  matchRegions: MatchRegion[];
  activeSourceId: string | null;
  onSourceClick: (sourceId: string | null) => void;
}

function DocumentViewer({
  documentContent,
  matchRegions,
  activeSourceId,
  onSourceClick,
}: DocumentViewerProps) {
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const viewerRef = useRef<HTMLDivElement>(null);
  const highlightRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [pulsingSourceId, setPulsingSourceId] = useState<string | null>(null);

  // Build highlighted content segments
  const { paragraphs, lineStartIndices } = useMemo(() => {
    if (!documentContent || matchRegions.length === 0) {
      const lines = (documentContent || 'No document content available.').split('\n');
      const segments: { text: string; highlighted: false; sourceTitle: ''; color: ''; sourceId: ''; sourceType: ''; percentageOfDocument: 0; wordCount: 0; isPrimary: false }[][] = [];
      let lineIdx = 0;
      for (const line of lines) {
        segments.push([{ text: line || ' ', highlighted: false, sourceTitle: '', color: '', sourceId: '', sourceType: '', percentageOfDocument: 0, wordCount: 0, isPrimary: false }]);
        lineIdx++;
      }
      return { paragraphs: segments, lineStartIndices: [] };
    }

    const normalizedText = documentContent
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedText.split(' ').filter(w => w.length > 0);

    // Build word-to-region map (first region wins for overlapping)
    const wordToRegion = new Map<number, MatchRegion>();
    for (const region of matchRegions) {
      // Skip if this source type is filtered out
      if (sourceFilter.size > 0 && sourceFilter.has(region.sourceType)) continue;
      for (let w = region.startWordIndex; w <= region.endWordIndex && w < words.length; w++) {
        if (!wordToRegion.has(w)) {
          wordToRegion.set(w, region);
        }
      }
    }

    // Build segments
    const allSegments: { text: string; highlighted: boolean; sourceTitle: string; color: string; sourceId: string; sourceType: string; percentageOfDocument: number; wordCount: number; isPrimary: boolean }[] = [];
    let currentSegment = '';
    let isCurrentHighlighted = false;
    let currentRegion: MatchRegion | null = null;

    for (let i = 0; i < words.length; i++) {
      const region = wordToRegion.get(i);
      const isHighlighted = !!region;

      if (isHighlighted !== isCurrentHighlighted || (isHighlighted && region && currentRegion && region.sourceId !== currentRegion.sourceId)) {
        if (currentSegment) {
          allSegments.push({
            text: currentSegment.trim(),
            highlighted: isCurrentHighlighted,
            sourceTitle: currentRegion?.sourceTitle || '',
            color: currentRegion ? getSourceColor(currentRegion.sourceId) : '',
            sourceId: currentRegion?.sourceId || '',
            sourceType: currentRegion?.sourceType || '',
            percentageOfDocument: 0,
            wordCount: currentRegion?.wordCount || 0,
            isPrimary: currentRegion?.isPrimary || false,
          });
        }
        currentSegment = '';
        isCurrentHighlighted = isHighlighted;
        currentRegion = region || null;
      }

      currentSegment += (currentSegment ? ' ' : '') + words[i];
    }

    if (currentSegment) {
      allSegments.push({
        text: currentSegment.trim(),
        highlighted: isCurrentHighlighted,
        sourceTitle: currentRegion?.sourceTitle || '',
        color: currentRegion ? getSourceColor(currentRegion.sourceId) : '',
        sourceId: currentRegion?.sourceId || '',
        sourceType: currentRegion?.sourceType || '',
        percentageOfDocument: 0,
        wordCount: currentRegion?.wordCount || 0,
        isPrimary: currentRegion?.isPrimary || false,
      });
    }

    // Split into paragraphs (by newlines in original text, approximated)
    const originalLines = documentContent.split('\n');
    const lineStartIndices: number[] = [];
    let idx = 0;
    for (const line of originalLines) {
      lineStartIndices.push(idx);
      idx += line.split(/\s+/).filter(w => w.length > 0).length;
    }

    // Simple paragraph splitting: group every ~15 words as a paragraph
    const pGroups: (typeof allSegments)[] = [];
    let currentGroup: (typeof allSegments)[number][] = [];
    let wordCountInGroup = 0;

    for (const seg of allSegments) {
      const segWords = seg.text.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCountInGroup + segWords > 20 && currentGroup.length > 0) {
        pGroups.push(currentGroup);
        currentGroup = [];
        wordCountInGroup = 0;
      }
      currentGroup.push(seg);
      wordCountInGroup += segWords;
    }
    if (currentGroup.length > 0) pGroups.push(currentGroup);

    return { paragraphs: pGroups, lineStartIndices };
  }, [documentContent, matchRegions, sourceFilter]);

  // Handle scroll to active source and pulse animation
  const lastScrolledRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSourceId && activeSourceId !== lastScrolledRef.current && highlightRefs.current.has(activeSourceId)) {
      const el = highlightRefs.current.get(activeSourceId);
      if (el) {
        lastScrolledRef.current = activeSourceId;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const startTimer = setTimeout(() => setPulsingSourceId(activeSourceId), 400);
        const endTimer = setTimeout(() => {
          setPulsingSourceId(null);
          lastScrolledRef.current = null;
        }, 2400);
        return () => {
          clearTimeout(startTimer);
          clearTimeout(endTimer);
        };
      }
    }
  }, [activeSourceId]);

  // Count active source types in regions
  const activeTypes = useMemo(() => {
    const types = new Set(matchRegions.map(r => r.sourceType));
    return types;
  }, [matchRegions]);

  const toggleSourceType = useCallback((type: string) => {
    setSourceFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Source filter toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>
        {[{ type: 'internet' as const, label: 'Internet', color: '#3B82F6' },
          { type: 'publication' as const, label: 'Publications', color: '#8B5CF6' },
          { type: 'student_paper' as const, label: 'Student Papers', color: '#F97316' },
        ].filter(t => activeTypes.has(t.type)).map(({ type, label, color }) => (
          <button
            key={type}
            onClick={() => toggleSourceType(type)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all border ${
              sourceFilter.has(type)
                ? 'bg-white opacity-50 line-through'
                : 'bg-white hover:shadow-sm'
            }`}
            style={{ borderColor: color, color: sourceFilter.has(type) ? '#9ca3af' : color }}
          >
            {getSourceTypeIcon(type)}
            {label}
          </button>
        ))}
        {sourceFilter.size > 0 && (
          <button
            onClick={() => setSourceFilter(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
          >
            Show all
          </button>
        )}
      </div>

      {/* Document content */}
      <div ref={viewerRef} className="max-h-[600px] overflow-y-auto p-4 sm:p-6">
        <div className="flex">
          {/* Line numbers */}
          <div className="flex-shrink-0 pr-3 select-none">
            {paragraphs.map((_, pi) => (
              <div key={pi} className="text-xs text-gray-300 leading-relaxed text-right" style={{ minHeight: '1.75em' }}>
                {pi + 1}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {paragraphs.map((segments, pi) => (
              <p key={pi} className="text-sm leading-relaxed text-gray-800 mb-3">
                {segments.map((seg, si) => {
                  if (seg.highlighted) {
                    const isActive = activeSourceId === seg.sourceId;
                    const isPulsing = pulsingSourceId === seg.sourceId;

                    return (
                      <TooltipProvider key={`${pi}-${si}`} delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <mark
                              ref={(el) => {
                                if (el && seg.sourceId) {
                                  if (!highlightRefs.current.has(seg.sourceId)) {
                                    highlightRefs.current.set(seg.sourceId, el);
                                  }
                                }
                              }}
                              className={`px-0.5 rounded-sm cursor-pointer transition-all ${
                                isPulsing ? 'animate-pulse ring-2 ring-offset-1 ring-[#008751]' : ''
                              } ${isActive ? 'ring-2 ring-offset-1 ring-[#008751]' : 'hover:ring-1 hover:ring-offset-1 hover:ring-gray-300'}`}
                              style={{ backgroundColor: seg.color, color: '#1a1a1a' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSourceClick(seg.sourceId === activeSourceId ? null : seg.sourceId);
                              }}
                            >
                              {seg.text}
                              {seg.isPrimary && (
                                <Star className="inline h-2.5 w-2.5 ml-0.5 text-yellow-600 -mt-0.5" fill="currentColor" />
                              )}
                            </mark>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs" sideOffset={5}>
                            <p className="font-medium text-xs">{seg.sourceTitle}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {getSourceTypeLabel(seg.sourceType)}
                              {seg.isPrimary && <span className="ml-1 text-yellow-600 font-semibold">Primary</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 italic">Click to filter by this source</p>
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
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Source Panel (Collapsible, Clickable)
// ──────────────────────────────────────────────

interface SourcePanelProps {
  sourceBreakdown: SourceBreakdown[];
  activeSourceId: string | null;
  onSourceClick: (sourceId: string | null) => void;
  onCompare: (sourceId: string) => void;
  matchRegions: MatchRegion[];
}

function SourcePanel({ sourceBreakdown, activeSourceId, onSourceClick, onCompare, matchRegions }: SourcePanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const internetSources = sourceBreakdown.filter(s => s.sourceType === 'internet');
  const publications = sourceBreakdown.filter(s => s.sourceType === 'publication');
  const studentPapers = sourceBreakdown.filter(s => s.sourceType === 'student_paper');

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Get count of regions for a source
  const getRegionCount = (sourceId: string) => {
    return matchRegions.filter(r => r.sourceId === sourceId).length;
  };

  const renderSourceSection = (
    groupKey: string,
    title: string,
    icon: React.ReactNode,
    sources: SourceBreakdown[],
    accentColor: string,
  ) => {
    if (sources.length === 0) return null;
    const isCollapsed = collapsedGroups.has(groupKey);

    return (
      <div className="space-y-2">
        <button
          onClick={() => toggleGroup(groupKey)}
          className="w-full flex items-center gap-2 text-left hover:bg-muted/30 rounded-md px-1 py-1 transition-colors"
        >
          {icon}
          <span className="text-sm font-semibold text-muted-foreground flex-1">{title}</span>
          <Badge variant="secondary" className="text-xs">{sources.length}</Badge>
          {isCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {!isCollapsed && (
          <div className="space-y-1.5 pl-1">
            {sources.map((source) => {
              const color = getSourceColor(source.sourceId);
              const isActive = activeSourceId === source.sourceId;
              const regionCount = getRegionCount(source.sourceId);

              return (
                <button
                  key={source.sourceId}
                  onClick={() => onSourceClick(isActive ? null : source.sourceId)}
                  className={`w-full text-left rounded-lg p-2.5 transition-all border ${
                    isActive
                      ? 'border-[#008751] bg-[#008751]/5 shadow-sm ring-1 ring-[#008751]/20'
                      : 'border-transparent hover:bg-muted/50 hover:border-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Color indicator */}
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    />

                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs font-medium truncate leading-tight ${isActive ? 'text-[#008751]' : ''}`}>
                          {source.sourceTitle}
                        </p>
                        {source.isPrimary && (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Star className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" fill="currentColor" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Primary Source</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                          style={{ borderColor: color, color: color }}
                        >
                          {source.percentageOfDocument}%
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {regionCount} {regionCount === 1 ? 'region' : 'regions'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {source.matchedWords} words
                        </span>
                      </div>

                      {/* Source type badge */}
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                          {getSourceTypeIcon(source.sourceType)}
                          {getSourceTypeLabel(source.sourceType)}
                        </Badge>
                      </div>

                      {/* Mini bar */}
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden max-w-full">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: color,
                            width: `${Math.min(source.percentageOfDocument * 4, 100)}%`,
                            opacity: isActive ? 1 : 0.6,
                          }}
                        />
                      </div>

                      {/* Compare button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompare(source.sourceId);
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[#008751] bg-[#008751]/5 hover:bg-[#008751]/10 transition-colors"
                      >
                        <GitCompare className="h-3 w-3" />
                        Compare
                        <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderSourceSection('internet', 'Internet Sources', <Globe className="h-3.5 w-3.5 text-[#3B82F6]" />, internetSources, '#3B82F6')}
      {renderSourceSection('publications', 'Publications', <BookOpen className="h-3.5 w-3.5 text-[#8B5CF6]" />, publications, '#8B5CF6')}
      {renderSourceSection('student_papers', 'Student Papers', <GraduationCap className="h-3.5 w-3.5 text-[#F97316]" />, studentPapers, '#F97316')}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main PlagiarismReport Component
// ──────────────────────────────────────────────

export function PlagiarismReport({ report, documentContent, onReportUpdate }: PlagiarismReportProps) {
  const [segmentStates, setSegmentStates] = useState<Map<string, SegmentRewriteState>>(new Map());
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set());
  const [showAllSentences, setShowAllSentences] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('originality');
  const [comparisonSourceId, setComparisonSourceId] = useState<string | null>(null);
  const [rescoredReport, setRescoredReport] = useState<Partial<ReportData> | null>(null);

  const flaggedSentences = (report.aiDetection.sentences || []).filter(s => s.isFlagged);
  const displaySentences = showAllSentences ? flaggedSentences : flaggedSentences.slice(0, 5);

  // Use rescored data if available, otherwise use original
  const displayReport = rescoredReport
    ? { ...report, ...rescoredReport, plagiarism: { ...report.plagiarism, ...(rescoredReport.plagiarism || {}) } }
    : report;

  const matchRegions = displayReport.plagiarism.matchRegions || [];
  const sourceBreakdown = displayReport.plagiarism.sourceBreakdown || [];
  const totalWords = displayReport.plagiarism.totalWords || 0;
  const matchedWords = displayReport.plagiarism.matchedWords || 0;
  const excludedWords = displayReport.plagiarism.excludedWords || 0;
  const sourceTypeBreakdown = displayReport.plagiarism.sourceTypeBreakdown;

  const handleSourceClick = useCallback((sourceId: string | null) => {
    setActiveSourceId(sourceId);
  }, []);

  const handleCompareSource = useCallback((sourceId: string) => {
    setComparisonSourceId(sourceId);
    setActiveTab('comparison');
  }, []);

  const handleBackToReport = useCallback(() => {
    setActiveTab('originality');
    setComparisonSourceId(null);
  }, []);

  const handleExclusionsChange = useCallback((_newExclusions: ExclusionSettingsData) => {
    // Reset rescored state when exclusions change (user must click Re-score)
  }, []);

  const handleRescore = useCallback((result: RescoreResult) => {
    const updatedPlagiarism = {
      similarityScore: result.similarityScore,
      totalWords: result.totalWords,
      matchedWords: result.matchedWords,
      excludedWords: result.excludedWords,
      matchRegions: result.matchRegions,
      sourceBreakdown: result.sourceBreakdown,
      sourceTypeBreakdown: result.sourceTypeBreakdown,
      primarySources: result.primarySources,
      flaggedSegments: result.flaggedSegments,
      matches: result.matches,
    };
    const updated: Partial<ReportData> = {
      plagiarism: updatedPlagiarism as unknown as ReportData['plagiarism'],
    };
    setRescoredReport(updated);
    onReportUpdate?.(updated);
  }, [onReportUpdate]);

  const postScanExclusionSettings: ExclusionSettingsData = {
    excludeQuotes: true,
    excludeBibliography: true,
    excludeCitations: true,
    excludeInternetSources: false,
    excludePublications: false,
    excludeStudentPapers: false,
    excludeSmallMatches: 0,
  };

  const postScanSources: SourceInfo[] = sourceBreakdown.map(s => ({
    sourceId: s.sourceId,
    sourceTitle: s.sourceTitle,
    sourceType: s.sourceType,
    sourceUrl: s.sourceUrl,
    percentageOfDocument: s.percentageOfDocument,
    matchedWords: s.matchedWords,
    matchCount: s.matchCount,
  }));

  const sbsMatchRegions: SBS_MatchRegion[] = matchRegions.map(r => ({
    startWordIndex: r.startWordIndex,
    endWordIndex: r.endWordIndex,
    text: r.text,
    sourceId: r.sourceId,
    sourceTitle: r.sourceTitle,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    wordCount: r.wordCount,
    isPrimary: r.isPrimary,
  }));

  const sbsSourceBreakdown: SBS_SourceBreakdown[] = sourceBreakdown.map(s => ({
    sourceId: s.sourceId,
    sourceTitle: s.sourceTitle,
    sourceType: s.sourceType,
    sourceUrl: s.sourceUrl,
    matchCount: s.matchCount,
    matchedWords: s.matchedWords,
    percentageOfDocument: s.percentageOfDocument,
    isPrimary: s.isPrimary,
    regions: s.regions.map(r => ({
      startWordIndex: r.startWordIndex,
      endWordIndex: r.endWordIndex,
      text: r.text,
      sourceId: r.sourceId,
      sourceTitle: r.sourceTitle,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      wordCount: r.wordCount,
      isPrimary: r.isPrimary,
    })),
  }));

  const isRescored = rescoredReport !== null;
  const scoreDiff = isRescored
    ? (displayReport.plagiarism.similarityScore - report.plagiarism.similarityScore)
    : null;

  const handleRewrite = async (segmentText: string, index: number) => {
    const key = `seg-${index}`;
    setSegmentStates(prev => {
      const next = new Map(prev);
      next.set(key, {
        originalText: segmentText,
        rewrittenText: '',
        isRewriting: true,
        isDone: false,
        originalScore: 0,
        newScore: 0,
        improvement: 0,
        message: 'Rewriting with AI...',
      });
      return next;
    });

    try {
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flaggedText: segmentText,
          documentContent: documentContent || report.plagiarism.flaggedSegments.join(' '),
          documentTitle: report.title,
          reportId: report.reportId,
        }),
      });

      const result = await response.json();

      setSegmentStates(prev => {
        const next = new Map(prev);
        if (result.success) {
          next.set(key, {
            originalText: segmentText,
            rewrittenText: result.data.rewrittenText,
            isRewriting: false,
            isDone: true,
            originalScore: result.data.originalScore,
            newScore: result.data.newScore,
            improvement: result.data.improvement,
            message: result.data.message,
          });
        } else {
          next.set(key, {
            originalText: segmentText,
            rewrittenText: '',
            isRewriting: false,
            isDone: false,
            originalScore: 0,
            newScore: 0,
            improvement: 0,
            message: result.error || 'Rewrite failed',
            error: result.error,
          });
        }
        return next;
      });
    } catch {
      setSegmentStates(prev => {
        const next = new Map(prev);
        next.set(key, {
          originalText: segmentText,
          rewrittenText: '',
          isRewriting: false,
          isDone: false,
          originalScore: 0,
          newScore: 0,
          improvement: 0,
          message: 'Network error. Please try again.',
          error: 'Network error',
        });
        return next;
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleMatch = (index: number) => {
    setExpandedMatches(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDownloadHighlight = useCallback(async () => {
    if (!report.reportId) return;
    setIsDownloadingDocx(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.reportId, format: 'highlighted_docx' }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || 'Download failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (report.title || 'report').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
      a.download = `${safeTitle}_originality_report.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download highlighted report:', err);
      // Show a simple alert as fallback
      alert(err instanceof Error ? err.message : 'Failed to download highlighted report. Please try again.');
    } finally {
      setIsDownloadingDocx(false);
    }
  }, [report.reportId, report.title]);

  const getVerdictBorderColor = (status: string) => {
    switch (status) {
      case 'original': return 'border-emerald-500 bg-emerald-50';
      case 'warning': return 'border-amber-500 bg-amber-50';
      case 'flagged': return 'border-orange-500 bg-orange-50';
      case 'critical': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getVerdictBadgeColor = (status: string) => {
    switch (status) {
      case 'original': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'flagged': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVerdictIconColor = (status: string) => {
    switch (status) {
      case 'original': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'flagged': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="originality" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Originality</span>
            <span className="sm:hidden">Original</span>
          </TabsTrigger>
          <TabsTrigger value="authorship" className="gap-1.5">
            <Fingerprint className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Authorship</span>
            <span className="sm:hidden">Author</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5">
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comparison</span>
            <span className="sm:hidden">Compare</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="originality" className="mt-6 space-y-6">
      {/* ── Report Header with Verdict ── */}
      {isRescored && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700">
            Score updated: <span className="font-bold">{report.plagiarism.similarityScore}%</span>
            {' '}→ <span className="font-bold">{displayReport.plagiarism.similarityScore}%</span>
            {scoreDiff !== null && scoreDiff !== 0 && (
              <span className="ml-1">({scoreDiff < 0 ? '↓' : '↑'} {Math.abs(scoreDiff)}%)</span>
            )}
          </p>
        </div>
      )}

      {/* ── Report Header with Verdict ── */}
      <div className={`rounded-xl border-l-4 p-4 sm:p-5 ${getVerdictIconColor(report.verdict.status)}`}>
        <div className="flex items-start gap-3">
  {/* End Originality tab content - closing tags added at end */}
          <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${getVerdictIconColor(report.verdict.status)}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-lg">
                {report.verdict.label}
              </h3>
              <Badge className={getVerdictBadgeColor(report.verdict.status)} variant="outline">
                {report.verdict.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{report.verdict.description}</p>
            {/* Stats row */}
            {totalWords > 0 && (
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                <span>{totalWords} words total</span>
                <span className="font-medium text-gray-700">{matchedWords} matched
              {isRescored && (
                <Badge variant="outline" className="text-[10px] ml-1.5 px-1.5 py-0 h-4 border-emerald-300 text-emerald-700 bg-emerald-50">
                  Updated
                </Badge>
              )}
            </span>
                {excludedWords > 0 && (
                  <span className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    {excludedWords} excluded
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {sourceBreakdown.length} source{sourceBreakdown.length !== 1 ? 's' : ''}
                </span>
                {report.plagiarism.webSourcesSearched !== undefined && report.plagiarism.webSourcesSearched > 0 && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    +{report.plagiarism.webSourcesSearched} web sources
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Post-Scan Exclusion Controls ── */}
      {documentContent && sourceBreakdown.length > 0 && (
        <PostScanExclusions
          currentExclusions={postScanExclusionSettings}
          onExclusionsChange={handleExclusionsChange}
          onRescore={handleRescore}
          documentId={report.documentId}
          originalContent={documentContent}
          sources={postScanSources}
          originalScore={report.plagiarism.similarityScore}
        />
      )}

      {/* ── Download Highlighted Report Button ── */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2 border-[#008751] text-[#008751] hover:bg-[#008751]/5"
          disabled={isDownloadingDocx}
          onClick={handleDownloadHighlight}
        >
          {isDownloadingDocx ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Highlighted Report (.docx)
            </>
          )}
        </Button>
      </div>

      {/* ── Score Section: Two circles + Stacked bar ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Similarity Score Circle */}
            <SimilarityScoreCircle
              score={displayReport.plagiarism.similarityScore}
              label={isRescored ? 'Updated Score' : 'Similarity Index'}
              size={130}
            />

            {/* AI Detection Score Circle */}
            <SimilarityScoreCircle
              score={report.aiDetection.aiProbability}
              label="AI Detection"
              size={130}
            />

            {/* Labels */}
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              {/* Similarity label */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`h-4 w-4 ${getSimScoreColor(displayReport.plagiarism.similarityScore)}`} />
                  <span className={`text-xl font-bold ${getSimScoreColor(displayReport.plagiarism.similarityScore)}`}>
                    {displayReport.plagiarism.similarityScore}%
                  </span>
                </div>
                <p className={`text-xs font-medium ${getSimScoreColor(displayReport.plagiarism.similarityScore)}`}>
                  {getSimScoreLabel(displayReport.plagiarism.similarityScore)}
                </p>
              </div>

              {/* AI label */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bot className={`h-4 w-4 ${getAIScoreTextColor(report.aiDetection.aiProbability)}`} />
                  <span className={`text-xl font-bold ${getAIScoreTextColor(report.aiDetection.aiProbability)}`}>
                    {report.aiDetection.aiProbability}%
                  </span>
                </div>
                <p className={`text-xs font-medium ${getAIScoreTextColor(report.aiDetection.aiProbability)}`}>
                  {report.aiDetection.aiProbability < 25 ? 'Likely human-written' :
                   report.aiDetection.aiProbability < 50 ? 'Possibly AI-assisted' :
                   report.aiDetection.aiProbability < 75 ? 'Likely AI-generated' : 'Very likely AI-generated'}
                </p>
              </div>
            </div>
          </div>

          {/* Stacked Source Bar */}
          {sourceTypeBreakdown && (
            <div className="mt-6 pt-5 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Source Type Breakdown
              </h4>
              <StackedSourceBar sourceTypeBreakdown={sourceTypeBreakdown} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Stats ── */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{sourceBreakdown.length}</div>
              <div className="text-xs text-muted-foreground">Sources Found</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-orange-600">{matchRegions.length}</div>
              <div className="text-xs text-muted-foreground">Match Regions</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold capitalize">{report.aiDetection.confidence}</div>
              <div className="text-xs text-muted-foreground">AI Confidence</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.plagiarism.totalFingerprints}</div>
              <div className="text-xs text-muted-foreground">Text Segments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Comparison Tab Content ── */}
        </TabsContent>

        <TabsContent value="authorship" className="mt-6">
          <AuthorshipReport documentContent={documentContent} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          {documentContent && matchRegions.length > 0 ? (
            <SideBySideComparison
              documentContent={documentContent}
              matchRegions={sbsMatchRegions}
              sourceBreakdown={sbsSourceBreakdown}
              selectedSourceId={comparisonSourceId || undefined}
              onBack={handleBackToReport}
            />
          ) : (
            <div className="text-center py-12">
              <Columns className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No Sources to Compare</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No matching sources were found in this scan. Run a scan first to enable source comparison.
              </p>
              <Button variant="outline" onClick={() => setActiveTab('originality')}>
                <FileText className="h-4 w-4 mr-2" />
                View Originality Report
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Two-Column Layout: Document Viewer + Source Panel ── */}
      {documentContent && matchRegions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Document Viewer (2/3) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Originality Report — Document Viewer
              {activeSourceId && (
                <Badge variant="outline" className="text-xs ml-2 text-[#008751] border-[#008751]">
                  <Eye className="h-3 w-3 mr-1" />
                  Filtering: {sourceBreakdown.find(s => s.sourceId === activeSourceId)?.sourceTitle?.substring(0, 30) || 'Source'}
                </Badge>
              )}
            </h3>
            <DocumentViewer
              documentContent={documentContent}
              matchRegions={matchRegions}
              activeSourceId={activeSourceId}
              onSourceClick={handleSourceClick}
            />
          </div>

          {/* Right: Source Panel (1/3) */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Matched Sources
              <Badge variant="secondary" className="text-xs">{sourceBreakdown.length}</Badge>
            </h3>
            <div className="max-h-[600px] overflow-y-auto pr-1 space-y-1">
              <SourcePanel
                sourceBreakdown={sourceBreakdown}
                activeSourceId={activeSourceId}
                onSourceClick={handleSourceClick}
                onCompare={handleCompareSource}
                matchRegions={matchRegions}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fallback: Document viewer only (no source panel) if only matchRegions available */}
      {documentContent && matchRegions.length > 0 && sourceBreakdown.length === 0 && (
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" />
            Originality Report — Document Viewer
          </h3>
          <DocumentViewer
            documentContent={documentContent}
            matchRegions={matchRegions}
            activeSourceId={null}
            onSourceClick={() => {}}
          />
        </div>
      )}

      {/* Source Matches (backward compat — expanded detail) */}
      {report.plagiarism.matches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Source Match Details ({report.plagiarism.matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {report.plagiarism.matches.map((match, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMatch(i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{match.sourceTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      &quot;{match.text.substring(0, 80)}{match.text.length > 80 ? '...' : ''}&quot;
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline" className="text-xs">
                      +{match.contribution}%
                    </Badge>
                    {expandedMatches.has(i) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expandedMatches.has(i) && (
                  <div className="px-3 pb-3 border-t pt-2">
                    <p className="text-sm text-gray-600 italic">
                      &quot;{match.text}&quot;
                    </p>
                    {match.sourceUrl && (
                      <a
                        href={match.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {match.sourceUrl}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── AI Detection Details ── */}
      {report.aiDetection.aiProbability > 25 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Content Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Word Predictability: </span>
                <span className="font-semibold">{report.aiDetection.perplexity}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Sentence Variation: </span>
                <span className="font-semibold">{report.aiDetection.burstiness}%</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Vocabulary Range: </span>
                <span className="font-semibold">{(report.aiDetection.vocabularyDiversity * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Per-Sentence AI Highlighting */}
            {flaggedSentences.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-500" />
                    Flagged Sentences ({flaggedSentences.length})
                  </h4>
                  {flaggedSentences.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowAllSentences(!showAllSentences)}
                    >
                      {showAllSentences ? 'Show Less' : `Show All ${flaggedSentences.length}`}
                      {showAllSentences ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {displaySentences.map((sentence, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-l-4 transition-colors"
                      style={{
                        borderLeftColor: sentence.aiScore >= 70 ? '#ef4444' :
                                        sentence.aiScore >= 50 ? '#f97316' :
                                        '#eab308',
                      }}
                    >
                      <p className="text-sm text-gray-800 leading-relaxed mb-2">
                        &quot;{sentence.sentence}&quot;
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">AI Probability</span>
                            <span className={`text-xs font-bold ${getAIScoreTextColor(sentence.aiScore)}`}>
                              {sentence.aiScore}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getAIScoreColor(sentence.aiScore)}`}
                              style={{ width: `${Math.min(sentence.aiScore, 100)}%` }}
                            />
                          </div>
                        </div>
                        <Badge
                          className={`${getAIScoreBadgeColor(sentence.aiScore)} text-xs shrink-0`}
                          variant="outline"
                        >
                          {sentence.aiScore >= 70 ? 'High Risk' :
                           sentence.aiScore >= 50 ? 'Suspicious' : 'Moderate'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document-level indicators */}
            <div className="space-y-1.5">
              {report.aiDetection.indicators.map((indicator, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">&#9679;</span>
                  {indicator}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Flagged Segments with Rewrite Buttons ── */}
      {report.plagiarism.flaggedSegments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Flagged Segments ({report.plagiarism.flaggedSegments.length})
            <span className="text-xs font-normal text-muted-foreground">
              — Click &quot;Fix This&quot; to AI-rewrite and reduce similarity
            </span>
          </h3>

          {report.plagiarism.flaggedSegments.map((segment, index) => {
            const key = `seg-${index}`;
            const state = segmentStates.get(key);

            return (
              <Card key={index} className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">Segment {index + 1}</Badge>
                      {state?.isDone && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Fixed
                        </Badge>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <p className="text-sm text-gray-800 leading-relaxed">{segment}</p>
                    </div>

                    {!state?.isDone && (
                      <Button
                        onClick={() => handleRewrite(segment, index)}
                        disabled={state?.isRewriting}
                        className="w-full sm:w-auto bg-[#008751] hover:bg-[#006b40]"
                        variant={state?.isRewriting ? "secondary" : "default"}
                      >
                        {state?.isRewriting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Rewriting with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Fix This
                          </>
                        )}
                      </Button>
                    )}

                    {state?.isRewriting && !state?.isDone && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-sm text-blue-700 flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          {state.message}
                        </p>
                      </div>
                    )}

                    {state?.error && !state?.isRewriting && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm text-red-700">{state.message}</p>
                      </div>
                    )}

                    {state?.isDone && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-emerald-700">AI Rewritten Version</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => copyToClipboard(state.rewrittenText)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed">{state.rewrittenText}</p>
                        </div>

                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <CheckCircle2 className={`h-4 w-4 ${
                            state.improvement > 0 ? 'text-emerald-600' : 'text-amber-600'
                          }`} />
                          <p className="text-xs">
                            <span className="font-semibold">
                              {state.originalScore}% → {state.newScore}%
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ({state.improvement > 0 ? '-' : '+'}{Math.abs(state.improvement)}% change)
                            </span>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{state.message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
