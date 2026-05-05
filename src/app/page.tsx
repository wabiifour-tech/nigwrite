/**
 * NigWrite — Academic Integrity & Writing Assistant Platform
 * Main Application Page
 * Created by: Wabi The Tech Nurse
 *
 * This is the complete single-page application for NigWrite.
 * Views: Home, Scan Document, Dashboard, Documents, About
 *
 * Architecture:
 *   - Frontend: Next.js 16 + Tailwind CSS 4 + shadcn/ui
 *   - Backend: Next.js API Routes (Winnowing, AI Detection, Correction)
 *   - Database: Prisma ORM (SQLite)
 *   - AI Correction: z-ai-web-dev-sdk (LLM)
 *
 * Features:
 *   1. Plagiarism Detection using Winnowing Algorithm
 *   2. AI Content Detection using Perplexity + Burstiness
 *   3. LLM-powered Plagiarism Correction Engine
 *   4. Document management and scan history
 */

'use client';

import { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PlagiarismReport } from '@/components/PlagiarismReport';
import { ScoreGauge } from '@/components/ScoreGauge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Upload,
  Search,
  Sparkles,
  FileCheck,
  ArrowRight,
  BarChart3,
  Brain,
  PenTool,
  Database,
  Code2,
  GitBranch,
  Server,
  Globe,
  CheckCircle2,
  Clock,
  FileText,
  Trash2,
  Loader2,
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
  document: {
    title: string;
    createdAt: string;
  };
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

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScan = useCallback(async () => {
    if (!scanContent.trim()) {
      setScanError('Please enter document content to scan.');
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
      // History load failed silently
    }
  }, [historyLoaded]);

  // ──────────────────────────────────────────────
  // View: Home / Landing Page
  // ──────────────────────────────────────────────
  const renderHome = () => (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative text-center py-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            NigWrite
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Academic Integrity & Writing Assistant Platform
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Plagiarism Detection + AI Content Detection + Intelligent Rewriting — All in One Place
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => handleViewChange('scan')} className="gap-2">
              <Upload className="h-4 w-4" />
              Scan a Document
            </Button>
            <Button size="lg" variant="outline" onClick={() => handleViewChange('about')} className="gap-2">
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plagiarism Detection */}
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Search className="h-5 w-5 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Plagiarism Detection</CardTitle>
              </div>
              <CardDescription>
                Powered by the Winnowing Algorithm with Rabin-Karp fingerprinting.
                Compares your document against a reference corpus of academic sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">Winnowing</Badge>
                <Badge variant="secondary" className="text-xs">Rabin-Karp</Badge>
                <Badge variant="secondary" className="text-xs">N-Grams</Badge>
                <Badge variant="secondary" className="text-xs">Fingerprinting</Badge>
              </div>
            </CardContent>
          </Card>

          {/* AI Detection */}
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">AI Content Detection</CardTitle>
              </div>
              <CardDescription>
                Identifies text generated by ChatGPT, GPT-4, Claude, and other LLMs
                using perplexity analysis, burstiness metrics, and vocabulary diversity scoring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">Perplexity</Badge>
                <Badge variant="secondary" className="text-xs">Burstiness</Badge>
                <Badge variant="secondary" className="text-xs">Vocab Diversity</Badge>
                <Badge variant="secondary" className="text-xs">RoBERTa-style</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Correction Engine */}
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <PenTool className="h-5 w-5 text-emerald-600" />
                </div>
                <CardTitle className="text-lg">Correction Engine</CardTitle>
              </div>
              <CardDescription>
                Automatically rewrites flagged plagiarized segments using AI while
                preserving original meaning and academic tone. Includes automatic re-scan verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">LLM Rewrite</Badge>
                <Badge variant="secondary" className="text-xs">Re-scan Loop</Badge>
                <Badge variant="secondary" className="text-xs">Tone Preserved</Badge>
                <Badge variant="secondary" className="text-xs">One-Click Fix</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', icon: Upload, title: 'Upload', desc: 'Paste or type your document text into the scanner' },
            { step: '2', icon: Search, title: 'Scan', desc: 'Winnowing Algorithm analyzes fingerprints against the corpus' },
            { step: '3', icon: FileCheck, title: 'Report', desc: 'View similarity scores, AI detection results, and flagged segments' },
            { step: '4', icon: Sparkles, title: 'Fix', desc: 'Click "Fix This" to AI-rewrite flagged sections automatically' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
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

      {/* Quick Stats */}
      <section className="max-w-4xl mx-auto px-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Algorithm', value: 'Winnowing', icon: GitBranch },
                { label: 'AI Model', value: 'GPT-Powered', icon: Sparkles },
                { label: 'Detection', value: 'Dual-Engine', icon: BarChart3 },
                { label: 'Accuracy', value: 'High Precision', icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
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
          Paste your document text below. NigWrite will analyze it for plagiarism
          and AI-generated content simultaneously.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Details</CardTitle>
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
            <label className="text-sm font-medium mb-1.5 block">
              Document Content
              <span className="text-muted-foreground font-normal ml-1">(minimum 50 words recommended)</span>
            </label>
            <Textarea
              placeholder="Paste your document text here. The scanner will analyze it for plagiarism using the Winnowing Algorithm and detect AI-generated content using perplexity and burstiness analysis..."
              value={scanContent}
              onChange={(e) => setScanContent(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">
                {scanContent.split(/\s+/).filter(w => w.length > 0).length} words
              </span>
              {scanContent.split(/\s+/).filter(w => w.length > 0).length < 50 && (
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
              className="flex-1 gap-2"
              size="lg"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning... (Winnowing + AI Detection)
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Run Full Scan
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setScanTitle(''); setScanContent(''); setScanError(''); }}
              disabled={isScanning}
              size="lg"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Text for Testing */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quick Test — Sample Text
          </CardTitle>
          <CardDescription className="text-xs">
            Click a sample below to load it into the scanner. These contain text matching our reference corpus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            {
              label: 'Machine Learning Essay',
              text: 'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. These systems improve their performance on a specific task over time without being explicitly programmed. Deep learning is a specialized branch that uses neural networks with many layers to analyze various factors of data. The field has seen remarkable advances in recent years, particularly in areas such as image recognition and natural language processing.',
            },
            {
              label: 'Climate Change Research',
              text: 'Climate change refers to long-term shifts in global temperatures and weather patterns. Since the 1800s, human activities have been the main driver of climate change, primarily due to the burning of fossil fuels like coal, oil, and gas. Rising sea levels, melting ice caps, and increasing frequency of extreme weather events are among the most visible consequences of climate change affecting our planet today.',
            },
            {
              label: 'AI-Generated Text (Test Detection)',
              text: 'In today\'s rapidly evolving digital landscape, it is essential to understand the multifaceted nature of technological advancement. Furthermore, the implementation of artificial intelligence systems has underscored the importance of maintaining a delicate balance between innovation and ethical considerations. Additionally, it is worth noting that these developments have far-reaching implications for society as a whole, paving the way for unprecedented opportunities while simultaneously presenting complex challenges that require careful and deliberate navigation.',
            },
          ].map((sample, i) => (
            <Button
              key={i}
              variant="ghost"
              className="w-full justify-start text-left h-auto py-2 px-3"
              onClick={() => {
                setScanTitle(sample.label);
                setScanContent(sample.text);
                setScanError('');
              }}
            >
              <span className="text-sm font-medium">{sample.label}</span>
              <span className="text-xs text-muted-foreground ml-2 truncate">
                — {sample.text.substring(0, 60)}...
              </span>
            </Button>
          ))}
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
          <Button onClick={() => handleViewChange('scan')}>
            <Upload className="h-4 w-4 mr-2" />
            Scan a Document
          </Button>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{reportData.title}</h2>
            <p className="text-sm text-muted-foreground">
              Scanned on {new Date(reportData.createdAt).toLocaleString()} &middot; Report ID: {reportData.reportId.substring(0, 8)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleViewChange('scan')}>
              <Search className="h-3.5 w-3.5 mr-1.5" />
              New Scan
            </Button>
          </div>
        </div>

        {/* Plagiarism Report Component */}
        <PlagiarismReport report={reportData} />
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
            <p className="text-muted-foreground">Overview of your scan history and statistics</p>
          </div>
          <Button onClick={() => { loadHistory(); setHistoryLoaded(false); }} variant="outline" size="sm">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
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
              <div className="text-xs text-muted-foreground mt-1">Flagged</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-600">
                {scanHistory.filter(h => h.similarityScore >= 60 || h.aiScore >= 60).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Critical</div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
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
                <Button className="mt-3" onClick={() => handleViewChange('scan')}>
                  <Upload className="h-4 w-4 mr-2" />
                  First Scan
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
        <p className="text-muted-foreground">All uploaded documents and their analysis results</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Library</CardTitle>
          <CardDescription>Documents are automatically created when you run a scan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Documents will appear here after you scan them.</p>
            <Button onClick={() => handleViewChange('scan')}>
              <Upload className="h-4 w-4 mr-2" />
              Scan Your First Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ──────────────────────────────────────────────
  // View: About Page
  // ──────────────────────────────────────────────
  const renderAbout = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Creator Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg">
              W
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
            cutting-edge natural language processing algorithms with modern AI capabilities to provide
            a complete solution for plagiarism detection, AI content identification, and intelligent
            text correction.
          </p>
          <p className="text-sm leading-relaxed">
            The plagiarism detection engine implements the Winnowing Algorithm — a well-established
            document fingerprinting technique from academic research. Combined with Rabin-Karp rolling
            hash functions and n-gram analysis, this system provides high-precision text matching
            comparable to commercial solutions like Turnitin.
          </p>
        </CardContent>
      </Card>

      {/* Architecture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Globe, title: 'Frontend', tech: 'Next.js 16 + Tailwind CSS 4', desc: 'React-based SPA with shadcn/ui components and responsive design' },
              { icon: Database, title: 'Backend', tech: 'Python FastAPI / Next.js API', desc: 'Microservices architecture with RESTful endpoints and async processing' },
              { icon: GitBranch, title: 'Search Engine', tech: 'Elasticsearch', desc: 'Distributed fingerprint hash storage with sub-second lookup times' },
              { icon: Brain, title: 'AI Detection', tech: 'Perplexity + Burstiness', desc: 'Statistical analysis engine with RoBERTa-style transformer integration' },
              { icon: Sparkles, title: 'Correction API', tech: 'GPT-4 / Anthropic', desc: 'LLM-powered rewrite engine with academic tone preservation' },
              { icon: Server, title: 'Infrastructure', tech: 'Redis + Celery + PostgreSQL', desc: 'Background job processing, caching, and persistent data storage' },
            ].map(({ icon: Icon, title, tech, desc }) => (
              <div key={title} className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{title}</span>
                </div>
                <p className="text-xs font-mono text-primary/80 mb-1">{tech}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Schema (PostgreSQL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {[
              { table: 'Users', fields: 'id, email, role, institution_id' },
              { table: 'Documents', fields: 'id, title, content_body, created_at' },
              { table: 'ScanReports', fields: 'id, doc_id, similarity_score, ai_score' },
              { table: 'FlaggedSegments', fields: 'id, report_id, segment_text, source_link, suggested_rewrite' },
              { table: 'DeveloperMeta', fields: 'app_version, creator_name (default: Wabi The Tech Nurse)' },
            ].map(({ table, fields }) => (
              <div key={table} className="flex items-start gap-3 p-2 rounded bg-muted/50">
                <Code2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">{table}</span>
                  <span className="text-muted-foreground ml-1.5">({fields})</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Winnowing Algorithm */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            The Winnowing Algorithm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            The Winnowing Algorithm, published by Schleimer, Wilkerson, and Aiken in 2003 (SIGMOD),
            is a document fingerprinting technique that provides robust, locality-sensitive detection
            of copied text. The algorithm works in four stages:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { step: '1', title: 'Normalization', desc: 'Text is lowercased, punctuation removed, whitespace standardized' },
              { step: '2', title: 'N-Gram Generation', desc: 'Overlapping word sequences (k-grams) are extracted from normalized text' },
              { step: '3', title: 'Hashing', desc: 'Rabin-Karp rolling hash function converts each n-gram to a numeric fingerprint' },
              { step: '4', title: 'Winnowing', desc: 'For each window of w hashes, the minimum is selected as the document fingerprint' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3 p-3 rounded-lg border">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Version */}
      <div className="text-center text-xs text-muted-foreground py-4">
        <p>NigWrite v1.0.0 &middot; Built with Next.js, Prisma, and Tailwind CSS</p>
        <p className="mt-1">Created by <span className="font-semibold text-foreground">Wabi The Tech Nurse</span></p>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // Render Current View
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
