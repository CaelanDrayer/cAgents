'use strict';
//
// scripts/ci/advisory/agent-content-scan.cjs
//
// Advisory validator (F3 + F4) — WARN-only. Never fails CI; never throws.
//
//   F3 desc-mismatch (MEDIUM): an agent's top-level `description:` claims a
//       scope that contradicts its declared `allowed-tools` (or names a tool
//       capability the declaration does not cover). Kept to CLEAR contradictions
//       — e.g. "read-only analysis agent" whose allowed-tools grants Write/Edit.
//
//   F4 content-security:
//       content-exec-in-prose (HIGH)  — an actual executable-looking
//           pipe-to-shell / decode-to-shell / eval(<untrusted>) / credential
//           exfil construct in a SKILL.md body or a hook .cjs source.
//       content-injection-string (MEDIUM) — a prompt-injection data string
//           ("ignore previous instructions"-style) presented as data-to-follow.
//
// FALSE-POSITIVE CONTROLS (critical — prefer few high-signal findings):
//   1. Whole-file skip when the path marks it as security / attack-surface
//      content (security-engineer agent, owasp/threat paths, the security hooks
//      that legitimately carry attack patterns as DETECTION material).
//   2. Per-match skip when the nearest markdown heading / preceding comment
//      window marks the surrounding block as attack-surface documentation.
//   3. Only genuine EXECUTABLE constructs match. A bare mention of "curl",
//      "mcp", or the word "injection" as a topic is NEVER a finding.
//
// Standalone Contract: Node built-ins + guarded js-yaml only. No new deps, no
// network.
//
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const HOOKS_DIR = path.join(REPO_ROOT, '.claude', 'hooks');

// Guarded js-yaml — the sole declared external dep. Fall back to a minimal line
// parser if node_modules is absent so the validator never crashes at load.
let yaml = null;
try {
  yaml = require('js-yaml');
} catch {
  yaml = null;
}

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

// Split a SKILL.md into { fm, body, frontmatterLines }. `frontmatterLines` is
// the number of lines consumed by the leading `--- ... ---` block, so a body
// line index can be mapped back to a 1-based file line.
function splitFrontmatter(text) {
  if (typeof text !== 'string') return { fm: {}, body: '', frontmatterLines: 0 };
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return { fm: {}, body: text, frontmatterLines: 0 };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { fm: {}, body: text, frontmatterLines: 0 };
  const fmText = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { fm: parseFrontmatter(fmText), body, frontmatterLines: end + 1 };
}

function parseFrontmatter(fmText) {
  if (yaml) {
    try {
      const doc = yaml.load(fmText);
      if (doc && typeof doc === 'object') return doc;
    } catch {
      // fall through to the minimal parser
    }
  }
  return minimalParseFrontmatter(fmText);
}

// Minimal top-level `key: value` extraction (only what F3 needs) for the
// no-js-yaml degraded path.
function minimalParseFrontmatter(fmText) {
  const out = {};
  for (const line of String(fmText || '').split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in out)) out[m[1]] = val;
  }
  return out;
}

function getDescription(fm) {
  if (!fm || typeof fm !== 'object') return '';
  if (typeof fm.description === 'string') return fm.description;
  if (fm.metadata && typeof fm.metadata.description === 'string') {
    return fm.metadata.description;
  }
  return '';
}

// Normalize `allowed-tools` (space/comma separated string), legacy `tools`
// (array), or a nested metadata copy into a lowercased token set.
function getAllowedTools(fm) {
  if (!fm || typeof fm !== 'object') return new Set();
  const raw =
    fm['allowed-tools'] != null
      ? fm['allowed-tools']
      : fm.tools != null
        ? fm.tools
        : fm.metadata && fm.metadata['allowed-tools'] != null
          ? fm.metadata['allowed-tools']
          : null;
  const tokens = [];
  if (Array.isArray(raw)) {
    for (const t of raw) if (t != null) tokens.push(String(t));
  } else if (typeof raw === 'string') {
    for (const t of raw.split(/[\s,]+/)) if (t) tokens.push(t);
  }
  return new Set(tokens.map((t) => t.toLowerCase()));
}

// ---------------------------------------------------------------------------
// F3: description ↔ allowed-tools / body mismatch
// ---------------------------------------------------------------------------

const MUTATING_TOOLS = ['write', 'edit', 'bash'];

