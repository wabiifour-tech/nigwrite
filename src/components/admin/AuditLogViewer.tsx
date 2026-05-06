/**
 * NigWrite — Audit Log Viewer
 * Filterable table with export capability.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Shield, Search, Download, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';

interface AuditLogData {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  scan_document: 'bg-blue-100 text-blue-700',
  view_report: 'bg-cyan-100 text-cyan-700',
  grade_submission: 'bg-emerald-100 text-emerald-700',
  create_user: 'bg-purple-100 text-purple-700',
  update_user: 'bg-purple-100 text-purple-700',
  deactivate_user: 'bg-red-100 text-red-700',
  create_course: 'bg-orange-100 text-orange-700',
  update_course: 'bg-orange-100 text-orange-700',
  archive_course: 'bg-red-100 text-red-700',
  enroll_user: 'bg-emerald-100 text-emerald-700',
  update_settings: 'bg-gray-100 text-gray-700',
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (userFilter) params.set('userId', userFilter);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const result = await res.json();
      if (result.success) {
        setLogs(result.data.logs);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, actionFilter, startDate, endDate, userFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Details', 'IP Address'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toISOString(),
      l.user?.name || l.user?.email || 'System',
      l.action,
      l.resource,
      l.resourceId || '',
      l.details || '',
      l.ipAddress || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatAction = (action: string) => action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Audit Logs</h2>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Filter className="h-4 w-4" /> Filters:
            </div>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="scan_document">Scan Document</SelectItem>
                <SelectItem value="view_report">View Report</SelectItem>
                <SelectItem value="grade_submission">Grade Submission</SelectItem>
                <SelectItem value="create_user">Create User</SelectItem>
                <SelectItem value="update_user">Update User</SelectItem>
                <SelectItem value="create_course">Create Course</SelectItem>
                <SelectItem value="update_course">Update Course</SelectItem>
                <SelectItem value="update_settings">Update Settings</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="w-full sm:w-40" placeholder="Start Date" />
            <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="w-full sm:w-40" placeholder="End Date" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="User ID..." value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Resource</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={5} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td></tr>
                )) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />No audit logs found
                  </td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 truncate max-w-[150px]">
                      {log.user?.name || log.user?.email || 'System'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {formatAction(log.action)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      <span className="text-xs">{log.resource}{log.resourceId ? `: ${log.resourceId.slice(0, 8)}...` : ''}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs truncate max-w-[200px] hidden lg:table-cell">
                      {log.details ? (log.details.length > 60 ? log.details.slice(0, 60) + '...' : log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
