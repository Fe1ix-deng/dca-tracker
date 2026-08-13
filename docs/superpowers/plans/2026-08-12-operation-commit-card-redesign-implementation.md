# Operation Commit Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tall desktop split submission panel with the approved single-column horizontal-summary flow, eliminating the empty lower-left area without changing financial or submission behavior.

**Architecture:** Keep all calculations and handlers inside the existing `OperationPanel` component. Restructure only the final commit-card markup and add narrowly scoped `operation-commit-*` CSS classes; verify the layout contract through the repository's existing source-and-style test pattern and browser QA.

**Tech Stack:** React 18, Vite 7, Tailwind CSS 3 component layers, Vitest, agent-browser

## Global Constraints

- Preserve all persisted data shapes, calculations, record construction, plan progression, share updates, and navigation behavior.
- Reuse existing theme tokens, `0.5rem` radii, sans text roles, and monospaced financial values.
- Keep fixed-budget and open-ended plan states responsive without page overflow, clipped amounts, or overlapping controls.
- Do not alter asset input cards, Dashboard, History, Settings, navigation, dependencies, or theme behavior.
- Preserve accessibility labels, native keyboard behavior, disabled semantics, and visible focus states.

---

## File Structure

- Create `src/components/OperationPanel.layout.test.js`: source and CSS contract tests for the commit-card structure and breakpoints.
- Modify `src/components/OperationPanel.jsx`: reorder the existing commit-card fields into the approved single-column flow.
- Modify `src/index.css`: add scoped layout and semantic message styles for the commit card.

### Task 1: Lock the Approved Layout Contract

**Files:**
- Create: `src/components/OperationPanel.layout.test.js`
- Test: `src/components/OperationPanel.layout.test.js`

**Interfaces:**
- Consumes: Existing `OperationPanel.jsx` markup and `index.css` component rules.
- Produces: A static layout contract requiring `operation-commit-card`, `operation-commit-summary`, `operation-commit-footer`, header readiness, three-row notes, and responsive grid/footer rules.

- [ ] **Step 1: Write the failing layout test**

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const operationSource = readFileSync(new URL('./OperationPanel.jsx', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('operation commit card layout', () => {
  it('uses a single-column flow with header readiness and a compact note', () => {
    expect(operationSource).toContain('operation-commit-card')
    expect(operationSource).toContain('operation-commit-header')
    expect(operationSource).toContain('operation-commit-summary')
    expect(operationSource).toContain('operation-commit-footer')
    expect(operationSource).toMatch(/operation-commit-header[\s\S]*?Ready[\s\S]*?Pending/)
    expect(operationSource).toMatch(/operation-commit-summary[\s\S]*?本期实际投入[\s\S]*?累计投入[\s\S]*?剩余可投/)
    expect(operationSource).toMatch(/rows="3"/)
    expect(operationSource).not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]')
  })

  it('defines responsive summary and submission footer behavior', () => {
    expect(stylesSource).toMatch(/\.operation-commit-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/)
    expect(stylesSource).toMatch(/\.operation-commit-summary-open\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/)
    expect(stylesSource).toMatch(/\.operation-commit-footer\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/)
    expect(stylesSource).toMatch(/@media \(max-width: 900px\)[\s\S]*\.operation-commit-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/)
    expect(stylesSource).toMatch(/@media \(max-width: 640px\)[\s\S]*\.operation-commit-summary[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails for the missing layout**

Run: `npm test -- src/components/OperationPanel.layout.test.js`

Expected: FAIL because `operation-commit-card` and the scoped CSS rules do not exist.

### Task 2: Implement the Single-Column Commit Flow

**Files:**
- Modify: `src/components/OperationPanel.jsx:429`
- Modify: `src/index.css:1023`
- Test: `src/components/OperationPanel.layout.test.js`

**Interfaces:**
- Consumes: `isReadyToConfirm`, `isPlanComplete`, `isOpenEnded`, `totalActualAmount`, `cumulativeInvested`, `remainingBudget`, `tag`, `note`, and `handleConfirm` already derived by `OperationPanel`.
- Produces: Scoped structural classes only; no new component props, functions, state, effects, or persisted fields.

- [ ] **Step 1: Replace the desktop split markup**

Use one `operation-commit-card` container with this order: header/readiness, decision controls, financial summary, note, validation/action footer. Keep the existing conditional copy, icons, handlers, and disabled condition unchanged. Set the textarea to `rows="3"`.

- [ ] **Step 2: Add the scoped CSS rules**

Define:

```css
.operation-commit-header { align-items: flex-start; display: flex; gap: 1rem; justify-content: space-between; }
.operation-commit-summary { display: grid; gap: 0.75rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.operation-commit-summary-open { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.operation-commit-footer { align-items: center; border-top: 1px solid rgb(var(--color-line-rgb) / 0.07); display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr) auto; }
```

Add scoped value sizing, footer message tones, an auto-width desktop action, a two-column tablet summary with the fixed-budget last item spanning the row, and a one-column mobile summary/footer with a full-width action.

- [ ] **Step 3: Run the focused tests to verify green**

Run: `npm test -- src/components/OperationPanel.layout.test.js src/components/OperationPanel.test.jsx`

Expected: PASS with four tests and no failures.

### Task 3: Verify Behavior, Build, and Responsive Rendering

**Files:**
- Verify: `src/components/OperationPanel.jsx`
- Verify: `src/index.css`
- Verify: `src/components/OperationPanel.layout.test.js`

**Interfaces:**
- Consumes: Completed commit-card implementation.
- Produces: Test, build, and screenshot evidence for handoff.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all Vitest files and tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite exits `0` and writes the production bundle to `dist/`.

- [ ] **Step 3: Inspect the exact diff**

Run: `git diff -- src/components/OperationPanel.jsx src/components/OperationPanel.layout.test.js src/index.css`

Expected: only the approved commit-card markup, scoped CSS, and focused layout tests are added; pre-existing Dashboard CSS changes remain untouched.

- [ ] **Step 4: Verify the rendered page**

Start Vite, open the operation page with `agent-browser`, and capture desktop (`1440x1000`) and mobile (`390x844`) screenshots in both light and dark themes. Verify no lower-left void, horizontal overflow, clipping, overlap, or unclear readiness/action states.

- [ ] **Step 5: Request a focused code review**

Review the final diff against `docs/superpowers/specs/2026-08-12-operation-commit-card-redesign.md`. Fix any critical or important finding, then rerun the focused tests and build before completion.
