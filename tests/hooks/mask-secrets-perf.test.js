// S2-01 (WI-21 round 2): maskSecrets must stay fast on a long run of 'sk-' or 'key-'.
// On the round 1 code, 300 KB took about 26 s, and the hook timeout is 5 s.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { join } from 'path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const { maskSecrets } = require(join(HOOKS_DIR, 'hook-utils.cjs'));

// Generous bound for a loaded shared host.
const BOUND_MS = 500;
const SIZE = 300 * 1024;

function timeMs(fn) {
  const t0 = process.hrtime.bigint();
  const out = fn();
  return { ms: Number(process.hrtime.bigint() - t0) / 1e6, out };
}

function run(unit) {
  return unit.repeat(Math.ceil(SIZE / unit.length)).slice(0, SIZE) + ' ';
}

describe('maskSecrets performance (S2-01)', () => {
  // Load the pattern list once, so the first timing does not include the require.
  maskSecrets('warm up');

  for (const unit of ['sk-', 'key-']) {
    for (const cut of [200, 500]) {
      it(`300 KB of '${unit}' with cut ${cut} finishes under ${BOUND_MS} ms`, () => {
        const { ms, out } = timeMs(() => maskSecrets(run(unit), cut));
        expect(ms).toBeLessThan(BOUND_MS);
        expect(out.length).toBeLessThanOrEqual(cut);
      }, 60000);
    }
  }

  it(`a 200 KB database-credential run with cut 200 finishes under ${BOUND_MS} ms`, () => {
    const big = 'postgres://a:b'.repeat(15000);
    const { ms } = timeMs(() => maskSecrets(big, 200));
    expect(ms).toBeLessThan(BOUND_MS);
  }, 60000);

  it('still masks a token that straddles the cut', () => {
    // Fake token built at runtime, never a literal secret.
    const tok = 'ghp_' + 'A'.repeat(36);
    const out = maskSecrets('x'.repeat(190) + tok + run('sk-'), 200);
    expect(out).not.toMatch(/ghp_[A-Za-z0-9]/);
    expect(out).toBe('x'.repeat(190) + '[REDACTED]');
  });

  it('tool-failure-tracker stores a 300 KB sk- error within the hook timeout', () => {
    const SESSION = 'act_mask-perf_261111_999';
    const projectDir = mkdtempSync(join(tmpdir(), 'mask-perf-'));
    try {
      const sessionDir = join(projectDir, 'cagents-memory', 'sessions', SESSION);
      mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
      writeFileSync(join(sessionDir, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
      const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir };
      delete env.CAGENTS_ACTIVE_SESSION;
      const input = JSON.stringify({ tool_name: 'Bash', error: run('sk-'), session_id: SESSION });
      const { ms } = timeMs(() => execFileSync('node', [join(HOOKS_DIR, 'tool-failure-tracker.cjs')],
        { input, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'], env }));
      // The settings.json timeout is 5 s; node start-up is part of this figure.
      expect(ms).toBeLessThan(4000);
      const log = readFileSync(join(sessionDir, 'workflow', 'tool_failures.yaml'), 'utf8');
      expect(log).toContain('error:');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }, 120000);
});
