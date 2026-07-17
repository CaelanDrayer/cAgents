#!/usr/bin/env node
/**
 * Validator Evidence Recheck Hook - PostToolUse[Write|Edit]
 * cAgents v12.6.x - P1-6 (validator PASS-bias defense)
 *
 * Purpose
 * -------
 * Defends against validator LLM PASS-bias. When the validator writes a
 * validation_report.yaml claiming PASS, this hook mechanically re-runs each
 * cited verification_method against the actual filesystem / shell. Any cited
 * evidence that does NOT actually verify causes the classification to be
 * downgraded from PASS to FAIL, with a `recheck:` block appended listing the
 * failing entries.
 *
 * Scope
 * -----
 * - PostToolUse[Write|Edit] on file paths ending `validation_report.yaml`.
 * - Re-runs the same checks the validator's documented Phase 6 (Automated
 *   Verification) says it runs: file_exists, file_contains. metric_check is
 *   NOT mechanically rechecked (no canonical evaluator); it's flagged for
 *   human review only when the evidence text is contradictory.
 *
 * Non-goals
 * ---------
 * - Does not re-run test suites. (test_result evidence is checked only for
 *   the presence of captured output — vague "tests pass" without output is
 *   flagged.)
 * - Does not validate schema. post-write-validator.cjs already does YAML/JSON
 *   syntax checks.
 *
 * D3 — Mechanical claim-verification pass (advisory-first)
 * -------------------------------------------------------
 * ADDITIVE to the PASS-bias recheck above. Treats the whole
 * validation_report.yaml as a set of extractable claims and dispositions each
 * mechanically — grep + fs + math ONLY (NO LLM, NO network) — into one of four
 * buckets: verified / failed / unsupported / unverifiable. Computes
 * passRate = verified / (verified + failed). When passRate < 0.8 AND
 * checkable_claims (= verified + failed) >= 2, it APPENDS a `claim_verification:`
 * advisory block and console.error a WARN. It NEVER changes the classification,
 * never routes back to PLANNED, and never touches pipeline state (hard re-route
 * deferred). The existing PASS→FAIL downgrade behavior is untouched. See the
 * claim taxonomy + guards (prose-of-absence, snippet_in_wrong_file,
 * line-number-as-count) and passRate gate in
 * docs/example-store/ex-verification-mechanical-claim-check.md.
 * D3: advisory; hard re-route deferred.
 *
 * Calibration evidence
 * --------------------
 * cagents-memory/sessions/team_execute-self-improvement_260522_001/outputs/wave-2/P1-6/calibration-report.md
 */

const fs = require('fs');
const path = require('path');
const { createHook, PROJECT_ROOT } = require('./hook-utils.cjs');

// Match validation_report.yaml in any depth (workflow/, outputs/final/, etc.)
function isValidationReport(filePath) {
  if (!filePath) return false;
  return /validation_report\.ya?ml$/i.test(filePath);
}

// Tiny YAML extractor for the fields we need. Avoids a YAML parser dep.
// Returns the classification token (PASS|FAIL|REVISE|BLOCKED|PARTIAL_PASS|null).
function extractClassification(content) {
  const m = content.match(/^\s*classification:\s*([A-Z_]+)\s*$/m);
  return m ? m[1] : null;
}

// Parse acceptance_criteria_results entries with minimal regex. Each entry
// is a YAML list item with verification_method + evidence + met fields.
function parseCriteriaResults(content) {
  // Grab the block under acceptance_criteria_results:
  const blockMatch = content.match(
    /acceptance_criteria_results:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]+:|$)/
  );
  if (!blockMatch) return [];
  const block = blockMatch[1];
  const entries = [];
  // Split on list item markers at the start of a line
  const itemRegex = /^\s*-\s+criterion:\s*"?([^"\n]+)"?\s*$/gm;
  const indices = [];
  let m;
  while ((m = itemRegex.exec(block)) !== null) {
    indices.push({ start: m.index, criterion: m[1].trim() });
  }
  for (let i = 0; i < indices.length; i++) {
    const segStart = indices[i].start;
    const segEnd = i + 1 < indices.length ? indices[i + 1].start : block.length;
    const seg = block.slice(segStart, segEnd);
    const vm = seg.match(/verification_method:\s*"?([^"\n]+)"?/);
    const ev = seg.match(/evidence:\s*"?([^"\n]+)"?/);
    const met = seg.match(/met:\s*(true|false)/);
    entries.push({
      criterion: indices[i].criterion,
      verification_method: vm ? vm[1].trim() : null,
      evidence: ev ? ev[1].trim() : null,
      met: met ? met[1] === 'true' : null,
    });
  }
  return entries;
}

