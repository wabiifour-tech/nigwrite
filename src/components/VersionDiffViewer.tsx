/**
 * NigWrite - Version Diff Viewer Component
 * Shows two versions of a document side by side with diff highlighting.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Columns2,
  Rows2,
  Plus,
  Minus,
  Equal,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DiffResult {
  version1: { id: string; title: string };
  version2: { id: string; title: string };
  additions: string[];
  deletions: string[];
  unchanged: string[];
  segments: DiffSegment[];
  stats: { added: number; removed: number; unchanged: number };
}

interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

interface VersionDiffViewerProps {
  version1Id: string;
  version2Id: string;
  onClose?: () => void;
}

export function VersionDiffViewer({
  version1Id,
  version2Id,
  onClose,
}: VersionDiffViewerProps) {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('side-by-side');

  const loadDiff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/submissions/diff?version1Id=${version1Id}&version2Id=${version2Id}`
      );
      const result = await response.json();
      if (result.success) {
        setDiff(result.data);
      } else {
        setError(result.error || 'Failed to load diff');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [version1Id, version2Id]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  // Split segments into lines for side-by-side view
  const getLines = useCallback((text: string): string[] => {
    return text.split('\n');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#008751]" />
        <span className="ml-2 text-sm text-muted-foreground">Computing diff...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-8">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!diff) return null;

  const { stats, segments, version1, version2 } = diff;

  // Build side-by-side line arrays
  const leftLines: Array<{ num: number; type: 'removed' | 'unchanged' | 'empty'; text: string }> = [];
  const rightLines: Array<{ num: number; type: 'added' | 'unchanged' | 'empty'; text: string }> = [];
  let leftNum = 0;
  let rightNum = 0;

  for (const seg of segments) {
    const lines = getLines(seg.text);
    if (seg.type === 'unchanged') {
      for (const line of lines) {
        leftNum++;
        rightNum++;
        leftLines.push({ num: leftNum, type: 'unchanged', text: line });
        rightLines.push({ num: rightNum, type: 'unchanged', text: line });
      }
    } else if (seg.type === 'removed') {
      for (const line of lines) {
        leftNum++;
        leftLines.push({ num: leftNum, type: 'removed', text: line });
        rightLines.push({ num: 0, type: 'empty', text: '' });
      }
    } else if (seg.type === 'added') {
      for (const line of lines) {
        rightNum++;
        leftLines.push({ num: 0, type: 'empty', text: '' });
        rightLines.push({ num: rightNum, type: 'added', text: line });
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">
            {version1.title} → {version2.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
            <Plus className="h-3 w-3" />
            {stats.added} added
          </Badge>
          <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200">
            <Minus className="h-3 w-3" />
            {stats.removed} removed
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Equal className="h-3 w-3" />
            {stats.unchanged} unchanged
          </Badge>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setViewMode('side-by-side')}
        >
          <Columns2 className="h-3.5 w-3.5" />
          Side by Side
        </Button>
        <Button
          variant={viewMode === 'inline' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setViewMode('inline')}
        >
          <Rows2 className="h-3.5 w-3.5" />
          Inline
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Diff content */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-2 gap-0 rounded-lg border overflow-hidden">
          {/* Left panel */}
          <div className="border-r">
            <div className="bg-gray-100 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
              {version1.title}
            </div>
            <div className="max-h-[500px] overflow-y-auto font-mono text-xs">
              {leftLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${
                    line.type === 'removed'
                      ? 'bg-red-50'
                      : line.type === 'empty'
                      ? 'bg-gray-50/50'
                      : ''
                  }`}
                >
                  <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-400 select-none border-r border-gray-100 py-0.5">
                    {line.num || ''}
                  </span>
                  <span className="flex-shrink-0 w-4 text-center select-none py-0.5 text-gray-400">
                    {line.type === 'removed' ? '-' : ' '}
                  </span>
                  <pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
                    {line.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div>
            <div className="bg-gray-100 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
              {version2.title}
            </div>
            <div className="max-h-[500px] overflow-y-auto font-mono text-xs">
              {rightLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-emerald-50'
                      : line.type === 'empty'
                      ? 'bg-gray-50/50'
                      : ''
                  }`}
                >
                  <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-400 select-none border-r border-gray-100 py-0.5">
                    {line.num || ''}
                  </span>
                  <span className="flex-shrink-0 w-4 text-center select-none py-0.5 text-gray-400">
                    {line.type === 'added' ? '+' : ' '}
                  </span>
                  <pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
                    {line.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Inline view */
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto font-mono text-xs">
              {segments.map((seg, i) => {
                const lines = getLines(seg.text);
                return lines.map((line, li) => (
                  <div
                    key={`${i}-${li}`}
                    className={`flex ${
                      seg.type === 'added'
                        ? 'bg-emerald-50'
                        : seg.type === 'removed'
                        ? 'bg-red-50'
                        : ''
                    }`}
                  >
                    <span className="flex-shrink-0 w-6 text-center select-none py-0.5 text-gray-400">
                      {seg.type === 'added' ? '+' : seg.type === 'removed' ? '-' : ' '}
                    </span>
                    <pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
                      {line}
                    </pre>
                  </div>
                ));
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
