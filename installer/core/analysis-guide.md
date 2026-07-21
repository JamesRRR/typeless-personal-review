# Analysis guide — per-section rubric

The semantic pass reads `corpus.jsonl` (one dictated record per line, each with a
stable `i` index) and produces one `insights.json` object conforming to
`insight-schema.json`. This file is the rubric for each section. **Cite `corpus`
indices in every `refs` array** so claims are traceable.

General principles:
- The corpus is the user's own voice — dictated thoughts, mostly Chinese, dev/
  business oriented. Read for *themes and intent*, not surface keywords.
- Cluster by topic, not by wording. "小程序流量" and "怎么给 mini-program 导量" are
  the same theme.
- Be concrete and specific. "研究了一些东西" is useless; name the actual thing.
- Prefer fewer, higher-signal items over exhaustive lists. A section with 4 sharp
  items beats one with 12 vague ones.
- Never invent. If a section has no real signal in the corpus, return an empty
  array / minimal object — the template renders a graceful "无数据".

## meta
Copy `label`, `range`, `total_records`, `total_minutes` from `stats.json`.
Write `title` as `Personal Review — <label>` (e.g. "Personal Review — 2026 W30").
`generated_note`: one sentence capturing what this period was *about*.

## 1. attention_bill
Cluster all records into 4–7 topics; estimate each topic's share of attention as a
percent (by record volume weighted by substance — a long substantive record counts
more than a one-liner). Percentages sum to ~100. `note` optional (one phrase).

## 2. attention_migration
Compare the earlier vs later part of the period. What was fading, what was rising,
what shifted into what. `nodes`: give each topic an `id` + human `label`. `flows`:
`{from, to, weight}` where weight ~ how strong the shift is (1–10). Also fill
`narrative` with 2–5 short phrases like "旅行规划 → 明显降温". If there's no real
migration (short period, single focus), leave flows empty and just use narrative.

## 3. recurring_questions
Open questions the user asked *repeatedly* without reaching a conclusion. `count` =
how many distinct records touch it. Only include count ≥ 2. Phrase as the question
itself ("小程序如何低成本获取流量").

## 4. decisions
Concrete decisions made ("决定优先验证搜索型小程序"). Look for commitment language:
"决定/就这样/优先/先做/不做/暂不". One decision per item.

## 5. project_momentum
Named projects/initiatives and their trajectory this period. `state` ∈
rising|steady|stalled. `rising`: increasing mentions + forward motion. `stalled`:
mentioned earlier, gone quiet, or explicitly blocked. `note`: one phrase of why.

## 6. sops
Repeated workflows worth codifying into a reusable procedure. If the user keeps
doing the same multi-step thing (e.g. "验证一个新小程序" always follows the same
steps), surface it as a candidate SOP with a one-line `why`.

## 7. recommendations
Three buckets, actionable and specific to this period:
- `complete`: things in-flight worth finishing.
- `stop`: things consuming attention with low return.
- `decide`: open decisions to force this week.

## 8. emotion_energy
Infer tone from wording — this is reflective, not clinical. `overall`: one-line read.
`signals`: `{signal, topic, note}` where signal ∈ frustration|excitement|hesitation|
confidence|fatigue. Ground each in wording (e.g. repeated "我不确定" → hesitation;
"这个太棒了/终于" → excitement; "又炸了/还是不行" → frustration).

## open_loops（未闭环问题追踪）
Open questions/ideas the user RAISED but never followed up on or reached a
conclusion about — so good thinking isn't forgotten. Distinct from
`recurring_questions` (asked repeatedly): an open loop may be asked only once yet
left dangling. Phrase `item` so future-you knows what to pick up. `raised` = when/
where it came up. `status` ∈ open (未动) | blocked (被卡) | waiting_on_me (等我拍板)
| needs_research (需先调研). Rank by importance. Cite `refs`.

> 已按用户要求从报告移除「活跃节律 (rhythm)」与「想法→行动 (idea_to_action)」两节
> ——不要再产出它们。

## tool_scene — DETERMINISTIC, OPTIONAL
Only include this object when `stats.tool_scene.available` is `true`. Copy `apps`
and `web_domains` from `stats.json`. Omit the entire `tool_scene` object when
unavailable (v2-only ranges) so the template hides the section. `note` optional.
