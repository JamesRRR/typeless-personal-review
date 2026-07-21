# Personal Review — Codex 指令

Codex：把本机 Typeless 语音记录变成一份图示化个人复盘。全程在本地，**不上传任何数据**。

核心文件在本目录（`~/.typeless-review/`）：`collect.py`、`insight-schema.json`、
`analysis-guide.md`、`report-template.html`。CLI 用 `npx typeless-review`。

## 流程

**1. 采集** —— 跑（默认最近一周，可 `--range month|all` 或 `--since/--until`）：
```
npx typeless-review collect --range week --out-dir ./.review-tmp
```
产出 `./.review-tmp/corpus.jsonl`（带索引 `i`）+ `stats.json`。
退出码 `0` ok / `2` 无库 / `3` 表结构变 / `4` 无记录——非 0 就停下说明原因。

**2. 读取** —— 读 `stats.json` 全部 + `corpus.jsonl`（`all` 很大时按天分块）。

**3. 语义分析** —— 按 `~/.typeless-review/analysis-guide.md` 把 corpus 归纳成
`./.review-tmp/insights.json`，严格符合 `~/.typeless-review/insight-schema.json`。
报告三个 tab：总览（账单/迁移/工具场景）、洞察（重复问题&SOP/情绪/未闭环）、
行动（决策/动量/建议）。铁律：
- 每条结论在 `refs` 引用真实 corpus 索引 `i`，不编造。
- `meta` 与 `tool_scene` 从 `stats.json` 拷；`tool_scene.available=false` 时省略整个字段。
- 空则给空数组。用中文写。

**4. 生成报告** ——
```
npx typeless-review render ./.review-tmp/insights.json --out ~/typeless-review.html --open
```
把路径给用户，简述最关键的 2–3 条洞察。报告是私人数据，只在本地。

## 说明
- Codex 无 Claude 的 Artifact 发布工具——本工具统一写本地 HTML 文件，`--open` 直接用
  浏览器打开，效果一致。
- corpus 主要是中文口述。报告跟随系统深浅色主题。
