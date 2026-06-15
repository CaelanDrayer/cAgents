#!/usr/bin/env node
/**
 * Secret Detection + Path Protection Hook - Block secrets and protected paths
 * cAgents V9.10 - Refactored (merged pre-write.sh path protection)
 *
 * Runs BEFORE Write/Edit operations to:
 * 1. Block writes to protected system paths (from pre-write.sh)
 * 2. Detect and block secrets in file content
 *
 * Input (stdin): JSON with tool_name, tool_input (file_path, content)
 * Output (stdout): JSON with permission decision
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createHook, AGENT_MEMORY_DIR, ensureDir, withFileLock } = require('./hook-utils.cjs');

// v12.0.4 (REC-1): opt-in sanitize-and-restore mode.
// Default mode "block" preserves pre-v12.0.4 pure-deny semantics.
// Mode "sanitize" replaces secrets with BLOCK_<hex> placeholders, backs up the
// original content under cagents-memory/_system/secret-backups/{session}/, and
// the companion Stop hook (secret-restore.cjs) restores files at session end.
function getSecretMode() {
  const raw = (process.env.CAGENTS_SECRET_MODE || 'block').toLowerCase();
  return raw === 'sanitize' ? 'sanitize' : 'block';
}

function getSessionIdForBackup(input) {
  // Deterministic chain per .claude/rules/core/hooks.md Concurrency Contract:
  // explicit input.session_id → env var → "_no-session" bucket.
  // No heuristic fallback — refusing to silently route to another instance's session.
  if (input && typeof input.session_id === 'string' && input.session_id) {
    return input.session_id;
  }
  if (process.env.CAGENTS_ACTIVE_SESSION) {
    return process.env.CAGENTS_ACTIVE_SESSION;
  }
  // Fallback: no session context — bucket under "_no-session" so the operator
  // can still find backups if a sanitize-mode hook fires outside a session.
  return '_no-session';
}

function getBackupDir(sessionId) {
  return path.join(AGENT_MEMORY_DIR, '_system', 'secret-backups', sessionId);
}

function sanitizeContent(content, findings) {
  // Sort findings by descending start index so replacements don't shift earlier ones.
  const sorted = [...findings].sort((a, b) => b.index - a.index);
  let out = content;
  const placeholders = [];
  for (const f of sorted) {
    const hash = crypto.createHash('sha256').update(f.value).digest('hex').slice(0, 8);
    const placeholder = `BLOCK_${hash}`;
    out = out.slice(0, f.index) + placeholder + out.slice(f.index + f.value.length);
    placeholders.push({
      placeholder,
      hash,
      type: f.type,
      severity: f.severity,
      line: f.line
    });
  }
  return { sanitized: out, placeholders };
}

function appendManifest(manifestPath, entry, sessionId) {
  // WI-7 (session_id binding) + WI-5 (lock around append). The manifest now
  // carries a top-level `session_id:` field; secret-restore.cjs refuses to
  // restore from any manifest whose session_id does not match the resolving
  // session. This closes H8 (cross-session restore).
  withFileLock(manifestPath, () => {
    let body = '';
    if (fs.existsSync(manifestPath)) {
      body = fs.readFileSync(manifestPath, 'utf8');
    } else {
      body = `schema_version: "1"\nsession_id: "${sessionId || '_no-session'}"\nentries:\n`;
    }
    // Append a YAML list entry — keep formatting trivial (no YAML lib).
    const lines = [
      `  - placeholder: "${entry.placeholder}"`,
      `    file_path: "${entry.file_path}"`,
      `    line_range: "${entry.line_range}"`,
      `    hash: "${entry.hash}"`,
      `    secret_type: "${entry.secret_type}"`,
      `    severity: "${entry.severity}"`,
      `    captured_at: "${entry.captured_at}"`,
      ''
    ].join('\n');
    fs.writeFileSync(manifestPath, body + lines);
  });
}

// Protected system paths (merged from pre-write.sh)
const PROTECTED_PATHS = ['/etc/', '/usr/', '/bin/', '/sbin/', '/boot/', '/sys/', '/proc/'];
const HOME = process.env.HOME || '';
if (HOME) {
  PROTECTED_PATHS.push(path.join(HOME, '.ssh') + '/');
  PROTECTED_PATHS.push(path.join(HOME, '.gnupg') + '/');
}

// Sensitive file patterns (warning only — matched on filename, triggers a caution message but does NOT block).
// Pattern-based secret scanning below (SECRET_PATTERNS) does the actual blocking on critical/high severity.
const SENSITIVE_PATTERNS = ['.env', 'credentials', 'secrets', 'private', '.pem', '.key', 'password'];

// Build private key patterns dynamically to avoid self-detection
const PK_BEGIN = '-----' + 'BEGIN ';
const PK_END = 'PRIVATE KEY' + '-----';
const PGP_END = 'PRIVATE KEY BLOCK' + '-----';
const GCP_SA_PATTERN = '"type"\\s*:\\s*"service_account"[\\s\\S]*?"private_key"\\s*:\\s*"' + PK_BEGIN + 'RSA ' + PK_END;

const SECRET_PATTERNS = [
  // GitHub
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub PAT', severity: 'critical' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token', severity: 'critical' },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, name: 'GitHub User Token', severity: 'critical' },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: 'GitHub Server Token', severity: 'critical' },
  { pattern: /ghr_[a-zA-Z0-9]{36}/g, name: 'GitHub Refresh Token', severity: 'critical' },
  { pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, name: 'GitHub Fine-grained PAT', severity: 'critical' },
  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID', severity: 'critical' },
  { pattern: /ASIA[0-9A-Z]{16,}/g, name: 'AWS STS Session Token', severity: 'critical' },
  { pattern: /aws[_-]?secret[_-]?access[_-]?key[\s]*[=:]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi, name: 'AWS Secret Access Key', severity: 'critical' },
  // Private Keys
  { pattern: new RegExp(PK_BEGIN + '(?:RSA |DSA |EC |OPENSSH )?' + PK_END, 'g'), name: 'Private Key', severity: 'critical' },
  { pattern: new RegExp(PK_BEGIN + 'PGP ' + PGP_END, 'g'), name: 'PGP Private Key', severity: 'critical' },
  // Google
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, name: 'Google API Key', severity: 'high' },
  // Twilio
  { pattern: /SK[0-9a-f]{32}/g, name: 'Twilio Auth Token', severity: 'high' },
  // SendGrid
  { pattern: /SG\.[a-zA-Z0-9_-]{20,}/g, name: 'SendGrid API Key', severity: 'high' },
  // HashiCorp Vault
  { pattern: /hvs\.[a-zA-Z0-9_-]{20,}/g, name: 'HashiCorp Vault Token', severity: 'high' },
  // DigitalOcean
  { pattern: /dop_v1_[a-zA-Z0-9]{32,}/g, name: 'DigitalOcean Token', severity: 'high' },
  // CircleCI
  { pattern: /circle-[a-zA-Z0-9]{30,}/g, name: 'CircleCI Token', severity: 'high' },
  // Mailgun
  { pattern: /key-[0-9a-f]{32}/g, name: 'Mailgun API Key', severity: 'high' },
  // Datadog
  { pattern: /(?:DD_API_KEY|DD_APP_KEY|DATADOG_API_KEY)[^\S\r\n]*[:=][^\S\r\n]*['"]?([0-9a-f]{32})['"]?/gi, name: 'Datadog API Key', severity: 'high' },
  // Slack
  { pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g, name: 'Slack Token', severity: 'critical' },
  // Stripe
  { pattern: /sk_live_[0-9a-zA-Z]{24,}/g, name: 'Stripe Live Secret Key', severity: 'critical' },
  { pattern: /rk_live_[0-9a-zA-Z]{24,}/g, name: 'Stripe Live Restricted Key', severity: 'critical' },
  // Database
  { pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^:]+:[^@]+@[^\s]+/gi, name: 'Database Credentials', severity: 'critical' },
  // API keys
  { pattern: /(?:api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, name: 'Generic API Key', severity: 'medium' },
  { pattern: /(?:secret[_-]?key|private[_-]?key)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, name: 'Generic Secret Key', severity: 'medium' },
  // Anthropic
  { pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g, name: 'Anthropic API Key', severity: 'critical' },
  // OpenAI
  { pattern: /sk-proj-[a-zA-Z0-9_-]{40,}/g, name: 'OpenAI API Key', severity: 'critical' },
  { pattern: /sk-(?!ant-|live_|test_)[a-zA-Z0-9]{46,50}/g, name: 'OpenAI API Key (legacy)', severity: 'critical' },
  // NPM/PyPI
  { pattern: /npm_[a-zA-Z0-9]{36}/g, name: 'NPM Access Token', severity: 'critical' },
  { pattern: /pypi-[a-zA-Z0-9_-]{64,}/g, name: 'PyPI API Token', severity: 'critical' },
  // Heroku (context-required)
  { pattern: /(?:HEROKU[_-]?API[_-]?KEY|heroku[_-]?api[_-]?key)[\s]*[=:]\s*["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/gi, name: 'Heroku API Key', severity: 'critical' },
  // JWT (low)
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, name: 'JWT Token', severity: 'low' },
  // Azure
  { pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[a-zA-Z0-9+/=]{88}/g, name: 'Azure Storage Account Key', severity: 'critical' },
  { pattern: /(?:client[_-]?secret|clientSecret)[\s]*[=:]\s*["']?([a-zA-Z0-9~._-]{34,40})["']?/gi, name: 'Azure AD Client Secret', severity: 'high' },
  // GCP
  { pattern: new RegExp(GCP_SA_PATTERN, 'g'), name: 'GCP Service Account JSON', severity: 'critical' },
  // Supabase
  { pattern: /sbp_[a-zA-Z0-9]{40}/g, name: 'Supabase Personal Access Token', severity: 'critical' },
  // Vercel
  { pattern: /vercel_[a-zA-Z0-9]{24,}/g, name: 'Vercel Token', severity: 'critical' },
  // Cloudflare (named pattern BEFORE broad hex pattern)
  { pattern: /(?:cloudflare[_-]?api[_-]?key|CF_API_KEY)[\s]*[=:]\s*["']?([a-zA-Z0-9]{37})["']?/gi, name: 'Cloudflare API Key', severity: 'critical' },
  // Cloudflare API Token (bare 37-char hex). Downgraded from `high` to `medium`
  // in v12.12.2 (H-5 from audit team_hooks-review_260602_001): the bare-hex
  // pattern false-positives on truncated git commit SHAs (40-char hashes
  // displayed at 37-39 chars), oversized random hex IDs, and many test
  // fixtures. At `high` severity it would block legitimate Write/Edit calls
  // on those false positives. At `medium`, it warns but does not block —
  // matching the documented "block mode triggers on critical+high only"
  // behavior. The high-confidence Cloudflare-API-Key pattern above (with
  // context anchor) remains at `critical`. Future tightening could add a
  // context-window anchor (require `cloudflare` / `CF_API_TOKEN` /
  // `X-Auth-Key` within ~60 chars) but the downgrade is sufficient for now.
  { pattern: /(?<![0-9a-f])[0-9a-f]{37}(?![0-9a-f])/g, name: 'Cloudflare API Token', severity: 'medium' },
  // GitLab
  { pattern: /glpat-[a-zA-Z0-9_-]{20}/g, name: 'GitLab Personal Access Token', severity: 'critical' },
  { pattern: /gldt-[a-zA-Z0-9_-]{20}/g, name: 'GitLab Deploy Token', severity: 'critical' },
  { pattern: /glrt-[a-zA-Z0-9_-]{20}/g, name: 'GitLab Runner Token', severity: 'critical' },
  // Terraform Cloud
  { pattern: /atlasv1\.[a-zA-Z0-9_-]{50,}/g, name: 'Terraform Cloud Token', severity: 'critical' },
  // HuggingFace
  { pattern: /hf_[a-zA-Z0-9]{34,}/g, name: 'HuggingFace API Token', severity: 'critical' }
];

// Test file path patterns — scanned for real secrets, but placeholder tokens are suppressed
const TEST_FILE_PATHS = [
  /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /__tests__\//, /test_.*\.py$/, /_test\.go$/
];

// Placeholder token patterns — suppress these in test files (explicit non-real tokens)
const TEST_PLACEHOLDER_PATTERNS = [
  /test_/i, /fake_/i, /example_/i, /your[_-]?key[_-]?here/i, /replace[_-]?me/i
];

// F7-2 (audit run_fable-plugin-review_260609_001): markdown is NO LONGER
// blanket-excluded. Real secrets pasted into *.md / README / docs/ ship
// unscanned under the old blanket skip, so a live API key in a README was
// never caught. Markdown is now scanned with the SAME full-token regexes as
// code. The repo's own docs that legitimately mention secret-pattern PREFIXES
// (e.g. hook-catalog.md lists `ghp_`, `AKIA...`, `sk-ant-...` as patterns to
// detect) are partial/prefix fragments, NOT full-length tokens — the
// full-token regexes do not match them, so removing the *.md skip introduces
// zero false positives on documentation patterns. Two repo docs that
// intentionally document the secret-detection mechanism itself are kept on a
// narrow per-file allowlist (DOC_ALLOWLIST_PATHS) so a future expansion of
// those docs to include a worked example cannot self-block the hook.
// B2 (v12.18.0): tightened path false-positive matching.
//
// Lock files: matched on filename (always whole-file skip — they are
// machine-generated and any "secret" in them is a hash).
const LOCK_FILE_PATHS = [
  /(^|\/)package-lock\.json$/, /(^|\/)yarn\.lock$/, /(^|\/)pnpm-lock\.yaml$/
];
//
// Example/sample/template/mock/fixture skip: previously these matched as NAKED
// substrings anywhere in the path (/example/i, /sample/i, ...), so a legit
// source file like `src/sample-config.ts` carrying a LIVE key was never
// scanned. Now they match only as path SEGMENTS or filename-token markers:
//   - a whole path segment named exactly that word (e.g. `fixtures/`,
//     `__mocks__/`, `examples/`, `samples/`, `templates/`), OR
//   - the marker appearing as a dotted/dashed/underscored FILENAME token
//     (e.g. `foo.example.json`, `config.sample.yaml`, `data.mock.ts`),
// which is the genuine "this is a placeholder file" convention. A source file
// that merely contains the word as part of a larger token (`sample-config.ts`,
// `template-engine.ts`, `mockingbird.js`) is NO LONGER blanket-skipped — it is
// scanned like any other source file.
const PLACEHOLDER_FILE_PATHS = [
  // Directory segment named exactly the placeholder word (singular or plural).
  /(^|\/)(examples?|samples?|templates?|mocks?|fixtures?|__mocks__|__fixtures__)(\/)/i,
  // Filename token: the marker must be its own DOT-delimited filename
  // component — the genuine placeholder-file convention. Matches
  // `foo.example.json`, `db.sample.yaml`, `x.mock.ts`, `auth.fixture.js`,
  // `config.template.yml`. The leading boundary is `/` or `.` (the marker
  // starts the filename or is a dotted segment); the trailing boundary is `.`.
  // Crucially this does NOT match hyphen/underscore-compounded source names
  // like `sample-config.ts`, `template-engine.ts`, `mock-data.js` — those are
  // real source files that must still be scanned (B2 fix).
  /(^|\/|\.)(example|sample|template|mock|fixture)\./i,
  // Same markers when they END the filename as a dotted segment, e.g.
  // `.env.example`, `settings.template`, `data.fixture`. Requires a leading
  // `.` or `/` so a hyphen-compounded `config-template` still does not match.
  /(^|\/|\.)(example|sample|template|mock|fixture)$/i
];

// Narrow per-file allowlist: the TWO repo docs that document the
// secret-detection / sanitize mechanism itself and therefore legitimately
// carry secret-pattern fragments as reference material. Anchored to the EXACT
// repo-relative path (suffix-anchored with a leading boundary) so an unrelated
// `/tmp/hook-catalog.md` or `src/hook-catalog.md` is NOT auto-allowlisted —
// only these two specific files in their canonical locations are.
const DOC_ALLOWLIST_PATHS = [
  /(^|\/)\.claude\/rules\/core\/resources\/hook-catalog\.md$/,
  /(^|\/)\.claude\/hooks\/SECRET-SANITIZE\.md$/
];

// Combined path-skip set used by isPathFalsePositive.
const FALSE_POSITIVE_PATHS = [...LOCK_FILE_PATHS, ...PLACEHOLDER_FILE_PATHS];

const FALSE_POSITIVE_CONTENT = [
  /YOUR[_-]?API[_-]?KEY/i, /REPLACE[_-]?WITH/i, /\$\{[^}]+\}/, /<[^>]+>/, /xxx+/i, /\*{3,}/, /\.{3,}/
];

function isPathFalsePositive(filePath) {
  if (!filePath) return false;
  if (DOC_ALLOWLIST_PATHS.some(p => p.test(filePath))) return true;
  return FALSE_POSITIVE_PATHS.some(p => p.test(filePath));
}

function isTestFile(filePath) {
  return filePath && TEST_FILE_PATHS.some(p => p.test(filePath));
}

function isTestFilePlaceholder(matchValue) {
  return TEST_PLACEHOLDER_PATTERNS.some(p => p.test(matchValue));
}

function isContentFalsePositive(content, match) {
  const idx = content.indexOf(match);
  const context = content.substring(Math.max(0, idx - 50), Math.min(content.length, idx + match.length + 50));
  return FALSE_POSITIVE_CONTENT.some(p => p.test(context));
}

function scanForSecrets(content, filePath) {
  if (isPathFalsePositive(filePath) || content.length < 8) {
    return { critical: [], high: [], medium: [], low: [] };
  }

  // D1a (v12.19.0): head+tail size cap. Scanning the FULL content of a very
  // large file (e.g. a multi-MB minified bundle or vendored blob) with ~50
  // backtracking regexes is a DoS / latency risk on every Write/Edit. Secrets
  // overwhelmingly live near the top (config/imports) or bottom (appended env
  // dumps) of a file, so we scan a head window + a tail window instead of the
  // whole body once content exceeds MAX_BYTES. Inside scanForSecrets so BOTH
  // block mode and sanitize mode inherit the cap. The <8 early-return above is
  // preserved exactly. ponytail: slice+concat one-liner — no new dependency
  // (ladder rung 5).
  const MAX_BYTES = parseInt(process.env.CAGENTS_SECRET_SCAN_MAX_BYTES, 10) || 512 * 1024;
  const HEAD = 64 * 1024;
  const TAIL = 64 * 1024;
  let scanTarget = content;
  if (content.length > MAX_BYTES) {
    scanTarget = content.slice(0, HEAD) + content.slice(content.length - TAIL);
    // NOT a silent skip — name the file and announce the windowed scan.
    console.error(`[SecretDetection] WINDOWED SCAN: ${filePath || '<unknown>'} is ${content.length} bytes (> ${MAX_BYTES} cap); scanning first ${HEAD} + last ${TAIL} bytes only. A secret in the MIDDLE of this file (outside both windows) will not be detected.`);
  }
  // ponytail: residual — match.index below is relative to scanTarget (the
  // window), so for a windowed file the `line` numbers and sanitize-mode
  // redaction indices for TAIL-window hits are offset (they count from the
  // window start, not the original content). Detection-correctness (does a
  // head/tail secret still BLOCK?) is preserved and is the gating requirement;
  // for >512KB files the block decision is honest while sanitize-mode index
  // fidelity on the tail window is the accepted documented residual. See
  // tests/v12/secret-scan-size-cap.test.js.

  const testFile = isTestFile(filePath);
  const findings = { critical: [], high: [], medium: [], low: [] };

  for (const secretType of SECRET_PATTERNS) {
    secretType.pattern.lastIndex = 0;
    let match;
    while ((match = secretType.pattern.exec(scanTarget)) !== null) {
      if (isContentFalsePositive(scanTarget, match[0])) continue;
      // For test files, suppress placeholder tokens but scan real-looking tokens
      if (testFile && isTestFilePlaceholder(match[0])) continue;
      const lines = scanTarget.substring(0, match.index).split('\n');
      const redacted = match[0].length > 10
        ? match[0].substring(0, 6) + '...' + match[0].substring(match[0].length - 4)
        : match[0].substring(0, 3) + '***';
      findings[secretType.severity].push({
        type: secretType.name, severity: secretType.severity, line: lines.length, redacted,
        // v12.0.4: capture raw value + index for sanitize-mode (NEVER logged or persisted).
        value: match[0], index: match.index
      });
    }
    // Early termination: skip lower severity if critical/high found
    if (findings.critical.length + findings.high.length > 0 &&
        (secretType.severity === 'medium' || secretType.severity === 'low')) break;
  }

  return findings;
}

// Pure handler (single source of truth). Exported so the D1b Write|Edit dispatcher
// (write-edit-dispatch.cjs) can run this SECURITY DENY GATE in-process FIRST. The
// dispatcher wraps this call in its own try/catch and FAILS CLOSED (deny) on throw.
async function handler(input) {
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';
  const content = toolInput.content || toolInput.new_string || '';

  // 1. Check protected paths (from pre-write.sh)
  if (filePath) {
    for (const protectedPath of PROTECTED_PATHS) {
      if (filePath.startsWith(protectedPath)) {
        console.error(`[SecretDetection] BLOCKED: Write to protected path: ${filePath}`);
        return { deny: true, reason: `Cannot write to protected system path: ${filePath}` };
      }
    }
  }

  // 2. Warn about sensitive files
  if (filePath) {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (filePath.includes(pattern)) {
        console.error(`[SecretDetection] WARNING: Writing to sensitive file: ${filePath}`);
        // Don't return - continue to secret scan
        break;
      }
    }
  }

  // 3. Scan for secrets
  if (!content) return null;

  const findings = scanForSecrets(content, filePath);
  const allSignificant = [...findings.critical, ...findings.high];

  const mode = getSecretMode();

  // ── SANITIZE MODE (v12.0.4, REC-1) ─────────────────────────────────────────
  // Opt-in via CAGENTS_SECRET_MODE=sanitize. When secrets are detected:
  //   1. Back up the original content (with secret) to a 0600 .orig file under
  //      cagents-memory/_system/secret-backups/{session_id}/{hash}.orig
  //   2. Write the SANITIZED content (with BLOCK_<hex> placeholders) to the
  //      target file ourselves.
  //   3. Append a manifest entry (hash + placeholder + file_path; NEVER the
  //      secret value).
  //   4. Deny the original Write/Edit so the model's secret-bearing payload
  //      does not overwrite our sanitized version. The systemMessage in the
  //      deny reason explains the substitution.
  // Restore happens at Stop time via secret-restore.cjs.
  if (mode === 'sanitize' && (allSignificant.length > 0 || findings.medium.length > 0)) {
    const allFindings = [...findings.critical, ...findings.high, ...findings.medium];
    try {
      const sessionId = getSessionIdForBackup(input);
      const backupDir = ensureDir(getBackupDir(sessionId));
      const manifestPath = path.join(backupDir, 'manifest.yaml');

      // Compute SHA256 of the FULL original content (used as the .orig filename).
      // This guarantees no secret value is in the filename — only its hash.
      const contentHash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
      const origPath = path.join(backupDir, `${contentHash}.orig`);

      // Sanitize content (replace each secret with BLOCK_<hex>).
      const { sanitized, placeholders } = sanitizeContent(content, allFindings);

      // 1. Back up original (0600 perms — owner read/write only).
      fs.writeFileSync(origPath, content, { mode: 0o600 });
      try { fs.chmodSync(origPath, 0o600); } catch { /* best-effort */ }

      // 2. Write sanitized content to the target file path (use 0600 too —
      //    user can chmod up after restore if needed).
      //
      // NOTE (H-4 from audit team_hooks-review_260602_001): this is a
      // deliberate write-before-deny pattern. Sanitize mode writes the
      // BLOCK_<hex>-substituted content to disk BEFORE the hook returns
      // `deny`, because the alternative (deny first, no disk write) would
      // mean the user's Write tool call lands on disk with the original
      // secrets intact when the deny is overridden, defeating the
      // sanitize protocol. The full lifecycle and restore mechanism are
      // documented in .claude/hooks/SECRET-SANITIZE.md. The matching
      // restore path lives in secret-restore.cjs (Stop hook) which reads
      // the manifest written below and replaces sanitized content with
      // the .orig backup.
      try {
        const targetDir = path.dirname(filePath);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(filePath, sanitized);
      } catch (e) {
        console.error(`[SecretDetection] sanitize-mode: failed to write sanitized content to ${filePath}: ${e.message}`);
        // Fall through to block-mode behavior on failure.
        return { deny: true, reason: `Sanitize mode failed to write to ${filePath}: ${e.message}. Falling back to deny.` };
      }

      // 3. Append manifest entry per placeholder (hash only — never secret value).
      const capturedAt = new Date().toISOString();
      for (const p of placeholders) {
        appendManifest(manifestPath, {
          placeholder: p.placeholder,
          file_path: filePath,
          line_range: `${p.line}`,
          hash: p.hash,
          secret_type: p.type,
          severity: p.severity,
          captured_at: capturedAt
        }, sessionId);
      }

      // 4. Deny the original Write/Edit; sanitized file is already on disk.
      console.error(`[SecretDetection] SANITIZED: ${placeholders.length} secret(s) in ${filePath} replaced with BLOCK_<hex> placeholders. Originals backed up to ${origPath}.`);
      return {
        deny: true,
        reason: `[CAGENTS_SECRET_MODE=sanitize] ${placeholders.length} secret(s) detected and replaced with BLOCK_<hex> placeholders. Sanitized content was written to ${filePath} on your behalf; backup of original at ${origPath} (0600). Restore at session end via secret-restore.cjs.`
      };
    } catch (e) {
      console.error(`[SecretDetection] sanitize-mode error: ${e.message}, falling back to block`);
      // Fall through to block-mode behavior on unexpected error.
    }
  }

  // ── BLOCK MODE (default, pre-v12.0.4 behavior) ─────────────────────────────
  if (allSignificant.length > 0) {
    const findingsList = allSignificant.map(f => `- ${f.type} (line ${f.line}): ${f.redacted}`).join('\n');
    console.error(`[SecretDetection] BLOCKED: Found ${allSignificant.length} secret(s) in ${filePath}`);
    return { deny: true, reason: `Secret detected in file content:\n${findingsList}\n\nRemove secrets before writing. Use environment variables or .env files instead.` };
  }

  if (findings.medium.length > 0) {
    const findingsList = findings.medium.map(f => `- ${f.type} (line ${f.line}): ${f.redacted}`).join('\n');
    console.error(`[SecretDetection] BLOCKED: Found ${findings.medium.length} possible secret(s) in ${filePath}`);
    return { deny: true, reason: `Possible secret detected in file content:\n${findingsList}\n\nRemove secrets before writing. Use environment variables or .env files instead.` };
  }

  return null;
}

// Register the hook at top level (same pattern as the sibling deny hooks
// bash-validator.cjs and post-write-validator.cjs). createHook's readStdin handles
// the no-stdin / isTTY case gracefully, so require()-only unit tests that import
// scanForSecrets but never pipe stdin are unaffected. A previous
// `require.main === module` guard here silently disabled the deny-gate under the
// production path (`node run-hook.cjs secret-detection`), where require.main is
// run-hook.cjs — not this module — so the hook never registered.
//
// Suppressed when the D1b dispatcher require()s this module purely to import
// `handler`: it sets CAGENTS_DISPATCH_IMPORT before the require so this top-level
// createHook() does not also fire and contend for stdin with the dispatcher.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('SecretDetection', handler);
}

// Export internals for in-process unit testing and for the D1b dispatcher.
module.exports = { handler, scanForSecrets, isPathFalsePositive, SECRET_PATTERNS };
