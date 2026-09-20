#!/usr/bin/env node
// Deterministic agent-routability scorer (WI-007).
//
// FROZEN ALGORITHM — do not tune to make outputs look "right".
//   score(a) = |T(R) INTERSECT D(a)| + |T(R) INTERSECT K(a)|
//   D(a) = tokens of the agent's frontmatter `description`
//   K(a) = tokens of every specialist_routing keyword phrase whose `agents` list contains a
//   Equal weight 1 per term. No phrase bonus, no IDF, no normalization, no boosts.
//   Selection = highest score; ties -> lexicographically smallest agent FILENAME (LC_ALL=C bytes).
//
// No network, no randomness, no timestamps, no unsorted directory iteration.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.ROUTABILITY_REPO_ROOT
  ? path.resolve(process.env.ROUTABILITY_REPO_ROOT)
  : path.resolve(HERE, '..', '..');

const require = createRequire(path.join(REPO_ROOT, 'package.json'));
const yaml = require('js-yaml');

const AGENTS_DIR = path.join(REPO_ROOT, 'agents');

// The 5 config files, repo-relative. Sorted with byteCompare at load time.
const CONFIG_RELPATHS = [
  'agents/_overlay/people/config/domain_overrides.yaml',
  'agents/_overlay/shared/config/domain_overrides.yaml',
  'agents/core/config/domain_overrides.yaml',
  'agents/leadership/config/domain_overrides.yaml',
  'cagents-memory/_system/config/routing.yaml',
];

const DEFAULT_GOLDEN_RELPATH =
  'cagents-memory/sessions/act_ste100-concise-writing_260910_001/outputs/routability-golden.json';

// Conventional English stopwords + hard-coded corpus-noise words
// (use, used, using, set, pass, mode, modes, metadata, value, invocation, agent, agents, not, for).
// Sorted literal, LC_ALL=C order.
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "agent", "agents", "all", "am", "an",
  "and", "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
  "between", "both", "but", "by", "can", "cannot", "could", "did", "do", "does", "doing",
  "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
  "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in",
  "into", "invocation", "is", "it", "its", "itself", "just", "me", "metadata", "mode", "modes",
  "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "pass", "same", "set",
  "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "use", "used", "using", "value", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", "you",
  "your", "yours", "yourself", "yourselves",
]);

// ---------------------------------------------------------------- primitives

/** LC_ALL=C byte ordering. */
export function byteCompare(a, b) {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** T(s): lowercase, non-[a-z0-9] -> space, split, drop len<2, drop stopwords, distinct. */
export function tokenize(s) {
  if (!s) return new Set();
  const out = new Set();
  for (const tok of String(s).toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/)) {
    if (tok.length < 2) continue;
    if (STOPWORDS.has(tok)) continue;
    out.add(tok);
  }
  return out;
}

function intersectionSize(a, b) {
  let n = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (large.has(t)) n++;
  return n;
}

// ------------------------------------------------------------------- loading

