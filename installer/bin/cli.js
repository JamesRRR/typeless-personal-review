#!/usr/bin/env node
/**
 * typeless-review — 通用 CLI
 *
 * 与具体 agent 无关。三个子命令：
 *   collect   读 Typeless 本地库 → 出 corpus.jsonl + stats.json（调 core/collect.py）
 *   render    把 insights.json 注入模板 → 写出自包含 HTML 报告（任何 agent 都能用，
 *             不依赖 Claude 的 Artifact 工具）
 *   install   把某个 agent 的适配层装到对应位置（claude / codex / generic）
 *
 * 纯 Node stdlib，无第三方依赖。不联网、不收集任何数据。
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CORE = path.join(ROOT, "core");
const ADAPTERS = path.join(ROOT, "adapters");

const C = {
  g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", dim: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m",
};

function log(s) { process.stdout.write(s + "\n"); }
function die(s) { process.stderr.write(`${C.r}${s}${C.x}\n`); process.exit(1); }

function pythonBin() {
  for (const bin of ["python3", "python"]) {
    const r = spawnSync(bin, ["--version"], { stdio: "ignore" });
    if (r.status === 0) return bin;
  }
  die("找不到 Python 3。请先安装（macOS 自带，或 brew install python）。");
}

/* ---------- collect ---------- */
function collect(argv) {
  const py = pythonBin();
  const script = path.join(CORE, "collect.py");
  const args = [script, ...argv];
  const r = spawnSync(py, args, { stdio: "inherit" });
  process.exit(r.status == null ? 1 : r.status);
}

/* ---------- render ---------- */
function render(argv) {
  const opts = parseFlags(argv, { insights: "--insights", out: "--out", open: "--open" });
  const insightsPath = opts.insights || argv.find((a) => a.endsWith(".json"));
  if (!insightsPath) {
    die("用法：typeless-review render <insights.json> [--out report.html] [--open]");
  }
  if (!fs.existsSync(insightsPath)) die(`找不到文件：${insightsPath}`);

  let data;
  try { data = JSON.parse(fs.readFileSync(insightsPath, "utf8")); }
  catch (e) { die(`insights.json 不是合法 JSON：${e.message}`); }

  const tpl = fs.readFileSync(path.join(CORE, "report-template.html"), "utf8");
  const blob = JSON.stringify(data, null, 2);
  const re = /(<script id="report-data" type="application\/json">)([\s\S]*?)(<\/script>)/;
  if (!re.test(tpl)) die("模板缺少 #report-data 注入点（core/report-template.html 损坏？）");
  const html = tpl.replace(re, (_m, a, _b, c) => `${a}\n${blob}\n${c}`);

  const outPath = path.resolve(
    opts.out || path.join(os.homedir(), "typeless-review.html")
  );
  fs.writeFileSync(outPath, html, "utf8");
  log(`${C.g}✓ 报告已生成${C.x} ${outPath}`);
  log(`${C.dim}用浏览器打开它即可查看。${C.x}`);

  if (opts.open) openInBrowser(outPath);
}

function openInBrowser(p) {
  const url = "file://" + p;
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawnSync(cmd, args, { stdio: "ignore" });
}

/* ---------- install ---------- */

// 项目根 = 运行 npx 时所在的目录。skill 装进项目内，不碰家目录。
const PROJECT = process.cwd();

// 一键装到当前项目的三个 skill 目录，覆盖主流 agent：
//   .claude/skills/  — Claude Code
//   .codex/skills/   — Codex（Kimi 等也会 fallback 读这里）
//   .agents/skills/  — 中立通用约定（Kimi generic group、GLM/MiniMax 兼容 runtime 等）
// 不弹菜单、不问 agent：同一份 skill 铺到三处，任何 agent 都能读到。
const SKILL_DIRS = [
  { dir: ".claude", who: "Claude Code" },
  { dir: ".codex", who: "Codex / Kimi" },
  { dir: ".agents", who: "GLM / MiniMax 及其它兼容 agent" },
];

