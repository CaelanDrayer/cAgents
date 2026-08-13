/**
 * REC-17 (P-10) regression: the PAUSE/STOP/RESUME signal feature must not be
 * half-advertised — a config-`enabled` feature with zero implementation.
 *
 * pipeline_config.yaml `signals.enabled: true` promises the /act loop checks for
 * signal files before each state transition. Pre-REC-17 the /act SKILL.md loop
 * contained NO such check, so the feature was advertised-but-unimplemented. REC-17
 * IMPLEMENTS the check (act/SKILL.md Step 3e-signals, per the documented protocol
 * in orchestration-reference.md) so config-enabled ⟺ skill-implements-it.
 *
 * This test pins the invariant either way:
 *   - if signals.enabled is true  -> act/SKILL.md MUST implement the check.
 *   - if signals.enabled is false -> the config/SKILL.md must mark it unimplemented.
 * A `true` config with an unimplemented loop (the pre-REC-17 half-advertised
 * state) FAILS.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');
const RUN_SKILL = join(process.cwd(), '.claude', 'skills', 'act', 'SKILL.md');

const config = readFileSync(CONFIG_PATH, 'utf8');
const runSkill = readFileSync(RUN_SKILL, 'utf8');

/** Extract `enabled:` under the `signals:` block. Returns true/false/null. */
function signalsEnabled(cfg) {
  const block = cfg.match(/^signals:\s*$([\s\S]*?)(?=^\S|\Z)/m);
  const scope = block ? block[1] : cfg;
  const m = scope.match(/^\s*enabled:\s*(true|false)\b/m);
  return m ? m[1] === 'true' : null;
}

describe('PAUSE/STOP/RESUME signal feature consistency (REC-17)', () => {
  it('pipeline_config.yaml declares the signals block with the three supported signals', () => {
    expect(config).toMatch(/^signals:/m);
    expect(config).toMatch(/PAUSE/);
    expect(config).toMatch(/STOP/);
    expect(config).toMatch(/RESUME/);
  });

  it('config-enabled ⟺ /act SKILL.md implements a before-transition signal check', () => {
    const enabled = signalsEnabled(config);
    expect(enabled, 'signals.enabled must be an explicit true/false, not absent').not.toBeNull();

    // The /act loop must reference the signal directory AND the signal names so
    // the feature is genuinely wired into the state machine (not just documented
    // in a rules file the loop never consults).
    const implementsCheck =
      /signals?\//.test(runSkill) &&
      /PAUSE/.test(runSkill) &&
      /STOP/.test(runSkill) &&
      /RESUME/.test(runSkill);

    if (enabled) {
      expect(
        implementsCheck,
        'signals.enabled: true but act/SKILL.md does not implement the before-transition signal check (half-advertised feature — REC-17)'
      ).toBe(true);
    } else {
      // Honestly disabled: the config or SKILL.md must mark it aspirational.
      expect(
        /aspirational|unimplemented|not implemented|enabled:\s*false/i.test(config) ||
          /signal.*(aspirational|unimplemented|not implemented)/i.test(runSkill)
      ).toBe(true);
    }
  });

  it('act/SKILL.md points to the canonical signal protocol (orchestration-reference)', () => {
    // The Step 3e-signals implementation should cite the protocol doc so the
    // waypoint/resume semantics stay single-sourced.
    expect(runSkill).toMatch(/orchestration-reference/);
  });
});
