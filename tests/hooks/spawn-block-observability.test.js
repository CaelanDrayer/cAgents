/**
 * spawn-block-observability — every block, degrade, and heuristic resolution
 * must be visible TO THE MODEL, not only on stderr. (RF-5, fixes FS-1…FS-8.)
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The reason a month-old abandoned `designer_*` session directory was silently
 * authorising production Agent spawns — for months — is that the only record of
 * it was a `console.error`. stderr is not surfaced to the model. So a spawning
 * agent could be blocked, degraded, or bound to somebody else's session and have
 * no way to know it, let alone say so. A parent that cannot see WHY delegation
 * failed stops delegating and absorbs the work itself, which is the token
 * blow-up this whole strand is about.
 *
 * THE INVARIANT (asserted table-driven over every branch below)
 *   For every deny / degrade / heuristic-resolution path:
 *     1. the verdict carries a NON-EMPTY `permissionDecisionReason` OR a
 *        non-empty `systemMessage` — never stderr alone; and
 *     2. it is not a bare `{continue:true}`. A bare continue after a degraded
 *        path is indistinguishable from "everything was fine", which is the
 *        exact failure mode being closed.
 *
 * BEFORE FIX: the absent-dir branch (FS-1), the fallback-heuristic branch
 * (FS-8), the createHook outer catch (FS-4), and run-hook's hook-not-found
 * branch (FS-3) all emitted their only signal to stderr.
 *
 * Isolation: hook-utils binds AGENT_MEMORY_DIR = (CLAUDE_PROJECT_DIR ||
 * PLUGIN_ROOT)/cagents-memory at MODULE LOAD, so each case sets
 * CLAUDE_PROJECT_DIR to a per-case temp dir and re-require()s hook-utils and
 * then session-init-gate (in that order, so the gate binds to the temp-rooted
 * utils). CAGENTS_DISPATCH_IMPORT suppresses the gate's standalone createHook()
 * stdin registration so handler() can be called directly.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const REPO_ROOT = process.cwd();
const HOOKS_DIR = join(REPO_ROOT, '.claude', 'hooks');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');

// SDK transcript UUID (8-4-4-4-12 lowercase hex) — the real production payload
// shape for `input.session_id`, which is NOT a cAgents session directory name.
const UUID = '9f3c1a20-4b7e-4c11-9a55-6d2e8b0f77aa';

const createdRoots = [];

function freshRoot(label) {
  const root = mkdtempSync(join(tmpdir(), `cagents-obs-${label}-`));
  createdRoots.push(root);
  return root;
}

/**
 * Load session-init-gate bound to `projectDir`, with the presence-bypass env
 * vars cleared so the degrade paths are genuinely exercised.
 */
