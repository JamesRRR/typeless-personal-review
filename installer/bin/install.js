#!/usr/bin/env node
/**
 * typeless-personal-review installer
 *
 * 把打包的 personal-review skill 复制到用户的 ~/.claude/skills/personal-review/。
 * 纯 Node stdlib，无第三方依赖。安全、可读——不联网、不收集任何数据。
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const GREEN = "\x1b[32m", YELLOW = "\x1b[33m", DIM = "\x1b[2m", BOLD = "\x1b[1m", RESET = "\x1b[0m";

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function main() {
  const skillSrc = path.join(__dirname, "..", "skill");
  if (!fs.existsSync(path.join(skillSrc, "SKILL.md"))) {
    console.error(`${YELLOW}安装失败：找不到打包的 skill 文件。${RESET}`);
    process.exit(1);
  }

  const skillsDir = path.join(os.homedir(), ".claude", "skills");
  const dst = path.join(skillsDir, "personal-review");

  console.log(`\n${BOLD}📿 Personal Review · Typeless 语音记录复盘${RESET}\n`);

  const existed = fs.existsSync(dst);
  if (existed) {
    console.log(`${DIM}检测到已安装，正在覆盖更新…${RESET}`);
    fs.rmSync(dst, { recursive: true, force: true });
  }

  copyDir(skillSrc, dst);

  console.log(`${GREEN}✓ 已安装到${RESET} ${dst}\n`);
  console.log(`${BOLD}怎么用：${RESET}在 Claude Code 里说一句`);
  console.log(`  ${GREEN}/personal-review${RESET}          ${DIM}# 最近一周${RESET}`);
  console.log(`  ${GREEN}/personal-review all${RESET}      ${DIM}# 全量复盘${RESET}`);
  console.log(`\n${DIM}或者直接说：「帮我做一下这周的 personal review」${RESET}`);
  console.log(`${DIM}前置：本机装了 Typeless + Python 3。数据全程本地，不上传。${RESET}\n`);
}

try {
  main();
} catch (e) {
  console.error(`${YELLOW}安装出错：${RESET}${e.message}`);
  process.exit(1);
}
