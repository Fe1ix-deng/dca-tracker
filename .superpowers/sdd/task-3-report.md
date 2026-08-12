Status: DONE_WITH_CONCERNS

Implemented Task 3 CSS token and responsive palette styling.

Files changed:
- src/index.css: five accent token families, mono light surface tokens, split theme control, popover, swatch, selected/focus states, and compact mobile touch-target rules.
- src/theme.tokens.test.js: contract tests for the five selectors and confirmed brighter mono light values.

Tests:
- `npx vitest run src/theme.tokens.test.js src/components/Layout.theme.test.js src/hooks/useTheme.test.js`: 9/9 passed.
- `npm run build`: passed.
- `npm test`: 94/99 passed; five existing Dashboard.layout.test.js assertions fail against unrelated pre-existing Dashboard/Layout worktree changes (metric removal, chart removal, allocation table, and layout contract). These failures were not caused by the accent token CSS and must remain for the user's existing changes to resolve.

Self-review:
- Accent selectors preserve semantic positive/negative/warning/info tokens.
- Mono light values are exactly surface 241 241 238, panel 250 250 247, line 221 221 218.
- Compact theme and arrow controls are 44px; menu options are 44px minimum.

Commit pending after controller review of the unrelated baseline failures.

Review follow-up fixes:
- Anchored `.theme-accent-menu` above the theme control with `bottom: calc(100% + .5rem)` and `width: min(15rem, calc(100vw - 1.5rem))` so it remains visible in compact layouts.
- Removed conflicting Tailwind sizing, hover, text-color, and swatch utilities from `Layout.jsx`; dedicated CSS now guarantees 44px controls/options and the specified accent states and 1rem swatches.
- Preserved unrelated `ReleaseNotice` and Dashboard worktree changes.

Verification:
- `npx vitest run src/theme.tokens.test.js src/components/Layout.theme.test.js src/hooks/useTheme.test.js`: 3 files, 9 tests passed.
- `npm run build`: passed (`vite build`, 1691 modules transformed).

Review-fix verification (2026-08-12):
- Added exact unthemed `:root[data-accent='amber']`, `:root[data-accent='green']`, `:root[data-accent='rose']`, and `:root[data-accent='mono']` defaults; existing light/dark selectors remain later in the cascade and override them.
- Removed the conflicting JSX `flex` utility from the `.theme-control-actions` wrapper so its component CSS grid applies directly.
- `npx vitest run src/theme.tokens.test.js src/components/Layout.theme.test.js src/hooks/useTheme.test.js`: 3 files, 9 tests passed.
- `npm run build`: passed (`vite build`, 1691 modules transformed).
