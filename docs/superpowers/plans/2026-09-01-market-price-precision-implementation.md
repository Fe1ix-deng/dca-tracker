# Market-Aware Price Precision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plan-level US/A-share market setting so A-share prices support three decimals without changing existing US-plan behavior.

**Architecture:** Store a normalized `market` value on every plan, defaulting legacy data to `US`. Centralize price precision in `src/utils/marketPrecision.js`; all calculation, input, quote, and display paths call those helpers while amount and share formatting remain unchanged.

**Tech Stack:** React 18, Vite, Vitest, Intl.NumberFormat, existing localStorage backup and quote service.

## Global Constraints

- New plans default to `US`; missing or invalid market values normalize to `US`.
- `US` prices use up to 2 decimals; `CN` prices use up to 3 decimals.
- Price output must not force trailing zeros, so a whole value remains `100`, not `100.000`.
- Amount and share formatting stay on their existing rules.
- No ticker-based market inference and no mixed markets within a plan.
- Preserve existing budget limits, split adjustment, and invalid-price guards.

---

### Task 1: Add Shared Market Precision Utilities

**Files:**
- Create: `src/utils/marketPrecision.js`
- Create: `src/utils/marketPrecision.test.js`

**Interfaces:**
- Produces `normalizeMarket(value): 'US' | 'CN'`.
- Produces `getPriceDecimals(marketOrPlan): number`.
- Produces `roundPrice(value, marketOrPlan): number`.
- Produces `formatPrice(value, marketOrPlan): string`.
- Produces `normalizePriceInput(value, marketOrPlan): string`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest'
import {
  formatPrice,
  getPriceDecimals,
  normalizeMarket,
  normalizePriceInput,
  roundPrice,
} from './marketPrecision'