function readAgentDescription(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`no YAML frontmatter in ${absPath}`);
  const block = m[1];
  let desc = null;
  try {
    const fm = yaml.load(block);
    if (fm && typeof fm.description === 'string') desc = fm.description;
  } catch {
    /* fall through to regex */
  }
  if (desc === null) {
    const dm = block.match(/^description:\s*(.*)$/m);
    if (dm) desc = dm[1].trim().replace(/^["'](.*)["']$/s, '$1');
  }
  if (desc === null) throw new Error(`no description field in ${absPath}`);
  return desc;
}

/** Agent filenames, sorted LC_ALL=C. */
export function loadAgents() {
  const files = fs.readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort(byteCompare);
  return files.map((file) => {
    const id = file.slice(0, -3);
    const description = readAgentDescription(path.join(AGENTS_DIR, file));
    return { id, file, description, D: tokenize(description) };
  });
}

/**
 * Flatten the 5 config files into keyword blocks.
 * Handles both shapes: top-level `planner`/`router` (domain_overrides.yaml) and
 * `domains.<name>.planner`/`.router` (routing.yaml).
 */
export function loadBlocks() {
  const blocks = [];
  for (const rel of [...CONFIG_RELPATHS].sort(byteCompare)) {
    const abs = path.join(REPO_ROOT, rel);
    const doc = yaml.load(fs.readFileSync(abs, 'utf8')) || {};
    const units = [];
    if (doc.domains && typeof doc.domains === 'object') {
      for (const d of Object.keys(doc.domains).sort(byteCompare)) {
        units.push({ prefix: `domains.${d}.`, node: doc.domains[d] });
      }
    }
    if (doc.planner || doc.router) units.push({ prefix: '', node: doc });

    for (const { prefix, node } of units) {
      const sr = node && node.planner && node.planner.specialist_routing;
      if (sr && typeof sr === 'object') {
        for (const slug of Object.keys(sr).sort(byteCompare)) {
          const entry = sr[slug] || {};
          blocks.push({
            source: rel,
            source_detail: `${prefix}planner.specialist_routing.${slug}.keywords`,
            kind: 'specialist_routing',
            keywords: Array.isArray(entry.keywords) ? entry.keywords.map(String) : [],
            declared_agents: Array.isArray(entry.agents) ? entry.agents.map(String) : [],
          });
        }
      }
      const rk = node && node.router && node.router.keywords;
      blocks.push({
        source: rel,
        source_detail: `${prefix}router.keywords`,
        kind: 'router',
        keywords: Array.isArray(rk) ? rk.map(String) : [],
        declared_agents: [],
      });
    }
  }
  return blocks;
}

/** K(a) for every agent + the set of declared agent ids with no file on disk. */
export function buildKeywordIndex(agents, blocks) {
  const onDisk = new Set(agents.map((a) => a.id));
  const phrases = new Map(); // agent id -> string[]
  const missing = new Set();
  for (const b of blocks) {
    if (b.kind !== 'specialist_routing') continue;
    for (const declared of b.declared_agents) {
      if (!onDisk.has(declared)) { missing.add(declared); continue; }
      if (!phrases.has(declared)) phrases.set(declared, []);
      phrases.get(declared).push(...b.keywords);
    }
  }
  const K = new Map();
  for (const a of agents) K.set(a.id, tokenize((phrases.get(a.id) || []).join(' ')));
  return { K, missing_agent_ids: [...missing].sort(byteCompare) };
}

export function loadCorpus() {
  const agents = loadAgents();
  const blocks = loadBlocks();
  const { K, missing_agent_ids } = buildKeywordIndex(agents, blocks);
  for (const a of agents) a.K = K.get(a.id);
  return { agents, blocks, missing_agent_ids };
}

// ------------------------------------------------------------------- scoring

/** Ranked scores for a request, highest first, ties by agent filename bytes. */
export function rank(request, agents) {
  const R = tokenize(request);
  return agents
    .map((a) => ({
      id: a.id,
      file: a.file,
      score: intersectionSize(R, a.D) + intersectionSize(R, a.K),
      desc_hits: intersectionSize(R, a.D),
      kw_hits: intersectionSize(R, a.K),
    }))
    .sort((x, y) => (y.score - x.score) || byteCompare(x.file, y.file));
}

/** Selection: highest score, ties -> lexicographically smallest filename. */
export function select(request, agents) {
  return rank(request, agents)[0];
}

// --------------------------------------------------------------------- modes

function resolveGoldenPath(argPath) {
  if (argPath) return path.resolve(argPath);
  if (process.env.ROUTABILITY_GOLDEN) return path.resolve(process.env.ROUTABILITY_GOLDEN);
  return path.join(REPO_ROOT, DEFAULT_GOLDEN_RELPATH);
}

class UsageError extends Error {}

function readGolden(goldenPath) {
  if (!fs.existsSync(goldenPath)) {
    throw new UsageError(`golden file not found: ${goldenPath}`);
  }
  return JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
}

function modeDefault(goldenPath) {
  const { agents } = loadCorpus();
  const golden = readGolden(goldenPath);
  const lines = [];
  for (const c of golden.cases) {
    lines.push(`${c.case_id}\t${c.request}\t${select(c.request, agents).id}`);
  }
  process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
  return 0;
}

function modeCheck(goldenPath) {
  const { agents } = loadCorpus();
  const golden = readGolden(goldenPath);
  const out = [];
  let drift = 0;
  for (const c of golden.cases) {
    const got = select(c.request, agents).id;
    if (got !== c.expected_agent) {
      drift++;
      out.push(`DRIFT ${c.case_id} expected=${c.expected_agent} got=${got}`);
    }
  }
  const n = golden.cases.length;
  out.push(drift === 0 ? `OK ${n} cases` : `DRIFT ${drift}/${n} cases`);
  process.stdout.write(out.join('\n') + '\n');
  return drift === 0 ? 0 : 1;
}

function modeDerive() {
  const { agents, blocks, missing_agent_ids } = loadCorpus();
  const candidates = [];
  const empty_keyword_blocks = [];
  let seq = 0;
  for (const b of blocks) {
    if (b.keywords.length === 0) {
      empty_keyword_blocks.push({ source: b.source, source_detail: b.source_detail });
      continue;
    }
    for (const kw of b.keywords) {
      seq++;
      const request = `can you do the ${kw} for me`;
      const sel = select(request, agents);
      candidates.push({
        candidate_id: `CD-${String(seq).padStart(4, '0')}`,
        keyword: kw,
        request,
        source: b.source,
        source_detail: b.source_detail,
        provenance: 'config-derived',
        declared_agents: b.declared_agents,
        selected_agent: sel.id,
        score: sel.score,
      });
    }
  }
  process.stdout.write(JSON.stringify({
    schema_version: '1',
    generated_by: 'scripts/ste100/routability.sh --derive',
    agent_corpus_count: agents.length,
    candidate_count: candidates.length,
    missing_agent_ids,
    empty_keyword_blocks,
    candidates,
  }, null, 2) + '\n');
  return 0;
}

function main(argv) {
  const args = argv.slice(2);
  let mode = 'default';
  let goldenArg = null;
  for (const a of args) {
    if (a === '--check') mode = 'check';
    else if (a === '--derive') mode = 'derive';
    else if (a === '--help' || a === '-h') {
      process.stdout.write('usage: routability.sh [--check|--derive] [golden.json]\n');
      return 0;
    } else if (a.startsWith('--')) {
      process.stderr.write(`routability: unknown flag ${a}\n`);
      return 2;
    } else goldenArg = a;
  }
  if (mode === 'derive') return modeDerive();
  const goldenPath = resolveGoldenPath(goldenArg);
  return mode === 'check' ? modeCheck(goldenPath) : modeDefault(goldenPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Set exitCode rather than calling process.exit(): process.exit() discards
  // pending async stdout writes, which truncates --derive output on a pipe.
  try {
    process.exitCode = main(process.argv);
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`routability: ${err.message}\n`);
      process.exitCode = 2;
    } else throw err;
  }
}
