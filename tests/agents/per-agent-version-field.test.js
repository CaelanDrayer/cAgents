// Phase 11 (V11.1.12): per-agent metadata.version field regression test
// Asserts:
//   (a) Every agent SKILL.md (under archetype roots, NOT .claude/skills/) declares metadata.version
//   (b) Every metadata.version is a valid semver string ^[0-9]+\.[0-9]+\.[0-9]+$
//   (c) Count of agents with metadata.version equals the total agent count
//   (d) Back-compat: validate-agents.sh exits 0
//
// Refs:
//   - .claude/rules/core/skill-format.md § "metadata.version"
//   - cagents-memory/sessions/team_continue-cagents-w6_260505_001/workflow/work_items.yaml TASK-11
//   - example/external-skills/RESUME_W6_PARTIAL_PROMPT.md § Section E

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];
const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function findAllSkillMd() {
  const results = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      // Skip _deprecated/ buckets — those are culled agents kept on disk
      // for alias resolution but not part of the active catalog.
      if (entry.name === '_deprecated') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'SKILL.md') results.push(full);
    }
  }
  for (const a of ARCHETYPES) walk(join(ROOT, a));
  return results;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  try {
    return yaml.load(content.slice(4, end));
  } catch {
    return null;
  }
}

describe('Phase 11: per-agent metadata.version field (V11.1.12+)', () => {
  const skillFiles = findAllSkillMd();

  test('finds the expected agent count (v12.4.0 compression band [120,170])', () => {
    // v12.4.0 P2 compression moved 96 agents to _deprecated/ buckets, taking
    // the active catalog from 240 -> 144. The 238-baseline was an artifact
    // of the pre-compression catalog; the v12.4.0 contract is [120, 170].
    expect(skillFiles.length).toBeGreaterThanOrEqual(120);
    expect(skillFiles.length).toBeLessThanOrEqual(170);
  });

  test('(a) every agent SKILL.md declares metadata.version', () => {
    const missing = [];
    for (const f of skillFiles) {
      const content = readFileSync(f, 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm || !fm.metadata || typeof fm.metadata.version !== 'string') {
        missing.push(f.replace(ROOT + '/', ''));
      }
    }
    expect(missing, `Agents missing metadata.version:\n${missing.join('\n')}`).toEqual([]);
  });

  test('(b) every metadata.version is a valid semver string', () => {
    const invalid = [];
    for (const f of skillFiles) {
      const content = readFileSync(f, 'utf8');
      const fm = parseFrontmatter(content);
      const v = fm && fm.metadata && fm.metadata.version;
      if (typeof v !== 'string' || !SEMVER_RE.test(v)) {
        invalid.push(`${f.replace(ROOT + '/', '')}: ${JSON.stringify(v)}`);
      }
    }
    expect(invalid, `Agents with invalid semver:\n${invalid.join('\n')}`).toEqual([]);
  });

  test('(c) count of agents with metadata.version equals total agent count', () => {
    let withVersion = 0;
    for (const f of skillFiles) {
      const content = readFileSync(f, 'utf8');
      const fm = parseFrontmatter(content);
      if (fm && fm.metadata && SEMVER_RE.test(fm.metadata.version || '')) withVersion++;
    }
    expect(withVersion).toBe(skillFiles.length);
  });

  test('(d) validate-agents.sh exits 0 (back-compat preserved)', { timeout: 60000 }, () => {
    // The script's --count mode is non-interactive and quiet; full mode also returns 0 on no errors.
    // Use full mode so the new metadata.version check is actually exercised.
    let exitCode = 0;
    try {
      execSync('bash scripts/ci/validate-agents.sh', {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    expect(exitCode).toBe(0);
  });
});
