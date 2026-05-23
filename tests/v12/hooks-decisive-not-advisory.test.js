/**
 * P2-10 (v12.7.x self-improvement): Decisive hooks, not advisory.
 *
 * Two changes:
 *   1. attention-injection.cjs (80% no-op rate from audit) — chosen Option A:
 *      DELETE the file entirely; its post-compaction restore use case is
 *      already covered by post-compact-restore.cjs. The Write|Edit|Bash
 *      PreToolUse registration in settings.json is removed.
 *
 *   2. metadata.requires field — adoption check at extraction time was
 *      4 agents (< 5 threshold). Per spec: delete the field from
 *      skill-format.md AND remove the advisory parseRequires/checkRequires
 *      block from session-init-gate.cjs. The hook stays for session-presence,
 *      v12-aliases lookup, and data_access_level — only the metadata.requires
 *      bins/env/files/min_node_version advisory is removed.
 *
 * This test is the failing-before / passing-after regression contract.
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const ATTENTION_HOOK = path.join(REPO_ROOT, '.claude', 'hooks', 'attention-injection.cjs');
const POST_COMPACT_HOOK = path.join(REPO_ROOT, '.claude', 'hooks', 'post-compact-restore.cjs');
const SETTINGS_JSON = path.join(REPO_ROOT, '.claude', 'settings.json');
const SESSION_INIT_HOOK = path.join(REPO_ROOT, '.claude', 'hooks', 'session-init-gate.cjs');
const SKILL_FORMAT = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'skill-format.md');

describe('P2-10: Decisive (not advisory) hooks', () => {
  describe('(a) attention-injection — Option A: deleted', () => {
    it('.claude/hooks/attention-injection.cjs does NOT exist (Option A: deleted)', () => {
      expect(
        fs.existsSync(ATTENTION_HOOK),
        'attention-injection.cjs should be deleted under Option A. PostCompact restore covers the goal-restore use case.',
      ).toBe(false);
    });

    it('post-compact-restore.cjs exists and contains goal restore logic', () => {
      expect(fs.existsSync(POST_COMPACT_HOOK)).toBe(true);
      const content = fs.readFileSync(POST_COMPACT_HOOK, 'utf8');
      // PostCompact already restores mission + phase — that's the entire
      // useful subset of what attention-injection did, but only when it's
      // actually likely to help (post-compaction, not on every Write/Edit/Bash).
      expect(content).toMatch(/mission/i);
      expect(content).toMatch(/PostCompactRestore/);
    });

    it('.claude/settings.json no longer registers attention-injection', () => {
      const raw = fs.readFileSync(SETTINGS_JSON, 'utf8');
      expect(
        raw.includes('attention-injection'),
        'settings.json should not reference attention-injection (hook deleted)',
      ).toBe(false);
    });
  });

  describe('(b) + (c) metadata.requires — adoption < 5, field removed', () => {
    // Adoption count computed at WI extraction time was 4. Spec says:
    // "If <5, delete the metadata.requires section from
    //  .claude/rules/core/skill-format.md AND from
    //  .claude/hooks/session-init-gate.cjs (the advisory-mode prose only —
    //  keep any code paths that don't reference `requires`)."
    it('session-init-gate.cjs still exists (we keep session-presence + aliases + data_access)', () => {
      expect(fs.existsSync(SESSION_INIT_HOOK)).toBe(true);
    });

    it('session-init-gate.cjs no longer contains metadata.requires parsing or checking', () => {
      const src = fs.readFileSync(SESSION_INIT_HOOK, 'utf8');
      // Function definitions for the advisory block must be gone.
      expect(
        src.includes('function parseRequires'),
        'parseRequires() should be removed from session-init-gate.cjs',
      ).toBe(false);
      expect(
        src.includes('function checkRequires'),
        'checkRequires() should be removed from session-init-gate.cjs',
      ).toBe(false);
      // No `metadata.requires` advisory message text either.
      expect(
        src.includes('declares metadata.requires but missing'),
        'metadata.requires advisory message should be removed',
      ).toBe(false);
    });

    it('skill-format.md no longer documents metadata.requires as a schema field', () => {
      const md = fs.readFileSync(SKILL_FORMAT, 'utf8');
      // The schema-defining heading is gone.
      expect(
        md.match(/^### requires/m),
        'The "### requires" section header should be removed from skill-format.md',
      ).toBeNull();
      // No frontmatter example block declaring metadata.requires either.
      expect(
        md.match(/metadata:\s*\n\s+requires:/),
        'Example frontmatter showing "metadata:\\n  requires:" should be removed',
      ).toBeNull();
    });

    it('phase-3 metadata.requires advisory check section is removed from session-init-gate.cjs', () => {
      const src = fs.readFileSync(SESSION_INIT_HOOK, 'utf8');
      // The legacy "Phase 3: metadata.requires advisory check" comment block is gone.
      expect(
        src.match(/Phase\s*3:\s*metadata\.requires\s*advisory/i),
        'Phase 3 metadata.requires comment block should be removed',
      ).toBeNull();
    });
  });
});
