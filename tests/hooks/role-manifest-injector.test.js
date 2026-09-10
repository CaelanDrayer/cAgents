/**
 * role-manifest-injector.cjs — SubagentStart role-bundle injection (WO-03 surface (d))
 *
 * WO-03 surfaces (a)(b)(c) narrow the unconditionally-loaded `.claude/rules/**`
 * context. Hooks can only ADD context, so this hook is the restoration half: it
 * hands each spawned role a compact pointer to the rules it needs, plus the
 * memory-layout stanza that every role needs to write session artifacts at all.
 *
 * Coverage (acceptance criteria):
 *   (a) the hook returns `additionalContext` for a representative role;
 *   (b) THE COMPLEMENT CHECK — every role key in the bundle map, PLUS an unknown
 *       key and an absent agent type, carries the memory-layout stanza, so a
 *       future bundle cannot silently omit it. Reinforced by the single-definition
 *       check: no ROLE_POINTERS value contains the stanza itself, which forces
 *       every bundle through the one builder that concatenates it.
 *   (c) the settings.json registration exists and the two pre-existing
 *       SubagentStart hooks survive;
 *   (d) fail-open — a throwing input and malformed stdin never fail the spawn;
 *   (e) the SAME complement check for the SECOND shared stanza, the context-budget
 *       aim stanza, plus its single-definition, advisory-wording, and authoring-
 *       size guards.
 *
 * ON SIZE: these tests assert nothing about the size of a spawned agent's actual
 * context and introduce no token gate, no blocking threshold, and no measurement
 * of a running agent. Automated size-gating was explicitly overruled for this
 * program. The one size assertion present is an AUTHORING cap on the context-
 * budget stanza's own source text (<= 700 chars) — that text is charged to every
 * spawn, so a fat budget stanza would defeat its own purpose. It caps a string
 * literal in this repo, never an agent.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'role-manifest-injector.cjs');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');
const SETTINGS_PATH = join(process.cwd(), '.claude', 'settings.json');

// Structural fingerprints of the memory-layout stanza. Every bundle must carry
// all of them — the top-level tree, the session-ID format, the session folder
// shape, and the memory principles.
const STANZA_MARKERS = [
  'cAgents memory layout',
  'cagents-memory/',
  '_knowledge/',
  '_archive/',
  'sessions/',
  '{command}_{slug}_{YYMMDD}_{NNN}',
  'instruction.yaml',
  'status.yaml',
  'plan.yaml',
  'work_items.yaml',
  'coordination_log.yaml',
  'agent_tree.yaml',
  'outputs/',
  'waypoints/',
  'File-based',
  'Session-scoped',
  'Parallel-safe',
  'Git-ignored',
];

// Structural fingerprints of the context-budget aim stanza (the SECOND shared
// stanza). Every bundle must carry all of them. Each is unique to that stanza —
// none appears in any ROLE_POINTERS value or in the memory-layout stanza — so
// finding one in a bundle proves the budget stanza itself travelled, not some
// neighbouring text. These are the strings to pin verbatim elsewhere.
const BUDGET_MARKERS = [
  'Context budget (advisory',
  'Aim for about 100k input tokens',
  'Past about 200k input',
  'delegate harder',
  'nothing measures them',
  'artifact bodies to disk',
  'pat-context-budget-tiers.md',
];

/** Load the CJS module without triggering its standalone createHook() registration. */
function loadModule() {
  process.env.CAGENTS_DISPATCH_IMPORT = '1';
  delete require.cache[require.resolve(HOOK_PATH)];
  const mod = require(HOOK_PATH);
  delete process.env.CAGENTS_DISPATCH_IMPORT;
  return mod;
}

