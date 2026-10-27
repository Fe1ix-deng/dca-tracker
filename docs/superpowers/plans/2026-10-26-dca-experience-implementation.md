# DCA Tracker 第四阶段 Implementation Plan

> 2026-10-27 用户批准的验证收缩：各层按职责验证，不重复铺故障矩阵；事务单测保留完整写入位置，App/导入各用代表性失败，浏览器只验证真实用户行为，不解析构建产物另挂组件。D 的视觉验收采用有风险的代表性视口/主题/语言组合，不再要求全部功能逐一交叉。局部修改跑受影响测试，阶段交付跑一次全量；轻微格式兼容和假设中的未来竞态不单独阻塞阶段。下文与此冲突的验证数量/矩阵以本条为准，金融正确性、备份与数据保留要求继续有效。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for sequential execution, or superpowers:subagent-driven-development if the user selects delegation. Execute A→B→C→D, with an evidence gate after each part. Steps use checkbox syntax. 本轮仅交付计划，不实施。

**Goal:** 完成首次入口、保存/身份可靠性、逐标的行情与拆合股估值、日期兼容和产品无障碍/说明修复。

**Architecture:** 先建立共享约束、严格日期基础、资产关联检查和明确保存结果，再接入行情与估值，随后贯通日期保存/备份及跨日状态，最后完成入口、滑杆和 FAQ/SEO。每部分以真实行为、数据完整性和已记录证据作为推进条件；自动测试通过只是其中一项。

**Tech Stack:** React 18、Vite 7、Vitest 3、Tailwind、localStorage；实施时增加 Testing Library/user-event、jsdom、Playwright 与 axe 浏览器检查。

**Spec:** `docs/superpowers/specs/2026-10-12-dca-experience-fixes-design.md`（2026-10-26 修订，含 §3.4、§5.3、§6.1）。该规范定义行为，本计划确定文件、接口、顺序和验证。

## Global Constraints

- 基于当前完整工作区，而非仅 HEAD；保留所有既存未提交和未跟踪工作，不 reset/clean/stash、整文件覆盖或 blanket-stage。
- 无效草稿仍可提交，只有保存中禁用；实际持久化全部成功才导航。
- 共享上限：50 计划、100 资产/计划、5000 记录、10000 期；无限占位 9999；ticker `^[A-Z0-9][A-Z0-9.-]{0,19}$`；权重容差 1e-6。
- 超限/错误草稿不可静默截断；无限目标空白错误、显式 0 合法。
- 有记录或事件关联的资产不能改 ticker/删除；临时行 ID 不迁移历史；加载坏关联单列修复状态。
- 保持存储键、备份 2.0 兼容，不新增强制备份字段，不新增语言路由，不重写原始交易口径。
- 历史原价仅按执行日之后至估值日已生效事件换算一次；口径不明标不可可靠估值。
- 执行日支持规范纯日期及规范 §6.1 的旧 ISO，严格校验日历，保留文本业务日，不按时区转日。
- 当天到期不逾期；固定完成移除下一期入口；午夜/focus/visible/pageshow 更新状态。
- 中英文共享 /faq canonical，静态正文/schema 同步，退出恢复当前语言主页 metadata。
- 真实 DOM/浏览器交互为主；不以源码字符串或无意义注释通过测试。

## Review Focus

1. 保存快照尚未完成时切页/切计划，旧回调不得重置新草稿或导航；A2/A3。
2. 重复 ticker 及事件关联可能被 Map/normalize 静默合并；保存与自动重建前阻断，A1/A3。
3. 旧 adjusted 缓存重复调整、日期未知或缓存跨事件仍被计入总值；B1/B2。
4. 同一时刻两时区估值日不同：原始业务不变，派生结果仅在同估值日一致；C1/C2。
5. 英文长错误、窄屏、pending 行情和 FAQ metadata 生命周期竞态；D1/D2/D3。

---

## 0. 改动基线与推进方式

