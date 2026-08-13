# Dashboard Information Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Dashboard information density while preserving the values and actions needed to understand current status and execute the next period.

**Architecture:** Keep the existing Dashboard calculations and quote/allocation data flow. Replace only the rendered Dashboard summary, action, execution-status, and allocation markup; remove chart-only calculations and Recharts chart imports that no longer have consumers. Use focused CSS grid classes for the new intrinsic-height overview and compact table.

**Tech Stack:** React 18, Vite, Tailwind CSS, Recharts (retained elsewhere only if needed), Vitest.

## Global Constraints

- Do not change financial calculations, persisted data, quote refresh behavior, navigation callbacks, empty states, or other pages.
- The Dashboard summary has exactly four large metrics: current market value, floating profit, execution progress, and remaining deployable budget (or recent investment for open-ended plans).
- The action card is content-sized and top-aligned at desktop widths.
- Remove both large Dashboard performance/funding charts.
- Allocation diagnostics show ticker, current/target weight, deviation, market value, and one concise footer state.
- Update focused tests before production code and run `npm test` plus `npm run build` before completion.

---

### Task 1: Lock the reduced Dashboard contract with source-layout tests

**Files:**
- Modify: `src/components/Dashboard.layout.test.js`
- Test target: `src/components/Dashboard.jsx`, `src/index.css`

**Interfaces:**
- Produces source-level assertions that the implementation must satisfy.

- [ ] **Step 1: Add failing assertions for the reduced summary and removed charts**

Add tests in `src/components/Dashboard.layout.test.js` that assert:

```js
it('uses the reduced overview metric set and removes duplicated summary chips', () => {
  expect(dashboardSource).toContain("label: '当前总市值'")
  expect(dashboardSource).toContain("label: '浮动盈亏'")
  expect(dashboardSource).toContain("label: '执行进度'")
  expect(dashboardSource).toContain("label: isOpenEnded ? '最近投入' : '剩余可投'")
  expect(dashboardSource).not.toContain("label: '累计总投入'")
  expect(dashboardSource).not.toContain('dashboard-overview-meta')
})

it('keeps only next-period facts in the action card', () => {
  expect(dashboardSource).toContain('下一期')
  expect(dashboardSource).not.toContain('最新记录')
  expect(dashboardSource).not.toContain('执行前确认')
})

it('removes large dashboard performance and funding charts', () => {
  expect(dashboardSource).not.toContain('AreaChart')
  expect(dashboardSource).not.toContain('投入节奏')
  expect(dashboardSource).not.toContain('资产表现')
})

it('uses a compact allocation table with deviation and market value', () => {
  expect(dashboardSource).toContain('dashboard-allocation-table')
  expect(dashboardSource).toContain('当前 / 目标')
  expect(dashboardSource).toContain('市值')
  expect(dashboardSource).toContain('没有超过')
})

it('keeps the action card intrinsic-height and top aligned', () => {
  expect(stylesSource).toMatch(/\.dashboard-overview-layout\s*\{[\s\S]*align-items:\s*start;/)
  expect(stylesSource).toMatch(/\.dashboard-action-summary\s*\{[\s\S]*height:\s*fit-content;/)
})
```

Use the existing release-notice assertions only if they still describe current source behavior; do not restore release notice markup as part of this task.

- [ ] **Step 2: Run the focused layout test and verify it fails for missing reduced-contract behavior**

Run:

```bash
npm test -- src/components/Dashboard.layout.test.js
```

Expected: FAIL because the current Dashboard still renders the old chart cards, duplicated facts, and overview meta grid.

---

### Task 2: Replace Dashboard rendering with the reduced information hierarchy

**Files:**
- Modify: `src/components/Dashboard.jsx`

**Interfaces:**
- Consumes existing `plan`, `records`, quote snapshot, budget calculations, and `currentWeightData`.
- Produces the same Dashboard component API: `Dashboard({ plan, records, onNavigate })`.

- [ ] **Step 1: Remove chart-only imports, constants, calculations, and helpers**

Remove Recharts imports used only by the removed charts and pie hover rendering: `Area`, `AreaChart`, `CartesianGrid`, `Cell`, `Line`, `Pie`, `PieChart`, `ResponsiveContainer`, `Sector`, `Tooltip`, `XAxis`, and `YAxis` when no remaining markup uses them. Remove `chartTickStyle`, `chartTooltipStyle`, `chartColors`, `chartInitialSizes`, `PIE_COLORS`, `LegendPill`, `ActiveWeightShape`, `formatCompactMoney`, `formatMultiple`, `formatQuoteTime`, `averageBudgetPerRemaining`, `performanceData`, `fundingData`, `averageCostMap`, `safeActiveWeightIndex`, `activeWeight`, `latestPerformancePoint`, `previousPerformancePoint`, `periodNetChange`, `averagePeriodAmount`, and `capitalMultiple` if they are no longer referenced by the reduced markup.

Retain quote display state and refresh behavior because allocation market values and the quote status still use them.

- [ ] **Step 2: Update the four summary metrics**

Replace the existing `metrics` array with:

