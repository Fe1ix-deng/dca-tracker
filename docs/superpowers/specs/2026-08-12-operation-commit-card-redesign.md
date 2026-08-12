# Operation Commit Card Redesign

## Goal

Redesign the `确认本期执行` card so it no longer leaves a large empty area below the note field on desktop, while preserving the existing decision and record-submission behavior.

## Approved Direction

Use a single-column `横向摘要` flow. The card reads from top to bottom in the same order as the user completes the task:

1. Understand the section and current readiness.
2. Choose the execution decision.
3. Review the financial summary.
4. Add an optional note.
5. Resolve the readiness message and confirm the record.

The existing desktop split between a large left form and a tall right submission panel is removed. This prevents the right panel from determining the card height and leaving unused space under the left note field.

## Layout

### Header

Keep the existing `Decision & Commit` label, `确认本期执行` heading, and concise supporting copy. Move the readiness badge (`Ready` or `Pending`) into the header's right side so submission state remains visible without requiring a separate panel.

### Decision Control

Keep the three existing segmented choices:

- `正常执行`
- `主动低配`
- `本期暂停`

The selected state, click behavior, and stored `tag` value remain unchanged.

### Financial Summary

Place the existing financial values directly below the decision control as a compact horizontal summary:

- `本期实际投入`
- `累计投入`
- `剩余可投` for fixed-budget plans only

The cards continue to use the current subdued surface style and monospaced numeric treatment. Open-ended plans render two equal-width summary items instead of reserving an empty third column.

### Note

Keep the optional note field below the financial summary. Reduce its default height from four rows to three rows because it is supplementary context rather than the primary task. It remains vertically resizable and keeps the existing value, placeholder, and change behavior.

### Submission Footer

Place the existing validation message and confirm button in a footer row separated by a subtle top border. The message occupies the flexible left side; the button is aligned right and keeps its existing enabled, disabled, and click behavior.

The message content remains state-dependent:

- Completed plan: explain that the total periods must be increased or a new plan created.
- Missing or loading prices: explain that all prices must be ready first.
- Ready: confirm that the record can be written to history.

The footer uses semantic tone styling but avoids an additional framed callout nested inside the main card.

## Responsive Behavior

- Wide desktop: decision choices and financial summary each use a three-column row; validation and action share the footer row.
- Tablet: the financial summary remains readable without shrinking below its stable minimum width. Fixed-budget summaries use two columns, with the third item spanning the available row when necessary.
- Mobile: decision choices may remain in their existing compact segmented row when they fit. Summary items stack into one column, and the validation message sits above a full-width confirm button.
- No viewport may gain horizontal page overflow, clipped amounts, or overlapping controls.

## Visual System

Use the current product tokens and established component language:

- Existing panel, line, text, muted, accent, positive, and warning tokens.
- Existing `0.5rem` control/card radius.
- Existing sans text roles and monospaced financial values.
- Accent color only for the selected decision, focus states, readiness emphasis, and enabled primary action.

The distinctive element is the compact horizontal financial strip positioned between the decision and note. It acts as the visual checkpoint for what will be committed without introducing new decorative styling.

## Data and Behavior

- No persisted data shape changes.
- No changes to amount, budget, readiness, or decision calculations.
- No changes to record construction, plan progression, share updates, or navigation.
- Fixed-budget and open-ended conditions continue to use their existing source values.
- Accessibility labels, keyboard behavior, disabled semantics, and focus visibility are preserved.

## Testing and Verification

Add focused layout contract coverage for the redesigned card:

- The former desktop split-panel layout is absent.
- The readiness badge appears in the header.
- Financial summary values appear before the note and submission footer.
- The footer contains the readiness message and confirmation action.
- Responsive CSS defines the expected summary and footer stacking behavior.

Run:

```bash
npm test
npm run build
```

Then verify the operation page in both light and dark themes at desktop and mobile widths. Confirm that the former lower-left empty area is gone, all values remain legible, the disabled/ready states are visually clear, and the page has no horizontal overflow.

## Non-goals

- No redesign of the asset input cards above this section.
- No change to the financial workflow or validation rules.
- No new persisted preference, animation, dependency, or navigation behavior.
- No unrelated Dashboard, History, Settings, or theme changes.
