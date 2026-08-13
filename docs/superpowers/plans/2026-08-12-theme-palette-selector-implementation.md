# 多主题强调色选择器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有日间 / 夜间主题旁增加四套可持久化强调色，并通过主题控件右侧箭头打开可访问的颜色弹层。

**Architecture:** 扩展 `useTheme` 管理独立的 `accent` 状态和 `data-accent` 根属性；`App` 将 `accent` 与 `setAccent` 透传给 `Layout`。`Layout` 将当前主题按钮拆为日间 / 夜间主按钮与颜色箭头按钮，弹层只在打开时渲染；`index.css` 通过 accent 选择器覆盖既有强调色 token，并为黑白灰日间方案覆盖柔和灰白 surface token。

**Tech Stack:** React 18, Vite, Vitest, Tailwind CSS, lucide-react, Recharts（继续使用现有依赖，不新增包）。

## Global Constraints

- 仅增加强调色，不改变现有日间 / 夜间主题状态、业务数据流或语义正负/警告/信息色。
- 颜色选项只显示名称、色板和选中态；灵感来源只保留在设计文档，不进入生产弹层。
- 默认强调色为 `indigo`；有效值为 `indigo | amber | green | mono`。
- 现有 `dca-tracker:theme` 保持不变；强调色使用独立存储键 `dca-tracker:accent`。
- 日间黑白灰画布使用 `#F1F1EE`，面板使用 `#FAFAF7`，边框使用 `#DDDDDA`。
- 触摸目标不小于 44px；支持键盘焦点、`Escape` 关闭和点击外部关闭。
- 不引入第三方主题库或颜色选择器依赖，不重做导航、卡片、字体、数据模型或业务流程。

---

## 文件地图

- Modify: `src/hooks/useTheme.js` — 增加 accent 常量、读取/保存、根节点 `data-accent` 同步和 `setAccent`。
- Create: `src/hooks/useTheme.test.js` — 覆盖 accent 默认值、持久化、非法值回退和主题/强调色独立性；沿用 Vitest 的 Node 环境，通过导出的纯函数验证解析逻辑，并检查源码中的根节点同步契约。
- Modify: `src/App.jsx` — 从 hook 取出 `accent`、`setAccent`，传给 `Layout`。
- Modify: `src/components/Layout.jsx` — 新增颜色选项定义、分体主题控件、弹层交互、焦点管理和无障碍属性。
- Create: `src/components/Layout.theme.test.js` — 对选项 ID/标签、分体按钮、`aria-expanded`、外部关闭和 `Escape` 契约做源码级回归测试（项目当前未安装 DOM 测试库，避免新增依赖）。
- Modify: `src/index.css` — 主题分体控件/弹层样式、四组 accent token、mono light surface 覆盖、响应式定位和减少动画处理。
- Modify: `src/components/Dashboard.jsx` — 如图表存在硬编码主色，只替换为现有 CSS token 读取；若已通过 `var(--color-accent-rgb)` 间接消费，则保持不变。
- Modify: `src/components/History.jsx`, `src/components/Settings.jsx`, `src/components/OperationPanel.jsx` — 仅在验证发现硬编码强调色时替换为 token；无硬编码则不改。

---

### Task 1: Extend Theme State With Accent Persistence

**Files:**
- Modify: `src/hooks/useTheme.js`
- Create: `src/hooks/useTheme.test.js`

**Interfaces:**
- Produces `ACCENT_STORAGE_KEY`, `VALID_ACCENTS`, `getStoredAccent()`, `resolveAccentState()` (export pure helpers for tests), and hook return fields `accent` / `setAccent`.
- Keeps existing `theme`, `isUserPreference`, `setTheme`, and `toggleTheme` behavior unchanged.

- [ ] **Step 1: Write failing tests for accent resolution and persistence**

Add tests that exercise the exported helpers without rendering React:

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredAccent, resolveAccentState } from './useTheme'

