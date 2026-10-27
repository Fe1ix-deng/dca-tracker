# DCA Tracker 第一阶段可靠性修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成币种显示、备份校验、存储错误、行情 API 安全和部署一致性修复。

**Architecture:** 共享金额格式工具和共享备份 schema 工具；React hooks 在持久化成功后更新状态；Vercel API 继续提供行情服务，Cloudflare 配置明确为静态部署。

**Tech Stack:** React 18, Vite, Vitest, Vercel serverless function, Wrangler assets。

## Global Constraints
- US 使用 USD，CN 使用 CNY；价格精度 US 两位、CN 三位。
- `targetAnnualReturn` 必须为有限数字且 >= -1；`reserveRatio` 范围 0..0.3。
- 数值字段必须为有限非负数字；ticker 非空且同计划唯一并大写。
- 导入规模和期数必须有明确上限，避免 RangeError。
- 行情 API 只读取 `TWELVE_DATA_API_KEY`。

### Task 1: 金额格式化
**Files:** Create `src/utils/money.js`; modify Dashboard/OperationPanel/History/Settings; test `src/utils/money.test.js`.
- 先写 US/CN 金额格式失败测试，再实现 `formatMoney(value, marketOrPlan)` 与 `formatSignedMoney`。
- 替换四个组件中的 USD 硬编码并运行相关测试。

### Task 2: 备份 schema
**Files:** Modify `src/utils/backup.js`, `src/hooks/usePlan.js`, `src/hooks/useRecords.js`, `src/components/BackupImportButton.jsx`; test `src/utils/backup.test.js`.
- 先添加非法数值、重复 ticker、孤立记录、超限期数和超大数组测试并确认失败。
- 实现 `validateAndNormalizeBackup(payload)`，由 `parseBackupPayload` 调用并抛出可读 `BackupValidationError`。
- 导入入口捕获错误并显示消息；所有计划/记录通过同一归一化流程。

### Task 3: 存储失败
**Files:** Modify `src/utils/storage.js`, `src/hooks/usePlan.js`, `src/hooks/useRecords.js`, `src/App.jsx`; test `src/utils/storage.test.js`.
- 先写 localStorage 不可用与 setItem 抛错测试。
- 让写入函数返回 `{ ok, error }`，hooks 只有成功时更新状态并暴露错误状态，App 显示保存失败。

### Task 4: 行情 API
**Files:** Modify `api/quotes.js`, `api/quotes.test.js`, `.env.example`, `README.md`, `README.en.md`.
- 先更新测试：拒绝 Vite key、非法 ticker、超量、超时、非 2xx 和异常 JSON。
- 实现服务端 key、白名单、20 个上限、AbortController 超时、缓存和简单频率保护。
- 确认响应不含 key，运行 API 测试。

### Task 5: 部署一致性
**Files:** Modify `vercel.json`, `wrangler.jsonc`, `README.md`, `README.en.md`.
- 添加配置回归测试或静态断言，确认 Vercel `/api/*` 不被 SPA rewrite 吞掉。
- 文档明确 Cloudflare assets 部署不包含 `api/quotes.js`，行情 API 需 Vercel 或单独 Workers/Pages Function。

### Task 6: 全量验证
- 运行 `npm test`。
- 运行 `npm run build`。
- 检查 git diff，确认无 API key、无未处理超大数组路径。
