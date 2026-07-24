# Dashboard Release Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present the latest dashboard release notice once per version, then retain a bell entry point for later review.

**Architecture:** Add static release metadata plus a pure version comparison helper. Extend the existing storage utility with an acknowledged-version key. A standalone React component owns the bell, panel, acknowledgement animation, keyboard and outside-click behavior; the dashboard only mounts it beside the overview title.

**Tech Stack:** React 18, Lucide React, Tailwind CSS, Vitest, browser local storage.

## Global Constraints

- Current release version is exactly `2.2.0`; date is `2026-07-15`.
- Store only the acknowledged version under `dca-tracker:last-read-release-version`.
- Auto-open only when the stored version differs from the current release.
- Only `已读` persists acknowledgement; overlay, bell toggle, close, and Escape do not.
- The bell remains accessible after acknowledgement. The panel is right-aligned and not clipped.
- Use no new dependency and preserve the global reduced-motion behavior.

---

### Task 1: Add version data and acknowledgement storage

**Files:**
- Create: `src/utils/releaseNotice.js`
- Create: `src/utils/releaseNotice.test.js`
- Modify: `src/utils/storage.js`
- Modify: `src/utils/storage.test.js`

**Interfaces:**
- Produces `CURRENT_RELEASE = { version, date, items }` and `shouldShowReleaseNotice(lastReadVersion, currentVersion)`.
- Produces `loadLastReadReleaseVersion()` and `saveLastReadReleaseVersion(version)`.

- [ ] **Step 1: Write the failing version visibility test**

```js
import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from './releaseNotice'

describe('release notice visibility', () => {
  it('shows an unread or newer release', () => {
    expect(shouldShowReleaseNotice(null)).toBe(true)
    expect(shouldShowReleaseNotice('2.1.0')).toBe(true)
  })

  it('hides the current acknowledged release', () => {
    expect(shouldShowReleaseNotice(CURRENT_RELEASE.version)).toBe(false)
  })
})
```

- [ ] **Step 2: Verify the test is red**

Run: `npm test -- src/utils/releaseNotice.test.js`

Expected: FAIL because `./releaseNotice` does not exist.

- [ ] **Step 3: Write the minimal metadata module**

```js
export const CURRENT_RELEASE = {
  version: '2.2.0',
  date: '2026-07-15',
  items: [
    '行情报价现在可在总览和本期操作中刷新。',
    '导入和恢复前的备份保护更加完善。',
    '资产配置图会更清楚地跟随当前查看的标的。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
```

- [ ] **Step 4: Verify the visibility test is green**

Run: `npm test -- src/utils/releaseNotice.test.js`

Expected: PASS with 2 tests.

- [ ] **Step 5: Write a failing local-storage test**

```js
import { loadLastReadReleaseVersion, saveLastReadReleaseVersion } from './storage'

it('persists the last acknowledged release version', () => {
  const originalWindow = globalThis.window
  const values = new Map()
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } }
  saveLastReadReleaseVersion('2.2.0')
  expect(loadLastReadReleaseVersion()).toBe('2.2.0')
  globalThis.window = originalWindow
})
```

- [ ] **Step 6: Verify the storage test is red**

Run: `npm test -- src/utils/storage.test.js`

Expected: FAIL because the two acknowledgement helpers are not exported.

- [ ] **Step 7: Extend the existing storage module**

```js
// Add to STORAGE_KEYS.
lastReadReleaseVersion: 'dca-tracker:last-read-release-version',

export function saveLastReadReleaseVersion(version) {
  writeStorage(STORAGE_KEYS.lastReadReleaseVersion, version || null)
}

export function loadLastReadReleaseVersion() {
  return readStorage(STORAGE_KEYS.lastReadReleaseVersion, null)
}

// Add to clearAll().
window.localStorage.removeItem(STORAGE_KEYS.lastReadReleaseVersion)
```

- [ ] **Step 8: Verify the utility layer**

Run: `npm test -- src/utils/releaseNotice.test.js src/utils/storage.test.js`

Expected: PASS with no failures.

- [ ] **Step 9: Commit the utility layer**

