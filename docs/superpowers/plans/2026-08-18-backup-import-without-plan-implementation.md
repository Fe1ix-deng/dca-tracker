# Backup Import Without an Existing Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users restore a JSON backup immediately after clearing browser data, and ensure an import replaces stale plans instead of appending them.

**Architecture:** Keep JSON parsing and confirmation in the existing History flow, but expose the same import control from the no-plan state and Settings page through a shared callback. Add a `replacePlans` operation to `usePlan` so the App import handler persists the imported plan list atomically, then restores records and the selected plan.

**Tech Stack:** React 18, Vitest, Vite, lucide-react.

## Global Constraints

- Preserve the existing JSON backup schema and legacy single-plan payload compatibility.
- Do not change unrelated theme, dashboard, or storage behavior.
- Keep the current confirmation and pre-import safety backup behavior.
- Preserve untracked user screenshot files in the worktree.

---

### Task 1: Add an atomic plan-list replacement API

**Files:**
- Modify: `src/hooks/usePlan.js`
- Test: `src/hooks/usePlan.test.js` (create)

**Interfaces:**
- Produces `replacePlans(nextPlans, nextActivePlanId)` that normalizes the incoming list, persists it with `savePlans`/`saveActivePlanId`/`savePlan`, and updates hook state in one operation.

- [ ] **Step 1: Write the failing pure helper test**

Export a small `normalizePlanList` helper if needed and test that invalid entries are removed, duplicate IDs are replaced deterministically, and the requested active ID falls back to the first plan.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run src/hooks/usePlan.test.js`
Expected: FAIL because the replacement helper/API does not exist yet.

- [ ] **Step 3: Implement the minimal replacement API**

Add `replacePlans` beside `replacePlan`, use the existing `normalizePlan`, persist the entire normalized array, persist the active plan as the legacy `plan` key, and expose the callback from the hook memo return. Keep `replacePlan` unchanged for ordinary single-plan saves.

- [ ] **Step 4: Run the focused test again**

Run: `npm test -- --run src/hooks/usePlan.test.js`
Expected: PASS.

### Task 2: Make backup import available with no plan and replace state atomically

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/History.jsx`
- Modify: `src/components/Settings.jsx`
- Test: `src/components/History.test.jsx`
- Test: `src/App.test.jsx`

**Interfaces:**
- `App` passes the existing `onImportBackup` callback and a shared import-control-friendly handler to Settings.
- History renders its file input/import button in both the no-plan empty state and normal history header.
- Settings renders the same import action when editing or creating a plan.

- [ ] **Step 1: Add source-level regression assertions**

Assert that History contains an import control in the no-plan branch and Settings consumes `onImportBackup`. Add an App test fixture that imports an existing plan list after a temporary plan and verifies the temporary plan is absent.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- --run src/components/History.test.jsx src/App.test.jsx`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Extract/reuse the History import control**

Keep the existing file parsing, validation, confirmation, and callback behavior. Refactor only the button/input markup as needed so the no-plan empty state can trigger the same hidden file input. Do not duplicate parsing logic.

- [ ] **Step 4: Add the Settings import entry point**

Accept `onImportBackup` in Settings props and add a hidden JSON file input plus an import button near the plan review actions. Reuse the same parsing/confirmation behavior through a shared component or callback rather than implementing a second parser.

- [ ] **Step 5: Switch App import to atomic replacement**

Destructure `replacePlans` from `usePlan`, then call it once with `nextPlans` and `nextActivePlanId` instead of calling `replacePlan` for each imported item. Keep record replacement and navigation unchanged.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --run src/components/History.test.jsx src/App.test.jsx src/hooks/usePlan.test.js`
Expected: PASS.

### Task 3: Verify the full application

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Build the production bundle**

Run: `npm run build`
Expected: Vite completes successfully and emits the production bundle.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check` and `git status --short`
Expected: no whitespace errors; only the intended source/tests/plan files are changed, while existing screenshot files remain untouched.
