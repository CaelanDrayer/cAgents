// FU-9 (D1, v12.77.0): status readers accept /designer's `phase:` shape as
// well as the pipeline's `pipeline_state:`, and a /designer -> /act handover
// closes the designer session (handover_to + phase: complete) so it never
// lingers as a live or stale sibling.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const GATE = join(HOOKS_DIR, 'session-init-gate.cjs');
const HOOK_UTILS = join(HOOKS_DIR, 'hook-utils.cjs');

function utilsFor(projectRoot) {
  process.env.CLAUDE_PROJECT_DIR = projectRoot;
  delete process.env.CAGENTS_ACTIVE_SESSION;
  delete require.cache[require.resolve(HOOK_UTILS)];
  const mod = require(HOOK_UTILS);
  mod._resetActiveSessionCache?.();
  return mod;
}

// Generous timeout on a loaded shared box; a timeout fails loud, never reads as a result.
// `pin` is a non-UUID cAgents session id in `session_id`, which resolveSession
// treats as an exact pin (step 3). The gate rejects a pinned terminal session.
function runGate(projectRoot, pin) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: projectRoot };
  delete env.CAGENTS_ACTIVE_SESSION;
  delete env.CAGENTS_SESSION_ID;
  const payload = { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } };
  if (pin) payload.session_id = pin;
  const r = spawnSync('node', [GATE], {
    input: JSON.stringify(payload),
    encoding: 'utf8', timeout: 60000, env,
  });
  if (r.error) throw r.error;
  const out = JSON.parse(r.stdout.trim());
  return {
    out,
    stderr: r.stderr || '',
    text: `${out.systemMessage || ''}\n${out.hookSpecificOutput?.permissionDecisionReason || ''}`,
  };
}

function session(root, id, status, instruction) {
  const dir = join(root, 'cagents-memory', 'sessions', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), status);
  if (instruction) writeFileSync(join(dir, 'instruction.yaml'), instruction);
  return dir;
}

describe('readSessionState() (FU-9)', () => {
  let root;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'cagents-fu9-u-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('reads pipeline_state, phase and current_phase, pipeline_state first', () => {
    const { readSessionState } = utilsFor(root);
    expect(readSessionState('phase: exploring\n')).toBe('exploring');
    expect(readSessionState('current_phase: validating\n')).toBe('validating');
    expect(readSessionState('phase: EXECUTING\npipeline_state: VALIDATED\n')).toBe('VALIDATED');
    expect(readSessionState('session_id: x\n')).toBeNull();
    expect(readSessionState(null)).toBeNull();
  });

  it('normalizes terminal aliases (completed -> complete)', () => {
    const { readSessionState } = utilsFor(root);
    expect(readSessionState('phase: completed\n')).toBe('complete');
    expect(readSessionState('phase: complete\n')).toBe('complete');
  });

  it('handover_to alone closes a session whose phase was not yet updated', () => {
    const { readSessionState, isTerminalState } = utilsFor(root);
    const st = readSessionState('phase: refinement\nhandover_to: act_build_261016_001\n');
    expect(st).toBe('complete');
    expect(isTerminalState(st)).toBe(true);
    // A failure terminal is never relabelled by a handover link.
    expect(readSessionState('phase: aborted\nhandover_to: act_x_261016_001\n')).toBe('aborted');
  });
});

describe('session-init-gate with /designer phase: shape (FU-9)', () => {
  let root;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'cagents-fu9-g-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  const D = 'designer_widget_261016_001';
  const A = 'act_build-widget_261016_001';
  const gate = (u, pin) => u.resolveSession({ session_id: pin }, { purpose: 'gate', claimHint: false });

  it('a designer session with only `phase: exploring` is live/non-terminal', () => {
    const dir = session(root, D, 'phase: exploring\n');
    const u = utilsFor(root);
    expect(u.isTerminalState(u.readSessionState('phase: exploring\n'))).toBe(false);
    expect(gate(u, D)).toBe(dir);
    const { out, stderr, text } = runGate(root, D);
    expect(out.continue).toBe(true);
    expect(stderr).not.toMatch(/no owned session/);
    expect(text).not.toMatch(/SESSION PRESENCE/);
  });

  it('a designer session with `phase: complete` is terminal', () => {
    session(root, D, 'phase: complete\n');
    const u = utilsFor(root);
    expect(gate(u, D)).toBeNull();
    const { out, stderr } = runGate(root, D);
    expect(out.continue).toBe(true);
    // classifySessionAbsence reads the phase: field: the only session is terminal.
    expect(stderr).toMatch(/no owned session \(branch=all-terminal\)/);
  });

  it('handover: designer is terminal and linked, act is live, no stale warning', () => {
    session(root, D, `phase: complete\nhandover_to: ${A}\n`);
    const actDir = session(root, A, 'pipeline_state: INIT\n',
      `request: "implement design from ${D}"\nhandover_from: ${D}\n`);
    const u = utilsFor(root);
    expect(gate(u, D)).toBeNull();
    expect(gate(u, A)).toBe(actDir);
    const dStatus = u.safeRead(join(root, 'cagents-memory', 'sessions', D, 'status.yaml'));
    expect(u.readSessionState(dStatus)).toBe('complete');
    expect(u.extractYamlValue(dStatus, 'handover_to')).toBe(A);
    expect(u.extractYamlValue(u.safeRead(join(actDir, 'instruction.yaml')), 'handover_from')).toBe(D);
    const { out, stderr, text } = runGate(root, A);
    expect(out.continue).toBe(true);
    expect(stderr).not.toMatch(/no owned session/);
    expect(text).not.toMatch(/SESSION PRESENCE|stale/i);
  });

  it('handover with only handover_to written still reads the designer as terminal', () => {
    session(root, D, `phase: refinement\nhandover_to: ${A}\n`);
    const u = utilsFor(root);
    expect(gate(u, D)).toBeNull();
    const { stderr } = runGate(root, D);
    expect(stderr).toMatch(/branch=all-terminal/);
  });
});
