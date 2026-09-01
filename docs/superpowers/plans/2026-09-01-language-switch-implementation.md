# App-Wide Language Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immediate, persistent Chinese/English language switch that covers every user-facing page and prompt.

**Architecture:** A dependency-free React context owns `zh-CN` / `en-US`, persists it to `localStorage`, and exposes `t(source, params)`. Chinese source text is the fallback key, while a centralized English map supplies translations; named template interpolation handles dynamic copy. Non-React error-boundary code calls the same pure translator directly.

**Tech Stack:** React 18, Vite 7, Vitest 3, Tailwind/CSS, existing Lucide icons

## Global Constraints

- Chinese remains the default language for first-time users.
- The selected language is stored in browser `localStorage` and restored on reload.
- User-entered plan names, notes, ticker symbols, and imported data values are never translated.
- Calculation, storage, backup, market precision, and portfolio behavior remain unchanged.
- No third-party internationalization dependency is added.
- Missing English translations fall back to the Chinese source text and never render blank.

---

### Task 1: Translation Core and Persistence

**Files:**
- Create: `src/i18n/translations.js`
- Create: `src/i18n/index.js`
- Create: `src/i18n/i18n.test.js`
- Modify: `src/main.jsx`

**Interfaces:**
- Produces: `LANGUAGE_STORAGE_KEY`, `normalizeLanguage(value)`, `translate(language, source, params?)`, `I18nProvider`, and `useI18n()` returning `{ language, setLanguage, t }`.
- `t` accepts Chinese source copy or a stable symbolic key and replaces `{name}` placeholders from `params`.

- [ ] **Step 1: Write failing translation tests**

```js
import { describe, expect, it } from 'vitest'
import { normalizeLanguage, translate } from './index'

describe('i18n', () => {
  it('normalizes unsupported locales to Chinese', () => {
    expect(normalizeLanguage('fr-FR')).toBe('zh-CN')
  })

  it('translates and interpolates English copy', () => {
    expect(translate('en-US', '第 {period} 期', { period: 3 })).toBe('Period 3')
  })

  it('falls back to Chinese source copy', () => {
    expect(translate('en-US', '尚未收录的文案')).toBe('尚未收录的文案')
  })
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- src/i18n/i18n.test.js`

Expected: FAIL because `src/i18n/index.js` does not exist.

- [ ] **Step 3: Implement pure translation helpers and React provider**

```js
export const LANGUAGE_STORAGE_KEY = 'dca-tracker-language'
export const normalizeLanguage = (value) => value === 'en-US' ? 'en-US' : 'zh-CN'

export function translate(language, source, params = {}) {
  const template = normalizeLanguage(language) === 'en-US'
    ? englishTranslations[source] ?? source
    : source
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`))
}
```

Wrap `<ErrorBoundary><App /></ErrorBoundary>` with `<I18nProvider>` in `src/main.jsx`; initialize state from `localStorage`, persist changes in an effect, and update `document.documentElement.lang`.

- [ ] **Step 4: Run the focused test and full existing suite**

Run: `npm test -- src/i18n/i18n.test.js`

Expected: PASS.

Run: `npm test`

Expected: all pre-existing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n src/main.jsx
git commit -m "feat: add language translation foundation"
```

### Task 2: Shell Language Control

**Files:**
- Modify: `src/components/Layout.jsx`
- Modify: `src/index.css`
- Create: `src/components/Layout.language.test.jsx`

**Interfaces:**
- Consumes: `useI18n()` from Task 1.
- Produces: `LanguageControl` rendered in both desktop sidebar footer and mobile topbar, using `setLanguage('zh-CN' | 'en-US')`.

- [ ] **Step 1: Write a failing shell test**

```jsx
it('switches the shell from Chinese to English', () => {
  const { container } = render(<I18nProvider><Layout activeTab="dashboard">Body</Layout></I18nProvider>)
  expect(container.textContent).toContain('总览')
  fireEvent.click(screen.getAllByRole('button', { name: 'English' })[0])
  expect(container.textContent).toContain('Overview')
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US')
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- src/components/Layout.language.test.jsx`

