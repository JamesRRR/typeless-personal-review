---
description: 生成图示化的 Typeless 语音记录个人复盘（总览/洞察/行动三个 tab）
argument-hint: "[week|month|all | --since YYYY-MM-DD --until YYYY-MM-DD]"
---

运行 **personal-review** skill，为用户生成一份图示化的 Typeless 个人复盘。

参数（`$ARGUMENTS`，为空则默认最近一周）：
- 空 / `week` → 最近一周
- `month` → 最近 30 天
- `all` → 全量
- `--since YYYY-MM-DD --until YYYY-MM-DD` → 显式区间

按本项目 `personal-review` skill 的 SKILL.md 执行完整四步：
1. `npx typeless-review collect --validate` 再 `npx typeless-review collect --range <范围> --out-dir ./.review-tmp`
2. 读 `stats.json` + `corpus.jsonl`
3. 按 skill 的 `references/analysis-guide.md` 归纳成符合 `references/insight-schema.json` 的 `insights.json`
4. `npx typeless-review render ./.review-tmp/insights.json --out ~/typeless-review.html --open`

把报告路径给用户，并简述最关键的 2–3 条洞察。数据全程在本地，不上传。
