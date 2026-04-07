#!/usr/bin/env node

const { cpSync, mkdirSync, readFileSync, existsSync, readdirSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const TOFU = `
       ~  .  ~
    ┌───────────┐ .
  ~ │  ·     ·  │
    │    ___    │ ~
  . │           │
    └───────────┘
  ~  curea-pm-tools
`;

const SKILLS_DIR = join(homedir(), ".claude", "skills");
const PKG_ROOT = join(__dirname, "..");
const PKG_SKILLS = join(PKG_ROOT, "skills");
const PKG_JSON = join(PKG_ROOT, "package.json");

function getInstalledVersion() {
  try {
    const versionFile = join(SKILLS_DIR, ".curea-pm-tools-version");
    if (!existsSync(versionFile)) return null;
    return readFileSync(versionFile, "utf-8").trim();
  } catch {
    return null;
  }
}

function getPackageVersion() {
  try {
    return JSON.parse(readFileSync(PKG_JSON, "utf-8")).version;
  } catch {
    return "unknown";
  }
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

console.log(TOFU);

const prevVersion = getInstalledVersion();
const newVersion = getPackageVersion();
const skills = readdirSync(PKG_SKILLS);

if (!prevVersion) {
  console.log("스킬 설치 중...");
} else if (prevVersion === newVersion) {
  console.log(`✔ 이미 최신 버전입니다. (v${newVersion})`);
  console.log(`  스킬 ${skills.length}개: ${skills.join(", ")}`);
  console.log("  기능 제안/문의: yountofu@gmail.com");
  process.exit(0);
} else {
  console.log("업데이트 중...");
}

try {
  // 스킬 복사
  const prevSkills = [];
  try {
    for (const s of skills) {
      if (existsSync(join(SKILLS_DIR, s, "SKILL.md"))) prevSkills.push(s);
    }
  } catch {}

  for (const skill of skills) {
    copyDir(join(PKG_SKILLS, skill), join(SKILLS_DIR, skill));
  }

  // 버전 기록
  const { writeFileSync } = require("fs");
  writeFileSync(join(SKILLS_DIR, ".curea-pm-tools-version"), newVersion);

  // 결과
  if (!prevVersion) {
    console.log(`✔ 설치 완료! (v${newVersion})`);
    console.log(`  스킬 ${skills.length}개: ${skills.join(", ")}`);
    console.log("\n  Claude Code를 재시작하면 스킬이 로드됩니다.");
  } else {
    console.log(`✔ 업데이트 완료! (v${prevVersion} → v${newVersion})`);
    const added = skills.filter((s) => !prevSkills.includes(s));
    if (added.length > 0) console.log(`  새 스킬: ${added.join(", ")}`);
    console.log(`  전체 스킬: ${skills.join(", ")}`);
    console.log("\n  Claude Code를 재시작하면 변경사항이 반영됩니다.");
  }
  console.log("  기능 제안/문의: yountofu@gmail.com");
} catch (e) {
  console.error("\n✘ 설치 실패:", e.message);
  process.exit(1);
}