/** Run the hook as a real subprocess with a JSON payload on stdin. */
function runHook(input, { viaLauncher = false } = {}) {
  const target = viaLauncher
    ? `node "${RUN_HOOK}" role-manifest-injector`
    : `node "${HOOK_PATH}"`;
  const payload = JSON.stringify(input).replace(/'/g, "'\\''");
  const out = execSync(`printf '%s' '${payload}' | ${target}`, {
    encoding: 'utf8',
    timeout: 60000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(out.trim());
}

describe('role-manifest-injector.cjs', () => {
  it('exists on disk', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  // ---- (a) representative role ------------------------------------------
  describe('additionalContext injection', () => {
    it('returns a SubagentStart additionalContext bundle for a representative role', () => {
      const result = runHook({
        hook_event_name: 'SubagentStart',
        agent_id: 'agent_test_repr',
        agent_type: 'cagents:architect',
        tool_input: { subagent_type: 'cagents:architect', description: 'design review' },
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(typeof ctx).toBe('string');
      expect(ctx.length).toBeGreaterThan(0);
      // architect is controller-tier -> the controller pointer, not another role's
      expect(ctx).toContain('role manifest (controller)');
      expect(ctx).toContain('.claude/rules/core/delegation.md');
    });

    it('fires identically through the registered run-hook.cjs launcher path', () => {
      const result = runHook(
        { hook_event_name: 'SubagentStart', agent_type: 'cagents:architect', agent_id: 'agent_test_launcher' },
        { viaLauncher: true },
      );
      expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('role manifest (controller)');
    });

    it.each([
      ['cagents:architect', 'controller'],
      ['cagents:tech-lead', 'controller'],
      ['cagents:backend-developer', 'execution'],
      ['cagents:reviewer', 'review'],
      ['cagents:validator', 'review'],
      ['cagents:planner', 'pipeline'],
      ['cagents:orchestrator', 'pipeline'],
      ['cagents:cto', 'leadership'],
      ['general-purpose', 'default'],
    ])('routes %s to the %s bundle end-to-end', (agentType, expectedRole) => {
      const result = runHook({ hook_event_name: 'SubagentStart', agent_type: agentType, agent_id: 'agent_test_route' });
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(ctx).toContain(`role manifest (${expectedRole})`);
      // The stanza travels with the live output, not just the in-process builder.
      for (const marker of STANZA_MARKERS) expect(ctx).toContain(marker);
    });
  });

  // ---- (b) THE COMPLEMENT CHECK -----------------------------------------
  describe('memory-layout stanza reaches EVERY bundle', () => {
    const { ROLE_POINTERS, buildRoleBundle, resolveRole, MEMORY_LAYOUT_STANZA } = loadModule();
    const roleKeys = Object.keys(ROLE_POINTERS);

    it('the bundle map is non-empty and includes the documented role groups', () => {
      expect(roleKeys.length).toBeGreaterThan(0);
      for (const required of ['controller', 'execution', 'review', 'pipeline', 'default']) {
        expect(roleKeys).toContain(required);
      }
    });

    // Iterates EVERY key present in the map — a future role added to
    // ROLE_POINTERS is automatically covered by this test without editing it.
    it.each([...roleKeys, '__unknown_role_key__', '', undefined, null])(
      'buildRoleBundle(%p) carries the full memory-layout stanza',
      (key) => {
        const bundle = buildRoleBundle(key);
        expect(typeof bundle).toBe('string');
        for (const marker of STANZA_MARKERS) {
          expect(bundle).toContain(marker);
        }
      },
    );

    it('an unrecognized cagents name and an absent agent type both resolve to a real bundle with the stanza', () => {
      for (const name of ['definitely-not-a-real-agent', '', undefined]) {
        const bundle = buildRoleBundle(resolveRole(name));
        for (const marker of STANZA_MARKERS) expect(bundle).toContain(marker);
      }
      // Absent agent type on the wire (empty payload) still injects.
      const result = runHook({});
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(ctx).toContain('role manifest (default)');
      for (const marker of STANZA_MARKERS) expect(ctx).toContain(marker);
    });

    // Single-definition guarantee: because no pointer contains the stanza, the
    // ONLY way a bundle can carry it is through buildRoleBundle's unconditional
    // concatenation. A contributor adding a role cannot omit what they never write.
    it('no ROLE_POINTERS value embeds the stanza (it is defined once and concatenated by the builder)', () => {
      for (const [key, pointer] of Object.entries(ROLE_POINTERS)) {
        expect(pointer, `ROLE_POINTERS.${key} must not inline the stanza`)
          .not.toContain('cAgents memory layout');
      }
      expect(MEMORY_LAYOUT_STANZA).toContain('cAgents memory layout');
    });
  });

  // ---- (e) THE COMPLEMENT CHECK, context-budget aim stanza --------------
  describe('context-budget aim stanza reaches EVERY bundle', () => {
    const {
      ROLE_POINTERS, buildRoleBundle, resolveRole, extractAgentName,
      BUDGET_AIM_STANZA, handler,
    } = loadModule();
    const roleKeys = Object.keys(ROLE_POINTERS);

    // One probe agent type per role key, DERIVED from the real on-disk agent
    // catalog via the module's own resolveRole(). The live-emission coverage
    // below is therefore driven by Object.keys(ROLE_POINTERS) + resolveRole(),
    // never by a hardcoded role list that could drift away from the map.
    const probes = new Map();
    for (const agentType of [
      ...readdirSync(join(process.cwd(), 'agents'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => `cagents:${f.replace(/\.md$/, '')}`),
      'general-purpose', // a non-cagents type -> the `default` fallback key
    ]) {
      const key = resolveRole(extractAgentName({ agent_type: agentType }));
      if (!probes.has(key)) probes.set(key, agentType);
    }

    it('every role key is reachable from a real agent type (probe coverage is complete)', () => {
      expect([...probes.keys()].sort()).toEqual([...roleKeys].sort());
    });

    // Iterates EVERY key present in the map, exactly as the memory-stanza
    // complement check does — a future role inherits this coverage unedited.
    it.each([...roleKeys, '__unknown_role_key__', '', undefined, null])(
      'buildRoleBundle(%p) carries the full context-budget aim stanza',
      (key) => {
        const bundle = buildRoleBundle(key);
        expect(typeof bundle).toBe('string');
        for (const marker of BUDGET_MARKERS) {
          expect(bundle).toContain(marker);
        }
      },
    );

    it('the stanza reaches the REAL emitted additionalContext for every role key', async () => {
      for (const [key, agentType] of probes) {
        const result = await handler({ hook_event_name: 'SubagentStart', agent_type: agentType });
        const ctx = result.hookSpecificOutput.additionalContext;
        expect(ctx, `${agentType} -> ${key}`).toContain(`role manifest (${key})`);
        for (const marker of BUDGET_MARKERS) {
          expect(ctx, `${agentType} -> ${key} is missing ${marker}`).toContain(marker);
        }
      }
    });

    it('the stanza survives the wire, direct and via the registered launcher', () => {
      const direct = runHook({
        hook_event_name: 'SubagentStart',
        agent_type: 'cagents:backend-developer',
        agent_id: 'agent_test_budget',
      });
      const viaLauncher = runHook(
        { hook_event_name: 'SubagentStart', agent_type: 'cagents:backend-developer' },
        { viaLauncher: true },
      );
      for (const marker of BUDGET_MARKERS) {
        expect(direct.hookSpecificOutput.additionalContext).toContain(marker);
        expect(viaLauncher.hookSpecificOutput.additionalContext).toContain(marker);
      }
    });

    // Single-definition guarantee, identical in shape to the memory stanza's:
    // the builder's unconditional concatenation is the ONLY route into a bundle.
    it('BUDGET_AIM_STANZA is defined exactly once and is non-empty', () => {
      expect(typeof BUDGET_AIM_STANZA).toBe('string');
      expect(BUDGET_AIM_STANZA.trim().length).toBeGreaterThan(0);
      const source = readFileSync(HOOK_PATH, 'utf8');
      const assignments = source.match(/^\s*(?:const|let|var)\s+BUDGET_AIM_STANZA\s*=/gm) || [];
      expect(assignments.length, 'exactly one module-scope assignment expected').toBe(1);
      for (const [key, pointer] of Object.entries(ROLE_POINTERS)) {
        expect(pointer, `ROLE_POINTERS.${key} must not inline the budget stanza`)
          .not.toContain('Context budget (advisory');
      }
    });

    it('the stanza stays small — it is charged to EVERY spawn', () => {
      // AUTHORING cap on this string literal. Not a gate, not a measurement of
      // any running agent's context; see the ON SIZE note in the file header.
      expect(BUDGET_AIM_STANZA.length).toBeLessThanOrEqual(700);
    });

    it('the stanza states an aim, never an enforced gate', () => {
      const lower = BUDGET_AIM_STANZA.toLowerCase();
      for (const enforcement of ['must not exceed', 'hard limit', 'will be killed', 'aborted']) {
        expect(lower, `the stanza must not promise enforcement: "${enforcement}"`)
          .not.toContain(enforcement);
      }
      expect(lower).toContain('advisory');
    });

    it('emits no permissionDecision / deny / block field for ANY role key', async () => {
      for (const [key, agentType] of probes) {
        const result = await handler({ hook_event_name: 'SubagentStart', agent_type: agentType });
        // Purely additive: additionalContext and nothing else.
        expect(Object.keys(result), `${key} returned extra top-level fields`)
          .toEqual(['hookSpecificOutput']);
        expect(Object.keys(result.hookSpecificOutput).sort())
          .toEqual(['additionalContext', 'hookEventName']);
        expect(result.hookSpecificOutput.permissionDecision).toBeUndefined();
        expect(result.decision).toBeUndefined();
        expect(result.continue).not.toBe(false);
        expect(result.stopReason).toBeUndefined();
        const blob = JSON.stringify(result);
        for (const field of ['permissionDecision', '"deny"', '"block"']) {
          expect(blob, `${key} bundle leaked ${field}`).not.toContain(field);
        }
      }
      // And on the wire, where createHook() adds only `continue: true`.
      const wire = JSON.stringify(
        runHook({ hook_event_name: 'SubagentStart', agent_type: 'cagents:backend-developer' }),
      );
      expect(wire).not.toContain('permissionDecision');
      expect(wire).not.toContain('"deny"');
      expect(wire).not.toContain('"block"');
    });
  });

  // ---- (c) registration --------------------------------------------------
  describe('settings.json registration', () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    const commands = (settings.hooks.SubagentStart || [])
      .flatMap((entry) => entry.hooks || [])
      .map((h) => h.command || '');

    it('registers role-manifest-injector on SubagentStart', () => {
      const mine = commands.filter((c) => c.includes('role-manifest-injector'));
      expect(mine.length).toBe(1);
      expect(mine[0]).toContain('run-hook.cjs');
      expect(mine[0]).toContain('CLAUDE_PLUGIN_ROOT');
      expect(mine[0]).toContain('CLAUDE_PROJECT_DIR');
    });

    it('has a timeout on the new registration', () => {
      const entry = (settings.hooks.SubagentStart || [])
        .flatMap((e) => e.hooks || [])
        .find((h) => (h.command || '').includes('role-manifest-injector'));
      expect(entry.type).toBe('command');
      expect(typeof entry.timeout).toBe('number');
    });

    it('preserves the two pre-existing SubagentStart hooks', () => {
      expect(commands.some((c) => c.includes('subagent-tracker'))).toBe(true);
      expect(commands.some((c) => c.includes('team-start'))).toBe(true);
    });
  });

  // ---- (d) fail-open -----------------------------------------------------
  describe('fail-open: never blocks or fails a spawn', () => {
    it('an input whose property access throws degrades to a pass-through, not a throw', async () => {
      const { handler } = loadModule();
      const hostile = { get tool_input() { throw new Error('boom'); } };
      await expect(handler(hostile)).resolves.toBeNull(); // -> {continue: true}
    });

    it('malformed stdin still emits a single valid JSON response', () => {
      const out = execSync(`printf '%s' 'not-json-at-all' | node "${HOOK_PATH}"`, {
        encoding: 'utf8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const parsed = JSON.parse(out.trim());
      expect(parsed).toBeTypeOf('object');
      // Degrades to the fallback bundle; never a deny, never a stop.
      expect(parsed.continue).not.toBe(false);
      expect(JSON.stringify(parsed)).not.toContain('"permissionDecision":"deny"');
    });

    it('never emits a blocking decision for any role', () => {
      for (const agentType of ['cagents:architect', 'cagents:backend-developer', 'unknown-agent']) {
        const result = runHook({ hook_event_name: 'SubagentStart', agent_type: agentType, agent_id: 'agent_test_nonblock' });
        expect(result.decision).toBeUndefined();
        expect(result.continue).not.toBe(false);
        expect(result.stopReason).toBeUndefined();
      }
    });
  });
});