function gateFor(projectDir) {
  const prev = {
    project: process.env.CLAUDE_PROJECT_DIR,
    sid: process.env.CAGENTS_SESSION_ID,
    active: process.env.CAGENTS_ACTIVE_SESSION,
  };
  process.env.CLAUDE_PROJECT_DIR = projectDir;
  delete process.env.CAGENTS_SESSION_ID;
  delete process.env.CAGENTS_ACTIVE_SESSION;
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  delete require.cache[require.resolve(join(HOOKS_DIR, 'session-init-gate.cjs'))];
  process.env.CAGENTS_DISPATCH_IMPORT = '1';
  const mod = require(join(HOOKS_DIR, 'session-init-gate.cjs'));
  delete process.env.CAGENTS_DISPATCH_IMPORT;
  const restore = () => {
    if (prev.project === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prev.project;
    if (prev.sid !== undefined) process.env.CAGENTS_SESSION_ID = prev.sid;
    if (prev.active !== undefined) process.env.CAGENTS_ACTIVE_SESSION = prev.active;
  };
  return { mod, restore };
}

/**
 * RR-1: same isolation as gateFor, but with CAGENTS_SESSION_ID deliberately SET
 * (gateFor clears it). The gate reads that env var inside handler(), not at
 * module load, so setting it after the require is correct. The returned restore
 * deletes it first — gateFor's own restore only re-sets a PREVIOUSLY-DEFINED
 * value, so without the explicit delete the var would leak into later cases.
 */
function gateWithSessionId(projectDir, sessionId) {
  const { mod, restore } = gateFor(projectDir);
  process.env.CAGENTS_SESSION_ID = sessionId;
  return {
    mod,
    restore: () => {
      delete process.env.CAGENTS_SESSION_ID;
      restore();
    },
  };
}

function spawnInput(subagentType = 'cagents:backend-developer') {
  return { tool_name: 'Agent', tool_input: { subagent_type: subagentType }, session_id: UUID };
}

/** Everything the MODEL can actually read from a verdict. */
function surfaced(verdict) {
  if (!verdict) return '';
  const sm = typeof verdict.systemMessage === 'string' ? verdict.systemMessage : '';
  const pdr = verdict.hookSpecificOutput && typeof verdict.hookSpecificOutput.permissionDecisionReason === 'string'
    ? verdict.hookSpecificOutput.permissionDecisionReason
    : '';
  const shorthand = typeof verdict.reason === 'string' ? verdict.reason : '';
  return [sm, pdr, shorthand].filter(Boolean).join('\n');
}

function isBareContinue(verdict) {
  return !!verdict
    && verdict.continue === true
    && !verdict.systemMessage
    && !verdict.reason
    && !verdict.hookSpecificOutput;
}

/**
 * The shared assertion. Every degraded path goes through here so a new branch
 * cannot be added with stderr-only reporting.
 */
function expectVisible(verdict, label) {
  expect(verdict, `${label}: returned null — a degraded path must report something`).not.toBeNull();
  expect(isBareContinue(verdict), `${label}: returned a bare {continue:true} after a degraded path`).toBe(false);
  expect(surfaced(verdict).trim().length, `${label}: nothing reached the model (stderr-only)`).toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// Fixture builders — one per degrade branch of the session presence check.
// ---------------------------------------------------------------------------

function fixtureAbsentDir() {
  // FS-1 / C1: no cagents-memory/ at all — a fresh clone or first-time plugin
  // install. `cagents-memory/` is git-ignored, so this is the DEFAULT shape of
  // every machine that is not a cAgents dev box.
  return freshRoot('absent');
}

function fixtureEmptyDir() {
  const root = freshRoot('empty');
  mkdirSync(join(root, 'cagents-memory', 'sessions'), { recursive: true });
  return root;
}

function fixtureAllTerminal() {
  // C2: a SUCCESSFUL /act writes pipeline_state: VALIDATED, after which the
  // session can no longer authorise a single follow-up spawn.
  const root = freshRoot('terminal');
  const dir = join(root, 'cagents-memory', 'sessions', 'act_finished_260909_001');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), 'session_id: act_finished_260909_001\npipeline_state: VALIDATED\n');
  return root;
}

function fixtureOrphan() {
  // A bare session directory: no status.yaml, no instruction.yaml, nothing the
  // resolver recognises.
  const root = freshRoot('orphan');
  mkdirSync(join(root, 'cagents-memory', 'sessions', 'act_husk_260101_001'), { recursive: true });
  return root;
}

function fixtureHeuristic() {
  // C3 / FS-8: a non-terminal session exists but the payload carries an SDK
  // UUID with no map pointer and no env var, so resolution falls to the
  // newest-session heuristic. On a real dev box this is how an abandoned
  // month-old directory ends up authorising live spawns.
  const root = freshRoot('heuristic');
  const dir = join(root, 'cagents-memory', 'sessions', 'designer_abandoned_260805_001');
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), 'session_id: designer_abandoned_260805_001\nphase: EXECUTING\n');
  return root;
}

const PRESENCE_BRANCHES = [
  ['absent-dir  (FS-1 / C1: no cagents-memory at all)', fixtureAbsentDir, /AUTO-CREATED|could NOT be created/],
  ['empty-dir   (sessions/ exists, holds nothing)', fixtureEmptyDir, /CAUSE:/],
  ['all-terminal(C2: only a VALIDATED session)', fixtureAllTerminal, /TERMINAL/],
  ['orphan      (session dirs exist, none resolvable)', fixtureOrphan, /CAUSE:/],
  ['heuristic   (FS-8: authorised by an unrelated session)', fixtureHeuristic, /FALLBACK HEURISTIC/],
];

