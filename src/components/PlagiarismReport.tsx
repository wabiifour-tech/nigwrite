/**
 * NigWrite - Plagiarism Report Component
 * Created by: Wabi The Tech Nurse
 *
 * Displays the full plagiarism report with highlighted text segments,
 * match details, and integrated "Fix This" rewrite buttons.
 * This is the core UI component of the NigWrite platform.
 */

'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreGauge } from '@/components/ScoreGauge';

// Types matching the API response
interface MatchDetail {
  text: string;
  sourceTitle: string;
  sourceUrl?: string;
  contribution: number;
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
    totalFingerprints: number;
    matchingFingerprints: number;
    flaggedSegments: string[];
    matches: MatchDetail[];
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

export function PlagiarismReport({ report, documentContent }: PlagiarismReportProps) {
  const [segmentStates, setSegmentStates] = useState<Map<string, SegmentRewriteState>>(new Map());
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set());

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

      {/* Score Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScoreGauge
          score={report.plagiarism.similarityScore}
          label="Plagiarism"
          description={report.plagiarism.similarityScore < 25 ? 'Low similarity' :
                       report.plagiarism.similarityScore < 50 ? 'Moderate similarity' :
                       report.plagiarism.similarityScore < 75 ? 'High similarity' : 'Very high similarity'}
        />
        <ScoreGauge
          score={report.aiDetection.aiProbability}
          label="AI Content"
          description={report.aiDetection.aiProbability < 25 ? 'Likely human-written' :
                       report.aiDetection.aiProbability < 50 ? 'Possibly AI-assisted' :
                       report.aiDetection.aiProbability < 75 ? 'Likely AI-generated' : 'Very likely AI-generated'}
        />
      </div>

      {/* Statistics Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scan Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.plagiarism.totalFingerprints}</div>
              <div className="text-xs text-muted-foreground">Total Fingerprints</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-orange-600">{report.plagiarism.matchingFingerprints}</div>
              <div className="text-xs text-muted-foreground">Matches Found</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.plagiarism.flaggedSegments.length}</div>
              <div className="text-xs text-muted-foreground">Flagged Segments</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.aiDetection.confidence}</div>
              <div className="text-xs text-muted-foreground">AI Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Detection Details */}
      {report.aiDetection.aiProbability > 25 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Content Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Perplexity: </span>
                <span className="font-semibold">{report.aiDetection.perplexity}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Burstiness: </span>
                <span className="font-semibold">{report.aiDetection.burstiness}%</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Vocab Diversity: </span>
                <span className="font-semibold">{(report.aiDetection.vocabularyDiversity * 100).toFixed(1)}%</span>
              </div>
            </div>
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

      {/* Source Matches */}
      {report.plagiarism.matches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Source Matches ({report.plagiarism.matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.plagiarism.matches.map((match, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMatch(i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{match.sourceTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      &quot;{match.text.substring(0, 80)}...&quot;
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
                  {/* Original Flagged Text */}
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

                    {/* Rewrite Button */}
                    {!state?.isDone && (
                      <Button
                        onClick={() => handleRewrite(segment, index)}
                        disabled={state?.isRewriting}
                        className="w-full sm:w-auto"
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

                    {/* Rewrite Result */}
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

                    {/* Rewritten Text */}
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

                        {/* Improvement Score */}
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
