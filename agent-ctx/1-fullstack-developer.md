---
Task ID: 1
Agent: fullstack-developer
Task: Phase 1 - Core Engine Enhancement for Turnitin-style features

Work Log:
- Read worklog.md and analyzed existing codebase (winnowing-engine.ts, fingerprint-store.ts, scan/route.ts)
- Enhanced `/src/lib/winnowing-engine.ts` with:
  - Added `ExclusionSettings` interface with `excludeQuotes`, `excludeBibliography`, `excludeCitations`, `excludeSmallMatches` fields
  - Added `DEFAULT_EXCLUSION_SETTINGS` constant for backward compatibility
  - Added `isPrimary` optional field to `MatchRegion` and `SourceBreakdown` interfaces
  - Added `SourceTypeBreakdown` interface with internet/publications/studentPapers/primarySources categories
  - Added `sourceTypeBreakdown` and `primarySources` fields to `ScanResult`
  - Implemented `excludeCitations()` method with patterns for: parenthetical `(Author, Year)`, bracket `[1]`, narrative `Author (Year) found`, APA editorial markers `(Eds.)`, `(Trans.)`
  - Implemented `applyExclusions()` method that chains quote/bibliography/citation exclusion
  - Implemented `runFullScan()` method that accepts optional `ExclusionSettings` and returns enriched `ScanResult`
  - Implemented private `computeSourceTypeBreakdown()` that calculates per-type word counts/percentages and identifies top 3 primary sources
  - Implemented small match filtering via `excludeSmallMatches` parameter
  - Refactored `excludeQuotesAndBibliography()` to use new modular methods internally
  - Maintained full backward compatibility — `matchDocument()` still works exactly as before
- Updated `/src/lib/fingerprint-store.ts` with:
  - Added `userStore` Map for separate user-submitted document tracking
  - Added `userDocumentCount` counter
  - Added `addUserDocument(documentId, title, content, sourceType)` method that fingerprints and indexes into both main store and user store
  - Added `getUserDocumentCount()` method
  - Added `searchUserDocuments(hashes)` method for searching only user-submitted documents
- Updated `/src/app/api/scan/route.ts` with:
  - Added `exclusionSettings` parameter to POST body parsing
  - Changed pipeline to use `runFullScan()` with exclusion settings instead of manual `matchDocument()` calls
  - Added Step 7: `store.addUserDocument()` call after scan to index submissions for cross-checking
  - Added `sourceTypeBreakdown` and `primarySources` to the API response
  - Added `isPrimary` field to sourceBreakdown and matchRegions in response
  - Updated `toCorpusMatchEntries` import path to use `ExclusionSettings` and `DEFAULT_EXCLUSION_SETTINGS` from engine
- Verified TypeScript compilation passes cleanly (zero errors)
- Verified dev server running (no new errors introduced)
- Only pre-existing lint error in PWAInstallPrompt.tsx (outside scope — not a file we were asked to modify)

Stage Summary:
- 3 files modified: winnowing-engine.ts, fingerprint-store.ts, scan/route.ts
- 0 UI components modified (as instructed)
- 0 new dependencies required
- Full backward compatibility maintained — existing API calls without `exclusionSettings` use defaults and work identically
- New Turnitin-style features: source-type categorized scoring, citation exclusion, primary sources identification, dynamic document indexing, small match filtering
