# typeless-personal-review

把 [Typeless](https://typeless.now/) 本地语音记录变成一份图示化的个人复盘。

**通用工具，不绑定某个 AI**——支持 Claude Code、Codex，以及任意能读写文件、跑命令的 agent。

## 安装

**装进当前项目**——`cd` 到你想用它的项目目录再运行：

```bash
cd your-project
npx typeless-personal-review install
```

一条命令搞定，不问 agent。skill 会同时装进**当前项目**的三个 skill 目录，
再给 Claude Code / Codex 各装一个 `/personal-review` slash command——

| 装的东西 | 位置 | 谁用它 |
|---|---|---|
| skill | `./.claude/skills/personal-review/` | Claude Code |
| skill | `./.codex/skills/personal-review/` | Codex、Kimi CLI（也 fallback 读这里） |
| skill | `./.agents/skills/personal-review/` | GLM / MiniMax 及其它兼容 runtime 的通用约定 |
| slash 命令 | `./.claude/commands/personal-review.md` | Claude Code 的 `/personal-review` |
| slash 命令 | `./.codex/commands/personal-review.md` | Codex 的 `/personal-review` |

三处装同一份 skill，所以无论你用哪个 agent 都能读到。它们跟随项目走，**不碰你的家目录**。
换一个项目要用，就在那个项目里再装一次。

> 装的是隐藏目录（`.` 开头），Finder 默认看不见——`ls -la` 或在编辑器里可以看到。

## 用法

在装了它的那个项目里打开你的 agent，两种触发方式都行：

- **直接说**「帮我做这周的个人复盘」——skill 会自动触发，**任何 agent 都行**。
- **用 slash 命令** `/personal-review`（Claude Code / Codex）。

> skill（自然语言自动触发）和 slash command（显式 `/` 命令）是两套机制。我们两个都装了，
> 所以你两种方式都能用。如果只见到其中一种，重启一次 agent 会话让它重新扫描本项目即可。

底层就三个命令，任何 agent 都能调：

```bash
npx typeless-personal-review collect --range week   # 读本地库 → corpus + stats
# （agent 读 corpus，按 analysis-guide 出 insights.json）
npx typeless-personal-review render insights.json --open   # → 自包含 HTML 报告
```

报告是自包含的 HTML 文件，用浏览器打开即可。全程在你自己电脑上跑，语音数据不上传。

## 前置

Typeless 桌面版（有一些语音记录）· Node 16+ · Python 3（系统自带即可）

- 源码 & 说明：https://github.com/JamesRRR/typeless-personal-review
- License: MIT
