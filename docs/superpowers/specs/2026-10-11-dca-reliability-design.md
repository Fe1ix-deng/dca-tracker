# DCA Tracker 第一阶段可靠性修复设计

## 目标
统一 US/CN 金额显示，严格验证备份导入，报告本地存储写入失败，降低行情 API 滥用风险，并明确 Vercel 与 Cloudflare 部署边界。

## 方案
金额格式集中到 `src/utils/money.js`，由 plan.market 决定 USD/CNY；价格继续由 marketPrecision 控制。备份导入在 `backup.js` 使用集中 schema 归一化，所有入口复用并拒绝非法结构。存储写入返回结果，hooks 仅在成功后提交状态并向 App 暴露错误。行情 API 只读取服务端 key，做 ticker 白名单、数量限制、超时、缓存、频率保护和供应商错误映射。Vercel 保持 serverless API；当前 Wrangler 配置仅部署静态 assets，文档明确 Cloudflare 静态部署不提供该 API。

## 验证
新增金额、备份边界、存储失败和行情安全测试；运行 `npm test` 与 `npm run build`。
