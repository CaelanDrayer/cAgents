import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Regression test for V11.2.8 broken @resources/ references.
 *
 * Bug: 11 @resources/X.md references across 6 agents pointed to files that
 *      never existed (or were removed in v11.1 archetype migration). Three-Tier
 *      Progressive Disclosure (skill-format.md) mandates these refs resolve, but
 *      no test enforced this — broken refs slipped past validate-agents.sh.
 *
 * Root cause: v11.1 builder-role-tree migration moved agents into archetype
 *      directories; resources/ subdirs were not migrated consistently. No
 *      regression test caught the resulting drift.
 *
 * Test added: walks all 9 archetype roots, extracts every `@resources/X.md`
 *      token from every SKILL.md body, and asserts each resolves to a real
 *      file at `{agent_dir}/resources/{filename}`.
 *
 * Could have caught by: a CI regression test on @resources reference
 *      resolution — exactly what this file is.
 */

const ROOT = process.cwd();
const ARCHETYPES = [
  'developer',
  'operator',
  'advisor',
  'analyst',
  'creator',
  'writer',
  'strategist',
  'core',
  'leadership',
];

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
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      yield* walkSkillMd(full);
    } else if (entry === 'SKILL.md') {
      yield full;
    }
  }
}

// Match @resources/<filename>.md tokens. Filename allows letters, digits,
// underscores, hyphens, periods, and forward-slashes (sub-paths).
const RESOURCE_REF_RE = /@resources\/([A-Za-z0-9_.\-\/]+\.md)/g;

function extractResourceRefs(skillContent) {
  const refs = [];
  for (const m of skillContent.matchAll(RESOURCE_REF_RE)) {
    refs.push(m[1]);
  }
  return refs;
}

describe('@resources/ references in agent SKILL.md files resolve to real files', () => {
  it('every @resources/X.md token resolves to a real file under that agent\'s resources/ dir', () => {
    const broken = [];
    let totalRefs = 0;
    let totalAgentsScanned = 0;

    for (const arch of ARCHETYPES) {
      const archDir = join(ROOT, 'agents', arch);
      if (!existsSync(archDir)) continue;
      for (const skillMd of walkSkillMd(archDir)) {
        totalAgentsScanned += 1;
        const agentDir = dirname(skillMd);
        const content = readFileSync(skillMd, 'utf8');
        const refs = extractResourceRefs(content);
        for (const ref of refs) {
          totalRefs += 1;
          const resolved = join(agentDir, 'resources', ref);
          if (!existsSync(resolved)) {
            broken.push({
              skill: skillMd.replace(ROOT + '/', ''),
              broken_ref: `@resources/${ref}`,
              resolved_path: resolved.replace(ROOT + '/', ''),
            });
          }
        }
      }
    }

    // Sanity: we are actually scanning agents.
    // v12.7.0 LP-12/LP-13 consolidation + v12.8.0 archetype move under agents/
    // left 141 active agents on disk; floor kept well below that to stay
    // meaningful without re-breaking on small catalog changes.
    expect(totalAgentsScanned).toBeGreaterThan(100);

    if (broken.length > 0) {
      const msg = broken
        .map((b) => `  ${b.skill}\n      ref:  ${b.broken_ref}\n      path: ${b.resolved_path}`)
        .join('\n');
      throw new Error(
        `Found ${broken.length} broken @resources reference(s) out of ${totalRefs} total (scanned ${totalAgentsScanned} agents):\n${msg}`,
      );
    }
    expect(broken).toEqual([]);
  });
});
