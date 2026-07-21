---
name: personal-review
version: 1.0.0-redskill
description: >
  Use when the user wants to review their own recent focus, decisions, recurring
  questions, and open loops from their local Typeless voice-dictation history —
  个人复盘 / personal review / 周报 / 注意力账单 / 复盘我的记录 / typeless 复盘.
  This is a thin redskill pointer to the complete source package at
  https://github.com/JamesRRR/typeless-personal-review
---

# Personal Review · Typeless 语音记录复盘

把本机 [Typeless](https://typeless.now/) 永久保存的语音口述记录，变成一份图示化的个人
复盘报告（3 tab：总览 / 洞察 / 行动）——注意力账单、注意力迁移、重复问题 & SOP、
情绪信号、未闭环问题追踪、决策记忆、项目动量、本周建议。

通用工具，支持 Claude Code / Codex / 任意 AI agent。

Source: https://github.com/JamesRRR/typeless-personal-review

## Before Use

这是一个瘦身指针。完整 skill 包含脚本、模板、schema、reference 文档——如果当前副本
缺少这些文件，**不要凭记忆重建**，先安装完整包：

```bash
npx typeless-personal-review install
```

（会自动检测 Claude / Codex 并装对应适配层；也可 `--agent claude|codex|generic`。）

或者克隆源仓库手动安装：

```bash
git clone https://github.com/JamesRRR/typeless-personal-review.git
cp -R typeless-personal-review/skills/personal-review ~/.claude/skills/   # Claude Code
```

Do not reconstruct missing Python scripts, HTML templates, JSON schema, or
reference files from memory. If they are missing, stop and install above.

## Use

装好完整包后：

- **Claude Code**：说 `/personal-review`（或「帮我做这周的复盘」）。
- **Codex / 其他 agent**：读 `~/.typeless-review/AGENTS.md`（或 `PROMPT.md`）按步骤跑。

底层三步（任何 agent 都能调）：

```bash
typeless-personal-review collect --range week          # 读本地库 → corpus + stats
# agent 读 corpus，按 analysis-guide 出 insights.json
typeless-personal-review render insights.json --open   # → 自包含 HTML 报告
```

产出一个自包含的图示化 HTML 报告。全程在你自己电脑上跑，语音数据不上传，报告私有。

## Rules

- 唯一源仓库：https://github.com/JamesRRR/typeless-personal-review
- 一行安装：`npx typeless-personal-review install`
- clone fallback：`git clone …/typeless-personal-review.git`
- 缺文件就停下安装，绝不凭记忆重建脚本/模板/schema。
