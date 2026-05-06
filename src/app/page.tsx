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
import StudentDashboard from '@/components/student/StudentDashboard';
import SubmissionHistory from '@/components/student/SubmissionHistory';
import StudentCourses from '@/components/student/StudentCourses';
import SubmissionReceipt from '@/components/student/SubmissionReceipt';
import StudentProfile from '@/components/student/StudentProfile';
import SelfCheck from '@/components/student/SelfCheck';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { GradingToolbar } from '@/components/grading/GradingToolbar';
import { InlineCommentTool } from '@/components/grading/InlineCommentTool';
import { QuickMarksPanel } from '@/components/grading/QuickMarksPanel';
import { RubricGradingModal } from '@/components/grading/RubricGradingModal';
import { VoiceCommentRecorder } from '@/components/grading/VoiceCommentRecorder';
import { VersionHistory } from '@/components/VersionHistory';
import { VersionDiffViewer } from '@/components/VersionDiffViewer';
import { ShareReportDialog } from '@/components/ShareReportDialog';
import { StudentSubmissionHistory } from '@/components/StudentSubmissionHistory';
import { GrammarReport, type GrammarResult } from '@/components/grammar/GrammarReport';
import { RevisionAssistant } from '@/components/revision/RevisionAssistant';
import { DeveloperToolsPanel } from '@/components/DeveloperToolsPanel';
import { PeerReviewDashboard } from '@/components/peer-review/PeerReviewDashboard';
import { PeerReviewForm } from '@/components/peer-review/PeerReviewForm';
import { PeerReviewResults } from '@/components/peer-review/PeerReviewResults';
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
  Settings2,
  Quote,
  BookMarked,
  TextQuote,
  ArrowLeft,
  ListChecks,
  GitBranch,
  History,
  Users as UsersIcon,
  UserCheck,
  Lightbulb,
  PenLine,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface MatchRegionData {
  startWordIndex: number;
  endWordIndex: number;
  text: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  wordCount: number;
}

interface SourceBreakdownData {
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  matchCount: number;
  matchedWords: number;
  percentageOfDocument: number;
  regions: MatchRegionData[];
}