describe('market price precision', () => {
  it('defaults missing and invalid markets to US', () => {
    expect(normalizeMarket()).toBe('US')
    expect(normalizeMarket('CN')).toBe('CN')
    expect(normalizeMarket('unknown')).toBe('US')
    expect(getPriceDecimals({ market: 'CN' })).toBe(3)
  })

  it('keeps US prices at two decimals and does not force zeros', () => {
    expect(roundPrice(100.126, 'US')).toBe(100.13)
    expect(formatPrice(100, 'US')).toBe('100')
    expect(normalizePriceInput('12.345', 'US')).toBe('12.34')
  })

  it('supports three decimals for A-share prices without forced zeros', () => {
    expect(roundPrice(12.3456, 'CN')).toBe(12.346)
    expect(formatPrice(12.345, 'CN')).toBe('12.345')
    expect(formatPrice(100, 'CN')).toBe('100')
    expect(normalizePriceInput('12.3456', 'CN')).toBe('12.345')
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/utils/marketPrecision.test.js`

Expected: FAIL because `src/utils/marketPrecision.js` does not exist.

- [ ] **Step 3: Implement the minimal utility module**

Implement `normalizeMarket` using `value?.market ?? value`, accept only exact `CN`, and return `US` otherwise. Implement rounding with `Number(number.toFixed(decimals))`, display with `Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })`, and delegate input truncation/normalization to `normalizeNumericInput(value, { decimalPlaces: getPriceDecimals(...) })`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/utils/marketPrecision.test.js`

Expected: PASS with 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/marketPrecision.js src/utils/marketPrecision.test.js
git commit -m "feat: add market-aware price precision helpers"
```

### Task 2: Normalize and Persist the Plan Market

**Files:**
- Modify: `src/hooks/usePlan.js`
- Modify: `src/components/Settings.jsx`
- Test: `src/hooks/usePlan.test.js`
- Test: `src/components/Settings.test.jsx`

**Interfaces:**
- `normalizePlan` stores `market: normalizeMarket(plan.market)`.
- Settings form stores `market` and saves it unchanged after normalization.

- [ ] **Step 1: Write failing compatibility and Settings tests**

Add a `usePlan` test that loads a legacy plan without `market` and expects the returned plan to have `market: 'US'`. Add a Settings test that renders a plan, selects the A股 option, submits, and expects `onSavePlan` to receive `market: 'CN'`.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/hooks/usePlan.test.js src/components/Settings.test.jsx`

Expected: FAIL because normalized plans have no market and Settings has no market control.

- [ ] **Step 3: Implement normalization and the plan-level selector**

Import `normalizeMarket` in `usePlan.js`, add `market: 'US'` to `createEmptyPlan`, and normalize `plan.market`. Add `market: 'US'` to Settings' draft plan, preserve it in `normalizeFormPlan`, and render a two-option select/segmented control labeled `美股` (`US`) and `A股` (`CN`). Ensure `updateField` stores the selected value and the save payload includes it.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npm test -- src/hooks/usePlan.test.js src/components/Settings.test.jsx`

Expected: PASS, including all pre-existing tests in both files.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePlan.js src/components/Settings.jsx src/hooks/usePlan.test.js src/components/Settings.test.jsx
git commit -m "feat: add plan-level market setting"
```

### Task 3: Apply Market Precision to Price Inputs and Quotes

**Files:**
- Modify: `src/components/OperationPanel.jsx`
- Modify: `src/components/History.jsx`
- Modify: `src/hooks/useQuote.js`
- Modify: `src/services/marketQuotes.js`
- Modify: `api/quotes.js`
- Test: `src/hooks/useQuote.test.js`
- Test: `src/services/marketQuotes.test.js`
- Test: `api/quotes.test.js`

**Interfaces:**
- `fetchQuote(ticker, marketOrPlan)` returns a price rounded by the requested market.
- `fetchMarketQuotes(symbols)` returns numeric quote values without imposing a US-only two-decimal round.

- [ ] **Step 1: Write failing quote and input tests**

Add tests asserting `fetchQuote('600519', 'CN')` returns `12.346` from a raw `12.3456` quote and `fetchQuote('SCHB', 'US')` returns `12.35`. Add an OperationPanel interaction test that normalizes `12.345` for a CN plan, and a History edit test that preserves three decimal places in a CN draft.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npm test -- src/hooks/useQuote.test.js src/services/marketQuotes.test.js src/components/OperationPanel.test.jsx src/components/History.test.jsx api/quotes.test.js`

Expected: FAIL because `fetchQuote` always rounds to two decimals and component inputs use the default two-decimal normalizer.

- [ ] **Step 3: Implement market-aware quote and input handling**

Remove the API's unconditional `toFixed(2)` from `parsePrice`; keep finite positive numeric validation. In `useQuote.js`, accept the market argument and round with `roundPrice`. Pass `plan.market` from OperationPanel auto-fetch and use `normalizePriceInput`/`formatPrice` for its price field. In History, use the plan market when creating/editing price drafts and when constructing edited records. Keep share fields on `formatNumericInput` with their current defaults.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm test -- src/hooks/useQuote.test.js src/services/marketQuotes.test.js src/components/OperationPanel.test.jsx src/components/History.test.jsx api/quotes.test.js`

Expected: PASS with existing US expectations unchanged and new CN precision assertions passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/OperationPanel.jsx src/components/History.jsx src/hooks/useQuote.js src/services/marketQuotes.js api/quotes.js src/hooks/useQuote.test.js src/services/marketQuotes.test.js src/components/OperationPanel.test.jsx src/components/History.test.jsx api/quotes.test.js
git commit -m "feat: support market-aware price inputs and quotes"
```

### Task 4: Apply Precision to Rebuild and Calculation Paths

**Files:**
- Modify: `src/App.jsx`
- Test: `src/App.test.jsx`
- Test: `src/utils/dcaCalc.test.js`
- Test: `src/utils/vaCalc.test.js`

**Interfaces:**
- `rebuildPlanState` uses `roundPrice(asset.price, plan)` for record prices and all price-derived values.
- Existing `roundToTwo` remains for amounts, shares, and budget totals.

- [ ] **Step 1: Write the failing rebuild regression test**

Add a test with a `market: 'CN'` plan and a record price of `12.345`. Expect the rebuilt record price to remain `12.345`, the suggested shares to be calculated from `12.345` rather than `12.35`, and the resulting actual amount to equal `12.345 * actualShares` rounded by the existing amount rule. Add a legacy plan fixture without market and assert it still rounds a price such as `12.345` to `12.35`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/App.test.jsx`

Expected: FAIL because `rebuildPlanState` currently calls `roundToTwo` for every price.

- [ ] **Step 3: Implement market-aware rebuild rounding**

Import `roundPrice` in `App.jsx`; update `normalizeRecordAssets` to accept the plan market, and replace only price rounding calls with `roundPrice`. Keep all amount, share, and cumulative budget calls on `roundToTwo`. Pass the plan to the normalizer from `rebuildPlanState`, and ensure split-adjusted price values are rounded to the selected market precision after adjustment.

- [ ] **Step 4: Run focused and calculation tests to verify they pass**

Run: `npm test -- src/App.test.jsx src/utils/dcaCalc.test.js src/utils/vaCalc.test.js`

Expected: PASS with old US fixtures unchanged and the CN regression passing.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx src/utils/dcaCalc.test.js src/utils/vaCalc.test.js
git commit -m "feat: preserve A-share precision during rebuilds"
```

### Task 5: Update Dashboard and History Price Presentation

**Files:**
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/components/History.jsx`
- Modify: `src/components/OperationPanel.jsx`
- Test: `src/components/Dashboard.layout.test.js`
- Test: `src/components/History.test.jsx`
- Test: `src/components/OperationPanel.test.jsx`

**Interfaces:**
- All visible price labels use `formatPrice(value, plan)`.
- Money metrics continue using `formatMoney`; share labels continue using `formatShares` or existing numeric input formatting.

- [ ] **Step 1: Write failing display assertions**

Add CN component fixtures containing `12.345` and assert Dashboard, OperationPanel, and History render `12.345`. Add US fixtures containing `100` and assert they render `100`, never `100.000`.

- [ ] **Step 2: Run focused display tests to verify they fail**

Run: `npm test -- src/components/Dashboard.layout.test.js src/components/History.test.jsx src/components/OperationPanel.test.jsx`

Expected: FAIL because price labels are currently absent or fixed at two decimals.

- [ ] **Step 3: Implement display formatting**

Import `formatPrice` in each component and replace only price-specific `toFixed(2)`/numeric display paths. Keep percent, money, weights, and share displays unchanged. For History CSV, preserve numeric price values from records so exports are not padded with trailing zeros.

- [ ] **Step 4: Run focused display tests to verify they pass**

Run: `npm test -- src/components/Dashboard.layout.test.js src/components/History.test.jsx src/components/OperationPanel.test.jsx`

Expected: PASS with both market fixtures and all existing layout assertions.

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.jsx src/components/History.jsx src/components/OperationPanel.jsx src/components/Dashboard.layout.test.js src/components/History.test.jsx src/components/OperationPanel.test.jsx
git commit -m "feat: format displayed prices by plan market"
```

### Task 6: Verify Backup Compatibility and Full Application Behavior

**Files:**
- Test: `src/utils/backup.test.js`
- Test: `src/hooks/usePlan.test.js`

**Interfaces:**
- Backup JSON remains structurally unchanged; `buildBackupPayload` and `parseBackupPayload` preserve a present `market`, while `normalizePlanState` supplies `US` for legacy plans.

- [ ] **Step 1: Add explicit backup regression coverage**

Extend `src/utils/backup.test.js` with a round-trip assertion for a plan containing `market: 'CN'`, and extend `src/hooks/usePlan.test.js` with a legacy payload assertion that `normalizePlanState([{ id: 'legacy', assets: [] }]).plans[0].market` is `US`. These tests document that backup parsing preserves data and plan normalization owns compatibility.

- [ ] **Step 2: Run the focused regression tests**

Run: `npm test -- src/utils/backup.test.js src/hooks/usePlan.test.js`

Expected: PASS, with the market preservation and legacy default assertions included.

- [ ] **Step 3: Run the complete verification suite**

Run: `npm test && npm run build`

Expected: Vitest exits 0 with zero failed tests, and Vite build exits 0.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --stat && git status --short`

Expected: only the market precision feature files and its design/plan documents are changed; no unrelated files are modified. Commit any test-only changes with `git add src/utils/backup.test.js src/hooks/usePlan.test.js && git commit -m "test: verify market precision backup compatibility"`.