```bash
git add src/utils/releaseNotice.js src/utils/releaseNotice.test.js src/utils/storage.js src/utils/storage.test.js
git commit -m "feat: store release notice acknowledgement"
```

### Task 2: Build the accessible bell and release panel

**Files:**
- Create: `src/components/ReleaseNotice.jsx`
- Create: `src/components/ReleaseNotice.test.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes the Task 1 release and storage exports.
- Produces a default `ReleaseNotice` component that takes no props and owns all disclosure state.

- [ ] **Step 1: Write the failing component contract test**

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./ReleaseNotice.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('release notice interface', () => {
  it('has a labelled bell and acknowledgement action', () => {
    expect(source).toContain('aria-label="查看版本更新"')
    expect(source).toContain('已读')
    expect(source).toContain('saveLastReadReleaseVersion(CURRENT_RELEASE.version)')
  })
  it('uses Escape closing and a right-aligned unclipped panel', () => {
    expect(source).toContain("event.key === 'Escape'")
    expect(styles).toMatch(/\.release-notice-panel\s*\{[\s\S]*right:\s*0;/)
    expect(styles).toMatch(/\.dashboard-overview-card\s*\{[\s\S]*overflow:\s*visible;/)
  })
})
```

- [ ] **Step 2: Verify the component contract is red**

Run: `npm test -- src/components/ReleaseNotice.test.jsx`

Expected: FAIL because `ReleaseNotice.jsx` does not exist.

- [ ] **Step 3: Implement the component behavior**

```jsx
import { useEffect, useRef, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from '../utils/releaseNotice'
import { loadLastReadReleaseVersion, saveLastReadReleaseVersion } from '../utils/storage'

export default function ReleaseNotice() {
  const bellRef = useRef(null)
  const panelRef = useRef(null)
  const [isOpen, setIsOpen] = useState(() => shouldShowReleaseNotice(loadLastReadReleaseVersion()))
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setIsOpen(false); bellRef.current?.focus() }
    }
    const onPointerDown = (event) => {
      if (!panelRef.current?.contains(event.target) && !bellRef.current?.contains(event.target)) setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('pointerdown', onPointerDown) }
  }, [isOpen])

  const acknowledge = () => {
    saveLastReadReleaseVersion(CURRENT_RELEASE.version)
    setIsAcknowledging(true)
    window.setTimeout(() => { setIsOpen(false); setIsAcknowledging(false); bellRef.current?.focus() }, 180)
  }

  return (
    <div className="release-notice">
      <button ref={bellRef} type="button" aria-label="查看版本更新" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="release-notice-bell"><Bell size={18} aria-hidden="true" /></button>
      {isOpen ? <section ref={panelRef} aria-label="最近更新" className={`release-notice-panel ${isAcknowledging ? 'release-notice-panel-contracting' : ''}`}><div className="release-notice-heading"><div><p className="mini-kicker">Latest update</p><h3>版本 {CURRENT_RELEASE.version}</h3></div><button type="button" aria-label="关闭更新说明" onClick={() => setIsOpen(false)} className="release-notice-close"><X size={16} /></button></div><p className="release-notice-date">{CURRENT_RELEASE.date}</p><ul>{CURRENT_RELEASE.items.map((item) => <li key={item}>{item}</li>)}</ul><button type="button" autoFocus onClick={acknowledge} className="release-notice-acknowledge"><Check size={16} aria-hidden="true" />已读</button></section> : null}
    </div>
  )
}
```

- [ ] **Step 4: Add responsive panel styles and the contraction animation**

