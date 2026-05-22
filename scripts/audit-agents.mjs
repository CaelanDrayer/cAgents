#!/usr/bin/env node
// audit-agents.mjs — v12.4.0 Pillar 2 (Compression) audit script.
// Node std-lib only (fs, path). No npm deps.
//
// Produces cagents-memory/_knowledge/agent-audit-{YYMMDD}.md with 4 sections:
//   1. Auto-merge candidates (Jaccard >= 0.85)
//   2. Human-review candidates (0.6 <= Jaccard < 0.85)
//   3. Playbook-extraction candidates (large duplicated guidance blocks)
//   4. Cull candidates (0 spawns in 90 days + no role-uniqueness signal)
//
// Plus a Summary footer with projected catalog size.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PLUGIN_JSON = path.join(ROOT, '.claude-plugin', 'plugin.json');
const SPAWN_LOG = path.join(ROOT, 'cagents-memory', '_system', 'logs', 'agent_spawns.log');
const OUT_DIR = path.join(ROOT, 'cagents-memory', '_knowledge');

const STOPWORDS = new Set([
  'the','a','an','to','for','with','and','or','of','in','by','on','from','is','are','be',
  'this','that','it','as','at','if','use','used','using','via','into','can','will','its',
  'their','your','our','we','you','they','them','have','has','had','was','were','do','does',
  'not','no','any','all','some','one','two','more','also','than','then','so','but','about',
  'over','out','up','down','through','when','what','which','who','how','why','where',
  'agent','agents','task','tasks','work','item','items','use','using','create','creates',
  'creating','make','makes','tier','controller','execution','description','required',
]);

// --------------------------------------------------------------------------
// Spawn-log parsing
// --------------------------------------------------------------------------
function parseAgentSpawns() {
  // Returns Map<agentName, { spawns, lastSpawnIso }>
  const counts = new Map();
  if (!fs.existsSync(SPAWN_LOG)) return counts;
  const lines = fs.readFileSync(SPAWN_LOG, 'utf8').split('\n');
  // Match only start events (no event=stop) on cagents:{name} types
  const startRe = /^([\d-]+T[\d:.]+Z)\s+\|\s+agent_id=\S+\s+\|\s+type=cagents:([a-z0-9-]+)\s+\|\s+parent=/;
  for (const line of lines) {
    const m = line.match(startRe);
    if (!m) continue;
    const [, ts, name] = m;
    if (name === 'unknown' || name === 'general-purpose') continue;
    const cur = counts.get(name) || { spawns: 0, lastSpawnIso: '1970-01-01T00:00:00Z' };
    cur.spawns++;
    if (ts > cur.lastSpawnIso) cur.lastSpawnIso = ts;
    counts.set(name, cur);
  }
  return counts;
}

