/**
 * NigWrite - Shared Report Page
 * PUBLIC page (no auth required) for viewing shared plagiarism reports.
 * /shared/report/[token]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Eye,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  PenTool,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SharedReportData {
  report: {
    id: string;
    similarityScore: number;
    aiScore: number;
    createdAt: string;
  };
  document: {
    id: string;
    title: string;
    contentBody: string;
  };
  flaggedSegments: Array<{
    segmentText: string;
    sourceLink: string | null;
    similarityType: string;
  }>;
  shareInfo: {
    expiresAt: string | null;
    maxViews: number | null;
    currentViews: number;
    createdAt: string;
    creatorName: string | null;
  };
}

function getScoreColor(score: number): string {
  if (score < 25) return 'text-emerald-600';
  if (score < 50) return 'text-amber-600';
  if (score < 75) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score < 25) return 'bg-emerald-500';
  if (score < 50) return 'bg-amber-500';
  if (score < 75) return 'bg-orange-500';
  return 'bg-red-500';
}

function getVerdict(score: number) {
  if (score < 15) return { label: 'Original Work', bg: 'bg-emerald-50 border-emerald-500 text-emerald-700' };
  if (score < 35) return { label: 'Minor Similarity', bg: 'bg-amber-50 border-amber-500 text-amber-700' };
  if (score < 60) return { label: 'Significant Similarity', bg: 'bg-orange-50 border-orange-500 text-orange-700' };
  return { label: 'High Similarity', bg: 'bg-red-50 border-red-500 text-red-700' };
}

export default function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [reportData, setReportData] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  const loadReport = useCallback(async (tokenVal: string, passVal?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/reports/view?token=${encodeURIComponent(tokenVal)}` +
        (passVal ? `&password=${encodeURIComponent(passVal)}` : '');
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else if (result.error === 'PASSWORD_REQUIRED') {
        setShowPasswordInput(true);
      } else {
        setError(result.error || 'Failed to load report');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadReport(token);
    }
  }, [token, loadReport]);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return;
    setVerifyingPassword(true);
    await loadReport(token, password);
    setVerifyingPassword(false);
  };

  // Initial loading state
  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg">
            <div className="absolute inset-0 flex">
              <div className="w-[30%] bg-[#008751]" />
              <div className="w-[40%] bg-white" />
              <div className="w-[30%] bg-[#008751]" />
            </div>
            <PenTool className="h-7 w-7 text-white relative z-10" strokeWidth={2} />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-[#008751]" />
          <span className="text-sm text-muted-foreground">Loading report...</span>
        </div>
      </div>
    );
  }

  // Password required
  if (showPasswordInput && !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-lg">Password Required</CardTitle>
            <p className="text-sm text-muted-foreground">
              This report is password protected. Enter the password to view it.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <Button
              onClick={handlePasswordSubmit}
              disabled={!password.trim() || verifyingPassword}
              className="w-full bg-[#008751] hover:bg-[#006b40]"
            >
              {verifyingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'View Report'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to View Report</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) return null;

  const { report, document, flaggedSegments, shareInfo } = reportData;
  const verdict = getVerdict(report.similarityScore);
  const plagiarismSegments = flaggedSegments.filter(s => s.similarityType === 'plagiarism');
  const aiSegments = flaggedSegments.filter(s => s.similarityType === 'ai_generated');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-[#008751]" />
                <div className="w-[40%] bg-white" />
                <div className="w-[30%] bg-[#008751]" />
              </div>
              <PenTool className="h-4 w-4 text-white relative z-10" strokeWidth={2} />
            </div>
            <span className="font-bold text-sm">
              Nig<span className="text-[#008751]">Write</span>
            </span>
          </div>
          <Badge variant="secondary" className="text-xs gap-1">
            <Shield className="h-3 w-3" />
            Shared Report
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Report title */}
        <div>
          <h1 className="text-xl font-bold">{document.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scanned on {new Date(report.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Verdict banner */}
        <div className={`rounded-lg border-l-4 p-4 ${verdict.bg}`}>
          <div className="flex items-center gap-2">
            <h2 className="font-bold">{verdict.label}</h2>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Similarity Score */}
          <Card>
            <CardContent className="pt-5">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-2">Similarity Index</div>
                <div className={`text-4xl font-bold ${getScoreColor(report.similarityScore)}`}>
                  {Math.round(report.similarityScore)}%
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreBgColor(report.similarityScore)}`}
                    style={{ width: `${Math.min(report.similarityScore, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Detection Score */}
          <Card>
            <CardContent className="pt-5">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-2">AI Detection</div>
                <div className={`text-4xl font-bold ${getScoreColor(report.aiScore)}`}>
                  {Math.round(report.aiScore)}%
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreBgColor(report.aiScore)}`}
                    style={{ width: `${Math.min(report.aiScore, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flagged segments */}
        {plagiarismSegments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Flagged for Plagiarism</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {plagiarismSegments.map((seg, i) => (
                  <div key={i} className="p-2.5 rounded bg-red-50 border border-red-200">
                    <p className="text-sm text-gray-700">{seg.segmentText}</p>
                    {seg.sourceLink && (
                      <a
                        href={seg.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                      >
                        Source <ArrowRight className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Document Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                {document.contentBody}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Share info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-3">
            {shareInfo.creatorName && (
              <span>Shared by {shareInfo.creatorName}</span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {shareInfo.currentViews} view{shareInfo.currentViews !== 1 ? 's' : ''}
              {shareInfo.maxViews && ` of ${shareInfo.maxViews}`}
            </span>
            {shareInfo.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires {new Date(shareInfo.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            <PenTool className="h-3 w-3" />
            Shared by NigWrite
          </span>
        </div>
      </main>
    </div>
  );
}
