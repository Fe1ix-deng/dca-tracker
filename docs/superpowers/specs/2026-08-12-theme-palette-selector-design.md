# 多主题强调色选择器设计

## 目标

在现有“日间 / 夜间”主题基础上增加可选的强调色。用户点击主题控件右侧箭头后，才打开颜色弹层；主按钮继续负责日间与夜间切换。颜色选择不显示灵感来源或设计说明，来源只保留在本设计文档中。

本次扩展只改变强调色相关 token，不改变日间 / 夜间的背景、面板、正文、边框和语义状态体系。日间无彩色主题使用柔和灰白，而不是纯白，避免长时间使用时刺眼。

## 已确认的配色

颜色选择器提供五个选项，默认保持现有靛蓝：

| id | 名称 | 强调色 | 灵感来源 | 日间预览底色 |
| --- | --- | --- | --- | --- |
| `indigo` | 经典靛蓝 | `#5E6AD2` | 当前产品基线与 Linear 风格界面 | 沿用现有日间 token |
| `amber` | Claude 陶土琥珀 | `#C6613F` | Anthropic 公开官网实际渲染的暖灰白与陶土橙；Claude 登录后页面因 Cloudflare 验证无法直接核对 | `#FAF9F5` 方向 |
| `green` | 资产绿 | `#2F855F` | 金融产品的正向收益语义与克制的松针绿 | 轻微绿色倾向 |
| `rose` | 柔玫红 | `#BD5C73` | 编辑产品常用的 muted rose，与负向语义红区分 | 轻微玫灰倾向 |
| `mono` | 黑白灰 | `#222222` | Swiss / 黑白编辑设计的无彩色系统 | 画布 `#F1F1EE`，面板 `#FAFAF7`，边框 `#DDDDDA` 层级 |

`#C6613F` 是对 Anthropic 公开色彩的产品化收敛，不将无法验证的 Claude 登录后界面值描述为事实。`mono` 的黑白灰预览只代表该选项的日间无彩色底色；夜间仍沿用现有炭黑 surface ladder。

## 交互设计

### 桌面端

- 侧栏底部保留主题控件的位置和整体尺寸。
- 控件拆成两个相邻按钮：左侧为日间 / 夜间主按钮，右侧为带 ChevronDown 的颜色箭头按钮。
- 点击左侧按钮只在 `light` 与 `dark` 间切换，并继续写入现有主题存储键。
- 点击右侧箭头打开颜色弹层；再次点击箭头、点击弹层外部或按 `Escape` 关闭。
- 弹层锚定在控件上方或内侧，不能遮挡侧栏导航；窄视口时允许向内容区内侧对齐。
- 每个颜色选项使用圆形色板、名称和选中态图标；整个选项可点击、可键盘聚焦，并提供可读的 `aria-label`。
- 选择颜色后立即更新界面、关闭弹层，并持久化用户选择。

### 移动端

- 保留当前紧凑的主题控件宽度和高度。
- 左侧日间 / 夜间按钮继续只显示图标，右侧颜色箭头作为独立的紧凑图标按钮显示。
- 颜色弹层使用固定或绝对定位，确保不会超出视口；小屏幕下可扩展为接近整行的浮层。
- 弹层打开时保留清晰的焦点环和触摸目标尺寸。

## 技术设计

### 状态与持久化

扩展现有 `useTheme` 的状态契约，使其返回：

```js
{
  theme: 'light' | 'dark',
  accent: 'indigo' | 'amber' | 'green' | 'rose' | 'mono',
  isUserPreference: boolean,
  setTheme(nextTheme),
  toggleTheme(),
  setAccent(nextAccent),
}
```

