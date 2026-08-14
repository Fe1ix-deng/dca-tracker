# Preserve Initial Holdings Implementation Plan

**Goal:** Keep user-entered pre-plan holdings and cost basis immutable while using accumulated holdings for DCA/VA calculations, and make dashboard price fallback per ticker.

**Architecture:** Store the user baseline in the existing `initialSharesOriginal` and `initialAverageCostOriginal` fields. Settings reads and writes those fields; derived `currentShares` remains available to the operation and dashboard calculations. Dashboard builds a last-known recorded price map for each ticker before applying live quote overrides.

**Tech Stack:** React, Vitest, Vite.

## Global Constraints

- Preserve existing local-storage data and unrelated working-tree changes.
- Use the existing calculation and storage helpers; do not add dependencies.
- Keep all monetary values rounded with existing project conventions.

### Task 1: Lock Baseline Holdings Behavior

**Files:**
- Modify: `src/App.test.jsx`
- Modify: `src/components/Settings.jsx`
- Modify: `src/App.jsx`

- [ ] Add a failing regression test proving a plan with an original baseline of 251.14 shares and one 6-share record keeps the baseline fields at 251.14 while derived current shares are 257.14.
- [ ] Run the focused test and confirm it fails because Settings/rebuild currently treats the derived current value as the editable baseline in legacy cases.
- [ ] Make Settings normalize and save `initialSharesOriginal` and `initialAverageCostOriginal` as the editable baseline, while passing baseline shares as the starting `currentShares` into the rebuild.
- [ ] Make rebuild prefer explicit original baseline fields and never replace them with accumulated shares or recorded buys.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Fix Per-Ticker Historical Price Fallback

**Files:**
- Modify: `src/utils/marketSnapshot.js`
- Modify: `src/utils/marketSnapshot.test.js`
- Modify: `src/components/Dashboard.jsx`

- [ ] Add a failing test proving the last valid price for each ticker can be collected from multiple historical records.
- [ ] Run the focused test and confirm it fails because Dashboard currently passes only the newest record's prices.
- [ ] Implement the smallest per-ticker historical fallback helper and use it before live quote resolution.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Full Verification

**Files:**
- No production files beyond Tasks 1-2.

- [ ] Run `npm test` and confirm all test files pass.
- [ ] Run `npm run build` and confirm the production build succeeds.
- [ ] Run `git diff --check` and inspect the final diff for scope and baseline-field preservation.
