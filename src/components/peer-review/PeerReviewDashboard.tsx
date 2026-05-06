/**
 * NigWrite - Peer Review Dashboard
 * Lists assigned peer reviews with status badges, progress indicator,
 * and action buttons. Used by both students and instructors.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Eye,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ArrowRight,
  Loader2,
  FileText,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CriteriaScore {
  id: string;
  criteriaId: string;
  score: number;
  comment: string | null;
  criteria: { id: string; title: string; maxScore: number; weight: number };
}

interface PeerReviewItem {
  id: string;
  status: string;
  overallScore: number | null;
  overallComment: string | null;
  isAnonymous: boolean;
  completedAt: string | null;
  createdAt: string;
  assignment: { id: string; title: string };
  reviewer: { id: string; name: string | null; email: string };
  reviewee: { id: string; name: string | null; email: string };
  submission: {
    id: string;
    document: { id: string; title: string };
    student: { id: string; name: string | null; email: string } | null;
  };
  rubric: {
    id: string;
    title: string;
    criteria: Array<{ id: string; title: string; maxScore: number; weight: number }>;
  } | null;
  criteriaScores: CriteriaScore[];
}

interface PeerReviewDashboardProps {
  /** Filter by assignmentId (instructor mode) */
  assignmentId?: string;
  /** Filter by reviewerId (student mode - reviews I need to do) */
  reviewerId?: string;
  /** Filter by revieweeId (student mode - reviews I received) */
  revieweeId?: string;
  /** Mode: 'given' (reviews to do), 'received' (reviews I got), 'instructor' (all for assignment) */
  mode: 'given' | 'received' | 'instructor';
  /** Called when user clicks "Start Review" or "View" */
  onReviewAction: (reviewId: string, action: 'start' | 'continue' | 'view') => void;
}

export function PeerReviewDashboard({
  assignmentId,
  reviewerId,
  revieweeId,
  mode,
  onReviewAction,
}: PeerReviewDashboardProps) {
  const [reviews, setReviews] = useState<PeerReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (assignmentId) params.set('assignmentId', assignmentId);
      if (reviewerId) params.set('reviewerId', reviewerId);
      if (revieweeId) params.set('revieweeId', revieweeId);

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
  }, [assignmentId, reviewerId, revieweeId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const completedCount = reviews.filter(r => r.status === 'completed').length;
  const totalCount = reviews.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getActionBtn = (review: PeerReviewItem) => {
    if (review.status === 'completed') {
      return (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs h-7"
          onClick={() => onReviewAction(review.id, 'view')}
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
      );
    }
    if (review.status === 'in_progress') {
      return (
        <Button
          size="sm"
          className="gap-1 text-xs h-7 bg-[#008751] hover:bg-[#006b40]"
          onClick={() => onReviewAction(review.id, 'continue')}
        >
          <ArrowRight className="h-3 w-3" />
          Continue
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        className="gap-1 text-xs h-7 bg-[#008751] hover:bg-[#006b40]"
        onClick={() => onReviewAction(review.id, 'start')}
      >
        <Play className="h-3 w-3" />
        Start Review
      </Button>
    );
  };

  const getDisplayName = (review: PeerReviewItem) => {
    if (mode === 'given' || mode === 'instructor') {
      return review.isAnonymous
        ? 'Anonymous Student'
        : (review.reviewee.name || review.reviewee.email);
    }
    // received mode
    return review.isAnonymous
      ? 'Anonymous Reviewer'
      : (review.reviewer.name || review.reviewer.email);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      {mode !== 'received' && totalCount > 0 && (
        <Card className="border-[#008751]/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#008751]" />
                <span className="text-sm font-semibold">Review Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {progressPercent === 100 && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                All reviews completed!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">No peer reviews {mode === 'given' ? 'assigned' : mode === 'received' ? 'received' : 'created'}.</p>
            <p className="text-sm text-muted-foreground">
              {mode === 'given'
                ? 'Peer review assignments will appear here when your instructor assigns them.'
                : mode === 'received'
                ? 'Peer reviews on your submissions will appear here after reviewers complete them.'
                : 'Create peer review assignments from the setup panel above.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isExpanded = expandedReview === review.id;
            return (
              <Card key={review.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedReview(prev => prev === review.id ? null : review.id)}
                  className="w-full text-left"
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h4 className="text-sm font-medium truncate">{review.submission.document.title}</h4>
                          {getStatusBadge(review.status)}
                          {review.isAnonymous && (
                            <Badge variant="outline" className="text-[10px] gap-0.5">
                              <Star className="h-2.5 w-2.5" />
                              Anonymous
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getDisplayName(review)}</span>
                          <span>·</span>
                          <span>{review.assignment.title}</span>
                          <span>·</span>
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        {review.overallScore !== null && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs font-semibold text-[#008751]">
                              Score: {review.overallScore.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getActionBtn(review)}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardContent>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/20">
                    {review.overallComment && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Overall Comment</p>
                        <p className="text-sm bg-background p-2 rounded border">{review.overallComment}</p>
                      </div>
                    )}
                    {review.criteriaScores.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Criteria Breakdown</p>
                        <div className="space-y-1">
                          {review.criteriaScores.map((cs) => (
                            <div key={cs.id} className="flex items-center justify-between text-sm bg-background p-2 rounded border">
                              <span className="truncate">{cs.criteria.title}</span>
                              <span className="font-semibold text-xs shrink-0 ml-2">
                                {cs.score}/{cs.criteria.maxScore}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {review.completedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Completed: {new Date(review.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
