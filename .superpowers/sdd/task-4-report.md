# Task 4 Report: Apply Precision to Rebuild and Calculation Paths

## Status

DONE

## Files changed

- `src/App.jsx`
- `src/App.test.jsx`

The focused calculation test files were included in the Task 4 staging command and remain unchanged.

## Implementation

- Imported `roundPrice` and passed the plan market into record asset normalization.
- Rebuilt record prices with market-aware precision while retaining `roundToTwo` for amounts, shares, and budgets.
- Rounded split-adjusted prices to the selected market precision before calculating adjusted amounts.
- Added CN regression coverage for three-decimal record prices, recommendation shares, amount rounding, split-adjusted prices, and legacy plans without a market.

## Verification

Red phase:

```text
npm test -- src/App.test.jsx
1 failed, 12 passed; CN rebuilt price was 12.35 instead of 12.345.
```

Focused green phase:

```text
npm test -- src/App.test.jsx src/utils/dcaCalc.test.js src/utils/vaCalc.test.js
Test Files  3 passed (3)
Tests  28 passed (28)
```

Full suite:

```text
npm test
Test Files  28 passed (28)
Tests  155 passed (155)
```

`git diff --check` completed without findings.

## Commit

`a3f9c1a feat: preserve A-share precision during rebuilds`

## Concerns

- Existing `roundPrice` behavior defaults plans without a market to US precision, preserving legacy two-decimal prices.
- The prior tracked Task 3 report was not modified; this report replaces the older content at the requested Task 4 path.
