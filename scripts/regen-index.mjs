#!/usr/bin/env node
// regen-index.mjs — regenerate skill-matrix/skills-matrix/INDEX.md from filesystem.
// Single source of truth: the SKILL.md frontmatter. No external deps.
// Usage: node scripts/regen-index.mjs [--check]
//   --check   exit non-zero if INDEX.md would change (CI mode, no writes)
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE    = dirname(fileURLToPath(import.meta.url));
const ROOT    = dirname(HERE);
const SKILLS  = join(ROOT, "skill-matrix", "skills-matrix");
const OUT     = join(SKILLS, "INDEX.md");
const CHECK   = process.argv.includes("--check");

function listSkillDirs(p) {
  return readdirSync(p)
    .filter(n => {
      const full = join(p, n);
      return statSync(full).isDirectory() && n !== "00-standard-skill-template";
    })
    .sort((a, b) => a.localeCompare(b));
}

function parseFrontmatter(content) {
  if (!content.startsWith("---")) return { name: null, description: null };
  const end = content.indexOf("\n---", 3);
  if (end < 0) return { name: null, description: null };
  const block = content.slice(3, end);
  const out = { name: null, description: null };
  for (const line of block.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (key === "name") out.name = raw.trim();
    if (key === "description") {
      // strip surrounding quotes if any
      out.description = raw.trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

function shortDesc(d) {
  if (!d) return "_(no description)_";
  // cap at ~140 chars on first sentence-ish boundary
  if (d.length <= 140) return d;
  const cut = d.slice(0, 140);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + "…";
}

function main() {
  if (!existsSync(SKILLS)) {
    console.error(`SKILLS dir not found: ${SKILLS}`);
    process.exit(1);
  }
  const dirs = listSkillDirs(SKILLS);
  const rows = [];
  for (const d of dirs) {
    const file = join(SKILLS, d, "SKILL.md");
    let name = d, desc = null;
    if (existsSync(file)) {
      const fm = parseFrontmatter(readFileSync(file, "utf8"));
      if (fm.name)     name = fm.name;
      if (fm.description) desc = fm.description;
    }
    rows.push({ folder: d, name, desc });
  }

  const now = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push("# Índice de Skills");
  lines.push("");
  lines.push(`> Catálogo auto-generado por \`scripts/regen-index.mjs\` desde el filesystem.`);
  lines.push(`> Última regeneración: **${now}**. **No editar a mano** — tus cambios se sobrescribirán.`);
  lines.push("");
  lines.push(`Total: **${rows.length} skills** organizadas en \`skill-matrix/skills-matrix/\`.`);
  lines.push("");
  lines.push("## Tabla de skills");
  lines.push("");
  lines.push("| # | Skill | Descripción breve |");
  lines.push("|---|-------|-------------------|");
  rows.forEach((r, i) => {
    const link = `[${r.folder}](./${r.folder}/SKILL.md)`;
    lines.push(`| ${i + 1} | ${link} | ${shortDesc(r.desc)} |`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`_Regenerado desde ${rows.length} carpetas; la cifra de arriba es ground truth._`);
  lines.push("");
  const out = lines.join("\n");

  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error(`INDEX.md missing — would create with ${rows.length} entries`);
      process.exit(1);
    }
    const cur = readFileSync(OUT, "utf8");
    if (cur !== out) {
      console.error(`INDEX.md is stale (${rows.length} skills, but INDEX says different).`);
      console.error(`Run: node scripts/regen-index.mjs`);
      process.exit(1);
    }
    console.log(`✓ INDEX.md is up-to-date (${rows.length} skills)`);
    return;
  }

  writeFileSync(OUT, out, "utf8");
  console.log(`✓ Regenerated INDEX.md with ${rows.length} skills`);
}

main();
