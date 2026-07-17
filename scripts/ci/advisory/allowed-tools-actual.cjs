'use strict';
//
// scripts/ci/advisory/allowed-tools-actual.cjs
//
// Advisory validator F1 — allowed-tools vs actual capability use.
//
// Mechanizes the LP1-LP4 rule family from
// docs/example-store/ex-security-allowed-tools-vs-actual.md: build a
// capability inventory from each agent's SKILL.md BODY (signal grep) and diff
// it against the tools DECLARED in that agent's frontmatter `allowed-tools`.
//
//   LP1 (HIGH)   body clearly USES a capability whose tool is NOT declared.
//   LP2 (MEDIUM) wildcard grant (`allowed-tools:` contains `*` / "All tools").
//   LP3 (MEDIUM) a detectable capability with NO `allowed-tools` declaration.
//   LP4 (LOW)    an actionable tool declared but with NO body signal (over-decl).
//
// WARN-only contract (see scripts/ci/advisory/README.md): run() returns a flat
// findings array and MUST NOT throw — everything is wrapped, [] on any error.
//
// Standalone Contract: Node built-ins only (fs, path). No js-yaml needed here
// (frontmatter `allowed-tools` is a single-line scalar we parse directly). No
// new npm deps, no network.
//
// ---------------------------------------------------------------------------
// CONSERVATIVE-BY-DESIGN NOTES (why this does not flood the WARN gate)
// ---------------------------------------------------------------------------
// The cAgents catalog declares broad, near-uniform toolsets as a house default
// (Read/Grep/Glob 58/58, Write 58/58, Bash 56/58, Edit 56/58, Agent 47/58).
// Two design choices keep the finding count sane:
//
//   1. TWO-TIER SIGNALS. Each capability is detected at two strengths: `strong`
//      (an unambiguous use — a backticked shell command, `curl`, the `Agent`
//      tool, ...) and `any` (a generous superset that also matches soft prose
//      like "execute", "download", "coordinate"). LP1 (HIGH — "you use it but
//      didn't declare it") requires a STRONG signal so we never cry HIGH on
//      weak prose. LP4 (LOW — "you declared it but never use it") requires the
//      absence of even the GENEROUS signal, so a tool is only called
//      over-declared when there is truly no hint of the capability.
//
//   2. LP4 TOOL ALLOWLIST. LP4 only considers the tools in LP4_ELIGIBLE_TOOLS.
//      Read/Grep/Glob are excluded (ubiquitous/implicit). Write/Edit/Bash are
//      ALSO excluded from LP4 because they are the cAgents house-default
//      boilerplate — flagging them as "over-declared" would emit dozens of
//      low-value findings on agents that simply carry the standard grant. LP4
//      is therefore scoped to the genuinely-discriminating grants (network +
//      delegation) where a declaration actually implies an intended capability.
//      See the "LP4 tuning" note near LP4_ELIGIBLE_TOOLS.
//
//   3. DELEGATION IS NOT AN LP1 TRIGGER. "Agent" / "spawn" / "delegate" are
//      overloaded concept-words in cAgents prose (graceful-degradation
//      boilerplate, "controllers spawn you", `Agent({...})` invocation-shapes,
//      explicit "does NOT use Agent" negations), so inferring active USE from
//      them is unreliable and produced only false HIGHs. Undeclared bash /
//      network / file-write remain LP1; delegation over-declaration remains LP4.
//
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const AGENTS_DIR = process.env.CAGENTS_AGENTS_DIR
  ? path.resolve(process.env.CAGENTS_AGENTS_DIR)
  : path.join(REPO_ROOT, 'agents');

// ---------------------------------------------------------------------------
// LP4 tuning: which declared-but-unused tools are worth a LOW over-declaration
// note. Measured against the live 58-agent catalog: including Bash/Write/Edit
// here produced a flood of findings on house-default boilerplate (Write is
// declared 58/58, Bash 56/58), so those are intentionally excluded. WebFetch /
// WebSearch (declared by only 2 agents) and Agent (delegation) are the grants
// that actually carry intent, so an over-declaration there is meaningful.
// ---------------------------------------------------------------------------
const LP4_ELIGIBLE_TOOLS = ['WebFetch', 'WebSearch', 'Agent'];

const RULE = {
  LP1: 'allowed-tools-lp1-undeclared',
  LP2: 'allowed-tools-lp2-wildcard',
  LP3: 'allowed-tools-lp3-nodecl',
  LP4: 'allowed-tools-lp4-overdeclared',
};

