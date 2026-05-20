/**
 * WI-W4.4 (c): pipeline-5state-transitions
 *
 * Complementary to `pipeline-state-machine.test.js` (WI-W1.3). Where the
 * existing test verifies state existence + transitions, this test focuses on:
 *   1. Exact 5-state set (no more, no less): {INIT, ORCHESTRATED, PLANNED,
 *      COORDINATED, VALIDATED}.
 *   2. The deleted state DECOMPOSED is absent from the states map AND from
 *      every paths[*].states list.
 *   3. The full transition chain is closed and acyclic from INIT to VALIDATED.
 *   4. No legacy `delegation_prompts.yaml` output is produced by any state
 *      (was an artifact of the deleted prompt-engineer state).
 *
 * Note on task-brief naming: the v12 trigger doc described the 5 states as
 * "INIT, PLANNED, PROMPTS_READY, COORDINATED, VALIDATED" but the
 * implemented config uses ORCHESTRATED (the v11 name) in slot 2. The actual
 * canonical 5 states are the ones in `pipeline_config.yaml`. This test
 * asserts the implemented set, not the trigger-doc set.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');

const CANONICAL_STATES = ['INIT', 'ORCHESTRATED', 'PLANNED', 'COORDINATED', 'VALIDATED'];

function loadConfig() {
  return yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

describe('WI-W4.4 (c): pipeline 5-state transitions (v12 collapse)', () => {
  it('exactly 5 state keys, no more no less', () => {
    const cfg = loadConfig();
    const keys = Object.keys(cfg.states).sort();
    expect(keys.length).toBe(5);
    expect(keys).toEqual([...CANONICAL_STATES].sort());
  });

  it('DECOMPOSED state is absent from states map', () => {
    const cfg = loadConfig();
    expect(cfg.states.DECOMPOSED).toBeUndefined();
  });

  it('DECOMPOSED is absent from every paths[*].states list', () => {
    const cfg = loadConfig();
    for (const [name, pathDef] of Object.entries(cfg.paths || {})) {
      expect(pathDef.states, `path ${name}`).not.toContain('DECOMPOSED');
    }
  });

  it('full transition chain: INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED', () => {
    const cfg = loadConfig();
    expect(cfg.states.INIT.next).toBe('ORCHESTRATED');
    expect(cfg.states.ORCHESTRATED.next).toBe('PLANNED');
    expect(cfg.states.PLANNED.next).toBe('COORDINATED');
    expect(cfg.states.COORDINATED.next).toBe('VALIDATED');
    expect(cfg.states.VALIDATED.terminal).toBe(true);
  });

  it('every non-terminal state has a `next` field pointing at another defined state', () => {
    const cfg = loadConfig();
    const defined = new Set(Object.keys(cfg.states));
    for (const [name, s] of Object.entries(cfg.states)) {
      if (s.terminal) continue;
      expect(s.next, `state ${name} missing next`).toBeDefined();
      expect(defined.has(s.next), `state ${name}.next=${s.next} not a defined state`).toBe(true);
    }
  });

  it('transition chain is acyclic and reaches VALIDATED from INIT', () => {
    const cfg = loadConfig();
    const seen = new Set();
    let cur = 'INIT';
    let hops = 0;
    while (cur && !seen.has(cur) && hops < 10) {
      seen.add(cur);
      const s = cfg.states[cur];
      if (s.terminal) break;
      cur = s.next;
      hops++;
    }
    expect(seen.has('VALIDATED'), 'VALIDATED must be reachable from INIT').toBe(true);
    expect(hops).toBeLessThan(10);
  });

  it('no state produces `delegation_prompts.yaml` (artifact of deleted prompt-engineer)', () => {
    const cfg = loadConfig();
    for (const [name, s] of Object.entries(cfg.states)) {
      const outputs = s.outputs || [];
      expect(outputs, `state ${name}`).not.toContain('delegation_prompts.yaml');
    }
  });

  it('PLANNED state uses dynamic agent dispatch (controller from plan.yaml)', () => {
    const cfg = loadConfig();
    // v12.0.0 PLANNED is `dynamic` — controllers resolved per-plan, not a
    // single hardcoded agent (which was the case in v11 PROMPTS_READY).
    expect(cfg.states.PLANNED.agent).toBe('dynamic');
    expect(cfg.states.PLANNED.nested_execution).toBe(true);
  });
});
