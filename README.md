# DCA Tracker — 个人定投记录与复盘工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-Vite-blue.svg)](https://vitejs.dev/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://dca-tracker-steel.vercel.app)

**[🌐 在线体验 →](https://dca-tracker-steel.vercel.app)**

一款基于 React + Vite 构建的个人定投追踪 Web App。支持 **VA 价值平均** 与 **DCA 定额** 两种策略，支持多资产组合管理，数据本地存储无需后端，可一键部署到 Vercel。

---

## 🙏 赞助商

本项目由以下赞助商提供支持，感谢他们对开源社区的贡献！

| | |
|:---:|:---|
| <img src="docs/sponsors/intelalloc.png" width="140" alt="IntelAlloc"> | 感谢 **IntelAlloc** 赞助了本项目！IntelAlloc 是一家稳定、高效的 API 中转服务商，提供 Claude Code、Codex 等多种中转服务。欢迎使用[此链接](https://backend.intelalloc.com/register?promo=FEIFEI)注册，优惠码**专人专码，私信领取**。 |

---

## ✨ 功能特性

- **双策略支持**：DCA 定额（每期固定金额）和 VA 价值平均（跟踪目标市值路径）
- **双预算模式**：固定总预算分期投完，或无限定投持续执行
- **多资产组合**：按权重配置多只标的，自动计算每期各资产建议买入金额与股数
- **自动行情获取**：接入 Twelve Data API，支持价格自动拉取，失败自动回退手动输入
- **可视化总览**：组合轨迹图、仓位结构、投入节奏、四大核心指标一目了然
- **历史台账管理**：支持按标签筛选、编辑、删除历史记录，并可导出 CSV / JSON 备份
- **本地数据存储**：所有数据保存在浏览器 `localStorage`，无需注册账号，无需后端

---

## 📸 功能页面

| 页面 | 说明 |
|------|------|
| **总览** | 查看全局指标：总市值、累计投入、浮动盈亏、组合轨迹、仓位结构 |
| **本期操作** | 录入本期价格，确认建议股数，记录实际买入 |
| **历史** | 查看每一期执行台账，支持编辑、删除、导出、导入 |
| **设置** | 创建或修改计划，配置策略、预算、频率和资产权重 |

---

## 🚀 快速开始

### 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/Fe1ix-deng/dca-tracker.git
cd dca-tracker

# 2. 配置环境变量
cp .env.example .env
# 在 .env 中填入你的 Twelve Data API Key（可选，没有也能手动输入价格）

# 3. 安装依赖并启动
npm install && npm run dev
```

### 部署到 Vercel

1. 将项目 Push 到 GitHub
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. Framework 选择 `Vite`
4. 在 Vercel 的 `Environment Variables` 中添加：`TWELVE_DATA_API_KEY`
5. 保持默认设置，一键部署

> 项目根目录已包含 `vercel.json`，确保单页应用路由正常重写到 `index.html`。

---

## ⚙️ 环境变量

在项目根目录创建 `.env`：

```
TWELVE_DATA_API_KEY=your_twelve_data_key
```

- API Key 从 [Twelve Data](https://twelvedata.com/) 免费获取
- 如果不配置，价格自动获取将不可用，但手动输入功能完全正常。旧部署使用的 `VITE_TWELVE_DATA_KEY` 会暂时兼容；请迁移到 `TWELVE_DATA_API_KEY`，避免将密钥注入前端构建产物。
- 请勿将 `.env` 提交到 GitHub

---

## 📖 使用说明

详细的操作指南请参阅 **[使用说明.md](./使用说明.md)**，涵盖：

- 如何创建第一份定投计划
- DCA 与 VA 策略的区别和选择建议
- 「本期操作」页面各字段含义
- 「总览」页面各指标如何解读
- 数据导出与备份方法

---

## 🛠️ 技术栈

- **前端框架**：React 18 + Vite
- **样式**：Tailwind CSS
- **数据持久化**：浏览器 `localStorage`
- **行情 API**：Twelve Data
- **部署**：Vercel

---

## ⚠️ 重要提示

- 数据存储在**浏览器本地**，换浏览器或清除缓存后数据不会跟随迁移，建议定期在「历史」页导出 JSON 备份
- 本工具仅用于**个人记录与复盘**，不提供任何投资建议

---

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

---

## 📮 联系方式

- **Issue**：[GitHub Issues](https://github.com/Fe1ix-deng/dca-tracker/issues)
- **GitHub**：[@Fe1ix-deng](https://github.com/Fe1ix-deng)

---

如果这个项目对你有帮助，欢迎点一个 ⭐ Star 支持！