// ---------------------------------------------------------------------------
// Frontmatter / allowed-tools parsing
// ---------------------------------------------------------------------------

/**
 * extractFrontmatterAndBody(content) — split a SKILL.md into its YAML
 * frontmatter block and the remaining body. Frontmatter is the text between a
 * leading `---` line and the next `---` line. When absent, the whole content is
 * treated as body.
 *
 * @param {string} content
 * @returns {{frontmatter: string, body: string}}
 */
function extractFrontmatterAndBody(content) {
  const text = typeof content === 'string' ? content : '';
  // Must start with a `---` fence (allowing a leading BOM / blank lines).
  const m = /^﻿?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) {
    return { frontmatter: '', body: text };
  }
  const frontmatter = m[1];
  const body = text.slice(m[0].length);
  return { frontmatter, body };
}

/**
 * parseAllowedTools(frontmatter) — read the `allowed-tools` scalar from a
 * frontmatter block and return a normalized declaration descriptor.
 *
 * Accepts space- OR comma-delimited values, and tolerates a bracketed/quoted
 * JSON-ish array form (`["Read", "Write"]`).
 *
 * @param {string} frontmatter
 * @returns {{tools: Set<string>, hasDeclaration: boolean, wildcard: boolean, raw: string|null}}
 */
function parseAllowedTools(frontmatter) {
  const fm = typeof frontmatter === 'string' ? frontmatter : '';
  const m = /^[ \t]*allowed-tools[ \t]*:[ \t]*(.*)$/m.exec(fm);
  if (!m) {
    return { tools: new Set(), hasDeclaration: false, wildcard: false, raw: null };
  }
  const raw = m[1].trim();
  if (raw === '') {
    // `allowed-tools:` present but empty value — treat as "declared nothing".
    return { tools: new Set(), hasDeclaration: true, wildcard: false, raw: '' };
  }
  const wildcard = raw.includes('*') || /all tools/i.test(raw);
  const cleaned = raw.replace(/[[\]"']/g, ' ');
  const tokens = cleaned
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t !== '' && t !== '*');
  return {
    tools: new Set(tokens),
    hasDeclaration: true,
    wildcard,
    raw,
  };
}

// ---------------------------------------------------------------------------
// Capability detection (body signal grep)
// ---------------------------------------------------------------------------

// A backticked inline-code span that starts with a recognizable shell command.
const BACKTICK_SHELL = /`\s*(?:npm|npx|node|yarn|pnpm|git|bash|sh|zsh|pytest|vitest|make|docker|kubectl|cd|ls|grep|sed|awk|cat|echo|mkdir|rm|cp|mv|chmod|chown|curl|wget|python3?|pip3?|go|cargo|tsc|eslint|ruff)\b[^`\n]*`/;

function testAny(patterns, body) {
  for (const p of patterns) {
    if (p.test(body)) return true;
  }
  return false;
}

/**
 * detectCapabilities(body) — grep the SKILL.md body for capability signals.
 *
 * Each capability is reported at two strengths:
 *   - `strong`: an unambiguous use of the capability (drives LP1 HIGH).
 *   - `any`:    a generous superset incl. soft prose (its ABSENCE drives LP4).
 *
 * @param {string} body
 * @returns {{
 *   bash: {strong: boolean, any: boolean},
 *   network: {strong: boolean, any: boolean},
 *   fileWrite: {strong: boolean, any: boolean},
 *   delegation: {strong: boolean, any: boolean},
 * }}
 */
function detectCapabilities(body) {
  const b = typeof body === 'string' ? body : '';

  // --- Bash / shell -------------------------------------------------------
  // STRONG = a real backticked shell command (BACKTICK_SHELL requires a known
  // shell keyword INSIDE the backticks). Deliberately NOT keyed on `run ` or a
  // bare `bash`/`npm `/`git ` token: in cAgents prose "run `cagents:foo`" runs
  // an *agent*, not a shell, and "bash-validator" / "git state" appear as prose
  // — matching those produced false LP1 HIGHs. The example doc's worked case
  // ("then run `npm run migrate`") is still caught by BACKTICK_SHELL.
  const bashStrong = testAny([BACKTICK_SHELL], b);
  const bashAny =
    bashStrong ||
    testAny([/\brun `/, /\bnpm\s/, /\bgit\s/, /\bbash\b/i, /\bexecute\b/i, /\bshell\b/i, /\bcommand[- ]line\b/i, /\bterminal\b/i, /\bscript\b/i], b);

  // --- Network ------------------------------------------------------------
  const netStrong = testAny([/\bWebFetch\b/, /\bWebSearch\b/, /\bcurl\b/, /\bfetch\(/], b);
  const netAny =
    netStrong ||
    testAny([/\bfetch\b/i, /\bweb (?:search|request|page|fetch)\b/i, /\bdownload\b/i, /\bhttps?:\/\//i, /\bAPI call\b/i], b);

  // --- File write ---------------------------------------------------------
  const writeStrong = testAny([/\bWrite\b/, /\bEdit\b/, /create the file/i, /write to\b/i], b);
  const writeAny =
    writeStrong ||
    testAny([/\bwrit(?:e|es|ing|ten)\b/i, /\bcreat(?:e|es|ing)\b/i, /\bedit(?:s|ing)?\b/i, /\bmodif(?:y|ies|ying)\b/i], b);

  // --- Delegation ---------------------------------------------------------
  const delStrong = testAny([/\bAgent\b/, /\bspawn\b/i, /delegate to/i, /\bsubagent/i], b);
  const delAny = delStrong || testAny([/\bdelegat/i, /\bcontroller\b/i, /\bcoordinat/i], b);

  return {
    bash: { strong: bashStrong, any: bashAny },
    network: { strong: netStrong, any: netAny },
    fileWrite: { strong: writeStrong, any: writeAny },
    delegation: { strong: delStrong, any: delAny },
  };
}

function anyStrongCapability(caps) {
  return Boolean(
    caps.bash.strong || caps.network.strong || caps.fileWrite.strong || caps.delegation.strong,
  );
}

// Which detected capability backs a given declared tool (for LP4 over-decl).
function capabilityForTool(tool, caps) {
  switch (tool) {
    case 'Bash':
      return caps.bash;
    case 'WebFetch':
    case 'WebSearch':
      return caps.network;
    case 'Write':
    case 'Edit':
      return caps.fileWrite;
    case 'Agent':
      return caps.delegation;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Declared-vs-used diff
// ---------------------------------------------------------------------------

// Accept either a declaration descriptor {tools, hasDeclaration, wildcard} or a
// bare Array/Set of tool names (convenience for tests).
function normalizeDeclared(declared) {
  if (declared instanceof Set) {
    return { tools: declared, hasDeclaration: declared.size > 0, wildcard: false };
  }
  if (Array.isArray(declared)) {
    return { tools: new Set(declared), hasDeclaration: declared.length > 0, wildcard: false };
  }
  const d = declared && typeof declared === 'object' ? declared : {};
  const tools = d.tools instanceof Set ? d.tools : new Set(Array.isArray(d.tools) ? d.tools : []);
  return {
    tools,
    hasDeclaration: d.hasDeclaration != null ? Boolean(d.hasDeclaration) : tools.size > 0,
    wildcard: Boolean(d.wildcard),
  };
}

/**
 * diffToolsVsCaps(declared, caps, opts) — produce the LP1-LP4 findings for a
 * single agent. Returns partial findings ({ruleId, severity, message}); the
 * caller attaches file/line. Pure and side-effect free.
 *
 * @param {Set<string>|string[]|{tools,hasDeclaration,wildcard}} declared
 * @param {ReturnType<typeof detectCapabilities>} caps
 * @param {{lp4Tools?: string[]}} [opts]
 * @returns {Array<{ruleId: string, severity: string, message: string}>}
 */
function diffToolsVsCaps(declared, caps, opts) {
  const findings = [];
  const info = normalizeDeclared(declared);
  const lp4Tools = (opts && Array.isArray(opts.lp4Tools)) ? opts.lp4Tools : LP4_ELIGIBLE_TOOLS;
  const d = info.tools;

  // LP2: wildcard grant.
  if (info.wildcard) {
    findings.push({
      ruleId: RULE.LP2,
      severity: 'MEDIUM',
      message:
        'allowed-tools declares a wildcard ("*" / "All tools") grant — over-broad; declare the specific tools the agent uses (LP2).',
    });
  }

  // LP3: capability detected but NO allowed-tools declaration at all.
  if (!info.hasDeclaration) {
    if (anyStrongCapability(caps)) {
      const used = [];
      if (caps.bash.strong) used.push('Bash');
      if (caps.network.strong) used.push('WebFetch/WebSearch');
      if (caps.fileWrite.strong) used.push('Write/Edit');
      if (caps.delegation.strong) used.push('Agent');
      findings.push({
        ruleId: RULE.LP3,
        severity: 'MEDIUM',
        message: `Body uses ${used.join(', ')} but the agent declares no allowed-tools at all — declare the tools it uses (LP3).`,
      });
    }
    // With no declaration, LP1 (undeclared) and LP4 (over-declared) are moot.
    return findings;
  }

  // LP1: body STRONGLY uses a capability whose tool is not declared.
  if (caps.bash.strong && !d.has('Bash')) {
    findings.push({
      ruleId: RULE.LP1,
      severity: 'HIGH',
      message:
        "Body uses a shell/Bash capability (backticked command or \"run `...`\") but 'Bash' is not in allowed-tools (LP1).",
    });
  }
  if (caps.network.strong && !(d.has('WebFetch') || d.has('WebSearch'))) {
    findings.push({
      ruleId: RULE.LP1,
      severity: 'HIGH',
      message:
        "Body uses a network capability (WebFetch/WebSearch/curl/fetch()) but neither 'WebFetch' nor 'WebSearch' is in allowed-tools (LP1).",
    });
  }
  if (caps.fileWrite.strong && !(d.has('Write') || d.has('Edit'))) {
    findings.push({
      ruleId: RULE.LP1,
      severity: 'HIGH',
      message:
        "Body uses a file-write capability (Write/Edit/\"create the file\") but neither 'Write' nor 'Edit' is in allowed-tools (LP1).",
    });
  }
  // NOTE: delegation is intentionally NOT an LP1 (undeclared-use) trigger.
  // In cAgents prose "Agent" / "spawn" are overloaded concept-words — reviewers
  // and support agents document how the LEAD spawns THEM (passive "spawns you",
  // an `Agent({...})` invocation-shape) and even state "does NOT use Agent" —
  // so an active-use inference from those tokens is ~100% false here. Delegation
  // over-declaration is still surfaced at LOW via LP4 (see LP4_ELIGIBLE_TOOLS).

  // LP4: an actionable tool is declared but the body shows NO signal (not even
  // the generous `any` signal) for the capability it grants.
  for (const tool of lp4Tools) {
    if (!d.has(tool)) continue;
    const cap = capabilityForTool(tool, caps);
    if (cap && !cap.any) {
      findings.push({
        ruleId: RULE.LP4,
        severity: 'LOW',
        message: `'${tool}' is declared in allowed-tools but the body shows no sign of using that capability (over-declaration, LP4).`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Catalog walk + run()
// ---------------------------------------------------------------------------

function walkSkillFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    try {
      if (ent.isDirectory()) {
        out.push(...walkSkillFiles(full));
      } else if (ent.isFile() && ent.name === 'SKILL.md') {
        out.push(full);
      }
    } catch {
      // ignore unreadable entries
    }
  }
  return out;
}

function scanFile(file) {
  const out = [];
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return out;
  }
  const rel = path.relative(REPO_ROOT, file);
  const { frontmatter, body } = extractFrontmatterAndBody(content);
  const declared = parseAllowedTools(frontmatter);
  const caps = detectCapabilities(body);
  const partials = diffToolsVsCaps(declared, caps);
  for (const p of partials) {
    out.push({
      ruleId: p.ruleId,
      severity: p.severity,
      file: rel,
      line: null,
      message: p.message,
    });
  }
  return out;
}

function run() {
  try {
    const files = walkSkillFiles(AGENTS_DIR).sort();
    const findings = [];
    for (const f of files) {
      try {
        findings.push(...scanFile(f));
      } catch {
        // per-file guard: never let one bad file abort the whole scan
      }
    }
    return findings;
  } catch {
    return [];
  }
}

module.exports = {
  meta: {
    id: 'allowed-tools-actual',
    description: 'Agent allowed-tools vs actual capability use (LP1-LP4, WARN-only)',
  },
  run,
  // Exported pure helpers (used by tests + reuse):
  extractFrontmatterAndBody,
  parseAllowedTools,
  detectCapabilities,
  diffToolsVsCaps,
  LP4_ELIGIBLE_TOOLS,
  RULE,
};
