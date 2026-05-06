/**
 * NigWrite - Version History Component
 * Displays timeline of all submission versions with scores and actions.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Eye,
  GitCompare,
  Plus,
  CheckCircle2,
  FileEdit,
  Clock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VersionEntry {
  id: string;
  version: number;
  isDraft: boolean;
  status: string;
  createdAt: string;
  document: { id: string; title: string };
  parentVersionId: string | null;
  report: { id: string; similarityScore: number; aiScore: number } | null;
}

interface VersionHistoryProps {
  submissionId: string;
  currentVersion: number;
  onViewVersion: (submissionId: string, reportId: string) => void;
  onCompare: (version1Id: string, version2Id: string) => void;
  allowResubmission?: boolean;
  maxResubmissions?: number;
}

function getScoreColor(score: number): string {
  if (score < 25) return 'bg-emerald-500';
  if (score < 50) return 'bg-amber-500';
  if (score < 75) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreRingColor(score: number): string {
  if (score < 25) return 'text-emerald-600';
  if (score < 50) return 'text-amber-600';
  if (score < 75) return 'text-orange-600';
  return 'text-red-600';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VersionHistory({
  submissionId,
  currentVersion,
  onViewVersion,
  onCompare,
  allowResubmission = true,
  maxResubmissions = 5,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparing, setComparing] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/submissions/versions?submissionId=${submissionId}`
      );
      const result = await response.json();
      if (result.success) {
        setVersions(result.data);
      } else {
        setError(result.error || 'Failed to load versions');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCompare = (versionId: string) => {
    if (comparing === null) {
      setComparing(versionId);
    } else {
      onCompare(comparing, versionId);
      setComparing(null);
    }
  };

  // Score trend sparkline
  const similarityScores = versions.map(v => v.report?.similarityScore || 0);
  const maxScore = Math.max(...similarityScores, 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#008751]" />
          <h3 className="text-lg font-semibold">Version History</h3>
          <Badge variant="secondary" className="text-xs">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {allowResubmission && versions.length < maxResubmissions && (
          <Button
            size="sm"
            className="gap-1.5 bg-[#008751] hover:bg-[#006b40] text-xs"
            onClick={() => {
              // Trigger parent callback - handled by parent component
              const event = new CustomEvent('nigwrite:resubmit', {
                detail: { submissionId: versions[versions.length - 1]?.id || submissionId },
              });
              window.dispatchEvent(event);
            }}
          >
            <Plus className="h-3 w-3" />
            Submit New Version
          </Button>
        )}
      </div>

      {/* Score Trend Sparkline */}
      {versions.length > 1 && (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">Score Trend</span>
              <svg width="120" height="32" className="flex-shrink-0">
                {similarityScores.length > 1 && similarityScores.map((score, i) => {
                  const x = (i / (similarityScores.length - 1)) * 100 + 10;
                  const y = 28 - (score / maxScore) * 24;
                  const prevX = i > 0 ? ((i - 1) / (similarityScores.length - 1)) * 100 + 10 : x;
                  const prevY = i > 0 ? 28 - (similarityScores[i - 1] / maxScore) * 24 : y;
                  return (
                    <g key={i}>
                      {i > 0 && (
                        <line x1={prevX} y1={prevY} x2={x} y2={y} stroke="#008751" strokeWidth="1.5" />
                      )}
                      <circle cx={x} cy={y} r="3" fill={getScoreColor(score)} />
                    </g>
                  );
                })}
              </svg>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>V1: {similarityScores[0] || 0}%</span>
                {similarityScores.length > 1 && (
                  <span>Latest: {similarityScores[similarityScores.length - 1] || 0}%</span>
                )}
                {similarityScores.length >= 2 && (() => {
                  const diff = (similarityScores[similarityScores.length - 1] || 0) - (similarityScores[0] || 0);
                  return (
                    <span className={diff < 0 ? 'text-emerald-600 font-semibold' : diff > 0 ? 'text-red-600 font-semibold' : ''}>
                      {diff < 0 ? '' : diff > 0 ? '+' : ''}{diff}%
                    </span>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#008751]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading versions...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 py-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No versions found.
        </div>
      ) : (
        <div className="space-y-2">
          {[...versions].reverse().map((version, idx) => (
            <div
              key={version.id}
              className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all ${
                version.version === currentVersion
                  ? 'border-[#008751] bg-[#008751]/5'
                  : comparing === version.id
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/20'
              }`}
            >
              {/* Timeline connector */}
              {idx < versions.length - 1 && (
                <div className="absolute left-[18px] top-[42px] bottom-0 w-px bg-muted" />
              )}

              {/* Version badge */}
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    version.version === currentVersion
                      ? 'bg-[#008751] text-white border-[#008751]'
                      : 'bg-background text-muted-foreground border-muted-foreground/30'
                  }`}
                >
                  v{version.version}
                </div>
              </div>

              {/* Version info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{version.document.title}</span>
                  {version.isDraft && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-amber-50 text-amber-700 border-amber-200">
                      <FileEdit className="h-2.5 w-2.5" />
                      Draft
                    </Badge>
                  )}
                  {!version.isDraft && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Final
                    </Badge>
                  )}
                  {version.version === currentVersion && (
                    <Badge className="text-[10px] bg-[#008751] text-white border-[#008751]">Current</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(version.createdAt)}
                  </span>
                  {version.report && (
                    <>
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${getScoreColor(version.report.similarityScore)}`} />
                        {Math.round(version.report.similarityScore)}% similarity
                      </span>
                      <span className={getScoreRingColor(version.report.aiScore)}>
                        {Math.round(version.report.aiScore)}% AI
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {version.report && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => onViewVersion(version.id, version.report!.id)}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                )}
                {comparing !== null && comparing !== version.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700"
                    onClick={() => handleCompare(version.id)}
                  >
                    <GitCompare className="h-3 w-3" />
                    Compare
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs gap-1 ${
                    comparing === version.id ? 'bg-amber-100 text-amber-700' : ''
                  }`}
                  onClick={() => {
                    if (comparing === version.id) {
                      setComparing(null);
                    } else {
                      setComparing(version.id);
                    }
                  }}
                >
                  <GitCompare className="h-3 w-3" />
                  {comparing === version.id ? 'Cancel' : 'Select'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compare hint */}
      {comparing && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Select another version to compare with <strong>v{versions.find(v => v.id === comparing)?.version}</strong></span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs ml-auto"
            onClick={() => setComparing(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Max resubmissions warning */}
      {versions.length >= maxResubmissions && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Maximum resubmissions reached ({maxResubmissions}). No more versions can be submitted.</span>
        </div>
      )}
    </div>
  );
}