```jsx
const metrics = [
  {
    label: '当前总市值',
    value: formatMoney(marketValue),
    meta: <>覆盖 <span className="data-subtle">{plan.assets.length}</span> 个标的。</>,
    tone: 'text-white',
  },
  {
    label: '浮动盈亏',
    value: formatSignedMoney(floatingProfit),
    meta: <>{getProfitLabel(floatingProfit)} <span className="data-subtle">{formatPercent(floatingProfitPct)}</span>。</>,
    tone: floatingProfit >= 0 ? 'text-positive' : 'text-negative',
  },
  {
    label: '执行进度',
    value: isOpenEnded ? `${completedPeriods} 期` : `${completedPeriods}/${totalPeriods} 期`,
    meta: isOpenEnded ? '持续投入中' : `已完成 ${Math.round(expectedProgressRatio * 100)}%。`,
    tone: 'text-white',
  },
  {
    label: isOpenEnded ? '最近投入' : '剩余可投',
    value: isOpenEnded ? formatMoney(latestPeriodAmount) : formatMoney(remainingBudget),
    meta: isOpenEnded ? '最近一期实际投入。' : `保留底仓 ${formatMoney(reserveFloor)}。`,
    tone: 'text-white',
  },
]
```

Delete `summaryMeta`; the plan name and a single secondary line replace the old four metadata tiles/chips.

- [ ] **Step 3: Render a compact overview and action card**

Keep `.dashboard-overview-layout`, but render the main side as plan identity plus `dashboard-snapshot-grid`. The action card should render only the tag badge, next-period text, next-period date, and the existing `onNavigate('operation')` primary button:

```jsx
<aside className="dashboard-action-summary subtle-panel p-4">
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="mini-kicker">Next Action</p>
      <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">下一步操作</h3>
    </div>
    <span className={getTagBadgeClass(latestRecord.tag)}>{latestTagLabel}</span>
  </div>
  <div className="dashboard-action-facts">
    <div className="subtle-row"><span>下一期</span><span className="data-subtle">P{nextPeriodNumber} / {frequencyLabel}</span></div>
    <div className="subtle-row"><span>状态</span><span className="data-subtle">{isOpenEnded ? '持续投入中' : `${remainingPeriods} 期后结束`}</span></div>
  </div>
  <button type="button" onClick={() => onNavigate('operation')} className="control-button-primary dashboard-action-button w-full">进入本期操作<ArrowRight size={16} /></button>
</aside>
```

Use existing date/period values where available; do not invent a calendar date for the next period.

- [ ] **Step 4: Simplify execution status and allocation diagnostics**

Render one `.dashboard-execution-status` section with the fixed/open-ended progress state, a single pacing badge, and a continuity message based on `completedPeriods`. Render allocation as `.dashboard-allocation-table` with columns `Ticker`, `当前 / 目标`, `偏离`, and `市值`, plus a concise footer message based on the largest absolute `weightGap`.

Preserve quote refresh control and quote display text in the allocation header. Remove the donut, hover state, average-cost/latest-price columns, and duplicated asset list buttons. Keep `currentWeightData` calculation but remove fields no longer rendered only when they have no other consumer.

- [ ] **Step 5: Run focused tests and fix only implementation mismatches**

Run:

```bash
npm test -- src/components/Dashboard.layout.test.js
```

Expected: PASS with all reduced-contract assertions green.

---

### Task 3: Align Dashboard CSS with intrinsic action card and compact sections

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes the new Dashboard class names from Task 2.
- Produces responsive, non-overflowing layout for desktop, tablet, and mobile.

- [ ] **Step 1: Add focused layout rules**

Update the overview rules so `.dashboard-overview-layout` uses `align-items: start`, `.dashboard-overview-main` no longer creates a forced two-row equal-height matrix, `.dashboard-snapshot-grid` is the four-column metric grid, and `.dashboard-action-summary` uses `height: fit-content` with no forced stretch.

Add rules for:

```css
.dashboard-execution-status { ... }
.dashboard-execution-body { ... }
.dashboard-allocation-table { ... }
```

The allocation table must use a bounded `min-width` only inside its own scroll wrapper on narrow screens. Remove or leave unused old chart classes only if they are not shared by another component; do not change generic card or table styles.

- [ ] **Step 2: Run the focused layout tests**

Run:

```bash
npm test -- src/components/Dashboard.layout.test.js
```

Expected: PASS, including intrinsic-height and top-alignment regex assertions.

---

### Task 4: Full verification and visual smoke check

**Files:**
- Modify only if required by verification: `src/components/Dashboard.jsx`, `src/index.css`, `src/components/Dashboard.layout.test.js`

- [ ] **Step 1: Run the full Vitest suite**

Run:

```bash
npm test
```

Expected: all existing tests pass, including storage, plan, operation, history, release-notice, and Dashboard layout tests.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: Vite completes successfully without unresolved imports or compile errors.

- [ ] **Step 3: Start the existing dev server and inspect Dashboard**

Run `npm run dev` on an available port. Check the Dashboard with a fixed-budget plan and an open-ended plan. Confirm the action card is top-aligned and content-sized, the four summary metrics fit without overflow, the charts are absent, and allocation rows remain readable at desktop and mobile widths.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git diff --check
git status --short
```

Confirm only intended Dashboard implementation/test/CSS changes are part of this task; preserve unrelated worktree changes.
