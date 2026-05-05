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
 *   6. Batch document scanning
 *   7. PDF/HTML report export
 *   8. Assignment & Instructor dashboard
 *   9. Document search
 *   10. Notifications
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PlagiarismReport } from '@/components/PlagiarismReport';
import { ExportButton } from '@/components/ExportButton';
import { BatchScanProgress, BatchFileItem } from '@/components/BatchScanProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
  BookOpen,
  ClipboardList,
  Download,
  FileDown,
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

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  courseId: string | null;
  deadline: string | null;
  createdAt: string;
  _count: { submissions: number };
  creator: { id: string; name: string | null; email: string } | null;
}

interface SubmissionData {
  id: string;
  document: { id: string; title: string };
  student: { id: string; name: string | null; email: string } | null;
  report: { id: string; similarityScore: number; aiScore: number } | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  createdAt: string;
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
  const [scanProgress, setScanProgress] = useState({ stage: '', progress: 0, message: '' });

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch scan state
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([]);
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string; title: string; createdAt: string;
    latestReport: { id: string; similarityScore: number; aiScore: number; createdAt: string } | null;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Instructor view state
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionData[]>>({});
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', courseId: '', deadline: '' });
  const [gradingFeedback, setGradingFeedback] = useState<Record<string, string>>({});

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
    setScanProgress({ stage: 'scanning', progress: 50, message: 'Analyzing document... Please wait.' });

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