// The description asserts a read-only / non-mutating / analysis-only scope.
const READONLY_CLAIM_RES = [
  /\bread[-\s]?only\b/i,
  /\banalysis[-\s]only\b/i,
  /\bnon[-\s]?mutating\b/i,
  /\bpurely (?:analytical|advisory|read)\b/i,
  /\b(?:does not|doesn't|do not|never|will not|won't|cannot|can't)\s+(?:write|modify|edit|mutate|change|alter)s?\b/i,
  /\bno\s+(?:writes?|edits?|modifications?|code changes?|file changes?)\b/i,
  /\bwithout\s+(?:writing|modifying|editing|mutating|changing)\b/i,
  /\bread[-\s]?only\s+(?:scan|analysis|audit|inspection|agent)\b/i,
];

// Positive write-CAPABILITY verbs. If the description also advertises one of
// these, it is a mixed-mode agent (e.g. a detect+rewrite agent) and the
// read-only phrase is scoped to one mode — NOT a clean contradiction. These are
// chosen so they do NOT appear inside a read-only NEGATION: e.g. bare
// "writes"/"modifies"/"edits" are deliberately excluded because they occur in
// phrases like "never writes or modifies files".
const WRITE_CAP_RE =
  /\b(?:rewrit\w*|humaniz\w*|implement\w*|generat\w*|creat\w*|build\w*|refactor\w*|author\w*|produc\w*|synthesiz\w*|draft\w*|scaffold\w*)/i;

// Rule B: a specific tool NAMED in the description that the declaration must
// grant. Deliberately narrow (explicit phrasings only) to stay low-noise.
const NAMED_TOOL_CLAIMS = [
  {
    tool: 'websearch',
    label: 'web-search',
    res: [/\bwebsearch\b/i, /\bweb search(?:es|ing)?\b/i, /\bsearch(?:es)? the web\b/i],
  },
  {
    tool: 'webfetch',
    label: 'web-fetch',
    res: [/\bwebfetch\b/i, /\bfetch(?:es)? (?:a )?url\b/i, /\bfetch(?:es)? web (?:pages?|content)\b/i],
  },
];

function bodyMentionsTool(body, tool) {
  if (!body) return false;
  const b = body.toLowerCase();
  if (b.includes(tool)) return true;
  if (tool === 'websearch') return b.includes('web search') || b.includes('websearch');
  if (tool === 'webfetch') return b.includes('web fetch') || b.includes('webfetch');
  return false;
}

// Pure helper: returns finding-shaped objects (no `file`; caller attaches path +
// resolves the best-effort line). Exported for direct unit testing.
function checkDescriptionMismatch(fm, body) {
  const findings = [];
  try {
    const desc = getDescription(fm) || '';
    if (!desc) return findings;
    const tools = getAllowedTools(fm);
    const grantedMutating = MUTATING_TOOLS.filter((t) => tools.has(t));

    // Rule A: read-only claim + mutating tools (and not a mixed-mode agent).
    const claimsReadOnly = READONLY_CLAIM_RES.some((re) => re.test(desc));
    if (claimsReadOnly && grantedMutating.length > 0 && !WRITE_CAP_RE.test(desc)) {
      const pretty = grantedMutating
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join('/');
      findings.push({
        ruleId: 'desc-mismatch',
        severity: 'MEDIUM',
        line: null,
        message:
          `description claims a read-only / non-mutating scope but allowed-tools ` +
          `grants ${pretty} — reconcile the description or narrow the tools`,
      });
    }

    // Rule B: description names a tool capability the declaration lacks.
    for (const claim of NAMED_TOOL_CLAIMS) {
      const named = claim.res.some((re) => re.test(desc));
      if (named && !tools.has(claim.tool) && !bodyMentionsTool(body, claim.tool)) {
        findings.push({
          ruleId: 'desc-mismatch',
          severity: 'MEDIUM',
          line: null,
          message:
            `description advertises ${claim.label} capability but ` +
            `${claim.tool === 'websearch' ? 'WebSearch' : 'WebFetch'} is not in ` +
            `allowed-tools (and the body never exercises it)`,
        });
      }
    }
  } catch {
    return [];
  }
  return findings;
}

// ---------------------------------------------------------------------------
// F4: content security scan
// ---------------------------------------------------------------------------

// HIGH — genuinely executable-looking constructs. A bare "curl" never matches:
// each requires a pipe-to-shell, a decode-to-shell, an eval of untrusted data,
// or a curl/wget exfil of a credential.
const EXEC_RES = [
  {
    // curl/wget … | (sudo) sh|bash   (download-pipe-to-shell)
    re: /\b(?:curl|wget|fetch)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|k|da)?sh\b/i,
    label: 'pipe-to-shell (download | shell)',
  },
  {
    // base64 -d … | sh|bash   OR   … | base64 -d | sh|bash   (decode-to-shell)
    re: /\bbase64\b[^\n|]*(?:-d|--decode)\b[^\n]*\|\s*(?:ba|z)?sh\b|\|\s*base64\s+(?:-d|--decode)\s*\|\s*(?:ba|z)?sh\b/i,
    label: 'decode-to-shell (base64 -d | shell)',
  },
  {
    // eval( <untrusted source> )  — response/body/input/atob/fetch/etc.
    re: /\beval\s*\(\s*[^)]*\b(?:atob|req|request|response|resp|body|input|params|query|fetch|http|user[_\s]?input|payload|decode|base64|stdin|process\.env)\b[^)]*\)/i,
    label: 'eval() of untrusted input',
  },
  {
    // curl/wget POST/upload of a credential/secret/key to a URL (exfil)
    re: /\b(?:curl|wget)\b[^\n]*(?:-d|--data(?:-binary|-raw)?|-F|--upload-file|--post-file)\b[^\n]*(?:token|secret|password|passwd|api[_-]?key|\.aws\/credentials|\.ssh\/|id_rsa|private[_-]?key|process\.env|\$\{?[A-Z_]*(?:TOKEN|SECRET|KEY|PASS|CRED))/i,
    label: 'credential exfil to network sink',
  },
];