Expected: FAIL because the language control and translated shell copy are absent.

- [ ] **Step 3: Add the segmented language control and translate shell copy**

Implement a stable two-button `.language-control` with `aria-pressed`, labels `中文` and `English`, and visible short labels `中` / `EN`. Translate navigation, plan selector, theme/accent menu, backup banner, release-notice shell labels, and all navigation `aria-label` / `title` values through `t`.

- [ ] **Step 4: Run shell tests**

Run: `npm test -- src/components/Layout.language.test.jsx src/components/Layout.layout.test.js src/components/Layout.theme.test.js src/components/ReleaseNotice.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.jsx src/components/Layout.language.test.jsx src/index.css
git commit -m "feat: add persistent shell language control"
```

### Task 3: Main Page Translation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/components/OperationPanel.jsx`
- Modify: `src/components/History.jsx`
- Modify: `src/components/Settings.jsx`
- Modify: `src/i18n/translations.js`
- Create: `src/components/PageTranslations.test.jsx`

**Interfaces:**
- Consumes: `useI18n()` and `t(source, params)` from Task 1.
- Produces: complete English UI for loading, overview, operation entry, history, and settings without altering values submitted to callbacks.

- [ ] **Step 1: Write failing page coverage tests**

```jsx
it.each([
  ['Dashboard', <Dashboard plan={null} records={[]} />, 'No plan yet'],
  ['Operation', <OperationPanel plan={null} records={[]} />, 'Create a plan before opening this page.'],
  ['History', <History plan={null} records={[]} />, 'No plan yet'],
  ['Settings', <Settings plan={null} plans={[]} />, 'Plan settings'],
])('renders %s in English', (_, view, expected) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-US')
  expect(render(<I18nProvider>{view}</I18nProvider>).container.textContent).toContain(expected)
})
```

