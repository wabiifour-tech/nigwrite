/**
 * NigWrite - Plagiarism Report Component (Turnitin-style)
 * Created by: Wabi The Tech Nurse
 *
 * Displays the full plagiarism report with Turnitin-style originality report:
 * - Top banner with similarity score + progress bar
 * - AI score gauge
 * - Document viewer with inline highlighted match regions
 * - Source panel grouped by type (Internet, Publications, Student Papers)
 * - "Fix This" rewrite buttons for flagged segments
 * - AI detection per-sentence analysis
 */

'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
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
}

interface SourceBreakdown {
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  matchCount: number;
  matchedWords: number;
  percentageOfDocument: number;
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
  };
  aiDetection: AIDetectionData;
  verdict: Verdict;
}

interface PlagiarismReportProps {
  report: ReportData;
  documentContent?: string;
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
// Color Palette for Sources (20 distinct colors)
// ──────────────────────────────────────────────

const SOURCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D2B4DE',
  '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5DBDB', '#EDBB99',
];

function getSourceColor(sourceId: string): string {
  // Generate a stable color index from sourceId
  let hash = 0;
  for (let i = 0; i < sourceId.length; i++) {
    hash = sourceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SOURCE_COLORS[Math.abs(hash) % SOURCE_COLORS.length];
}

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

function getSimScoreBg(score: number): string {
  if (score < 25) return 'bg-emerald-500';
  if (score < 50) return 'bg-amber-500';
  if (score < 75) return 'bg-orange-500';
  return 'bg-red-500';
}

function getSimScoreBorder(score: number): string {
  if (score < 25) return 'border-emerald-500 bg-emerald-50';
  if (score < 50) return 'border-amber-500 bg-amber-50';
  if (score < 75) return 'border-orange-500 bg-orange-50';
  return 'border-red-500 bg-red-50';
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
    case 'internet': return 'Internet Source';
    case 'publication': return 'Publication';
    case 'student_paper': return 'Student Paper';
    default: return 'Source';
  }
}

// ──────────────────────────────────────────────
// Document Viewer with Inline Highlighting
// ──────────────────────────────────────────────

