/**
 * NigWrite — Academic Integrity & Writing Assistant Platform
 * Main Application Page
 * Created by: Wabi The Tech Nurse
 *
 * Features:
 *   1. Plagiarism Detection (authentic corpus matching)
 *   2. AI Content Detection
 *   3. One-click AI Rewriting for flagged text
 *   4. File upload support (TXT, PDF, DOCX, CSV, MD)
 *   5. Dashboard with scan history
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PlagiarismReport } from '@/components/PlagiarismReport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload,
  Search,
  Sparkles,
  FileCheck,
  ArrowRight,
  BarChart3,
  Brain,
  PenTool,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  X,
  FileUp,
  AlertTriangle,
  Eye,
  GraduationCap,
  Users,
  Shield,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface ScanReportData {
  reportId: string;
  documentId: string;
  title: string;
  createdAt: string;
  plagiarism: {
    similarityScore: number;
    totalFingerprints: number;
    matchingFingerprints: number;
    flaggedSegments: string[];
    matches: { text: string; sourceTitle: string; sourceUrl?: string; contribution: number }[];
  };
  aiDetection: {
    aiProbability: number;
    perplexity: number;
    burstiness: number;
    vocabularyDiversity: number;
    averageSentenceLength: number;
    sentenceLengthVariance: number;
    confidence: 'low' | 'medium' | 'high';
    indicators: string[];
  };
  verdict: {
    status: 'original' | 'warning' | 'flagged' | 'critical';
    label: string;
    description: string;
    color: string;
  };
}

interface HistoryItem {
  id: string;
  document: { title: string; createdAt: string };
  similarityScore: number;
  aiScore: number;
  createdAt: string;
  flaggedSegments: { segmentText: string; similarityType: string }[];
}

// ──────────────────────────────────────────────
// Main App Component
// ──────────────────────────────────────────────
export default function NigWriteApp() {
  const [currentView, setCurrentView] = useState('home');
  const [reportData, setReportData] = useState<ScanReportData | null>(null);
  const [scanHistory, setScanHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Scan form state
  const [scanTitle, setScanTitle] = useState('');
  const [scanContent, setScanContent] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScan = useCallback(async () => {
    if (!scanContent.trim()) {
      setScanError('Please enter or upload document content to scan.');
      return;
    }

    setIsScanning(true);
    setScanError('');
    setReportData(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scanTitle || 'Untitled Document',
          content: scanContent,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
        setCurrentView('report');
      } else {
        setScanError(result.error || 'Scan failed. Please try again.');
      }
    } catch {
      setScanError('Network error. Please check your connection and try again.');
    } finally {
      setIsScanning(false);
    }
  }, [scanTitle, scanContent]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setScanError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setScanTitle(result.data.title);
        setScanContent(result.data.content);
        setUploadedFileName(file.name);

        if (result.data.isPartial) {
          setScanError(`Partial text extracted from ${file.name}. For best results, copy and paste your text directly.`);
        }
      } else {
        setScanError(result.error || 'Upload failed.');
      }
    } catch {
      setScanError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleDropZoneUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearAll = useCallback(() => {
    setScanTitle('');
    setScanContent('');
    setScanError('');
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const response = await fetch('/api/scan');
      const result = await response.json();
      if (result.success) {
        setScanHistory(result.data);
        setHistoryLoaded(true);
      }
    } catch {
      // silent
    }
  }, [historyLoaded]);

  // ──────────────────────────────────────────────
  // View: Home
  // ──────────────────────────────────────────────
  const renderHome = () => (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="relative text-center py-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-[#008751]/5 to-transparent rounded-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-[#008751]" />
                <div className="w-[40%] bg-white" />
                <div className="w-[30%] bg-[#008751]" />
              </div>
              <PenTool className="h-9 w-9 text-white relative z-10 drop-shadow" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Nig<span className="text-[#008751]">Write</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Nigeria&apos;s Academic Integrity & Writing Assistant
          </p>
          <p className="text-sm text-muted-foreground mb-8 max-w-lg mx-auto">
            Detect plagiarism, identify AI-generated content, and instantly rewrite
            flagged sections — all in one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => handleViewChange('scan')} className="gap-2 bg-[#008751] hover:bg-[#006b40]">
              <Upload className="h-4 w-4" />
              Scan Your Document
            </Button>
            <Button size="lg" variant="outline" onClick={() => handleViewChange('about')} className="gap-2">
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">What NigWrite Does</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Search className="h-5 w-5 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Plagiarism Detection</CardTitle>
              </div>
              <CardDescription>
                Checks your work against thousands of academic sources across
                multiple disciplines. Get a detailed similarity report with
                highlighted sections and source links.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">AI Content Detection</CardTitle>
              </div>
              <CardDescription>
                Identifies text written by ChatGPT, GPT-4, Claude and other AI tools
                using advanced analysis of writing patterns, sentence structure,
                and vocabulary usage.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#008751]/10 flex items-center justify-center">
                  <PenTool className="h-5 w-5 text-[#008751]" />
                </div>
                <CardTitle className="text-lg">Instant Rewriting</CardTitle>
              </div>
              <CardDescription>
                Found plagiarism? Click &quot;Fix This&quot; to instantly rewrite any
                flagged section in authentic, natural language — then
                re-scan to verify it passes.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', icon: FileUp, title: 'Upload', desc: 'Upload your document or paste your text' },
            { step: '2', icon: Search, title: 'Scan', desc: 'Get a detailed plagiarism and AI detection report' },
            { step: '3', icon: Eye, title: 'Review', desc: 'See highlighted matches with source references' },
            { step: '4', icon: Sparkles, title: 'Fix', desc: 'Rewrite flagged sections with one click' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#008751]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#008751]" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#008751] text-white text-xs flex items-center justify-center font-bold">
                    {step}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Stats */}
      <section className="max-w-4xl mx-auto px-4">
        <Card className="bg-gradient-to-br from-[#008751]/5 to-[#008751]/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Academic Sources', value: '20+', icon: GraduationCap },
                { label: 'Disciplines', value: '8', icon: BarChart3 },
                { label: 'Instant Rewrite', value: 'One Click', icon: Sparkles },
                { label: 'File Support', value: 'PDF, DOCX, TXT', icon: FileText },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <Icon className="h-5 w-5 text-[#008751] mx-auto mb-2" />
                  <div className="font-bold text-sm">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  // ──────────────────────────────────────────────
  // View: Scan Document
  // ──────────────────────────────────────────────
  const renderScan = () => (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Scan Document</h2>
        <p className="text-muted-foreground">
          Upload a file or paste your text below. NigWrite will check it for plagiarism
          and AI-generated content.
        </p>
      </div>

      {/* File Upload Zone */}
      <Card>
        <CardContent className="pt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.pdf,.docx,.doc"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div
            onClick={handleDropZoneUpload}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-[#008751] hover:bg-[#008751]/5 transition-colors"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-[#008751] animate-spin" />
                <p className="text-sm text-muted-foreground">Processing file...</p>
              </div>
            ) : uploadedFileName ? (
              <div className="flex flex-col items-center gap-2">
                <FileCheck className="h-8 w-8 text-[#008751]" />
                <p className="text-sm font-medium text-[#008751]">{uploadedFileName}</p>
                <p className="text-xs text-muted-foreground">Click to upload a different file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload your document</p>
                <p className="text-xs text-muted-foreground">
                  Supports .txt, .md, .csv, .pdf, .docx (max 10MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Text Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Document Title</label>
            <Input
              placeholder="e.g., Research Paper on Machine Learning"
              value={scanTitle}
              onChange={(e) => setScanTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center justify-between">
              <span>Paste or type your document text</span>
              <span className="text-muted-foreground font-normal text-xs">Minimum 50 words recommended</span>
            </label>
            <Textarea
              placeholder="Paste your essay, research paper, thesis, assignment, or any document here. NigWrite will scan it for plagiarism against academic sources and check for AI-generated content..."
              value={scanContent}
              onChange={(e) => setScanContent(e.target.value)}
              className="min-h-[280px] font-mono text-sm"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">
                {scanContent.split(/\s+/).filter(w => w.length > 0).length} words
              </span>
              {scanContent.split(/\s+/).filter(w => w.length > 0).length > 0 &&
                scanContent.split(/\s+/).filter(w => w.length > 0).length < 50 && (
                <span className="text-xs text-amber-600">
                  For best results, enter at least 50 words
                </span>
              )}
            </div>
          </div>

          {scanError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{scanError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleScan}
              disabled={isScanning || scanContent.trim().length === 0}
              className="flex-1 gap-2 bg-[#008751] hover:bg-[#006b40]"
              size="lg"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Document...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Scan for Plagiarism
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={clearAll}
              disabled={isScanning}
              size="lg"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ──────────────────────────────────────────────
  // View: Scan Report
  // ──────────────────────────────────────────────
  const renderReport = () => {
    if (!reportData) {
      return (
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Report Available</h2>
          <p className="text-muted-foreground mb-4">Scan a document first to view its report.</p>
          <Button onClick={() => handleViewChange('scan')} className="bg-[#008751] hover:bg-[#006b40]">
            <Upload className="h-4 w-4 mr-2" />
            Scan a Document
          </Button>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{reportData.title}</h2>
            <p className="text-sm text-muted-foreground">
              Scanned on {new Date(reportData.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleViewChange('scan')}>
              <Search className="h-3.5 w-3.5 mr-1.5" />
              New Scan
            </Button>
          </div>
        </div>
        <PlagiarismReport report={reportData} documentContent={scanContent} />
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // View: Dashboard
  // ──────────────────────────────────────────────
  const renderDashboard = () => {
    if (!historyLoaded) {
      loadHistory();
    }

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Your scan history and results</p>
          </div>
          <Button onClick={() => { loadHistory(); setHistoryLoaded(false); }} variant="outline" size="sm">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{scanHistory.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Scans</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {scanHistory.filter(h => h.similarityScore < 25 && h.aiScore < 25).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Original</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-amber-600">
                {scanHistory.filter(h => h.similarityScore >= 25 && h.similarityScore < 60).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Needs Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-600">
                {scanHistory.filter(h => h.similarityScore >= 60 || h.aiScore >= 60).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">High Risk</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            {!historyLoaded ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : scanHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No scans yet. Upload a document to get started.</p>
                <Button className="mt-3 bg-[#008751] hover:bg-[#006b40]" onClick={() => handleViewChange('scan')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Scan Your First Document
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scanHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.document?.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <div className="text-center">
                        <div className={`text-sm font-bold ${
                          item.similarityScore < 25 ? 'text-emerald-600' :
                          item.similarityScore < 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {item.similarityScore}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">Plagiarism</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-bold ${
                          item.aiScore < 25 ? 'text-emerald-600' :
                          item.aiScore < 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {item.aiScore}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">AI</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.flaggedSegments?.length || 0} flags
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // View: Documents
  // ──────────────────────────────────────────────
  const renderDocuments = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Documents</h2>
        <p className="text-muted-foreground">Your uploaded documents and analysis results</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Library</CardTitle>
          <CardDescription>Documents are saved automatically when you scan them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Documents will appear here after you scan them.</p>
            <Button onClick={() => handleViewChange('scan')} className="bg-[#008751] hover:bg-[#006b40]">
              <Upload className="h-4 w-4 mr-2" />
              Scan Your First Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ──────────────────────────────────────────────
  // View: About Page (Simplified — no tech details)
  // ──────────────────────────────────────────────
  const renderAbout = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Creator Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#008751]/10 via-[#008751]/5 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <div className="w-full h-full flex">
                <div className="w-[30%] bg-[#008751]" />
                <div className="w-[40%] bg-white" />
                <div className="w-[30%] bg-[#008751]" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Wabi The Tech Nurse</h2>
              <p className="text-muted-foreground">Solutions Architect & Full-Stack AI Engineer</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">NLP Specialist</Badge>
                <Badge variant="secondary" className="text-xs">EdTech</Badge>
                <Badge variant="secondary" className="text-xs">Generative AI</Badge>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm leading-relaxed">
            NigWrite is a comprehensive academic integrity platform built to help students, educators,
            and institutions maintain the highest standards of academic honesty. The platform combines
            advanced text analysis capabilities with modern AI to provide a complete solution for
            plagiarism detection, AI content identification, and intelligent text correction.
          </p>
          <p className="text-sm leading-relaxed">
            Whether you are a student working on a research paper, a lecturer reviewing submissions,
            or an institution ensuring academic standards, NigWrite provides the tools you need to
            check originality, identify AI-generated content, and improve the authenticity of any
            written work.
          </p>
        </CardContent>
      </Card>

      {/* Who Is It For */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-[#008751]" />
            Who Is NigWrite For?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: GraduationCap,
                title: 'Students',
                desc: 'Check your essays, theses, and assignments before submission. Fix any flagged sections instantly to ensure your work is original.',
              },
              {
                icon: Users,
                title: 'Educators & Lecturers',
                desc: 'Verify the originality of student submissions. Detect AI-generated content and identify sections that need proper citation.',
              },
              {
                icon: Shield,
                title: 'Institutions',
                desc: 'Maintain academic standards across your institution. Track plagiarism trends and ensure the integrity of academic qualifications.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 rounded-lg border text-center">
                <Icon className="h-6 w-6 text-[#008751] mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#008751]" />
            Why NigWrite?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: 'Authentic Plagiarism Detection',
                desc: 'NigWrite compares your document against a comprehensive corpus of academic sources spanning multiple disciplines including Computer Science, Medicine, Environmental Science, Social Sciences, Business, Education, Engineering, and History. Each match is highlighted with the source title and reference link.',
              },
              {
                title: 'AI Content Identification',
                desc: 'The AI detection engine analyzes writing patterns, sentence structure consistency, vocabulary usage, and common AI phrasing to determine whether text was written by a human or generated by tools like ChatGPT, GPT-4, or Claude. You get a clear probability score with detailed indicators.',
              },
              {
                title: 'One-Click Rewriting',
                desc: 'When plagiarism is detected, you do not have to figure out how to fix it alone. Click the "Fix This" button next to any flagged section, and NigWrite will instantly rewrite it in natural, authentic language. The rewrite preserves your original meaning while changing the structure enough to pass plagiarism checks.',
              },
              {
                title: 'Automatic Re-Scan Verification',
                desc: 'After rewriting, NigWrite automatically re-scans the new text to verify that the similarity score has actually decreased. You can see the before and after scores side by side, giving you confidence that the fix worked.',
              },
              {
                title: 'File Upload Support',
                desc: 'Upload documents directly from your computer. NigWrite supports TXT, Markdown, CSV, PDF, and DOCX files, making it easy to scan any document format you are working with.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#008751] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  const renderView = () => {
    switch (currentView) {
      case 'scan': return renderScan();
      case 'report': return renderReport();
      case 'dashboard': return renderDashboard();
      case 'documents': return renderDocuments();
      case 'about': return renderAbout();
      default: return renderHome();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar currentView={currentView} onViewChange={handleViewChange} />
      <main className="flex-1">
        {renderView()}
      </main>
      <Footer />
    </div>
  );
}
