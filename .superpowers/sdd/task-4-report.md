Status: DONE

Implemented the mobile theme accent palette positioning fix.

Change:
- src/index.css: within the max-width 640px `.theme-accent-menu` rule, reset the desktop `bottom` anchor and position the palette below the mobile topbar control with `bottom: auto` and `top: calc(100% + 0.5rem)`.

Verification:
- `npx vitest run src/theme.tokens.test.js`: 1 file, 5 tests passed.
- `npm test`: 24 files, 104 tests passed.
- `npm run build`: passed (`vite build`, 1691 modules transformed).
