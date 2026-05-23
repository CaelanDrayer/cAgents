#!/usr/bin/env bash
#
# scripts/audit-orphans.sh — LP-11 (v12.7.x)
#
# Audit every agent registered in `.claude-plugin/plugin.json` and report
# which ones are orphans (zero `cagents:{name}` references in the codebase
# AND no routing keywords pointing at them).
#
# Output (Markdown):
#   - Totals: catalog size, orphan count, orphan rate
#   - Per-archetype breakdown
#   - Per-agent table: name | refs-in-codebase | routing-keywords-matching | verdict
#   - Orphan list (candidates for {archetype}/_deprecated/)
#
# Verdict values:
#   active             — refs >= 1
#   linked             — refs == 0 AND routing-keywords >= 1
#   orphan             — refs == 0 AND routing-keywords == 0
#
# Usage:
#   bash scripts/audit-orphans.sh [output_file]
#
# Default output: cagents-memory/_knowledge/orphan-audit-$(date +%y%m%d).md
# Prints absolute output path on stdout (last line) so callers can capture it.
#
# Implements LP-11 from session
# team_execute-self-improvement_260522_001.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUT_FILE="${1:-$REPO_ROOT/cagents-memory/_knowledge/orphan-audit-$(date +%y%m%d).md}"
mkdir -p "$(dirname "$OUT_FILE")"

# Single bulk grep over the relevant tree, looking for ANY `cagents:<name>`
# reference. Node then post-processes to attribute counts per agent. This
# beats 144 separate grep calls by ~30x.
GREP_OUT="$(mktemp)"
trap 'rm -f "$GREP_OUT"' EXIT

# Export env vars so the inline Node script can read them.
export REPO_ROOT OUT_FILE GREP_OUT

# `grep -rEoh` prints one match per line (just the matched string).
# We deliberately scope the search to source-ish file types and exclude
# heavy/irrelevant directories so the grep finishes in a few seconds.
grep -rEoh \
  --include="*.md" \
  --include="*.cjs" \
  --include="*.mjs" \
  --include="*.js" \
  --include="*.ts" \
  --include="*.json" \
  --include="*.yaml" \
  --include="*.yml" \
  --include="*.sh" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=cagents-memory \
  --exclude-dir=_deprecated \
  --exclude-dir=archive \
  --exclude-dir=vendor_repos \
  --exclude-dir=outputs \
  -e 'cagents:[a-z0-9_-]+' \
  "$REPO_ROOT" > "$GREP_OUT" 2>/dev/null || true

# All audit work continues in Node — bash drives, node computes.
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";

const REPO = process.env.REPO_ROOT;
const OUT = process.env.OUT_FILE;
const GREP_OUT = process.env.GREP_OUT;
const PLUGIN = JSON.parse(fs.readFileSync(path.join(REPO, ".claude-plugin", "plugin.json"), "utf8"));

