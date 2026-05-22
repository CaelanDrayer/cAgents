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
  // Only act on PASS verdicts — FAIL/REVISE already honest.
  const classification = extractClassification(content);
  if (classification !== 'PASS') return null;
  // Re-run each cited verification_method.
  const entries = parseCriteriaResults(content);
  if (entries.length === 0) return null;
  const projectRoot = input.cwd || PROJECT_ROOT;
  const failures = [];
  for (const entry of entries) {
    if (entry.met === false) continue; // already not-met; not a bias case
    const result = recheckEntry(entry, projectRoot);
    if (!result.ok) failures.push({ criterion: entry.criterion, reason: result.reason });
  }
  if (failures.length === 0) return null;
  // Mutate the report on disk: downgrade + recheck block.
  mutateReport(abs, content, failures);
  return {
    continue: true,
    systemMessage: `[validator-evidence-recheck] Downgraded ${path.basename(abs)} from PASS to FAIL: ${failures.length} cited evidence entries did not verify mechanically. See recheck: block in the file.`,
  };
});
