'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  X,
} from 'lucide-react';

interface SubmissionRecord {
  id: string;
  title: string;
  date: string;
  similarityScore: number;
  aiScore: number;
  grade: string | null;
  status: string;
  wordCount: number;
  matchedSources: number;
  fileName: string;
  expanded?: boolean;
}

interface SubmissionHistoryProps {
  onViewReport?: (reportId: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
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

export default function SubmissionHistory({ onViewReport }: SubmissionHistoryProps) {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'similarityScore'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const perPage = 10;

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      if (data.success && data.data) {
        const records: SubmissionRecord[] = data.data.map(
          (r: {
            id: string;
            document: { title: string; contentBody: string; createdAt: string };
            similarityScore: number;
            aiScore: number;
            createdAt: string;
            flaggedSegments: { segmentText: string; similarityType: string }[];
          }) => ({
            id: r.id,
            title: r.document.title,
            date: r.createdAt,
            similarityScore: r.similarityScore || 0,
            aiScore: r.aiScore || 0,
            grade: null,
            status: 'completed',
            wordCount: r.document.contentBody ? r.document.contentBody.split(/\s+/).filter((w: string) => w.length > 0).length : 0,
            matchedSources: r.flaggedSegments?.filter((f: { similarityType: string }) => f.similarityType === 'plagiarism').length || 0,
            fileName: r.document.title,
          }),
        );
        setSubmissions(records);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const toggleSort = (field: 'date' | 'similarityScore') => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setScoreMin('');
    setScoreMax('');
    setPage(0);
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || scoreMin || scoreMax;

  const filtered = submissions
    .filter(s => {
      // Search filter
      if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Date range filter
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(s.date) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(s.date) > to) return false;
      }
      // Score range filter
      if (scoreMin !== '' && s.similarityScore < parseFloat(scoreMin)) return false;
      if (scoreMax !== '' && s.similarityScore > parseFloat(scoreMax)) return false;
      return true;
    })
    .sort((a, b) => {
      const valA = sortField === 'date' ? new Date(a.date).getTime() : a[sortField];
      const valB = sortField === 'date' ? new Date(b.date).getTime() : b[sortField];
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleExportCSV = () => {
    const headers = ['Title', 'Date', 'Similarity %', 'AI %', 'Words', 'Matched Sources'];
    const rows = filtered.map(s => [
      `"${s.title}"`,
      new Date(s.date).toLocaleDateString(),
      s.similarityScore.toFixed(1),
      s.aiScore.toFixed(1),
      s.wordCount.toString(),
      s.matchedSources.toString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nigwrite-submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Submission History</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} of {submissions.length} submissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by document title..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1"
              >
                <Filter className="h-3 w-3" />
                Filters
                {showFilters ? ' ▲' : ' ▼'}
              </Button>
              <Button
                variant={sortField === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('date')}
                className="gap-1"
              >
                <ArrowUpDown className="h-3 w-3" />
                Date
                {sortField === 'date' && (sortDir === 'desc' ? ' ↓' : ' ↑')}
              </Button>
              <Button
                variant={sortField === 'similarityScore' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('similarityScore')}
                className="gap-1"
              >
                <ArrowUpDown className="h-3 w-3" />
                Score
                {sortField === 'similarityScore' && (sortDir === 'desc' ? ' ↓' : ' ↑')}
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setPage(0); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setPage(0); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Min Similarity %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={scoreMin}
                    onChange={e => { setScoreMin(e.target.value); setPage(0); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max Similarity %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    value={scoreMax}
                    onChange={e => { setScoreMax(e.target.value); setPage(0); }}
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs text-muted-foreground">
                    <X className="h-3 w-3" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{hasActiveFilters ? 'No submissions match your filters' : 'No submissions found'}</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {paginated.map((sub) => (
                <div key={sub.id}>
                  <div
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                  >
                    {expandedId === sub.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{sub.title}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="whitespace-nowrap">{new Date(sub.date).toLocaleDateString()}</span>
                      <span>{sub.wordCount} words</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ScoreBadge score={sub.similarityScore} />
                      <ScoreBadge score={sub.aiScore} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === sub.id && (
                    <div className="px-4 pb-3 ml-8 space-y-2 border-t bg-muted/20 pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Date</span>
                          <p className="font-medium">{new Date(sub.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Word Count</span>
                          <p className="font-medium">{sub.wordCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Matched Sources</span>
                          <p className="font-medium">{sub.matchedSources}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Status</span>
                          <Badge variant="outline" className="text-xs mt-0.5">{sub.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {onViewReport && (
                          <Button size="sm" variant="outline" onClick={() => onViewReport(sub.id)} className="text-xs gap-1">
                            <FileText className="h-3 w-3" />
                            View Report
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