```css
.dashboard-overview-card { overflow: visible; }
.release-notice { position: relative; z-index: 10; }
.release-notice-bell { align-items: center; background: rgb(var(--color-panel-rgb)); border: 1px solid rgb(var(--color-line-rgb) / 0.1); border-radius: 0.5rem; color: rgb(var(--color-text-rgb)); display: inline-flex; height: 2.5rem; justify-content: center; width: 2.5rem; }
.release-notice-panel { background: rgb(var(--color-panel-rgb) / 0.98); border: 1px solid rgb(var(--color-line-rgb) / 0.14); border-radius: 0.5rem; box-shadow: var(--shadow-card); padding: 1rem; position: absolute; right: 0; top: calc(100% + 0.65rem); transform-origin: top right; width: min(22rem, calc(100vw - 2rem)); }
.release-notice-panel-contracting { animation: release-notice-contract 180ms ease-in forwards; }
@keyframes release-notice-contract { to { opacity: 0; transform: scale(0.18) translate(7rem, -7rem); } }
.release-notice-heading { align-items: flex-start; display: flex; gap: 1rem; justify-content: space-between; }
.release-notice-heading h3 { color: rgb(var(--color-text-rgb)); font-size: 1rem; font-weight: 600; margin: 0.35rem 0 0; }
.release-notice-close { background: transparent; border: 0; color: rgb(var(--color-muted-foreground-rgb)); padding: 0.2rem; }
.release-notice-date { color: rgb(var(--color-muted-foreground-rgb)); font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; margin: 0.55rem 0 0; }
.release-notice-panel ul { color: rgb(var(--color-text-soft-rgb)); display: grid; font-size: 0.875rem; gap: 0.55rem; line-height: 1.5; margin: 1rem 0; padding-left: 1.15rem; }
.release-notice-acknowledge { align-items: center; background: rgb(var(--color-accent-rgb) / 0.16); border: 1px solid rgb(var(--color-accent-rgb) / 0.3); border-radius: 0.5rem; color: rgb(var(--color-text-rgb)); display: inline-flex; font-size: 0.875rem; font-weight: 600; gap: 0.45rem; justify-content: center; min-height: 2.5rem; padding: 0.55rem 0.8rem; width: 100%; }
@media (max-width: 640px) { .release-notice-panel { width: min(22rem, calc(100vw - 1.5rem)); } }
```

- [ ] **Step 5: Verify the component contract is green**

Run: `npm test -- src/components/ReleaseNotice.test.jsx`

Expected: PASS with 2 tests.

- [ ] **Step 6: Commit the component**

```bash
git add src/components/ReleaseNotice.jsx src/components/ReleaseNotice.test.jsx src/index.css
git commit -m "feat: add release notice panel"
```

### Task 3: Mount the notice on the dashboard and run the quality gate

**Files:**
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/components/Dashboard.layout.test.js`

**Interfaces:**
- Consumes the default `ReleaseNotice` from Task 2.
- Produces the overview-card upper-right bell placement while preserving the existing title copy.

- [ ] **Step 1: Write the failing placement test**

```js
it('places the release notice in the overview card header', () => {
  expect(dashboardSource).toContain("import ReleaseNotice from './ReleaseNotice'")
  expect(dashboardSource).toMatch(/<header className="card dashboard-overview-card p-5">[\s\S]*?<ReleaseNotice \/>/)
})
```

- [ ] **Step 2: Verify the placement test is red**

Run: `npm test -- src/components/Dashboard.layout.test.js`

Expected: FAIL because the notice is not imported or rendered.

- [ ] **Step 3: Import and mount the notice beside the overview title**

```jsx
import ReleaseNotice from './ReleaseNotice'

<div className="flex items-start justify-between gap-4">
  <div className="min-w-0">
    <p className="label">Overview</p>
    <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.035em] text-white">{plan.name || '当前计划'}</h2>
    <p className="body-copy mt-3 max-w-2xl">跟踪当前持仓、市值投入差额，以及下一期执行前需要看的预算和仓位信号。</p>
  </div>
  <ReleaseNotice />
</div>
```

- [ ] **Step 4: Verify all affected behavior**

Run: `npm test -- src/components/Dashboard.layout.test.js src/components/ReleaseNotice.test.jsx src/utils/releaseNotice.test.js src/utils/storage.test.js`

Expected: PASS with no failures.

- [ ] **Step 5: Run the complete test and production build gate**

Run: `npm test && npm run build`

Expected: all Vitest suites pass and Vite exits 0 with `built in` output.

- [ ] **Step 6: Commit the mounted experience**

```bash
git add src/components/Dashboard.jsx src/components/Dashboard.layout.test.js
git commit -m "feat: show release updates from dashboard bell"
```