function install(argv) {
  parseFlags(argv, {}); // 兼容旧的 --agent 等 flag：忽略，一律全装
  log(`\n${C.b}📿 Personal Review${C.x}`);
  log(`${C.dim}目标项目：${PROJECT}${C.x}\n`);

  log(`${C.dim}skill：${C.x}`);
  for (const t of SKILL_DIRS) {
    const dst = path.join(PROJECT, t.dir, "skills", "personal-review");
    layoutSkill(dst);
    log(`  ${C.g}✓${C.x} ${path.join(t.dir, "skills", "personal-review")}  ${C.dim}(${t.who})${C.x}`);
  }

  // slash command：只有 Claude / Codex 有 commands 目录约定（.agents 没有）。
  log(`${C.dim}slash command（/personal-review）：${C.x}`);
  for (const dir of [".claude", ".codex"]) {
    const cmdDst = path.join(PROJECT, dir, "commands", "personal-review.md");
    fs.mkdirSync(path.dirname(cmdDst), { recursive: true });
    fs.copyFileSync(path.join(ADAPTERS, "command", "personal-review.md"), cmdDst);
    log(`  ${C.g}✓${C.x} ${path.join(dir, "commands", "personal-review.md")}`);
  }

  log(`\n${C.g}已装到当前项目。${C.x}`);
  log(`用法：在这个项目里打开你的 agent，可以——`);
  log(`  · 直接说「帮我做这周的个人复盘」（skill 自动触发，任何 agent 都行）`);
  log(`  · 或用 slash：${C.g}/personal-review${C.x}（Claude Code / Codex）`);
  log(`${C.dim}若 agent 未立即识别，重启会话让它重新扫描本项目 skills / commands。${C.x}`);
  log(`${C.dim}跟随本项目；换项目请在那个项目里重新装。前置：Typeless + Python 3 + Node。数据全程本地。${C.x}\n`);
}

// 把一份完整 skill（SKILL.md + scripts/references/assets）铺到目标目录。
function layoutSkill(dst) {
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(path.join(dst, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(dst, "references"), { recursive: true });
  fs.mkdirSync(path.join(dst, "assets"), { recursive: true });
  // 用 agent 无关的 SKILL.md（走 npx CLI，不硬编码任一 agent 的家目录路径）
  fs.copyFileSync(path.join(ADAPTERS, "skill", "SKILL.md"), path.join(dst, "SKILL.md"));
  fs.copyFileSync(path.join(CORE, "collect.py"), path.join(dst, "scripts", "collect.py"));
  fs.copyFileSync(path.join(CORE, "insight-schema.json"), path.join(dst, "references", "insight-schema.json"));
  fs.copyFileSync(path.join(CORE, "analysis-guide.md"), path.join(dst, "references", "analysis-guide.md"));
  fs.copyFileSync(path.join(CORE, "report-template.html"), path.join(dst, "assets", "report-template.html"));
}

/* ---------- helpers ---------- */
function parseFlags(argv, map) {
  const out = {};
  for (const [key, flag] of Object.entries(map)) {
    const i = argv.indexOf(flag);
    if (i >= 0) out[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
  }
  return out;
}

function help() {
  log(`${C.b}typeless-review${C.x} — 把 Typeless 语音记录变成图示化个人复盘

${C.b}用法${C.x}
  npx typeless-review install
        把 skill 装进当前项目的 .claude/.codex/.agents 三个 skills 目录，
        覆盖 Claude Code / Codex / Kimi / GLM / MiniMax 等主流 agent
  npx typeless-review collect [--range week|month|all] [--out-dir DIR] [--validate]
        读本地库 → 出 corpus.jsonl + stats.json
  npx typeless-review render <insights.json> [--out FILE] [--open]
        把 insights.json → 自包含 HTML 报告（任何 agent 都能用）

${C.dim}数据全程在本地，不上传。https://github.com/JamesRRR/typeless-personal-review${C.x}`);
}

/* ---------- main ---------- */
const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "collect": collect(rest); break;
  case "render": render(rest); break;
  case "install": install(rest); break;
  case "-h": case "--help": case "help": help(); break;
  case undefined:
    // 无子命令 = 一键装到当前项目的 .claude/.codex/.agents
    install([]); break;
  default:
    // 只带 flag 也走 install（flag 一律忽略，全装）
    if (cmd.startsWith("--")) { install(process.argv.slice(2)); }
    else { die(`未知命令：${cmd}\n运行 npx typeless-review --help 看用法`); }
}
