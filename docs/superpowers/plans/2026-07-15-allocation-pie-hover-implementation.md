# 仓位诊断环形图悬停高亮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让仓位诊断列表中被悬停或聚焦的 ticker 在环形图上以克制的外扩和光晕高亮显示。

**Architecture:** 继续以 `Dashboard` 的 `activeWeightIndex` 作为唯一的当前资产状态。Recharts `Pie` 的 `activeShape` 使用一个自定义 `Sector` 组：主扇区外扩 6px，额外的 3px 同色半透明扇区形成光晕；列表和图表的已有事件都更新同一状态。

**Tech Stack:** React 18、Recharts 3、Vitest、Tailwind CSS。

## Global Constraints

- 不增加依赖，不改变计划或记录的数据模型，不持久化交互状态。
- 列表的 `mouseenter`、`focus` 和图表的 `onMouseEnter` 都必须继续控制同一活动索引。
- 活动扇区必须外扩 6px，外圈为 3px 的低透明度同色高亮。
- 验证必须包含 Dashboard 定向测试、完整 Vitest 套件与 Vite 生产构建。

---

### Task 1: 锁定环形图高亮契约并实现自定义活动扇区

**Files:**
- Modify: `src/components/Dashboard.layout.test.js`
- Modify: `src/components/Dashboard.jsx:190-230, 620-650`

**Interfaces:**
- Consumes: `activeWeightIndex`, `safeActiveWeightIndex`, `currentWeightData` 和 Recharts `Pie` 的 `activeShape` 接口。
- Produces: `ActiveWeightShape(props)`，用于渲染活动主扇区和外圈；图表与资产按钮通过 `setActiveWeightIndex(index)` 保持联动。

- [ ] **Step 1: 写入失败的结构测试**

  在 `src/components/Dashboard.layout.test.js` 的现有 `describe` 中添加：

  ```js
  it('links ticker hover state to an expanded allocation pie segment', () => {
    expect(dashboardSource).toMatch(/function ActiveWeightShape\(props\)[\s\S]*outerRadius \+ 6/)
    expect(dashboardSource).toMatch(/outerRadius \+ 9/)
    expect(dashboardSource).toMatch(/activeIndex=\{safeActiveWeightIndex\}/)
    expect(dashboardSource).toMatch(/onMouseEnter=\{\(_, index\) => setActiveWeightIndex\(index\)\}/)
    expect(dashboardSource).toMatch(/onMouseEnter=\{\(\) => setActiveWeightIndex\(index\)\}/)
    expect(dashboardSource).toMatch(/onFocus=\{\(\) => setActiveWeightIndex\(index\)\}/)
  })
  ```

- [ ] **Step 2: 运行测试并确认它因外扩尺寸尚未实现而失败**

  Run: `npm test -- src/components/Dashboard.layout.test.js`

  Expected: FAIL，新增测试找不到 `outerRadius + 6`，现有测试仍通过。

- [ ] **Step 3: 实现最小自定义活动扇区改动**

  将 `src/components/Dashboard.jsx` 中 `ActiveWeightShape` 的两个扇区半径改为：

  ```jsx
  <Sector
    cx={cx}
    cy={cy}
    innerRadius={innerRadius}
    outerRadius={outerRadius + 6}
    startAngle={startAngle}
    endAngle={endAngle}
    fill={fill}
  />
  <Sector
    cx={cx}
    cy={cy}
    innerRadius={outerRadius + 9}
    outerRadius={outerRadius + 12}
    startAngle={startAngle}
    endAngle={endAngle}
    fill={fill}
    opacity={0.34}
  />
  ```

  保留既有的 `activeIndex={safeActiveWeightIndex}`、图表 `onMouseEnter`、列表 `onMouseEnter` 和 `onFocus`，使所有输入路径使用同一状态。Recharts 的动画能力会在活动索引变化时平滑过渡扇区几何形状。

- [ ] **Step 4: 运行定向测试并确认通过**

  Run: `npm test -- src/components/Dashboard.layout.test.js`

  Expected: PASS，输出包含 3 个通过的 Dashboard 布局测试。

- [ ] **Step 5: 运行回归验证**

  Run: `npm test && npm run build`

  Expected: Vitest 完整套件通过，随后 Vite 输出成功的生产构建。

- [ ] **Step 6: 提交实现**

  ```bash
  git add src/components/Dashboard.jsx src/components/Dashboard.layout.test.js
  git commit -m "feat: highlight allocation pie on ticker hover"
  ```
