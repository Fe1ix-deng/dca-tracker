# 单独删除计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户在设置页确认后删除当前计划及其历史记录，同时安全保留其他计划。

**Architecture:** `usePlan` 提供纯状态规则和持久化封装的 `removePlan(planId)`，保证活动计划 ID 永远指向剩余计划。App 负责把删除操作与记录过滤、备份提醒时间和导航串起来；Settings 只负责显示按钮、确认提示和调用回调。

**Tech Stack:** React 18, Vitest, Testing Library/源码断言, localStorage storage helpers, lucide-react。

## Global Constraints

- 只删除目标计划及 `record.planId` 匹配的历史记录。
- 删除前必须确认；取消不得产生状态或持久化变化。
- 删除最后一份计划后活动计划为 `null`，应用进入设置页空状态。
- 不改变创建、编辑、导入导出和“清除所有数据”行为。
- 保留现有 ASCII 默认编辑风格和项目内的破坏性按钮样式。

### Task 1: Add Atomic Plan Removal API

**Files:**
- Modify: `src/hooks/usePlan.js:120-185`
- Test: `src/hooks/usePlan.test.js`

**Interfaces:**
- Produces `removePlan(planId)` from `usePlan()`.
- `removePlan` removes one ID, chooses the first remaining plan only when the active ID was removed, persists through `persistPlanState`, and leaves state unchanged for an unknown ID.

- [ ] **Step 1: Write failing pure-state tests**

Add tests around `normalizePlanState`/a new exported helper if needed. The tests must cover the exact expected transitions:

```js
it('removes a non-active plan without changing the active id', () => {
  const state = usePlanModule.removePlanState?.({
    plans: [{ id: 'a' }, { id: 'b' }],
    activePlanId: 'b',
  }, 'a')
  expect(state).toEqual({ plans: [expect.objectContaining({ id: 'b' })], activePlanId: 'b' })
})

it('falls back to the first remaining plan when removing the active plan', () => {
  const state = usePlanModule.removePlanState?.({
    plans: [{ id: 'a' }, { id: 'b' }],
    activePlanId: 'a',
  }, 'a')
  expect(state?.activePlanId).toBe('b')
})

it('clears the active id when removing the last plan', () => {
  expect(usePlanModule.removePlanState?.({ plans: [{ id: 'a' }], activePlanId: 'a' }, 'a')).toEqual({
    plans: [],
    activePlanId: null,
  })
})

it('ignores an unknown plan id', () => {
  const state = { plans: [{ id: 'a' }], activePlanId: 'a' }
  expect(usePlanModule.removePlanState?.(state, 'missing')).toEqual(state)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/hooks/usePlan.test.js`

Expected: FAIL because `removePlanState`/`removePlan` is not defined.

- [ ] **Step 3: Implement the minimal removal transition and hook callback**

Add a small exported `removePlanState(current, planId)` beside `normalizePlanState`, then add this callback beside `replacePlans`:

```js
const removePlan = (planId) => {
  setState((current) => {
    const nextState = removePlanState(current, planId)
    if (nextState === current) return current
    persistPlanState(nextState.plans, nextState.activePlanId)
    return nextState
  })
}
```

Include `removePlan` in the memoized return object. `removePlanState` must normalize/compare IDs, remove only an existing target, retain the current active ID when it remains, and otherwise choose `plans[0]?.id || null`.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npm test -- --run src/hooks/usePlan.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the data-layer change**

```bash
git add src/hooks/usePlan.js src/hooks/usePlan.test.js
git commit -m "feat: add single-plan removal state"
```

### Task 2: Wire App Deletion and Record Cleanup

**Files:**
- Modify: `src/App.jsx:258-380`
- Test: `src/App.test.jsx`

**Interfaces:**
- App consumes `removePlan(planId)` from `usePlan`.
- Settings receives `onDeletePlan(planId)` through the existing `Screen` props.

- [ ] **Step 1: Add a source-level regression test for the handler wiring**

Extend the existing App wiring suite to extract `handleDeletePlan` and assert it calls `replaceRecords`, `removePlan`, `markDataChanged`, and `setActiveTab('settings')`, and filters by `record.planId`.

- [ ] **Step 2: Run the focused App test and verify it fails**

Run: `npm test -- --run src/App.test.jsx`

Expected: FAIL because no handler or prop wiring exists.

- [ ] **Step 3: Implement the App handler and prop**

Destructure `removePlan` from `usePlan`, then add:

```js
const handleDeletePlan = (planId) => {
  const targetPlan = plans.find((item) => item.id === planId)
  if (!targetPlan) return

  replaceRecords(records.filter((record) => record.planId !== planId))
  removePlan(planId)
  markDataChanged()
  setActiveTab('settings')
}
```

Pass `onDeletePlan={handleDeletePlan}` to the lazy screen. Keep record removal and plan removal in the same handler; do not alter the existing clear-all path.

- [ ] **Step 4: Run App tests and verify they pass**

Run: `npm test -- --run src/App.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit App wiring**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: clean up records when deleting a plan"
```

### Task 3: Add Settings Confirmation UI

**Files:**
- Modify: `src/components/Settings.jsx:180-470,1030-1060`
- Modify: `src/i18n/translations.js` (add delete-plan copy in both locales)
- Test: `src/components/Settings.test.jsx`

**Interfaces:**
- Settings consumes optional `onDeletePlan(planId)`.
- The button renders only when `plan` exists and calls `window.confirm` before invoking the callback.

- [ ] **Step 1: Add failing Settings source assertions**

Assert the component accepts `onDeletePlan`, contains a current-plan delete handler using `window.confirm`, renders a delete-plan button only in the `plan` branch, and references translated confirmation/button keys.

- [ ] **Step 2: Run the focused Settings test and verify it fails**

Run: `npm test -- --run src/components/Settings.test.jsx`

Expected: FAIL because the prop, handler, and copy do not exist.

- [ ] **Step 3: Implement translated confirmation and button**

Add translation keys such as `删除当前计划` and `确认删除计划` with English equivalents. Add `onDeletePlan` to props and implement:

```js
const handleDeletePlan = () => {
  if (!plan?.id) return
  const confirmed = window.confirm(t('确认删除计划', { name: plan.name || t('未命名计划') }))
  if (!confirmed) return
  onDeletePlan?.(plan.id)
}
```

Render a `control-button-danger` button next to “撤销修改 / 填写新计划” in the existing `plan ?` action group, with `Trash2`, translated label, and an accessible title. Do not show it while creating a new unsaved plan. Resetting the form is unnecessary because App switches to settings and the `plan` prop becomes null; preserve the existing clear-all reset behavior.

- [ ] **Step 4: Run Settings tests and verify they pass**

Run: `npm test -- --run src/components/Settings.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit Settings UI**

```bash
git add src/components/Settings.jsx src/components/Settings.test.jsx src/i18n/translations.js
git commit -m "feat: add current-plan delete action"
```

### Task 4: Full Verification

**Files:**
- Test only: existing project test suite.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test -- --run`

Expected: all existing and new tests pass.

- [ ] **Step 2: Check formatting and working tree**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended implementation files plus any pre-existing unrelated user files remain.

- [ ] **Step 3: Commit any final test-only adjustment if required**

```bash
git add src/App.jsx src/App.test.jsx src/components/Settings.jsx src/components/Settings.test.jsx src/hooks/usePlan.js src/hooks/usePlan.test.js src/i18n/translations.js
git commit -m "test: verify single-plan deletion flow"
```