- 基线 HEAD：`16d2756d4d12d8c170942fd4b4199b9c9b66130b`，分支 main；本轮只读核对 Node v26.0.0、npm 11.12.1。
- 产品基线是该提交加当前工作区未提交内容。`2026-10-26-dca-experience-baseline.json` 保存本轮修订后状态清单和文件 SHA-256；包含既有产品工作、未跟踪代码/旧可靠性文档/录屏目录的保留标记，目录标记不是递归备份。规范文件指纹会在文档定稿后同步刷新。
- 已有产品修改覆盖 App、Settings、Dashboard、OperationPanel、History、Layout、hooks、i18n、行情服务/API、存储/预算/计算；未跟踪的 backupSchema、ids、money、requestGuard 及其测试也是基线，不得当作第四阶段新写内容删除。完整清单以 JSON 为准。
- 本轮没有运行 npm test/build，基线通过状态为“未验证”。A0 必须先运行并记录；发现原有失败单列，调查原因再推进，不删除旧断言来制造绿色。
- 实施前重读 git status/diff 并核对指纹，若用户工作已变化，以更新后的工作区重定基线并说明差异，不恢复旧内容。默认在该工作区顺序执行；如需隔离，必须完整保留未提交依赖，不能只从 HEAD 新建空白 checkout。
- 每部分门槛未满足时留在该部分修复；不得先做下一部分再回填证据。浏览器/依赖不可用属于未完成项，不能用静态断言替代。
- 提交点以“任务验证后审阅 diff”为单位，只选择本阶段可识别的 hunk/新文件；混入既有工作且不能分离时不自动提交。禁止 git add . / git commit -a。本次文档交付不提交产品代码。

## 文件职责与共同接口

