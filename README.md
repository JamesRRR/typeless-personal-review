# Personal Review · Typeless 语音记录复盘 Skill

把 [Typeless](https://typeless.now/) 永久保存在本地的全部语音口述记录，一键变成一份**图示化的个人复盘报告**——看清你最近一段时间的注意力去了哪、在反复纠结什么、做了哪些决定、哪些想法悬而未决。

这是一个 [Claude Code](https://claude.com/claude-code) Skill。

<p align="center">
  <img src="docs/preview.png" alt="Personal Review 报告预览" width="720">
</p>

## 它能给你什么

报告分三个 tab：

- **总览** — 注意力账单（各主题占比）· 注意力迁移（关注点从什么流向什么）· 工具/场景分布
- **洞察** — 重复问题 & 可沉淀 SOP · 情绪/精力信号 · 未闭环问题追踪（别让好想法被遗忘）
- **行动** — 决策记忆 · 项目动量（上升/平稳/停滞）· 本周建议（完成/停止/决策）

所有洞察都由 AI 阅读你的口述内容语义聚类得出，并引用真实记录；活跃统计与工具分布则是确定性计算，不会被"脑补"。

## 安装

**方式一：装 `.skill` 包（推荐）**

下载 [`personal-review.skill`](personal-review.skill)，在 Claude Code 里安装即可。

**方式二：手动放到 skills 目录**

```bash
git clone https://github.com/JamesRRR/typeless-personal-review.git
cp -R typeless-personal-review/skills/personal-review ~/.claude/skills/
```

> 前置：本机装了 Typeless 桌面版并已有一些语音记录（数据在
> `~/Library/Application Support/Typeless/typeless.db`）；Python 3（用系统自带的即可，无第三方依赖）。

## 使用

在 Claude Code 里直接说，或用 slash command：

```
/personal-review            # 默认最近一周
/personal-review month      # 最近一个月
/personal-review all        # 全量
```

也可以用自然语言：「帮我做一下这周的 personal review」「复盘一下我全部的 typeless 记录」。

产出一个可分享的图示化 HTML 报告 + 一份 markdown 镜像。报告是你的私人数据，默认私有，是否分享由你决定。

## 工作原理

```
Typeless SQLite 库
      │  collect.py（只读，唯一的 DB 读取者，纯 stdlib）
      ▼
corpus.jsonl（清洗去重的口述语料）+ stats.json（确定性聚合）
      │  Claude 按 references/ 的规则做语义聚类
      ▼
insights.json（固定 schema，10+ 节洞察）
      │  注入 assets/report-template.html（数据驱动、自包含、跟随明暗主题）
      ▼
图示化 HTML 报告 + markdown 镜像
```

- **collector 是唯一读库的地方**，只读打开，不与运行中的 Typeless 争锁。
- **语义与渲染解耦**：`insight-schema.json` 是固定接口，改版式只动模板，不动数据逻辑。
- **确定性数据不脑补**：工具/场景分布等直接来自 SQL 聚合。

## 目录结构

```
skills/personal-review/
├── SKILL.md                       # 工作流与触发词
├── scripts/collect.py             # 确定性 collector（纯 stdlib）
├── assets/report-template.html    # 自包含、跟随主题的 3-tab 报告模板
├── references/
│   ├── insight-schema.json        # 洞察数据的固定接口
│   └── analysis-guide.md          # 每节的语义聚类规则
└── evals/evals.json               # 测试用例
```

## 隐私

你的 Typeless 记录是高度私人的数据。这个 Skill **完全在本地运行**，collector 只读你自己机器上的库；生成的报告是私有的，只有你主动分享才会公开。仓库里不包含任何个人数据。

## License

MIT
