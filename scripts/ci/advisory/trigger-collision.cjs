'use strict';
//
// scripts/ci/advisory/trigger-collision.cjs
//
// Advisory validator F2 — trigger-collision / trigger-abuse (WARN-only).
//
// Mechanizes the TR1-3 checks distilled in
// docs/example-store/ex-security-trigger-collision-abuse.md (from
// NVIDIA/SkillSpector static_patterns_supply_chain.py):
//
//   TR1 over-broad   — a trigger that is a single very-common word or <=2 chars
//                      (e.g. `go`, `do`, `xy`) fires on unrelated prompts. MEDIUM.
//   TR2 shadow       — a trigger that collides with a reserved skill/built-in
//                      name (act, team, designer, helper, run, memory, init)
//                      when declared by a DIFFERENT owner than the reserved
//                      name's owner. HIGH.
//   TR3 keyword-bait — a description phrase engineered to over-activate
//                      regardless of fit ("use this whenever the user says
//                      anything", "always use this", "for any request"). MEDIUM.
//
// It scans the `TRIGGER:` clause + `description:` frontmatter of the four skills
// (.claude/skills/*/SKILL.md) and the `description:` frontmatter of every agent
// (agents/**/SKILL.md, excluding _deprecated/). Only *declared* trigger keywords
// (comma-separated TRIGGER: entries) are classified for TR1/TR2; the description
// text is scanned for TR3 baiting phrases. Agent SKILL.md *bodies* are NOT
// scanned (they are full of legitimate "always use parameterized queries"-style
// advice that is not trigger-baiting).
//
// CONSERVATIVE by design: the four shipped skills legitimately own their own
// trigger words, so an owner is never flagged for its own name (TR2) or a
// name-rooted trigger (TR1). Against the live catalog this validator emits 0
// findings — its value is catching a FUTURE skill/agent that claims a colliding
// or over-broad trigger.
//
// Standalone Contract: Node built-ins only (fs, path) + guarded js-yaml. No new
// npm deps, no network. run() NEVER throws — it wraps and returns [] on error.
//
// Env override (hermetic tests): CAGENTS_TRIGGER_ROOT — scan root (default: repo
// root, resolved from __dirname).
//
const fs = require('fs');
const path = require('path');

// Reserved skill + built-in command names a trigger must not shadow (TR2).
//
// D8 (`run` -> `act` rename): `run` moved from RESERVED_SKILLS to
// RESERVED_BUILTINS because Claude Code shipped its own built-in `run` skill,
// which shadowed the cAgents `run` skill — the exact TR2 failure this validator
// models, hit for real. cAgents therefore renamed its skill to `act`; the
// harness now owns `run`.
//
// `run` is deliberately RETAINED as a built-in rather than deleted: it must keep
// firing TR2 so a future cAgents skill cannot silently re-shadow the harness's
// `run`. Only its classification changed (the TR2 message now reads "built-in"
// instead of "skill"), never its reserved status.
const RESERVED_SKILLS = new Set(['act', 'team', 'designer', 'helper']);
const RESERVED_BUILTINS = new Set(['run', 'memory', 'init']);
const RESERVED_NAMES = new Set([...RESERVED_SKILLS, ...RESERVED_BUILTINS]);

// Ultra-generic single words that fire on virtually any prompt (TR1). Kept
// deliberately narrow: specific verbs the real skills use (fix, build, create,
// design, implement, parallel, swarm, strategic) are NOT here — only words that
// carry no routing signal at all.
const GENERIC_WORDS = new Set([
  'help', 'run', 'go', 'do', 'it', 'this', 'that', 'these', 'those',
  'use', 'using', 'make', 'made', 'get', 'got', 'set', 'thing', 'things',
  'stuff', 'any', 'all', 'work', 'task', 'now', 'please', 'ok', 'okay',
  'yes', 'plan', 'one', 'some', 'item', 'items', 'more', 'new', 'up', 'down',
]);

