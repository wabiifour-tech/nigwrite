/**
 * NigWrite - Highlighted Document Generator
 * Task ID: 4
 *
 * Generates a DOCX file with color-coded highlights showing where
 * plagiarism was detected, similar to Turnitin's downloadable
 * originality report. Uses the `docx` library for Word document creation.
 *
 * Document structure:
 *   Page 1: Cover/Summary page with scores and statistics
 *   Page 2+: Highlighted document with source references
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  PageBreak,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  Footer,
  PageNumber,
  NumberFormat,
  Tab,
  TabStopPosition,
  TabStopType,
  Header,
} from 'docx';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface HighlightedDocParams {
  title: string;
  content: string;
  matchRegions: HighlightedMatchRegion[];
  sourceBreakdown: HighlightedSourceBreakdown[];
  overallSimilarity: number;
  aiScore: number;
  studentName?: string;
  scanDate: string;
}

export interface HighlightedMatchRegion {
  startWordIndex: number;
  endWordIndex: number;
  text: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  wordCount: number;
  isPrimary?: boolean;
}

export interface HighlightedSourceBreakdown {
  sourceId: string;
  sourceTitle: string;
  sourceType: 'internet' | 'publication' | 'student_paper';
  sourceUrl?: string;
  matchCount: number;
  matchedWords: number;
  percentageOfDocument: number;
  isPrimary?: boolean;
}

// ──────────────────────────────────────────────
// Color constants
// ──────────────────────────────────────────────

const COLORS = {
  // Highlight colors by source type (Word-compatible hex without #)
  internet: 'D9E2F3',       // Light blue
  publication: 'E2BFEE',    // Light purple
  student_paper: 'FCE4D6',  // Light orange
  primary: 'E2EFDA',        // Light green

  // Score colors
  green: '059669',
  yellow: 'D97706',
  orange: 'EA580C',
  red: 'DC2626',

  // Brand
  nigWriteGreen: '008751',

  // General
  black: '000000',
  gray: '6B7280',
  lightGray: 'E5E7EB',
  white: 'FFFFFF',
  darkGray: '374151',
  mediumGray: '9CA3AF',
} as const;

// ──────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score < 25) return COLORS.green;
  if (score < 50) return COLORS.yellow;
  if (score < 75) return COLORS.orange;
  return COLORS.red;
}

function getHighlightColor(sourceType: string, isPrimary?: boolean): string {
  if (isPrimary) return COLORS.primary;
  switch (sourceType) {
    case 'internet': return COLORS.internet;
    case 'publication': return COLORS.publication;
    case 'student_paper': return COLORS.student_paper;
    default: return COLORS.publication;
  }
}

function getSourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case 'internet': return 'Internet Source';
    case 'publication': return 'Publication';
    case 'student_paper': return 'Student Paper';
    default: return 'Source';
  }
}

function getVerdictLabel(similarityScore: number, aiScore: number): string {
  const maxScore = Math.max(similarityScore, aiScore);
  if (maxScore < 15) return 'Original Work';
  if (maxScore < 35) return 'Minor Similarity Detected';
  if (maxScore < 60) return 'Significant Similarity Detected';
  return 'High Similarity / Likely AI-Generated';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
}

// ──────────────────────────────────────────────
// Text processing
// ──────────────────────────────────────────────

interface WordSegment {
  text: string;
  isHighlighted: boolean;
  sourceId: string;
  sourceType: string;
  isPrimary: boolean;
}

/**
 * Split content into words and determine which words fall within match regions.
 * Returns segments of words grouped by highlight status.
 */
