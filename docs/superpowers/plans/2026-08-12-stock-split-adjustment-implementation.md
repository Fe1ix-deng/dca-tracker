# Stock Split Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auditable manual stock split/reverse-split events with automatic historical and portfolio recalculation.

**Architecture:** A pure `stockSplits` utility validates events and calculates each asset's cumulative factor in the latest basis. `rebuildPlanState` applies those helpers to raw records and starting holdings, writing only derived adjustment fields. Settings owns event entry/deletion, while History exposes adjusted values for auditability.

**Tech Stack:** React, Vitest, Vite, existing localStorage backup and Tailwind-style utility classes.

## Global Constraints

- Interpret ratios as `newShares:oldShares`.
- Preserve fractional shares.
- Never overwrite raw record `price` or `actualShares`.
- Treat absent or malformed persisted split events as an empty list.
- Rebuild derived state from raw records on every plan/record change.

### Task 1: Add stock split calculation utilities

**Files:**
- Create: `src/utils/stockSplits.js`
- Create: `src/utils/stockSplits.test.js`

**Interfaces:**
- `parseSplitRatio(input)` returns `{ newShares, oldShares }` or `null`.
- `normalizeSplitEvents(events)` returns validated, date-sorted events.
- `getSplitFactor(ticker, date, events, asOfDate)` returns a positive cumulative factor.
- `adjustAssetForSplit(asset, factor)` returns raw-preserving derived values.

- [ ] Write failing tests for parsing, date boundary, forward/reverse/multiple events, fractional shares, and raw preservation.
- [ ] Run `npm test -- --run src/utils/stockSplits.test.js` and confirm the expected failures.
- [ ] Implement the minimal pure helpers and event normalization.
- [ ] Re-run the focused tests and then the existing utility tests.

### Task 2: Integrate split-aware rebuilding

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/hooks/usePlan.js`
- Modify: `src/utils/storage.js`
- Modify: `src/App.test.jsx`

**Interfaces:**
- `rebuildPlanState` consumes `plan.splitEvents` and emits adjusted record asset fields and current-basis plan assets.

- [ ] Add failing rebuild tests for a `2:1` event, a `1:2` event, event-date boundary, initial cost adjustment, and rebuild idempotence.
- [ ] Run the focused App tests to verify they fail before implementation.
- [ ] Normalize legacy plans with `splitEvents: []` and use original seed fields when present.
- [ ] Apply factors to historical assets, derive canonical shares/prices, and preserve raw fields.
- [ ] Re-run App and full unit tests.

### Task 3: Add Settings event management

**Files:**
- Modify: `src/components/Settings.jsx`
- Modify: `src/components/Settings.test.jsx`
- Modify: `src/index.css` only if an existing class cannot express the layout.

**Interfaces:**
- Settings saves validated `splitEvents` on the plan and can delete an event.

- [ ] Add failing helper/UI tests for valid event creation and invalid ratio/ticker/date rejection.
- [ ] Implement event draft state, ratio parsing, list rendering, delete action, and save integration.
- [ ] Run Settings tests and build.

### Task 4: Make history auditable

**Files:**
- Modify: `src/components/History.jsx`
- Modify: `src/components/History.test.jsx` if needed (create only if no focused test exists).

- [ ] Add a focused failing test for showing adjusted values only when they differ.
- [ ] Add adjusted columns to CSV and adjusted-value detail rows without changing raw edit inputs.
- [ ] Run focused History tests and the complete test suite.

### Task 5: Verify and document

**Files:**
- Modify: `使用说明.md` to document event entry, ratio semantics, and fractional shares.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Inspect `git diff` for raw-value preservation and legacy compatibility.
- [ ] Commit the implementation with a focused message.
