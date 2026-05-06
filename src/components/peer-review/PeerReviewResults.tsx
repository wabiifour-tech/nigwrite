/**
 * NigWrite - Peer Review Results
 * Shows all peer reviews received on a submission with average scores,
 * per-review breakdown (anonymized if applicable), and criteria-level scores.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  Users,
  FileText,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

interface CriteriaScore {
  id: string;
  score: number;
  comment: string | null;
  criteria: { id: string; title: string; maxScore: number; weight: number };
}

interface ReviewData {
  id: string;
  status: string;
  overallScore: number | null;
  overallComment: string | null;
  isAnonymous: boolean;
  completedAt: string | null;
  createdAt: string;
  reviewer: { id: string; name: string | null; email: string };
  reviewee: { id: string; name: string | null; email: string };
  submission: {
    id: string;
    document: { id: string; title: string };
  };
  rubric: {
    id: string;
    title: string;
    criteria: Array<{ id: string; title: string; maxScore: number; weight: number }>;
  } | null;
  criteriaScores: CriteriaScore[];
}

interface PeerReviewResultsProps {
  /** Submission ID to fetch reviews for */
  submissionId?: string;
  /** Reviewee (student) ID to fetch received reviews */
  revieweeId?: string;
  /** Assignment ID filter */
  assignmentId?: string;
  /** Title for the component */
  title?: string;
}

export function PeerReviewResults({
  submissionId,
  revieweeId,
  assignmentId,
  title = 'Peer Review Results',
}: PeerReviewResultsProps) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (submissionId) params.set('submissionId', submissionId);
      if (revieweeId) params.set('revieweeId', revieweeId);
      if (assignmentId) params.set('assignmentId', assignmentId);
      params.set('status', 'completed');

      const res = await fetch(`/api/peer-reviews?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setReviews(result.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [submissionId, revieweeId, assignmentId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const completedReviews = reviews.filter(r => r.status === 'completed' && r.overallScore !== null);
  const avgScore = completedReviews.length > 0
    ? completedReviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / completedReviews.length
    : null;

  // Calculate per-criteria averages
  const criteriaAverages: Array<{
    criteriaId: string;
    title: string;
    maxScore: number;
    weight: number;
    avgScore: number;
    count: number;
  }> = [];

  if (completedReviews.length > 0) {
    const criteriaMap = new Map<string, { totalScore: number; count: number; title: string; maxScore: number; weight: number }>();

    for (const review of completedReviews) {
      for (const cs of review.criteriaScores) {
        const existing = criteriaMap.get(cs.criteria.id);
        if (existing) {
          existing.totalScore += cs.score;
          existing.count += 1;
        } else {
          criteriaMap.set(cs.criteria.id, {
            totalScore: cs.score,
            count: 1,
            title: cs.criteria.title,
            maxScore: cs.criteria.maxScore,
            weight: cs.criteria.weight,
          });
        }
      }
    }

    for (const [criteriaId, data] of criteriaMap) {
      criteriaAverages.push({
        criteriaId,
        title: data.title,
        maxScore: data.maxScore,
        weight: data.weight,
        avgScore: data.totalScore / data.count,
        count: data.count,
      });
    }

    criteriaAverages.sort((a, b) => b.weight - a.weight);
  }

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-[#008751]" />
        <h3 className="text-lg font-bold">{title}</h3>
      </div>

      {completedReviews.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No completed peer reviews yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Peer reviews will appear here after reviewers submit them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Average Score */}
            <Card className="border-[#008751]/20">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-5 w-5 text-[#008751] mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Average Peer Score</p>
                <p className={`text-3xl font-bold ${avgScore !== null && avgScore >= 60 ? 'text-[#008751]' : 'text-red-600'}`}>
                  {avgScore !== null ? avgScore.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  from {completedReviews.length} review{completedReviews.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            {/* Highest Score */}
            <Card>
              <CardContent className="pt-6 text-center">
                <Star className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Highest Score</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {Math.max(...completedReviews.map(r => r.overallScore || 0)).toFixed(1)}
                </p>
              </CardContent>
            </Card>

            {/* Lowest Score */}
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Lowest Score</p>
                <p className="text-3xl font-bold text-red-600">
                  {Math.min(...completedReviews.map(r => r.overallScore || 0)).toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Criteria Averages */}
          {criteriaAverages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Criteria Breakdown</CardTitle>
                <CardDescription>Average scores across all peer reviewers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {criteriaAverages.map((ca) => (
                  <div key={ca.criteriaId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{ca.title}</span>
                      <span className={`font-semibold shrink-0 ml-2 ${getScoreColor(ca.avgScore, ca.maxScore)}`}>
                        {ca.avgScore.toFixed(1)} / {ca.maxScore}
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${getBarColor(ca.avgScore, ca.maxScore)} transition-all`}
                        style={{ width: `${Math.min(100, (ca.avgScore / ca.maxScore) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {ca.count} review{ca.count !== 1 ? 's' : ''} · weight: {ca.weight}x
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Per-Review Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Individual Reviews</CardTitle>
              <CardDescription>Detailed breakdown from each peer reviewer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedReviews.map((review) => {
                const isExpanded = expandedReview === review.id;
                const reviewerName = review.isAnonymous
                  ? `Reviewer ${review.id.slice(-4)}`
                  : (review.reviewer.name || review.reviewer.email);

                return (
                  <div key={review.id} className="rounded-lg border overflow-hidden">
                    <button
                      onClick={() => setExpandedReview(prev => prev === review.id ? null : review.id)}
                      className="w-full text-left"
                    >
                      <div className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#008751]/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-[#008751]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{reviewerName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {review.isAnonymous && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 gap-0.5">
                                  <Star className="h-2 w-2" />
                                  Anonymous
                                </Badge>
                              )}
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {review.completedAt
                                  ? new Date(review.completedAt).toLocaleDateString()
                                  : new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#008751]">
                              {(review.overallScore || 0).toFixed(1)}
                            </p>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t px-3 py-3 bg-muted/20 space-y-3">
                        {/* Per-criteria scores */}
                        {review.criteriaScores.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Criteria Scores</p>
                            {review.criteriaScores.map((cs) => (
                              <div key={cs.id} className="flex items-center justify-between text-sm">
                                <span className="truncate">{cs.criteria.title}</span>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <Progress
                                    value={(cs.score / cs.criteria.maxScore) * 100}
                                    className="w-16 h-1.5"
                                  />
                                  <span className={`text-xs font-semibold ${getScoreColor(cs.score, cs.criteria.maxScore)}`}>
                                    {cs.score}/{cs.criteria.maxScore}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Overall comment */}
                        {review.overallComment && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Overall Comment</p>
                            <div className="p-2 rounded bg-background border text-sm">
                              {review.overallComment}
                            </div>
                          </div>
                        )}

                        {/* Per-criteria comments */}
                        {review.criteriaScores.some(cs => cs.comment) && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Detailed Feedback</p>
                            <div className="space-y-2">
                              {review.criteriaScores
                                .filter(cs => cs.comment)
                                .map(cs => (
                                  <div key={cs.id} className="p-2 rounded bg-background border text-sm">
                                    <p className="text-xs font-semibold text-[#008751] mb-0.5">{cs.criteria.title}</p>
                                    <p className="text-xs text-muted-foreground">{cs.comment}</p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
