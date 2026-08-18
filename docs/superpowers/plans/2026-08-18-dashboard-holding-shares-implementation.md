# Dashboard Holding Shares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore per-ticker current holding share counts to the Dashboard allocation table.

**Architecture:** Keep the existing `plan.assets[].currentShares` data flow and portfolio calculations. Add a small local formatter in `Dashboard.jsx`, extend the allocation table with a matching header/data column, and lock the behavior with the existing static-source and server-render rendering tests.

**Tech Stack:** React 18, Vitest, Vite, Tailwind utility classes, CSS grid.

## Global Constraints

- Do not change DCA/VA calculations, quote resolution, or existing overview metrics.
- Display shares per ticker; do not introduce an aggregate cross-ticker share metric.
- Preserve responsive table behavior and existing visual language.

### Task 1: Add failing Dashboard regression coverage

**Files:**
- Modify: `src/components/Dashboard.layout.test.js`

- [ ] **Step 1: Write the failing test**

Add a render assertion in the Dashboard metric rendering suite:

```js
it('renders current holding shares for each ticker in the allocation table', () => {
  const markup = renderDashboard([createRecord(1)])

  expect(markup).toContain('持仓股数')
  expect(markup).toContain('3 股')
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/components/Dashboard.layout.test.js`

Expected: FAIL because the allocation table has no `持仓股数` column or share value.

### Task 2: Render the per-ticker shares column

**Files:**
- Modify: `src/components/Dashboard.jsx`

- [ ] **Step 1: Add a focused share formatter**

Add beside the existing money formatters:

```js
function formatShares(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0'
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  })
}
```

- [ ] **Step 2: Include shares in allocation row data**

Add `shares: Number(asset.currentShares) || 0` to each `currentWeightData` entry.

- [ ] **Step 3: Add the matching header and cell**

Change the allocation table grid from four to five conceptual cells by adding `持仓股数` after `Ticker`, and render `{formatShares(asset.shares)} 股` in the corresponding row cell. Keep market value right aligned.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/components/Dashboard.layout.test.js`

Expected: PASS with the new share assertion and all existing Dashboard tests passing.

### Task 3: Verify the complete change

**Files:**
- Modify: `src/index.css` only if the existing allocation grid requires an explicit five-column rule after visual/test inspection.

- [ ] **Step 1: Inspect the allocation grid rules**

Run: `sed -n '1295,1360p' src/index.css` and confirm the grid uses a flexible column definition that accommodates the added cell. Only add a scoped five-column template if the current rule cannot align five cells.

- [ ] **Step 2: Run all automated tests**

Run: `npm test`

Expected: Vitest exits with code 0 and no failed tests.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite exits with code 0 and emits the production bundle.

- [ ] **Step 4: Review the diff**

Run: `git diff --check && git diff -- src/components/Dashboard.jsx src/components/Dashboard.layout.test.js src/index.css`

Expected: no whitespace errors and only the scoped share-display changes are present.
