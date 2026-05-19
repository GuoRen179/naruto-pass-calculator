# 项目开发规范

## 项目定位

本项目用于计算火影忍者手游忍法帖往期 S 忍碎片、秘卷碎片、兑换币和买等级成本。

目标用户是不会手算忍法帖补片成本的新手玩家，因此代码和界面都应优先保证清晰、可靠、易验证。

## 仓库结构

```text
apps/
  web/            # 网页端
  miniprogram/    # 微信小程序端
packages/
  core/           # 共享计算规则和测试
docs/
  rules.md        # 游戏规则整理
```

## 代码规范

### JavaScript

- 使用 ES Modules。
- 常量使用 `UPPER_SNAKE_CASE`。
- 函数、变量使用 `camelCase`。
- 类型含义明确，避免使用含糊命名，例如 `data`、`temp`、`result2`。
- 单行尽量不超过 120 个字符。
- 条件和循环即使只有一行，也优先使用大括号。
- 计算规则必须写在 `packages/core`，网页和小程序只负责输入与展示。
- 业务常量必须命名，不要在计算公式里散落魔法数字。
- 不在核心计算中直接读写 DOM、网络、存储或平台 API。
- 抛错信息应能定位问题，例如未知忍者 ID、非法档位等。

### 微信小程序

- 页面文件保持 `index.js`、`index.wxml`、`index.wxss`、`index.json` 配套。
- 计算逻辑不要写死在页面事件里，优先复用共享核心。
- 表单字段命名与核心计算入参保持一致。
- 样式类名使用语义化短横线命名，例如 `result-panel`、`summary-card`。

### CSS

- 样式按页面结构从外到内组织。
- 避免无法复用的随机类名。
- 控件尺寸、间距和颜色使用稳定值，避免依赖内容撑开核心布局。
- 移动端必须检查文字不溢出、不遮挡、不重叠。

## 测试要求

- 核心公式必须有测试。
- 新增或修改游戏规则时，先补测试再改实现。
- 至少覆盖：
  - 198 元传说版基础兑换币。
  - 非 198 档无兑换资格。
  - 老 S 忍前 80 片、后 20 片分段计价。
  - 新 S 忍统一 15 币/片。
  - 秘卷整包兑换向上取整。
  - 50 级买等级包限购 2 次。

## 工作方式

- 优先保持小步提交式修改，避免一次性大范围重构。
- 规则不确定时，先写入 `docs/rules.md` 的待确认部分，再实现。
- 任何平台界面都不得复制一份独立计算公式。
- 发现规则与代码不一致时，以规则文档和测试为准，先同步三者。
# Project Skills

- Project-local skills live under `.agents/skills/`.
- Use `.agents/skills/kb-retriever/` when answering questions from local rule documents, PDFs, Excel sheets, or the `knowledge/` directory.
- Keep `knowledge/data_structure.md` updated when adding new source material so the retriever can locate relevant files quickly.
