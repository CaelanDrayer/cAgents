import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'session-init-gate.cjs');

function runHook(input, env = {}) {
  const inputStr = JSON.stringify(input).replace(/'/g, "'\\''");
  const result = execSync(
    `printf '%s' '${inputStr}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

describe('session-init-gate.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    // Isolated project root with no cagents-memory — findActiveSession returns null
    tmpDir = join(tmpdir(), 'cagents-test-sig-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should allow non-Agent tool calls', () => {
    const result = runHook(
      { tool_name: 'Write', tool_input: {} },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.continue).toBe(true);
  });

  // RF-1 (v12.70.0): the presence check is ADVISORY. It used to DENY here, and
  // that deny is exactly what broke delegation on every clean machine — see the
  // 'clean-project bootstrap' describe block below for the full rationale.
  it('ALLOWS an Agent spawn when no active session exists, with a loud advisory (RF-1)', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.continue).toBe(true);
    expect(result.systemMessage || '').toMatch(/SESSION PRESENCE/);
  });

  it('advisory names the sessions directory it self-healed (RF-1/RF-5)', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
    expect(surfaced).toContain('sessions');
    expect(surfaced).toMatch(/AUTO-CREATED/);
    // The scaffold really was created on disk (self-heal, not just a message).
    expect(existsSync(join(tmpDir, 'cagents-memory', 'sessions'))).toBe(true);
  });

  it('should allow Agent spawn when active session with status.yaml exists', () => {
    const sessionId = 'act_test-gate_260320_999';
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-20T10:00:00Z"\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: {}, session_id: sessionId },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.continue).toBe(true);
  });

  it('should bypass gate when CAGENTS_SESSION_ID env var is set', () => {
    // No session dir exists — but CAGENTS_SESSION_ID signals skill is creating it now
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: 'act_test_260320_001' }
    );
    expect(result.continue).toBe(true);
  });

  it('should allow Agent spawn when CAGENTS_SESSION_ID is set and session dir already exists with valid status.yaml', () => {
    // Dir exists with valid status — standard findActiveSession check finds it, so spawn is allowed
    const sessionId = 'act_test-gate-env_260322_001';
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-22T10:00:00Z"\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' }, session_id: sessionId },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: sessionId }
    );
    expect(result.continue).toBe(true);
  });

  it('ALLOWS with an orphan-branch advisory when CAGENTS_SESSION_ID is set and the session dir exists but resolves to nothing', () => {
    // Dir exists but findActiveSession cannot find any non-terminal session —
    // no session_id hint is passed in the tool input, and the dir has no status.yaml
    // or any other recognisable session file. Pre-RF-1 this DENIED. It is now the
    // 'orphan' branch: allowed, with the remediation for THAT branch (start a new
    // session / set CAGENTS_ACTIVE_SESSION) rather than the old generic
    // "Run a skill first", which was wrong in three of the four branches.
    const sessionId = 'act_test-gate-env-deny_260322_002';
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    // No status.yaml, instruction.yaml, or agent_tree.yaml — only the bare directory

    // Note: no session_id in the hook input — without a hint, findActiveSession falls
    // through all three passes and returns null for an empty dir outside the grace window.
    // We set mtime to the past to ensure the session is outside the grace period.
    const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const { utimesSync } = require('fs');
    utimesSync(sessionDir, pastTime, pastTime);

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: sessionId }
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
    expect(surfaced).toMatch(/CAUSE:/);
    expect(surfaced).toMatch(/CAGENTS_ACTIVE_SESSION|start a NEW session/);
  });
});

// ============================================================================
// RF-1 — clean-project bootstrap (C1 / C2 / C3)
// ============================================================================
// The presence gate's stated purpose was to catch ORPHAN spawns. In production
// it overwhelmingly caught LEGITIMATE ones:
//
//   C1  `cagents-memory/` is git-ignored, so a fresh clone and every
//       first-time plugin install has no `sessions/` dir at all. The gate
//       denied EVERY Agent spawn — and, because Phase 1 keyed on
//       `tool_name === 'Agent'` alone, it denied Claude Code's OWN subagents
//       (Explore / general-purpose / Plan) too. The parent could not delegate
//       anything and absorbed all the work itself.
//   C2  A session in ANY terminal state (VALIDATED / complete / failed /
//       aborted / incomplete) stops resolving, so a SUCCESSFUL /act could not
//       spawn a single follow-up agent.
//   C3  Dev machines only appeared healthy because abandoned non-terminal husk
//       dirs kept the fallback heuristic satisfied — the whole "it works here,
//       not there" asymmetry was litter, not logic.
//
// The documented escape hatch (CAGENTS_SESSION_ID / CAGENTS_ACTIVE_SESSION) is
// dead in this shape: a skill cannot set an env var in the hook SUBPROCESS,
// because every Bash call is a fresh shell.
//
// BEFORE FIX these three cases return permissionDecision:'deny'. Case (c) is
// the one that must never regress: cAgents has no business gating the harness's
// own delegation under any circumstances.
describe('session presence gate — clean-project bootstrap', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'cagents-test-sig-bootstrap-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // Clear BOTH bypass env vars so the presence path is genuinely exercised.
  const CLEAN_ENV = { CAGENTS_SESSION_ID: '', CAGENTS_ACTIVE_SESSION: '' };

  it('(a) CLAUDE_PROJECT_DIR with no cagents-memory/ does NOT deny — it self-heals and allows', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, ...CLEAN_ENV }
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.continue).toBe(true);
    // Self-heal: the scaffold now exists, and the message says so.
    expect(existsSync(join(tmpDir, 'cagents-memory', 'sessions'))).toBe(true);
    expect(result.systemMessage || '').toMatch(/AUTO-CREATED/);
  });

  it('(b) a project whose ONLY session is pipeline_state: VALIDATED does NOT deny', () => {
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', 'act_finished_260909_001');
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'session_id: act_finished_260909_001\npipeline_state: VALIDATED\nphase: completed\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, ...CLEAN_ENV }
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.continue).toBe(true);
    // Branch-specific remediation (RF-5 #3): says TERMINAL, not "run a skill first".
    const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
    expect(surfaced).toMatch(/TERMINAL/);
  });

  it("(c) subagent_type 'Explore' is never denied in either shape (MUST NEVER REGRESS)", () => {
    // Shape 1: no cagents-memory/ at all.
    const bare = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'Explore' } },
      { CLAUDE_PROJECT_DIR: tmpDir, ...CLEAN_ENV }
    );
    expect(bare.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(bare.continue).toBe(true);

    // Shape 2: only-terminal-session project.
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', 'act_finished_260909_002');
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'pipeline_state: VALIDATED\n');
    const terminal = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'Explore' } },
      { CLAUDE_PROJECT_DIR: tmpDir, ...CLEAN_ENV }
    );
    expect(terminal.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(terminal.continue).toBe(true);
  });
});

// ============================================================================
// RF-2 — non-cAgents subagent types are never gated
// ============================================================================
// Phase 1 used to key on `tool_name === 'Agent'` alone; `subagent_type` was not
// consulted until Phase 2, long after the deny had already returned. The scope
// guard now runs FIRST. This is the cheapest possible restoration of ordinary
// Claude Code behaviour and holds even if every other fix here regresses.
describe('non-cagents subagent types are never gated', () => {
  let tmpDir;

  beforeEach(() => {
    // An EMPTY cagents-memory (the dir exists, holds no sessions) — the shape
    // that is neither "absent" nor "resolvable".
    tmpDir = join(tmpdir(), 'cagents-test-sig-scope-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    mkdirSync(join(tmpDir, 'cagents-memory', 'sessions'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const NON_CAGENTS = ['Explore', 'general-purpose', 'Plan', 'backend-developer'];

  it.each(NON_CAGENTS)('%s is passed through untouched (no deny, no advisory)', (subagentType) => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: subagentType } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: '', CAGENTS_ACTIVE_SESSION: '' }
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.continue).toBe(true);
    // Untouched: the gate contributes NOTHING for a non-cAgents spawn, so no
    // session advisory is attached either.
    expect(result.systemMessage || '').not.toMatch(/SESSION PRESENCE/);
    expect(result.hookSpecificOutput?.permissionDecisionReason || '').not.toMatch(/SESSION PRESENCE/);
  });

  it('a cagents:* spawn in the SAME project DOES get the advisory (proves the guard is scoped, not disabled)', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: '', CAGENTS_ACTIVE_SESSION: '' }
    );
    expect(result.systemMessage || '').toMatch(/SESSION PRESENCE/);
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });
});

describe('session-init-gate.cjs — Phase 2 registered-agent advisory (v12.62.2 regression)', () => {
  // v12.68.0: the catalog source moved from .claude-plugin/plugin.json's
  // `agents` array to the flat agents/ directory (Claude Code discovers plugin
  // agents with a non-recursive scan of agents/). The regression this block
  // pins is unchanged — only the thing that can go missing is now agents/.
  //
  // Root cause (v12.62.2): loadRegisteredAgents() returned an EMPTY Set — not a
  // distinct "cannot verify" signal — whenever the catalog source could not be
  // read at PROJECT_ROOT. That is exactly what happens inside a /team
  // worktree-isolated subagent, because `.claude-plugin/` was missing from
  // `worktree.sparsePaths` in .claude/settings.json (only `.claude/`,
  // `cagents-memory/_system/`, `agents/`, `scripts/`, `tests/`, `docs/` were
  // checked out). An empty Set made aliasLookup() treat EVERY `cagents:<name>`
  // spawn — including fully valid, currently-registered agents such as
  // architect/scholar/product-owner (and, empirically, all 60 catalog agents)
  // — as "not a registered agent", because it could not distinguish "the
  // catalog is empty" from "the catalog could not be read".
  //
  // BEFORE FIX: a PROJECT_ROOT with no catalog on disk (this test's empty
  // tmpDir, mirroring the worktree's incomplete sparse checkout) makes every
  // one of these names — including architect/scholar/product-owner — receive
  // the false "is not a registered agent" advisory. Verified via git-stash:
  // reverting session-init-gate.cjs to HEAD~1 (pre-fix) and re-running this
  // block fails both catalog assertions below with non-empty falsePositives.
  // AFTER FIX: loadRegisteredAgents() returns `null` (not an empty Set) when
  // the catalog is unreadable, and aliasLookup() treats `null` as "cannot
  // verify — stay silent" instead of "confirmed unregistered".
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'cagents-test-sig-catalog-absent-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does NOT flag cagents:architect / cagents:scholar / cagents:product-owner as unregistered when the catalog is absent (worktree-sparse-checkout simulation)', () => {
    for (const name of ['architect', 'scholar', 'product-owner']) {
      const result = runHook(
        { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
        { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: `act_test-catalog-absent-${name}_260801_001` }
      );
      expect(result.continue).toBe(true);
      expect(result.systemMessage || '').not.toMatch(/is not a registered agent/);
    }
  });

  it('does NOT flag ANY agent from the live catalog as unregistered when the catalog is absent (whole-catalog guard, catches future catalog drift)', () => {
    // 60 agents x one spawnSync'd node process each ⇒ needs more than the 5s
    // vitest default. Timeout raised via the third `it()` argument below.
    const agentsDir = join(process.cwd(), 'agents');
    const names = require('fs')
      .readdirSync(agentsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.slice(0, -'.md'.length));
    // Sanity: the live catalog should have a substantial number of agents —
    // if this drops to 0 the test below would vacuously pass, so guard it.
    expect(names.length).toBeGreaterThan(0);

    const falsePositives = [];
    for (const name of names) {
      const result = runHook(
        { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
        { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: `act_test-catalog-absent-catalog-${name}_260801_001` }
      );
      if ((result.systemMessage || '').includes('is not a registered agent')) {
        falsePositives.push(name);
      }
    }
    expect(falsePositives).toEqual([]);
  }, 30000);

  it('does NOT flag cagents:architect / cagents:scholar / cagents:product-owner as unregistered at the real project root (catalog present)', () => {
    for (const name of ['architect', 'scholar', 'product-owner']) {
      const result = runHook(
        { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
        { CLAUDE_PROJECT_DIR: process.cwd(), CAGENTS_SESSION_ID: `act_test-real-root-${name}_260801_001` }
      );
      expect(result.continue).toBe(true);
      expect(result.systemMessage || '').not.toMatch(/is not a registered agent/);
    }
  });

  it('still emits a legitimate advisory for a genuinely unknown name when the catalog IS present (no over-correction)', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:totally-made-up-agent-xyz' } },
      { CLAUDE_PROJECT_DIR: process.cwd(), CAGENTS_SESSION_ID: 'act_test-unknown-agent_260801_001' }
    );
    expect(result.continue).toBe(true);
    expect(result.systemMessage || '').toMatch(/not a registered agent|Did you mean/);
  });

  it('worktree.sparsePaths in .claude/settings.json includes .claude-plugin/ (data-completeness root cause)', () => {
    const settingsPath = join(process.cwd(), '.claude', 'settings.json');
    const settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
    const sparsePaths = (settings.worktree && settings.worktree.sparsePaths) || [];
    expect(sparsePaths).toContain('.claude-plugin/');
  });

  // --- RF-3 (v12.70.0): FOREIGN agents/ at PROJECT_ROOT must not be read as
  // the cAgents catalog ---------------------------------------------------
  // The catalog and the alias map are PLUGIN content, but the lookup was rooted
  // at PROJECT_ROOT (= CLAUDE_PROJECT_DIR || PLUGIN_ROOT — they coincide only
  // in this repo's local-dev shape). `agents/` is a conventional directory
  // name, so any user project that happens to have one had it read as the
  // cAgents catalog. Every single `cagents:*` spawn was then told, in
  // permissionDecisionReason — the most authoritative channel there is — that
  // the agent it just tried to spawn "is not a registered agent", for the whole
  // session. The predictable model response is to stop delegating and do the
  // work itself: warn-into-abandonment.
  //
  // BEFORE FIX this test fails on every name, with
  // `cagents:<name> is not a registered agent.` in both channels.
  it('does NOT emit a "not a registered agent" advisory when CLAUDE_PROJECT_DIR holds a FOREIGN agents/ dir (RF-3)', () => {
    const foreignDir = join(tmpdir(), 'cagents-test-sig-foreign-agents-' + Date.now());
    mkdirSync(join(foreignDir, 'agents'), { recursive: true });
    // A foreign catalog: real directory, real .md files, none of them cAgents',
    // and crucially NO agents/planner.md sentinel.
    writeFileSync(join(foreignDir, 'agents', 'my-project-helper.md'), '# not a cAgents agent\n');
    writeFileSync(join(foreignDir, 'agents', 'deploy-bot.md'), '# not a cAgents agent\n');
    try {
      for (const name of ['architect', 'backend-developer', 'planner']) {
        const result = runHook(
          { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
          {
            CLAUDE_PROJECT_DIR: foreignDir,
            CLAUDE_PLUGIN_ROOT: process.cwd(),
            CAGENTS_SESSION_ID: `act_test-foreign-catalog-${name}_260909_001`,
          }
        );
        const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
        expect(surfaced, `false advisory for cagents:${name}`).not.toMatch(/is not a registered agent/);
        expect(surfaced, `false suggestion for cagents:${name}`).not.toMatch(/Did you mean/);
        expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
      }
    } finally {
      rmSync(foreignDir, { recursive: true, force: true });
    }
  });

  it('only trusts a directory as the catalog when the agents/planner.md sentinel is present (RF-3)', () => {
    // CAGENTS_DISPATCH_IMPORT suppresses the module's standalone createHook()
    // registration — without it, require() would start reading stdin and hang.
    process.env.CAGENTS_DISPATCH_IMPORT = '1';
    let gate;
    try {
      gate = require(join(process.cwd(), '.claude', 'hooks', 'session-init-gate.cjs'));
    } finally {
      delete process.env.CAGENTS_DISPATCH_IMPORT;
    }
    expect(gate.CATALOG_SENTINEL).toBe(join('agents', 'planner.md'));
    // In this repo the sentinel is real, so the catalog resolves.
    expect(existsSync(join(process.cwd(), gate.CATALOG_SENTINEL))).toBe(true);
    expect(gate.resolveCatalogRoot()).toBeTruthy();
  });

  // ── LOW-2 (review round 1): a catalog-not-found degrade must be VISIBLE ──
  describe('catalog-not-found is a VISIBLE, fail-open degrade (RF-5 / LOW-2)', () => {
    /**
     * When `resolveCatalogRoot()` returns null the registered-agent / v12-alias
     * advisory is silently disabled: `aliasResult` goes null, no notice is
     * pushed, and the gate emits a bare `{continue:true}`. `envFingerprint()`
     * does report `catalog_root=NOT-FOUND`, but it was only reachable from
     * `absenceNotice` / `heuristicNotice`, so in the COMMON shape (session
     * resolves fine, catalog missing) the model saw nothing at all. RF-5's own
     * doctrine is that every degrade is visible to the model, not stderr-only.
     *
     * PLUGIN_ROOT is anchored on `__dirname`, so the only way to exercise this
     * branch honestly is to run a COPY of the hooks layer from a root that has
     * CLAUDE.md but no `agents/planner.md` sentinel. Faking it by overriding
     * CLAUDE_PLUGIN_ROOT does not work — and a test that tried would pass
     * vacuously against the real repo catalog.
     */
    let catalogLessRoot;
    let projRoot;

    beforeEach(() => {
      catalogLessRoot = join(tmpdir(), 'cagents-nocat-plug-' + Date.now());
      mkdirSync(join(catalogLessRoot, '.claude', 'hooks'), { recursive: true });
      for (const f of readdirSync(HOOKS_DIR)) {
        if (f.endsWith('.cjs')) copyFileSync(join(HOOKS_DIR, f), join(catalogLessRoot, '.claude', 'hooks', f));
      }
      // CLAUDE.md makes it a valid PLUGIN_ROOT; the ABSENCE of agents/planner.md
      // is the condition under test.
      writeFileSync(join(catalogLessRoot, 'CLAUDE.md'), '# temp plugin root (no agents/ catalog)\n');
      expect(existsSync(join(catalogLessRoot, 'agents', 'planner.md'))).toBe(false);

      projRoot = join(tmpdir(), 'cagents-nocat-proj-' + Date.now());
      const sd = join(projRoot, 'cagents-memory', 'sessions', 'act_nocat_260909_001');
      mkdirSync(join(sd, 'workflow'), { recursive: true });
      writeFileSync(join(sd, 'status.yaml'), 'phase: executing\npipeline_state: PLANNED\n');
    });

    afterEach(() => {
      rmSync(catalogLessRoot, { recursive: true, force: true });
      rmSync(projRoot, { recursive: true, force: true });
    });

    function runCatalogLess(subagentType) {
      const hook = join(catalogLessRoot, '.claude', 'hooks', 'session-init-gate.cjs');
      const input = JSON.stringify({
        tool_name: 'Agent',
        session_id: 'act_nocat_260909_001',
        tool_input: { subagent_type: subagentType },
      }).replace(/'/g, "'\\''");
      const out = execSync(`printf '%s' '${input}' | node "${hook}"`, {
        encoding: 'utf8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CLAUDE_PROJECT_DIR: projRoot, CAGENTS_SESSION_ID: 'act_nocat_260909_001' },
      });
      return JSON.parse(out.trim());
    }

    it('emits an advisory naming WHAT was looked for and WHERE', () => {
      const result = runCatalogLess('cagents:backend-developer');
      const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
      expect(surfaced, 'catalog-not-found degraded in SILENCE').toMatch(/AGENT CATALOG NOT FOUND/);
      // WHAT was looked for: the sentinel path.
      expect(surfaced).toContain(join('agents', 'planner.md'));
      // WHERE it was looked for: both candidate roots, by absolute path.
      expect(surfaced).toContain(catalogLessRoot);
      expect(surfaced).toContain(projRoot);
      // And it says what is now degraded, so the consequence is not a guess.
      expect(surfaced).toMatch(/advisory is DISABLED/);
    });

    it('stays FAIL-OPEN — a missing catalog never denies or blocks the spawn', () => {
      const result = runCatalogLess('cagents:backend-developer');
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
      // Critically: it must NOT assert non-membership it cannot verify.
      const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
      expect(surfaced).not.toMatch(/is not a registered agent/);
      expect(surfaced).not.toMatch(/Did you mean/);
    });

    it('does not fire when the catalog IS found (no new always-on noise)', () => {
      // Same input, real repo hooks => catalog resolves => no such advisory.
      const result = runHook(
        { tool_name: 'Agent', session_id: 'act_nocat_260909_001', tool_input: { subagent_type: 'cagents:backend-developer' } },
        { CLAUDE_PROJECT_DIR: projRoot, CAGENTS_SESSION_ID: 'act_nocat_260909_001' }
      );
      const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
      expect(surfaced).not.toMatch(/AGENT CATALOG NOT FOUND/);
    });

    it('is scoped to cagents:* spawns — a harness-native spawn is untouched', () => {
      // Phase 0 returns before Phase 2, so Explore/general-purpose never see it.
      for (const t of ['Explore', 'general-purpose']) {
        const result = runCatalogLess(t);
        const surfaced = `${result.systemMessage || ''}\n${result.hookSpecificOutput?.permissionDecisionReason || ''}`;
        expect(surfaced, `${t} should not see the catalog advisory`).not.toMatch(/AGENT CATALOG NOT FOUND/);
        expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
      }
    });
  });
});