function buildHighlightSegments(
  content: string,
  matchRegions: HighlightedMatchRegion[],
): WordSegment[][] {
  // Normalize text the same way the engine does
  const normalized = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length === 0 || matchRegions.length === 0) {
    // No highlights — return content as plain text segments
    return content.split('\n').map(line => [
      { text: line || ' ', isHighlighted: false, sourceId: '', sourceType: '', isPrimary: false },
    ]);
  }

  // Build a map: wordIndex -> first matching region
  const wordToRegion = new Map<number, HighlightedMatchRegion>();
  for (const region of matchRegions) {
    for (let w = region.startWordIndex; w <= region.endWordIndex && w < words.length; w++) {
      if (!wordToRegion.has(w)) {
        wordToRegion.set(w, region);
      }
    }
  }

  // Build segments: consecutive words with same highlight status
  const segments: WordSegment[] = [];
  let currentText = '';
  let currentHighlighted = false;
  let currentRegion: HighlightedMatchRegion | null = null;

  for (let i = 0; i < words.length; i++) {
    const region = wordToRegion.get(i);
    const isHighlighted = !!region;

    const regionChanged = isHighlighted && currentRegion && region && region.sourceId !== currentRegion.sourceId;
    const statusChanged = isHighlighted !== currentHighlighted;

    if (statusChanged || regionChanged) {
      if (currentText) {
        segments.push({
          text: currentText.trim(),
          isHighlighted: currentHighlighted,
          sourceId: currentRegion?.sourceId || '',
          sourceType: currentRegion?.sourceType || '',
          isPrimary: currentRegion?.isPrimary || false,
        });
      }
      currentText = '';
      currentHighlighted = isHighlighted;
      currentRegion = region || null;
    }

    currentText += (currentText ? ' ' : '') + words[i];
  }

  if (currentText) {
    segments.push({
      text: currentText.trim(),
      isHighlighted: currentHighlighted,
      sourceId: currentRegion?.sourceId || '',
      sourceType: currentRegion?.sourceType || '',
      isPrimary: currentRegion?.isPrimary || false,
    });
  }

  // Split segments into paragraphs based on original newlines (approximate)
  const originalLines = content.split('\n');
  const paragraphs: WordSegment[][] = [];

  let segIdx = 0;
  let wordOffset = 0;

  for (const line of originalLines) {
    const lineWordCount = line.split(/\s+/).filter(w => w.length > 0).length;
    const paragraphSegs: WordSegment[] = [];

    // Collect segments that fall within this line's word range
    while (segIdx < segments.length) {
      const segWordCount = segments[segIdx].text.split(/\s+/).filter(w => w.length > 0).length;

      if (wordOffset + segWordCount <= wordOffset + lineWordCount || segIdx === segments.length - 1) {
        paragraphSegs.push(segments[segIdx]);
        segIdx++;
        break;
      } else {
        paragraphSegs.push(segments[segIdx]);
        segIdx++;
      }
    }

    wordOffset += lineWordCount;

    if (paragraphSegs.length === 0) {
      paragraphSegs.push({
        text: ' ',
        isHighlighted: false,
        sourceId: '',
        sourceType: '',
        isPrimary: false,
      });
    }

    paragraphs.push(paragraphSegs);
  }

  return paragraphs;
}

// ──────────────────────────────────────────────
// Build unique source reference list
// ──────────────────────────────────────────────

interface SourceReference {
  index: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  percentage: number;
  isPrimary: boolean;
}

function buildSourceReferences(sourceBreakdown: HighlightedSourceBreakdown[]): SourceReference[] {
  const seen = new Set<string>();
  const refs: SourceReference[] = [];

  for (const source of sourceBreakdown) {
    if (seen.has(source.sourceId)) continue;
    seen.add(source.sourceId);
    refs.push({
      index: refs.length + 1,
      sourceId: source.sourceId,
      sourceTitle: source.sourceTitle,
      sourceType: getSourceTypeLabel(source.sourceType),
      percentage: source.percentageOfDocument,
      isPrimary: source.isPrimary || false,
    });
  }

  return refs;
}

// Build sourceId -> reference index map
function buildSourceIndexMap(sourceBreakdown: HighlightedSourceBreakdown[]): Map<string, number> {
  const map = new Map<string, number>();
  const seen = new Set<string>();
  let idx = 1;

  for (const source of sourceBreakdown) {
    if (seen.has(source.sourceId)) continue;
    seen.add(source.sourceId);
    map.set(source.sourceId, idx);
    idx++;
  }

  return map;
}

// ──────────────────────────────────────────────
// Cover page generation
// ──────────────────────────────────────────────