// MEDIUM — prompt-injection data strings presented as instructions-to-follow.
// The bare word "injection" never matches.
const INJECTION_RES = [
  {
    re: /\bignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier|preceding|foregoing)\s+(?:instructions?|prompts?|directions?|messages?|context)\b/i,
    label: 'prompt-injection ("ignore previous instructions")',
  },
  {
    re: /\bdisregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier|any)\s+(?:instructions?|prompts?|rules?|directions?)\b/i,
    label: 'prompt-injection ("disregard previous …")',
  },
  {
    re: /\bforget\s+(?:all\s+)?(?:your\s+)?(?:previous|prior|earlier|the above)\s+(?:instructions?|training|rules?|prompts?)\b/i,
    label: 'prompt-injection ("forget previous instructions")',
  },
  {
    re: /\byou\s+are\s+now\s+(?:in\s+)?(?:a\s+)?(?:DAN\b|jailbroken|jailbreak|unrestricted|developer\s+mode|do\s+anything\s+now)/i,
    label: 'jailbreak persona injection',
  },
];

// Attack-surface / detection-context markers. When any appears in the nearest
// heading or the preceding-comment window, the match is documentation about an
// attack, not an attack — suppress it.
const ATTACK_MARKER_RE =
  /\b(?:security|attack|threat|owasp|exploit\w*|vulnerab\w*|malicious|prompt[-\s]?injection|injection|pentest|penetration|adversar\w*|denylist|blocklist|blocked|forbidden|sanitiz\w*|guard\w*|detect\w*|pattern|regex|do not run|never run|example of|as an attack|red[-\s]?team|CWE-|jailbreak)\b/i;

// Filenames of hooks that legitimately carry attack patterns as detection
// material (they ARE the security scanners). Whole-file skip.
const SECURITY_HOOK_BASENAMES = new Set([
  'bash-validator.cjs',
  'bash-guard-evaluator.cjs',
  'secret-detection.cjs',
  'secret-restore.cjs',
  'controller-delegation-validator.cjs',
  'agent-content-scan.cjs',
]);

function isSecurityContextPath(filePath) {
  const p = String(filePath || '').replace(/\\/g, '/').toLowerCase();
  if (!p) return false;
  // Security / attack-surface agents and docs.
  if (
    /(?:^|\/)security[-/]/.test(p) ||
    p.includes('security-engineer') ||
    p.includes('/owasp') ||
    p.includes('threat-model') ||
    p.includes('threat_model') ||
    p.includes('attack-surface') ||
    p.includes('pentest')
  ) {
    return true;
  }
  // Security hook sources.
  const base = p.split('/').pop();
  if (SECURITY_HOOK_BASENAMES.has(base)) return true;
  return false;
}

