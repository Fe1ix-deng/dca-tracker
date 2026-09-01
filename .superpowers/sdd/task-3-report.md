# Task 3 Report: Market-Aware Price Inputs and Quotes

## Files changed

- `src/components/OperationPanel.jsx`
- `src/components/OperationPanel.test.jsx`
- `src/components/History.jsx`
- `src/components/History.test.jsx`
- `src/hooks/useQuote.js`
- `src/hooks/useQuote.test.js`
- `src/services/marketQuotes.js`
- `src/services/marketQuotes.test.js`
- `api/quotes.js`
- `api/quotes.test.js`

## Implementation

- `fetchQuote(ticker, marketOrPlan)` rounds returned prices through `roundPrice`, preserving two-decimal US behavior and enabling three-decimal CN behavior.
- The quote API now validates finite positive values without applying an unconditional `toFixed(2)`.
- `fetchMarketQuotes` converts valid quote prices to numbers without reducing precision.
- OperationPanel price input and auto-fetch display use market-aware normalization/formatting and pass `plan.market` to quote fetching.
- History price drafts, edit input handling, and rebuilt edited records use the plan market; share and amount rules remain unchanged.

## Verification

Red phase:

```text
npm test -- src/hooks/useQuote.test.js src/services/marketQuotes.test.js src/components/OperationPanel.test.jsx src/components/History.test.jsx api/quotes.test.js
4 failed, 1 passed; 4 tests failed as expected for missing CN precision behavior.
```

Focused green phase:

```text
npm test -- src/hooks/useQuote.test.js src/services/marketQuotes.test.js src/components/OperationPanel.test.jsx src/components/History.test.jsx api/quotes.test.js
Test Files  5 passed (5)
Tests       17 passed (17)
```

Full suite:

```text
npm test
Test Files  28 passed (28)
Tests       154 passed (154)
```

`git diff --check` completed without findings.

## Commit

`41711a0 feat: support market-aware price inputs and quotes`

## Concerns

- `fetchMarketQuotes` now omits invalid/non-positive quote entries; this preserves the existing usable-quote contract and lets callers fall back to manual input.
- The API remains market-agnostic by design; market-specific rounding occurs in `fetchQuote`, where the requested plan market is available.