      if (result.success && result.data) {
        setScanProgress({ stage: 'complete', progress: 100, message: 'Scan complete!' });
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

  const handleBatchFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: BatchFileItem[] = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      title: file.name.replace(/\.[^/.]+$/, ''),
      content: '',
      status: 'waiting' as const,
      progress: 0,
    }));

    // Upload each file to extract text
    newFiles.forEach(async (fileItem) => {
      const formData = new FormData();
      const selectedFile = Array.from(files).find(f => f.name === fileItem.name);
      if (!selectedFile) return;
      formData.append('file', selectedFile);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (result.success) {
          setBatchFiles(prev =>
            prev.map(f =>
              f.id === fileItem.id
                ? { ...f, content: result.data.content, title: result.data.title || f.title }
                : f
            )
          );
        } else {
          setBatchFiles(prev =>
            prev.map(f =>
              f.id === fileItem.id
                ? { ...f, status: 'error', error: result.error || 'Upload failed' }
                : f
            )
          );
        }
      } catch {
        setBatchFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? { ...f, status: 'error', error: 'Failed to upload' }
              : f
          )
        );
      }
    });

    setBatchFiles(prev => [...prev, ...newFiles]);
    if (batchFileInputRef.current) batchFileInputRef.current.value = '';
  }, []);

  const handleBatchScan = useCallback(async () => {
    const filesToScan = batchFiles.filter(f => f.status === 'waiting' && f.content.trim().length > 0);
    if (filesToScan.length === 0) return;

    setIsBatchScanning(true);

    for (const file of filesToScan) {
      setBatchFiles(prev =>
        prev.map(f => f.id === file.id ? { ...f, status: 'scanning', progress: 30 } : f)
      );

      try {
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: file.title, content: file.content }),
        });

        const result = await response.json();
        setBatchFiles(prev =>
          prev.map(f => f.id === file.id ? { ...f, progress: 80 } : f)
        );

        if (result.success && result.data) {
          const d = result.data as { plagiarism: { similarityScore: number }; aiDetection: { aiProbability: number }; reportId: string };
          setBatchFiles(prev =>
            prev.map(f =>
              f.id === file.id
                ? {
                    ...f,
                    status: 'done',
                    progress: 100,
                    similarityScore: d.plagiarism.similarityScore,
                    aiScore: d.aiDetection.aiProbability,
                    reportId: d.reportId,
                  }
                : f
            )
          );
        } else {
          setBatchFiles(prev =>
            prev.map(f =>
              f.id === file.id
                ? { ...f, status: 'error', error: result.error || 'Scan failed' }
                : f
            )
          );
        }
      } catch {
        setBatchFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'error', error: 'Network error' }
              : f
          )
        );
      }
    }

    setIsBatchScanning(false);
  }, [batchFiles]);

  // ──────────────────────────────────────────────
  // Download handler
  // ──────────────────────────────────────────────
  const handleDownloadReport = useCallback(async (reportId: string, title: string) => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, format: 'html' }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NigWrite-Report-${title.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
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
  // Search handler
  // ──────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setIsSearching(true);
    setSearchPerformed(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data.results);
      }
    } catch {
      // silent
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // ──────────────────────────────────────────────
  // Instructor handlers
  // ──────────────────────────────────────────────
  const loadAssignments = useCallback(async () => {
    if (assignmentsLoaded) return;
    try {
      const response = await fetch('/api/assignments');
      const result = await response.json();
      if (result.success) {
        setAssignments(result.data);
        setAssignmentsLoaded(true);
      }
    } catch {
      // silent
    }
  }, [assignmentsLoaded]);

  const loadSubmissions = useCallback(async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
      const result = await response.json();
      if (result.success) {
        setSubmissions(prev => ({ ...prev, [assignmentId]: result.data }));
      }
    } catch {
      // silent
    }
  }, []);

  const handleCreateAssignment = useCallback(async () => {
    if (!newAssignment.title.trim()) return;
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment),
      });
      const result = await response.json();
      if (result.success) {
        setAssignments(prev => [result.data, ...prev]);
        setNewAssignment({ title: '', description: '', courseId: '', deadline: '' });
        setShowCreateForm(false);
      }
    } catch {
      // silent
    }
  }, [newAssignment]);

  const handleGradeSubmission = useCallback(async (submissionId: string, assignmentId: string) => {
    const feedback = gradingFeedback[submissionId] || '';
    try {
      // Use the scan API to simulate grading — just store the feedback via submission update
      // Since we don't have a PATCH endpoint, we'll use POST to notifications as a workaround
      // In a real app this would be PATCH /api/submissions/:id
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Submission Graded',
          message: `Feedback: ${feedback || 'Reviewed'}`,
          type: 'success',
        }),
      });
      setSubmissions(prev => ({
        ...prev,
        [assignmentId]: prev[assignmentId]?.map(s =>
          s.id === submissionId
            ? { ...s, status: 'graded', feedback: feedback || 'Reviewed', grade: feedback ? 'Completed' : 'Reviewed' }
            : s
        ) || [],
      }));
      setGradingFeedback(prev => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    } catch {
      // silent
    }
  }, [gradingFeedback]);

  const toggleAssignmentExpand = useCallback((assignmentId: string) => {
    setExpandedAssignment(prev => prev === assignmentId ? null : assignmentId);
    loadSubmissions(assignmentId);
  }, [loadSubmissions]);

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
            Nigeria&apos;s Academic Integrity &amp; Writing Assistant
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
  // View: Scan Document (with Batch Scanning)
  // ──────────────────────────────────────────────
  const renderScan = () => {
    const hasBatchFiles = batchFiles.length > 0;

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Scan Document</h2>
          <p className="text-muted-foreground">
            Upload a file or paste your text below. NigWrite will check it for plagiarism
            and AI-generated content.
          </p>
        </div>

        {/* File Upload Zone — supports multiple files */}
        <Card>
          <CardContent className="pt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={batchFileInputRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,.docx,.doc"
              multiple
              onChange={handleBatchFileSelect}
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

            {/* Batch upload button */}
            <div className="flex justify-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => batchFileInputRef.current?.click()}
                className="text-xs text-muted-foreground gap-1"
              >
                <Upload className="h-3 w-3" />
                Upload multiple files for batch scanning
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Batch Progress */}
        {hasBatchFiles && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Batch Scan ({batchFiles.length} files)
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleBatchScan}
                    disabled={isBatchScanning || !batchFiles.some(f => f.status === 'waiting' && f.content.trim().length > 0)}
                    className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
                  >
                    {isBatchScanning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        Scan All
                      </>
                    )}
                  </Button>
                  {!isBatchScanning && batchFiles.every(f => f.status === 'done' || f.status === 'error') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBatchFiles([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BatchScanProgress files={batchFiles} />
            </CardContent>
          </Card>
        )}

        {/* Text Input (single scan) */}
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

            {isScanning && scanProgress.progress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#008751]">{scanProgress.message}</span>
                  <span className="text-muted-foreground">{scanProgress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#008751] to-[#00a86b] h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${scanProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

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
                    {scanProgress.message || 'Analyzing Document...'}
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
  };

  // ──────────────────────────────────────────────
  // View: Scan Report (with Export)
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
            <ExportButton reportId={reportData.reportId} format="html" />
            <ExportButton reportId={reportData.reportId} format="text" label="Text Report" />
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
          <Button onClick={() => { setHistoryLoaded(false); }} variant="outline" size="sm">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-[#008751] hover:bg-[#008751]/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadReport(item.id, item.document?.title || 'Report');
                        }}
                        title="Download Report"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
  // View: Search
  // ──────────────────────────────────────────────
  const renderSearch = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Search Documents</h2>
        <p className="text-muted-foreground">Search through your scanned documents by title or content</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || searchQuery.trim().length < 2}
              className="gap-2 bg-[#008751] hover:bg-[#006b40]"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchPerformed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Results {searchResults.length > 0 && `(${searchResults.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No documents found matching your query.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(doc.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {doc.latestReport && (
                      <div className="flex items-center gap-3 ml-2">
                        <div className="text-center">
                          <div className={`text-sm font-bold ${
                            doc.latestReport.similarityScore < 25 ? 'text-emerald-600' :
                            doc.latestReport.similarityScore < 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {doc.latestReport.similarityScore.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">Plagiarism</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-bold ${
                            doc.latestReport.aiScore < 25 ? 'text-emerald-600' :
                            doc.latestReport.aiScore < 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {doc.latestReport.aiScore.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">AI</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ──────────────────────────────────────────────
  // View: Instructor Dashboard
  // ──────────────────────────────────────────────
  const renderInstructor = () => {
    if (!assignmentsLoaded) {
      loadAssignments();
    }

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-[#008751]" />
              Instructor Dashboard
            </h2>
            <p className="text-muted-foreground">Manage assignments and review submissions</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="gap-2 bg-[#008751] hover:bg-[#006b40]"
          >
            {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreateForm ? 'Cancel' : 'Create Assignment'}
          </Button>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <Card className="border-[#008751]/20">
            <CardHeader>
              <CardTitle className="text-lg">Create New Assignment</CardTitle>
              <CardDescription>Set up a new assignment for students to submit their work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asgn-title">Title</Label>
                  <Input
                    id="asgn-title"
                    placeholder="e.g., Midterm Research Paper"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asgn-course">Course ID (optional)</Label>
                  <Input
                    id="asgn-course"
                    placeholder="e.g., CSC301"
                    value={newAssignment.courseId}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, courseId: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asgn-desc">Description</Label>
                <Textarea
                  id="asgn-desc"
                  placeholder="Assignment instructions and requirements..."
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asgn-deadline">Deadline (optional)</Label>
                <Input
                  id="asgn-deadline"
                  type="datetime-local"
                  value={newAssignment.deadline}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              <Button
                onClick={handleCreateAssignment}
                disabled={!newAssignment.title.trim() || !newAssignment.description.trim()}
                className="gap-2 bg-[#008751] hover:bg-[#006b40]"
              >
                <Send className="h-4 w-4" />
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        {!assignmentsLoaded ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No assignments yet.</p>
              <p className="text-sm text-muted-foreground">Create your first assignment to start collecting submissions.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const isExpanded = expandedAssignment === assignment.id;
              const subs = submissions[assignment.id] || [];

              return (
                <Card key={assignment.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleAssignmentExpand(assignment.id)}
                    className="w-full text-left"
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">{assignment.title}</h3>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {assignment._count.submissions} submissions
                            </Badge>
                            {assignment.courseId && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {assignment.courseId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{assignment.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Created {new Date(assignment.createdAt).toLocaleDateString()}
                            </span>
                            {assignment.deadline && (
                              <span className="flex items-center gap-1">
                                Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </button>

                  {/* Expanded: Submissions */}
                  {isExpanded && (
                    <div className="border-t">
                      <div className="p-4 bg-muted/20">
                        <h4 className="text-sm font-semibold mb-3">Submissions</h4>
                        {subs.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No submissions yet for this assignment.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {subs.map((sub) => (
                              <div key={sub.id} className="p-3 rounded-lg border bg-background">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{sub.document.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {sub.student?.name || sub.student?.email || 'Unknown Student'}
                                      {' — '}
                                      {new Date(sub.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {sub.report && (
                                      <>
                                        <div className="text-center">
                                          <span className={`text-xs font-bold ${
                                            sub.report.similarityScore < 25 ? 'text-emerald-600' :
                                            sub.report.similarityScore < 50 ? 'text-amber-600' : 'text-red-600'
                                          }`}>
                                            {sub.report.similarityScore.toFixed(1)}%
                                          </span>
                                          <div className="text-[10px] text-muted-foreground">Plagiarism</div>
                                        </div>
                                        <div className="text-center">
                                          <span className={`text-xs font-bold ${
                                            sub.report.aiScore < 25 ? 'text-emerald-600' :
                                            sub.report.aiScore < 50 ? 'text-amber-600' : 'text-red-600'
                                          }`}>
                                            {sub.report.aiScore.toFixed(1)}%
                                          </span>
                                          <div className="text-[10px] text-muted-foreground">AI</div>
                                        </div>
                                      </>
                                    )}
                                    <Badge
                                      variant={
                                        sub.status === 'graded' ? 'default' :
                                        sub.status === 'flagged' ? 'destructive' : 'outline'
                                      }
                                      className="text-xs capitalize"
                                    >
                                      {sub.status}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Grading interface */}
                                {sub.status !== 'graded' && (
                                  <div className="flex gap-2 mt-2">
                                    <Input
                                      placeholder="Enter feedback..."
                                      value={gradingFeedback[sub.id] || ''}
                                      onChange={(e) => setGradingFeedback(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                      className="flex-1 h-8 text-sm"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleGradeSubmission(sub.id, assignment.id)}
                                      className="gap-1 bg-[#008751] hover:bg-[#006b40]"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Grade
                                    </Button>
                                  </div>
                                )}

                                {/* Show existing feedback */}
                                {sub.feedback && (
                                  <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-200">
                                    <p className="text-xs text-emerald-700">
                                      <span className="font-semibold">Feedback:</span> {sub.feedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // View: About Page
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
              <p className="text-muted-foreground">Solutions Architect &amp; Full-Stack AI Engineer</p>
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
      case 'search': return renderSearch();
      case 'instructor': return renderInstructor();
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
