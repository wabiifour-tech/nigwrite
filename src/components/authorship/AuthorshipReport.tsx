/**
 * NigWrite - Authorship Report Component
 * Visualizes writing style analysis with gauge, metrics, anomaly alerts,
 * and historical comparison.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BarChart3,
  TrendingUp,
  Fingerprint,
  Type,
  MessageSquare,
  BookOpen,
  ArrowLeftRight,
  Hash,
  Quote,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface WritingProfile {
  avgSentenceLength: number;
  avgWordLength: number;
  vocabularyRichness: number;
  sentenceLengthVariance: number;
  paragraphLengthAvg: number;
  transitionWordFrequency: number;
  passiveVoiceFrequency: number;
  punctuationPatterns: Record<string, number>;
  topWords: string[];
}

interface AuthorshipResult {
  profile: WritingProfile;
  consistencyScore: number;
  anomalyScore: number;
  anomalies: string[];
  comparisonWithHistory?: {
    isConsistent: boolean;
    matchScore: number;
    differences: string[];
  };
}

interface AuthorshipReportProps {
  documentContent?: string;
  userId?: string;
}

// ──────────────────────────────────────────────
// Authorship Confidence Gauge
// ──────────────────────────────────────────────

function AuthorshipGauge({ anomalyScore }: { anomalyScore: number }) {
  const confidence = 100 - anomalyScore;
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  const getColor = (s: number) => {
    if (s >= 75) return '#10b981';
    if (s >= 55) return '#f59e0b';
    if (s >= 35) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(clampedConfidence);
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedConfidence / 100) * circumference;

  const label =
    clampedConfidence >= 75
      ? 'Likely same author'
      : clampedConfidence >= 55
        ? 'Possibly same author'
        : clampedConfidence >= 35
          ? 'Possible different author'
          : 'Likely different author';

  const labelColor =
    clampedConfidence >= 75
      ? 'text-emerald-600'
      : clampedConfidence >= 55
        ? 'text-amber-600'
        : clampedConfidence >= 35
          ? 'text-orange-600'
          : 'text-red-600';

  const VerdictIcon = clampedConfidence >= 55 ? UserCheck : UserX;
  const verdictBg =
    clampedConfidence >= 75
      ? 'bg-emerald-50 border-emerald-200'
      : clampedConfidence >= 55
        ? 'bg-amber-50 border-amber-200'
        : clampedConfidence >= 35
          ? 'bg-orange-50 border-orange-200'
          : 'bg-red-50 border-red-200';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Gauge Circle */}
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
          <span className="text-3xl font-bold" style={{ color }}>
            {Math.round(clampedConfidence)}%
          </span>
        </div>
      </div>

      {/* Verdict Banner */}
      <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${verdictBg}`}>
        <VerdictIcon className={`h-5 w-5 shrink-0 ${labelColor}`} />
        <div className="text-center flex-1">
          <p className={`text-sm font-bold ${labelColor}`}>{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Authorship Confidence</p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Metric Bar Chart
// ──────────────────────────────────────────────

interface MetricItem {
  label: string;
  value: number;
  displayValue: string;
  max: number;
  icon: React.ReactNode;
  description: string;
}

function MetricBar({ metric }: { metric: MetricItem }) {
  const percentage = Math.min((metric.value / metric.max) * 100, 100);

  const getBarColor = (pct: number) => {
    if (pct < 30) return 'bg-emerald-500';
    if (pct < 60) return 'bg-amber-500';
    if (pct < 85) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{metric.icon}</span>
          <span className="text-xs font-medium text-gray-700">{metric.label}</span>
        </div>
        <span className="text-xs font-bold text-gray-900">{metric.displayValue}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{metric.description}</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Punctuation Radar
// ──────────────────────────────────────────────

function PunctuationChart({ patterns }: { patterns: Record<string, number> }) {
  const entries = Object.entries(patterns).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  const labelMap: Record<string, string> = {
    commas: 'Commas',
    semicolons: 'Semicolons',
    colons: 'Colons',
    dashes: 'Dashes',
    parentheses: 'Parentheses',
    exclamations: 'Exclamations',
    questions: 'Questions',
    quotes: 'Quotes',
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Quote className="h-3.5 w-3.5" />
        Punctuation Patterns (per 1000 words)
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-gray-800">
              {value.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">{labelMap[key] || key}</div>
            <div className="mt-1 h-1 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${(value / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Top Words Display
// ──────────────────────────────────────────────

function TopWordsDisplay({ words }: { words: string[] }) {
  if (!words || words.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Hash className="h-3.5 w-3.5" />
        Characteristic Vocabulary (Top 15)
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {words.slice(0, 15).map((word, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="text-xs font-normal"
          >
            {word}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Anomaly Alerts
// ──────────────────────────────────────────────

function AnomalyAlerts({ anomalies }: { anomalies: string[] }) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">No style anomalies detected — writing appears consistent</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Style Anomalies Detected ({anomalies.length})
      </h4>
      <div className="space-y-1.5">
        {anomalies.map((anomaly, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200"
          >
            <Badge
              className="bg-red-100 text-red-700 border-red-300 text-[10px] shrink-0 mt-0.5"
              variant="outline"
            >
              #{i + 1}
            </Badge>
            <p className="text-xs text-red-800 leading-relaxed">{anomaly}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Historical Comparison
// ──────────────────────────────────────────────

function HistoricalComparison({
  comparison,
}: {
  comparison: NonNullable<AuthorshipResult['comparisonWithHistory']>;
}) {
  const matchColor =
    comparison.matchScore >= 70
      ? 'text-emerald-600'
      : comparison.matchScore >= 50
        ? 'text-amber-600'
        : 'text-red-600';

  const matchBg =
    comparison.matchScore >= 70
      ? 'bg-emerald-50 border-emerald-200'
      : comparison.matchScore >= 50
        ? 'bg-amber-50 border-amber-200'
        : 'bg-red-50 border-red-200';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-teal-600" />
          Historical Writing Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Score */}
        <div className={`rounded-xl border p-4 ${matchBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Match with your previous writing</span>
            <span className={`text-xl font-bold ${matchColor}`}>{comparison.matchScore}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                comparison.matchScore >= 70
                  ? 'bg-emerald-500'
                  : comparison.matchScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${comparison.matchScore}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {comparison.isConsistent ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className={`text-xs font-medium ${matchColor}`}>
              {comparison.isConsistent ? 'Consistent with your writing history' : 'Significant deviation from your usual style'}
            </span>
          </div>
        </div>

        {/* Differences */}
        {comparison.differences.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground">Key Differences</h4>
            {comparison.differences.map((diff, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
              >
                <TrendingUp className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700">{diff}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Main AuthorshipReport Component
// ──────────────────────────────────────────────

export function AuthorshipReport({ documentContent, userId }: AuthorshipReportProps) {
  const [result, setResult] = useState<AuthorshipResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!documentContent || documentContent.trim().length < 50) {
      setError('Document content is too short for authorship analysis (minimum 50 characters).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/authorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: documentContent,
          userId: userId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Analysis failed');
        return;
      }

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [documentContent, userId]);

  // Auto-run when document content changes and component mounts
  useEffect(() => {
    if (documentContent && documentContent.trim().length >= 50) {
      runAnalysis();
    }
  }, [documentContent, runAnalysis]);

  // Loading state
  if (isLoading && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Analyzing Writing Style...</p>
          <p className="text-xs text-muted-foreground mt-1">Extracting linguistic features and comparing patterns</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Analysis Unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={runAnalysis}>
          Retry Analysis
        </Button>
      </div>
    );
  }

  // No content state
  if (!documentContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Fingerprint className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">No Document Available</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a document to analyze writing style</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { profile, consistencyScore, anomalyScore, anomalies, comparisonWithHistory } = result;

  // Build metrics for bar chart visualization
  const metrics: MetricItem[] = [
    {
      label: 'Avg. Sentence Length',
      value: profile.avgSentenceLength,
      displayValue: `${profile.avgSentenceLength.toFixed(1)} words`,
      max: 40,
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      description: 'Average number of words per sentence',
    },
    {
      label: 'Avg. Word Length',
      value: profile.avgWordLength,
      displayValue: `${profile.avgWordLength.toFixed(1)} chars`,
      max: 8,
      icon: <Type className="h-3.5 w-3.5" />,
      description: 'Average character length of words used',
    },
    {
      label: 'Vocabulary Richness',
      value: profile.vocabularyRichness * 100,
      displayValue: `${(profile.vocabularyRichness * 100).toFixed(1)}%`,
      max: 100,
      icon: <BookOpen className="h-3.5 w-3.5" />,
      description: 'Unique words ratio (type-token ratio)',
    },
    {
      label: 'Sentence Complexity',
      value: profile.sentenceLengthVariance,
      displayValue: `σ ${profile.sentenceLengthVariance.toFixed(1)}`,
      max: 15,
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      description: 'Variation in sentence lengths',
    },
    {
      label: 'Avg. Paragraph Length',
      value: profile.paragraphLengthAvg,
      displayValue: `${profile.paragraphLengthAvg.toFixed(0)} words`,
      max: 250,
      icon: <FileText className="h-3.5 w-3.5" />,
      description: 'Average number of words per paragraph',
    },
    {
      label: 'Transition Words',
      value: profile.transitionWordFrequency,
      displayValue: `${profile.transitionWordFrequency.toFixed(1)}%`,
      max: 15,
      icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
      description: 'Percentage of transitional words used',
    },
    {
      label: 'Passive Voice',
      value: profile.passiveVoiceFrequency,
      displayValue: `${profile.passiveVoiceFrequency.toFixed(1)}%`,
      max: 50,
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      description: 'Percentage of sentences with passive voice',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold text-teal-600">{Math.round(consistencyScore)}</div>
          <div className="text-xs text-muted-foreground">Consistency</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className={`text-2xl font-bold ${
            anomalyScore < 30 ? 'text-emerald-600' :
            anomalyScore < 55 ? 'text-amber-600' :
            anomalyScore < 75 ? 'text-orange-600' : 'text-red-600'
          }`}>
            {Math.round(anomalyScore)}
          </div>
          <div className="text-xs text-muted-foreground">Anomaly Score</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">{profile.topWords.length}</div>
          <div className="text-xs text-muted-foreground">Characteristic Words</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">{anomalies.length}</div>
          <div className="text-xs text-muted-foreground">Anomalies Found</div>
        </div>
      </div>

      {/* Authorship Gauge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-teal-600" />
            Authorship Verdict
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pt-2">
          <AuthorshipGauge anomalyScore={anomalyScore} />
        </CardContent>
      </Card>

      {/* Two Column: Metrics + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Writing Profile Metrics */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                Writing Profile Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.map((metric) => (
                <MetricBar key={metric.label} metric={metric} />
              ))}
            </CardContent>
          </Card>

          {/* Punctuation Patterns */}
          <Card>
            <CardContent className="pt-5">
              <PunctuationChart patterns={profile.punctuationPatterns} />
            </CardContent>
          </Card>

          {/* Top Words */}
          <Card>
            <CardContent className="pt-5">
              <TopWordsDisplay words={profile.topWords} />
            </CardContent>
          </Card>
        </div>

        {/* Anomalies Column */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Style Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnomalyAlerts anomalies={anomalies} />
            </CardContent>
          </Card>

          {/* Internal Consistency Detail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Internal Consistency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consistency Score</span>
                <span className="text-sm font-bold">{Math.round(consistencyScore)}/100</span>
              </div>
              <Progress value={consistencyScore} className="h-2" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {consistencyScore >= 80
                  ? 'The document has a highly consistent writing style throughout.'
                  : consistencyScore >= 60
                    ? 'The writing style is generally consistent with minor variations.'
                    : consistencyScore >= 40
                      ? 'Moderate inconsistencies detected in writing style across the document.'
                      : 'Significant style inconsistencies suggest possible multiple authors.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historical Comparison */}
      {comparisonWithHistory && comparisonWithHistory.matchScore >= 0 && (
        <HistoricalComparison comparison={comparisonWithHistory} />
      )}

      {/* No history notice */}
      {!comparisonWithHistory && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700">Historical comparison unavailable</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Log in to enable comparison with your previous submissions for more accurate authorship detection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={runAnalysis}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Fingerprint className="h-3.5 w-3.5" />
          )}
          Re-analyze
        </Button>
      </div>
    </div>
  );
}