function DocumentViewer({
  documentContent,
  matchRegions,
}: {
  documentContent: string;
  matchRegions: MatchRegion[];
}) {
  const highlightedContent = useMemo(() => {
    if (!documentContent || !matchRegions || matchRegions.length === 0) {
      return [{ text: documentContent || 'No document content available.', highlighted: false, sourceTitle: '', color: '' }];
    }

    // Normalize the text the same way the engine does to align words
    const normalizedText = documentContent
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedText.split(' ').filter(w => w.length > 0);

    // Build a lookup: for each word index, which region matches?
    const wordToRegion = new Map<number, MatchRegion>();
    for (const region of matchRegions) {
      for (let w = region.startWordIndex; w <= region.endWordIndex && w < words.length; w++) {
        if (!wordToRegion.has(w)) {
          wordToRegion.set(w, region);
        }
      }
    }

    // Build output segments
    const segments: { text: string; highlighted: boolean; sourceTitle: string; color: string }[] = [];
    let currentSegment = '';
    let isCurrentHighlighted = false;
    let currentRegion: MatchRegion | null = null;

    for (let i = 0; i < words.length; i++) {
      const region = wordToRegion.get(i);
      const isHighlighted = !!region;

      if (isHighlighted !== isCurrentHighlighted || (isHighlighted && region && currentRegion && region.sourceId !== currentRegion.sourceId)) {
        // Flush previous segment
        if (currentSegment) {
          segments.push({
            text: currentSegment.trim(),
            highlighted: isCurrentHighlighted,
            sourceTitle: currentRegion?.sourceTitle || '',
            color: currentRegion ? getSourceColor(currentRegion.sourceId) : '',
          });
        }
        currentSegment = '';
        isCurrentHighlighted = isHighlighted;
        currentRegion = region || null;
      }

      currentSegment += (currentSegment ? ' ' : '') + words[i];
    }

    // Flush last segment
    if (currentSegment) {
      segments.push({
        text: currentSegment.trim(),
        highlighted: isCurrentHighlighted,
        sourceTitle: currentRegion?.sourceTitle || '',
        color: currentRegion ? getSourceColor(currentRegion.sourceId) : '',
      });
    }

    return segments;
  }, [documentContent, matchRegions]);

  // Split into paragraphs for display
  const paragraphs = useMemo(() => {
    const result: typeof highlightedContent[] = [];
    let current: typeof highlightedContent = [];

    for (const segment of highlightedContent) {
      const parts = segment.text.split(/\n+/);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0 && current.length > 0) {
          result.push(current);
          current = [];
        }
        current.push({ ...segment, text: parts[i] });
      }
    }

    if (current.length > 0) {
      result.push(current);
    }

    return result;
  }, [highlightedContent]);

  return (
    <div className="rounded-lg border bg-white p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground">Document Viewer — Matched Text Highlighted</h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto space-y-3 text-sm leading-relaxed text-gray-800">
        {paragraphs.map((segments, pi) => (
          <p key={pi}>
            {segments.map((seg, si) => {
              if (seg.highlighted) {
                return (
                  <TooltipProvider key={`${pi}-${si}`} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <mark
                          className="px-0.5 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
                          style={{ backgroundColor: seg.color, color: '#1a1a1a' }}
                        >
                          {seg.text}
                        </mark>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-medium text-xs">{seg.sourceTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getSourceTypeLabel(
                            matchRegions.find(r => r.sourceTitle === seg.sourceTitle)?.sourceType || 'publication'
                          )}
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
  );
}

// ──────────────────────────────────────────────
// Source Panel
// ──────────────────────────────────────────────

function SourcePanel({ sourceBreakdown }: { sourceBreakdown: SourceBreakdown[] }) {
  const internetSources = sourceBreakdown.filter(s => s.sourceType === 'internet');
  const publications = sourceBreakdown.filter(s => s.sourceType === 'publication');
  const studentPapers = sourceBreakdown.filter(s => s.sourceType === 'student_paper');

  const renderSourceSection = (
    title: string,
    icon: React.ReactNode,
    sources: SourceBreakdown[],
  ) => {
    if (sources.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          {icon}
          {title}
          <Badge variant="secondary" className="text-xs">{sources.length}</Badge>
        </h4>
        {sources.map((source, i) => {
          const color = getSourceColor(source.sourceId);
          return (
            <div key={source.sourceId} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{source.sourceTitle}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{getSourceTypeLabel(source.sourceType)}</span>
                      <span>·</span>
                      <span>{source.matchedWords} words matched</span>
                      <span>·</span>
                      <span className="font-semibold">{source.percentageOfDocument}%</span>
                    </p>
                    {source.sourceUrl && (
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {source.sourceUrl.substring(0, 60)}{source.sourceUrl.length > 60 ? '...' : ''}
                      </a>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs shrink-0"
                  style={{ borderColor: color, color: color }}
                >
                  {source.matchCount} {source.matchCount === 1 ? 'match' : 'matches'}
                </Badge>
              </div>
              {/* Mini progress bar showing percentage */}
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: color,
                    width: `${Math.min(source.percentageOfDocument, 100)}%`,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderSourceSection('Internet Sources', <Globe className="h-3.5 w-3.5" />, internetSources)}
      {renderSourceSection('Publications', <BookOpen className="h-3.5 w-3.5" />, publications)}
      {renderSourceSection('Student Papers', <GraduationCap className="h-3.5 w-3.5" />, studentPapers)}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main PlagiarismReport Component
// ──────────────────────────────────────────────

export function PlagiarismReport({ report, documentContent }: PlagiarismReportProps) {
  const [segmentStates, setSegmentStates] = useState<Map<string, SegmentRewriteState>>(new Map());
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set());
  const [showAllSentences, setShowAllSentences] = useState(false);

  const flaggedSentences = (report.aiDetection.sentences || []).filter(s => s.isFlagged);
  const displaySentences = showAllSentences ? flaggedSentences : flaggedSentences.slice(0, 5);

  const matchRegions = report.plagiarism.matchRegions || [];
  const sourceBreakdown = report.plagiarism.sourceBreakdown || [];
  const totalWords = report.plagiarism.totalWords || 0;
  const matchedWords = report.plagiarism.matchedWords || 0;
  const excludedWords = report.plagiarism.excludedWords || 0;

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

  const getVerdictColor = (status: string) => {
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

  return (
    <div className="space-y-6">
      {/* Verdict Banner */}
      <div className={`rounded-xl border-l-4 p-4 ${getVerdictColor(report.verdict.status)}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
            report.verdict.status === 'original' ? 'text-emerald-600' :
            report.verdict.status === 'warning' ? 'text-amber-600' :
            report.verdict.status === 'flagged' ? 'text-orange-600' :
            'text-red-600'
          }`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">
                {report.verdict.label}
              </h3>
              <Badge className={getVerdictBadgeColor(report.verdict.status)} variant="outline">
                {report.verdict.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{report.verdict.description}</p>
          </div>
        </div>
      </div>

      {/* ── Turnitin-Style Score Banner ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Similarity Score Banner */}
        <Card className={`border-l-4 ${getSimScoreBorder(report.plagiarism.similarityScore)}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className={`h-5 w-5 ${getSimScoreColor(report.plagiarism.similarityScore)}`} />
              <span className="text-sm font-semibold text-muted-foreground">Similarity Score</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-4xl font-bold ${getSimScoreColor(report.plagiarism.similarityScore)}`}>
                {report.plagiarism.similarityScore}%
              </span>
            </div>
            <Progress
              value={report.plagiarism.similarityScore}
              className="h-2.5 mb-2"
            />
            <p className={`text-xs font-medium ${getSimScoreColor(report.plagiarism.similarityScore)}`}>
              {getSimScoreLabel(report.plagiarism.similarityScore)}
            </p>
            {totalWords > 0 && (
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>{totalWords} words total</span>
                <span className="font-medium text-gray-700">{matchedWords} matched</span>
                {excludedWords > 0 && (
                  <span className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    {excludedWords} excluded
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Score Gauge */}
        <ScoreGauge
          score={report.aiDetection.aiProbability}
          label="AI Content"
          description={report.aiDetection.aiProbability < 25 ? 'Likely human-written' :
                       report.aiDetection.aiProbability < 50 ? 'Possibly AI-assisted' :
                       report.aiDetection.aiProbability < 75 ? 'Likely AI-generated' : 'Very likely AI-generated'}
        />
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <div className="text-xs text-muted-foreground">AI Detection</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.plagiarism.totalFingerprints}</div>
              <div className="text-xs text-muted-foreground">Text Segments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Document Viewer with Inline Highlighting ── */}
      {documentContent && matchRegions.length > 0 && (
        <div>
          <h3 className="text-base font-bold flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" />
            Originality Report — Document Viewer
          </h3>
          <DocumentViewer documentContent={documentContent} matchRegions={matchRegions} />
        </div>
      )}

      {/* ── Source Panel (grouped by type) ── */}
      {sourceBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Matched Sources ({sourceBreakdown.length})
              {report.plagiarism.webSourcesSearched !== undefined && report.plagiarism.webSourcesSearched > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  +{report.plagiarism.webSourcesSearched} web sources
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            <SourcePanel sourceBreakdown={sourceBreakdown} />
          </CardContent>
        </Card>
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

      {/* AI Detection Details */}
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

      {/* Flagged Segments with Rewrite Buttons */}
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
