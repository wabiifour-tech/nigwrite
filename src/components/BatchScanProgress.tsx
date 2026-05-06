/**
 * NigWrite - Batch Scan Progress Component
 * Shows a list of files being scanned with status indicators and progress bars.
 */

'use client';

import { CheckCircle2, Clock, Loader2, AlertCircle, FileText, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export interface BatchFileItem {
  id: string;
  name: string;
  title: string;
  content: string;
  status: 'waiting' | 'scanning' | 'done' | 'error';
  progress: number;
  similarityScore?: number;
  aiScore?: number;
  reportId?: string;
  error?: string;
}

interface BatchScanProgressProps {
  files: BatchFileItem[];
}

function getStatusIcon(status: BatchFileItem['status']) {
  switch (status) {
    case 'waiting':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'scanning':
      return <Loader2 className="h-4 w-4 text-[#008751] animate-spin" />;
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
}

function getStatusLabel(status: BatchFileItem['status']) {
  switch (status) {
    case 'waiting': return 'Waiting';
    case 'scanning': return 'Scanning...';
    case 'done': return 'Complete';
    case 'error': return 'Error';
  }
}

function getScoreColor(score: number | undefined) {
  if (score === undefined) return 'text-muted-foreground';
  if (score < 25) return 'text-emerald-600';
  if (score < 50) return 'text-amber-600';
  return 'text-red-600';
}

export function BatchScanProgress({ files }: BatchScanProgressProps) {
  if (files.length === 0) return null;

  const completed = files.filter(f => f.status === 'done').length;
  const errored = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Batch Progress: {completed}/{files.length} completed
          {errored > 0 && <span className="text-red-500 ml-2">({errored} failed)</span>}
        </span>
        {files.some(f => f.status === 'scanning') && (
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Scanning in progress...
          </span>
        )}
      </div>

      {/* Overall Progress */}
      {files.length > 1 && (
        <Progress
          value={(completed + errored) / files.length * 100}
          className="h-2"
        />
      )}

      {/* File List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              file.status === 'error' ? 'border-red-200 bg-red-50/50' :
              file.status === 'done' ? 'border-emerald-200 bg-emerald-50/50' :
              file.status === 'scanning' ? 'border-[#008751]/30 bg-[#008751]/5' :
              'border-muted'
            }`}
          >
            {/* Status Icon */}
            {getStatusIcon(file.status)}

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0" />
                  {file.name}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {getStatusLabel(file.status)}
                </span>
              </div>

              {/* Progress Bar for scanning files */}
              {file.status === 'scanning' && (
                <Progress value={file.progress} className="h-1.5 mt-2" />
              )}

              {/* Scores for completed files */}
              {file.status === 'done' && file.similarityScore !== undefined && (
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-xs font-semibold ${getScoreColor(file.similarityScore)}`}>
                    Plagiarism: {file.similarityScore.toFixed(1)}%
                  </span>
                  <span className={`text-xs font-semibold ${getScoreColor(file.aiScore)}`}>
                    AI: {file.aiScore?.toFixed(1) ?? 'N/A'}%
                  </span>
                </div>
              )}

              {/* Error message */}
              {file.status === 'error' && file.error && (
                <p className="text-xs text-red-500 mt-1">{file.error}</p>
              )}
            </div>

            {/* Download button for completed files */}
            {file.status === 'done' && file.reportId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-[#008751] hover:bg-[#008751]/10"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reportId: file.reportId, format: 'html' }),
                    });
                    if (!response.ok) return;
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `NigWrite-Report-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {
                    // silent
                  }
                }}
                title="Download Report"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
