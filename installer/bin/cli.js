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
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function detectAgent() {
  // 有哪个 agent 的配置目录存在就优先它
  if (fs.existsSync(path.join(os.homedir(), ".claude"))) return "claude";
  if (fs.existsSync(path.join(os.homedir(), ".codex"))) return "codex";
  return null;
}

function install(argv) {
  const opts = parseFlags(argv, { agent: "--agent" });
  let agent = opts.agent || detectAgent();

  if (!agent) {
    log(`${C.y}没检测到 Claude 或 Codex 的配置目录。${C.x}`);
    log(`请指定：${C.b}npx typeless-review install --agent claude|codex|generic${C.x}`);
    log(`${C.dim}（generic = 通用，任何 agent 都能用的一份指令文档）${C.x}`);
    process.exit(1);
  }

  const installers = {
    claude: installClaude,
    codex: installCodex,
    generic: installGeneric,
  };
  const fn = installers[agent];
  if (!fn) die(`不支持的 agent：${agent}（可选 claude / codex / generic）`);
  fn();
}

function installClaude() {
  const dst = path.join(os.homedir(), ".claude", "skills", "personal-review");
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  // Claude skill = 适配层的 SKILL.md + 共用的 core 资产
  copyDir(path.join(ADAPTERS, "claude"), dst);
  fs.mkdirSync(path.join(dst, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(dst, "references"), { recursive: true });
  fs.mkdirSync(path.join(dst, "assets"), { recursive: true });
  fs.copyFileSync(path.join(CORE, "collect.py"), path.join(dst, "scripts", "collect.py"));
  fs.copyFileSync(path.join(CORE, "insight-schema.json"), path.join(dst, "references", "insight-schema.json"));
  fs.copyFileSync(path.join(CORE, "analysis-guide.md"), path.join(dst, "references", "analysis-guide.md"));
  fs.copyFileSync(path.join(CORE, "report-template.html"), path.join(dst, "assets", "report-template.html"));
  log(`\n${C.b}📿 Personal Review · Claude Code${C.x}`);
  log(`${C.g}✓ 已装到${C.x} ${dst}`);
  log(`\n用法：在 Claude Code 里说 ${C.g}/personal-review${C.x}（或「帮我做这周的复盘」）`);
  log(`${C.dim}前置：Typeless + Python 3。数据全程本地。${C.x}\n`);
}

function installCodex() {
  const dst = path.join(os.homedir(), ".typeless-review");
  copyDir(CORE, dst);
  fs.copyFileSync(path.join(ADAPTERS, "codex", "AGENTS.md"), path.join(dst, "AGENTS.md"));
  log(`\n${C.b}📿 Personal Review · Codex${C.x}`);
  log(`${C.g}✓ 核心 + Codex 指令已装到${C.x} ${dst}`);
  log(`\n用法：让 Codex 读 ${C.g}${path.join(dst, "AGENTS.md")}${C.x} 并按其中步骤跑。`);
  log(`${C.dim}前置：Typeless + Python 3 + Node。数据全程本地。${C.x}\n`);
}

function installGeneric() {
  const dst = path.join(os.homedir(), ".typeless-review");
  copyDir(CORE, dst);
  fs.copyFileSync(path.join(ADAPTERS, "generic", "PROMPT.md"), path.join(dst, "PROMPT.md"));
  log(`\n${C.b}📿 Personal Review · 通用${C.x}`);
  log(`${C.g}✓ 核心 + 通用指令已装到${C.x} ${dst}`);
  log(`\n用法：把 ${C.g}${path.join(dst, "PROMPT.md")}${C.x} 的内容贴给任何 AI agent，`);
  log(`它会告诉 agent 怎么一步步用 collect / render 出你的复盘。`);
  log(`${C.dim}前置：Typeless + Python 3 + Node。数据全程本地。${C.x}\n`);
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
  npx typeless-review install [--agent claude|codex|generic]
        把适配层装到对应 agent（不带 --agent 会自动检测）
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
    // 无子命令 = 一键安装（兼容老的 `npx typeless-personal-review`）
    install([]); break;
  default:
    // 只带 flag（如 --agent codex）也走 install
    if (cmd.startsWith("--")) { install(process.argv.slice(2)); }
    else { die(`未知命令：${cmd}\n运行 npx typeless-review --help 看用法`); }
}
