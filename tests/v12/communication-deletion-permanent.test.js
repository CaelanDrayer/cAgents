/**
 * WI-W4.4 (f): communication-deletion-permanent — complementary regression
 * to `tests/communication-deleted.test.js` (WI-W4.1).
 *
 * Where WI-W4.1 asserts:
 *   - directory does not exist on disk
 *   - zero references to `_communication/` in SKILL.md files
 *
 * This test adds three different angles to defend against subtle regressions:
 *   1. None of the legacy inbox/broadcast subpaths (`inbox/{agent}/`,
 *      `broadcast/`) appear in any agent body where the old directory was
 *      addressed by its internal structure (the original failure mode).
 *   2. No agent SKILL.md instructs use of a removed messaging tool that
 *      pointed at `_communication/` (e.g. "write to cagents-memory/_communication").
 *   3. CLAUDE.md / agent-memory.md docs do not list `_communication/` as
 *      part of the active memory hierarchy (only as a removed/historical
 *      entry, if mentioned at all).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function grepProductionLines(pattern) {
  // Run a recursive grep limited to production tree, excluding the same
  // paths as the WI-W4.1 sibling test for consistency.
  const cmd =
    `grep -rEn '${pattern}' --include='*.md' --include='*.yaml' --include='*.json' . ` +
    `| grep -v 'CHANGELOG' ` +
    `| grep -v 'v12-aliases' ` +
    `| grep -v 'docs/RELEASE_NOTES.md' ` +
    `| grep -v 'archive/' ` +
    `| grep -v 'cagents-memory/' ` +
    `| grep -v 'node_modules' ` +
    `| grep -v 'vendor_repos' ` +
    `| grep -v 'tests/' ` +
    `| grep -v '\\.git/' ` +
    `|| true`;
  try {
    const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

describe('WI-W4.4 (f): communication deletion permanent (complementary)', () => {
  it('no agent body references `_communication/inbox/`', () => {
    const offenders = grepProductionLines('_communication/inbox/');
    expect(offenders, `inbox/ refs:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('no agent body references `_communication/broadcast/`', () => {
    const offenders = grepProductionLines('_communication/broadcast/');
    expect(offenders, `broadcast/ refs:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('no agent body instructs writes to `cagents-memory/_communication`', () => {
    // Pattern matches "write to cagents-memory/_communication" and similar.
    const offenders = grepProductionLines('write[^\\n]{0,30}cagents-memory/_communication');
    expect(offenders, `write-instruction refs:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('agent-memory.md does not list _communication/ in the active memory hierarchy', () => {
    const memoryDocPath = path.join(
      REPO_ROOT,
      '.claude',
      'rules',
      'memory',
      'agent-memory.md',
    );
    if (!fs.existsSync(memoryDocPath)) return;
    const content = fs.readFileSync(memoryDocPath, 'utf8');
    // The current memory overview tree must NOT list `_communication/` as
    // a live directory. We check for the specific tree-diagram line that
    // listed it: `+-- _communication/` (with description). If a future doc
    // wants to mention it historically, use a "deprecated" or "removed"
    // qualifier; otherwise the line should be gone.
    const treeLines = content
      .split('\n')
      .filter((l) => /_communication\//.test(l))
      .filter((l) => !/(removed|deprecated|historical|deleted|v12)/i.test(l));
    expect(
      treeLines,
      `agent-memory.md still lists _communication/ as live:\n  ${treeLines.join('\n  ')}`,
    ).toEqual([]);
  });

  it('cagents-memory/_communication directory does NOT exist (sanity)', () => {
    const commDir = path.join(REPO_ROOT, 'cagents-memory', '_communication');
    expect(fs.existsSync(commDir)).toBe(false);
  });
});