// Build catalog: name -> { archetype, skillPath }
// v12.8.0: paths are "./agents/{archetype}/{branch?}/{agent}/SKILL.md"
const catalog = [];
for (const rel of PLUGIN.agents) {
  if (rel.includes("/_deprecated/")) continue;
  const parts = rel.replace(/^\.\//, "").split("/");
  // parts[0] === "agents"; archetype is parts[1] under the new layout, parts[0]
  // under the legacy layout. Tolerate both for forward-compat.
  const archetype = parts[0] === "agents" ? parts[1] : parts[0];
  const name = parts[parts.length - 2];
  catalog.push({ name, archetype, skillPath: rel.replace(/^\.\//, "") });
}

// Build refs-in-codebase counts from the single grep pass.
// `grep -rEoh` printed one matched string per line, e.g. "cagents:tech-lead".
// We tally occurrences per name.
const refCounts = new Map();
const grepText = fs.existsSync(GREP_OUT) ? fs.readFileSync(GREP_OUT, "utf8") : "";
for (const line of grepText.split("\n")) {
  const m = line.match(/^cagents:([a-z0-9_-]+)$/);
  if (!m) continue;
  const name = m[1];
  refCounts.set(name, (refCounts.get(name) || 0) + 1);
}

// Subtract 1 self-reference for each agents own SKILL.md (the SKILL.md
// frontmatter declares `name: <name>` but does NOT contain `cagents:<name>`
// in most cases; still, the body sometimes mentions itself). To stay safe
// and conservative, we DO NOT subtract — orphans defined as refs==0 are
// rock-solid even with this over-count, and a single self-ref bumps the
// agent into the "active" bucket which is the better failure mode.

// Routing keywords-matching: count how many YAML routing entries list each
// agent under `agents:` lists or `tier_2|3|4:` lists.
const ROUTING_FILES = [
  "cagents-memory/_system/config/routing.yaml",
  "agents/core/config/domain_overrides.yaml",
  "agents/leadership/config/domain_overrides.yaml",
  "agents/_overlay/people/config/domain_overrides.yaml",
  "agents/_overlay/shared/config/domain_overrides.yaml",
];

function collectRoutingMentions() {
  const mentions = new Map();
  for (const rel of ROUTING_FILES) {
    const full = path.join(REPO, rel);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    const re = /^[\s-]*(?:agents|tier_[234])\s*:\s*\[([^\]]+)\]/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
      const items = m[1].split(",").map(s => s.trim().replace(/^[\x27\x22]|[\x27\x22]$/g, ""));
      for (const id of items) {
        if (!id || id.length === 0) continue;
        mentions.set(id, (mentions.get(id) || 0) + 1);
      }
    }
  }
  return mentions;
}
const routingMentions = collectRoutingMentions();

// Score every agent
const rows = [];
const archetypeStats = new Map();
for (const a of catalog) {
  const refs = refCounts.get(a.name) || 0;
  const routing = routingMentions.get(a.name) || 0;
  let verdict;
  if (refs >= 1) verdict = "active";
  else if (routing >= 1) verdict = "linked";
  else verdict = "orphan";
  rows.push({ ...a, refs, routing, verdict });
  if (!archetypeStats.has(a.archetype)) archetypeStats.set(a.archetype, { total: 0, active: 0, linked: 0, orphan: 0 });
  const s = archetypeStats.get(a.archetype);
  s.total++;
  s[verdict]++;
}

const total = rows.length;
const orphans = rows.filter(r => r.verdict === "orphan");
const linked = rows.filter(r => r.verdict === "linked");
const active = rows.filter(r => r.verdict === "active");
const orphanRate = total > 0 ? (orphans.length / total * 100) : 0;

// Render Markdown
const lines = [];
lines.push("# Agent Orphan Audit");
lines.push("");
lines.push("Generated: " + new Date().toISOString());
lines.push("Catalog source: `.claude-plugin/plugin.json` (" + total + " agents)");
lines.push("");
lines.push("## Totals");
lines.push("");
lines.push("| Verdict | Count | % |");
lines.push("|---------|------:|--:|");
lines.push("| active  | " + active.length + " | " + (active.length/total*100).toFixed(1) + "% |");
lines.push("| linked  | " + linked.length + " | " + (linked.length/total*100).toFixed(1) + "% |");
lines.push("| orphan  | " + orphans.length + " | " + orphanRate.toFixed(1) + "% |");
lines.push("| **total** | **" + total + "** | 100.0% |");
lines.push("");
lines.push("**Orphan rate: " + orphanRate.toFixed(1) + "%** (" + orphans.length + " of " + total + ")");
lines.push("");
lines.push("Verdict legend:");
lines.push("- **active**: at least one `cagents:{name}` reference in the codebase (md/code/yaml outside cagents-memory, _deprecated, archive, vendor_repos).");
lines.push("- **linked**: zero codebase refs BUT mentioned in routing.yaml or a domain_overrides.yaml as a controller/specialist.");
lines.push("- **orphan**: zero codebase refs AND no routing keywords. Candidate for `_deprecated/` bucket.");
lines.push("");
lines.push("## Per-archetype breakdown");
lines.push("");
lines.push("| Archetype | Total | Active | Linked | Orphan | Orphan % |");
lines.push("|-----------|------:|-------:|-------:|-------:|---------:|");
const sortedArch = Array.from(archetypeStats.entries()).sort();
for (const [arch, s] of sortedArch) {
  const pct = s.total > 0 ? (s.orphan/s.total*100).toFixed(1) : "0.0";
  lines.push("| " + arch + " | " + s.total + " | " + s.active + " | " + s.linked + " | " + s.orphan + " | " + pct + "% |");
}
lines.push("");
lines.push("## Per-agent table");
lines.push("");
lines.push("| Agent | Archetype | Refs | Routing | Verdict |");
lines.push("|-------|-----------|-----:|--------:|---------|");
const order = { orphan: 0, linked: 1, active: 2 };
for (const r of rows.sort((a, b) => {
  if (order[a.verdict] !== order[b.verdict]) return order[a.verdict] - order[b.verdict];
  return a.name.localeCompare(b.name);
})) {
  lines.push("| " + r.name + " | " + r.archetype + " | " + r.refs + " | " + r.routing + " | " + r.verdict + " |");
}
lines.push("");
lines.push("## Orphan list (candidates for _deprecated/)");
lines.push("");
if (orphans.length === 0) {
  lines.push("_(no orphans)_");
} else {
  for (const o of orphans.sort((a, b) => a.archetype.localeCompare(b.archetype) || a.name.localeCompare(b.name))) {
    lines.push("- `" + o.skillPath + "` -> " + o.archetype + "/_deprecated/" + o.name + "/");
  }
}
lines.push("");

fs.writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(OUT);
'

echo ""
echo "wrote: $OUT_FILE"
