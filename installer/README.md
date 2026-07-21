# typeless-personal-review

把 [Typeless](https://typeless.now/) 本地语音记录变成一份图示化的个人复盘。

**通用工具，不绑定某个 AI**——支持 Claude Code、Codex，以及任意能读写文件、跑命令的 agent。

## 安装

```bash
npx typeless-personal-review install
```

自动检测你在用 Claude 还是 Codex，装对应的适配层。也可以指定：

```bash
npx typeless-personal-review install --agent claude   # Claude Code
npx typeless-personal-review install --agent codex    # Codex
npx typeless-personal-review install --agent generic  # 任意 agent（给你一份指令文档）
```

## 用法

**Claude Code**：装完说一句 `/personal-review`（或「帮我做这周的复盘」）。

**Codex / 其他 agent**：让它读装好的指令文档（`~/.typeless-review/AGENTS.md` 或
`PROMPT.md`），按里面 4 步跑。

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