// TR3 keyword-baiting phrases: engineered to maximize activation regardless of
// fit. Deliberately multi-word/specific so ordinary "Use when ..." / "Execute
// any task ..." descriptions never match.
const BAITING_PATTERNS = [
  /use\s+this\s+whenever/i,
  /whenever\s+the\s+user\s+(?:says|mentions|asks|types|writes|does)\s+anything/i,
  /for\s+any\s+request/i,
  /for\s+any\s+prompt/i,
  /for\s+anything(?:\s+(?:and|at)\s+everything)?/i,
  /for\s+everything/i,
  /always\s+use\s+(?:this|me|it)\b/i,
  /use\s+(?:this|me|it)\s+for\s+(?:all|any|every)\b/i,
  /use\s+this\s+for\s+everything/i,
  /no\s+matter\s+what\s+the\s+user/i,
  /any\s+time\s+the\s+user\s+(?:says|mentions|asks|types)/i,
  /catch[- ]all\s+for\s+any/i,
];

const MIN_PREFIX = 4; // owner<->trigger prefix-exemption floor (avoids "do" ~ "documentation")

/**
 * parseTriggers(clause) — split a `TRIGGER:` clause into normalized keywords.
 * Comma-separated; each entry lowercased + trimmed; empties dropped.
 * @returns {string[]}
 */
function parseTriggers(clause) {
  if (!clause || typeof clause !== 'string') return [];
  return clause
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * extractTriggerClauses(text) — pull every `TRIGGER: ...` clause out of text.
 * A clause runs from `TRIGGER:` up to the first period or newline.
 * @returns {string[]}
 */
function extractTriggerClauses(text) {
  if (!text || typeof text !== 'string') return [];
  const clauses = [];
  const re = /TRIGGER:\s*([^.\n]*)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] && m[1].trim()) clauses.push(m[1].trim());
  }
  return clauses;
}

// owner-exemption for TR1: an owner legitimately claims its own name or a
// name-rooted trigger (e.g. skill "helper" claiming "help").
function isOwnerRooted(trigger, owner) {
  if (!owner) return false;
  if (trigger === owner) return true;
  if (owner.startsWith(trigger) && trigger.length >= MIN_PREFIX) return true;
  if (trigger.startsWith(owner) && owner.length >= MIN_PREFIX) return true;
  return false;
}

/**
 * classifyTrigger(trigger, owner) — classify one declared trigger keyword.
 * Returns an array of matched rules (a trigger can be both over-broad AND a
 * shadow). Each entry: { ruleId, severity, reason }.
 */
function classifyTrigger(trigger, owner) {
  const out = [];
  const t = (trigger == null ? '' : String(trigger)).trim().toLowerCase();
  const o = (owner == null ? '' : String(owner)).trim().toLowerCase();
  if (!t) return out;

  const words = t.split(/\s+/);
  const isSingleWord = words.length === 1;

  // TR2 — shadow reserved name (cross-owner only; exact self-ownership exempt).
  if (RESERVED_NAMES.has(t) && t !== o) {
    const kind = RESERVED_SKILLS.has(t) ? 'skill' : 'built-in';
    out.push({
      ruleId: 'trigger-tr2-shadow',
      severity: 'HIGH',
      reason: `Trigger "${t}" (declared by "${o || 'unknown'}") shadows the reserved ${kind} name "${t}" — the router will mis-route.`,
    });
  }

  // TR1 — over-broad single common word or <=2 chars (owner-name-rooted exempt).
  if (!isOwnerRooted(t, o)) {
    const tooShort = t.length <= 2;
    const tooGeneric = isSingleWord && GENERIC_WORDS.has(t);
    if (tooShort || tooGeneric) {
      const why = tooShort
        ? `is only ${t.length} character(s)`
        : 'is a single very-common word';
      out.push({
        ruleId: 'trigger-tr1-overbroad',
        severity: 'MEDIUM',
        reason: `Trigger "${t}" (declared by "${o || 'unknown'}") ${why} and fires on unrelated prompts — use a multi-word, specific phrase.`,
      });
    }
  }

  return out;
}

/**
 * classifyBaiting(text) — return the matched keyword-baiting phrase, or null.
 */