function buildCoverPageChildren(params: HighlightedDocParams): Paragraph[] {
  const {
    title,
    overallSimilarity,
    aiScore,
    studentName,
    scanDate,
    matchRegions,
    sourceBreakdown,
    content,
  } = params;

  const totalWords = content.split(/\s+/).filter(w => w.length > 0).length;
  const matchedWords = new Set<number>();
  for (const region of matchRegions) {
    for (let w = region.startWordIndex; w <= region.endWordIndex; w++) {
      matchedWords.add(w);
    }
  }

  const verdict = getVerdictLabel(overallSimilarity, aiScore);
  const scoreColor = getScoreColor(Math.max(overallSimilarity, aiScore));

  // Source type breakdown
  const internetSources = sourceBreakdown.filter(s => s.sourceType === 'internet');
  const publicationSources = sourceBreakdown.filter(s => s.sourceType === 'publication');
  const studentPaperSources = sourceBreakdown.filter(s => s.sourceType === 'student_paper');

  const internetPct = internetSources.length > 0
    ? Math.round(internetSources.reduce((sum, s) => sum + s.percentageOfDocument, 0) * 10) / 10
    : 0;
  const publicationPct = publicationSources.length > 0
    ? Math.round(publicationSources.reduce((sum, s) => sum + s.percentageOfDocument, 0) * 10) / 10
    : 0;
  const studentPct = studentPaperSources.length > 0
    ? Math.round(studentPaperSources.reduce((sum, s) => sum + s.percentageOfDocument, 0) * 10) / 10
    : 0;

  const paragraphs: Paragraph[] = [];

  // Top spacing
  paragraphs.push(
    new Paragraph({ spacing: { after: 600 } }),
  );

  // Logo
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Nig',
          font: 'Calibri',
          size: 56,
          bold: true,
          color: COLORS.black,
        }),
        new TextRun({
          text: 'Write',
          font: 'Calibri',
          size: 56,
          bold: true,
          color: COLORS.nigWriteGreen,
        }),
      ],
    }),
  );

  // Subtitle
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Nigeria's Academic Integrity & Writing Assistant Platform",
          font: 'Calibri',
          size: 20,
          color: COLORS.gray,
          italics: true,
        }),
      ],
    }),
  );

  // Divider line
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.nigWriteGreen },
      },
      children: [],
    }),
  );

  // Report title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'ORIGINALITY REPORT',
          font: 'Calibri',
          size: 36,
          bold: true,
          color: COLORS.black,
          characterSpacing: 200,
        }),
      ],
    }),
  );

  // Document title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: title || 'Untitled Document',
          font: 'Calibri',
          size: 28,
          color: COLORS.darkGray,
          italics: true,
        }),
      ],
    }),
  );

  // Student name if provided
  if (studentName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `Student: ${studentName}`,
            font: 'Calibri',
            size: 22,
            color: COLORS.gray,
          }),
        ],
      }),
    );
  }

  // Scan date
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `Scan Date: ${scanDate}`,
          font: 'Calibri',
          size: 22,
          color: COLORS.gray,
        }),
      ],
    }),
  );

  // Verdict label
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `Verdict: ${verdict}`,
          font: 'Calibri',
          size: 24,
          bold: true,
          color: scoreColor,
        }),
      ],
    }),
  );

  // ── Score Cards as a table ──
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: 'SIMILARITY SCORES',
          font: 'Calibri',
          size: 22,
          bold: true,
          color: COLORS.gray,
          characterSpacing: 150,
        }),
      ],
    }),
  );

  const simColor = getScoreColor(overallSimilarity);
  const aiColor = getScoreColor(aiScore);

  // Similarity score
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 50 },
      children: [
        new TextRun({
          text: `${overallSimilarity.toFixed(1)}%`,
          font: 'Calibri',
          size: 72,
          bold: true,
          color: simColor,
        }),
        new TextRun({
          text: '  ',
          font: 'Calibri',
          size: 28,
        }),
        new TextRun({
          text: 'Plagiarism Similarity',
          font: 'Calibri',
          size: 24,
          color: COLORS.gray,
        }),
      ],
    }),
  );

  // AI Detection score
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 },
      children: [
        new TextRun({
          text: `${aiScore.toFixed(1)}%`,
          font: 'Calibri',
          size: 72,
          bold: true,
          color: aiColor,
        }),
        new TextRun({
          text: '  ',
          font: 'Calibri',
          size: 28,
        }),
        new TextRun({
          text: 'AI Content Probability',
          font: 'Calibri',
          size: 24,
          color: COLORS.gray,
        }),
      ],
    }),
  );

  // ── Summary Statistics ──
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: 'SUMMARY STATISTICS',
          font: 'Calibri',
          size: 22,
          bold: true,
          color: COLORS.gray,
          characterSpacing: 150,
        }),
      ],
    }),
  );

  const statsData = [
    `Total Words: ${totalWords.toLocaleString()}`,
    `Matched Words: ${matchedWords.size.toLocaleString()}`,
    `Number of Sources: ${sourceBreakdown.length}`,
    `Matched Regions: ${matchRegions.length}`,
  ];

  for (const stat of statsData) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: stat,
            font: 'Calibri',
            size: 22,
            color: COLORS.darkGray,
          }),
        ],
      }),
    );
  }

  // ── Source Type Breakdown ──
  const hasBreakdown = internetPct > 0 || publicationPct > 0 || studentPct > 0;
  if (hasBreakdown) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: 'SOURCE TYPE BREAKDOWN',
            font: 'Calibri',
            size: 22,
            bold: true,
            color: COLORS.gray,
            characterSpacing: 150,
          }),
        ],
      }),
    );

    const breakdownItems = [
      internetPct > 0 ? `Internet Sources: ${internetPct}%` : null,
      publicationPct > 0 ? `Publications: ${publicationPct}%` : null,
      studentPct > 0 ? `Student Papers: ${studentPct}%` : null,
    ].filter(Boolean) as string[];

    for (const item of breakdownItems) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: item,
              font: 'Calibri',
              size: 22,
              color: COLORS.darkGray,
            }),
          ],
        }),
      );
    }
  }

  // ── Page Break ──
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
  );

  return paragraphs;
}

