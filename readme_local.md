---
name: "Typeless Personal Review"
description: "把 Typeless 本地语音记录变成图示化个人复盘的 Claude Code Skill"
github: "https://github.com/JamesRRR/typeless-personal-review.git"
category: "cli"
status: "active"
icon: "scroll-text"
version: "1.0.0"
tech:
  - "Claude Code Skill"
  - "Python (stdlib)"
  - "HTML/CSS/JS (self-contained)"
install: "cp -R skills/personal-review ~/.claude/skills/"
launch:
  type: "custom"
  command: "/personal-review"
  port: null
tags:
  - "typeless"
  - "personal-review"
  - "claude-code-skill"
  - "voice-transcript"
created: "2026-07-21"
updated: "2026-07-21"
---

# Typeless Personal Review

Claude Code Skill：读取本机 Typeless 语音口述记录，生成图示化的个人复盘报告
（3 tab：总览 / 洞察 / 行动）。公开 README 见 `README.md`。

## 本地开发

- Skill 源码在 `skills/personal-review/`（同时装在 `~/.claude/skills/personal-review/`）。
- collector：`python3 skills/personal-review/scripts/collect.py --validate`
- 打包 `.skill`：用 skill-creator 的 `python -m scripts.package_skill`，
  打包前需从 SKILL.md frontmatter 临时去掉 `user-invocable`（marketplace 校验不认，
  但本地需要它来注册 `/personal-review` slash command）。
- 数据源：`~/Library/Application Support/Typeless/typeless.db`（两表
  `history` 旧 / `history_v2` 活跃；有 6/4–7/14 空档）。

## 小红书宣发素材

在 `docs/xiaohongshu/`：`copy.md`（文案）+ 竖屏海报组图。
