# 火影忍者手游忍法帖补全计算器

用于计算《火影忍者手游》忍法帖往期 S 忍碎片、秘卷碎片、兑换币需求和买等级成本。

## 功能

- 计算 S 忍补片所需兑换币。
- 计算忍法帖秘卷升级所需碎片包和兑换币。
- 按当前忍法帖等级、经验、剩余任务和当前兑换币判断本期能否补出。
- 推荐买等级方案，并标注 198 档位 50 级特惠包每期限购两次。
- 核心规则放在 `packages/core`，网页端和小程序端复用同一套计算逻辑。

## 本地运行

```powershell
npm run start:web
```

打开：

```text
http://localhost:5173/
```

## 测试

```powershell
npm test
```

## 项目结构

```text
apps/
  web/            # 网页端
  miniprogram/    # 微信小程序端
packages/
  core/           # 共享计算规则和测试
docs/
  rules.md        # 游戏规则整理
```
