# Task 5 — Work Record

**Agent:** Super Z (Main Agent)  
**Task ID:** 5  
**Description:** PDF report export, batch document scanning, institutional/assignment dashboard, notifications, search

---

## Completed Items

### 1. Prisma Schema Update
- Added `Assignment`, `Submission`, `Notification` models
- Added relations to existing models: `User` (assignments, submissions, notifications), `Institution` (assignments), `Document` (submissions), `ScanReport` (submission)
- Fixed one-to-one relation on `Submission.reportId` with `@unique`
- Ran `prisma db push` successfully

### 2. PDF/HTML Report Export (`src/app/api/export/route.ts`)
- `POST /api/export` — accepts `{ reportId, format }`
- Generates a beautifully styled HTML report with inline CSS (NigWrite branding, verdict banner, scores, flagged segments, recommendations)
- Returns with `Content-Disposition: attachment` for download
- Also supports `format: 'text'` for plain text reports
- Includes: NigWrite branding, report title, date, verdict, similarity score, AI score, flagged segments with sources, recommendations

### 3. Export Button Component (`src/components/ExportButton.tsx`)
- Download button that calls `/api/export` with reportId
- Supports both HTML and text format
- Handles loading state, triggers blob download

### 4. Batch Document Scanning
- Updated `src/app/page.tsx` scan view to support multiple file uploads
- Added batch file input with `multiple` attribute
- Created `BatchScanProgress` component showing file list with status indicators (waiting/scanning/done/error), progress bars, similarity/AI scores

### 5. BatchScanProgress Component (`src/components/BatchScanProgress.tsx`)
- Shows list of files being scanned with animated progress bars
- Each file shows: name, status icon, status label, progress bar, similarity/AI scores when done
- Summary bar with completed/errored counts
- Overall progress bar

### 6. Assignments API (`src/app/api/assignments/route.ts`)
- `GET /api/assignments` — lists assignments with submission counts
- `POST /api/assignments` — creates new assignment (title, description, courseId, deadline, createdBy)

### 7. Submissions API (`src/app/api/submissions/route.ts`)
- `POST /api/submissions` — submit document to assignment
- `GET /api/submissions?assignmentId=xxx` — list submissions for assignment

### 8. Notifications API (`src/app/api/notifications/route.ts`)
- `GET /api/notifications` — list notifications (with optional userId filter)
- `GET /api/notifications?count=true` — get unread count
- `POST /api/notifications` — mark as read (notificationId) or create new (title+message)

### 9. Search API (`src/app/api/search/route.ts`)
- `GET /api/search?q=xxx&page=1&limit=20`
- Searches documents by title or content using Prisma's `contains` filter
- Returns matching documents with latest scan report scores
- Supports pagination

### 10. Navbar Notification Bell
- Added Bell icon with unread count badge (red pill)
- Click shows dropdown with recent notifications
- "Mark all read" button
- Individual click to mark as read
- Auto-fetches unread count every 30 seconds
- Type-based emoji icons (info, warning, success, error)

### 11. Instructor Dashboard View
- Added `renderInstructor()` function to page.tsx
- Create Assignment form with title, description, courseId, deadline fields
- Assignment list with expand/collapse to view submissions
- Each submission shows: student name, document title, similarity score, AI score, status badge
- Grading interface with feedback text input and "Grade" button
- Shows existing feedback after grading

### 12. Search View
- Added `renderSearch()` function to page.tsx
- Search input with Enter key support
- Results list showing document title, date, similarity/AI scores

---

## Files Created/Modified

**Created:**
- `src/app/api/export/route.ts`
- `src/app/api/assignments/route.ts`
- `src/app/api/submissions/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/search/route.ts`
- `src/components/ExportButton.tsx`
- `src/components/BatchScanProgress.tsx`

**Modified:**
- `prisma/schema.prisma` — Added Assignment, Submission, Notification models + relations
- `src/components/Navbar.tsx` — Added notification bell with dropdown
- `src/app/page.tsx` — Added batch scanning, search view, instructor dashboard view

---

## Verification
- ESLint: Clean (0 errors, 0 warnings)
- Dev Server: Running, serving 200 OK
- Prisma db push: Successful