// Is the match at line `idx` inside a block that documents an attack? Look at
// the nearest markdown heading above and a small preceding window (comments /
// list context).
function isAttackSurfaceContext(lines, idx) {
  // Same line + preceding window.
  const start = Math.max(0, idx - 6);
  for (let i = start; i <= idx; i++) {
    if (ATTACK_MARKER_RE.test(lines[i])) return true;
  }
  // Nearest markdown heading above.
  for (let i = idx; i >= 0; i--) {
    const h = /^#{1,6}\s+(.*)$/.exec(lines[i]);
    if (h) {
      if (ATTACK_MARKER_RE.test(h[1])) return true;
      break; // stop at the first heading above
    }
  }
  return false;
}

function excerpt(line) {
  const s = String(line || '').trim().replace(/\s+/g, ' ');
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

// Pure helper: scan arbitrary text for F4 constructs. Exported for direct unit
// testing. `filePath` drives the whole-file security-context skip.
function scanContentSecurity(text, filePath) {
  const findings = [];
  try {
    if (typeof text !== 'string' || !text) return findings;
    if (isSecurityContextPath(filePath)) return findings;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // HIGH: executable constructs (one per line).
      let hitExec = false;
      for (const rule of EXEC_RES) {
        if (rule.re.test(line)) {
          if (!isAttackSurfaceContext(lines, i)) {
            findings.push({
              ruleId: 'content-exec-in-prose',
              severity: 'HIGH',
              line: i + 1,
              message: `${rule.label}: ${excerpt(line)}`,
            });
            hitExec = true;
          }
          break;
        }
      }
      if (hitExec) continue;

      // MEDIUM: injection strings (one per line).
      for (const rule of INJECTION_RES) {
        if (rule.re.test(line)) {
          if (!isAttackSurfaceContext(lines, i)) {
            findings.push({
              ruleId: 'content-injection-string',
              severity: 'MEDIUM',
              line: i + 1,
              message: `${rule.label}: ${excerpt(line)}`,
            });
          }
          break;
        }
      }
    }
  } catch {
    return [];
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Filesystem walk
// ---------------------------------------------------------------------------

function walkSkillFiles(dir, acc) {
  // v12.68.0: agent definitions are FLAT (agents/<name>.md) because Claude
  // Code discovers plugin agents with a non-recursive scan of agents/. Files
  // in subdirectories are per-agent resources, not definitions.
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    acc.push(path.join(dir, e.name));
  }
  return acc;
}

function listHookSources() {
  let entries;
  try {
    entries = fs.readdirSync(HOOKS_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith('.cjs'))
    .sort()
    .map((f) => path.join(HOOKS_DIR, f));
}

// Best-effort: line number (1-based) of the `description:` key in the raw text.
function descriptionLine(text) {
  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*description:/.test(lines[i])) return i + 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// run()
// ---------------------------------------------------------------------------

function run() {
  const findings = [];
  try {
    // F3 + F4 over agents/**/SKILL.md
    const skills = walkSkillFiles(AGENTS_DIR, []);
    for (const abs of skills) {
      const rel = path.relative(REPO_ROOT, abs);
      let text = '';
      try {
        text = fs.readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      const { fm, body, frontmatterLines } = splitFrontmatter(text);

      const descLine = descriptionLine(text);
      for (const f of checkDescriptionMismatch(fm, body)) {
        findings.push({
          ruleId: f.ruleId,
          severity: f.severity,
          file: rel,
          line: f.line != null ? f.line : descLine,
          message: f.message,
        });
      }

      for (const f of scanContentSecurity(body, rel)) {
        findings.push({
          ruleId: f.ruleId,
          severity: f.severity,
          file: rel,
          line: f.line != null ? f.line + frontmatterLines : null,
          message: f.message,
        });
      }
    }

    // F4 over .claude/hooks/*.cjs source
    for (const abs of listHookSources()) {
      const rel = path.relative(REPO_ROOT, abs);
      let text = '';
      try {
        text = fs.readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      for (const f of scanContentSecurity(text, rel)) {
        findings.push({
          ruleId: f.ruleId,
          severity: f.severity,
          file: rel,
          line: f.line,
          message: f.message,
        });
      }
    }
  } catch {
    return [];
  }
  return findings;
}

module.exports = {
  meta: {
    id: 'agent-content-scan',
    description:
      'F3 description↔tools mismatch + F4 content-security scan of agent SKILL.md and hook sources (WARN-only)',
  },
  run,
  // Exported pure helpers for unit testing.
  checkDescriptionMismatch,
  scanContentSecurity,
  isSecurityContextPath,
  isAttackSurfaceContext,
  splitFrontmatter,
  getAllowedTools,
  getDescription,
};
