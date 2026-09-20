import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for the model-allowlist drift fix.
 *
 * Bug: scripts/lint-agents.sh and scripts/validate_agent.cjs each carried their
 * own hand-maintained model allowlist. The two drifted -- 'inherit' was listed
 * in validate_agent.cjs only. When `fable` landed in three agents' frontmatter
 * (orchestrator, planner, architect), lint-agents.sh Check 23 rejected it as an
 * invalid model and blocked a release commit.
 *
 * Root cause: two duplicated literals with no mechanism pinning them together,
 * and no test asserting that every model value declared on disk is a member of
 * the allowlist the linters enforce.
 *
 * Test added: tests/regressions/model-allowlist-drift.test.js -- parses both
 * literals out of the two scripts, asserts they are deeply equal and equal to
 * the canonical list, asserts every agents/*.md model value is a member, and
 * pins the planning-layer `fable` exemption in
 * .claude/hooks/model-routing-advisor.cjs to the same three agent names that
 * declare `fable` on disk.
 *
 * Could have caught by: a drift test over the duplicated allowlist literals,
 * run in CI alongside lint-agents.sh.
 */

const ROOT = process.cwd();

// The canonical allowlist. Widening it must be a deliberate, visible edit here.
const CANONICAL_MODELS = ['opus', 'opusplan', 'sonnet', 'haiku', 'fable', 'inherit'];

// The three planning-layer agents exempted from the tier model advisory.
const PLANNING_LAYER = ['orchestrator', 'planner', 'architect'];

/** Split a JS array/Set literal body into its quoted string values. */
function parseLiteralList(body) {
  return [...body.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** Parse VALID_MODELS = new Set([...]) out of scripts/lint-agents.sh. */
function parseLintAgentsAllowlist() {
  const src = readFileSync(join(ROOT, 'scripts/lint-agents.sh'), 'utf8');
  const m = src.match(/VALID_MODELS\s*=\s*new Set\(\[([^\]]*)\]\)/);
  expect(m, 'scripts/lint-agents.sh must declare VALID_MODELS = new Set([...])').not.toBeNull();
  return parseLiteralList(m[1]);
}

/** Parse validModels = [...] out of scripts/validate_agent.cjs. */
function parseValidateAgentAllowlist() {
  const src = readFileSync(join(ROOT, 'scripts/validate_agent.cjs'), 'utf8');
  const m = src.match(/validModels\s*=\s*\[([^\]]*)\]/);
  expect(m, 'scripts/validate_agent.cjs must declare validModels = [...]').not.toBeNull();
  return parseLiteralList(m[1]);
}

/** Every agents/<name>.md file, derived from disk (flat, non-recursive). */
function agentFiles() {
  const dir = join(ROOT, 'agents');
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort();
}

/**
 * Extract the declared model from an agent file: a top-level `model:` or a
 * metadata-nested `  model:`. Returns null when the agent declares none.
 */
function declaredModel(fileName) {
  const src = readFileSync(join(ROOT, 'agents', fileName), 'utf8');
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^ {0,2}model:\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].replace(/^['"]|['"]$/g, '');
}

describe('model allowlist drift', () => {
  const lintModels = parseLintAgentsAllowlist();
  const validateModels = parseValidateAgentAllowlist();

  it('the two hand-maintained allowlists are identical (same values, same order)', () => {
    expect(lintModels).toEqual(validateModels);
  });

  it('the allowlist equals the canonical literal', () => {
    expect(lintModels).toEqual(CANONICAL_MODELS);
  });

  it('every model declared in agents/*.md is a member of the allowlist', () => {
    const allowed = new Set(lintModels);
    const files = agentFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .map((f) => ({ file: `agents/${f}`, model: declaredModel(f) }))
      .filter((r) => r.model !== null && !allowed.has(r.model))
      .map((r) => `${r.file}: model '${r.model}'`);

    expect(offenders, `model values not in [${lintModels.join(', ')}]`).toEqual([]);
  });

  it('the planning-layer fable exemption matches the agents that declare fable', () => {
    // (a) the three planning-layer agents still declare `fable` on disk
    const declared = Object.fromEntries(
      PLANNING_LAYER.map((name) => [name, declaredModel(`${name}.md`)])
    );
    expect(declared).toEqual({
      orchestrator: 'fable',
      planner: 'fable',
      architect: 'fable',
    });

    // (b) the hook's exemption set contains exactly those three names
    const hookSrc = readFileSync(
      join(ROOT, '.claude/hooks/model-routing-advisor.cjs'),
      'utf8'
    );
    const m = hookSrc.match(/PLANNING_LAYER_AGENTS\s*=\s*new Set\(\[([^\]]*)\]\)/);
    expect(m, 'model-routing-advisor.cjs must declare PLANNING_LAYER_AGENTS').not.toBeNull();
    expect(parseLiteralList(m[1]).sort()).toEqual([...PLANNING_LAYER].sort());
  });
});
