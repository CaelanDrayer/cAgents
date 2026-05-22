// Regression test for v12.6.0 Pillar 4 (AC-4.4)
// Asserts that grep for "AgentPath" / "agentpath" / "AGENTPATH" across
// cAgents/ source returns ZERO matches (excluding CHANGELOG, docs/,
// archive/, _archive/, _deprecated/, cagents-memory/, node_modules/, .git/).
//
// Per AC-4.4 wording: "only documented false-positive variable refs remain".
// Lowercase `agentPath` (camelCase variable name in path-handling code) is a
// documented false positive; we filter it out. The test asserts no
// "AgentPath" (PascalCase / brand) or "AGENTPATH" (env-var-style) refs.

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('v12.6.0 AC-4.4: AgentPath references swept from cAgents source', () => {
  it('grep for AgentPath/AGENTPATH (case-sensitive, brand variants) returns 0 matches', () => {
    // Case-sensitive search for the BRAND name and ENV-VAR-style references.
    // Excludes archived/historical dirs per AC-4.4.
    let output = '';
    try {
      output = execSync(
        `grep -rn "AgentPath\\|AGENTPATH" --include="*.md" --include="*.yaml" --include="*.json" --include="*.cjs" --include="*.js" --include="*.ts" --include="*.sh" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs --exclude-dir=archive --exclude-dir=_archive --exclude-dir=_deprecated --exclude-dir=cagents-memory --exclude-dir=example --exclude-dir=vendor_repos . 2>/dev/null | grep -v CHANGELOG.md | grep -v RELEASE_NOTES.md | grep -v "tests/v12/v12-6-" | grep -vE "[a-z]AgentPath" || true`,
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
    } catch (e) {
      // grep returns 1 on no-match — treat as empty
      output = '';
    }
    expect(
      output.trim(),
      `Expected zero AgentPath/AGENTPATH refs, found:\n${output}`
    ).toBe('');
  });

  it('grep for lowercase "agentpath" (full-string) returns 0 matches', () => {
    // The lowercase brand variant. Lowercase camelCase variable `agentPath`
    // is allowed, but the full lowercase string "agentpath" (brand,
    // path-segment, URL) is not. We search for the full string.
    let output = '';
    try {
      output = execSync(
        `grep -rn "agentpath" --include="*.md" --include="*.yaml" --include="*.json" --include="*.cjs" --include="*.js" --include="*.ts" --include="*.sh" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs --exclude-dir=archive --exclude-dir=_archive --exclude-dir=_deprecated --exclude-dir=cagents-memory --exclude-dir=example --exclude-dir=vendor_repos . 2>/dev/null | grep -v CHANGELOG.md | grep -v RELEASE_NOTES.md | grep -v "tests/v12/v12-6-" | grep -vE "[a-z]AgentPath" || true`,
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
    } catch (e) {
      output = '';
    }
    expect(
      output.trim(),
      `Expected zero "agentpath" refs, found:\n${output}`
    ).toBe('');
  });

  it('tests/config/agentpath-contracts.test.js is deleted', () => {
    const oldTestPath = path.join(REPO_ROOT, 'tests/config/agentpath-contracts.test.js');
    expect(
      execSync(`test -e "${oldTestPath}" && echo exists || echo missing`, { encoding: 'utf8' }).trim(),
      'tests/config/agentpath-contracts.test.js must be deleted'
    ).toBe('missing');
  });

  it('session-catchup.cjs has no AGENTPATH_ISSUE_ID injection block', () => {
    let output = '';
    try {
      output = execSync(
        `grep -c "AGENTPATH_ISSUE_ID" .claude/hooks/session-catchup.cjs || true`,
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
    } catch (e) {
      output = '0';
    }
    expect(
      output.trim(),
      'session-catchup.cjs must have 0 AGENTPATH_ISSUE_ID refs'
    ).toBe('0');
  });
});

describe('v12.6.0 AC-4.5: migration script ships and is executable', () => {
  it('scripts/migration/v12-6-drop-ui-fields.sh exists and is executable', () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts/migration/v12-6-drop-ui-fields.sh');
    expect(
      execSync(`test -x "${scriptPath}" && echo ok || echo fail`, { encoding: 'utf8' }).trim(),
      'migration script must exist and be executable'
    ).toBe('ok');
  });

  it('migration script --dry-run prints planned removals and exits 0', () => {
    // Run against a non-existent sessions dir so dry-run is safe + bounded.
    const fakeSessionsDir = '/tmp/cagents-v12-6-test-empty-sessions';
    try {
      execSync(`mkdir -p "${fakeSessionsDir}"`, { encoding: 'utf8' });
      const result = execSync(
        `bash scripts/migration/v12-6-drop-ui-fields.sh --dry-run "${fakeSessionsDir}" 2>&1`,
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
      expect(result).toMatch(/DRY RUN/i);
      expect(result).toMatch(/processed 0 session/i);
    } finally {
      try { execSync(`rm -rf "${fakeSessionsDir}"`, { encoding: 'utf8' }); } catch (_) {}
    }
  });

  it('migration script is idempotent against a fixture session', () => {
    // Create a fixture session with v12.6-removed files, run twice, verify
    // first run removes them and second run is no-op.
    const fixtureDir = '/tmp/cagents-v12-6-test-fixture';
    const sessionDir = `${fixtureDir}/session_fixture_001`;
    try {
      execSync(`rm -rf "${fixtureDir}" && mkdir -p "${sessionDir}/workflow/events" "${sessionDir}/team/messages"`, { encoding: 'utf8' });
      execSync(`touch "${sessionDir}/workflow/wave_structure.yaml" "${sessionDir}/workflow/delegation_prompts.yaml" "${sessionDir}/workflow/events/EVT-1.yaml"`, { encoding: 'utf8' });
      execSync(`cat > "${sessionDir}/status.yaml" << 'EOF'
pipeline_state: COMPLETE
revision_round: 0
validation_cycles: 0
state_history:
  - state: INIT
    entered_at: "2026-05-21T00:00:00Z"
    duration_ms: 1000
EOF`, { encoding: 'utf8' });

      // First run: should remove
      const run1 = execSync(`bash scripts/migration/v12-6-drop-ui-fields.sh "${fixtureDir}" 2>&1`, { cwd: REPO_ROOT, encoding: 'utf8' });
      expect(run1).toMatch(/removed dir/i);

      // Verify removals
      expect(execSync(`test -d "${sessionDir}/workflow/events" && echo exists || echo missing`, { encoding: 'utf8' }).trim()).toBe('missing');
      expect(execSync(`test -f "${sessionDir}/workflow/wave_structure.yaml" && echo exists || echo missing`, { encoding: 'utf8' }).trim()).toBe('missing');
      expect(execSync(`test -d "${sessionDir}/team/messages" && echo exists || echo missing`, { encoding: 'utf8' }).trim()).toBe('missing');

      // Second run: should be no-op (no "removed" lines)
      const run2 = execSync(`bash scripts/migration/v12-6-drop-ui-fields.sh "${fixtureDir}" 2>&1`, { cwd: REPO_ROOT, encoding: 'utf8' });
      // After first run, nothing remains to remove
      expect(run2).not.toMatch(/removed dir/i);
      expect(run2).not.toMatch(/removed file/i);
    } finally {
      try { execSync(`rm -rf "${fixtureDir}"`, { encoding: 'utf8' }); } catch (_) {}
    }
  });
});