Add representative populated-plan assertions for metric labels, period templates, filters, action buttons, form labels, validation text, and dynamic statuses.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- src/components/PageTranslations.test.jsx`

Expected: FAIL with Chinese copy still rendered.

- [ ] **Step 3: Translate `App` and `Dashboard`**

Call `useI18n()` inside render components. Replace every user-facing literal, accessible label, and dynamic sentence with `t`, including empty states, metrics, portfolio diagnosis, quote status, plan progress, shares, next-period copy, and loading fallback. Keep plan names and ticker values untouched.

- [ ] **Step 4: Translate `OperationPanel` and `History`**

Translate price state, period/budget summaries, decision tags, validation messages, placeholders, edit/delete confirmations, empty filters, CSV/backup actions, and accessible field labels. Translate returned quote errors at render time with `t(asset.fetchError)` so service behavior stays stable.

- [ ] **Step 5: Translate `Settings`**

Translate market/strategy/budget/frequency option labels, all section descriptions and form labels, split-event copy, save-readiness checks, destructive confirmations, import/export controls, and button titles. Preserve option `value` fields and saved plan schema exactly.

- [ ] **Step 6: Run page and regression tests**

Run: `npm test -- src/components/PageTranslations.test.jsx src/components/Dashboard.layout.test.js src/components/OperationPanel.test.jsx src/components/History.test.jsx src/components/Settings.test.jsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/Dashboard.jsx src/components/OperationPanel.jsx src/components/History.jsx src/components/Settings.jsx src/components/PageTranslations.test.jsx src/i18n/translations.js
git commit -m "feat: translate all primary app pages"
```

### Task 4: Cross-Page Prompts, Release Copy, and Dates

**Files:**
- Modify: `src/components/BackupImportButton.jsx`
- Modify: `src/components/ErrorBoundary.jsx`
- Modify: `src/components/ReleaseNotice.jsx`
- Modify: `src/hooks/useQuote.js`
- Modify: `src/utils/contributionSchedule.js`
- Modify: `src/utils/marketSnapshot.js`
- Modify: `src/utils/releaseNotice.js`
- Modify: `src/i18n/translations.js`
- Create: `src/components/PromptTranslations.test.jsx`
- Modify: `src/utils/contributionSchedule.test.js`

**Interfaces:**
- Consumes: `useI18n`, pure `translate`, and active `language`.
- Produces: localized confirmations, alerts, error recovery, release details, quote status, and schedule formatting.

- [ ] **Step 1: Write failing prompt and date tests**

```js
it('formats schedule dates for the selected locale', () => {
  expect(formatScheduleDate('2026-09-12', 'zh-CN')).toBe('2026年9月12日')
  expect(formatScheduleDate('2026-09-12', 'en-US')).toBe('Sep 12, 2026')
})
```

Render backup import and release notice under English context and assert English button/alert copy. Instantiate `ErrorBoundary`, force its fallback state, and assert it resolves the stored English language.

- [ ] **Step 2: Run focused tests and confirm they fail**

Run: `npm test -- src/components/PromptTranslations.test.jsx src/utils/contributionSchedule.test.js`

Expected: FAIL because prompts and dates ignore the locale.

- [ ] **Step 3: Translate prompt components and direct browser dialogs**

Use `useI18n()` in backup/release components. In the class-based `ErrorBoundary`, call `translate(localStorage.getItem(LANGUAGE_STORAGE_KEY), source)` so recovery UI works even when its child provider fails. Translate all `alert`, `confirm`, `aria-label`, title, success, and error messages.

- [ ] **Step 4: Localize dates and shared status copy**

Change `formatScheduleDate(date, language = 'zh-CN')` to use the existing Chinese format for `zh-CN` and `Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })` for English. Pass `language` from Dashboard. Keep service/hook error values stable and translate them at display boundaries.

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- src/components/PromptTranslations.test.jsx src/utils/contributionSchedule.test.js src/components/ReleaseNotice.test.jsx src/utils/marketSnapshot.test.js src/hooks/useQuote.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/BackupImportButton.jsx src/components/ErrorBoundary.jsx src/components/ReleaseNotice.jsx src/hooks/useQuote.js src/utils/contributionSchedule.js src/utils/contributionSchedule.test.js src/utils/marketSnapshot.js src/utils/releaseNotice.js src/components/PromptTranslations.test.jsx src/i18n/translations.js
git commit -m "feat: localize prompts status and dates"
```

### Task 5: Completeness Audit and Visual Verification

**Files:**
- Modify: `src/i18n/translations.js`
- Modify: any directly-rendering component identified by the literal audit in `src/components/`
- Modify: `src/index.css` only when desktop or mobile browser verification finds clipping or overlap
- Modify: relevant tests when an untranslated user-facing path is discovered

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified desktop/mobile Chinese and English builds with no missing English UI copy.

- [ ] **Step 1: Audit remaining literals**

Run: `rg -n "[\x{4e00}-\x{9fff}]" src --glob '*.jsx' --glob '*.js'`

Review every hit. Test fixtures, source translation keys, developer comments, and stable service errors may remain; any directly rendered literal, dialog, placeholder, title, or accessible label must call `t` or `translate`.

- [ ] **Step 2: Run full automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite exits 0 and writes the production bundle to `dist/`.

- [ ] **Step 3: Start the app and verify with browser automation**

Run: `npm run dev -- --host 127.0.0.1`

At desktop `1440x900` and mobile `390x844`, switch to English and inspect Overview, Operation, History, and Settings. Verify no clipped labels, overlapping controls, untranslated prompts, blank release content, or layout shifts. Reload once and confirm English persists; switch back to Chinese and confirm the complete interface returns immediately.

- [ ] **Step 4: Commit audit fixes**

```bash
git add src
git commit -m "test: verify complete bilingual interface"
```