function classifyBaiting(text) {
  if (!text || typeof text !== 'string') return null;
  for (const re of BAITING_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

// ---- Scanning ---------------------------------------------------------------

function loadYaml() {
  try {
    return require('js-yaml');
  } catch {
    return null;
  }
}

// Extract { name, description } from a SKILL.md's YAML frontmatter block.
// Uses guarded js-yaml, with a regex fallback when js-yaml is unavailable or the
// block does not parse cleanly.
function parseFrontmatter(text, fallbackName) {
  let name = fallbackName || '';
  let description = '';
  const fmMatch = /^---\n([\s\S]*?)\n---/m.exec(text);
  const block = fmMatch ? fmMatch[1] : '';

  const yaml = loadYaml();
  if (yaml && block) {
    try {
      const doc = yaml.load(block);
      if (doc && typeof doc === 'object') {
        if (doc.name != null) name = String(doc.name);
        if (doc.description != null) description = String(doc.description);
      }
    } catch {
      /* fall through to regex */
    }
  }

  if (!description) {
    const dm = /^description:\s*(.+)$/m.exec(block || text);
    if (dm) {
      description = dm[1].trim().replace(/^["']/, '').replace(/["']$/, '');
    }
  }
  if (name === (fallbackName || '')) {
    const nm = /^name:\s*(.+)$/m.exec(block || text);
    if (nm) name = nm[1].trim().replace(/^["']/, '').replace(/["']$/, '');
  }
  return { name, description };
}

// 1-based line number of the first line matching `re`, or null.
function lineOf(text, re) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1;
  }
  return null;
}

// Recursively collect SKILL.md files under dir, skipping _deprecated/ buckets.
function collectSkillMd(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (ent.name === '_deprecated') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectSkillMd(full));
    } else if (ent.isFile() && ent.name === 'SKILL.md') {
      out.push(full);
    }
  }
  return out;
}

// Discover the scan targets: { file, kind } where kind is 'skill' | 'agent'.
function discoverTargets(root) {
  const targets = [];
  const skillsDir = path.join(root, '.claude', 'skills');
  let skillEntries;
  try {
    skillEntries = fs.readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    skillEntries = [];
  }
  for (const ent of skillEntries) {
    if (!ent.isDirectory()) continue;
    const f = path.join(skillsDir, ent.name, 'SKILL.md');
    if (fs.existsSync(f)) targets.push({ file: f, kind: 'skill' });
  }
  for (const f of collectSkillMd(path.join(root, 'agents'))) {
    targets.push({ file: f, kind: 'agent' });
  }
  return targets;
}

function scanRoot(root) {
  const findings = [];
  const targets = discoverTargets(root);

  for (const { file, kind } of targets) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(root, file);
    const fallbackName = path.basename(path.dirname(file));
    const { name, description } = parseFrontmatter(text, fallbackName);
    const owner = (name || fallbackName || '').toLowerCase();

    // TRIGGER keyword source: skills may declare TRIGGER: in the description or
    // body; agents only in the description frontmatter. Never scan agent bodies.
    const triggerSource = kind === 'skill' ? text : description;
    const clauses = extractTriggerClauses(triggerSource);
    const seenTrigger = new Set();
    const descLine = lineOf(text, /^description:/) || null;

    for (const clause of clauses) {
      for (const trigger of parseTriggers(clause)) {
        for (const hit of classifyTrigger(trigger, owner)) {
          const dedupeKey = `${hit.ruleId}|${trigger}`;
          if (seenTrigger.has(dedupeKey)) continue;
          seenTrigger.add(dedupeKey);
          findings.push({
            ruleId: hit.ruleId,
            severity: hit.severity,
            file: rel,
            line: descLine,
            message: hit.reason,
          });
        }
      }
    }

    // TR3 — keyword-baiting: description text only (both skills and agents).
    const bait = classifyBaiting(description);
    if (bait) {
      findings.push({
        ruleId: 'trigger-tr3-baiting',
        severity: 'MEDIUM',
        file: rel,
        line: descLine,
        message: `Description of "${owner}" contains keyword-baiting phrase "${bait}" engineered to over-activate regardless of fit — describe when it genuinely applies instead.`,
      });
    }
  }

  return findings;
}

function run() {
  try {
    const root = process.env.CAGENTS_TRIGGER_ROOT
      ? path.resolve(process.env.CAGENTS_TRIGGER_ROOT)
      : path.resolve(__dirname, '..', '..', '..');
    return scanRoot(root);
  } catch {
    return [];
  }
}

module.exports = {
  meta: {
    id: 'trigger-collision',
    description:
      'Flags over-broad (TR1), reserved-name-shadowing (TR2), and keyword-baiting (TR3) skill/agent triggers.',
  },
  run,
  // Exported pure helpers for hermetic testing.
  parseTriggers,
  extractTriggerClauses,
  classifyTrigger,
  classifyBaiting,
  isOwnerRooted,
  scanRoot,
  RESERVED_NAMES,
  RESERVED_SKILLS,
  RESERVED_BUILTINS,
  GENERIC_WORDS,
};
