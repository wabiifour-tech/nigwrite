'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload,
  BarChart3,
  Brain,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Shield,
} from 'lucide-react';

interface DashboardStats {
  totalSubmissions: number;
  avgSimilarity: number;
  avgAiScore: number;
  pendingAssignments: number;
  recentScores: number[];
}

interface AssignmentItem {
  id: string;
  title: string;
  courseCode: string | null;
  deadline: string | null;
  status: 'not_submitted' | 'submitted' | 'graded';
}

interface RecentSubmission {
  id: string;
  title: string;
  date: string;
  similarityScore: number;
  aiScore: number;
  grade: string | null;
  status: string;
}

interface StudentDashboardProps {
  userName: string;
  onViewChange: (view: string) => void;
}

function ScoreBadge({ score, type }: { score: number; type: 'similarity' | 'ai' }) {
  const color =
    score < 15
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : score < 35
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : score < 60
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <Badge className={`${color} font-semibold px-2.5 py-0.5`}>
      {score.toFixed(1)}%
    </Badge>
  );
}

function ScoreTrend({ scores }: { scores: number[] }) {
  const maxScore = Math.max(...scores, 30);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-32">
        {scores.length === 0 ? (
          <div className="flex items-center justify-center w-full text-sm text-muted-foreground">
            No submissions yet
          </div>
        ) : (
          scores.map((score, i) => {
            const height = Math.max((score / maxScore) * 100, 5);
            const color =
              score < 15 ? 'bg-emerald-500' : score < 35 ? 'bg-amber-500' : score < 60 ? 'bg-orange-500' : 'bg-red-500';
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-medium text-muted-foreground">{score.toFixed(0)}%</span>
                <div className="w-full bg-muted rounded-t-md relative" style={{ height: '100px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t-md ${color} transition-all`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
              </div>
            );
          })
        )}
      </div>
      {scores.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>Average: <strong>{avg.toFixed(1)}%</strong></span>
        </div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDaysUntil(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function StudentDashboard({ userName, onViewChange }: StudentDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSubmissions: 0,
    avgSimilarity: 0,
    avgAiScore: 0,
    pendingAssignments: 0,
    recentScores: [],
  });
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch scan reports for stats
        const reportsRes = await fetch('/api/scan');
        const reportsData = await reportsRes.json();

        if (reportsData.success && reportsData.data.length > 0) {
          const reports = reportsData.data;
          const totalSubmissions = reports.length;
          const avgSimilarity = reports.reduce((sum: number, r: { similarityScore: number }) => sum + (r.similarityScore || 0), 0) / totalSubmissions;
          const avgAiScore = reports.reduce((sum: number, r: { aiScore: number }) => sum + (r.aiScore || 0), 0) / totalSubmissions;
          const recentScores = reports.slice(0, 5).map((r: { similarityScore: number }) => r.similarityScore || 0);

          const subs: RecentSubmission[] = reports.slice(0, 10).map((r: { id: string; document: { title: string; createdAt: string }; similarityScore: number; aiScore: number; createdAt: string }) => ({
            id: r.id,
            title: r.document.title,
            date: r.createdAt,
            similarityScore: r.similarityScore || 0,
            aiScore: r.aiScore || 0,
            grade: null,
            status: 'completed',
          }));

          setStats({ totalSubmissions, avgSimilarity, avgAiScore, pendingAssignments: 3, recentScores });
          setRecentSubmissions(subs);
        }

        // Fetch assignments
        const assignmentsRes = await fetch('/api/assignments');
        const assignmentsData = await assignmentsRes.json();
        if (assignmentsData.success && assignmentsData.data.length > 0) {
          const sortedAssignments = [...assignmentsData.data]
            .sort((a: { deadline: string | null }, b: { deadline: string | null }) => {
              if (!a.deadline) return 1;
              if (!b.deadline) return -1;
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            })
            .slice(0, 5)
            .map((a: { id: string; title: string; courseId: string | null; deadline: string | null; _count: { submissions: number } }) => ({
              id: a.id,
              title: a.title,
              courseCode: a.courseId,
              deadline: a.deadline,
              status: (a._count.submissions > 0 ? 'submitted' : 'not_submitted') as 'graded' | 'submitted' | 'not_submitted',
            }));

          setAssignments(sortedAssignments);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-br from-[#008751]/5 via-[#008751]/10 to-transparent border-[#008751]/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#008751] flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {getGreeting()}, {userName || 'Student'}! 👋
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Keep up the great work. Your academic integrity matters!
                </p>
              </div>
            </div>
            <Button
              onClick={() => onViewChange('scan')}
              className="gap-2 bg-[#008751] hover:bg-[#006b40] shrink-0"
            >
              <Upload className="h-4 w-4" />
              Submit New Paper
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Submissions',
            value: stats.totalSubmissions.toString(),
            icon: FileText,
            color: 'text-[#008751]',
            bg: 'bg-[#008751]/10',
          },
          {
            label: 'Avg. Similarity',
            value: `${stats.avgSimilarity.toFixed(1)}%`,
            icon: BarChart3,
            color: stats.avgSimilarity < 25 ? 'text-emerald-600' : stats.avgSimilarity < 50 ? 'text-amber-600' : 'text-red-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Avg. AI Score',
            value: `${stats.avgAiScore.toFixed(1)}%`,
            icon: Brain,
            color: stats.avgAiScore < 25 ? 'text-emerald-600' : stats.avgAiScore < 50 ? 'text-purple-600' : 'text-red-600',
            bg: 'bg-purple-50',
          },
          {
            label: 'Pending',
            value: stats.pendingAssignments.toString(),
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Assignments */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#008751]" />
                Upcoming Assignments
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onViewChange('courses')} className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[#008751]" />
                <p className="text-sm">No pending assignments</p>
                <p className="text-xs mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const daysLeft = assignment.deadline ? getDaysUntil(assignment.deadline) : null;
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onViewChange('scan')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{assignment.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {assignment.courseCode && (
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {assignment.courseCode}
                            </Badge>
                          )}
                          {daysLeft !== null && (
                            <span className={`text-xs ${daysLeft <= 2 ? 'text-red-600 font-semibold' : daysLeft <= 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={`text-xs shrink-0 ${
                          assignment.status === 'graded'
                            ? 'bg-emerald-100 text-emerald-700'
                            : assignment.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {assignment.status === 'graded'
                          ? 'Graded'
                          : assignment.status === 'submitted'
                            ? 'Submitted'
                            : 'Not Submitted'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Similarity Score Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#008751]" />
              Similarity Trend
            </CardTitle>
            <CardDescription>Last 5 submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreTrend scores={stats.recentScores} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#008751]" />
              Recent Submissions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onViewChange('history')} className="text-xs gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 text-[#008751]" />
              <p className="text-sm">No submissions yet</p>
              <p className="text-xs mt-1">Submit your first paper to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Document</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Similarity</th>
                    <th className="pb-2 font-medium">AI Score</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => onViewChange('dashboard')}
                    >
                      <td className="py-2.5 pr-4 max-w-[200px] truncate font-medium">{sub.title}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(sub.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-4">
                        <ScoreBadge score={sub.similarityScore} type="similarity" />
                      </td>
                      <td className="py-2.5 pr-4">
                        <ScoreBadge score={sub.aiScore} type="ai" />
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-xs">Completed</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onViewChange('selfcheck')}
        >
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#008751]/10 flex items-center justify-center group-hover:bg-[#008751]/20 transition-colors">
              <Sparkles className="h-5 w-5 text-[#008751]" />
            </div>
            <div>
              <p className="font-medium text-sm">Self-Check</p>
              <p className="text-xs text-muted-foreground">Check before submitting</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onViewChange('history')}
        >
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">All Submissions</p>
              <p className="text-xs text-muted-foreground">View full history</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onViewChange('profile')}
        >
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <GraduationCap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">My Profile</p>
              <p className="text-xs text-muted-foreground">View your stats</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </div>

      {/* Encouragement Banner */}
      <Card className="bg-gradient-to-r from-[#008751]/5 to-emerald-50 dark:to-[#008751]/10 border-[#008751]/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#008751] flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {stats.avgSimilarity < 15
                  ? "Amazing work! Your papers show excellent originality. Keep it up!"
                  : stats.avgSimilarity < 35
                    ? "Good progress! Your similarity scores are within a healthy range."
                    : "Tip: Consider reviewing flagged sections and adding proper citations to lower your similarity score."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
