/**
 * NigWrite - Grammar Report Component (E-rater Style)
 * Task ID: 2b
 *
 * Displays grammar/mechanics/style check results:
 * - Grammar score gauge (0-100) with color coding
 * - Issue list grouped by severity (errors/warnings/info)
 * - Each issue shows: original text highlighted, suggestion, category badge
 * - Click issue → scroll to position in document
 * - "Fix All" button that applies suggestions (using AI)
 */

'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Info,
  Loader2,
  SpellCheck,
  Type,
  MessageSquare,
  Wrench,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Filter,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface GrammarIssue {
  type: 'grammar' | 'spelling' | 'style' | 'mechanics';
  category: string;
  message: string;
  suggestion: string;
  position: { start: number; end: number };
  originalText: string;
  severity: 'error' | 'warning' | 'info';
}

export interface GrammarResult {
  issues: GrammarIssue[];
  score: number;
  statistics: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    categories: { category: string; count: number }[];
  };
}

interface GrammarReportProps {
  grammarResult: GrammarResult | null;
  documentContent: string;
  onFixAll?: (issues: GrammarIssue[]) => void;
}

// ──────────────────────────────────────────────
// Category Config
// ──────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'spelling': { label: 'Spelling', icon: <SpellCheck className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700 border-red-200' },
  'subject-verb-agreement': { label: 'Subject-Verb', icon: <Type className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'article-usage': { label: 'Articles', icon: <Type className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'verb-tense-consistency': { label: 'Tense', icon: <Wrench className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'passive-voice': { label: 'Passive Voice', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'wordiness': { label: 'Wordiness', icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'sentence-fragment': { label: 'Fragment', icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700 border-red-200' },
  'run-on-sentence': { label: 'Run-on', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'double-negatives': { label: 'Double Negative', icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700 border-red-200' },
  'commonly-confused-words': { label: 'Confused Words', icon: <Type className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || { label: category, icon: <CircleDot className="h-3.5 w-3.5" />, color: 'bg-gray-100 text-gray-700 border-gray-200' };
}

// ──────────────────────────────────────────────
// Score Color Helpers
// ──────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-50 border-emerald-200';
  if (score >= 75) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-amber-50 border-amber-200';
  if (score >= 40) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

// ──────────────────────────────────────────────
// Grammar Score Gauge Component
// ──────────────────────────────────────────────

function GrammarScoreGauge({ score }: { score: number }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold" style={{ color }}>{label}</div>
        <div className="text-xs text-muted-foreground">Grammar Score</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Severity Icon
// ──────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'error': return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'info': return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    default: return <CircleDot className="h-4 w-4 text-gray-400 shrink-0" />;
  }
}

function SeverityLabel({ severity }: { severity: string }) {
  switch (severity) {
    case 'error': return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Error</Badge>;
    case 'warning': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Warning</Badge>;
    case 'info': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Info</Badge>;
    default: return <Badge variant="outline" className="text-xs">{severity}</Badge>;
  }
}

// ──────────────────────────────────────────────
// Issue Card Component
// ──────────────────────────────────────────────

interface IssueCardProps {
  issue: GrammarIssue;
  documentContent: string;
  index: number;
}

function IssueCard({ issue, documentContent, index }: IssueCardProps) {
  const catConfig = getCategoryConfig(issue.category);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract context around the issue
  const contextStart = Math.max(0, issue.position.start - 30);
  const contextEnd = Math.min(documentContent.length, issue.position.end + 30);
  const contextBefore = documentContent.substring(contextStart, issue.position.start).trim();
  const contextAfter = documentContent.substring(issue.position.end, contextEnd).trim();
  const issueText = documentContent.substring(issue.position.start, issue.position.end);

  const isShortIssue = issue.originalText.length < 60;

  return (
    <div
      className="group rounded-lg border hover:shadow-sm transition-all cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3 p-3">
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <SeverityLabel severity={issue.severity} />
            <Badge variant="outline" className={`text-[10px] gap-1 ${catConfig.color}`}>
              {catConfig.icon}
              {catConfig.label}
            </Badge>
          </div>

          {/* Original text with highlight */}
          {!isExpanded ? (
            <p className="text-sm text-gray-700 line-clamp-1">
              {contextBefore && <span className="text-muted-foreground">...{contextBefore} </span>}
              <span className="bg-red-100 text-red-800 rounded px-0.5 font-medium">
                {isShortIssue ? issueText : issue.originalText}
              </span>
              {contextAfter && <span className="text-muted-foreground"> {contextAfter}...</span>}
            </p>
          ) : (
            <div className="space-y-2 mt-1">
              {/* Context */}
              <div className="bg-gray-50 rounded-md p-2.5 text-sm font-mono leading-relaxed">
                {contextBefore && <span className="text-muted-foreground">{contextBefore} </span>}
                <mark className="bg-red-100 text-red-800 rounded px-0.5 font-medium border border-red-200">
                  {issueText || issue.originalText}
                </mark>
                {contextAfter && <span className="text-muted-foreground"> {contextAfter}</span>}
              </div>

              {/* Message */}
              <p className="text-sm text-gray-700">{issue.message}</p>

              {/* Suggestion */}
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-md p-2.5">
                <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">{issue.suggestion}</p>
              </div>
            </div>
          )}

          {!isExpanded && (
            <p className="text-xs text-muted-foreground mt-1">{issue.message}</p>
          )}
        </div>

        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main GrammarReport Component
// ──────────────────────────────────────────────

export function GrammarReport({ grammarResult, documentContent, onFixAll }: GrammarReportProps) {
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const issuesContainerRef = useRef<HTMLDivElement>(null);

  const { score, issues, statistics } = grammarResult || {
    score: 0,
    issues: [],
    statistics: { totalIssues: 0, errors: 0, warnings: 0, info: 0, categories: [] },
  };

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  // Apply filters
  const filteredIssues = useMemo(() => {
    let result = issues;
    if (severityFilter.size > 0) {
      result = result.filter(i => !severityFilter.has(i.severity));
    }
    if (categoryFilter) {
      result = result.filter(i => i.category === categoryFilter);
    }
    return result;
  }, [issues, severityFilter, categoryFilter]);

  const toggleSeverityFilter = useCallback((severity: string) => {
    setSeverityFilter(prev => {
      const next = new Set(prev);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  }, []);

  const handleFixAll = useCallback(async () => {
    if (!onFixAll || errors.length === 0) return;
    setIsFixing(true);
    try {
      await onFixAll(errors);
    } finally {
      setIsFixing(false);
    }
  }, [onFixAll, errors]);

  // No results yet
  if (!grammarResult) {
    return null;
  }

  const noIssues = issues.length === 0;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#008751]/10 flex items-center justify-center">
              <SpellCheck className="h-4 w-4 text-[#008751]" />
            </div>
            <div>
              <CardTitle className="text-lg">Grammar & Mechanics Check</CardTitle>
              <CardDescription>E-rater style writing analysis</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score + Summary */}
        <div className={`rounded-xl border p-4 ${getScoreBg(score)}`}>
          <div className="flex items-center gap-6">
            <GrammarScoreGauge score={score} />

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{statistics.totalIssues}</div>
                <div className="text-[10px] text-muted-foreground">Total Issues</div>
              </div>
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <div className="text-xl font-bold text-red-600">{statistics.errors}</div>
                <div className="text-[10px] text-muted-foreground">Errors</div>
              </div>
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <div className="text-xl font-bold text-amber-600">{statistics.warnings}</div>
                <div className="text-[10px] text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{statistics.info}</div>
                <div className="text-[10px] text-muted-foreground">Info</div>
              </div>
            </div>
          </div>

          {/* Perfect score message */}
          {noIssues && (
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Excellent! No grammar issues detected.</span>
            </div>
          )}
        </div>

        {/* No issues — don't render the rest */}
        {noIssues ? null : (
          <>
            {/* Category Breakdown */}
            {statistics.categories.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Issue Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {statistics.categories.map(({ category, count }) => {
                    const config = getCategoryConfig(category);
                    const isActive = categoryFilter === category;
                    return (
                      <TooltipProvider key={category} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setCategoryFilter(isActive ? null : category)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border cursor-pointer ${
                                isActive
                                  ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                                  : 'bg-white hover:shadow-sm border-muted'
                              }`}
                            >
                              {config.icon}
                              {config.label}
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                              }`}>
                                {count}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {count} {count === 1 ? 'issue' : 'issues'} found
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Severity filter toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Show:</span>
              {[
                { severity: 'error', label: 'Errors', count: errors.length, activeColor: 'text-red-600 border-red-200 bg-red-50' },
                { severity: 'warning', label: 'Warnings', count: warnings.length, activeColor: 'text-amber-600 border-amber-200 bg-amber-50' },
                { severity: 'info', label: 'Info', count: info.length, activeColor: 'text-blue-600 border-blue-200 bg-blue-50' },
              ].map(({ severity, label, count, activeColor }) => (
                <button
                  key={severity}
                  onClick={() => toggleSeverityFilter(severity)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer ${
                    severityFilter.has(severity)
                      ? 'opacity-40 line-through bg-white'
                      : `bg-white hover:shadow-sm ${activeColor}`
                  }`}
                >
                  {label}
                  <span className="font-bold">{count}</span>
                </button>
              ))}
              {severityFilter.size > 0 && (
                <button
                  onClick={() => setSeverityFilter(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Show all
                </button>
              )}

              {/* Fix All button (for errors) */}
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFixAll}
                  disabled={isFixing || errors.length === 0}
                  className="gap-1.5 text-xs border-[#008751] text-[#008751] hover:bg-[#008751] hover:text-white"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Fix All ({errors.length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Issue List */}
            <div ref={issuesContainerRef} className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No issues match the current filters.
                  </p>
                </div>
              ) : (
                filteredIssues.map((issue, index) => (
                  <IssueCard
                    key={`${issue.position.start}-${index}`}
                    issue={issue}
                    documentContent={documentContent}
                    index={index}
                  />
                ))
              )}
            </div>

            {/* Summary footer */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Showing {filteredIssues.length} of {issues.length} issues
              {categoryFilter && ` in ${getCategoryConfig(categoryFilter).label}`}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
