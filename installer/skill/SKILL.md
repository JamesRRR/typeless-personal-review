---
name: personal-review
description: 读取本地 Typeless 语音记录，生成图示化的「Personal Review」个人复盘（Crextio 仪表盘风格，分总览/洞察/行动三个 tab）——注意力账单、注意力迁移、重复问题 & SOP、情绪/精力信号、未闭环问题追踪、决策记忆、项目动量、本周建议。产出一个可分享的 HTML Artifact + markdown 镜像。Trigger on 个人复盘 / personal review / 周报 / 注意力账单 / 复盘我的记录 / typeless 复盘 / 分析我的 typeless / weekly review of my notes / attention bill.
user-invocable: true
allowed-tools: Read, Write, Bash(python3:*), Glob, Artifact
---

# Personal Review

从本地 Typeless 库读取用户口述记录，做语义复盘，产出图示化 HTML 报告。

数据源：`~/Library/Application Support/Typeless/typeless.db`（SQLite，两张表
`history` 旧 / `history_v2` 活跃）。**collector 脚本是唯一的 DB 读取者**——不要自己写
SQL 直连库；所有洞察都从 collector 产出的两个文件工作。

## 参数

用户可传时间范围（默认最近一周）：
- 无参数 或 `week` → 最近一周（对应 `<年>-W<周>` 标签）
- `month` → 最近 30 天
- `all` → 全量
- 显式区间 → `--since 2026-07-14 --until 2026-07-21`
- `--limit N` → 只取最新 N 条（**小样本对齐测试**用）

## 工作流

### 1. 健康检查 + 运行 collector
先跑一次 validate 确认库可读、schema 未漂移：
```
python3 ~/.claude/skills/personal-review/scripts/collect.py --validate
```
再运行 collector（把输出写到本 session 的 scratchpad 目录 `<OUT>`）：
```
python3 ~/.claude/skills/personal-review/scripts/collect.py --range week --out-dir <OUT>
```
它产出 `<OUT>/corpus.jsonl`（带稳定 `i` 索引的记录）和 `<OUT>/stats.json`
（确定性聚合）。stdout 是一行 JSON 摘要。

退出码：`0` ok / `2` 库缺失 / `3` schema 漂移 / `4` 区间内无记录。非 0 时向用户
说明原因，不要继续。

### 2. 读取
读 `stats.json` 全部，读 `corpus.jsonl`。若 `all` 规模很大（>~6k token），按天分块
阅读后再综合；`week`/`month` 通常可一次读完。

### 3. 语义分析 → insights.json
按 `references/analysis-guide.md` 的每节规则，把 corpus 聚类成一个
`insights.json` 对象，**严格符合 `references/insight-schema.json`**。

报告分 3 个 tab 呈现（模板负责布局，你只产数据）：
- **总览**：注意力账单（甜甜圈）+ 注意力迁移（Sankey）+ 工具/场景分布（可选）
- **洞察**：重复问题 & 可沉淀 SOP（合并一卡）+ 情绪/精力信号 + 未闭环问题追踪
- **行动**：决策记忆 + 项目动量 + 本周建议
- 顶部大数字概览由模板自动算（主题数=账单条目数、决策数=decisions 长度、口述条数、
  分钟）——你无需单独产出。

要点：
- 每条语义结论在 `refs` 里引用真实的 `corpus` 索引 `i`。
- `meta` 的 label/range/total 从 `stats.json` 拷贝。
- **`open_loops`（未闭环）**：识别提过但没继续跟进/未得结论的开放问题，别让好想法被
  遗忘；与「重复问题」区分（后者是反复问，前者可能只问一次却悬着）。`status` ∈
  open/blocked/waiting_on_me/needs_research。
- **tool_scene**：当 `stats.tool_scene.available` 为 `false`（v2-only 区间）时**整个
  字段省略**，模板自动隐藏；为 `true` 时把 apps/web_domains 直接从 `stats.json` 拷贝，
  禁止肉眼数或重算。
- **不产出 rhythm / idea_to_action**（已按用户要求从报告移除）。
- 不要编造。某节无真实信号就给空数组，模板会渲染「无数据」。

把 `insights.json` 写到 `<OUT>/insights.json`。

### 4. 生成 HTML Artifact + markdown 镜像
- 读模板 `assets/report-template.html`，把其中
  `<script id="report-data" type="application/json"> ... </script>` 之间的占位 JSON
  **整体替换**为第 3 步的 `insights.json` 内容，写成 `<OUT>/report.html`。
  模板其余部分（CSS/渲染 JS）原样保留——它是数据驱动的，只需替换这一块。
- 用 Artifact 工具发布 `<OUT>/report.html`：
  - `favicon`: `"📿"`（保持稳定，除非主题大改）
  - `description`: 一句话，如「2026 W30 的个人复盘：注意力账单、迁移与本周建议」
  - 标题由模板 `<title>` 决定。
- 同时写一份 markdown 镜像 `<OUT>/report.md`——把 10（或 11）节以文字+简单列表呈现，
  给终端阅读/归档用。结构对应报告各节。

### 5. 交付
把 Artifact 链接给用户，并在终端简述本期最关键的 2–3 条洞察（不是整篇复述）。

## 测试（先小样本对齐，再全量）
- **对齐**：`--limit 40` 跑通全链路，确认 output 形状（schema 合规、模板渲染、明暗
  主题、无外部资源引用）后交用户确认。
- **全量**：`--range week`（当前约 607 条）全跑，再按需 `month`/`all`。
  `insight-schema.json` 是固定接口，全量只变数据量，模板无需返工。

## 说明
- corpus 主要是中文口述，可能含少量英文/命令。语义分析用中文输出洞察。
- 报告是私密的个人数据；Artifact 默认私有，是否分享由用户决定。
- 报告分 3 tab；模板是数据驱动的，改版式改 `assets/report-template.html` 即可，
  语义数据接口固定在 `references/insight-schema.json`。
