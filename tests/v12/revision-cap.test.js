/**
 * Regression test for WI-W1.4 (v12.0.0): max_revision_cycles lowered 5 -> 3.
 *
 * Basis: cagents-memory/sessions/team_v12-audits-only_260520_001/outputs/wave-1/
 *        revision-distribution.yaml (lower-cap-safe verdict, p95=0 across 24 sessions).
 *
 * Guards two invariants:
 *   1. The configured value of revision.max_cycles is 3 (not 5).
 *   2. The field carries the audit-citation comment containing "lower-cap-safe"
 *      so future maintainers can trace why the cap was lowered.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(
  __dirname,
  '..',
  '..',
  'cagents-memory',
  '_system',
  'config',
  'pipeline_config.yaml'
);

describe('v12 revision cap (WI-W1.4)', () => {
  it('parses pipeline_config.yaml successfully', () => {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = yaml.load(raw);
    expect(parsed).toBeTruthy();
    expect(parsed.revision).toBeTruthy();
  });

  it('sets revision.max_cycles to 3 (lowered from 5 in v12.0.0)', () => {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = yaml.load(raw);
    expect(parsed.revision.max_cycles).toBe(3);
  });

  it('preserves the audit-citation comment ("lower-cap-safe") above max_cycles', () => {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    expect(raw).toMatch(/lower-cap-safe/);
  });

  it('preserves the audit basis file reference in the comment', () => {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    expect(raw).toMatch(/team_v12-audits-only_260520_001/);
    expect(raw).toMatch(/revision-distribution\.yaml/);
  });
});