describe('accent preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to indigo when no preference exists', () => {
    expect(getStoredAccent()).toBeNull()
    expect(resolveAccentState()).toEqual({ accent: 'indigo', userPreference: null })
  })

  it('restores a valid persisted accent', () => {
    window.localStorage.setItem('dca-tracker:accent', 'amber')
    expect(resolveAccentState()).toEqual({ accent: 'amber', userPreference: 'amber' })
  })

  it('rejects unknown persisted accents', () => {
    window.localStorage.setItem('dca-tracker:accent', 'electric-purple')
    expect(resolveAccentState()).toEqual({ accent: 'indigo', userPreference: null })
  })
})
```

Because the repository's Vitest environment is Node by default, add this minimal in-file storage fixture before the tests; do not add a jsdom dependency:

```js
const storage = new Map()
globalThis.window = {
  localStorage: {
    clear: () => storage.clear(),
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
}
```

The first run must fail because the helpers do not yet exist.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/hooks/useTheme.test.js`

Expected: FAIL with a missing export or equivalent implementation error.

- [ ] **Step 3: Implement the minimal accent state**

In `src/hooks/useTheme.js`:

```js
export const ACCENT_STORAGE_KEY = 'dca-tracker:accent'
export const VALID_ACCENTS = new Set(['indigo', 'amber', 'green', 'mono'])

export function getStoredAccent() {
  if (!canUseBrowserStorage()) return null
  try {
    const value = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    return VALID_ACCENTS.has(value) ? value : null
  } catch {
    return null
  }
}

export function resolveAccentState() {
  const userPreference = getStoredAccent()
  return { accent: userPreference || 'indigo', userPreference }
}
```

Initialize accent state alongside the existing theme state, set `document.documentElement.dataset.accent` in its own effect, and add `setAccent(nextAccent)` that validates against `VALID_ACCENTS`, writes the independent key, and updates state. Do not make `toggleTheme` touch accent state.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npx vitest run src/hooks/useTheme.test.js`

Expected: all accent resolution tests PASS.

- [ ] **Step 5: Commit the state-layer change**

```bash
git add src/hooks/useTheme.js src/hooks/useTheme.test.js
git commit -m "feat: persist accent theme preference"
```

### Task 2: Add App Wiring And Accessible Palette Popover

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Layout.jsx`
- Create: `src/components/Layout.theme.test.js`

**Interfaces:**
- `Layout` accepts `accent = 'indigo'` and `onChangeAccent` props.
- `ThemeButton` becomes a local `ThemeControl` that accepts `theme`, `accent`, `onToggleTheme`, and `onChangeAccent`.
- `onChangeAccent(id)` is called only for one of the four valid IDs and closes the popover.

- [ ] **Step 1: Write failing source-contract tests**

Create tests that read `Layout.jsx` and `App.jsx` and assert the explicit interaction contract:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(new URL('./Layout.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')

describe('theme palette control', () => {
  it('defines the four approved accent ids', () => {
    for (const id of ['indigo', 'amber', 'green', 'mono']) expect(layoutSource).toContain(`id: '${id}'`)
  })

  it('wires accent through App into Layout', () => {
    expect(appSource).toContain('const { accent, setAccent')
    expect(appSource).toContain('accent={accent}')
    expect(appSource).toContain('onChangeAccent={setAccent}')
  })

  it('uses an expandable arrow with keyboard and outside-click close paths', () => {
    expect(layoutSource).toContain('aria-expanded={isAccentMenuOpen}')
    expect(layoutSource).toContain('onKeyDown={handleAccentKeyDown}')
    expect(layoutSource).toContain("event.key === 'Escape'")
    expect(layoutSource).toContain('handleDocumentPointerDown')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/components/Layout.theme.test.js`

Expected: FAIL because the current layout still has a single `ThemeButton` and App does not pass accent props.

- [ ] **Step 3: Implement App wiring**

Change the hook destructure in `App.jsx` to:

```js
const { theme, toggleTheme, accent, setAccent } = useTheme()
```

Pass `accent={accent}` and `onChangeAccent={setAccent}` to `<Layout />`. Keep `onToggleTheme={toggleTheme}` intact.

- [ ] **Step 4: Implement the controlled popover in Layout**

In `Layout.jsx`:

1. Import `Check`, `ChevronDown`, `Moon`, and `SunMedium` from lucide-react.
2. Define a module-level `accentOptions` array with exactly these IDs and user-facing labels: `indigo / 经典靛蓝`, `amber / 暖橙`, `green / 松针绿`, `mono / 黑白灰`.
3. Replace `ThemeButton` with a `ThemeControl` component holding `isAccentMenuOpen` state and a `ref` for the wrapper.
4. Render an icon+text theme button on desktop and icon-only theme button on compact mobile, plus a separate arrow button with `aria-haspopup="menu"`, `aria-expanded`, and an accessible label.
5. Render the menu only when open. Each option is a `button role="menuitemradio"` with `aria-checked`, a color swatch, visible label, and `Check` for the selected option. It must call `onChangeAccent(option.id)` and close the menu.
6. Register a document-level `pointerdown` listener only while open; ignore events inside the wrapper and close for outside events. Remove it on close/unmount.
7. Add `onKeyDown` to the arrow/menu wrapper: `Escape` closes and restores focus to the arrow; `ArrowDown` while opening focuses the first option; `Tab` is allowed to leave naturally.

Use stable button dimensions so opening the popover does not shift the sidebar or mobile topbar. Do not display palette inspiration/source text in production markup.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `npx vitest run src/components/Layout.theme.test.js src/hooks/useTheme.test.js`

Expected: all state and source-contract tests PASS.

- [ ] **Step 6: Commit the interaction wiring**

```bash
git add src/App.jsx src/components/Layout.jsx src/components/Layout.theme.test.js
git commit -m "feat: add expandable accent palette control"
```

### Task 3: Implement Accent Tokens And Responsive Popover Styling

**Files:**
- Modify: `src/index.css`
- Inspect/modify only if needed: `src/components/Dashboard.jsx`, `src/components/History.jsx`, `src/components/Settings.jsx`, `src/components/OperationPanel.jsx`

**Interfaces:**
- Root HTML has both `data-theme="light|dark"` and `data-accent="indigo|amber|green|mono"`.
- Existing Tailwind semantic classes continue to read the same custom-property names.

- [ ] **Step 1: Add a failing stylesheet contract test**

Extend `src/components/Layout.theme.test.js` or create `src/theme.tokens.test.js` to read `src/index.css` and assert all four selectors include accent token overrides, plus the mono light surface values:

```js
for (const id of ['indigo', 'amber', 'green', 'mono']) {
  expect(stylesSource).toContain(`:root[data-accent='${id}']`)
  expect(stylesSource).toContain('--color-accent-rgb')
}
expect(stylesSource).toContain('241 241 238')
expect(stylesSource).toContain('250 250 247')
expect(stylesSource).toContain('221 221 218')
```

- [ ] **Step 2: Run the stylesheet test and verify it fails**

Run: `npx vitest run src/theme.tokens.test.js`

Expected: FAIL because no `data-accent` selectors exist yet.

- [ ] **Step 3: Add the token overrides**

Add selectors after the existing light/dark token blocks. Keep each accent's RGB values explicit for both contrast modes where hover and soft variants differ:

```css
:root[data-accent='indigo'] {
  --color-accent-rgb: 94 106 210;
  --color-accent-hover-rgb: 130 143 255;
  --color-accent-soft-rgb: 30 32 58;
}

:root[data-theme='light'][data-accent='amber'] {
  --color-accent-rgb: 217 119 87;
  --color-accent-hover-rgb: 191 93 66;
  --color-accent-soft-rgb: 247 229 221;
}

:root[data-theme='dark'][data-accent='amber'] {
  --color-accent-rgb: 217 119 87;
  --color-accent-hover-rgb: 235 145 113;
  --color-accent-soft-rgb: 58 29 22;
}
```

Add the remaining explicit selectors with these values:

```css
:root[data-theme='light'][data-accent='green'] {
  --color-accent-rgb: 47 133 95;
  --color-accent-hover-rgb: 35 108 75;
  --color-accent-soft-rgb: 222 240 230;
}

:root[data-theme='dark'][data-accent='green'] {
  --color-accent-rgb: 72 170 123;
  --color-accent-hover-rgb: 102 199 151;
  --color-accent-soft-rgb: 15 48 33;
}

:root[data-theme='light'][data-accent='mono'] {
  --color-accent-rgb: 34 34 34;
  --color-accent-hover-rgb: 0 0 0;
  --color-accent-soft-rgb: 229 229 226;
  --color-surface-rgb: 241 241 238;
  --color-panel-rgb: 250 250 247;
  --color-elevated-rgb: 246 246 243;
  --color-line-rgb: 221 221 218;
  --select-bg: #fafaf7;
}

:root[data-theme='dark'][data-accent='mono'] {
  --color-accent-rgb: 190 190 190;
  --color-accent-hover-rgb: 232 232 232;
  --color-accent-soft-rgb: 45 45 45;
}
```

Do not change semantic positive/negative/warning/info tokens. For `mono` under light theme, keep the corresponding light shadows/select background consistent with the listed surface values.

- [ ] **Step 4: Style the split control and menu**

Add focused classes next to the existing theme styles:

```css
.theme-control {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2.75rem;
}

.theme-control-main,
.theme-control-menu {
  min-height: 2.75rem;
  border: 1px solid rgb(var(--color-line-rgb) / 0.08);
  background: rgb(var(--color-panel-rgb) / 0.72);
  color: rgb(var(--color-text-rgb));
}

.theme-control-main { border-radius: .5rem 0 0 .5rem; }
.theme-control-menu { border-left: 0; border-radius: 0 .5rem .5rem 0; }

.accent-popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + .5rem);
  z-index: 40;
  width: min(15rem, calc(100vw - 1.5rem));
  padding: .4rem;
  border: 1px solid rgb(var(--color-line-rgb) / .18);
  border-radius: .5rem;
  background: rgb(var(--color-panel-rgb) / .98);
  box-shadow: var(--shadow-card);
}

.accent-option {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr) 1rem;
  align-items: center;
  gap: .6rem;
  width: 100%;
  min-height: 2.75rem;
  padding: .45rem .6rem;
  border: 1px solid transparent;
  border-radius: .4rem;
  color: rgb(var(--color-text-soft-rgb));
  text-align: left;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.accent-option:hover,
.accent-option:focus-visible {
  border-color: rgb(var(--color-accent-rgb) / .2);
  background: rgb(var(--color-accent-rgb) / .1);
  color: rgb(var(--color-text-rgb));
}

.accent-option[aria-checked='true'] {
  background: rgb(var(--color-accent-rgb) / .12);
  color: rgb(var(--color-text-rgb));
}

.accent-swatch {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgb(var(--color-panel-rgb));
  border-radius: 999px;
  background: var(--accent-swatch);
  box-shadow: 0 0 0 1px rgb(var(--color-line-rgb) / .35);
}
```

Add `.accent-option` hover, focus-visible, selected, and `.accent-swatch` rules exactly as shown, then add compact mobile overrides: `.theme-control-main` and `.theme-control-menu` must be `2.25rem` square/min-height on compact mode while `.accent-option` remains at least `2.75rem`. Use existing border radius, typography, transition, and color token conventions.

- [ ] **Step 5: Audit chart/component colors**

Run:

```bash
rg -n "#[0-9A-Fa-f]{6}|rgb\\(|rgba\\(" src/components/Dashboard.jsx src/components/History.jsx src/components/Settings.jsx src/components/OperationPanel.jsx
```

Any hard-coded value used as an accent, active state, focus ring, or chart series must be changed to `rgb(var(--color-accent-rgb) / ...)` or the existing semantic token. Leave fixed semantic positive/negative/warning/info colors unchanged.

- [ ] **Step 6: Run token tests**

Run: `npx vitest run src/theme.tokens.test.js src/components/Layout.theme.test.js`

Expected: PASS with all four selectors and mono light values present.

- [ ] **Step 7: Commit styling and token changes**

```bash
git add src/index.css src/theme.tokens.test.js src/components/Dashboard.jsx src/components/History.jsx src/components/Settings.jsx src/components/OperationPanel.jsx
git commit -m "style: add accent palette tokens and popover"
```

### Task 4: Full Verification And Visual QA

**Files:**
- No new implementation files; only fix issues found in Tasks 1-3.

**Interfaces:**
- The application starts with `npm run dev`, persists both theme and accent independently, and renders all existing screens under every approved accent.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all existing and new tests PASS with zero failures.

- [ ] **Step 2: Build the production bundle**

Run: `npm run build`

Expected: Vite completes successfully and writes `dist/` without compile errors.

- [ ] **Step 3: Start the local app**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a local URL. Use that URL for browser verification; if the default port is busy, use the printed alternate port.

- [ ] **Step 4: Verify the desktop interaction**

With a desktop viewport, check:

1. The main control toggles `日间` / `夜间` without opening the palette.
2. The arrow opens a menu with four options, and the menu closes on selection, outside pointerdown, and `Escape`.
3. Choosing `暖橙`, `松针绿`, and `黑白灰` updates navigation active state, buttons, focus rings, and chart accents immediately.
4. Reloading preserves theme and accent independently.

- [ ] **Step 5: Verify the mobile interaction**

At a narrow viewport, confirm the compact control and menu stay inside the viewport, menu items remain at least 44px high, and the bottom tab bar does not overlap the popover or content.

- [ ] **Step 6: Verify screen coverage**

Inspect Dashboard, Operation, History, and Settings in both `light` and `dark` with at least `amber` and `mono`, then spot-check `indigo` and `green`. Confirm semantic profit/loss/warning/info colors remain recognizable and no page becomes unreadable.

- [ ] **Step 7: Review final diff and commit verification fixes**

Run:

```bash
git diff --check
git status --short
```

Fix only issues caused by this feature, then commit with:

```bash
git add src/App.jsx src/components/Layout.jsx src/hooks/useTheme.js src/index.css src/**/*.test.*
git commit -m "test: verify theme palette selector"
```
