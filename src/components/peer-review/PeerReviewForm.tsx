/**
 * NigWrite - Peer Review Form
 * Shows submission text, rubric grid for per-criteria scoring,
 * overall score/comment, and submit button.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  CheckCircle2,
  Star,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface RubricCriteria {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  weight: number;
  order: number;
  levels: Array<{ id: string; label: string; description: string; score: number; order: number }>;
}

interface PeerReviewData {
  id: string;
  status: string;
  overallScore: number | null;
  overallComment: string | null;
  isAnonymous: boolean;
  assignment: { id: string; title: string; description: string };
  reviewer: { id: string; name: string | null; email: string };
  reviewee: { id: string; name: string | null; email: string };
  submission: {
    id: string;
    document: { id: string; title: string; contentBody: string };
    student: { id: string; name: string | null; email: string } | null;
    report: { id: string; similarityScore: number; aiScore: number } | null;
  };
  rubric: {
    id: string;
    title: string;
    description: string | null;
    criteria: RubricCriteria[];
  } | null;
  criteriaScores: Array<{
    id: string;
    criteriaId: string;
    score: number;
    comment: string | null;
  }>;
}

interface CriteriaScoreInput {
  criteriaId: string;
  score: number;
  comment: string;
}

interface PeerReviewFormProps {
  reviewId: string;
  onClose: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
}

export function PeerReviewForm({ reviewId, onClose, onSubmit, readOnly }: PeerReviewFormProps) {
  const [review, setReview] = useState<PeerReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [criteriaScores, setCriteriaScores] = useState<CriteriaScoreInput[]>([]);
  const [overallScore, setOverallScore] = useState<string>('');
  const [overallComment, setOverallComment] = useState('');

  const fetchReview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/peer-reviews/${reviewId}`);
      const result = await res.json();
      if (result.success) {
        setReview(result.data);

        // Initialize criteria scores from existing data
        if (result.data.rubric) {
          const initialScores: CriteriaScoreInput[] = result.data.rubric.criteria.map(c => {
            const existing = result.data.criteriaScores.find(
              cs => cs.criteriaId === c.id
            );
            return {
              criteriaId: c.id,
              score: existing ? existing.score : 0,
              comment: existing?.comment || '',
            };
          });
          setCriteriaScores(initialScores);
        }

        // Initialize overall score/comment
        if (result.data.overallScore !== null) {
          setOverallScore(result.data.overallScore.toString());
        }
        if (result.data.overallComment) {
          setOverallComment(result.data.overallComment);
        }
      } else {
        setError(result.error || 'Failed to load peer review');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // Auto-calculate overall score from criteria
  useEffect(() => {
    if (criteriaScores.length === 0 || !review?.rubric) return;

    const { totalWeightedScore, totalWeight } = criteriaScores.reduce(
      (acc, cs) => {
        const criterion = review.rubric!.criteria.find(c => c.id === cs.criteriaId);
        if (!criterion) return acc;
        return {
          totalWeightedScore: acc.totalWeightedScore + cs.score * criterion.weight,
          totalWeight: acc.totalWeight + criterion.weight,
        };
      },
      { totalWeightedScore: 0, totalWeight: 0 }
    );

    if (totalWeight > 0) {
      const calcScore = totalWeightedScore / totalWeight;
      setOverallScore(calcScore.toFixed(1));
    }
  }, [criteriaScores, review?.rubric]);

  const handleScoreChange = (criteriaId: string, value: string) => {
    setCriteriaScores(prev =>
      prev.map(cs =>
        cs.criteriaId === criteriaId
          ? { ...cs, score: parseFloat(value) || 0 }
          : cs
      )
    );
  };

  const handleCommentChange = (criteriaId: string, comment: string) => {
    setCriteriaScores(prev =>
      prev.map(cs =>
        cs.criteriaId === criteriaId
          ? { ...cs, comment }
          : cs
      )
    );
  };

  const handleSubmit = async () => {
    if (!review) return;

    // Validate all criteria have scores
    const unscored = criteriaScores.filter(cs => cs.score === 0);
    if (unscored.length > 0) {
      setError('Please score all criteria before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/peer-reviews/${reviewId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallScore: parseFloat(overallScore) || 0,
          overallComment: overallComment || undefined,
          criteriaScores: criteriaScores.map(cs => ({
            criteriaId: cs.criteriaId,
            score: cs.score,
            comment: cs.comment || undefined,
          })),
        }),
      });

      const result = await res.json();
      if (result.success) {
        onSubmit();
      } else {
        setError(result.error || 'Failed to submit review');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCompleted = review?.status === 'completed';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !review) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={onClose} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!review) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-bold">Peer Review</h2>
            <p className="text-sm text-muted-foreground">
              {review.assignment.title}
              {review.isAnonymous && (
                <Badge variant="outline" className="ml-2 text-xs gap-0.5">
                  <Star className="h-2.5 w-2.5" />
                  Anonymous
                </Badge>
              )}
            </p>
          </div>
        </div>
        {isCompleted && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Submitted
          </Badge>
        )}
      </div>

      {/* Submission Document */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#008751]" />
            Submission to Review
          </CardTitle>
          <CardDescription className="text-xs">
            Reviewing: {review.submission.document.title}
            {review.isAnonymous && ' — Reviewer identity is hidden'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {review.submission.document.contentBody || 'No content available.'}
          </div>
          {review.submission.report && (
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>Plagiarism: <strong className={review.submission.report.similarityScore < 25 ? 'text-emerald-600' : review.submission.report.similarityScore < 50 ? 'text-amber-600' : 'text-red-600'}>{review.submission.report.similarityScore.toFixed(1)}%</strong></span>
              <span>AI: <strong className={review.submission.report.aiScore < 25 ? 'text-emerald-600' : review.submission.report.aiScore < 50 ? 'text-amber-600' : 'text-red-600'}>{review.submission.report.aiScore.toFixed(1)}%</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rubric Grid */}
      {review.rubric && review.rubric.criteria.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              {review.rubric.title || 'Grading Rubric'}
            </CardTitle>
            {review.rubric.description && (
              <CardDescription>{review.rubric.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {review.rubric.criteria.map((criterion) => {
              const currentScore = criteriaScores.find(
                cs => cs.criteriaId === criterion.id
              );
              const scoreValue = currentScore?.score || 0;

              return (
                <div
                  key={criterion.id}
                  className="p-4 rounded-lg border bg-background space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{criterion.title}</h4>
                      {criterion.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {criterion.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-muted-foreground">Score:</Label>
                      <Select
                        value={scoreValue.toString()}
                        onValueChange={(v) => handleScoreChange(criterion.id, v)}
                        disabled={readOnly || isCompleted}
                      >
                        <SelectTrigger className="w-20 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: Math.floor(criterion.maxScore) + 1 },
                            (_, i) => i
                          ).map((val) => (
                            <SelectItem key={val} value={val.toString()}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">/ {criterion.maxScore}</span>
                    </div>
                  </div>

                  {/* Rubric Levels (if available) */}
                  {criterion.levels.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {criterion.levels.map((level) => (
                        <div
                          key={level.id}
                          className={`text-xs p-2 rounded border transition-colors ${
                            scoreValue === level.score
                              ? 'border-[#008751] bg-[#008751]/5'
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold">{level.label}</span>
                            <span className="text-muted-foreground">{level.score} pts</span>
                          </div>
                          <p className="text-muted-foreground">{level.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per-criteria comment */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      Comment for this criterion (optional)
                    </Label>
                    <Textarea
                      placeholder="Add specific feedback..."
                      value={currentScore?.comment || ''}
                      onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                      disabled={readOnly || isCompleted}
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Overall Score & Comment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overall-score">Overall Score</Label>
              <input
                id="overall-score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={overallScore}
                onChange={(e) => setOverallScore(e.target.value)}
                disabled={readOnly || isCompleted}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {review.rubric ? 'Auto-calculated from weighted criteria' : 'Enter overall score (0-100)'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overall-comment">Overall Comment</Label>
            <Textarea
              id="overall-comment"
              placeholder="Provide your overall assessment of this submission. Highlight strengths and areas for improvement..."
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              disabled={readOnly || isCompleted}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      {!readOnly && !isCompleted && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 bg-[#008751] hover:bg-[#006b40]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Review
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
