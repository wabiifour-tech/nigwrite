'use client';

/**
 * NigWrite — Revision Assistant UI Component
 * Displays signal check cards, overall score, progress bar, and AI revision suggestions.
 */

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Target,
  BookOpen,
  LayoutGrid,
  MessageSquare,
  Flag,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface SignalCheck {
  name: string;
  score: number;
  status: 'strong' | 'developing' | 'needs_work';
  feedback: string;
  suggestions: string[];
}

interface RevisionResult {
  overallScore: number;
  signals: SignalCheck[];
  revisionPrompt: string;
  aiRevisionPrompt?: string;
}

interface RevisionAssistantProps {
  text: string;
  title?: string;
}

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const SIGNAL_ICONS: Record<string, React.ElementType> = {
  'Thesis Clarity': Target,
  'Evidence Quality': BookOpen,
  'Organization': LayoutGrid,
  'Language': MessageSquare,
  'Conclusion': Flag,
};

const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  'Thesis Clarity': 'Is there a clear thesis statement in the first paragraph?',
  'Evidence Quality': 'Are there citations, data points, and specific examples?',
  'Organization': 'Are there clear transitions and logical paragraph ordering?',
  'Language': 'Word choice variety, sentence variation, and academic tone',
  'Conclusion': 'Does the conclusion summarize and provide closure?',
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreBgLight(score: number): string {
  if (score >= 70) return 'bg-emerald-50 border-emerald-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function getStatusIcon(status: string) {
  if (status === 'strong') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'developing') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function getStatusBadge(status: string) {
  if (status === 'strong')
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Strong</Badge>;
  if (status === 'developing')
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Developing</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Needs Work</Badge>;
}

function getOverallLabel(score: number): { label: string; description: string } {
  if (score >= 80) return { label: 'Excellent', description: 'Your writing is strong across all areas.' };
  if (score >= 60) return { label: 'Good', description: 'Solid writing with some areas for improvement.' };
  if (score >= 40) return { label: 'Fair', description: 'Several areas need attention before submission.' };
  if (score >= 20) return { label: 'Needs Improvement', description: 'Significant revision recommended.' };
  return { label: 'Early Draft', description: 'Your paper needs substantial work across most areas.' };
}