describe('spawn-block observability — every degrade reaches the model', () => {
  afterEach(() => {
    while (createdRoots.length) {
      const r = createdRoots.pop();
      try { chmodSync(join(r, 'cagents-memory', 'sessions'), 0o755); } catch { /* may not exist */ }
      try { rmSync(r, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  describe('session-init-gate presence branches', () => {
    it.each(PRESENCE_BRANCHES)('%s is reported in systemMessage/permissionDecisionReason', async (label, makeFixture, expectedPhrase) => {
      const root = makeFixture();
      const { mod, restore } = gateFor(root);
      try {
        const verdict = await mod.handler(spawnInput());
        expectVisible(verdict, label);
        expect(surfaced(verdict), `${label}: branch-specific remediation missing`).toMatch(expectedPhrase);
        // RF-1: advisory only — no branch of the presence check may deny.
        expect(verdict.hookSpecificOutput?.permissionDecision, `${label}: presence check must never deny`).not.toBe('deny');
      } finally {
        restore();
      }
    });

    it.each(PRESENCE_BRANCHES)('%s carries the one-line install self-check (RF-5 #5)', async (label, makeFixture) => {
      const root = makeFixture();
      const { mod, restore } = gateFor(root);
      try {
        const verdict = await mod.handler(spawnInput());
        const text = surfaced(verdict);
        expect(text, `${label}: no SELF-CHECK line`).toMatch(/SELF-CHECK: cAgents v/);
        expect(text, `${label}: SELF-CHECK omits the flat agents/ count`).toMatch(/agents\/=\d+/);
      } finally {
        restore();
      }
    });

    it('the fallback-heuristic notice names the session AND its last-modified time', async () => {
      const root = fixtureHeuristic();
      const { mod, restore } = gateFor(root);
      try {
        const verdict = await mod.handler(spawnInput());
        const text = surfaced(verdict);
        expect(text).toContain('designer_abandoned_260805_001');
        expect(text).toMatch(/last modified \d{4}-\d{2}-\d{2}T/);
        expect(text).toMatch(/NOT YOUR SESSION/i);
      } finally {
        restore();
      }
    });

    it('branch remediations are DISTINCT (not one generic "run a skill first")', async () => {
      const texts = [];
      for (const [, makeFixture] of PRESENCE_BRANCHES) {
        const root = makeFixture();
        const { mod, restore } = gateFor(root);
        try {
          // Strip the volatile parts (temp paths, timestamps) before comparing.
          texts.push(
            surfaced(await mod.handler(spawnInput()))
              .replace(/\/[^\s`,)]*cagents-obs-[^\s`,)]*/g, '<PATH>')
              .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<TS>')
          );
        } finally {
          restore();
        }
      }
      expect(new Set(texts).size, 'branches share a remediation message').toBe(PRESENCE_BRANCHES.length);
    });

    it('an UNREADABLE sessions dir is reported with its errno and path (RF-4, fails OPEN)', async () => {
      const root = freshRoot('unreadable');
      const sessions = join(root, 'cagents-memory', 'sessions');
      mkdirSync(sessions, { recursive: true });
      chmodSync(sessions, 0o000);
      // Running as root defeats mode bits — skip rather than assert a false pass.
      let readable = true;
      try { readdirSync(sessions); } catch { readable = false; }
      if (readable) {
        expect(true, 'skipped: this user can read a 0000 dir (root?)').toBe(true);
        return;
      }
      const { mod, restore } = gateFor(root);
      try {
        const verdict = await mod.handler(spawnInput());
        expectVisible(verdict, 'unreadable');
        const text = surfaced(verdict);
        expect(text).toContain('EACCES');
        expect(text).toContain(sessions);
        expect(text).toMatch(/FAILING OPEN/);
        expect(verdict.hookSpecificOutput?.permissionDecision).not.toBe('deny');
      } finally {
        restore();
        chmodSync(sessions, 0o755);
      }
    });

    it('a NON-degraded spawn stays quiet (the invariant is not satisfied by shouting always)', async () => {
      // A real, resolvable, non-terminal session named directly by the payload:
      // nothing degraded, so nothing is reported.
      const root = freshRoot('clean');
      const sid = 'act_live_260909_007';
      const dir = join(root, 'cagents-memory', 'sessions', sid);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'status.yaml'), `session_id: ${sid}\npipeline_state: COORDINATING\n`);
      const { mod, restore } = gateFor(root);
      try {
        const verdict = await mod.handler({
          tool_name: 'Agent',
          tool_input: { subagent_type: 'cagents:backend-developer' },
          session_id: sid,
        });
        expect(surfaced(verdict)).toBe('');
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // RR-1 — the BOOTSTRAP WINDOW bypass: allowed, but no longer silent.
  // -------------------------------------------------------------------------
  // `CAGENTS_SESSION_ID` pointing at a directory that does not exist yet set
  // `sessionPresent = true` and pushed NO notice — the absence classifier was
  // skipped entirely and the model was told nothing. That is the one surviving
  // SILENT-ALLOW path that contradicted this file's own invariant. Keeping the
  // ALLOW is correct (a skill sets the env var before it creates the dir);
  // keeping it silent was not.
  describe('bootstrap-window bypass (RR-1)', () => {
    const BOOTSTRAP_SID = 'act_bootstrapping_260909_001';

    it('a nonexistent CAGENTS_SESSION_ID dir is reported in BOTH channels', async () => {
      const root = freshRoot('bootstrap');
      const expectedDir = join(root, 'cagents-memory', 'sessions', BOOTSTRAP_SID);
      const { mod, restore } = gateWithSessionId(root, BOOTSTRAP_SID);
      try {
        const verdict = await mod.handler(spawnInput());
        expectVisible(verdict, 'bootstrap-window');
        // Both channels, exactly as the classified absence branches do.
        expect(verdict.systemMessage, 'systemMessage channel').toMatch(/SESSION BOOTSTRAP WINDOW/);
        expect(
          verdict.hookSpecificOutput?.permissionDecisionReason,
          'permissionDecisionReason channel',
        ).toMatch(/SESSION BOOTSTRAP WINDOW/);

        const text = surfaced(verdict);
        // Names the env var, the resolved path that does not exist, the verdict,
        // the fact the check was bypassed, and what it means if nothing is
        // actually bootstrapping.
        expect(text).toContain('CAGENTS_SESSION_ID');
        expect(text).toContain(expectedDir);
        expect(text).toMatch(/ALLOWING/);
        expect(text).toMatch(/BYPASSING the presence check/);
        expect(text).toMatch(/NOT be tracked/);

        // The helper is exported, so the notice can be asserted directly rather
        // than via a regex that could drift from the implementation.
        expect(typeof mod.bootstrapWindowNotice, 'bootstrapWindowNotice not exported').toBe('function');
        expect(text).toContain(mod.bootstrapWindowNotice(expectedDir));
      } finally {
        restore();
      }
    });

    it('still ALLOWS — no permissionDecision, no deny/block, exit 0 (real hook subprocess)', () => {
      const root = freshRoot('bootstrap-allow');
      const res = spawnSync('node', [RUN_HOOK, 'session-init-gate'], {
        input: JSON.stringify(spawnInput()),
        encoding: 'utf8',
        // Generous budget + fail-loud diagnostics: spawnSync does NOT throw on
        // timeout, it returns status:null with empty stdout, which would parse
        // as a misleading failure under load.
        timeout: 60000,
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: root,
          CAGENTS_SESSION_ID: BOOTSTRAP_SID,
          CAGENTS_ACTIVE_SESSION: '',
        },
      });
      if (res.error) throw new Error(`spawn errored: ${res.error.message}`);
      if (res.status === null) throw new Error(`hook killed (signal=${res.signal}) stderr=${res.stderr}`);
      expect(res.status, `hook exited non-zero. stderr: ${res.stderr}`).toBe(0);
      const parsed = JSON.parse(res.stdout.trim());
      expect(parsed.continue).toBe(true);
      expect(parsed.hookSpecificOutput?.permissionDecision, 'gate must stay deny-free').toBeUndefined();
      expect(parsed.deny).toBeUndefined();
      expect(parsed.decision).toBeUndefined();
      expect(`${parsed.systemMessage}`).toMatch(/SESSION BOOTSTRAP WINDOW/);
    });

    it('its remediation is DISTINCT from all five absence-branch remediations', async () => {
      const norm = (t) => t
        .replace(/\/[^\s`,)]*cagents-obs-[^\s`,)]*/g, '<PATH>')
        .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<TS>');

      const bootstrapRoot = freshRoot('bootstrap-distinct');
      const bootstrap = gateWithSessionId(bootstrapRoot, BOOTSTRAP_SID);
      let bootstrapText;
      try {
        bootstrapText = norm(surfaced(await bootstrap.mod.handler(spawnInput())));
      } finally {
        bootstrap.restore();
      }

      const others = [];
      for (const [, makeFixture] of PRESENCE_BRANCHES) {
        const root = makeFixture();
        const { mod, restore } = gateFor(root);
        try {
          others.push(norm(surfaced(await mod.handler(spawnInput()))));
        } finally {
          restore();
        }
      }

      // Distinct AND present: an empty string is trivially distinct, so guard it.
      expect(bootstrapText.trim().length, 'bootstrap branch reported nothing').toBeGreaterThan(0);
      expect(others, 'bootstrap reuses an absence branch remediation verbatim').not.toContain(bootstrapText);
      expect(new Set([...others, bootstrapText]).size).toBe(PRESENCE_BRANCHES.length + 1);
      // It is a different KIND of event, so it must not borrow their head line.
      expect(bootstrapText).not.toMatch(/SESSION PRESENCE/);
    });

    it('an EXISTING healthy session named by CAGENTS_SESSION_ID stays QUIET', async () => {
      // The bypass must not become an unconditional shout: when the dir really
      // is there and resolvable, nothing degraded and nothing is reported.
      const root = freshRoot('bootstrap-healthy');
      const sid = 'act_live_260909_042';
      const dir = join(root, 'cagents-memory', 'sessions', sid);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'status.yaml'), `session_id: ${sid}\npipeline_state: COORDINATING\n`);
      const { mod, restore } = gateWithSessionId(root, sid);
      try {
        const verdict = await mod.handler({
          tool_name: 'Agent',
          tool_input: { subagent_type: 'cagents:backend-developer' },
          session_id: sid,
        });
        expect(surfaced(verdict), 'healthy session must stay quiet').toBe('');
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // agent-dispatch throw handling (RF-4) — both outcomes must be legible.
  // -------------------------------------------------------------------------
  describe('agent-dispatch gate-throw branches', () => {
    function factory() {
      process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
      delete require.cache[require.resolve(join(HOOKS_DIR, 'agent-dispatch.cjs'))];
      const mod = require(join(HOOKS_DIR, 'agent-dispatch.cjs'));
      delete process.env.CAGENTS_DISPATCH_TEST_IMPORT;
      return mod.makeDispatchHandler;
    }

    const THROWS = [
      ['I/O errno (fail-OPEN)', () => {
        const e = new Error("EACCES: permission denied, scandir '/srv/x/cagents-memory/sessions'");
        e.code = 'EACCES';
        e.path = '/srv/x/cagents-memory/sessions';
        return e;
      }],
      ['logic fault (fail-CLOSED)', () => new TypeError('cannot read properties of undefined')],
    ];

    it.each(THROWS)('%s produces a legible reason', async (label, makeErr) => {
      const makeDispatchHandler = factory();
      const h = makeDispatchHandler({
        sessionGate: async () => { throw makeErr(); },
        modelAdvisor: async () => null,
      });
      const verdict = await h(spawnInput());
      expectVisible(verdict, label);
      expect(surfaced(verdict)).toMatch(/FAIL-OPEN|FAIL-CLOSED/);
    });

    it('the fail-OPEN branch allows and the fail-CLOSED branch denies (policies did not collapse into one)', async () => {
      const makeDispatchHandler = factory();
      const ioErr = THROWS[0][1]();
      const open = await makeDispatchHandler({
        sessionGate: async () => { throw ioErr; },
        modelAdvisor: async () => null,
      })(spawnInput());
      const closed = await makeDispatchHandler({
        sessionGate: async () => { throw new TypeError('boom'); },
        modelAdvisor: async () => null,
      })(spawnInput());

      expect(open.deny).toBeUndefined();
      expect(closed.deny).toBe(true);
      expect(surfaced(closed).length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // createHook outer catch (FS-4) + run-hook not-found (FS-3).
  // -------------------------------------------------------------------------
  describe('framework-level degrade branches', () => {
    const utils = () => {
      delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
      return require(join(HOOKS_DIR, 'hook-utils.cjs'));
    };

    const FAILURES = [
      ['SessionInitGate + I/O', 'SessionInitGate', () => { const e = new Error("EIO: i/o error, scandir '/x'"); e.code = 'EIO'; e.path = '/x'; return e; }],
      ['SessionInitGate + logic', 'SessionInitGate', () => new TypeError('boom')],
      ['AgentDispatch + logic', 'AgentDispatch', () => new RangeError('boom')],
      ['ordinary hook + logic', 'SomeOtherHook', () => new TypeError('boom')],
    ];

    it.each(FAILURES)('%s never emits a bare {continue:true}', (label, name, makeErr) => {
      const verdict = utils().handlerFailureVerdict(name, makeErr());
      expectVisible(verdict, label);
    });

    it('run-hook.cjs reports a MISSING hook file to the model, not just stderr (FS-3)', () => {
      const res = spawnSync('node', [RUN_HOOK, 'definitely-not-a-real-hook-xyz'], {
        input: JSON.stringify({ tool_name: 'Agent', tool_input: {} }),
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(res.status, `run-hook exited abnormally: ${res.stderr}`).toBe(0);
      const parsed = JSON.parse(res.stdout.trim());
      expect(parsed.continue).toBe(true);
      expect(isBareContinue(parsed), 'hook-not-found emitted a bare {continue:true}').toBe(false);
      expect(parsed.systemMessage).toMatch(/HOOK NOT FOUND/);
      expect(parsed.systemMessage).toMatch(/DID NOT RUN/);
    });

    it('run-hook.cjs reports a missing hook NAME to the model as well', () => {
      const res = spawnSync('node', [RUN_HOOK], { input: '{}', encoding: 'utf8', timeout: 30000 });
      expect(res.status).toBe(0);
      const parsed = JSON.parse(res.stdout.trim());
      expect(isBareContinue(parsed)).toBe(false);
      expect(parsed.systemMessage).toMatch(/No hook name provided/);
    });
  });

  // -------------------------------------------------------------------------
  // FS-1 specifically: the silent null-return in findActiveSession.
  // -------------------------------------------------------------------------
  describe('findActiveSession null-returns are never silent (FS-1)', () => {
    it('logs a reason when the sessions dir does not exist', () => {
      const root = freshRoot('fs1');
      const res = spawnSync(process.execPath, [
        '-e',
        `process.env.CLAUDE_PROJECT_DIR = ${JSON.stringify(root)};
         const u = require(${JSON.stringify(join(HOOKS_DIR, 'hook-utils.cjs'))});
         const r = u.findActiveSession({ fallbackHeuristic: true });
         console.log(JSON.stringify({ resolved: r }));`,
      ], { encoding: 'utf8', timeout: 30000, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });

      expect(res.status, res.stderr).toBe(0);
      expect(JSON.parse(res.stdout.trim()).resolved).toBeNull();
      // Pre-RF-5 this was the ONLY null-return in findActiveSession with no log
      // at all — and the most likely one in production.
      expect(res.stderr).toMatch(/sessions dir does not exist/);
      expect(res.stderr).toContain(root);
    });
  });
});
