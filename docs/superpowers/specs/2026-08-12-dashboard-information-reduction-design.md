# Dashboard Information Reduction Design

## Goal

Reduce the amount of repeated information on the Dashboard so a user can answer two questions quickly:

1. What is the current portfolio and plan status?
2. What should I do next?

The Dashboard remains a status-and-action surface. Detailed performance history stays available in History rather than occupying the first screen.

## Approved Layout

### Overview Summary Card

The existing overview card keeps the current plan identity and the primary action card, but removes the large configuration and execution-information stack.

The left side contains:

- Plan name as the primary identity.
- A compact secondary line for strategy and frequency (`VA 定投 · 双周`).
- Four metric cards:
  - `当前总市值`
  - `浮动盈亏`
  - `执行进度`
  - `剩余可投` for fixed-budget plans, or `最近投入` for open-ended plans.

The metrics are the only large numeric summary on the Dashboard. Supporting text remains short and contextual, such as asset count, return percentage, completed percentage, or reserve floor.

The left-side compact chips for strategy, frequency, execution progress, and remaining periods are removed. Execution progress must not appear both as a chip and as a large metric.

### Next Action Card

The action card remains a compact, content-sized card aligned to the top of the overview grid. It contains:

- A small execution-status badge (`正常执行`, `主动低配`, or `本期暂停` when applicable).
- The next period/date.
- One primary button linking to `本期操作`.

The latest-record date and the `价格 / 股数` instruction are removed from this card. They either duplicate existing history context or describe the destination page rather than the next action itself.

The card must not stretch to match the height of the metric area. It uses intrinsic height and top alignment at desktop widths; it stacks above or below the summary according to the existing responsive pattern on narrow screens.

### Execution Status Section

The Dashboard keeps one compact execution-status section below the overview card. It contains:

- Completed periods and total periods.
- Budget progress bar for fixed-budget plans, or the appropriate open-ended execution state.
- A single pacing badge (`节奏正常`, `投入偏快`, or `投入偏慢`).
- A short continuity signal, such as `已连续执行 X 期` or an equivalent no-records / paused state.

The following values are removed from this section because they repeat top-level summary or operation-page information:

- Recent investment amount.
- Average investment per period.
- Next-period available amount.

### Allocation Diagnostics

Keep allocation diagnostics because they can directly affect the next investment decision, but simplify the visual treatment:

- Replace the large donut and duplicate asset list with a compact table.
- Show ticker, current weight / target weight, weight deviation, and market value.
- Keep the existing positive/warning/negative deviation semantics.
- Include one concise footer state, for example `没有超过 ±5% 的显著偏离`, and a link or action to the full allocation view if one exists.
- Average cost and latest price remain available in the detailed allocation surface or History, not in this compact Dashboard table.

### Performance Trend

Remove the large `资产表现` and `投入节奏` chart cards from the Dashboard. The complete historical charts remain available in History or another detailed performance surface. No replacement chart is required on the Dashboard for this change.

## Data and Behavior

- Existing calculations for market value, floating profit, execution progress, remaining budget, pacing, and allocation deviation remain the source of truth.
- No persisted data shape changes are required.
- Fixed-budget and open-ended plans continue to use their existing labels and calculations.
- Empty states, quote refresh behavior, navigation callbacks, and release notices remain unchanged except where layout placement requires it.
- The primary action continues to navigate to `operation`.

## Responsive Rules

- Desktop: overview summary and compact action card form two columns; action card is top-aligned and content-sized.
- Tablet/mobile: columns stack using the existing breakpoint behavior; no card may create horizontal overflow.
- Metric values keep stable card dimensions and use existing truncation/number formatting rules.
- Allocation table may scroll horizontally only within its own bounded surface when necessary; the page itself must not overflow.

## Testing and Verification

Update focused Dashboard tests to verify:

- The large performance and funding chart cards are no longer rendered.
- The summary contains exactly the four approved metric labels for each budget mode.
- The action card renders only the next-action fields and primary navigation button.
- Execution status no longer renders recent/average/next-period funding tiles.
- Allocation diagnostics render the compact fields and preserve deviation tone classes.
- Responsive layout CSS keeps the action card intrinsic-height and top-aligned at desktop widths.

Run:

```bash
npm test
npm run build
```

## Non-goals

- No redesign of Operation, History, Settings, or navigation.
- No changes to financial calculations or stored records.
- No new charting library or new persisted preference.
- No visual restyle beyond the component density and layout changes required here.
