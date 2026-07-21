# AGENTS.md — Typeless Personal Review

面向「访问本仓库的其他 Claude session」的入口文档。

## 身份

一个 Claude Code Skill，读取本机 Typeless 语音口述记录，生成图示化的个人复盘报告
（3 tab：总览 / 洞察 / 行动）。Skill 的完整工作流与触发词在
[`skills/personal-review/SKILL.md`](../skills/personal-review/SKILL.md)——那是权威来源，先读它。

## Quick facts

- **数据源**：`~/Library/Application Support/Typeless/typeless.db`（SQLite，只读）。
  两张表 `history`（旧，有 app 上下文）/ `history_v2`（活跃，无 app 上下文），存在
  6/4–7/14 数据空档。
- **唯一 DB 读取者**：`skills/personal-review/scripts/collect.py`（纯 stdlib）。
  不要自己写 SQL 直连库。
- **依赖**：Python 3（无第三方包）。渲染产物是自包含 HTML（无外部资源）。

## 调用

- Slash command：`/personal-review [week|month|all]`，或自然语言触发。
- collector CLI：`python3 skills/personal-review/scripts/collect.py --validate`；
  `--range week|month|all`、`--since/--until`、`--limit N`、`--out-dir`。
- 退出码：`0` ok / `2` 库缺失 / `3` schema 漂移 / `4` 区间内无记录。

## 数据接口（改动须遵守）

- collector 产出 `corpus.jsonl`（带稳定 `i` 索引）+ `stats.json`（确定性聚合）。
- 语义层产出 `insights.json`，**严格符合**
  [`references/insight-schema.json`](../skills/personal-review/references/insight-schema.json)。
- 模板 `assets/report-template.html` 是数据驱动的：只替换 `#report-data` JSON blob。
- **铁律**：确定性数据（tool_scene、活跃统计）直接来自 `stats.json`，不得脑补；
  `stats.tool_scene.available=false` 时省略 `tool_scene` 字段。

## Self-update

改动了用户可见的表面（CLI 参数、schema、tab 结构、触发词）时，请在同一次提交里
同步更新本文件与 `README.md`、`skills/personal-review/SKILL.md`。
