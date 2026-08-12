# Stock Split Adjustment Design

## Goal

Allow users to record stock split and reverse-split events so historical DCA/VA records remain numerically correct without overwriting the raw transaction data.

## Behavior

- A split event belongs to one ticker and contains an effective date and a ratio expressed as `newShares:oldShares`.
- Both forward splits (`2:1`) and reverse splits (`1:2`) are valid.
- Fractional shares are preserved; no truncation or cash-in-lieu calculation is performed.
- Records dated before the effective date are projected into the latest share basis by multiplying shares by the cumulative split factor and dividing price by the same factor. Records dated on or after the effective date are already in the new basis.
- Raw `price` and `actualShares` fields remain unchanged. Derived `adjustedPrice`, `adjustedShares`, and `splitFactor` fields are rebuilt from raw data whenever plan state is rebuilt.
- Initial holdings use the same projection. The original starting quantity/cost are retained in `initialSharesOriginal` and `initialAverageCostOriginal`; the displayed/current-basis values remain available as `initialShares` and `initialAverageCost`.
- Multiple events for the same ticker are applied in effective-date order. Events after the current date are ignored until they become effective.
- Removing or replacing an event rebuilds all derived state from raw records, so an event can never be applied twice.

## Data model

```js
plan.splitEvents = [
  {
    id: 'split-...',
    ticker: 'QLD',
    effectiveDate: '2026-06-01',
    newShares: 2,
    oldShares: 1,
    createdAt: '2026-08-12T00:00:00.000Z',
  },
]
```

Legacy plans and backups without `splitEvents` are treated as having an empty event list.

## UI

The Settings page adds a Stock split events section. Users choose a configured ticker, enter an effective date, and enter a ratio such as `2:1` or `1:2`. Existing events are listed with a delete action. Invalid tickers, dates, and ratios cannot be added.

History details show adjusted values only when they differ from raw values, making the adjustment auditable while keeping the original transaction entry visible.

## Error handling

- Ratios must contain two positive finite numbers separated by `:`.
- Effective dates must be valid `YYYY-MM-DD` dates.
- Malformed persisted events are discarded during normalization.
- A zero/negative split factor falls back to `1` so legacy data remains usable.

## Testing

- Unit tests cover ratio parsing, date boundaries, multiple events, reverse splits, fractional shares, malformed event normalization, and raw-value preservation.
- App rebuild tests cover current shares, initial cost, historical adjusted fields, and removal/rebuild idempotence.
- Existing tests and the production build must continue to pass.