function getProgressColor(score: number): string {
  if (score >= 70) return '[&>div]:bg-emerald-500';
  if (score >= 40) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export function RevisionAssistant({ text, title }: RevisionAssistantProps) {
  const [result, setResult] = useState<RevisionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const strongCount = result?.signals.filter(s => s.status === 'strong').length ?? 0;
  const totalSignals = 5;

  const handleAnalyze = useCallback(async () => {
    if (text.trim().length < 20) {
      setError('Please enter at least 20 characters for meaningful feedback.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    setExpandedSignals(new Set());

    try {
      const response = await fetch('/api/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: title || undefined }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Analysis failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [text, title]);

  const handleGetAISuggestions = useCallback(async () => {
    if (!text.trim() || text.trim().length < 20) return;

    setIsAILoading(true);
    setError('');

    try {
      const response = await fetch('/api/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: title || undefined, useAI: true }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(prev => prev ? { ...prev, ...data.data } : data.data);
      } else {
        setError(data.error || 'AI suggestions failed.');
      }
    } catch {
      setError('Network error while generating AI suggestions.');
    } finally {
      setIsAILoading(false);
    }
  }, [text, title]);

  const toggleSignal = (name: string) => {
    setExpandedSignals(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#008751]/10 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-[#008751]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Writing Feedback</h3>
            <p className="text-xs text-muted-foreground">
              {wordCount} words · 5 signal checks
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {result && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Re-analyze
            </Button>
          )}
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || text.trim().length < 20}
            size="sm"
            className="gap-1.5 bg-[#008751] hover:bg-[#006b40] text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="h-3 w-3" />
                Analyze Writing
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-[#008751] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Analyzing your writing...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Checking thesis clarity, evidence, organization, language, and conclusion
              </p>
            </div>
            <div className="w-full max-w-xs space-y-2 mt-2">
              {['Thesis Clarity', 'Evidence Quality', 'Organization', 'Language', 'Conclusion'].map((name, i) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#008751] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  <span className="text-xs text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && result && (
        <>
          {/* Overall Score */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-[#008751]/5 to-transparent p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Score Circle */}
                  <div className="relative flex-shrink-0">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
                      <circle
                        cx="36" cy="36" r="30"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        className="text-muted/30"
                      />
                      <circle
                        cx="36" cy="36" r="30"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeDasharray={`${(result.overallScore / 100) * 188.5} 188.5`}
                        strokeLinecap="round"
                        className={getScoreBg(result.overallScore)}
                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${getScoreColor(result.overallScore)}`}>
                        {result.overallScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Revision Score</p>
                    <p className={`text-lg font-bold ${getScoreColor(result.overallScore)}`}>
                      {getOverallLabel(result.overallScore).label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getOverallLabel(result.overallScore).description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full sm:w-48 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Signals Strong</span>
                    <span className="font-semibold">{strongCount}/{totalSignals}</span>
                  </div>
                  <Progress
                    value={(strongCount / totalSignals) * 100}
                    className={`h-2 ${getProgressColor(result.overallScore)}`}
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {strongCount === totalSignals ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>
                      {strongCount === totalSignals
                        ? 'All signals are strong!'
                        : `${totalSignals - strongCount} area${totalSignals - strongCount > 1 ? 's' : ''} need attention`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Signal Check Cards */}
          <div className="space-y-2">
            {result.signals.map((signal) => {
              const Icon = SIGNAL_ICONS[signal.name] || Lightbulb;
              const description = SIGNAL_DESCRIPTIONS[signal.name] || '';
              const isExpanded = expandedSignals.has(signal.name);

              return (
                <Collapsible
                  key={signal.name}
                  open={isExpanded}
                  onOpenChange={() => toggleSignal(signal.name)}
                >
                  <Card className={`transition-colors ${getScoreBgLight(signal.score)} border`}>
                    <CollapsibleTrigger className="w-full text-left">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              signal.status === 'strong' ? 'bg-emerald-100' :
                              signal.status === 'developing' ? 'bg-amber-100' :
                              'bg-red-100'
                            }`}>
                              <Icon className={`h-4 w-4 ${
                                signal.status === 'strong' ? 'text-emerald-600' :
                                signal.status === 'developing' ? 'text-amber-600' :
                                'text-red-500'
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-sm font-semibold">{signal.name}</CardTitle>
                                {getStatusBadge(signal.status)}
                              </div>
                              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xl font-bold ${getScoreColor(signal.score)}`}>
                              {signal.score}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 px-4">
                        {/* Score bar */}
                        <div className="w-full bg-muted/50 rounded-full h-1.5 mb-3">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getScoreBg(signal.score)}`}
                            style={{ width: `${signal.score}%` }}
                          />
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          {signal.feedback}
                        </p>

                        {signal.suggestions.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold flex items-center gap-1">
                              <Lightbulb className="h-3 w-3 text-amber-500" />
                              Suggestions
                            </p>
                            <ul className="space-y-1">
                              {signal.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          {/* Guided Revision Prompt */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#008751]/10 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-[#008751]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Revision Guide</CardTitle>
                    <CardDescription className="text-xs">
                      {result.aiRevisionPrompt ? 'AI-powered revision plan' : 'Guided revision plan based on your scores'}
                    </CardDescription>
                  </div>
                </div>
                {getStatusIcon(result.overallScore >= 60 ? 'strong' : 'developing')}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {result.aiRevisionPrompt || result.revisionPrompt}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Revision Suggestions Button */}
          {!result.aiRevisionPrompt && (
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 dark:from-purple-950/20 dark:to-indigo-950/20 dark:border-purple-800">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Get AI Revision Suggestions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Generate a personalized, AI-powered revision plan with specific action steps
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleGetAISuggestions}
                    disabled={isAILoading || text.trim().length < 20}
                    size="sm"
                    className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                  >
                    {isAILoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Generate AI Plan
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State — no analysis yet */}
      {!isLoading && !result && !error && (
        <Card className="border-dashed">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#008751]/10 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-[#008751]" />
            </div>
            <div>
              <p className="text-sm font-medium">Ready to Analyze Your Writing</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Paste your essay or paper above and click &quot;Analyze Writing&quot; to get detailed
                feedback on thesis clarity, evidence, organization, language, and conclusion.
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {[
                { icon: Target, label: 'Thesis' },
                { icon: BookOpen, label: 'Evidence' },
                { icon: LayoutGrid, label: 'Structure' },
                { icon: MessageSquare, label: 'Language' },
                { icon: Flag, label: 'Conclusion' },
              ].map(({ icon: SigIcon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    <SigIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
