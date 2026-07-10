#!/usr/bin/env node
'use strict';
//
// scripts/ci/run-advisory.cjs
//
// Advisory-validator runner / driver (F6) — the WARN-only gate that F1-F4 plug
// into.
//
// Behavior:
//   - Discovers every scripts/ci/advisory/*.cjs module (README.md is ignored —
//     only *.cjs files are loaded).
//   - require()s each, calls its run(), collects the flat findings array.
//   - Drops baseline-suppressed findings via scripts/ci/lib/validator-baseline.cjs.
//   - Prints a grouped human summary (by validator, file:line + message) plus a
//     totals line, OR a JSON document with `--format json`.
//
// CRITICAL: this runner is WARN-ONLY. It ALWAYS exits 0, regardless of how many
// findings are reported. The advisory gate never blocks CI. A per-validator
// throw is caught and surfaced as a runner note — it never crashes the run.
//
// Standalone Contract: Node built-ins only (fs, path) + the baseline lib (which
// guards its own js-yaml require). No new npm deps, no network.
//
// Env overrides (used by tests to stay hermetic):
//   CAGENTS_ADVISORY_DIR       — advisory validators directory
//   CAGENTS_ADVISORY_BASELINE  — baseline YAML path
//
const fs = require('fs');
const path = require('path');
const {
  loadBaseline,
  fingerprint,
  findSuppression,
} = require('./lib/validator-baseline.cjs');

const ADVISORY_DIR = process.env.CAGENTS_ADVISORY_DIR
  ? path.resolve(process.env.CAGENTS_ADVISORY_DIR)
  : path.join(__dirname, 'advisory');

const VALID_SEVERITIES = new Set(['HIGH', 'MEDIUM', 'LOW']);

function discoverValidators() {
  let entries;
  try {
    entries = fs.readdirSync(ADVISORY_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith('.cjs'))
    .sort()
    .map((f) => path.join(ADVISORY_DIR, f));
}

function loadValidator(file) {
  const fallbackId = path.basename(file, '.cjs');
  let mod;
  try {
    mod = require(file);
  } catch (err) {
    return { file, id: fallbackId, description: '', error: `require failed: ${err.message}` };
  }
  if (!mod || typeof mod.run !== 'function') {
    return { file, id: fallbackId, description: '', error: 'module does not export a run() function' };
  }
  const meta = mod.meta && typeof mod.meta === 'object' ? mod.meta : {};
  return {
    file,
    id: meta.id || fallbackId,
    description: meta.description || '',
    run: mod.run,
  };
}

function runValidator(v) {
  if (v.error) return { findings: [], note: v.error };
  let findings;
  try {
    findings = v.run();
  } catch (err) {
    return { findings: [], note: `run() threw: ${err.message}` };
  }
  if (!Array.isArray(findings)) {
    return { findings: [], note: 'run() did not return an array' };
  }
  return { findings, note: null };
}

function normalizeFinding(raw, validatorId) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const severity = VALID_SEVERITIES.has(f.severity) ? f.severity : 'LOW';
  const finding = {
    validator: validatorId,
    ruleId: f.ruleId == null ? 'unknown' : String(f.ruleId),
    severity,
    file: f.file == null ? '' : String(f.file),
    line: f.line == null ? null : f.line,
    message: f.message == null ? '' : String(f.message),
  };
  finding.fingerprint = fingerprint(finding);
  return finding;
}

function collect() {
  const baseline = loadBaseline(process.env.CAGENTS_ADVISORY_BASELINE || undefined);
  const files = discoverValidators();

  const validators = [];
  const findings = []; // active (non-suppressed)
  const suppressed = [];
  const notes = [];

  for (const file of files) {
    const v = loadValidator(file);
    const { findings: rawFindings, note } = runValidator(v);
    if (note) notes.push({ validator: v.id, note });

    const active = [];
    const muted = [];
    for (const raw of rawFindings) {
      const finding = normalizeFinding(raw, v.id);
      const supp = findSuppression(finding, baseline);
      if (supp) {
        finding.suppressed = true;
        finding.suppressionReason = supp.reason || '';
        muted.push(finding);
        suppressed.push(finding);
      } else {
        active.push(finding);
        findings.push(finding);
      }
    }

    validators.push({
      id: v.id,
      description: v.description || '',
      file: path.relative(process.cwd(), file),
      findings: active,
      suppressed: muted,
      note: note || null,
    });
  }

  return {
    validators,
    findings,
    suppressed,
    notes,
    counts: {
      validators: files.length,
      findings: findings.length,
      suppressed: suppressed.length,
      notes: notes.length,
    },
  };
}

function printHuman(result) {
  const lines = [];
  lines.push('== Advisory validators (WARN-only) ==');

  if (result.validators.length === 0) {
    lines.push('  (no advisory validators discovered)');
  }

  for (const v of result.validators) {
    const desc = v.description ? ` — ${v.description}` : '';
    lines.push('');
    lines.push(`[${v.id}]${desc}`);
    if (v.note) {
      lines.push(`  note: ${v.note}`);
    }
    if (v.findings.length === 0 && v.suppressed.length === 0 && !v.note) {
      lines.push('  ok (0 findings)');
    }
    for (const f of v.findings) {
      const loc = f.file ? `${f.file}${f.line != null ? `:${f.line}` : ''}` : '(no file)';
      lines.push(`  ${f.severity.padEnd(6)} ${f.ruleId}  ${loc}`);
      lines.push(`         ${f.message}`);
    }
    if (v.suppressed.length > 0) {
      lines.push(`  (${v.suppressed.length} suppressed by baseline)`);
    }
  }

  // Runner-level notes (validators that failed to load / threw).
  if (result.notes.length > 0) {
    lines.push('');
    lines.push('runner notes:');
    for (const n of result.notes) {
      lines.push(`  [${n.validator}] ${n.note}`);
    }
  }

  lines.push('');
  lines.push(
    `advisory: ${result.counts.findings} findings across ` +
      `${result.counts.validators} validators, ${result.counts.suppressed} suppressed`,
  );
  lines.push('(WARN-only: advisory findings never fail CI)');
  return lines.join('\n');
}

function parseArgs(argv) {
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format=json') {
      json = true;
    } else if (a === '--format') {
      if (argv[i + 1] === 'json') {
        json = true;
        i++;
      }
    } else if (a === '--json') {
      json = true;
    }
  }
  return { json };
}

function main() {
  const { json } = parseArgs(process.argv.slice(2));
  let result;
  try {
    result = collect();
  } catch (err) {
    // Should never happen (each validator is individually guarded), but the
    // WARN-only contract is absolute: report and exit 0.
    if (json) {
      process.stdout.write(
        JSON.stringify(
          { validators: [], findings: [], suppressed: [], counts: { validators: 0, findings: 0, suppressed: 0, notes: 1 }, notes: [{ validator: '(runner)', note: String(err && err.message) }] },
          null,
          2,
        ) + '\n',
      );
    } else {
      process.stdout.write(`advisory runner error (non-blocking): ${err && err.message}\n`);
    }
    process.exit(0);
    return;
  }

  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          validators: result.validators,
          findings: result.findings,
          suppressed: result.suppressed,
          counts: result.counts,
          notes: result.notes,
        },
        null,
        2,
      ) + '\n',
    );
  } else {
    process.stdout.write(printHuman(result) + '\n');
  }

  // WARN-ONLY: always exit 0, no matter how many findings.
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { collect, normalizeFinding, discoverValidators, ADVISORY_DIR };
