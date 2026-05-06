/**
 * NigWrite - Student Submission History Component
 * Displays all student submissions across assignments in a table.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  FileText,
  Search,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Eye,
  ChevronDown,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SubmissionEntry {
  id: string;
  document: { id: string; title: string };
  student: { id: string; name: string | null; email: string } | null;
  report: { id: string; similarityScore: number; aiScore: number } | null;
  status: string;
  grade: number | string | null;
  createdAt: string;
  assignmentId: string;
  assignment?: { title: string };
}

interface StudentSubmissionHistoryProps {
  onViewReport: (submissionId: string, reportId: string) => void;
}

type SortField = 'date' | 'similarity' | 'aiScore' | 'grade';
type SortDirection = 'asc' | 'desc';

function getScoreBadge(score: number) {
  if (score < 25) return 'bg-emerald-100 text-emerald-700';
  if (score < 50) return 'bg-amber-100 text-amber-700';
  if (score < 75) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StudentSubmissionHistory({
  onViewReport,
}: StudentSubmissionHistoryProps) {
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignment, setFilterAssignment] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/submissions');
      const result = await response.json();
      if (result.success) {
        setSubmissions(result.data);
      } else {
        setError(result.error || 'Failed to load submissions');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Unique assignments for filter
  const uniqueAssignments = Array.from(
    new Map(
      submissions.map(s => [s.assignmentId, s.assignment?.title || s.assignmentId])
    ).entries()
  );

  // Filter and sort
  const filtered = submissions
    .filter(s => {
      if (filterAssignment !== 'all' && s.assignmentId !== filterAssignment) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.document.title.toLowerCase().includes(q) ||
          (s.assignment?.title || '').toLowerCase().includes(q) ||
          (s.student?.name || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'date':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'similarity':
          return dir * ((a.report?.similarityScore || 0) - (b.report?.similarityScore || 0));
        case 'aiScore':
          return dir * ((a.report?.aiScore || 0) - (b.report?.aiScore || 0));
        case 'grade':
          return dir * ((a.grade ? Number(a.grade) : 0) - (b.grade ? Number(b.grade) : 0));
        default:
          return 0;
      }
    });

  // Stats
  const totalSubmissions = submissions.length;
  const avgSimilarity = submissions.length > 0
    ? submissions.reduce((sum, s) => sum + (s.report?.similarityScore || 0), 0) / submissions.length
    : 0;

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Submitted</Badge>;
      case 'graded':
        return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Graded</Badge>;
      case 'flagged':
        return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Flagged</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#008751]" />
          Submission History
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={loadSubmissions}>
            <Loader2 className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Submissions</div>
          <div className="text-xl font-bold">{totalSubmissions}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Avg Similarity</div>
          <div className={avgSimilarity < 25 ? 'text-emerald-600' : avgSimilarity < 50 ? 'text-amber-600' : 'text-red-600'}>
            <span className="text-xl font-bold">
              {avgSimilarity.toFixed(1)}%
            </span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Assignments</div>
          <div className="text-xl font-bold">{uniqueAssignments.length}</div>
        </Card>
      </div>

      {/* Search and filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterAssignment} onValueChange={setFilterAssignment}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All assignments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignments</SelectItem>
            {uniqueAssignments.map(([id, title]) => (
              <SelectItem key={id} value={id}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[#008751]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading submissions...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 py-8">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No submissions found.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Document
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Submitted
                    <button
                      onClick={() => toggleSort('date')}
                      className="ml-1 inline-flex"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Similarity
                    <button
                      onClick={() => toggleSort('similarity')}
                      className="ml-1 inline-flex"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    AI Score
                    <button
                      onClick={() => toggleSort('aiScore')}
                      className="ml-1 inline-flex"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-medium truncate max-w-[150px]">{sub.document.title}</div>
                      <div className="text-muted-foreground text-[10px] truncate max-w-[150px]">
                        {sub.assignment?.title || ''}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div>{formatDate(sub.createdAt)}</div>
                      <div className="text-muted-foreground">{formatTime(sub.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      {sub.report ? (
                        <Badge className={`${getScoreBadge(sub.report.similarityScore)} text-[10px]`}>
                          {Math.round(sub.report.similarityScore)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      {sub.report ? (
                        <span className={sub.report.aiScore < 30 ? 'text-emerald-600' : sub.report.aiScore < 60 ? 'text-amber-600' : 'text-red-600'}>
                          {Math.round(sub.report.aiScore)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      {sub.grade != null ? (
                        <span className="font-medium">{sub.grade}</span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="p-3 text-right">
                      {sub.report && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => onViewReport(sub.id, sub.report!.id)}
                        >
                          <Eye className="h-2.5 w-2.5" />
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
