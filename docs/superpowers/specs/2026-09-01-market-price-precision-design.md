# Market-Aware Price Precision Design

## Context

The calculator currently rounds stock prices to two decimal places in plan rebuilding, quote normalization, operation entry, and several history paths. That matches US equities, but A-share prices commonly require three decimal places. Changing the global precision would make existing US plans display values such as `100.000` and could alter their current behavior.

## Goals

- Let each plan declare whether it is for US equities or A-shares.
- Preserve current US behavior for existing and new US plans.
- Support three decimal places for A-share prices throughout input, quote handling, calculations, and price display.
- Keep amount and share formatting unchanged.
- Keep old backups and plans loadable without a migration step.

## Non-goals

- Changing currency labels or amount calculations to CNY.
- Changing share-count precision or amount display precision.
- Automatically inferring a market from a ticker symbol.
- Supporting mixed markets within one plan.

## Data model and compatibility

Add `market` to the plan model with values `US` and `CN`.

- New plans default to `US`.
- Existing plans and imported backups with no `market` field are normalized as `US`.
- The field is preserved when plans are saved, edited, exported, and imported.
- Invalid market values normalize to `US`.

## Precision rules

Introduce shared market-aware helpers rather than duplicating conditionals in components:

- `getPriceDecimals(marketOrPlan)`: returns `3` for `CN`, otherwise `2`.
- `roundPrice(value, marketOrPlan)`: numeric rounding using the market's price decimals.
- `formatPrice(value, marketOrPlan)`: locale display with zero to the market's maximum price decimals, so whole values remain `100` rather than `100.000`.

Price precision applies to:

- manual price fields and edit drafts;
- fetched quote normalization and manual quote fallback;
- plan rebuilds, split-adjusted prices, and suggested-share calculations;
- Dashboard, Operation, and History price displays.

Amounts continue to use existing money formatting. Share counts continue to use their existing formatting and rounding.

## User experience

Settings adds a compact market selector alongside the plan-level configuration. Labels are “美股” and “A股”. Selecting A股 allows three decimal places in price inputs and displays prices such as `12.345`; selecting 美股 retains the existing two-decimal behavior. Switching the market does not rewrite stored raw values except where the existing save/rebuild normalization intentionally rounds a price to the selected market precision.

## Data flow

1. Settings normalizes the plan market and saves it with the plan.
2. App-level rebuild logic reads the market and rounds prices through the shared helper.
3. Quote hooks/services receive the market precision when normalizing fetched or fallback prices.
4. Presentational components use the same helper for price output.
5. Backup import normalization supplies `US` for missing or invalid market values.

## Error handling

Malformed or missing market values fall back to `US`. Non-finite or non-positive prices retain the existing invalid-price behavior. Precision changes must not bypass existing budget limits, split adjustment, or calculation guards.

## Testing

Add focused unit/component tests for:

- market normalization and the legacy `US` default;
- two-decimal US rounding and display;
- three-decimal CN rounding and display without forced trailing zeros;
- suggested shares using an A-share price such as `12.345`;
- quote normalization with market-specific precision;
- Settings saving the selected market;
- backup import/export compatibility for plans without `market`.

Run the full Vitest suite and production build after implementation.