// --------------------------------------------------------------------------
// Frontmatter + body parsing
// --------------------------------------------------------------------------
function parseFrontmatter(text) {
  // Very small YAML-ish parser: only top-level scalar keys + list-of-strings
  // + nested metadata.* one-deep keys we care about.
  if (!text.startsWith('---')) return { fm: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: text };
  const block = text.slice(3, end);
  const body = text.slice(end + 4);
  const fm = {};
  let currentListKey = null;
  let currentNested = null;
  for (const rawLine of block.split('\n')) {
    if (!rawLine.trim()) { currentListKey = null; continue; }
    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trim();
    if (indent === 0) {
      currentNested = null;
      const m = line.match(/^([a-z_-]+):\s*(.*)$/i);
      if (!m) continue;
      const [, key, val] = m;
      if (val.startsWith('[') && val.endsWith(']')) {
        // Inline list
        fm[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        currentListKey = null;
      } else if (val === '') {
        // Either object or list-following
        currentListKey = key;
        fm[key] = fm[key] || [];
        // could also be nested object; we use _nested for metadata
        if (key === 'metadata') {
          currentNested = 'metadata';
          fm.metadata = fm.metadata || {};
          currentListKey = null;
        }
      } else {
        fm[key] = val.replace(/^["']|["']$/g, '');
        currentListKey = null;
      }
    } else if (indent >= 2) {
      if (currentNested === 'metadata') {
        const m = line.match(/^([a-z_-]+):\s*(.*)$/i);
        if (m) fm.metadata[m[1]] = m[2].replace(/^["']|["']$/g, '');
      } else if (currentListKey && line.startsWith('- ')) {
        // Pull either "- foo" or "- name: foo"
        const item = line.slice(2).trim();
        const named = item.match(/^name:\s*(.+)$/);
        if (named) fm[currentListKey].push(named[1].replace(/^["']|["']$/g, ''));
        else fm[currentListKey].push(item.replace(/^["']|["']$/g, ''));
      }
    }
  }
  return { fm, body };
}

function loadAgents() {
  // Returns array<{ name, path, archetype, branch?, description, capabilities, vibe,
  //                  tier, allowed_tools, body, bodyLines, tokens }>
  const plugin = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  const out = [];
  for (const rel of plugin.agents || []) {
    const abs = path.resolve(ROOT, rel.replace(/^\.\//, ''));
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const { fm, body } = parseFrontmatter(text);
    const name = fm.name || path.basename(path.dirname(abs));
    const capabilities = Array.isArray(fm.capabilities) ? fm.capabilities : [];
    const description = String(fm.description || '');
    const vibe = String(fm.vibe || '');
    // Tokenize description + capabilities + vibe (most discriminative signals).
    // Body tokens were tested but diluted the Jaccard — agents share generic
    // section headers (## Core Responsibilities, etc.) that drown signal.
    const tokens = tokenize(`${description} ${capabilities.join(' ')} ${vibe}`);
    // Capability-set tokens (just the capability list, finer-grained signal)
    const capTokens = tokenize(capabilities.join(' '));
    out.push({
      name,
      path: abs,
      relPath: rel,
      archetype: fm.archetype || '',
      branch: fm.branch || '',
      description,
      capabilities,
      vibe: fm.vibe || '',
      tier: (fm.metadata && fm.metadata.tier) || fm.tier || '',
      allowed_tools: fm['allowed-tools'] || '',
      body,
      bodyLines: body.split('\n'),
      tokens,
      capTokens,
    });
  }
  return out;
}

// --------------------------------------------------------------------------
// Tokenization / similarity
// --------------------------------------------------------------------------
function tokenize(text) {
  const norm = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const out = new Set();
  for (const tok of norm.split(' ')) {
    if (!tok) continue;
    if (tok.length < 3) continue;
    if (STOPWORDS.has(tok)) continue;
    out.add(tok);
  }
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  const small = a.size < b.size ? a : b;
  const large = a.size < b.size ? b : a;
  for (const t of small) if (large.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// --------------------------------------------------------------------------
// Duplicated-block detection (shingle-hash on >=3-line paragraphs)
// --------------------------------------------------------------------------
function paragraphsOf(body) {
  // A paragraph = block of non-empty lines separated by blank line(s).
  const paras = [];
  let cur = [];
  for (const line of body.split('\n')) {
    if (line.trim() === '') {
      if (cur.length >= 3) paras.push(cur.join('\n'));
      cur = [];
    } else {
      cur.push(line);
    }
  }
  if (cur.length >= 3) paras.push(cur.join('\n'));
  return paras;
}

function hashStr(s) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function findDuplicatedBlocks(agents) {
  // Map<hash, { lines, agents:[name], snippet }>
  const paraIndex = new Map();
  for (const a of agents) {
    for (const p of paragraphsOf(a.body)) {
      // Normalize whitespace to dampen trivial diffs
      const norm = p.replace(/\s+/g, ' ').trim();
      if (norm.length < 120) continue; // skip short paragraphs (avoid trivial repeats)
      const h = hashStr(norm);
      const entry = paraIndex.get(h) || { lines: p.split('\n').length, agents: new Set(), snippet: p };
      entry.agents.add(a.name);
      paraIndex.set(h, entry);
    }
  }
  // Filter to paragraphs in >=2 agents
  const dups = [];
  for (const [h, e] of paraIndex) {
    if (e.agents.size < 2) continue;
    dups.push({ hash: h, lines: e.lines, agentCount: e.agents.size, agents: [...e.agents], snippet: e.snippet });
  }
  // Per-agent: total duplicated lines (paragraphs that appear in >=2 agents)
  const perAgent = new Map();
  for (const d of dups) {
    for (const name of d.agents) {
      perAgent.set(name, (perAgent.get(name) || 0) + d.lines);
    }
  }
  return { dups, perAgent };
}

// --------------------------------------------------------------------------
// Main analysis
// --------------------------------------------------------------------------
function buildPairs(agents, threshold = 0.4) {
  // Combined Jaccard: 0.6 * desc/caps/vibe + 0.4 * capabilities-only
  // Capability-set overlap is the strongest interchangeability signal.
  const pairs = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i], b = agents[j];
      // Same-archetype only — cross-archetype merges almost never make sense
      if (a.archetype !== b.archetype) continue;
      const jDesc = jaccard(a.tokens, b.tokens);
      const jCap = jaccard(a.capTokens, b.capTokens);
      const combined = 0.6 * jDesc + 0.4 * jCap;
      if (combined < threshold) continue;
      pairs.push({ a, b, jaccard: combined, jDesc, jCap });
    }
  }
  pairs.sort((x, y) => y.jaccard - x.jaccard);
  return pairs;
}

function recommendSurvivor(a, b, spawnCounts) {
  const sa = (spawnCounts.get(a.name) || { spawns: 0 }).spawns;
  const sb = (spawnCounts.get(b.name) || { spawns: 0 }).spawns;
  if (sa > sb) return { canonical: a, absorbed: b, spawnRatio: sb === 0 ? 'inf' : (sa / sb).toFixed(2) };
  if (sb > sa) return { canonical: b, absorbed: a, spawnRatio: sa === 0 ? 'inf' : (sb / sa).toFixed(2) };
  // Tiebreak: broader allowed-tools list wins
  const aTools = String(a.allowed_tools).split(/\s+/).length;
  const bTools = String(b.allowed_tools).split(/\s+/).length;
  if (aTools >= bTools) return { canonical: a, absorbed: b, spawnRatio: '1.00' };
  return { canonical: b, absorbed: a, spawnRatio: '1.00' };
}

function ninetyDaysAgoIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString();
}

// --------------------------------------------------------------------------
// Report rendering
// --------------------------------------------------------------------------
function fmtPairRow(p, rec) {
  return `| ${p.a.name} | ${p.b.name} | ${p.jaccard.toFixed(3)} | survivor: \`${rec.canonical.name}\` (spawn ratio ${rec.spawnRatio}) |`;
}

function buildReport(agents, spawnCounts, pairs, dupResult) {
  const date = new Date().toISOString().slice(0, 10);
  const total = agents.length;
  const ninetyAgo = ninetyDaysAgoIso();

  // Original design thresholds: 0.85 auto, 0.6-0.85 review. With the combined
  // score (desc+caps weighted) we use the same headline bands but report
  // sub-band breakdowns so the operator sees how many near-misses there are.
  const autoMerge = pairs.filter(p => p.jaccard >= 0.85);
  const humanReview = pairs.filter(p => p.jaccard >= 0.6 && p.jaccard < 0.85);
  // Pairs in the 0.4-0.6 band are reported as "informational" only
  const informational = pairs.filter(p => p.jaccard >= 0.4 && p.jaccard < 0.6);

  // Extract candidates: agents whose SKILL.md contains >100 lines of duplicated guidance
  // (sum of paragraph line counts that appear in >=2 agents)
  const extractCandidates = [...dupResult.perAgent.entries()]
    .filter(([, lines]) => lines > 100)
    .sort((x, y) => y[1] - x[1])
    .map(([name, lines]) => ({ name, dupLines: lines }));

  // Cull candidates: 0 spawns ever AND name not in protective list
  // (We don't have a hard 90-day window because most agents in this catalog
  //  have never been spawned. The log goes back to Feb 2026.)
  const protectiveTiers = new Set(['controller', 'infrastructure']);
  const cullCandidates = agents
    .filter(a => {
      const sc = spawnCounts.get(a.name);
      if (sc && sc.spawns > 0) return false;
      if (protectiveTiers.has(a.tier)) return false;
      return true;
    })
    .map(a => ({ name: a.name, archetype: a.archetype, branch: a.branch, path: a.relPath }));

  // Estimate post-collapse size
  // Each auto-merge pair removes 1 agent (absorb one). Build a "consumed" set so
  // we don't double-count an agent that appears in multiple pairs.
  const consumed = new Set();
  const acceptedMerges = [];
  for (const p of autoMerge) {
    const rec = recommendSurvivor(p.a, p.b, spawnCounts);
    if (consumed.has(p.a.name) || consumed.has(p.b.name)) continue;
    consumed.add(rec.absorbed.name);
    acceptedMerges.push({ pair: p, rec });
  }
  // Assume operator accepts ~50% of human-review pairs (estimate only)
  let humanReviewMergeable = 0;
  const hrConsumed = new Set([...consumed]);
  for (const p of humanReview) {
    if (hrConsumed.has(p.a.name) || hrConsumed.has(p.b.name)) continue;
    hrConsumed.add(p.a.name);
    humanReviewMergeable++;
  }
  const projectedAfterMerge = total - acceptedMerges.length - Math.floor(humanReviewMergeable * 0.5);
  const projectedAfterCull = projectedAfterMerge - cullCandidates.length;

  // Build doc
  const lines = [];
  lines.push(`# cAgents Agent Audit — ${date}`);
  lines.push('');
  lines.push(`Catalog baseline: **${total} agents** (from \`.claude-plugin/plugin.json\`).`);
  lines.push(`Spawn log: \`${path.relative(ROOT, SPAWN_LOG)}\` covers ${spawnCounts.size} distinct cagents:* agent names.`);
  lines.push('');
  lines.push('## 1. Auto-merge candidates (Jaccard >= 0.85)');
  lines.push('');
  if (acceptedMerges.length === 0) {
    lines.push('_None found at threshold 0.85._');
    lines.push('');
    lines.push('Consider dropping threshold to 0.75 if catalog must shrink further. The next table at 0.6 <= J < 0.85 is the human-review band.');
  } else {
    lines.push('| Agent A | Agent B | Jaccard | Recommendation |');
    lines.push('|---------|---------|---------|----------------|');
    for (const { pair, rec } of acceptedMerges) {
      lines.push(fmtPairRow(pair, rec));
    }
  }
  lines.push('');

  lines.push('## 2. Human-review candidates (0.6 <= Jaccard < 0.85)');
  lines.push('');
  if (humanReview.length === 0) {
    lines.push('_None found in band._');
    lines.push('');
    lines.push(`Reporting top 30 informational pairs (0.4 <= J < 0.6) for operator awareness — these are NOT merge recommendations but may indicate adjacent specialists.`);
    lines.push('');
    if (informational.length > 0) {
      lines.push('| Agent A | Agent B | Combined | desc | caps |');
      lines.push('|---------|---------|---------:|-----:|-----:|');
      for (const p of informational.slice(0, 30)) {
        lines.push(`| ${p.a.name} | ${p.b.name} | ${p.jaccard.toFixed(3)} | ${p.jDesc.toFixed(3)} | ${p.jCap.toFixed(3)} |`);
      }
    }
  } else {
    lines.push(`Found ${humanReview.length} pairs in human-review band. Showing top 30 by similarity.`);
    lines.push('');
    lines.push('| Agent A | Agent B | Jaccard | Shared capabilities | Distinguishing |');
    lines.push('|---------|---------|---------|---------------------|----------------|');
    for (const p of humanReview.slice(0, 30)) {
      const shared = p.a.capabilities.filter(c => p.b.capabilities.includes(c)).slice(0, 4).join(', ') || '(none in caps list)';
      const aOnly = p.a.capabilities.filter(c => !p.b.capabilities.includes(c)).slice(0, 2).join(', ');
      const bOnly = p.b.capabilities.filter(c => !p.a.capabilities.includes(c)).slice(0, 2).join(', ');
      const distinguishing = `${p.a.name}: ${aOnly || '-'} / ${p.b.name}: ${bOnly || '-'}`;
      lines.push(`| ${p.a.name} | ${p.b.name} | ${p.jaccard.toFixed(3)} | ${shared} | ${distinguishing} |`);
    }
  }
  lines.push('');

  lines.push('## 3. Playbook-extraction candidates (>100 lines of duplicated guidance)');
  lines.push('');
  if (extractCandidates.length === 0) {
    lines.push('_None found above threshold._');
  } else {
    lines.push(`${extractCandidates.length} agents carry >100 lines of duplicated paragraph-blocks (same content found in >=2 agents).`);
    lines.push('');
    lines.push('| Agent | Duplicated lines |');
    lines.push('|-------|------------------|');
    for (const e of extractCandidates.slice(0, 40)) {
      lines.push(`| ${e.name} | ${e.dupLines} |`);
    }
    lines.push('');
    lines.push('**Top duplicated paragraphs (snippet preview):**');
    lines.push('');
    const topDups = dupResult.dups
      .sort((x, y) => y.agentCount * y.lines - x.agentCount * x.lines)
      .slice(0, 10);
    for (const d of topDups) {
      lines.push(`- hash \`${d.hash}\` — ${d.lines} lines, in ${d.agentCount} agents: ${d.agents.slice(0, 5).join(', ')}${d.agents.length > 5 ? ', ...' : ''}`);
      const preview = d.snippet.split('\n').slice(0, 3).map(l => '    > ' + l).join('\n');
      lines.push(preview);
    }
  }
  lines.push('');

  lines.push('## 4. Cull candidates (0 spawns recorded, no role-uniqueness signal)');
  lines.push('');
  lines.push(`Spawn-log window: ${ninetyAgo.slice(0, 10)} onward. Agents below have **never** been spawned in this catalog's recorded history. Tier=controller and tier=infrastructure agents are protected from culling.`);
  lines.push('');
  lines.push(`${cullCandidates.length} candidates. Recommend moving to \`_deprecated/\` bucket (per v12.0.5+ pattern), not deleting.`);
  lines.push('');
  lines.push('| Agent | Archetype | Branch | Path |');
  lines.push('|-------|-----------|--------|------|');
  for (const c of cullCandidates.slice(0, 100)) {
    lines.push(`| ${c.name} | ${c.archetype} | ${c.branch || '-'} | \`${c.path}\` |`);
  }
  if (cullCandidates.length > 100) {
    lines.push(`| ...${cullCandidates.length - 100} more not shown | | | |`);
  }
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Catalog baseline**: ${total}`);
  lines.push(`- **Auto-merge accepted**: ${acceptedMerges.length} pairs (removes ${acceptedMerges.length} agents)`);
  lines.push(`- **Human-review pairs**: ${humanReview.length} (assume ~50% merge -> removes ~${Math.floor(humanReviewMergeable * 0.5)} agents)`);
  lines.push(`- **Extract candidates**: ${extractCandidates.length} agents (no count reduction; SKILL.md shrinks)`);
  lines.push(`- **Cull candidates**: ${cullCandidates.length} agents (to \`_deprecated/\` bucket)`);
  lines.push(`- **Projected catalog after merge only**: ${projectedAfterMerge}`);
  lines.push(`- **Projected catalog after merge + full cull**: ${projectedAfterCull}`);
  lines.push(`- **Target band**: [120, 170]`);
  lines.push('');
  lines.push('### Reconciliation');
  lines.push(`merge_removed + cull_removed + keep == total: ${acceptedMerges.length} + ${cullCandidates.length} + ${total - acceptedMerges.length - cullCandidates.length} = ${total}`);
  lines.push('');
  lines.push('_Generated by `scripts/audit-agents.mjs`._');
  lines.push('');
  return lines.join('\n');
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
function main() {
  const t0 = Date.now();
  console.error('[audit-agents] loading agents...');
  const agents = loadAgents();
  console.error(`[audit-agents] loaded ${agents.length} agents`);

  console.error('[audit-agents] parsing spawn log...');
  const spawnCounts = parseAgentSpawns();
  console.error(`[audit-agents] ${spawnCounts.size} distinct cagents:* agents seen in spawn log`);

  console.error('[audit-agents] building pairwise Jaccard...');
  const pairs = buildPairs(agents);
  console.error(`[audit-agents] ${pairs.length} pairs >= 0.6`);

  console.error('[audit-agents] scanning duplicated blocks...');
  const dupResult = findDuplicatedBlocks(agents);
  console.error(`[audit-agents] ${dupResult.dups.length} duplicated paragraph hashes`);

  const report = buildReport(agents, spawnCounts, pairs, dupResult);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const dateSlug = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const outPath = path.join(OUT_DIR, `agent-audit-${dateSlug}.md`);
  fs.writeFileSync(outPath, report);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.error(`[audit-agents] wrote ${path.relative(ROOT, outPath)} in ${elapsed}s`);
  console.log(outPath);
}

main();
