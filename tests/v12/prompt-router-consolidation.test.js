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
// - B1 (v12.18.0): the impl-path deny is now CONTROLLER-SCOPED (fires only when
//   an active cAgents controller is in agent_tree.yaml), not unconditional, so
//   it never blocks an ordinary direct user edit. The deny test below sets up an
//   active-controller session; a no-session control case asserts the no-op.
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

  it('controller-delegation-validator emits permissionDecision:deny for impl paths when a controller is active', () => {
    const hookPath = path.join(
      ROOT,
      '.claude/hooks/controller-delegation-validator.cjs'
    );
    expect(fs.existsSync(hookPath)).toBe(true);

    // B1 (v12.18.0): enforcement is CONTROLLER-SCOPED. The deny fires only when
    // an active cAgents controller is present in agent_tree.yaml — NOT
    // unconditionally — so it never blocks an ordinary direct user edit. Set up
    // a temp session with an active controller to exercise the deny branch.
    const sid = 'test_prv_delegation_260612_001';
    const sessionDir = path.join(ROOT, 'cagents-memory', 'sessions', sid);
    const workflowDir = path.join(sessionDir, 'workflow');
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(
      path.join(workflowDir, 'agent_tree.yaml'),
      'agents:\n  - agent_id: "a1"\n    cagents_type: "cagents:tech-lead"\n    spawned_at: "2026-06-12T10:00:00Z"\n    stopped_at: null\n'
    );
    fs.writeFileSync(
      path.join(sessionDir, 'status.yaml'),
      'pipeline_state: coordinating\nphase: coordinating\n'
    );
    // Back-date the temp session's mtime ~1h into the past so it can never be
    // the "newest active" session picked up by other tests that scan the shared
    // cagents-memory/sessions/ dir under findActiveSession({fallbackHeuristic}).
    // Our own assertions below resolve the session by EXPLICIT hint
    // (session_id + CAGENTS_ACTIVE_SESSION), which is mtime-independent, so
    // back-dating does not affect this test.
    const past = (Date.now() - 3600_000) / 1000;
    try {
      fs.utimesSync(path.join(sessionDir, 'status.yaml'), past, past);
      fs.utimesSync(sessionDir, past, past);
    } catch { /* best-effort */ }

    try {
      const stdin = JSON.stringify({
        tool_name: 'Write',
        tool_input: { file_path: 'src/app/auth.ts' },
        session_id: sid
      });
      const result = spawnSync('node', [hookPath], {
        input: stdin,
        encoding: 'utf8',
        env: { ...process.env, CAGENTS_DELEGATION_ENFORCEMENT: 'block', CAGENTS_ACTIVE_SESSION: sid }
      });
      expect(result.status).toBe(0);
      const out = JSON.parse(result.stdout || '{}');
      const decision =
        out.hookSpecificOutput?.permissionDecision ||
        out.permissionDecision ||
        '';
      expect(decision).toBe('deny');

      // Footgun guard: with NO active session/controller, the SAME write is a
      // no-op (ordinary direct user edit is never blocked).
      const noSessionResult = spawnSync('node', [hookPath], {
        input: JSON.stringify({
          tool_name: 'Write',
          tool_input: { file_path: 'src/app/auth.ts' },
          session_id: 'nonexistent-session-260612-999'
        }),
        encoding: 'utf8',
        env: { ...process.env, CAGENTS_DELEGATION_ENFORCEMENT: 'block', CAGENTS_ACTIVE_SESSION: 'nonexistent-session-260612-999' }
      });
      expect(noSessionResult.status).toBe(0);
      const noOut = JSON.parse(noSessionResult.stdout || '{}');
      expect(noOut.hookSpecificOutput?.permissionDecision).toBeUndefined();
      expect(noOut.continue === undefined || noOut.continue === true).toBe(true);
    } finally {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }, 15000); // two cold node spawns + fs setup can exceed the default 5s timeout

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