- 新增独立的颜色存储键，例如 `dca-tracker:accent`，避免破坏现有 `dca-tracker:theme` 数据。
- 无有效颜色值时回退到 `indigo`，不依赖系统偏好；系统偏好只影响日间 / 夜间。
- 颜色值不在允许集合内时忽略并回退默认色，避免 localStorage 污染导致界面无 token。
- 用户选择颜色后写入 localStorage；存储不可用时仍更新内存状态并继续渲染。
- 页面初始化和状态变化时，在 `document.documentElement` 设置 `data-accent`；已有 `data-theme` 逻辑保持不变。

### CSS token

保持组件消费的语义变量名称不变。通过 `[data-accent='...']` 覆盖与强调色相关的 token：

- `--color-accent-rgb`
- `--color-accent-hover-rgb`
- `--color-accent-soft-rgb`

必要时为各强调色补充适合浅色和深色背景的 hover / soft 变体，但不重定义 `--color-positive-rgb`、`--color-negative-rgb`、`--color-warning-rgb` 或 `--color-info-rgb`，避免收益、亏损、警告和信息状态失去固定语义。

`mono` 主题额外覆盖日间的 surface token：

- `--color-surface-rgb: 241 241 238`
- `--color-panel-rgb: 250 250 247`
- 对应的 elevated、line、shadow 使用同一亮灰层级

夜间 `mono` 只切换强调色为黑白体系的低饱和灰，并维持现有深色 surface hierarchy，确保文本和边界仍有足够对比度。

### 组件边界

- `useTheme`：负责主题和强调色的解析、持久化、根节点属性同步。
- `Layout`：负责主题分体按钮、颜色箭头、弹层开关和无障碍焦点管理。
- `index.css`：负责五套强调色 token、弹层布局、选中态、响应式位置和颜色过渡。
- `App`：从 `useTheme` 取出 `accent` 与 `setAccent`，透传到 `Layout`；不改变业务页面和数据流。

## 数据流

```text
localStorage / defaults
        |
    useTheme
        |
  App -> Layout
        |
  setAccent(id)
        |
localStorage + <html data-accent="id">
        |
  CSS semantic tokens -> all existing components/charts
```

## 错误与边界处理

- `localStorage` 读写异常时忽略异常，使用内存状态；主题和颜色控件仍可操作。
- 弹层无选项或状态异常时不渲染空白面板，回退 `indigo`。
- 快速重复点击只保留最后一个有效选项，避免关闭动画期间写入无效值。
- 颜色弹层必须有明确的关闭路径，不能阻塞页面滚动、底部导航或侧栏其他按钮。
- 系统切换日间 / 夜间时，只更新 `data-theme`；已选强调色保持不变。

## 测试与验证

### 单元 / 组件测试

- 默认无颜色存储时返回 `indigo`。
- 有效颜色值可恢复；无效值回退 `indigo`。
- `setAccent` 写入独立存储键并更新返回值。
- 主题切换不改变 accent；系统主题变化不覆盖用户已选 accent。
- Layout 渲染日间 / 夜间主按钮与独立颜色箭头；点击箭头显示弹层，选择颜色后关闭并显示选中态。
- 键盘 `Escape`、外部点击和重新打开时的焦点行为可用。

### 视觉验证

- 桌面端侧栏：五种 accent 在 light / dark 下的按钮、选中导航、输入焦点和图表线条可辨识。
- 移动端顶部：分体控件、弹层不溢出，颜色选项触摸目标不小于 44px。
- 黑白灰日间：背景不为纯白，卡片和边框层级仍清楚。
- 语义正负、警告和信息色在所有 accent 下保持原有含义。

### 命令

```bash
npm test
npm run build
```

实现完成后启动本地应用，至少检查 Dashboard、Operation、History、Settings 四个页面在两种明暗和五种强调色下的可读性。

## 非目标

- 不引入第三方主题库或颜色选择器依赖。
- 不把灵感来源、色值说明或设计注释显示在生产环境的颜色弹层中。
- 不把正负收益、警告、信息状态改成随 accent 变化的颜色。
- 不重做导航、卡片布局、字体、数据模型或现有业务流程。
