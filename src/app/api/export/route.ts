/**
 * NigWrite - Report Export API
 * POST /api/export
 *
 * Exports a scan report as:
 *   - HTML (printable to PDF from browser)
 *   - Plain text
 *   - Highlighted DOCX (Turnitin-style originality report with color-coded matches)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WinnowingEngine, DEFAULT_EXCLUSION_SETTINGS, type CorpusMatchEntry } from '@/lib/winnowing-engine';
import { getPersistentFingerprintStore } from '@/lib/persistent-fingerprint-store';
import { generateHighlightedDocument, type HighlightedMatchRegion, type HighlightedSourceBreakdown } from '@/lib/highlighted-doc-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, format } = body as { reportId: string; format?: 'pdf' | 'text' | 'highlighted_docx' };

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    // Fetch the report with document and flagged segments
    const report = await db.scanReport.findUnique({
      where: { id: reportId },
      include: {
        document: true,
        flaggedSegments: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // ── Highlighted DOCX export ──
    if (format === 'highlighted_docx') {
      return await handleHighlightedDocxExport(report);
    }

    if (format === 'text') {
      // Generate plain text report
      const textReport = generateTextReport(report);
      return new NextResponse(textReport, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="NigWrite-Report-${report.document.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt"`,
        },
      });
    }

    // Default: Generate HTML report
    const htmlReport = generateHTMLReport(report);

    return new NextResponse(htmlReport, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="NigWrite-Report-${report.document.title.replace(/[^a-zA-Z0-9]/g, '-')}.html"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    console.error('[NigWrite] Export error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────
// Highlighted DOCX Export Handler
// ──────────────────────────────────────────────

async function handleHighlightedDocxExport(report: {
  id: string;
  similarityScore: number;
  aiScore: number;
  status: string;
  createdAt: Date;
  document: { id: string; title: string; contentBody: string; createdAt: Date; userId?: string | null };
  flaggedSegments: { id: string; segmentText: string; sourceLink: string | null; similarityType: string; createdAt: Date }[];
}) {
  const content = report.document.contentBody;

  // Re-run a quick scan against the local corpus to get matchRegions and sourceBreakdown
  const winnowing = new WinnowingEngine();
  const store = await getPersistentFingerprintStore();

  const { cleanedText, excludedWordCount } = winnowing.applyExclusions(content, DEFAULT_EXCLUSION_SETTINGS);
  const fingerprints = winnowing.generateFingerprints(cleanedText);

  // Search local corpus
  const corpusMatchMap = await store.search(fingerprints.map(fp => fp.hash));
  const corpusMatches = new Map<number, CorpusMatchEntry[]>();
  for (const [hash, entries] of corpusMatchMap) {
    corpusMatches.set(hash, entries.map(e => ({
      documentId: e.documentId,
      ngram: e.ngram,
      sourceTitle: e.sourceTitle,
      sourceUrl: e.sourceUrl,
      sourceType: e.sourceType,
      position: e.position,
    })));
  }

  // Run the full scan
  const scanResult = winnowing.runFullScan(content, corpusMatches, DEFAULT_EXCLUSION_SETTINGS);

  // Map to highlighted doc types
  const matchRegions: HighlightedMatchRegion[] = scanResult.matchRegions.map(r => ({
    startWordIndex: r.startWordIndex,
    endWordIndex: r.endWordIndex,
    text: r.text,
    sourceId: r.sourceId,
    sourceTitle: r.sourceTitle,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    wordCount: r.wordCount,
    isPrimary: r.isPrimary,
  }));

  const sourceBreakdown: HighlightedSourceBreakdown[] = scanResult.sourceBreakdown.map(sb => ({
    sourceId: sb.sourceId,
    sourceTitle: sb.sourceTitle,
    sourceType: sb.sourceType,
    sourceUrl: sb.sourceUrl,
    matchCount: sb.matchCount,
    matchedWords: sb.matchedWords,
    percentageOfDocument: sb.percentageOfDocument,
    isPrimary: sb.isPrimary,
  }));

  // Get student name if available
  let studentName: string | undefined;
  if (report.document.userId) {
    try {
      const user = await db.user.findUnique({
        where: { id: report.document.userId },
        select: { name: true },
      });
      if (user?.name) {
        studentName = user.name;
      }
    } catch {
      // User not found or error — continue without student name
    }
  }

  // Generate the DOCX buffer
  const buffer = await generateHighlightedDocument({
    title: report.document.title,
    content,
    matchRegions,
    sourceBreakdown,
    overallSimilarity: report.similarityScore,
    aiScore: report.aiScore,
    studentName,
    scanDate: new Date(report.createdAt).toLocaleString(),
  });

  const safeFilename = report.document.title.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safeFilename}_originality_report.docx"`,
    },
  });
}

// ──────────────────────────────────────────────
// HTML Report Generator (unchanged)
// ──────────────────────────────────────────────

function getVerdictLabel(similarityScore: number, aiScore: number): string {
  const maxScore = Math.max(similarityScore, aiScore);
  if (maxScore < 15) return 'Original Work';
  if (maxScore < 35) return 'Minor Similarity Detected';
  if (maxScore < 60) return 'Significant Similarity Detected';
  return 'High Similarity / Likely AI-Generated';
}

function getVerdictColor(similarityScore: number, aiScore: number): string {
  const maxScore = Math.max(similarityScore, aiScore);
  if (maxScore < 15) return '#059669';
  if (maxScore < 35) return '#d97706';
  if (maxScore < 60) return '#ea580c';
  return '#dc2626';
}

function generateHTMLReport(report: {
  id: string;
  similarityScore: number;
  aiScore: number;
  status: string;
  createdAt: Date;
  document: { id: string; title: string; contentBody: string; createdAt: Date };
  flaggedSegments: {
    id: string;
    segmentText: string;
    sourceLink: string | null;
    similarityType: string;
    createdAt: Date;
  }[];
}): string {
  const verdictLabel = getVerdictLabel(report.similarityScore, report.aiScore);
  const verdictColor = getVerdictColor(report.similarityScore, report.aiScore);
  const plagiarismSegments = report.flaggedSegments.filter(s => s.similarityType === 'plagiarism');
  const aiSegments = report.flaggedSegments.filter(s => s.similarityType === 'ai_generated');
  const scanDate = new Date(report.createdAt).toLocaleString();

  const recommendations: string[] = [];
  if (report.similarityScore >= 60 || report.aiScore >= 60) {
    recommendations.push('Major revision is required. The document shows very high similarity to existing sources or strong AI-generated content patterns.');
  }
  if (report.similarityScore >= 35) {
    recommendations.push('Review all flagged segments and ensure proper citations are included where similarity was detected.');
  }
  if (report.aiScore >= 35) {
    recommendations.push('The document contains patterns commonly associated with AI-generated text. Consider rewriting flagged sections in your own words.');
  }
  if (report.similarityScore >= 15 && report.similarityScore < 35) {
    recommendations.push('Minor similarities were found. Check the flagged sections and add proper citations if needed.');
  }
  if (recommendations.length === 0) {
    recommendations.push('No significant issues detected. The document appears to be original work.');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NigWrite Report — ${report.document.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 3px solid #008751; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .logo-flag { width: 32px; height: 32px; display: flex; border-radius: 6px; overflow: hidden; }
    .logo-flag > div:first-child { width: 30%; background: #008751; height: 100%; }
    .logo-flag > div:last-child { width: 40%; background: white; height: 100%; }
    .logo-flag > div:nth-child(2) { width: 30%; background: #008751; height: 100%; }
    .logo-text { font-size: 24px; font-weight: 700; }
    .logo-text span { color: #008751; }
    .header-info { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; }
    .report-title { font-size: 20px; font-weight: 600; }
    .report-meta { font-size: 13px; color: #6b7280; }
    .verdict-banner { padding: 16px 20px; border-left: 5px solid ${verdictColor}; background: ${verdictColor}11; border-radius: 8px; margin-bottom: 24px; }
    .verdict-label { font-size: 18px; font-weight: 700; color: ${verdictColor}; margin-bottom: 4px; }
    .verdict-desc { font-size: 13px; color: #4b5563; }
    .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .score-card { text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .score-value { font-size: 36px; font-weight: 700; }
    .score-value.low { color: #059669; }
    .score-value.medium { color: #d97706; }
    .score-value.high { color: #dc2626; }
    .score-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .segment { border-left: 4px solid #ea580c; padding: 12px 16px; background: #fff7ed; border-radius: 0 8px 8px 0; margin-bottom: 10px; }
    .segment-ai { border-left-color: #7c3aed; background: #f5f3ff; }
    .segment-text { font-size: 13px; color: #374151; }
    .segment-source { font-size: 12px; color: #6b7280; margin-top: 6px; }
    .recommendation { padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 8px; font-size: 13px; color: #166534; }
    .recommendation::before { content: "\\2714\\0020"; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-flag"><div></div><div></div><div></div></div>
      <div class="logo-text">Nig<span>Write</span></div>
    </div>
    <div class="header-info">
      <div>
        <div class="report-title">${report.document.title}</div>
        <div class="report-meta">Scanned on ${scanDate}</div>
      </div>
      <div class="report-meta">Report ID: ${report.id.substring(0, 8)}</div>
    </div>
  </div>

  <div class="verdict-banner">
    <div class="verdict-label">${verdictLabel}</div>
    <div class="verdict-desc">
      Plagiarism: ${report.similarityScore.toFixed(1)}% &bull; AI Content: ${report.aiScore.toFixed(1)}% &bull; Flagged Segments: ${report.flaggedSegments.length}
    </div>
  </div>

  <div class="scores">
    <div class="score-card">
      <div class="score-value ${report.similarityScore < 25 ? 'low' : report.similarityScore < 50 ? 'medium' : 'high'}">${report.similarityScore.toFixed(1)}%</div>
      <div class="score-label">Plagiarism Similarity</div>
    </div>
    <div class="score-card">
      <div class="score-value ${report.aiScore < 25 ? 'low' : report.aiScore < 50 ? 'medium' : 'high'}">${report.aiScore.toFixed(1)}%</div>
      <div class="score-label">AI Content Probability</div>
    </div>
  </div>

  ${plagiarismSegments.length > 0 ? `
  <div class="section">
    <div class="section-title">Flagged Plagiarism Segments (${plagiarismSegments.length})</div>
    ${plagiarismSegments.map(seg => `
      <div class="segment">
        <div class="segment-text">"${seg.segmentText.length > 300 ? seg.segmentText.substring(0, 300) + '...' : seg.segmentText}"</div>
        ${seg.sourceLink ? `<div class="segment-source">Source: ${seg.sourceLink}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${aiSegments.length > 0 ? `
  <div class="section">
    <div class="section-title">AI Content Indicators (${aiSegments.length})</div>
    ${aiSegments.map(seg => `
      <div class="segment segment-ai">
        <div class="segment-text">${seg.segmentText}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Recommendations</div>
    ${recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}
  </div>

  <div class="footer">
    <p>Generated by NigWrite — Nigeria's Academic Integrity &amp; Writing Assistant Platform</p>
    <p style="margin-top: 4px;">Created by Wabi The Tech Nurse &bull; ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// Text Report Generator (unchanged)
// ──────────────────────────────────────────────

function generateTextReport(report: {
  similarityScore: number;
  aiScore: number;
  createdAt: Date;
  document: { title: string };
  flaggedSegments: {
    segmentText: string;
    sourceLink: string | null;
    similarityType: string;
  }[];
}): string {
  const divider = '═'.repeat(60);
  const subDivider = '─'.repeat(60);
  const verdictLabel = getVerdictLabel(report.similarityScore, report.aiScore);
  const scanDate = new Date(report.createdAt).toLocaleString();

  let text = '';
  text += `${divider}\n`;
  text += `  NigWrite — Scan Report\n`;
  text += `  Nigeria's Academic Integrity & Writing Assistant\n`;
  text += `${divider}\n\n`;
  text += `Document Title: ${report.document.title}\n`;
  text += `Scan Date:      ${scanDate}\n`;
  text += `Report ID:      N/A\n\n`;

  text += `${subDivider}\n`;
  text += `VERDICT: ${verdictLabel}\n`;
  text += `${subDivider}\n`;
  text += `Plagiarism Score: ${report.similarityScore.toFixed(1)}%\n`;
  text += `AI Content Score: ${report.aiScore.toFixed(1)}%\n`;
  text += `Flagged Segments: ${report.flaggedSegments.length}\n\n`;

  const plagiarismSegments = report.flaggedSegments.filter(s => s.similarityType === 'plagiarism');
  if (plagiarismSegments.length > 0) {
    text += `${subDivider}\n`;
    text += `FLAGGED PLAGIARISM SEGMENTS (${plagiarismSegments.length})\n`;
    text += `${subDivider}\n\n`;
    plagiarismSegments.forEach((seg, i) => {
      text += `  [${i + 1}] ${seg.segmentText}\n`;
      if (seg.sourceLink) text += `      Source: ${seg.sourceLink}\n`;
      text += '\n';
    });
  }

  const aiSegments = report.flaggedSegments.filter(s => s.similarityType === 'ai_generated');
  if (aiSegments.length > 0) {
    text += `${subDivider}\n`;
    text += `AI CONTENT INDICATORS (${aiSegments.length})\n`;
    text += `${subDivider}\n\n`;
    aiSegments.forEach((seg, i) => {
      text += `  [${i + 1}] ${seg.segmentText}\n\n`;
    });
  }

  text += `${subDivider}\n`;
  text += `RECOMMENDATIONS\n`;
  text += `${subDivider}\n\n`;
  if (report.similarityScore >= 60 || report.aiScore >= 60) {
    text += `  • Major revision required. Very high similarity or AI content detected.\n`;
  }
  if (report.similarityScore >= 35) {
    text += `  • Review all flagged segments and add proper citations.\n`;
  }
  if (report.aiScore >= 35) {
    text += `  • Rewrite flagged sections in your own words.\n`;
  }
  if (report.similarityScore < 15 && report.aiScore < 15) {
    text += `  • No significant issues detected. Document appears original.\n`;
  }
  text += `\n${divider}\n`;
  text += `Generated by NigWrite — by Wabi The Tech Nurse\n`;
  text += `${divider}\n`;

  return text;
}
