# 2.4.0 Release Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete user-facing summary of all changes since 2.3.0 and surface it through the existing bell release notice.

**Architecture:** Keep release metadata centralized in `src/utils/releaseNotice.js`; the existing `ReleaseNotice` component will consume the new version, date, and concise Chinese items without introducing a second content path. Keep package metadata and `CHANGELOG.md` aligned with the same 2.4.0 release.

**Tech Stack:** React 18, Vite, Vitest, npm package metadata.

## Global Constraints

- Release version is exactly `2.4.0`.
- Release date is exactly `2026-08-13`.
- User-facing copy is concise Chinese and describes behavior rather than implementation details.
- Include all user-visible changes since `2.3.0`, including committed and current working-tree changes.
- Do not alter unrelated application behavior or discard existing working-tree changes.

### Task 1: Update Release Metadata

**Files:**
- Modify: `src/utils/releaseNotice.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces `CURRENT_RELEASE.version`, `.date`, and `.items` for the bell panel.

- [ ] **Step 1: Write the 2.4.0 release metadata and changelog entry**

Set the release metadata to version `2.4.0` and date `2026-08-13`. Use concise bullets covering stock split and reverse-split adjustments, persistent accent palette choices, the reduced dashboard with next-period and continuity signals, the compact operation card, and layout/accessibility refinements. Set the package version and lockfile root package version to `2.4.0`, and add the same user-facing summary under a new `2.4.0` section at the top of `CHANGELOG.md`.

- [ ] **Step 2: Inspect the resulting diff**

Run: `git diff -- src/utils/releaseNotice.js package.json package-lock.json CHANGELOG.md`

Expected: only the release metadata, package version, lockfile version, and new changelog entry change; existing entries remain intact.

### Task 2: Add Release Regression Coverage

**Files:**
- Modify: `src/utils/releaseNotice.test.js`

**Interfaces:**
- Verifies the release notice remains visible to users who have acknowledged `2.3.0` and that the new item list is populated.

- [ ] **Step 1: Add focused assertions**

Assert `CURRENT_RELEASE.version` is `2.4.0`, its date is `2026-08-13`, and its item list contains the key user-facing topics: 拆股, 强调色, 总览, 本期操作, and 连续执行.

- [ ] **Step 2: Run focused tests**

Run: `npm test -- --run src/utils/releaseNotice.test.js src/components/ReleaseNotice.test.jsx`

Expected: all selected tests pass.

### Task 3: Verify the Full Workspace

**Files:**
- No additional files.

**Interfaces:**
- Confirms the release metadata change does not regress the existing application.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: Vitest exits with code 0 and all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite completes successfully and writes the production bundle to `dist`.

- [ ] **Step 3: Review final status and diff**

Run: `git status --short && git diff --stat`

Expected: the existing working-tree changes remain present, and the new release/version files are included without unrelated deletions.