// ──────────────────────────────────────────────
// Highlighted document content generation
// ──────────────────────────────────────────────

function buildHighlightedDocumentChildren(
  params: HighlightedDocParams,
  sourceRefs: SourceReference[],
  sourceIndexMap: Map<string, number>,
): Paragraph[] {
  const { content, matchRegions } = params;
  const paragraphs = buildHighlightSegments(content, matchRegions);
  const docParagraphs: Paragraph[] = [];

  // Section header
  docParagraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: 'Highlighted Document',
          font: 'Calibri',
          size: 32,
          bold: true,
          color: COLORS.nigWriteGreen,
        }),
      ],
    }),
  );

  // Legend
  docParagraphs.push(
    new Paragraph({
      spacing: { after: 50 },
      children: [
        new TextRun({
          text: 'Highlight Legend: ',
          font: 'Calibri',
          size: 18,
          bold: true,
          color: COLORS.darkGray,
        }),
        new TextRun({
          text: 'Blue',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
          shading: { fill: COLORS.internet, type: ShadingType.CLEAR },
        }),
        new TextRun({
          text: ' = Internet  ',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
        }),
        new TextRun({
          text: 'Purple',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
          shading: { fill: COLORS.publication, type: ShadingType.CLEAR },
        }),
        new TextRun({
          text: ' = Publications  ',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
        }),
        new TextRun({
          text: 'Orange',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
          shading: { fill: COLORS.student_paper, type: ShadingType.CLEAR },
        }),
        new TextRun({
          text: ' = Student Papers  ',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
        }),
        new TextRun({
          text: 'Green',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
          shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
        }),
        new TextRun({
          text: ' = Primary Sources',
          font: 'Calibri',
          size: 18,
          color: COLORS.darkGray,
        }),
      ],
    }),
  );

  // Separator
  docParagraphs.push(
    new Paragraph({
      spacing: { before: 100, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightGray },
      },
      children: [],
    }),
  );

  // Build each paragraph with highlighted runs
  // Track which source refs we've already inserted superscript for
  let lastSourceId = '';
  let lastSourceEndIndex = -1;

  for (const paraSegments of paragraphs) {
    const runs: TextRun[] = [];

    for (const seg of paraSegments) {
      if (seg.isHighlighted && seg.sourceId) {
        const highlightColor = getHighlightColor(seg.sourceType, seg.isPrimary);

        // Add highlighted text
        runs.push(
          new TextRun({
            text: seg.text,
            font: 'Calibri',
            size: 22,
            shading: { fill: highlightColor, type: ShadingType.CLEAR },
          }),
        );

        // Add superscript reference at the end of each highlighted segment
        // Only add if this is a different source than the last one
        if (seg.sourceId !== lastSourceId) {
          const refIndex = sourceIndexMap.get(seg.sourceId);
          if (refIndex !== undefined) {
            runs.push(
              new TextRun({
                text: `[${refIndex}]`,
                font: 'Calibri',
                size: 16,
                superScript: true,
                color: COLORS.gray,
              }),
            );
            lastSourceId = seg.sourceId;
          }
        }
      } else {
        // Normal text
        runs.push(
          new TextRun({
            text: seg.text,
            font: 'Calibri',
            size: 22,
          }),
        );
        lastSourceId = '';
      }
    }

    docParagraphs.push(
      new Paragraph({
        spacing: { after: 150, line: 360 },
        children: runs,
      }),
    );
  }

  // ── Sources Referenced Section ──
  docParagraphs.push(
    new Paragraph({
      spacing: { before: 400, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.nigWriteGreen },
      },
      children: [],
    }),
  );

  docParagraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: 'Sources Referenced',
          font: 'Calibri',
          size: 32,
          bold: true,
          color: COLORS.nigWriteGreen,
        }),
      ],
    }),
  );

  if (sourceRefs.length === 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'No matching sources were found.',
            font: 'Calibri',
            size: 22,
            italics: true,
            color: COLORS.gray,
          }),
        ],
      }),
    );
  } else {
    for (const ref of sourceRefs) {
      const refChildren: TextRun[] = [
        new TextRun({
          text: `[${ref.index}]  `,
          font: 'Calibri',
          size: 22,
          bold: true,
          color: COLORS.nigWriteGreen,
        }),
        new TextRun({
          text: ref.sourceTitle,
          font: 'Calibri',
          size: 22,
          bold: true,
          color: COLORS.black,
        }),
        new TextRun({
          text: `  —  ${ref.sourceType}`,
          font: 'Calibri',
          size: 22,
          color: COLORS.gray,
        }),
        new TextRun({
          text: `  —  ${ref.percentage}% match`,
          font: 'Calibri',
          size: 22,
          color: COLORS.gray,
        }),
      ];

      if (ref.isPrimary) {
        refChildren.push(
          new TextRun({
            text: '  ★ Primary Source',
            font: 'Calibri',
            size: 22,
            color: COLORS.yellow,
            bold: true,
          }),
        );
      }

      docParagraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: refChildren,
        }),
      );
    }
  }

  // ── Footer ──
  docParagraphs.push(
    new Paragraph({
      spacing: { before: 600 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightGray },
      },
      children: [],
    }),
  );

  docParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: 'Generated by NigWrite — Nigeria\'s Academic Integrity & Writing Assistant Platform',
          font: 'Calibri',
          size: 18,
          color: COLORS.mediumGray,
          italics: true,
        }),
      ],
    }),
  );

  docParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Created by Wabi The Tech Nurse',
          font: 'Calibri',
          size: 18,
          color: COLORS.mediumGray,
          italics: true,
        }),
      ],
    }),
  );

  return docParagraphs;
}

