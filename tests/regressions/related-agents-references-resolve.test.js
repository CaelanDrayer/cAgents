import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.5 stale related_agents references.
 *
 * Bug: 4 agents referenced non-existent agents in their `related_agents:` lists:
 *   - developer/quality/playwright-test-engineer → qa-tester (does not exist)
 *   - developer/quality/security-owasp           → qa-tester (does not exist)
 *   - operator/marketing-sales/keyword-researcher → content-marketer (does not exist)
 *   - operator/marketing-sales/seo-strategist    → content-marketer (does not exist)
 *
 * In all four cases the canonical adjacent agent (qa-lead / copywriter) was
 * already in the same related_agents list, making the stale ref redundant.
 * scripts/ci/validate-agents.sh emitted these as WARN (not ERROR) so they
 * accumulated unnoticed.
 *
 * Test added: this regression test asserts that EVERY name listed in any
 * agent's `related_agents:` array resolves to an existing SKILL.md somewhere
 * in the archetype tree. Catches future stale references the moment they're
 * added.
 *
 * Could have caught by: validate-agents.sh promoting related_agents from WARN
 * to ERROR — but that would also have rejected legitimate cross-archetype
 * references during their grace period. This regression test is the durable
 * gate.
 */

const ROOT = process.cwd();
const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];

function* walkSkillMd(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      yield* walkSkillMd(full);
    } else if (entry === 'SKILL.md') {
      yield full;
    }
  }
}

function collectAllAgentNames() {
  const names = new Set();
  for (const arch of ARCHETYPES) {
    for (const skillMd of walkSkillMd(join(ROOT, arch))) {
      const content = readFileSync(skillMd, 'utf8');
      const m = content.match(/^name:\s*([a-z0-9-]+)\s*$/m);
      if (m) names.add(m[1]);
    }
  }
  return names;
}

function extractRelatedAgentNames(skillContent) {
  // Match the `related_agents:` block (YAML frontmatter, list of {name, type} objects)
  const inFrontmatter = skillContent.split(/^---\s*$/m)[1];
  if (!inFrontmatter) return [];
  const block = inFrontmatter.match(/^[ \t]*related_agents:[ \t]*\n([\s\S]*?)(?=^[a-zA-Z][^:]*:|\Z)/m);
  if (!block) return [];
  const names = [];
  for (const line of block[1].split('\n')) {
    const m = line.match(/^\s*-\s*name:\s*([a-z0-9-]+)\s*$/);
    if (m) names.push(m[1]);
  }
  return names;
}

describe('related_agents references resolve to real agents', () => {
  it('every related_agents name resolves to an existing agent', () => {
    const allAgents = collectAllAgentNames();
    expect(allAgents.size).toBeGreaterThan(200);  // sanity: we have hundreds

    const broken = [];
    for (const arch of ARCHETYPES) {
      for (const skillMd of walkSkillMd(join(ROOT, arch))) {
        const content = readFileSync(skillMd, 'utf8');
        const refs = extractRelatedAgentNames(content);
        for (const ref of refs) {
          if (!allAgents.has(ref)) {
            broken.push({ skill: skillMd.replace(ROOT + '/', ''), broken_ref: ref });
          }
        }
      }
    }
    if (broken.length > 0) {
      const msg = broken.map((b) => `  ${b.skill} → references unknown agent '${b.broken_ref}'`).join('\n');
      throw new Error(`Found ${broken.length} broken related_agents reference(s):\n${msg}`);
    }
    expect(broken).toEqual([]);
  });
});