| 文件 | 职责/归属 |
| --- | --- |
| src/utils/planConstraints.js、planValidation.js、assetIntegrity.js | 共享规则、草稿校验、身份图，A |
| src/utils/executionDate.js | 严格日历/旧 ISO/本地日基础，A1 提供；C1 贯通调用 |
| src/utils/savePlanTransaction.js、storage.js、hooks/usePlan.js、useRecords.js、App.jsx | 保存事务协调/失败补偿、发布状态，A2 |
| src/components/Settings.jsx、PlanValidationSummary.jsx | 草稿交互、错误/身份保护，A3；滑杆 D1 |
| src/utils/valuation.js、marketSnapshot.js、hooks/useMarketSnapshot.js | 估值口径、逐标的请求与来源，B |
| src/utils/stockSplits.js、App.jsx | 复用现有换算、显式估值日/幂等重建，B1 |
| src/utils/contributionSchedule.js、hooks/useLocalDate.js | 日期状态及跨日监听，C2 |
| src/utils/backup.js、backupSchema.js、OperationPanel.jsx、History.jsx、BackupImportButton.jsx | 日期/身份完整性保存和备份边界，A/B 的检查，C1 日期链 |
| Layout.jsx、index.css、i18n/translations.js | 入口、焦点、响应式及中英文，D1；前序必要文案随所属任务实现 |
| src/content/faq.js、src/content/pageMetadata.js、hooks/usePageMetadata.js、Faq.jsx、index.html、faq.html | 真实说明/静态动态 SEO，D2 |
| src/test/setup.js、src/test/fixtures.js、playwright.config.js、e2e/*.spec.js | DOM/浏览器设施与行为回归，A0 起按阶段添加 |
| docs/verification/2026-10-26-phase4/ | 每部分命令、场景矩阵、截图索引和遗留项（实施时生成） |

新增接口统一采用：`Result={ok:true}|{ok:false,error,code?,rollbackFailed?}`；错误用 `{field,code,params}`。行情返回值/错误、日期及身份详情必须保留，不用布尔量吞掉原因。下列签名是计划约定，可在实现前自检中细化类型但不能改行为。

## A. 公共约束、表单校验、保存结果和故障恢复

### A0. 记录基线并建立行为测试设施

**Files:** Modify package.json/package-lock.json/vite.config.js；Create src/test/setup.js、src/test/fixtures.js、playwright.config.js、e2e/phase4-smoke.spec.js。

**Interfaces:** 测试 fixture 导出健康 fixed/open-ended 计划、原始记录、拆合股事件及故障注入器。Playwright project 名 chromium，按 @A/@B/@C/@D tag 分阶段运行；test:e2e 脚本调用 playwright test，Vitest 排除 e2e。

- [ ] 先运行 `npm test`、`npm run build`，记录完整退出结果与现有失败；不声称全验收通过。
- [ ] 以开发依赖安装 DOM/浏览器设施：`npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @playwright/test @axe-core/playwright`；按 Node/现有版本兼容锁定实际版本，必要时安装 Chromium，保持生产依赖不变。
- [ ] 配置 jsdom 仅服务 DOM 测试（通过文件环境声明），保留原 node 测试；setup 提供 jest-dom/cleanup。Playwright 使用 build 后 preview、127.0.0.1:4173、严格端口、独立浏览器存储，失败留 trace，关键成功场景另留截图；不读取用户真实浏览器数据。
- [ ] 添加 @A smoke：实际挂载已有页面、检查 role/name 与 preview /faq 加载，不只测测试环境本身；运行 `npm test`、`npm run build`、`npm run test:e2e -- --project=chromium --grep @A`。记录安装/浏览器环境及基线变化。
- [ ] 审阅本任务 diff/基线；只保存可识别测试设施变更的检查点。

### A1. 统一约束、日期基础和资产身份图

**Files:** Create planConstraints.js/planValidation.js/assetIntegrity.js/executionDate.js 及同名 .test.js；Modify backupSchema.js、api/quotes.js、Settings.jsx/usePlan.js 的约束导入。

**Interfaces:**
- `parseExecutionDate(value): string|null`：严格按规范 §6.1，返回业务 YYYY-MM-DD；`parseCalendarDate(value)` 只收纯日期；`getLocalDate(now=new Date()):string`，`getCreatedLocalDate(value):string|null` 分开真实时刻与业务日。
- `inspectAssetIntegrity({plans,records}):{issues,byPlanId}`；每计划含 needsRepair、protectedTickers、原始身份快照。`validateAssetIdentityChange(originalPlan,candidatePlan,records):Error[]` 比较已保存关联；坏关联不经 normalize 后消失。
- `validatePlanDraft(form,{existingPlanIds,editingPlanId,planRecordCount,assetIntegrity}):{isValid,errors,firstErrorField}`；共享约束与错误代码为 Settings/协调层共同调用。

- [ ] 写失败测试：10000 可通过/10001 不截断、1.5 期错误；空白与 0 无限目标不同；负数/NaN/Infinity/12abc；权重 0/1 范围、0.1+0.2+0.7、0.999998 及容差端点。`spy` 与 ` SPY ` 重复、20/21 长度、非法字符、50/51 计划及 100/101 资产。按表单顺序断言错误码/路径，验证函数不改输入。
- [ ] 同批写身份失败测试：无关联允许改/删；record 或未来 splitEvent 关联即阻止；加载重复/孤立记录/孤立事件为 needsRepair；输入仅当前草稿重复是普通错误；保护原始 JSON 未变。日期测试含纯日、带/不带三位毫秒 ISO Z/offset、合法闰日、非法闰日、无时区/尾缀/24:00/非法偏移均拒绝。
- [ ] 运行 `npx vitest run src/utils/planValidation.test.js src/utils/assetIntegrity.test.js src/utils/executionDate.test.js`，确认因缺接口/行为失败，不因环境失败。
- [ ] 实现三类纯函数及共享约束，逐项遵守规范 §3.2/3.4/6.1；已有 normalizeFormPlan/hook 不得提前修正原始错误。日期基础只建立接口，C1 再替换完整保存/备份链。后端和备份复用同一 ticker 约束，保留兼容导出。
- [ ] 运行上述测试及 `npx vitest run api/quotes.test.js src/utils/backupSchema.test.js src/components/Settings.test.jsx src/hooks/usePlan.test.js`；更新仅与新业务相冲突的旧测试，保留财务基线断言。验证前后原始输入/关联没有被改写。
- [ ] 审阅 diff，建立仅本任务可辨识变更检查点。

### A2. 明确保存结果与多键故障恢复

**Files:** Create savePlanTransaction.js/.test.js、src/App.persistence.test.jsx；Modify storage.js/usePlan.js/useRecords.js/App.jsx、相关 hook/storage 测试。

**Interfaces:** `persistPlanSave({previous,next},storageAdapter):Result` 收集计划列表/activeId/legacyPlan/records 的实际写入；适配器提供 read/write/remove 并返回真实错误。App 的 `onSavePlan(nextPlan):Promise<Result>` 先重验当前上下文与身份，准备重建数据，事务成功后以不再写盘的 publish 方法发布给两个 hook。持久化和 publish 分开，不放 React updater 内。

- [ ] 失败测试：依次在四个必需键的写入抛错；旧键不存在时补偿用 remove 而非写 null；补偿失败返回 rollbackFailed。断言成功前不 publish/导航/markDataChanged，失败保留旧内存及原始草稿，StrictMode 不双写。
- [ ] 增加回调集成：Settings/App 两边不重复导航；上下文身份变化重验；记录=5000 可编辑计划但不能新增记录，>5000 拒绝且不截断。迟到结果不污染另一计划；恢复导出明确不含未保存草稿。
- [ ] 运行 `npx vitest run src/utils/savePlanTransaction.test.js src/App.persistence.test.jsx` 见真实失败；再实现快照补偿/Result/publish、错误呈现及自动重建 guard。加载 needsRepair 数据时禁止自动重建与新增操作，正常备份拒绝坏关联，原始恢复导出保留数据。
- [ ] 运行上述测试及 `npx vitest run src/utils/storage.test.js src/hooks/usePlan.test.js src/App.test.jsx src/utils/backupSchema.test.js`；注入异常后逐键核对旧值及状态，不把“返回了 false”当作完整恢复证据。
- [ ] 检查并保存本任务检查点；记录 localStorage 非事务及补偿失败的限制。

### A3. Settings 的真实错误、焦点与身份保护

**Files:** Modify Settings.jsx/App.jsx/i18n/translations.js；Create PlanValidationSummary.jsx、Settings.behavior.test.jsx、e2e/settings-save.spec.js。

**Interfaces:** Settings 接收 records/assetIntegrity 保存上下文、onSavePlan Promise<Result>；临时 draftRowId 不进入持久化。摘要消费有序 errors，定位实际字段/ref，单一预挂载 live region。

- [ ] 编写失败 DOM 测试：无效草稿保存按钮 enabled；点击显示全部错误且名称实际聚焦；首次提交后修复错误/新错误同步、焦点不跳；摘要链接定位资产区；更换预算模式保留原输入；pending 锁定字段/保存，失败恢复，undefined/throw 均不导航。
- [ ] 身份行为测试：允许未关联行改 ticker/删，关联行解释原因且不触发删除，直接保存绕过同样阻止；加载重复为修复状态，不将两个 ticker 行当同一行改写。正常保存→构建备份→校验导入无孤立记录/事件（A 门槛先用纯日期健康 fixture）。
- [ ] 运行 `npx vitest run src/components/Settings.behavior.test.jsx` 确认红；实现 §3 全部交互，严格保留错误原始值，提交快照/请求上下文隔离，保存成功唯一导航。
- [ ] 运行上述 DOM 与 A2 集成测试；@A 浏览器实际点击检查 activeElement、首错可视区域、pending/存储失败留页、重试仅新增一个计划，保留 trace/截图。
- [ ] 审阅 diff，建立检查点；填写 A 验收证据。

### Gate A（完成后才推进 B）

- [ ] `npm test`、`npm run build`、`npm run test:e2e -- --project=chromium --grep @A` 全部运行并核对结果；基线失败与新增失败分列，未解决失败不得略过。
- [ ] 人工审阅输入未截断、失败草稿保留、存储补偿/重试、身份图/健康备份可导入证据；有异常或未检查项保持 A 未完成。日期完整 ISO 文件往返在 C 验收，不在 A 宣称完成。

## B. 逐标的行情来源、拆股口径与缺价估值

### B1. 原始历史价换算与持仓幂等口径

**Files:** Create valuation.js/.test.js；Modify stockSplits.js/.test.js、marketSnapshot.js/.test.js、App.jsx/App.test.jsx。

**Interfaces:** `resolveHistoricalValuation({plan,records,ticker,asOfDate}):PriceSnapshot`，包括 price|null、source、recordDate、asOfDate、factor、reliable、reason、adjustment；`rebuildPlanState(plan,records,sourceRecords=records,{asOfDate})` 保留三参兼容并支持明确估值日，默认调用方用本地日。`stateNeedsRebuild` 使用相同上下文。

- [ ] 测试原价120、原股数10：2:1→价60/股20；1:4→价480/股2.5；连续两事件 F=0.5→价240/股5，价值均1200。未来事件排除、生效日等于执行日不再次调整、同日事件包含截至估值日。
- [ ] 测试有/无 adjustedPrice 都从原价推导；错误 adjusted 缓存与原始可解释时按原始重算，口径矛盾不能解释则 unreliable；两次 rebuild、刷新、渲染结果不累乘。只有 adjusted 无原价、坏日期、未来执行日、坏/重复事件不以 factor1 通过。原始 price/shares/amount 不变。
- [ ] 运行 `npx vitest run src/utils/valuation.test.js src/utils/stockSplits.test.js src/App.test.jsx` 见红；实现 §5.3：先检查原始事件，再复用 getSplitFactor/adjustAssetForSplit/adjustHoldingForSplit，显式传日期，不重写原值。持仓从原始初始/交易推导，无法证明原始基准就 unavailable；不新造隐含基准日期。
- [ ] 运行上述及 `npx vitest run src/utils/marketSnapshot.test.js src/utils/portfolioCost.test.js`；人工核对每个算例、未来事件和幂等差分，保存检查点。

### B2. 请求状态与界面来源/估值完整性

**Files:** Modify services/marketQuotes.js/.test.js、hooks/useQuote.js/.test.js、marketSnapshot.js/.test.js、Dashboard.jsx、OperationPanel.jsx/i18n；Create hooks/useMarketSnapshot.js、Dashboard.quotes.test.jsx、OperationPanel.quotes.test.jsx、e2e/quotes.spec.js。

**Interfaces:** `PriceSnapshot` 沿规范内存字段，加 reliable/reason/asOfDate/factor；`useMarketSnapshot({plan,records,asOfDate})` 返回 snapshots、refresh、requestSummary。每 ticker 成功时间本地接收时写入；batch 最大20，轮次和失败 ticker 可见。操作手动 edited 标志独立于值。

- [ ] 测试 A本轮成功/B旧自动失败/C旧手动记录，逐项时间正确；HTTP200遗漏、全失败、首次缺值、loading保值、21个ticker分批、旧请求取消/切计划隔离。getLastRecordedPrices 的测试改为元数据/原始记录业务断言，不保留仅返回裸数字的旧假设。
- [ ] 测试手动清空/非法仍覆盖并缺价、晚到请求不覆写、明确自动重试成功才解除；跨事件的不明旧自动基准 unreliable。正持仓缺价/不可靠则完整总值盈亏--、零持仓不误阻塞；混合来源/不同轮次在总值旁可见，历史调整保留日期和说明。
- [ ] 运行 `npx vitest run src/services/marketQuotes.test.js src/utils/marketSnapshot.test.js src/components/Dashboard.quotes.test.jsx src/components/OperationPanel.quotes.test.jsx` 见红，再实现接口、请求守卫与 §5 状态矩阵；禁止 asOf 冒充交易所时间。
- [ ] DOM 测试通过后执行 @B 浏览器场景，mock逐项服务响应而不是硬写页面状态；截图核对总值旁混合/缺值/调整说明，更新检查点。

### Gate B（完成后才推进 C）

- [ ] 全量 `npm test`、`npm run build`、`npm run test:e2e -- --project=chromium --grep '@A|@B'`；检查 A 未回归。
- [ ] 逐项核对拆/合/多事件/未来/旧备份缺缓存和不可靠基准、混合源状态矩阵，证据中有数学算例及实际 UI；不以测试数取代金融口径审查。

## C. 日期状态、日期兼容与跨日更新

### C1. 创建→保存→JSON/CSV导出→导入统一日期

**Files:** Modify executionDate.js/.test.js 的调用覆盖、OperationPanel.jsx、History.jsx、App.jsx、storage.js/useRecords.js、backup.js/.test.js、backupSchema.js/.test.js、BackupImportButton.jsx；Create src/utils/backupRoundTrip.test.js、e2e/backup-roundtrip.spec.js。

**Interfaces:** 所有执行日消费者使用 A1 parseExecutionDate，写入 canonical YYYY-MM-DD；backup parser 对有/无 version 都返回已规范化记录。正常 buildBackupPayload 可报告/抛出明确校验错误，rescueRawBackup 仍保留原始值。导入协调复用 A2 的结果/快照机制，不先破坏原数据。

- [ ] 写失败测试：纯日与旧 ISO Z/offset/三位毫秒均导入为文本业务日，非法闰日/尾缀/无时区拒绝且存储不变；无版本分支不能返回原始未规范化记录，不造1970缺省日。CSV/History显示同日，导出不重算交易值。
- [ ] 端到端先创建一笔实际操作（2.5股×120=300）、导出真实下载 JSON、清空隔离存储、文件上传导入、展示/再次导出；分别台北/洛杉矶，并跨时区传同一文件。无事件和有拆合股两个 fixture，严格比较业务日、原股数/价/金额、累计金额；同估值日派生值一致。
- [ ] 运行 `npx vitest run src/utils/executionDate.test.js src/utils/backupRoundTrip.test.js src/utils/backup.test.js src/utils/backupSchema.test.js src/components/History.test.jsx src/components/History.csv.test.js` 见红，再替换所有执行日切片/Date解析；createdAt 保持真实时刻语义，事件日期仍纯日。
- [ ] 对正常备份导出失败提供原始恢复通道并解释不可直接恢复；UI捕获导出/导入结果，失败不得导航/覆盖。运行上述测试及 @C roundtrip，记录下载文件比对与跨时区结果。
- [ ] 审阅 diff/业务值快照，建立检查点。

### C2. 本地日期状态与午夜/focus更新

**Files:** Modify contributionSchedule.js/.test.js、Dashboard.jsx、App.jsx（估值日传递）；Create hooks/useLocalDate.js/.test.jsx、Dashboard.schedule.test.jsx、e2e/schedule.spec.js。

**Interfaces:** `getContributionState({plan,records,today}):{status,nextDate,nextPeriod,reason}`，status为 completed/overdue/dueToday/upcoming/unknown/limited；`useLocalDate():YYYY-MM-DD` 负责午夜/focus/visible/pageshow和清理，也提供同日估值输入。日历加月/14日复用严格基础。

- [ ] 写失败测试：today=2026-10-26，10-25/26/27分别逾期/今日/待执行；完成优先、无限不看9999、容量limited、最高期日期坏不回退、总期数/频率坏unknown；无记录创建日；月末/闰日/双周/未来日期。
- [ ] fake timers 加真实浏览器 clock：午夜23:59→00:00更新，后台跨日后focus/visible/pageshow更新且监听无泄漏；台北/洛杉矶同一时刻本地日不同，DST不按24h推算。
- [ ] 运行 `npx vitest run src/utils/contributionSchedule.test.js src/hooks/useLocalDate.test.jsx src/components/Dashboard.schedule.test.jsx` 见红；实现状态互斥/入口移除/清晰无记录引导，删除“当前没有漏投”等冲突，更新旧日期测试至新业务约定。
- [ ] 执行 @C；单列生效日边界算例：同一时刻台北10-26/洛杉矶10-25可以派生不同估值，但同 asOfDate必须相同且原始交易永不变；显示估值日/调整原因。保存检查点。

### Gate C（完成后才推进 D）

- [ ] `npm test`、`npm run build`、`npm run test:e2e -- --project=chromium --grep '@A|@B|@C'`；验证前序未回归。
- [ ] 核对真实下载→上传文件链及两时区业务值差分、非法闰日拒绝、真实午夜/focus、固定完成无入口，所有证据完成才进D；只有helper测试通过不得进D。

## D. 创建入口、滑杆可访问性、FAQ/SEO与浏览器验收

### D1. 创建路径与原生range真实操作

**Files:** Modify Layout.jsx/Settings.jsx/index.css/i18n/translations.js；Create Layout.behavior.test.jsx、Settings.accessibility.test.jsx、e2e/onboarding-accessibility.spec.js。

**Interfaces:** Layout 的无计划入口调用现有 settings 导航，Settings原生滑杆有唯一label/output/aria-valuetext；不改变A的保存/错误行为。

- [ ] 写失败 DOM：无计划从总览/历史/FAQ一跳新草稿且不写存储，有计划选择器只切换；四类slider可按可访问名称查询，已有行含ticker。
- [ ] 真实浏览器 @D：Tab/Enter激活创建，Tab+方向/Home/End改变range，input/output/aria值/保存值一致；现金0–30%、年化0–50%、新资产5–100%、已有0–100%，1百分点步长。覆盖合法旧年化超滑杆范围数值编辑，焦点日夜可见。
- [ ] 红后实现显式入口、label/output和值语义、focus-visible/窄屏布局；移除为旧源码测试添加的注释，相关测试转成实际行为。
- [ ] 运行 `npx vitest run src/components/Layout.behavior.test.jsx src/components/Settings.accessibility.test.jsx`、@D相关浏览器场景；保存检查点。

### D2. 金融说明与静态/动态FAQ元数据

**Files:** Modify content/faq.js/.test.js、Faq.jsx/FaqSummary.jsx、Layout/Settings/OperationPanel/Dashboard 的场景说明、index.html/faq.html、i18n；Create content/pageMetadata.js、hooks/usePageMetadata.js、Faq.metadata.test.jsx、e2e/faq-seo.spec.js；Modify seo.test.js。

**Interfaces:** `getPageMetadata({tab,language})` 返回规范 §7 全部meta/schema；`usePageMetadata({tab,language})` 是单一路由/语言消费者，从App挂载，Faq不再独自cleanup固定中文。FAQ可见数据与动态JSON-LD同源，静态faq.html与中文数据逐条一致。

- [ ] 写失败测试：中文/英文可见问答逐条等于对应schema；解析静态DOM正文/schema逐项对齐；无评分、真实product字段、单一FAQ节点、真实canonical/@id。
- [ ] 浏览器直接/faq→英文→总览→中文→FAQ，检查可见文本/title/description/meta language/html lang/og locale/URL/schema；关闭JS检查完整静态中文。不存在语言伪URL/hreflang。
- [ ] 红后实现 §7：场景短句涵盖投资/费用税费等排除项、延迟/获取时间、ticker网络发送、本地备份/清理说明；修正“所有数据不上网”和“选择器创建保存”错误，移除aggregateRating。
- [ ] 运行 `npx vitest run src/content/faq.test.js src/components/Faq.metadata.test.jsx src/seo.test.js src/i18n/i18n.test.js` 及 @D FAQ浏览器；建立检查点。

### D3. 完整浏览器矩阵与交付复核

**Files:** Add docs/verification/2026-10-26-phase4/acceptance.md（含A/B/C证据索引）；按失败修正所属产品/测试文件，不新增掩盖问题的测试注释。

- [ ] 浏览器320×740、375×812、1440×900，每个视口覆盖日间/夜间×中文/英文四种组合；实际检查入口可见/44px目标、长摘要/首错真实可视、滑杆键盘/焦点、混合/不可靠估值说明、FAQ切换。截图/trace记浏览器版本/时区/时间/场景；无横向溢出、遮挡、裁剪。
- [ ] axe扫描与role/name/描述/live内容行为检查并列记录；未做人工读屏就标“未做”，不得宣称屏幕阅读器实际播报已验收。
- [ ] 运行最终 `npm test`、`npm run build`、`npm run test:e2e -- --project=chromium`，保存退出码/测试数/报告。浏览器检查针对当前构建；后续修复后重跑受影响场景和最终套件，不用旧证据。
- [ ] 逐条对规范 §2–§8 记录通过/失败/未验证、证据链接和剩余风险；拆合股算例、身份完整性、日期文件往返、失败恢复不能仅填“测试通过”。未完成关键项不得称第四阶段全部验收完成。
- [ ] 对照基线审查完整diff：已有工作保留、未混入金融计算策略变化、无存储/备份强制升级；数据修复/部分写入/原始恢复导出的限制在交付中说明。完成可辨识的检查点，未授权部署/发布则不执行。

### Gate D / 最终完成标准

- [ ] 自动测试和构建通过。
- [ ] A/B/C/D实际行为、浏览器矩阵和财务/身份/日期检查完成且可追溯。
- [ ] 已知限制/未验证项明确，无关键验收缺口；满足前三项才报告全部完成，否则如实报告“实现/自动测试通过，某项验收未完成”。

## 规范覆盖与计划自检

| 规范 | 任务与验收门槛 |
| --- | --- |
| §2 创建入口 | D1、D3真实窄屏/桌面 |
| §3.1–3.3 校验、焦点、存储 | A1/A2/A3、GateA，D3响应式 |
| §3.4 身份保护/坏数据 | A1/A2/A3，C1正常备份往返再次验证 |
| §4 滑杆 | D1原生键盘、D3主题矩阵 |
| §5.1–5.2 逐项来源/混合/缺价 | B2、GateB |
| §5.3 拆合股口径/幂等 | B1/B2、C2跨日事件、GateB/C |
| §6 日期状态/跨日 | A1基础、C2、GateC |
| §6.1 保存/导入/导出/跨时区 | A1基础、C1文件链、C2估值日边界 |
| §7 FAQ/金融/SEO | D2、D3 |
| §8 真实验证/证据 | A0设施、每部分Gate、D3最终矩阵 |

自检结论：任务按依赖顺序可独立验收，A1先提供B所需日期基础而C完成全链；没有以B依赖尚未实施的C作为隐含前提。所有 Review Focus 已分配行为验证。计划中的命令/检查点均是未来动作，本轮未执行产品测试/构建，不据此宣称实现通过。