// Run the recheck against a single entry. Returns { ok: bool, reason: string }.
function recheckEntry(entry, projectRoot) {
  const { verification_method, evidence } = entry;
  if (!verification_method || !evidence) {
    return {
      ok: false,
      reason: `Missing verification_method or evidence on criterion "${entry.criterion}"`,
    };
  }
  if (verification_method === 'file_exists') {
    // Evidence is expected to be a relative or absolute file path.
    const cleanPath = evidence.replace(/^["']|["']$/g, '').trim();
    const abs = path.isAbsolute(cleanPath)
      ? cleanPath
      : path.join(projectRoot, cleanPath);
    if (!fs.existsSync(abs)) {
      return {
        ok: false,
        reason: `file_exists: cited path does not exist: ${cleanPath}`,
      };
    }
    return { ok: true, reason: '' };
  }
  if (verification_method === 'file_contains') {
    // Evidence may look like "src/foo.ts:42 - some content snippet".
    const m = evidence.match(/^([^:]+):(\d+)\s*-\s*(.+)$/);
    if (!m) {
      // Without structured citation we can't mechanically check. Pass-through.
      return { ok: true, reason: 'file_contains: unstructured evidence; skipped' };
    }
    const filePath = m[1].trim();
    const lineNum = parseInt(m[2], 10);
    const snippet = m[3].trim();
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectRoot, filePath);
    if (!fs.existsSync(abs)) {
      return {
        ok: false,
        reason: `file_contains: cited file does not exist: ${filePath}`,
      };
    }
    let lines;
    try {
      lines = fs.readFileSync(abs, 'utf8').split('\n');
    } catch (e) {
      return {
        ok: false,
        reason: `file_contains: failed to read ${filePath}: ${e.message}`,
      };
    }
    if (lineNum < 1 || lineNum > lines.length) {
      return {
        ok: false,
        reason: `file_contains: line ${lineNum} out of range for ${filePath} (has ${lines.length} lines)`,
      };
    }
    const actual = lines[lineNum - 1] || '';
    // Strip a few common citation noise tokens, then check substring.
    const needle = snippet.replace(/^["']|["']$/g, '').trim();
    if (!actual.includes(needle.slice(0, Math.min(needle.length, 60)))) {
      // Allow a weaker check: any token of length >= 4 from the snippet.
      const tokens = needle.split(/\s+/).filter((t) => t.length >= 4);
      const hit = tokens.some((t) => actual.includes(t));
      if (!hit) {
        return {
          ok: false,
          reason: `file_contains: ${filePath}:${lineNum} does not contain claimed snippet`,
        };
      }
    }
    return { ok: true, reason: '' };
  }
  if (verification_method === 'test_result') {
    // Honest evidence MUST include captured output. Vague "tests pass" flags.
    const ev = evidence.toLowerCase();
    if (
      /\b(passed|failed|\d+\s*\/\s*\d+|exit code|pytest|vitest|jest|npm test)\b/.test(
        ev
      )
    ) {
      return { ok: true, reason: '' };
    }
    return {
      ok: false,
      reason: `test_result: evidence lacks captured output (no count/exit-code/runner name): "${evidence}"`,
    };
  }
  if (verification_method === 'metric_check') {
    // Flag self-contradictory metrics (two different numbers in one entry).
    const numbers = (evidence.match(/(\d+(?:\.\d+)?)\s*%/g) || []).map((s) =>
      parseFloat(s)
    );
    if (numbers.length >= 2) {
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      // Spread > 10 percentage points => contradictory.
      if (max - min > 10) {
        return {
          ok: false,
          reason: `metric_check: contradictory metrics in evidence (${numbers.join(', ')})`,
        };
      }
    }
    return { ok: true, reason: '' };
  }
  // Unknown verification method — pass through, but note it.
  return {
    ok: true,
    reason: `verification_method "${verification_method}" not mechanically rechecked`,
  };
}

// Append the recheck block + downgrade classification on disk.
function mutateReport(filePath, original, failures) {
  // Downgrade classification PASS -> FAIL.
  let updated = original.replace(
    /^(\s*classification:\s*)PASS\s*$/m,
    '$1FAIL'
  );
  // Append a recheck block at the end. Use simple YAML.
  const recheckBlock = [
    '',
    'recheck:',
    '  hook: validator-evidence-recheck.cjs',
    '  hook_version: "1"',
    '  downgrade: "PASS -> FAIL"',
    '  failing_entries:',
    ...failures.map((f) => `    - criterion: ${JSON.stringify(f.criterion)}`),
    ...failures.map((f) => `      reason: ${JSON.stringify(f.reason)}`),
    '',
  ].join('\n');
  // Avoid double-appending if hook re-runs on same file.
  if (!updated.includes('recheck:')) {
    updated = updated + recheckBlock;
  }
  fs.writeFileSync(filePath, updated, 'utf8');
}

// ============================================================
// D3 (advisory): Mechanical claim-verification pass
// ============================================================
// Additive to the PASS-bias recheck above. Extracts checkable claims from the
// validation_report.yaml prose and dispositions each with grep + fs + math only
// (NO LLM, NO network) into: verified | failed | unsupported | unverifiable.
//   passRate = verified / (verified + failed)   (unsupported/unverifiable → neither)
// When passRate < 0.8 AND checkable_claims (= verified + failed) >= 2, this pass
// APPENDS a `claim_verification:` advisory block and console.error a WARN. It
// NEVER changes the classification or routes back to PLANNED.
// D3: advisory; hard re-route deferred.
// See docs/example-store/ex-verification-mechanical-claim-check.md.

const CLAIM_PASS_RATE_THRESHOLD = 0.8;
const CLAIM_MIN_CHECKABLE = 2;
const CLAIM_MAX_FILE_BYTES = 512 * 1024; // do not slurp huge files

function _claimResolveAbs(projectRoot, p) {
  const clean = String(p).replace(/^["'`]+|["'`]+$/g, '').trim();
  return path.isAbsolute(clean) ? clean : path.join(projectRoot, clean);
}

// line-number-as-count guard helper: split a trailing :NN line ref off a path so
// the line number is never mistaken for part of a count claim.
function _claimStripLine(fileTok) {
  const m = String(fileTok).match(/^(.*?):(\d+)$/);
  return m
    ? { file: m[1], line: parseInt(m[2], 10), hadLine: true }
    : { file: String(fileTok), line: null, hadLine: false };
}

function _claimReadFile(abs) {
  try {
    if (!fs.existsSync(abs)) return null;
    const stat = fs.statSync(abs);
    if (!stat.isFile() || stat.size > CLAIM_MAX_FILE_BYTES) return null;
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function _escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _countLiteral(haystack, needle) {
  if (!needle) return 0;
  const matches = haystack.match(new RegExp(_escapeRegExp(needle), 'g'));
  return matches ? matches.length : 0;
}

function _parseHumanNumber(s) {
  const t = String(s).replace(/,/g, '').trim();
  const m = t.match(/^(-?\d+(?:\.\d+)?)([KkMmBb]?)$/);
  if (!m) return NaN;
  let n = parseFloat(m[1]);
  const suf = m[2].toLowerCase();
  if (suf === 'k') n *= 1e3;
  else if (suf === 'm') n *= 1e6;
  else if (suf === 'b') n *= 1e9;
  return n;
}

// Gather every file-looking token cited anywhere in the report (line suffix
// stripped). Used as the bounded candidate set for the snippet_in_wrong_file
// guard — never a repo-wide grep.
function _collectCitedFiles(content) {
  const set = new Set();
  const re = /([A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_.\-]+)*\.[A-Za-z0-9]{1,6})(?::\d+)?/g;
  let m;
  while ((m = re.exec(content)) !== null) set.add(m[1]);
  return [...set];
}

// pattern_count: "N occurrences of X in FILE" -> grep -c literal X in FILE.
function _extractCountClaims(content, projectRoot) {
  const out = [];
  const re = /(\d+)\s+(?:occurrences?|instances?|matches?|usages?|calls?|references?)\s+of\s+["'`]?([^"'`\n]+?)["'`]?\s+in\s+([A-Za-z0-9_.\/\-]+(?::\d+)?)/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const N = parseInt(m[1], 10);
    const patternTok = m[2].trim();
    const { file, hadLine } = _claimStripLine(m[3]); // line-number-as-count guard
    const body = _claimReadFile(_claimResolveAbs(projectRoot, file));
    if (body === null) {
      out.push({ type: 'pattern_count', disposition: 'unsupported', detail: `cited file not found/unreadable: ${file}` });
      continue;
    }
    const actual = _countLiteral(body, patternTok);
    if (actual === N) {
      out.push({ type: 'pattern_count', disposition: 'verified', detail: `${actual} occurrence(s) of "${patternTok}" in ${file}${hadLine ? ' (line-number-as-count guard applied)' : ''}` });
    } else {
      out.push({ type: 'pattern_count', disposition: 'failed', detail: `claimed ${N} occurrence(s) of "${patternTok}" in ${file}, found ${actual}` });
    }
  }
  return out;
}

// file_exists: "FILE exists" / "exists at FILE" -> fs.existsSync.
function _extractFileExistsClaims(content, projectRoot) {
  const out = [];
  const seen = new Set();
  const patterns = [
    /["'`]?([A-Za-z0-9_.\/\-]+\.[A-Za-z0-9]{1,6})["'`]?\s+exists\b/gi,
    /\bexists?\s+at\s+["'`]?([A-Za-z0-9_.\/\-]+\.[A-Za-z0-9]{1,6})["'`]?/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const file = m[1];
      if (seen.has(file)) continue;
      seen.add(file);
      if (fs.existsSync(_claimResolveAbs(projectRoot, file))) {
        out.push({ type: 'file_exists', disposition: 'verified', detail: `${file} exists` });
      } else {
        out.push({ type: 'file_exists', disposition: 'failed', detail: `claimed ${file} exists, but not found` });
      }
    }
  }
  return out;
}

// pattern_absent: "no X in FILE" -> grep boolean. Bare "no X <noun>" with no
// file citation -> unsupported (prose-of-absence guard: absence needs evidence).
function _extractAbsenceClaims(content, projectRoot) {
  const out = [];
  const withFileRanges = [];
  const withFile = /\bno\s+["'`]?([A-Za-z0-9_.\-()]+)["'`]?\s+in\s+([A-Za-z0-9_.\/\-]+\.[A-Za-z0-9]{1,6})/gi;
  let m;
  while ((m = withFile.exec(content)) !== null) {
    withFileRanges.push([m.index, m.index + m[0].length]);
    const pat = m[1].trim();
    const file = m[2];
    const body = _claimReadFile(_claimResolveAbs(projectRoot, file));
    if (body === null) {
      out.push({ type: 'pattern_absent', disposition: 'unsupported', detail: `cited file not found/unreadable: ${file}` });
      continue;
    }
    if (_countLiteral(body, pat) > 0) {
      out.push({ type: 'pattern_absent', disposition: 'failed', detail: `claimed no "${pat}" in ${file}, but it is present` });
    } else {
      out.push({ type: 'pattern_absent', disposition: 'verified', detail: `confirmed no "${pat}" in ${file}` });
    }
  }
  // prose-of-absence guard: an absence claim with no explicit file -> unsupported.
  const bare = /\bno\s+([A-Za-z][A-Za-z0-9_\- ]{1,40}?\s+(?:header|headers|call|calls|import|imports|reference|references|handler|handlers|guard|guards|check|checks))\b/gi;
  while ((m = bare.exec(content)) !== null) {
    if (withFileRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    out.push({ type: 'pattern_absent', disposition: 'unsupported', detail: `prose-of-absence: "no ${m[1].trim()}" has no explicit file evidence` });
  }
  return out;
}

// pattern_exists: "FILE contains X" / "X present in FILE" -> grep boolean.
function _extractExistsClaims(content, projectRoot) {
  const out = [];
  let m;
  const contains = /([A-Za-z0-9_.\/\-]+\.[A-Za-z0-9]{1,6})\s+contains\s+["'`]([^"'`\n]+?)["'`]/gi;
  while ((m = contains.exec(content)) !== null) {
    const file = m[1];
    const pat = m[2].trim();
    const body = _claimReadFile(_claimResolveAbs(projectRoot, file));
    if (body === null) { out.push({ type: 'pattern_exists', disposition: 'unsupported', detail: `cited file not found/unreadable: ${file}` }); continue; }
    if (body.includes(pat)) out.push({ type: 'pattern_exists', disposition: 'verified', detail: `"${pat}" present in ${file}` });
    else out.push({ type: 'pattern_exists', disposition: 'failed', detail: `claimed "${pat}" in ${file}, but not present` });
  }
  const present = /["'`]([^"'`\n]+?)["'`]\s+(?:is\s+)?present\s+in\s+([A-Za-z0-9_.\/\-]+\.[A-Za-z0-9]{1,6})/gi;
  while ((m = present.exec(content)) !== null) {
    const pat = m[1].trim();
    const file = m[2];
    const body = _claimReadFile(_claimResolveAbs(projectRoot, file));
    if (body === null) { out.push({ type: 'pattern_exists', disposition: 'unsupported', detail: `cited file not found/unreadable: ${file}` }); continue; }
    if (body.includes(pat)) out.push({ type: 'pattern_exists', disposition: 'verified', detail: `"${pat}" present in ${file}` });
    else out.push({ type: 'pattern_exists', disposition: 'failed', detail: `claimed "${pat}" present in ${file}, but not present` });
  }
  return out;
}

// code_snippet: "FILE:LINE - snippet" -> substring search in the CITED file.
// snippet_in_wrong_file guard: if absent from the cited file but present in a
// sibling / other cited file, disposition is `unsupported` (not `failed`).
function _findSnippetElsewhere(needle, citedAbs, projectRoot, citedFiles) {
  for (const cf of citedFiles) {
    const abs = _claimResolveAbs(projectRoot, cf);
    if (abs === citedAbs) continue;
    const body = _claimReadFile(abs);
    if (body && body.includes(needle)) return cf;
  }
  try {
    const dir = path.dirname(citedAbs);
    for (const name of fs.readdirSync(dir).slice(0, 200)) {
      const abs = path.join(dir, name);
      if (abs === citedAbs) continue;
      const body = _claimReadFile(abs);
      if (body && body.includes(needle)) return path.relative(projectRoot, abs);
    }
  } catch { /* ignore */ }
  return null;
}

function _extractSnippetClaims(content, projectRoot, citedFiles) {
  const out = [];
  const re = /([A-Za-z0-9_.\/\-]+\.[A-Za-z0-9]{1,6}):(\d+)\s*[-–—]\s*(.+)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const file = m[1];
    let snippet = m[3].trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    const needle = snippet.slice(0, 60).trim();
    if (needle.length < 4) continue;
    const citedAbs = _claimResolveAbs(projectRoot, file);
    const body = _claimReadFile(citedAbs);
    if (body === null) {
      out.push({ type: 'code_snippet', disposition: 'unsupported', detail: `cited file not found/unreadable: ${file}` });
      continue;
    }
    if (body.includes(needle)) {
      out.push({ type: 'code_snippet', disposition: 'verified', detail: `snippet present in ${file}` });
      continue;
    }
    const wrong = _findSnippetElsewhere(needle, citedAbs, projectRoot, citedFiles);
    if (wrong) {
      out.push({ type: 'code_snippet', disposition: 'unsupported', detail: `snippet_in_wrong_file: cited ${file} but snippet found in ${wrong}` });
    } else {
      out.push({ type: 'code_snippet', disposition: 'failed', detail: `snippet not found in cited ${file}` });
    }
  }
  return out;
}

// arithmetic: "N% of BASE = RESULT" and "A op B = C" -> recompute.
function _extractArithmeticClaims(content) {
  const out = [];
  let m;
  const pct = /(\d+(?:\.\d+)?)\s*%\s+of\s+([\d,.]+[KkMmBb]?)\s*=\s*([\d,.]+[KkMmBb]?)/g;
  while ((m = pct.exec(content)) !== null) {
    const base = _parseHumanNumber(m[2]);
    const claimed = _parseHumanNumber(m[3]);
    if (isNaN(base) || isNaN(claimed)) continue;
    const expected = base * (parseFloat(m[1]) / 100);
    const ok = Math.abs(expected - claimed) <= Math.max(1, Math.abs(expected) * 0.01);
    out.push({ type: 'arithmetic', disposition: ok ? 'verified' : 'failed', detail: `${m[1]}% of ${m[2]} = ${m[3]} (expected ${expected})` });
  }
  const basic = /(?<![\w.])(\d+(?:\.\d+)?)\s*([+\-*x×])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)(?![\w.])/g;
  while ((m = basic.exec(content)) !== null) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[3]);
    const c = parseFloat(m[4]);
    let expected;
    if (m[2] === '+') expected = a + b;
    else if (m[2] === '-') expected = a - b;
    else expected = a * b;
    const ok = Math.abs(expected - c) <= 1e-6;
    out.push({ type: 'arithmetic', disposition: ok ? 'verified' : 'failed', detail: `${a} ${m[2]} ${b} = ${c} (expected ${expected})` });
  }
  return out;
}

// Extract + disposition every claim, then compute passRate.
function verifyClaims(content, projectRoot) {
  const citedFiles = _collectCitedFiles(content);
  const claims = [].concat(
    _extractCountClaims(content, projectRoot),
    _extractFileExistsClaims(content, projectRoot),
    _extractAbsenceClaims(content, projectRoot),
    _extractExistsClaims(content, projectRoot),
    _extractSnippetClaims(content, projectRoot, citedFiles),
    _extractArithmeticClaims(content)
  );
  const verified = claims.filter((c) => c.disposition === 'verified').length;
  const failed = claims.filter((c) => c.disposition === 'failed').length;
  const unsupported = claims.filter((c) => c.disposition === 'unsupported').length;
  const unverifiable = claims.filter((c) => c.disposition === 'unverifiable').length;
  const decided = verified + failed; // checkable_claims (the passRate basis)
  const passRate = decided > 0 ? verified / decided : 1;
  return { claims, verified, failed, unsupported, unverifiable, checkable_claims: decided, passRate };
}

function _yamlStr(s) {
  return JSON.stringify(String(s));
}

// Append the advisory claim_verification block to the on-disk report. Idempotent
// (no double-append). Never changes classification.
function appendClaimVerification(abs, result) {
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch {
    return false;
  }
  if (content.includes('claim_verification:')) return false; // idempotent
  const topFailures = result.claims.filter((c) => c.disposition === 'failed').slice(0, 5);
  const lines = [
    '',
    'claim_verification:',
    '  hook: validator-evidence-recheck.cjs',
    '  advisory: true   # D3: advisory; hard re-route deferred',
    `  pass_rate: ${result.passRate.toFixed(2)}`,
    `  checkable_claims: ${result.checkable_claims}`,
    `  verified: ${result.verified}`,
    `  failed: ${result.failed}`,
    `  unsupported: ${result.unsupported}`,
    `  unverifiable: ${result.unverifiable}`,
    '  claims:',
  ];
  for (const c of result.claims) {
    lines.push(`    - type: ${c.type}`);
    lines.push(`      disposition: ${c.disposition}`);
    lines.push(`      detail: ${_yamlStr(c.detail)}`);
  }
  if (topFailures.length === 0) {
    lines.push('  top_failures: []');
  } else {
    lines.push('  top_failures:');
    for (const c of topFailures) lines.push(`    - ${_yamlStr(c.detail)}`);
  }
  lines.push('');
  try {
    fs.writeFileSync(abs, content.trimEnd() + '\n' + lines.join('\n'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

// Run the advisory pass against the current on-disk report. Warns + annotates
// only when passRate < 0.8 AND checkable_claims >= 2. Never re-routes.
function runClaimVerificationPass(abs, projectRoot) {
  const content = _claimReadFile(abs);
  if (content === null) return;
  const result = verifyClaims(content, projectRoot);
  if (result.passRate < CLAIM_PASS_RATE_THRESHOLD && result.checkable_claims >= CLAIM_MIN_CHECKABLE) {
    const appended = appendClaimVerification(abs, result);
    console.error(`[validator-evidence-recheck] claim-verification (advisory): pass_rate ${result.passRate.toFixed(2)} < ${CLAIM_PASS_RATE_THRESHOLD} across ${result.checkable_claims} checkable claim(s) (${result.failed} failed). Appended claim_verification: block${appended ? '' : ' (skipped — already present)'}. D3: advisory only — no pipeline re-route.`);
  }
}

createHook('ValidatorEvidenceRecheck', async (input) => {
  const toolName = input.tool_name || '';
  if (toolName !== 'Write' && toolName !== 'Edit') return null;
  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!isValidationReport(filePath)) return null;
  // Resolve absolute path.
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(input.cwd || PROJECT_ROOT, filePath);
  if (!fs.existsSync(abs)) return null;
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
  const projectRoot = input.cwd || PROJECT_ROOT;

  // ---- Existing PASS-bias evidence recheck (UNCHANGED behavior) ----
  // Only act on PASS verdicts — FAIL/REVISE already honest. Any cited evidence
  // that does not verify mechanically downgrades PASS -> FAIL + recheck: block.
  const classification = extractClassification(content);
  if (classification === 'PASS') {
    const entries = parseCriteriaResults(content);
    if (entries.length > 0) {
      const failures = [];
      for (const entry of entries) {
        if (entry.met === false) continue; // already not-met; not a bias case
        const result = recheckEntry(entry, projectRoot);
        if (!result.ok) failures.push({ criterion: entry.criterion, reason: result.reason });
      }
      if (failures.length > 0) {
        // Mutate the report on disk: downgrade + recheck block. This is the
        // load-bearing side effect — the validator reads the recheck block from
        // disk on the next pass and honors the PASS→FAIL downgrade.
        mutateReport(abs, content, failures);
        // thinking-400 fix (run_team-thinking-400_260531_001): PostToolUse fires
        // between an assistant tool_use and the matching tool_result — emitting a
        // systemMessage could attach to the assistant turn, modifying thinking
        // blocks and violating the Anthropic API immutability contract. The
        // downgrade message is preserved via console.error (stderr → user verbose)
        // and the file mutation itself is the authoritative state.
        console.error(`[validator-evidence-recheck] Downgraded ${path.basename(abs)} from PASS to FAIL: ${failures.length} cited evidence entries did not verify mechanically. See recheck: block in the file.`);
      }
    }
  }

  // ---- D3 (additive, advisory): mechanical claim-verification pass ----
  // Runs regardless of classification. Re-reads the on-disk report so its
  // appended block follows any recheck: downgrade written above. Wrapped so it
  // can never throw out of the hook. It annotates + warns only — it does NOT
  // change the classification and does NOT route back to PLANNED.
  // D3: advisory; hard re-route deferred.
  try {
    runClaimVerificationPass(abs, projectRoot);
  } catch (e) {
    console.error(`[validator-evidence-recheck] claim-verification pass error (non-fatal): ${e && e.message}`);
  }

  return { continue: true };
});
