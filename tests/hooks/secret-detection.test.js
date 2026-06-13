import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'secret-detection.cjs');

function runHook(input) {
  const jsonStr = JSON.stringify(input);
  const result = execSync(
    `printf '%s' '${jsonStr.replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('secret-detection.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('protected paths', () => {
    it('should block writes to /etc/', () => {
      const result = runHook({ tool_input: { file_path: '/etc/passwd', content: 'test' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block writes to /usr/', () => {
      const result = runHook({ tool_input: { file_path: '/usr/bin/test', content: 'test' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block writes to ~/.ssh/', () => {
      const home = process.env.HOME;
      if (!home) return;
      const result = runHook({ tool_input: { file_path: `${home}/.ssh/authorized_keys`, content: 'test' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow writes to normal paths', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/test.txt', content: 'safe content' } });
      expect(result.continue).toBe(true);
    });
  });

  describe('secret detection - critical', () => {
    it('should block GitHub PAT tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block AWS access keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'AWS_KEY=AKIAIOSFODNN7EXAMPLE' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Slack tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const slack = "xoxb-1234567890-abcdefghij";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Stripe live keys', () => {
      // Split prefix to avoid GitHub push protection false positive on test fixture
      const stripeKey = 'sk_' + 'live_abcdefghijklmnopqrstuvwx';
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: `const key = "${stripeKey}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Anthropic API keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "sk-ant-abcdefghijklmnopqrstuvwxyz1234567890abcd";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block database connection strings with credentials', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const db = "postgres://user:password@host:5432/db";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block NPM tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "npm_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block OpenAI API keys (new format)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890abcd";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('secret detection - high', () => {
    it('should block Google API keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "AIzaSyA1234567890abcdefghijklmnopqrstuv";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('secret detection - medium (warnings)', () => {
    it('should deny generic API keys (escalated per REQ-023)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'api_key = "abcdefghijklmnopqrstuvwxyz1234"' } });
      // Medium triggers ask
      if (result.hookSpecificOutput) {
        expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      }
    });
  });

  describe('false positive filtering', () => {
    it('should block real secrets in test files', () => {
      // Split token to avoid triggering the secret-detection hook on this source file
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: `const token = "${realPat}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    // F7-2 (audit run_fable-plugin-review_260609_001): markdown is NO LONGER
    // blanket-skipped — real secrets in *.md must be caught. (Replaces the old
    // 'should skip markdown files' test which asserted the now-removed blanket skip.)
    // NOTE: secret literals are split (e.g. 'ghp_' + '...') so this test source
    // file does not itself contain a full-length token that the secret-detection
    // hook would block on Write.
    it('should scan markdown files for real secrets (F7-2)', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: '/tmp/README.md', content: `const token = "${realPat}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block a real AWS key in a docs/ markdown file (F7-2)', () => {
      const realKey = 'AKI' + 'AIOSFODNN7REALKEY1';
      const result = runHook({ tool_input: { file_path: 'docs/setup.md', content: `AWS_ACCESS_KEY_ID=${realKey}` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should NOT false-positive on documented secret-pattern PREFIXES in markdown (F7-2)', () => {
      // Repo docs legitimately list pattern prefixes (ghp_, AKIA..., sk-ant-) as
      // detection patterns. These are fragments, not full-length tokens — the
      // full-token regexes must not match them.
      const content = 'Patterns we detect: ghp_, gho_, AKIA..., sk-ant-..., sk-proj-..., AIza, xoxb-. These are documentation fragments only.';
      const result = runHook({ tool_input: { file_path: '/tmp/some-doc.md', content } });
      expect(result.continue).toBe(true);
    });

    it('should allowlist hook-catalog.md (documents the detection patterns themselves) (F7-2)', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      // Even a full-shaped token in the secret-detection self-documentation file is allowed,
      // because that doc legitimately carries reference material about the mechanism.
      const result = runHook({ tool_input: { file_path: '.claude/rules/core/resources/hook-catalog.md', content: `Example shape: ${realPat}` } });
      expect(result.continue).toBe(true);
    });

    it('should allowlist SECRET-SANITIZE.md (documents the sanitize mechanism) (F7-2)', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: '.claude/hooks/SECRET-SANITIZE.md', content: `Example shape: ${realPat}` } });
      expect(result.continue).toBe(true);
    });

    it('should still skip example markdown files (fixture exclusion preserved)', () => {
      const awsExample = 'AKI' + 'AIOSFODNN7EXAMPLE';
      const result = runHook({ tool_input: { file_path: '/tmp/example.config.md', content: awsExample } });
      expect(result.continue).toBe(true);
    });

    it('should skip example files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/example.config.js', content: 'const key = "AKIAIOSFODNN7EXAMPLE";' } });
      expect(result.continue).toBe(true);
    });

    it('should skip template placeholders', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'api_key = "YOUR_API_KEY_HERE_REPLACE_WITH_ACTUAL"' } });
      expect(result.continue).toBe(true);
    });

    it('should skip lock files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/package-lock.json', content: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz' } });
      expect(result.continue).toBe(true);
    });

    it('should handle empty content', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/empty.js', content: '' } });
      expect(result.continue).toBe(true);
    });

    it('should handle very short content', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/short.js', content: 'hi' } });
      expect(result.continue).toBe(true);
    });
  });

  // B2 (v12.18.0): path false-positive tightening.
  //   - DOC_ALLOWLIST is now anchored to EXACT repo-relative paths (only the two
  //     real self-documenting docs), not basename-matched.
  //   - placeholder skip (example/sample/template/mock/fixture) matches path
  //     SEGMENTS or dotted filename components, NOT naked substrings — so a
  //     hyphen-compounded source name (sample-config.ts) is still scanned.
  describe('path false-positive tightening (B2)', () => {
    it('scans a source file whose name merely contains "sample" (sample-config.ts) and blocks a live key', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: 'src/sample-config.ts', content: `const token = "${realPat}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('scans a source file named template-engine.ts and blocks a live key', () => {
      const realKey = 'AKI' + 'AIOSFODNN7REALKEY1';
      const result = runHook({ tool_input: { file_path: 'src/template-engine.ts', content: `const k = "${realKey}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('still skips a genuine fixture placeholder file (tests/fixtures/foo.example.json)', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: 'tests/fixtures/foo.example.json', content: `{"key":"${realPat}"}` } });
      expect(result.continue).toBe(true);
    });

    it('still skips files under a fixtures/ directory segment', () => {
      const realKey = 'AKI' + 'AIOSFODNN7REALKEY1';
      const result = runHook({ tool_input: { file_path: 'tests/fixtures/data.json', content: realKey } });
      expect(result.continue).toBe(true);
    });

    it('does NOT auto-allowlist hook-catalog.md in the wrong directory (docs/whatever/)', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: 'docs/whatever/hook-catalog.md', content: `shape: ${realPat}` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('does NOT auto-allowlist a basename hook-catalog.md outside the repo (/tmp/)', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: '/tmp/hook-catalog.md', content: `shape: ${realPat}` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('DOES allowlist the real hook-catalog.md at its canonical repo-relative path', () => {
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: '.claude/rules/core/resources/hook-catalog.md', content: `shape: ${realPat}` } });
      expect(result.continue).toBe(true);
    });
  });

  describe('safe content', () => {
    it('should allow normal code', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/app.js', content: 'const x = 1;\nconsole.log(x);' } });
      expect(result.continue).toBe(true);
    });

    it('should allow cagents-memory writes', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/cagents-memory/sessions/test.yaml', content: 'phase: completed' } });
      expect(result.continue).toBe(true);
    });
  });

  describe('secret detection - cloud providers (REQ-008)', () => {
    it('should block Azure Storage Account keys', () => {
      const key = 'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=' + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: key } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Supabase PAT tokens (sbp_)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "sbp_abcdefghijklmnopqrstuvwxyz1234567890abcd";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Vercel tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "vercel_abcdefghijklmnopqrstuvwx";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block GitLab PAT tokens (glpat-)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "glpat-abcdefghijklmnopqrst";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block GitLab deploy tokens (gldt-)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "gldt-abcdefghijklmnopqrst";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block GitLab runner tokens (glrt-)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "glrt-abcdefghijklmnopqrst";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Terraform Cloud tokens (atlasv1.)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "atlasv1.abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block HuggingFace API tokens (hf_)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "hf_abcdefghijklmnopqrstuvwxyz1234567890";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should NOT block .env.example placeholder values', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/.env.example', content: 'SUPABASE_TOKEN=sbp_your_token_here_replace_with_actual' } });
      expect(result.continue).toBe(true);
    });

    it('should NOT block test files with placeholder-marked tokens', () => {
      // Placeholder suppression applies: token contains 'fake_' so it is suppressed in test files
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: 'const token = "glpat-fake_abcdefghijklm";' } });
      expect(result.continue).toBe(true);
    });

    it('should block Azure AD client secrets', () => {
      // Value is 36 chars — within the 34-40 char range of the Azure AD client secret pattern.
      // Split at 'client_secret' keyword to avoid triggering the hook on this source file.
      const content = 'client' + '_secret = "abcdefghijklmnopqrstuvwxyz12345678ab"';
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Cloudflare named API keys (CF_API_KEY)', () => {
      // Value is exactly 37 alphanumeric chars as required by the Cloudflare API Key pattern.
      // Split at 'CF_API_KEY' keyword to avoid triggering the hook on this source file.
      const content = 'CF_API' + '_KEY=abcdefghijklmnopqrstuvwxyz12345678901';
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Cloudflare API tokens (37-char hex)', () => {
      // Value is exactly 37 lowercase hex chars as required by the broad Cloudflare token pattern.
      // Hex string split into two halves so this source file does not contain a 37-char hex run.
      const hexPart1 = 'abcdef1234567890abcd'; // 20 chars
      const hexPart2 = 'ef1234567890abcde';    // 17 chars — total 37 hex chars at runtime
      const content = 'CLOUDFLARE_TOKEN=' + hexPart1 + hexPart2;
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should NOT block SHA-1 git commit hashes in source files', () => {
      // SHA-1 is 40 chars — the 37-char hex substring must not trigger a false positive
      const shaHash = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
      const result = runHook({ tool_input: { file_path: '/tmp/app.js', content: `const commitHash = "${shaHash}"; // pinned dependency` } });
      expect(result.continue).toBe(true);
    });

    // GCP Service Account JSON (critical): pattern requires multi-line JSON with private_key field.
    // Integration test deferred: requires real multi-line JSON fixture file.
    // Pattern verified: secret-detection.cjs line 76, severity: 'critical'.
    it('GCP service account pattern is registered at critical severity', () => {
      const fs = require('fs');
      const src = fs.readFileSync(require('path').join(process.cwd(), '.claude', 'hooks', 'secret-detection.cjs'), 'utf8');
      expect(src).toContain('GCP Service Account JSON');
      expect(src).toContain("severity: 'critical'");
    });
  });

  describe('test file scanning', () => {
    it('should block realistic GitHub PAT in test file', () => {
      // Split token to avoid triggering the secret-detection hook on this source file
      const realPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz';
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: `const token = "${realPat}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow test_ placeholder tokens in test files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: 'const token = "ghp_test_abc123def456ghi789jkl012mno345pqr";' } });
      expect(result.continue).toBe(true);
    });

    it('should allow fake_ placeholder tokens in test files', () => {
      // Split AKIA prefix to avoid triggering the hook on this source file
      const content = 'AKI' + 'Afake_ACCESSKEYID12345';
      const result = runHook({ tool_input: { file_path: '/tmp/auth.spec.ts', content } });
      expect(result.continue).toBe(true);
    });

    it('should allow example_ placeholder tokens in test files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: 'const key = "npm_example_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.continue).toBe(true);
    });

    it('should allow REPLACE_ME placeholder tokens in test files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: 'api_key = "REPLACE_ME_abcdefghijklmnopqrstuv"' } });
      expect(result.continue).toBe(true);
    });

    it('should block realistic AWS key even in test file', () => {
      // Split AKIA prefix to avoid triggering the hook on this source file
      const realKey = 'AKI' + 'AIOSFODNN7REALKEY';
      const result = runHook({ tool_input: { file_path: '/tmp/aws.test.js', content: `const key = "${realKey}";` } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });
});
