// P1-7: Consolidate delegation/routing hooks → prompt-router; canonicalize kill-list.
//
// Bug-driven regression test (CLAUDE.md mandate):
// - BEFORE FIX: delegation-enforcer.cjs and magic-keywords.cjs both exist;
//   prompt-router.cjs does not exist; kill-list text appears in multiple
//   SKILL.md files; controller-delegation-validator.cjs warns (does not deny)
//   on implementation paths.
// - AFTER FIX: the two old hooks are deleted, prompt-router.cjs handles both
//   UserPromptSubmit + PreToolUse[Agent]; the kill-list is canonicalized
//   in .claude/rules/core/delegation.md (exactly once); controller-delegation
//   -validator emits permissionDecision:deny for impl paths.
//
// Could have caught by: contract test on hook inventory + grep-based
// uniqueness check on the kill-list text + hook unit test for deny verdict.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

describe('P1-7: prompt-router consolidation', () => {
  it('removes the two pre-consolidation hooks from .claude/hooks/', () => {
    const oldEnforcer = path.join(ROOT, '.claude/hooks/delegation-enforcer.cjs');
    const oldMagic = path.join(ROOT, '.claude/hooks/magic-keywords.cjs');
    expect(fs.existsSync(oldEnforcer)).toBe(false);
    expect(fs.existsSync(oldMagic)).toBe(false);
  });

  it('ships .claude/hooks/prompt-router.cjs registered for both UserPromptSubmit and PreToolUse[Agent]', () => {
    const newHook = path.join(ROOT, '.claude/hooks/prompt-router.cjs');
    expect(fs.existsSync(newHook)).toBe(true);

    const settings = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8')
    );

    const stringifyHookList = (event) =>
      JSON.stringify(settings.hooks?.[event] || []);

    expect(stringifyHookList('UserPromptSubmit')).toContain('prompt-router');
    // PreToolUse for Agent matcher
    const preToolUse = settings.hooks?.PreToolUse || [];
    const agentBlock = preToolUse.find((b) => (b.matcher || '').includes('Agent'));
    expect(agentBlock).toBeTruthy();
    expect(JSON.stringify(agentBlock)).toContain('prompt-router');

    // Old hook names are NOT referenced in settings.json
    const allSettings = JSON.stringify(settings);
    expect(allSettings).not.toMatch(/delegation-enforcer/);
    expect(allSettings).not.toMatch(/magic-keywords/);
  });

  it('canonicalizes the kill-list table in exactly one location (.claude/rules/core/delegation.md)', () => {
    const canonicalPath = path.join(ROOT, '.claude/rules/core/delegation.md');
    expect(fs.existsSync(canonicalPath)).toBe(true);

    const canonicalContent = fs.readFileSync(canonicalPath, 'utf8');
    expect(canonicalContent).toMatch(/Rationalization Kill List/i);
    // The canonical file MUST have the table (header + at least 6 rows)
    expect(canonicalContent).toMatch(/\|\s*Rationalization\s*\|\s*Why it fails\s*\|/);

    // grep for the inline "Why it fails" column header across .claude/skills
    // and .claude/rules — that header is the unambiguous signal that the FULL
    // kill-list table is inlined in a file. Must appear exactly once.
    const searchRoots = [
      path.join(ROOT, '.claude/skills'),
      path.join(ROOT, '.claude/rules')
    ];
    const hits = [];
    for (const root of searchRoots) {
      if (!fs.existsSync(root)) continue;
      const result = spawnSync(
        'grep',
        ['-rln', '--include=*.md', 'Why it fails', root],
        { encoding: 'utf8' }
      );
      if (result.stdout) {
        result.stdout.split('\n').filter(Boolean).forEach((p) => hits.push(p));
      }
    }
    expect(hits.length).toBe(1);
    expect(hits[0]).toMatch(/delegation\.md$/);
  });

  it('replaces the inline kill-list in run/SKILL.md and team/SKILL.md with an @-reference', () => {
    const runSkill = fs.readFileSync(
      path.join(ROOT, '.claude/skills/run/SKILL.md'),
      'utf8'
    );
    const teamSkill = fs.readFileSync(
      path.join(ROOT, '.claude/skills/team/SKILL.md'),
      'utf8'
    );

    // The huge inline rationalization table is gone from run/SKILL.md
    expect(runSkill).not.toMatch(/\|\s*Rationalization\s*\|\s*Why it fails\s*\|/);

    // Both reference the canonical delegation.md
    expect(runSkill).toMatch(/@\.claude\/rules\/core\/delegation\.md/);
    expect(teamSkill).toMatch(/@\.claude\/rules\/core\/delegation\.md/);
  });

  it('controller-delegation-validator emits permissionDecision:deny for impl paths', () => {
    const hookPath = path.join(
      ROOT,
      '.claude/hooks/controller-delegation-validator.cjs'
    );
    expect(fs.existsSync(hookPath)).toBe(true);

    // Stub session — the test exercises the impl-path deny branch even
    // when no active session is found, since the deny on impl paths must
    // be unconditional (no agent_tree.yaml dependency).
    const stdin = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: 'src/app/auth.ts' },
      session_id: 'nonexistent-session'
    });

    const result = spawnSync('node', [hookPath], {
      input: stdin,
      encoding: 'utf8',
      env: { ...process.env, CAGENTS_DELEGATION_ENFORCEMENT: 'block' }
    });

    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout || '{}');
    const decision =
      out.hookSpecificOutput?.permissionDecision ||
      out.permissionDecision ||
      '';
    expect(decision).toBe('deny');
  });

  it('prompt-router.cjs is well-formed and exits 0 on empty stdin', () => {
    const hookPath = path.join(ROOT, '.claude/hooks/prompt-router.cjs');
    const result = spawnSync('node', [hookPath], {
      input: '{}',
      encoding: 'utf8'
    });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout || '{}');
    expect(out.continue === undefined || out.continue === true).toBe(true);
  });
});
