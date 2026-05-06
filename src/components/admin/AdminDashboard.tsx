/**
 * NigWrite — Admin Dashboard
 * Main analytics dashboard with overview cards, charts, and activity feed.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, FileText, BarChart3, Shield, BookOpen, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Globe, Clock, Building2,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalDocuments: number;
    totalScans: number;
    totalAssignments: number;
    totalCourses: number;
    activeUsers: number;
  };
  similarityStats: {
    averageScore: number;
    medianScore: number;
    scoreDistribution: { range: string; count: number }[];
    highRiskCount: number;
    trend: { date: string; avgScore: number; scanCount: number }[];
  };
  aiDetectionStats: {
    averageAiScore: number;
    highRiskCount: number;
    trend: { date: string; avgAiScore: number }[];
  };
  topSources: { sourceTitle: string; matchCount: number; avgMatchPercent: number }[];
  departmentStats: { department: string; avgSimilarity: number; scanCount: number }[];
  recentActivity: { id: string; action: string; user: string; timestamp: string }[];
}

interface AdminDashboardProps {
  onNavigate?: (tab: string) => void;
}

const BUCKET_COLORS: Record<string, string> = {
  '0-10': 'bg-emerald-500',
  '11-20': 'bg-emerald-400',
  '21-30': 'bg-yellow-400',
  '31-40': 'bg-yellow-500',
  '41-50': 'bg-orange-400',
  '51-60': 'bg-orange-500',
  '61-70': 'bg-red-400',
  '71-80': 'bg-red-500',
  '81-90': 'bg-red-600',
  '91-100': 'bg-red-700',
};

function getScoreColor(score: number): string {
  if (score < 25) return 'text-emerald-600';
  if (score < 40) return 'text-yellow-600';
  if (score < 60) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score < 25) return 'bg-emerald-50 border-emerald-200';
  if (score < 40) return 'bg-yellow-50 border-yellow-200';
  if (score < 60) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    scan_document: 'Scanned a document',
    view_report: 'Viewed a report',
    grade_submission: 'Graded a submission',
    create_user: 'Created a user',
    update_user: 'Updated a user',
    deactivate_user: 'Deactivated a user',
    create_course: 'Created a course',
    update_course: 'Updated a course',
    archive_course: 'Archived a course',
    enroll_user: 'Enrolled a user',
    update_settings: 'Updated settings',
  };
  return map[action] || action.replace(/_/g, ' ');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchAnalytics} className="mt-3">Retry</Button>
      </div>
    );
  }
  if (!data) return null;

  const maxDist = Math.max(...data.similarityStats.scoreDistribution.map(d => d.count), 1);
  const maxTrendScore = Math.max(...data.similarityStats.trend.map(t => t.avgScore), 100);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard Overview</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Users', value: data.overview.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Documents Scanned', value: data.overview.totalDocuments, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Scans', value: data.overview.totalScans, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Submissions', value: data.overview.totalAssignments, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Active Courses', value: data.overview.totalCourses, icon: Globe, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'High-Risk', value: data.similarityStats.highRiskCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(item => (
          <Card key={item.label} className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Row: Average + Active */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Average Similarity Score</div>
            <div className={`text-3xl font-bold ${getScoreColor(data.similarityStats.averageScore)}`}>
              {data.similarityStats.averageScore.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Median: {data.similarityStats.medianScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Average AI Detection Score</div>
            <div className={`text-3xl font-bold ${getScoreColor(data.aiDetectionStats.averageAiScore)}`}>
              {data.aiDetectionStats.averageAiScore.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">{data.aiDetectionStats.highRiskCount} high-risk AI</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Active Users (this period)</div>
            <div className="text-3xl font-bold text-[#008751]">{data.overview.activeUsers}</div>
            <div className="text-xs text-muted-foreground mt-1">of {data.overview.totalUsers} total</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Similarity Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.similarityStats.scoreDistribution.map(bucket => (
                <div key={bucket.range} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 text-right shrink-0">{bucket.range}%</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className={`h-full ${BUCKET_COLORS[bucket.range] || 'bg-gray-400'} rounded transition-all duration-500`}
                      style={{ width: `${Math.max((bucket.count / maxDist) * 100, bucket.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right shrink-0">{bucket.count}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /> Low (0-25)</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-400" /> Medium (26-40)</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-orange-500" /> High (41-60)</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500" /> Critical (61-100)</div>
            </div>
          </CardContent>
        </Card>

        {/* Score Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.similarityStats.trend.length > 0 ? (
              <div className="relative">
                {/* SVG Line Chart */}
                <svg viewBox={`0 0 ${data.similarityStats.trend.length * 40} 160`} className="w-full h-40" preserveAspectRatio="none">
                  {/* Similarity line */}
                  <polyline
                    fill="none"
                    stroke="#008751"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={data.similarityStats.trend.map((t, i) => `${i * 40 + 20},${160 - (t.avgScore / maxTrendScore) * 140}`).join(' ')}
                  />
                  {/* AI line */}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={data.aiDetectionStats.trend.map((t, i) => `${i * 40 + 20},${160 - (t.avgAiScore / maxTrendScore) * 140}`).join(' ')}
                  />
                  {/* Dots */}
                  {data.similarityStats.trend.map((t, i) => (
                    <circle key={i} cx={i * 40 + 20} cy={160 - (t.avgScore / maxTrendScore) * 140} r="3" fill="#008751" />
                  ))}
                </svg>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-[#008751]" /> Similarity</div>
                  <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-orange-500 border-dashed" style={{ borderTop: '2px dashed #f97316' }} /> AI Detection</div>
                </div>
                {/* X-axis labels */}
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  {data.similarityStats.trend.length > 0 && (
                    <>
                      <span>{data.similarityStats.trend[0]?.date.slice(5)}</span>
                      <span>{data.similarityStats.trend[Math.floor(data.similarityStats.trend.length / 2)]?.date.slice(5)}</span>
                      <span>{data.similarityStats.trend[data.similarityStats.trend.length - 1]?.date.slice(5)}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Matched Sources */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Top Matched Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No matched sources found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 text-xs font-medium text-muted-foreground">#</th>
                      <th className="pb-2 text-xs font-medium text-muted-foreground">Source</th>
                      <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSources.map((source, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="py-2 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="py-2 text-xs truncate max-w-[300px]" title={source.sourceTitle}>{source.sourceTitle}</td>
                        <td className="py-2 text-right">
                          <Badge variant="secondary" className="text-xs">{source.matchCount}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
              <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
                <Clock className="h-3 w-3" />
                Auto-refresh
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
              ) : (
                data.recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-medium">{activity.user}</span>
                        <span className="text-muted-foreground"> {formatAction(activity.action)}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      {data.departmentStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Department Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Department</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Submissions</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Avg Similarity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departmentStats.map((dept, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="py-2 text-xs">{dept.department}</td>
                      <td className="py-2 text-right text-xs text-muted-foreground">{dept.scanCount}</td>
                      <td className="py-2 text-right">
                        <Badge variant="secondary" className={`text-xs ${getScoreColor(dept.avgSimilarity)}`}>
                          {dept.avgSimilarity.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Manage Users', icon: Users, tab: 'users', desc: 'View and manage user accounts' },
          { label: 'Manage Courses', icon: BookOpen, tab: 'courses', desc: 'Create and manage courses' },
          { label: 'Audit Logs', icon: Shield, tab: 'audit-logs', desc: 'View system activity logs' },
          { label: 'System Settings', icon: TrendingUp, tab: 'settings', desc: 'Configure platform settings' },
        ].map(item => (
          <button
            key={item.tab}
            onClick={() => onNavigate?.(item.tab)}
            className="p-4 rounded-xl border hover:border-[#008751] hover:bg-[#008751]/5 transition-colors text-left group"
          >
            <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-[#008751] mb-2 transition-colors" />
            <div className="text-sm font-medium">{item.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}
