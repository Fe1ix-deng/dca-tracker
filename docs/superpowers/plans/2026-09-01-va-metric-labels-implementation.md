# VA Metric Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify VA operation metrics without changing the existing four-card layout or calculation behavior.

**Architecture:** Keep `OperationPanel`'s existing metric grid and conditional strategy labels. Add translation entries for the VA-specific labels and supporting copy, then assert the rendered copy for VA and unchanged DCA behavior in the existing component tests.

**Tech Stack:** React, Vitest, Testing Library, existing i18n helper and CSS utility classes.

## Global Constraints

- Preserve the existing `operation-metrics-grid` four-card structure and responsive breakpoints.
- Do not change VA formulas, record fields, share rounding, or money formatting.
- Apply the new labels only to VA; DCA keeps its current labels.
- Preserve the existing “全部持仓价值” secondary line for VA.

### Task 1: Add Translation Entries

**Files:**
- Modify: `src/i18n/translations.js` near the operation metric labels

**Interfaces:**
- Produces translation keys consumed by `OperationPanel`: `计划内当前市值`, `本期目标持仓市值`, `距目标还需投入`, `不含计划创建前持仓`, `买入后计划内持仓应达到`, `目标值 − 当前计划内市值`, `按当前价格换算`.

- [ ] **Step 1: Add Chinese keys and English translations**

Add entries alongside the existing operation metric keys, retaining all existing keys for compatibility:

```js
'计划内当前市值': 'In-plan current market value',
'本期目标持仓市值': 'Target in-plan market value',
'买入后计划内持仓应达到': "Target after this period's purchase",
'距目标还需投入': 'Amount needed to reach target',
'目标值 − 当前计划内市值': 'Target minus current in-plan value',
'按当前价格换算': 'Based on current price',
'不含计划创建前持仓': 'Excludes holdings before plan start',
```

- [ ] **Step 2: Run i18n tests**

Run: `npm test -- --run src/i18n/i18n.test.js`

Expected: all i18n tests pass.

- [ ] **Step 3: Commit translation changes**

```bash
git add src/i18n/translations.js
git commit -m "feat: add clarified VA metric translations"
```

### Task 2: Update Operation Metric Copy

**Files:**
- Modify: `src/components/OperationPanel.jsx:435-463`
- Test: `src/components/OperationPanel.test.jsx`

**Interfaces:**
- Consumes the translation keys from Task 1 through the existing `t` function.
- Produces the same metric values and DOM grid structure with clarified labels and VA-only supporting copy.

- [ ] **Step 1: Add failing assertions for clarified VA copy**

Extend the existing VA operation panel test fixture/assertions to verify these visible strings:

```js
expect(screen.getByText('计划内当前市值')).toBeInTheDocument()
expect(screen.getByText('本期目标持仓市值')).toBeInTheDocument()
expect(screen.getByText('距目标还需投入')).toBeInTheDocument()
expect(screen.getByText('不含计划创建前持仓')).toBeInTheDocument()
expect(screen.getByText('买入后计划内持仓应达到')).toBeInTheDocument()
expect(screen.getByText('目标值 − 当前计划内市值')).toBeInTheDocument()
expect(screen.getByText('按当前价格换算')).toBeInTheDocument()
```

Add or retain a DCA assertion that `当前持仓价值`, `本期固定投入`, and `建议买入金额` remain visible.

- [ ] **Step 2: Run the focused test to verify the new assertions fail**

Run: `npm test -- --run src/components/OperationPanel.test.jsx`

Expected: FAIL because the current VA labels do not yet contain the new copy.

- [ ] **Step 3: Replace labels and add supporting copy without changing layout**

Within the existing four metric cards, use the strategy conditionals as follows:

```jsx
<p className="operation-metric-label">
  {plan.strategy === 'VA' ? t('计划内当前市值') : t('当前持仓价值')}
</p>
...
<p className="operation-metric-label">
  {plan.strategy === 'VA' ? t('本期目标持仓市值') : t('本期固定投入')}
</p>
<p className="mt-3 text-xs text-muted-foreground">
  {plan.strategy === 'VA' ? t('买入后计划内持仓应达到') : null}
</p>
...
<p className="operation-metric-label">
  {plan.strategy === 'VA' ? t('距目标还需投入') : t('建议买入金额')}
</p>
<p className="mt-3 text-xs text-muted-foreground">
  {plan.strategy === 'VA' ? t('目标值 − 当前计划内市值') : null}
</p>
...
<p className="operation-metric-label">{t('建议买入股数')}</p>
<p className="mt-3 text-xs text-muted-foreground">{t('按当前价格换算')}</p>
```

Keep the existing VA `全部持仓价值` line under the first card, and use `不含计划创建前持仓` as its supporting explanation. Keep the existing open-ended explanatory note under the amount card when applicable.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/components/OperationPanel.test.jsx src/utils/vaCalc.test.js`

Expected: all focused tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`

Expected: all project tests pass with no calculation snapshots or record-field changes.

- [ ] **Step 6: Commit UI and test changes**

```bash
git add src/components/OperationPanel.jsx src/components/OperationPanel.test.jsx
git commit -m "feat: clarify VA operation metrics"
```