// ──────────────────────────────────────────────
// Main export function
// ──────────────────────────────────────────────

export async function generateHighlightedDocument(
  params: HighlightedDocParams,
): Promise<Buffer> {
  // Build source references
  const sourceRefs = buildSourceReferences(params.sourceBreakdown);
  const sourceIndexMap = buildSourceIndexMap(params.sourceBreakdown);

  // Build cover page
  const coverChildren = buildCoverPageChildren(params);

  // Build highlighted document
  const documentChildren = buildHighlightedDocumentChildren(
    params,
    sourceRefs,
    sourceIndexMap,
  );

  // Combine all children
  const allChildren = [...coverChildren, ...documentChildren];

  // Create the DOCX document
  const doc = new Document({
    features: {
      updateFields: true,
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'NigWrite Originality Report  —  Page ',
                    font: 'Calibri',
                    size: 16,
                    color: COLORS.mediumGray,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Calibri',
                    size: 16,
                    color: COLORS.mediumGray,
                  }),
                ],
              }),
            ],
          }),
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.lightGray },
                },
                children: [
                  new TextRun({
                    text: 'Nig',
                    font: 'Calibri',
                    size: 16,
                    bold: true,
                    color: COLORS.black,
                  }),
                  new TextRun({
                    text: 'Write',
                    font: 'Calibri',
                    size: 16,
                    bold: true,
                    color: COLORS.nigWriteGreen,
                  }),
                  new TextRun({
                    text: '  |  Confidential',
                    font: 'Calibri',
                    size: 16,
                    color: COLORS.mediumGray,
                  }),
                ],
              }),
            ],
          }),
        },
        children: allChildren,
      },
    ],
  });

  // Generate the document buffer
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
