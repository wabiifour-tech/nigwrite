'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  Brain,
  RefreshCw,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';

interface SelfCheckResult {
  similarityScore: number;
  aiScore: number;
  maxScore: number;
  wordCount: number;
  suggestions: string[];
}

function getResultColor(score: number): string {
  if (score < 15) return 'text-emerald-600';
  if (score < 35) return 'text-amber-600';
  if (score < 60) return 'text-orange-600';
  return 'text-red-600';
}

function getResultBg(score: number): string {
  if (score < 15) return 'bg-emerald-50 border-emerald-200';
  if (score < 35) return 'bg-amber-50 border-amber-200';
  if (score < 60) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

function getResultMessage(score: number): string {
  if (score < 15) return 'This looks great to submit!';
  if (score < 25) return 'Minor issues found — consider adding citations.';
  if (score < 35) return 'Some flagged sections — review and revise before submitting.';
  if (score < 60) return 'Significant issues detected — revision recommended.';
  return 'High similarity detected — major revision required before submitting.';
}

export default function SelfCheck({ onSubmitToAssignment }: { onSubmitToAssignment?: () => void }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<SelfCheckResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setTitle(data.data.title);
        setContent(data.data.content);
      } else {
        setError('Failed to process file.');
      }
    } catch {
      setError('Upload failed. Please try again.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleCheck = useCallback(async () => {
    if (!content.trim()) {
      setError('Please paste or upload your document text.');
      return;
    }
    if (content.split(/\s+/).filter(w => w.length > 0).length < 20) {
      setError('Please enter at least 20 words for a meaningful check.');
      return;
    }

    setIsChecking(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Self-Check Document',
          content,
          exclusionSettings: {
            excludeQuotes: true,
            excludeBibliography: true,
            excludeCitations: true,
            excludeSmallMatches: 0,
          },
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const maxScore = Math.max(data.data.plagiarism.similarityScore, data.data.aiDetection.aiProbability);
        const wordCount = data.data.plagiarism.totalWords || content.split(/\s+/).filter(w => w.length > 0).length;

        const suggestions: string[] = [];
        if (maxScore >= 15) suggestions.push('Review flagged passages and add proper in-text citations where needed.');
        if (data.data.plagiarism.similarityScore >= 25) suggestions.push('Paraphrase sections with high similarity — rephrase in your own words.');
        if (data.data.aiDetection.aiProbability >= 25) suggestions.push('Rewrite AI-flagged sentences with more personal examples and varied vocabulary.');
        if (data.data.plagiarism.matchedWords > 0) suggestions.push(`Use quotation marks and cite ${data.data.plagiarism.matchedWords > 20 ? 'all' : 'the matched'} sources properly.`);
        if (suggestions.length === 0) suggestions.push('Your document looks original! Consider submitting with confidence.');

        setResult({
          similarityScore: data.data.plagiarism.similarityScore,
          aiScore: data.data.aiDetection.aiProbability,
          maxScore,
          wordCount,
          suggestions,
        });
      } else {
        setError(data.error || 'Check failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsChecking(false);
    }
  }, [content, title]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#008751]/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-[#008751]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Pre-Submission Self-Check</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
          Check your paper before submitting. Get instant feedback on similarity and AI content.
        </p>
      </div>

      {/* Upload / Text Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.pdf,.docx,.doc"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-[#008751] hover:bg-[#008751]/5 transition-colors"
          >
            <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Upload your document</p>
            <p className="text-xs text-muted-foreground">.txt, .md, .pdf, .docx supported</p>
          </div>

          <div>
            <Input
              placeholder="Document title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Textarea
            placeholder="Or paste your text here..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">
              {content.split(/\s+/).filter(w => w.length > 0).length} words
            </span>
            <Button
              onClick={handleCheck}
              disabled={isChecking || !content.trim()}
              className="gap-2 bg-[#008751] hover:bg-[#006b40]"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Check My Paper
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Score Display */}
          <div className={`border-2 rounded-xl p-6 ${getResultBg(result.maxScore)}`}>
            <div className="flex flex-col items-center gap-4">
              <div className={`text-5xl font-bold ${getResultColor(result.maxScore)}`}>
                {result.maxScore.toFixed(1)}%
              </div>
              <p className="text-lg font-semibold">Overall Risk Score</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {getResultMessage(result.maxScore)}
              </p>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Brain className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Similarity</p>
                <p className={`text-2xl font-bold ${getResultColor(result.similarityScore)}`}>
                  {result.similarityScore.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {result.similarityScore < 15 ? 'Excellent' : result.similarityScore < 35 ? 'Acceptable' : 'Needs revision'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">AI Content</p>
                <p className={`text-2xl font-bold ${getResultColor(result.aiScore)}`}>
                  {result.aiScore.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {result.aiScore < 15 ? 'Original' : result.aiScore < 35 ? 'Mostly human' : 'Likely AI'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-3 w-3 mt-1 text-[#008751] shrink-0" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => { setContent(''); setTitle(''); setResult(null); }}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Check Another Paper
            </Button>
            {onSubmitToAssignment && result.maxScore < 40 && (
              <Button
                onClick={onSubmitToAssignment}
                className="gap-2 bg-[#008751] hover:bg-[#006b40]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit to Assignment
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
