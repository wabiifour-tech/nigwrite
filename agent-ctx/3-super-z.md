---
Task ID: 3
Agent: Super Z (Main)
Task: Rebuild PlagiarismReport component (Turnitin-style) + Add Exclusion Settings panel

Work Log:
- Read worklog.md, PlagiarismReport.tsx, page.tsx, winnowing-engine.ts, scan/route.ts, ScoreGauge.tsx, and all shadcn/ui components
- Completely rewrote PlagiarismReport.tsx as a Turnitin-style originality report:
  - A) Similarity Score Section: Two SVG-based score circles (Similarity Index + AI Detection) with score labels, stacked horizontal source-type breakdown bar (Internet/Publications/Student Papers/Primary Sources), color-coded segments with hover tooltips
  - B) Source Panel: Clickable source cards grouped by type (collapsible sections), each showing source title, percentage badge, region count, word count, source type badge, primary star indicator, color-coded left border, mini percentage bar; clicking a source filters and scrolls to matching regions in the document viewer
  - C) Enhanced Document Viewer: Source filter toolbar at top (toggle buttons to show/hide Internet/Publications/Student Papers highlights), line numbers alongside content, per-word inline highlighting with source-colored marks, primary source star indicators, hover tooltips showing source title + type, click-to-filter by source, pulse animation on active source regions, 600px max-height scrollable container
  - D) AI Detection Section: Per-sentence analysis preserved with Fix This buttons, score labels for both Similarity Index and AI Detection displayed side by side
  - E) Overall Layout: Turnitin-style two-column layout (document viewer left 2/3, source panel right 1/3 on desktop), stacked vertically on mobile, verdict banner at top with status badge and stats, summary stats cards
  - Backward compatibility: works with both old data (no sourceTypeBreakdown) and new data (has sourceTypeBreakdown) via fallback defaults
- Added Advanced Settings panel to page.tsx scan page:
  - Collapsible card below the upload area with Settings2 icon and chevron toggle
  - Three toggle switches (Switch component): Exclude quoted text (default ON), Exclude bibliography (default ON), Exclude citations (default ON)
  - Slider (0-50 words) for minimum match size (default 0)
  - Each setting has an icon, label, and description
  - Settings persisted to localStorage via loadExclusionSettings/saveExclusionSettings helper functions
  - Loaded on mount via useEffect, updated on change via updateExclusionSetting callback
- Updated scan handler in page.tsx to pass exclusionSettings in POST body to /api/scan
- Fixed TypeScript errors: explicit paragraph group typing, const assertions for source type literals in filter
- Fixed lint error: moved setState out of synchronous useEffect body into setTimeout callbacks for pulse animation
- Verified: TypeScript compilation passes clean (0 errors), ESLint passes (only pre-existing PWAInstallPrompt.tsx issue)

Files Modified:
- /home/z/my-project/src/components/PlagiarismReport.tsx (completely rewritten)
- /home/z/my-project/src/app/page.tsx (enhanced with exclusion settings)
- /home/z/my-project/worklog.md (updated)

Stage Summary:
- 2 UI files modified (PlagiarismReport.tsx completely rewritten, page.tsx enhanced)
- 0 API routes or library files modified
- New Turnitin-style features: dual score circles, stacked source-type breakdown bar, collapsible source panel with click-to-scroll, source filter toolbar, line numbers, pulse animations, primary source indicators
- New exclusion settings UI: collapsible panel with 3 toggles + slider, localStorage persistence
- Full backward compatibility maintained for old API data format
- Responsive: two-column on desktop, stacked on mobile