interface ScanReportData {
  reportId: string;
  documentId: string;
  title: string;
  createdAt: string;
  plagiarism: {
    similarityScore: number;
    totalWords: number;
    matchedWords: number;
    excludedWords: number;
    totalFingerprints: number;
    matchingFingerprints: number;
    flaggedSegments: string[];
    matches: { text: string; sourceTitle: string; sourceUrl?: string; contribution: number }[];
    webSourcesSearched?: number;
    sourceBreakdown?: SourceBreakdownData[];
    matchRegions?: MatchRegionData[];
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
  grammar?: {
    score: number;
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    issues: Array<{
      type: 'grammar' | 'spelling' | 'style' | 'mechanics';
      category: string;
      message: string;
      suggestion: string;
      position: { start: number; end: number };
      originalText: string;
      severity: 'error' | 'warning' | 'info';
    }>;
    categories: { category: string; count: number }[];
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

interface ExclusionSettings {
  excludeQuotes: boolean;
  excludeBibliography: boolean;
  excludeCitations: boolean;
  excludeSmallMatches: number;
}

const DEFAULT_EXCLUSION_SETTINGS: ExclusionSettings = {
  excludeQuotes: true,
  excludeBibliography: true,
  excludeCitations: true,
  excludeSmallMatches: 0,
};

const EXCLUSION_SETTINGS_KEY = 'nigwrite-exclusion-settings';

function loadExclusionSettings(): ExclusionSettings {
  if (typeof window === 'undefined') return DEFAULT_EXCLUSION_SETTINGS;
  try {
    const stored = localStorage.getItem(EXCLUSION_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_EXCLUSION_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return DEFAULT_EXCLUSION_SETTINGS;
}

function saveExclusionSettings(settings: ExclusionSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXCLUSION_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

interface SubmissionData {
  id: string;
  document: { id: string; title: string };
  student: { id: string; name: string | null; email: string } | null;
  report: { id: string; similarityScore: number; aiScore: number } | null;
  status: string;
  grade: number | string | null;
  feedback: string | null;
  feedbackSummary?: string | null;
  letterGrade?: string | null;
  createdAt: string;
}

interface GradingRubricData {
  id: string;
  title: string;
  description: string | null;
  criteria: Array<{
    id: string;
    title: string;
    description: string | null;
    maxScore: number;
    weight: number;
    levels: Array<{ id: string; label: string; description: string; score: number; order: number }>;
    order: number;
  }>;
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

  // Grading view state
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionData | null>(null);
  const [gradingAssignmentId, setGradingAssignmentId] = useState<string | null>(null);
  const [gradingDocumentContent, setGradingDocumentContent] = useState<string>('');
  const [gradingViewMode, setGradingViewMode] = useState<'grading' | 'originality'>('grading');
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [gradingRubric, setGradingRubric] = useState<GradingRubricData | null>(null);
  const [saveAsQuickMarkText, setSaveAsQuickMarkText] = useState<string | null>(null);
  const [inlineComments, setInlineComments] = useState<Array<{
    id: string;
    text: string;
    position: number;
    rangeLength: number;
    color: string;
    isResolved: boolean;
    user?: { name: string | null; email: string } | null;
    createdAt: string;
  }>>([]);
  const [voiceComments, setVoiceComments] = useState<Array<{
    id: string;
    audioData: string;
    duration: number;
    user?: { name: string | null; email: string } | null;
    createdAt: string;
  }>>([]);

  // Exclusion settings state with localStorage persistence
  const [exclusionSettings, setExclusionSettings] = useState<ExclusionSettings>(DEFAULT_EXCLUSION_SETTINGS);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Scan mode: 'scan' for plagiarism/AI detection, 'feedback' for revision assistant
  const [scanMode, setScanMode] = useState<'scan' | 'feedback'>('scan');

  // Admin view state
  const [adminTab, setAdminTab] = useState('dashboard');

  // Instructor peer review state
  const [instructorTab, setInstructorTab] = useState('assignments');
  const [peerReviewFormId, setPeerReviewFormId] = useState<string | null>(null);
  const [showPeerReviewSetup, setShowPeerReviewSetup] = useState(false);
  const [prSetupAssignmentId, setPrSetupAssignmentId] = useState('');
  const [prSetupRubricId, setPrSetupRubricId] = useState('');
  const [prSetupAnonymous, setPrSetupAnonymous] = useState(true);
  const [prSetupLoading, setPrSetupLoading] = useState(false);
  const [rubrics, setRubrics] = useState<Array<{ id: string; title: string }>>([]);

  // Load exclusion settings from localStorage on mount
  useEffect(() => {
    const stored = loadExclusionSettings();
    setExclusionSettings(stored);
  }, []);

  const updateExclusionSetting = useCallback(<K extends keyof ExclusionSettings>(key: K, value: ExclusionSettings[K]) => {
    setExclusionSettings(prev => {
      const next = { ...prev, [key]: value };
      saveExclusionSettings(next);
      return next;
    });
  }, []);

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
          exclusionSettings: {
            excludeQuotes: exclusionSettings.excludeQuotes,
            excludeBibliography: exclusionSettings.excludeBibliography,
            excludeCitations: exclusionSettings.excludeCitations,
            excludeSmallMatches: exclusionSettings.excludeSmallMatches,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setScanProgress({ stage: 'complete', progress: 100, message: 'Scan complete!' });
        setReportData(result.data);

        // If navigating from student dashboard/selfcheck, show receipt too
        const isStudentView = ['student-dashboard', 'selfcheck', 'courses', 'scan'].includes(currentView);
        if (isStudentView) {
          setReceiptData({
            title: result.data.title,
            wordCount: result.data.plagiarism?.totalWords || scanContent.split(/\s+/).filter(w => w.length > 0).length,
            fileName: uploadedFileName || `${scanTitle || 'Document'}.txt`,
            reportId: result.data.reportId,
            similarityScore: result.data.plagiarism?.similarityScore,
            aiScore: result.data.aiDetection?.aiProbability,
          });
          setShowReceipt(true);
          setCurrentView('receipt');
        } else {
          setCurrentView('report');
        }
      } else {
        setScanError(result.error || 'Scan failed. Please try again.');
      }
    } catch {
      setScanError('Network error. Please check your connection and try again.');
    } finally {
      setIsScanning(false);
    }
  }, [scanTitle, scanContent, exclusionSettings]);

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
        const errorMsg = response.status === 429
          ? 'Too many upload attempts. Please wait a moment and try again.'
          : (result.error || 'Upload failed.');
        setScanError(errorMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      setScanError(`Upload failed: ${msg}`);
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
      await fetch('/api/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          gradedBy: 'instructor',
          grade: 0,
          feedbackSummary: feedback || undefined,
        }),
      });
      setSubmissions(prev => ({
        ...prev,
        [assignmentId]: prev[assignmentId]?.map(s =>
          s.id === submissionId
            ? { ...s, status: 'graded', feedback: feedback || 'Reviewed' }
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

  const handleOpenGradingView = useCallback(async (submission: SubmissionData, assignmentId: string) => {
    setGradingSubmissionId(submission.id);
    setGradingSubmission(submission);
    setGradingAssignmentId(assignmentId);
    setGradingViewMode('grading');
    setInlineComments([]);
    setVoiceComments([]);
    setSaveAsQuickMarkText(null);

    // Fetch document content
    try {
      const docRes = await fetch(`/api/documents/${submission.document.id}`);
      if (docRes.ok) {
        const docResult = await docRes.json();
        if (docResult.success) {
          setGradingDocumentContent(docResult.data.contentBody || '');
        }
      }
    } catch { /* use empty */ }

    // Fetch inline comments
    try {
      const commentsRes = await fetch(`/api/comments/inline?submissionId=${submission.id}`);
      if (commentsRes.ok) {
        const commentsResult = await commentsRes.json();
        if (commentsResult.success) {
          setInlineComments(commentsResult.data);
        }
      }
    } catch { /* empty */ }

    // Fetch voice comments
    try {
      const voiceRes = await fetch(`/api/comments/voice?submissionId=${submission.id}`);
      if (voiceRes.ok) {
        const voiceResult = await voiceRes.json();
        if (voiceResult.success) {
          setVoiceComments(voiceResult.data);
        }
      }
    } catch { /* empty */ }

    // Fetch rubric for this assignment
    try {
      const rubricRes = await fetch(`/api/rubrics?assignmentId=${assignmentId}`);
      if (rubricRes.ok) {
        const rubricResult = await rubricRes.json();
        if (rubricResult.success && rubricResult.data.length > 0) {
          setGradingRubric(rubricResult.data[0]);
        } else {
          setGradingRubric(null);
        }
      }
    } catch { /* empty */ }

    setCurrentView('grading-view');
  }, []);

  const handleCloseGradingView = useCallback(() => {
 setCurrentView('instructor');
    setGradingSubmissionId(null);
    setGradingSubmission(null);
  }, []);

  const handleGradeSaved = useCallback((grade: number, letterGrade: string, feedback: string) => {
    if (gradingSubmission && gradingAssignmentId) {
      setGradingSubmission(prev => prev ? { ...prev, grade, letterGrade, feedbackSummary: feedback, status: 'graded' } : null);
      setSubmissions(prev => ({
        ...prev,
        [gradingAssignmentId]: prev[gradingAssignmentId]?.map(s =>
          s.id === gradingSubmission.id
            ? { ...s, grade, letterGrade, feedback: feedback || 'Reviewed', status: 'graded' }
            : s
        ) || [],
      }));
    }
  }, [gradingSubmission, gradingAssignmentId]);

  const handleRubricScoresSaved = useCallback((_scores: unknown[]) => {
    // Refresh the grading view
    if (gradingSubmission) {
      handleGradeSaved(0, '', '');
    }
  }, [gradingSubmission, handleGradeSaved]);

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

        {/* Mode Toggle: Plagiarism Scan vs Writing Feedback */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit mx-auto">
          <button
            onClick={() => setScanMode('scan')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              scanMode === 'scan'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Plagiarism Scan
          </button>
          <button
            onClick={() => setScanMode('feedback')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              scanMode === 'feedback'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Writing Feedback
          </button>
        </div>

        {/* File Upload Zone — supports multiple files */}
        <Card className={scanMode === 'feedback' ? 'opacity-50 pointer-events-none' : ''}>
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
                    Supports .txt, .md, .csv, .pdf, .docx — no size limit
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
        {hasBatchFiles && scanMode === 'scan' && (
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

        {/* Advanced Settings Panel */}
        {scanMode === 'scan' && (
          <Card className="overflow-hidden">
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Advanced Settings</span>
              <span className="text-xs text-muted-foreground">Exclusion rules for scanning</span>
            </div>
            {showAdvancedSettings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showAdvancedSettings && (
            <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
              <div className="space-y-4 pt-4">
                {/* Exclude quoted text */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <TextQuote className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block">Exclude quoted text</label>
                      <p className="text-xs text-muted-foreground">Remove text within quotation marks from analysis</p>
                    </div>
                  </div>
                  <Switch
                    checked={exclusionSettings.excludeQuotes}
                    onCheckedChange={(checked) => updateExclusionSetting('excludeQuotes', checked)}
                  />
                </div>

                {/* Exclude bibliography */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <BookMarked className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block">Exclude bibliography</label>
                      <p className="text-xs text-muted-foreground">Skip references, works cited, and bibliography sections</p>
                    </div>
                  </div>
                  <Switch
                    checked={exclusionSettings.excludeBibliography}
                    onCheckedChange={(checked) => updateExclusionSetting('excludeBibliography', checked)}
                  />
                </div>

                {/* Exclude citations */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <Quote className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block">Exclude citations</label>
                      <p className="text-xs text-muted-foreground">Remove in-text citations (APA, MLA, IEEE, etc.)</p>
                    </div>
                  </div>
                  <Switch
                    checked={exclusionSettings.excludeCitations}
                    onCheckedChange={(checked) => updateExclusionSetting('excludeCitations', checked)}
                  />
                </div>

                {/* Minimum match size slider */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <label className="text-sm font-medium block">Minimum match size</label>
                        <p className="text-xs text-muted-foreground">Ignore matches shorter than this word count</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#008751] bg-[#008751]/10 px-2.5 py-0.5 rounded-md">
                      {exclusionSettings.excludeSmallMatches} words
                    </span>
                  </div>
                  <Slider
                    value={[exclusionSettings.excludeSmallMatches]}
                    onValueChange={([val]) => updateExclusionSetting('excludeSmallMatches', val)}
                    min={0}
                    max={50}
                    step={1}
                    className="mt-1"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">0 (all matches)</span>
                    <span className="text-[10px] text-muted-foreground">50 words</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              {scanMode === 'scan' && (
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
              )}
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

        {/* Revision Assistant — shown in Writing Feedback mode */}
        {scanMode === 'feedback' && (
          <Card>
            <CardContent className="pt-6">
              <RevisionAssistant text={scanContent} title={scanTitle || undefined} />
            </CardContent>
          </Card>
        )}
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
          <div className="flex gap-2 flex-wrap">
            <ShareReportDialog reportId={reportData.reportId} userId="" reportTitle={reportData.title} />
            <ExportButton reportId={reportData.reportId} format="html" />
            <ExportButton reportId={reportData.reportId} format="text" label="Text Report" />
            <Button variant="outline" size="sm" onClick={() => handleViewChange('student-history')}>
              <History className="h-3.5 w-3.5 mr-1.5" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleViewChange('scan')}>
              <Search className="h-3.5 w-3.5 mr-1.5" />
              New Scan
            </Button>
          </div>
        </div>
        <PlagiarismReport report={reportData} documentContent={scanContent} />

        {/* Grammar & Mechanics Check */}
        {reportData.grammar && (
          <GrammarReport
            grammarResult={reportData.grammar as unknown as GrammarResult}
            documentContent={scanContent}
          />
        )}
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
  // Fetch rubrics for peer review setup
  // ──────────────────────────────────────────────
  const loadRubrics = useCallback(async () => {
    try {
      const res = await fetch('/api/rubrics');
      const result = await res.json();
      if (result.success) {
        setRubrics(result.data.map((r: { id: string; title: string }) => ({ id: r.id, title: r.title })));
      }
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    loadRubrics();
  }, [loadRubrics]);

  const handlePeerReviewSetup = useCallback(async () => {
    if (!prSetupAssignmentId) return;
    setPrSetupLoading(true);
    try {
      // Fetch submissions for this assignment to get student IDs
      const subsRes = await fetch(`/api/submissions?assignmentId=${prSetupAssignmentId}`);
      const subsResult = await subsRes.json();
      if (!subsResult.success || subsResult.data.length === 0) {
        alert('No submissions found for this assignment. Students must submit first.');
        setPrSetupLoading(false);
        return;
      }

      const studentIds = [...new Set(
        subsResult.data
          .map((s: { studentId: string | null }) => s.studentId)
          .filter(Boolean) as string[]
      )];

      if (studentIds.length < 2) {
        alert('At least 2 students need to have submitted to create peer review pairings.');
        setPrSetupLoading(false);
        return;
      }

      const res = await fetch('/api/peer-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: prSetupAssignmentId,
          reviewerIds: studentIds,
          revieweeIds: studentIds,
          rubricId: prSetupRubricId || undefined,
          isAnonymous: prSetupAnonymous,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setShowPeerReviewSetup(false);
        setPrSetupAssignmentId('');
        setPrSetupRubricId('');
        // Refresh reviews
      } else {
        alert(result.error || 'Failed to create peer reviews');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setPrSetupLoading(false);
    }
  }, [prSetupAssignmentId, prSetupRubricId, prSetupAnonymous]);

  const handlePeerReviewAction = useCallback((reviewId: string, action: 'start' | 'continue' | 'view') => {
    setPeerReviewFormId(reviewId);
  }, []);

  // ──────────────────────────────────────────────
  // View: Instructor Dashboard
  // ──────────────────────────────────────────────
  const renderInstructor = () => {
    if (!assignmentsLoaded) {
      loadAssignments();
    }

    const instructorTabs = [
      { id: 'assignments', label: 'Assignments', icon: BookOpen },
      { id: 'peer-review', label: 'Peer Review', icon: UsersIcon },
    ];

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
            onClick={() => {
              if (instructorTab === 'peer-review') {
                setShowPeerReviewSetup(!showPeerReviewSetup);
              } else {
                setShowCreateForm(!showCreateForm);
              }
            }}
            className="gap-2 bg-[#008751] hover:bg-[#006b40]"
          >
            {instructorTab === 'peer-review' ? (
              <>
                {showPeerReviewSetup ? <X className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                {showPeerReviewSetup ? 'Cancel' : 'Setup Peer Review'}
              </>
            ) : (
              <>
                {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showCreateForm ? 'Cancel' : 'Create Assignment'}
              </>
            )}
          </Button>
        </div>

        {/* Instructor Tabs */}
        <div className="flex overflow-x-auto gap-1 border-b pb-0">
          {instructorTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setInstructorTab(tab.id);
                  setShowCreateForm(false);
                  setShowPeerReviewSetup(false);
                  setPeerReviewFormId(null);
                }}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                  instructorTab === tab.id
                    ? 'border-[#008751] text-[#008751]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Assignments Tab */}
        {instructorTab === 'assignments' && (
          <>
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
                              <div key={sub.id} className="p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <button
                                      className="text-left w-full"
                                      onClick={() => handleOpenGradingView(sub, assignment.id)}
                                    >
                                      <p className="text-sm font-medium truncate hover:text-[#008751] transition-colors">{sub.document.title}</p>
                                    </button>
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
                                    {sub.grade !== null && (
                                      <div className="text-center">
                                        <span className="text-xs font-bold text-[#008751]">
                                          {sub.letterGrade && `${sub.letterGrade} `}
                                          {typeof sub.grade === 'number' ? sub.grade : sub.grade}
                                        </span>
                                        <div className="text-[10px] text-muted-foreground">Grade</div>
                                      </div>
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
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenGradingView(sub, assignment.id)}
                                      className="gap-1 text-xs h-7"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Grade
                                    </Button>
                                  </div>
                                </div>

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
        </>
        )}

        {/* Peer Review Tab */}
        {instructorTab === 'peer-review' && (
          <>
            {/* Peer Review Setup Form */}
            {showPeerReviewSetup && (
              <Card className="border-[#008751]/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-[#008751]" />
                    Setup Peer Review
                  </CardTitle>
                  <CardDescription>
                    Create anonymous peer review assignments. Each student will review submissions from other students.
                    Reviews are automatically distributed to prevent self-review.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pr-assignment">Assignment</Label>
                    <select
                      id="pr-assignment"
                      value={prSetupAssignmentId}
                      onChange={(e) => setPrSetupAssignmentId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select an assignment...</option>
                      {assignments.map(a => (
                        <option key={a.id} value={a.id}>{a.title} ({a._count.submissions} submissions)</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Only assignments with submissions are shown. Students must submit before peer reviews can be assigned.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pr-rubric">Grading Rubric (optional)</Label>
                    <select
                      id="pr-rubric"
                      value={prSetupRubricId}
                      onChange={(e) => setPrSetupRubricId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">No rubric (free-form scoring)</option>
                      {rubrics.map(r => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="pr-anonymous"
                      checked={prSetupAnonymous}
                      onCheckedChange={setPrSetupAnonymous}
                    />
                    <Label htmlFor="pr-anonymous" className="text-sm">
                      Anonymous reviews (reviewer identities hidden from reviewees)
                    </Label>
                  </div>

                  <Button
                    onClick={handlePeerReviewSetup}
                    disabled={!prSetupAssignmentId || prSetupLoading}
                    className="gap-2 bg-[#008751] hover:bg-[#006b40]"
                  >
                    {prSetupLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      <><UserCheck className="h-4 w-4" /> Create Peer Review Assignments</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* If a specific review form is open */}
            {peerReviewFormId ? (
              <PeerReviewForm
                reviewId={peerReviewFormId}
                onClose={() => setPeerReviewFormId(null)}
                onSubmit={() => setPeerReviewFormId(null)}
              />
            ) : (
              <PeerReviewDashboard
                mode="instructor"
                onReviewAction={handlePeerReviewAction}
              />
            )}
          </>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // View: Grading Interface (GradeMark-style)
  // ──────────────────────────────────────────────
  const renderGradingView = () => {
    if (!gradingSubmission || !gradingSubmissionId || !gradingAssignmentId) {
      return (
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Submission Selected</h2>
          <p className="text-muted-foreground mb-4">Go back to the instructor dashboard.</p>
          <Button onClick={handleCloseGradingView} className="bg-[#008751] hover:bg-[#006b40]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto py-4 px-4 space-y-4">
        {/* Top Bar with Back Button + Submission Info */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCloseGradingView} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{gradingSubmission.document.title}</h2>
            <p className="text-xs text-muted-foreground">
              {gradingSubmission.student?.name || gradingSubmission.student?.email || 'Unknown Student'}
              {' — '}{new Date(gradingSubmission.createdAt).toLocaleString()}
            </p>
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                gradingViewMode === 'grading'
                  ? 'bg-white shadow-sm text-[#008751]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setGradingViewMode('grading')}
            >
              Grading View
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                gradingViewMode === 'originality'
                  ? 'bg-white shadow-sm text-[#008751]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setGradingViewMode('originality')}
            >
              Originality View
            </button>
          </div>
        </div>

        {/* Grading Toolbar */}
        {gradingViewMode === 'grading' && (
          <GradingToolbar
            submissionId={gradingSubmissionId}
            assignmentId={gradingAssignmentId}
            initialGrade={typeof gradingSubmission.grade === 'number' ? gradingSubmission.grade : null}
            initialFeedback={gradingSubmission.feedbackSummary || gradingSubmission.feedback || null}
            gradeScale="0-100"
            maxGrade={100}
            rubricId={gradingRubric?.id || null}
            onOpenRubric={() => {
              if (gradingRubric) setShowRubricModal(true);
            }}
            onGradeSaved={handleGradeSaved}
            userId="instructor"
          />
        )}

        {/* Main Content Area */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* Document / Comment Area */}
          <div className="flex-1 min-w-0 space-y-4">
            {gradingViewMode === 'grading' ? (
              <InlineCommentTool
                documentContent={gradingDocumentContent}
                submissionId={gradingSubmissionId}
                userId="instructor"
                comments={inlineComments}
                onSaveAsQuickMark={(text) => setSaveAsQuickMarkText(text)}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="max-h-[600px] overflow-y-auto">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {gradingDocumentContent || 'No document content available.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voice Comment Recorder */}
            {gradingViewMode === 'grading' && (
              <VoiceCommentRecorder
                submissionId={gradingSubmissionId}
                userId="instructor"
                existingVoiceComments={voiceComments}
              />
            )}
          </div>

          {/* QuickMarks Panel */}
          {gradingViewMode === 'grading' && (
            <div className="shrink-0">
              <QuickMarksPanel
                userId="instructor"
                onSelectQuickMark={(_text, _color) => {
                  // Quick mark selected - will be placed in inline comment
                }}
                onNewCommentText={saveAsQuickMarkText}
              />
            </div>
          )}
        </div>

        {/* Rubric Modal */}
        {gradingRubric && (
          <RubricGradingModal
            open={showRubricModal}
            onOpenChange={setShowRubricModal}
            rubric={gradingRubric}
            submissionId={gradingSubmissionId}
            userId="instructor"
            onScoresSaved={handleRubricScoresSaved}
          />
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
  // ──────────────────────────────────────────────
  // View: Admin Dashboard
  // ──────────────────────────────────────────────
  const renderAdmin = () => {
    const tabs = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'users', label: 'Users' },
      { id: 'courses', label: 'Courses' },
      { id: 'audit-logs', label: 'Audit Logs' },
      { id: 'settings', label: 'Settings' },
    ];

    return (
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        {/* Admin Tabs */}
        <div className="flex overflow-x-auto gap-1 border-b pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                adminTab === tab.id
                  ? 'border-[#008751] text-[#008751]'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Admin Tab Content */}
        {adminTab === 'dashboard' && <AdminDashboard onNavigate={(tab) => setAdminTab(tab)} />}
        {adminTab === 'users' && <UserManagement />}
        {adminTab === 'courses' && <CourseManagement />}
        {adminTab === 'audit-logs' && <AuditLogViewer />}
        {adminTab === 'settings' && <SettingsPanel />}
      </div>
    );
  };

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{ title: string; wordCount: number; fileName: string; reportId: string; similarityScore?: number; aiScore?: number } | null>(null);

  // Resubmission / Version History state
  const [resubmitContent, setResubmitContent] = useState('');
  const [resubmitTitle, setResubmitTitle] = useState('');
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [resubmitParentId, setResubmitParentId] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  // Diff viewer state
  const [diffVersions, setDiffVersions] = useState<{ v1Id: string; v2Id: string } | null>(null);
  const [showDiffView, setShowDiffView] = useState(false);

  // Student submission history view
  const [showStudentHistory, setShowStudentHistory] = useState(false);

  // Receipt info for new submissions
  const [receiptInfo, setReceiptInfo] = useState<{ submissionId: string; title: string; assignment: string; timestamp: string; wordCount: number } | null>(null);

  // Listen for resubmit events from VersionHistory component
  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      setResubmitParentId(e.detail.submissionId);
      setShowResubmitDialog(true);
    }) as EventListener;
    window.addEventListener('nigwrite:resubmit', handler);
    return () => window.removeEventListener('nigwrite:resubmit', handler);
  }, []);

  const handleResubmit = useCallback(async () => {
    if (!resubmitContent.trim() || !resubmitParentId) return;
    setIsResubmitting(true);
    setResubmitError('');
    try {
      const response = await fetch('/api/submissions/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSubmissionId: resubmitParentId,
          content: resubmitContent,
          title: resubmitTitle || undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowResubmitDialog(false);
        setResubmitContent('');
        setResubmitTitle('');
        if (result.data) {
          setReceiptInfo({
            submissionId: result.data.id,
            title: result.data.document.title,
            assignment: result.data.assignment?.title || 'Assignment',
            timestamp: result.data.createdAt,
            wordCount: resubmitContent.split(/\s+/).filter(w => w.length > 0).length,
          });
          setShowReceipt(true);
        }
      } else {
        setResubmitError(result.error || 'Resubmission failed');
      }
    } catch {
      setResubmitError('Network error. Please try again.');
    } finally {
      setIsResubmitting(false);
    }
  }, [resubmitContent, resubmitTitle, resubmitParentId]);

  const [userName, setUserName] = useState('Student');

  // Load user name from session
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.success && data.user?.name) {
          setUserName(data.user.name);
        }
      } catch {
        // use default
      }
    }
    loadUser();
  }, []);

  // Student peer review state
  const [studentPrFormId, setStudentPrFormId] = useState<string | null>(null);

  const renderStudentDashboard = () => (
    <StudentDashboard userName={userName} onViewChange={handleViewChange} />
  );

  const renderStudentHistory = () => (
    <SubmissionHistory onViewReport={(reportId) => { setReportData(null); setCurrentView('report'); }} />
  );

  const renderStudentCourses = () => <StudentCourses />;

  const renderStudentProfile = () => <StudentProfile />;

  const renderStudentPeerReview = () => {
    if (studentPrFormId) {
      return (
        <div className="max-w-4xl mx-auto py-8 px-4">
          <PeerReviewForm
            reviewId={studentPrFormId}
            onClose={() => setStudentPrFormId(null)}
            onSubmit={() => setStudentPrFormId(null)}
          />
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-[#008751]" />
            Peer Review
          </h2>
          <p className="text-muted-foreground">Review your peers&apos; submissions and see feedback on your own work</p>
        </div>

        {/* Tabs for given vs received */}
        <div className="flex overflow-x-auto gap-1 border-b pb-0">
          <button
            onClick={() => { setStudentPrFormId(null); }}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px border-[#008751] text-[#008751]"
          >
            Reviews to Complete
          </button>
          <button
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px border-transparent text-muted-foreground hover:text-foreground"
          >
            Reviews Received
          </button>
        </div>

        <PeerReviewDashboard
          mode="given"
          onReviewAction={(reviewId) => setStudentPrFormId(reviewId)}
        />

        {/* Reviews Received Section */}
        <div className="pt-6">
          <PeerReviewResults title="Reviews Received on Your Submissions" />
        </div>
      </div>
    );
  };

  const renderSelfCheck = () => (
    <SelfCheck
      onSubmitToAssignment={() => {
        setShowReceipt(false);
        setCurrentView('scan');
      }}
    />
  );

  const renderReceiptView = () => {
    if (!receiptData) return renderScan();
    return (
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        <SubmissionReceipt
          documentTitle={receiptData.title}
          wordCount={receiptData.wordCount}
          fileName={receiptData.fileName}
          reportId={receiptData.reportId}
          similarityScore={receiptData.similarityScore}
          aiScore={receiptData.aiScore}
          onViewReport={() => { setShowReceipt(false); setCurrentView('report'); }}
        />
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setShowReceipt(false); setCurrentView('student-dashboard'); }}>
            Back to Dashboard
          </Button>
          <Button className="bg-[#008751] hover:bg-[#006b40]" onClick={() => { setShowReceipt(false); setCurrentView('report'); }}>
            View Full Report
          </Button>
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (currentView) {
      case 'scan': return renderScan();
      case 'report': return renderReport();
      case 'dashboard': return renderDashboard();
      case 'documents': return renderDocuments();
      case 'search': return renderSearch();
      case 'instructor': return renderInstructor();
      case 'grading-view': return renderGradingView();
      case 'admin': return renderAdmin();
      case 'about': return renderAbout();
      case 'student-dashboard': return renderStudentDashboard();
      case 'history': return renderStudentHistory();
      case 'courses': return renderStudentCourses();
      case 'profile': return renderStudentProfile();
      case 'selfcheck': return renderSelfCheck();
      case 'peer-review': return renderStudentPeerReview();
      case 'receipt': return renderReceiptView();
      case 'student-history': return renderStudentSubmissionHistory();
      case 'version-diff': return renderVersionDiff();
      case 'resubmit': return renderResubmitDialogView();
      case 'dev-tools': return <DeveloperToolsPanel />;
      default: return renderHome();
    }
  };

  // ──────────────────────────────────────────────
  // View: Student Submission History
  // ──────────────────────────────────────────────
  const renderStudentSubmissionHistory = () => (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Submission History</h2>
          <p className="text-muted-foreground">All your submissions across assignments</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleViewChange('dashboard')}>
          Back
        </Button>
      </div>
      <StudentSubmissionHistory
        onViewReport={(submissionId, reportId) => {
          handleViewChange('report');
        }}
      />
    </div>
  );

  // ──────────────────────────────────────────────
  // View: Version Diff
  // ──────────────────────────────────────────────
  const renderVersionDiff = () => {
    if (!diffVersions) {
      handleViewChange('report');
      return null;
    }
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#008751]" />
            <h2 className="text-2xl font-bold">Version Comparison</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setShowDiffView(false); handleViewChange('report'); }}>
            Back to Report
          </Button>
        </div>
        <VersionDiffViewer
          version1Id={diffVersions.v1Id}
          version2Id={diffVersions.v2Id}
          onClose={() => { setShowDiffView(false); handleViewChange('report'); }}
        />
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // View: Resubmit Dialog
  // ──────────────────────────────────────────────
  const renderResubmitDialogView = () => (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="h-5 w-5 text-[#008751]" />
        <h2 className="text-2xl font-bold">Submit New Version</h2>
      </div>
      <Card className="space-y-4">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="mb-1.5 block">Document Title</Label>
            <Input
              placeholder="e.g., Research Paper on Machine Learning (v2)"
              value={resubmitTitle}
              onChange={(e) => setResubmitTitle(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Updated Content</Label>
            <Textarea
              placeholder="Paste your updated document content here..."
              value={resubmitContent}
              onChange={(e) => setResubmitContent(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {resubmitContent.split(/\s+/).filter(w => w.length > 0).length} words
              </span>
            </div>
          </div>
          {resubmitError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{resubmitError}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowResubmitDialog(false); setResubmitContent(''); setResubmitTitle(''); setResubmitError(''); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResubmit}
              disabled={isResubmitting || resubmitContent.trim().length < 10}
              className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
            >
              {isResubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <><Plus className="h-4 w-4" /> Submit New Version</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
