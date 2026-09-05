import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { agentFiles } from '../helpers/agent-catalog.js';

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
 * Test added: reads every flat agent file (agents/<name>.md), extracts every
 *      `@<name>/resources/X.md` token from its body, and asserts each resolves
 *      to a real file at `agents/<name>/resources/{filename}`.
 *
 * v12.68.0: the agent tree was flattened for plugin discovery, so resource
 *      references are now agent-file-relative in the form
 *      `@<agent-name>/resources/<file>.md` (they were `@resources/<file>.md`
 *      back when each agent had its own directory).
 *
 * Could have caught by: a CI regression test on @resources reference
 *      resolution — exactly what this file is.
 */

const ROOT = process.cwd();

// Match @<agent-name>/resources/<filename>.md tokens. Filename allows letters,
// digits, underscores, hyphens, periods, and forward-slashes (sub-paths).
const RESOURCE_REF_RE = /@([a-z0-9-]+)\/resources\/([A-Za-z0-9_.\-\/]+\.md)/g;

function extractResourceRefs(skillContent) {
  const refs = [];
  for (const m of skillContent.matchAll(RESOURCE_REF_RE)) {
    refs.push({ owner: m[1], file: m[2] });
  }
  return refs;
}

describe('@<agent>/resources/ references in agent files resolve to real files', () => {
  it('every @<agent>/resources/X.md token resolves to a real file under that agent\'s resources/ dir', () => {
    const broken = [];
    let totalRefs = 0;
    let totalAgentsScanned = 0;

    for (const agentMd of agentFiles()) {
      totalAgentsScanned += 1;
      const content = readFileSync(agentMd, 'utf8');
      for (const ref of extractResourceRefs(content)) {
        totalRefs += 1;
        // Resource refs are agent-file-relative: agents/<owner>/resources/<file>.
        const resolved = join(ROOT, 'agents', ref.owner, 'resources', ref.file);
        if (!existsSync(resolved)) {
          broken.push({
            skill: agentMd.replace(ROOT + '/', ''),
            broken_ref: `@${ref.owner}/resources/${ref.file}`,
            resolved_path: resolved.replace(ROOT + '/', ''),
          });
        }
      }
    }

    // Sanity: we are actually scanning agents.
    // v12 consolidation reduced the active catalog from 141 -> 57
    // (41 routable + 16 core); floor set to 50 to stay meaningful.
    expect(totalAgentsScanned).toBeGreaterThan(50);

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
