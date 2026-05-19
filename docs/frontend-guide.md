# 前端界面修改指南

网页端主要由 3 个文件组成：

| 文件 | 作用 |
| --- | --- |
| `apps/web/index.html` | 页面结构、输入框、结果容器 |
| `apps/web/styles.css` | 视觉风格、颜色、间距、响应式布局 |
| `apps/web/main.mjs` | 读取输入、调用计算核心、渲染结果 |

## 常见修改位置

- 改标题、文案、输入项：编辑 `apps/web/index.html`。
- 改颜色、卡片样式、背景、按钮感：编辑 `apps/web/styles.css` 顶部的 `:root` 变量。
- 改结果展示字段、提示语：编辑 `apps/web/main.mjs` 中的 `renderStatusBanner`、`renderNinja`、`renderScroll`。
- 改计算公式：编辑 `packages/core/src/index.mjs`，并同步测试。

## 视觉方向

当前网页端采用原创的“火影手游气质”界面：

- 深色战斗面板承载全局进度。
- 卷轴纸面承载具体计算卡。
- 红、金、青绿用于强调结果和资源数值。
- 结果提示优先级最高，用户先看到“能不能补出来”。

不要直接复制游戏截图、官方 UI 图标或角色立绘到项目里，避免素材版权问题。
