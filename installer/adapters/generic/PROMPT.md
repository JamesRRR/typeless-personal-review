# Personal Review — 给任意 AI agent 的指令

把这份文档贴给任何能读写本地文件、能跑终端命令的 AI agent（Cursor / Cline / aider /
ChatGPT 桌面版 / Codex …），它就能帮用户把 Typeless 语音记录变成一份图示化复盘。

你（agent）的任务：走完下面 4 步，最后交给用户一个 HTML 报告文件。

数据源是本机 Typeless 的 SQLite 库，全程在本地，**不要上传任何数据**。

---

## 环境

本工具的核心文件装在 `~/.typeless-review/`：
- `collect.py` — 唯一读数据库的脚本（纯 Python stdlib）
- `insight-schema.json` — 你要产出的 insights.json 的固定结构
- `analysis-guide.md` — 每一节洞察怎么归纳的规则
- `report-template.html` — 报告模板（数据驱动）

命令行工具 `typeless-review` 通过 `npx typeless-review` 或全局安装后可用。

---

## 第 1 步 · 采集数据

跑（默认最近一周；可选 `--range month` / `--range all`，或 `--since/--until`）：

```
npx typeless-review collect --range week --out-dir <某个临时目录>
```

它会在该目录写出两个文件：
- `corpus.jsonl` — 每行一条口述记录，带稳定索引 `i`
- `stats.json` — 确定性聚合（活跃统计、工具/场景分布等）

退出码：`0` 正常 / `2` 找不到库 / `3` 表结构变了 / `4` 该区间没记录。
非 0 就把原因告诉用户，别继续编。

---

## 第 2 步 · 读取

读完 `stats.json` 和 `corpus.jsonl`。如果 `all` 数据很多（>~6k token），按天分块读。

---

## 第 3 步 · 做语义分析，产出 insights.json

**这一步是你的核心工作。** 按 `~/.typeless-review/analysis-guide.md` 的规则，把 corpus
归纳成一个 `insights.json`，**严格符合 `~/.typeless-review/insight-schema.json`**。

报告分三个 tab（模板负责排版，你只产数据）：
- **总览**：注意力账单 + 注意力迁移 + 工具/场景分布
- **洞察**：重复问题 & 可沉淀 SOP + 情绪/精力信号 + 未闭环问题追踪
- **行动**：决策记忆 + 项目动量 + 本周建议

铁律：
- 每条语义结论在 `refs` 里引用真实的 corpus 索引 `i`，别编。
- `meta` 的 label/range/total 从 `stats.json` 拷。
- 工具/场景（`tool_scene`）直接从 `stats.json` 拷；当 `stats.tool_scene.available` 为
  `false` 时**整个 `tool_scene` 字段省略**（模板会自动隐藏该节）。
- 某节没有真实信号就给空数组，别硬凑。
- 用中文写洞察。

把结果写到 `<临时目录>/insights.json`。

---

## 第 4 步 · 生成报告

```
npx typeless-review render <临时目录>/insights.json --out ~/typeless-review.html --open
```

它把你的 insights.json 注入模板，写出一个自包含的 HTML 文件并用浏览器打开。
报告是用户的私人数据，只在本地，是否分享由用户决定。

把文件路径告诉用户，并简述本期最关键的 2–3 条洞察（别整篇复述）。

---

## 说明

- corpus 主要是中文口述，可能夹杂英文/命令。
- 报告跟随系统深色/浅色主题。
- 想改版式改 `report-template.html`；语义接口固定在 `insight-schema.json`。
