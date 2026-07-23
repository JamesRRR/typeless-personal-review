---
name: personal-review
description: 读取本机 Typeless 语音记录，生成图示化的「Personal Review」个人复盘（总览/洞察/行动三个 tab）——注意力账单、注意力迁移、重复问题 & SOP、情绪/精力信号、未闭环问题追踪、决策记忆、项目动量、本周建议。产出一个可在浏览器打开的自包含 HTML 报告。全程在本地，不上传任何数据。Trigger on 个人复盘 / personal review / 周报 / 注意力账单 / 复盘我的记录 / typeless 复盘 / 分析我的 typeless / weekly review of my notes / attention bill.
metadata:
  short-description: 把本地 Typeless 语音记录变成图示化个人复盘
---

# Personal Review

把本机 Typeless 语音记录变成一份图示化个人复盘。全程在本地，**不上传任何数据**。

CLI 用 `npx typeless-review`（agent 无关，纯 Node stdlib）。本 skill 目录下随附一份
核心资产副本：`scripts/collect.py`、`references/insight-schema.json`、
`references/analysis-guide.md`、`assets/report-template.html`——供你查阅 schema 与
分析规则；实际采集/渲染走 CLI。

## 参数

用户可传时间范围（默认最近一周）：`week`（默认）/ `month`（30 天）/ `all`（全量），
或显式区间 `--since 2026-07-14 --until 2026-07-21`。

## 工作流

### 1. 采集
先 validate 再采集（写到一个临时目录 `./.review-tmp`）：
```
npx typeless-review collect --validate
npx typeless-review collect --range week --out-dir ./.review-tmp
```
产出 `./.review-tmp/corpus.jsonl`（带稳定索引 `i` 的记录）+ `stats.json`。
退出码：`0` ok / `2` 库缺失 / `3` schema 漂移 / `4` 区间内无记录——非 0 就停下并说明原因。

### 2. 读取
读 `stats.json` 全部 + `corpus.jsonl`（`all` 很大时按天分块读）。

### 3. 语义分析
按本 skill 的 `references/analysis-guide.md` 把 corpus 归纳成
`./.review-tmp/insights.json`，严格符合 `references/insight-schema.json`。
报告三个 tab：总览（账单/迁移/工具场景）、洞察（重复问题&SOP/情绪/未闭环）、
行动（决策/动量/建议）。铁律：
- 每条结论在 `refs` 引用真实 corpus 索引 `i`，不编造。
- `meta` 与 `tool_scene` 从 `stats.json` 拷；`tool_scene.available=false` 时省略整个字段。
- 空则给空数组。用中文写。

### 4. 生成报告
```
npx typeless-review render ./.review-tmp/insights.json --out ~/typeless-review.html --open
```
把路径给用户，简述最关键的 2–3 条洞察。报告是私人数据，只在本地。

## 说明
- 本 skill 与具体 agent 无关，统一走 `npx typeless-review` CLI，把报告写成本地自包含
  HTML；`--open` 直接用浏览器打开。有 Artifact/发布工具的 agent 也可另行渲染，效果一致。
- corpus 主要是中文口述。报告跟随系统深浅色主题。
- 前置：Typeless + Python 3 + Node。
