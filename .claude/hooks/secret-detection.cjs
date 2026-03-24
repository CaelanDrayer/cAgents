#!/usr/bin/env node
/**
 * Secret Detection + Path Protection Hook - Block secrets and protected paths
 * cAgents V9.10 - Refactored (merged pre-write.sh path protection)
 *
 * Runs BEFORE Write/Edit operations to:
 * 1. Block writes to protected system paths (from pre-write.sh)
 * 2. Detect and block secrets in file content
 *
 * Input (stdin): JSON with tool_name, tool_input (file_path, content)
 * Output (stdout): JSON with permission decision
 */

const path = require('path');
const { createHook, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

// Protected system paths (merged from pre-write.sh)
const PROTECTED_PATHS = ['/etc/', '/usr/', '/bin/', '/sbin/', '/boot/', '/sys/', '/proc/'];
const HOME = process.env.HOME || '';
if (HOME) {
  PROTECTED_PATHS.push(path.join(HOME, '.ssh') + '/');
  PROTECTED_PATHS.push(path.join(HOME, '.gnupg') + '/');
}

// Sensitive file patterns (warning only — matched on filename, triggers a caution message but does NOT block).
// Pattern-based secret scanning below (SECRET_PATTERNS) does the actual blocking on critical/high severity.
const SENSITIVE_PATTERNS = ['.env', 'credentials', 'secrets', 'private', '.pem', '.key', 'password'];

// Build private key patterns dynamically to avoid self-detection
const PK_BEGIN = '-----' + 'BEGIN ';
const PK_END = 'PRIVATE KEY' + '-----';
const PGP_END = 'PRIVATE KEY BLOCK' + '-----';
const GCP_SA_PATTERN = '"type"\\s*:\\s*"service_account"[\\s\\S]*?"private_key"\\s*:\\s*"' + PK_BEGIN + 'RSA ' + PK_END;

const SECRET_PATTERNS = [
  // GitHub
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub PAT', severity: 'critical' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token', severity: 'critical' },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, name: 'GitHub User Token', severity: 'critical' },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: 'GitHub Server Token', severity: 'critical' },
  { pattern: /ghr_[a-zA-Z0-9]{36}/g, name: 'GitHub Refresh Token', severity: 'critical' },
  { pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, name: 'GitHub Fine-grained PAT', severity: 'critical' },
  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID', severity: 'critical' },
  { pattern: /aws[_-]?secret[_-]?access[_-]?key[\s]*[=:]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi, name: 'AWS Secret Access Key', severity: 'critical' },
  // Private Keys
  { pattern: new RegExp(PK_BEGIN + '(?:RSA |DSA |EC |OPENSSH )?' + PK_END, 'g'), name: 'Private Key', severity: 'critical' },
  { pattern: new RegExp(PK_BEGIN + 'PGP ' + PGP_END, 'g'), name: 'PGP Private Key', severity: 'critical' },
  // Google
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, name: 'Google API Key', severity: 'high' },
  // Slack
  { pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g, name: 'Slack Token', severity: 'critical' },
  // Stripe
  { pattern: /sk_live_[0-9a-zA-Z]{24,}/g, name: 'Stripe Live Secret Key', severity: 'critical' },
  { pattern: /rk_live_[0-9a-zA-Z]{24,}/g, name: 'Stripe Live Restricted Key', severity: 'critical' },
  // Database
  { pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^:]+:[^@]+@[^\s]+/gi, name: 'Database Credentials', severity: 'critical' },
  // API keys
  { pattern: /(?:api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, name: 'Generic API Key', severity: 'medium' },
  { pattern: /(?:secret[_-]?key|private[_-]?key)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, name: 'Generic Secret Key', severity: 'medium' },
  // Anthropic
  { pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g, name: 'Anthropic API Key', severity: 'critical' },
  // OpenAI
  { pattern: /sk-proj-[a-zA-Z0-9_-]{40,}/g, name: 'OpenAI API Key', severity: 'critical' },
  { pattern: /sk-(?!ant-|live_|test_)[a-zA-Z0-9]{46,50}/g, name: 'OpenAI API Key (legacy)', severity: 'critical' },
  // NPM/PyPI
  { pattern: /npm_[a-zA-Z0-9]{36}/g, name: 'NPM Access Token', severity: 'critical' },
  { pattern: /pypi-[a-zA-Z0-9_-]{64,}/g, name: 'PyPI API Token', severity: 'critical' },
  // Heroku (context-required)
  { pattern: /(?:HEROKU[_-]?API[_-]?KEY|heroku[_-]?api[_-]?key)[\s]*[=:]\s*["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/gi, name: 'Heroku API Key', severity: 'critical' },
  // JWT (low)
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, name: 'JWT Token', severity: 'low' },
  // Azure
  { pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[a-zA-Z0-9+/=]{88}/g, name: 'Azure Storage Account Key', severity: 'critical' },
  { pattern: /(?:client[_-]?secret|clientSecret)[\s]*[=:]\s*["']?([a-zA-Z0-9~._-]{34,40})["']?/gi, name: 'Azure AD Client Secret', severity: 'high' },
  // GCP
  { pattern: new RegExp(GCP_SA_PATTERN, 'g'), name: 'GCP Service Account JSON', severity: 'critical' },
  // Supabase
  { pattern: /sbp_[a-zA-Z0-9]{40}/g, name: 'Supabase Personal Access Token', severity: 'critical' },
  // Vercel
  { pattern: /vercel_[a-zA-Z0-9]{24,}/g, name: 'Vercel Token', severity: 'critical' },
  // Cloudflare (named pattern BEFORE broad hex pattern)
  { pattern: /(?:cloudflare[_-]?api[_-]?key|CF_API_KEY)[\s]*[=:]\s*["']?([a-zA-Z0-9]{37})["']?/gi, name: 'Cloudflare API Key', severity: 'critical' },
  { pattern: /(?<![0-9a-f])[0-9a-f]{37}(?![0-9a-f])/g, name: 'Cloudflare API Token', severity: 'high' },
  // GitLab
  { pattern: /glpat-[a-zA-Z0-9_-]{20}/g, name: 'GitLab Personal Access Token', severity: 'critical' },
  { pattern: /gldt-[a-zA-Z0-9_-]{20}/g, name: 'GitLab Deploy Token', severity: 'critical' },
  { pattern: /glrt-[a-zA-Z0-9_-]{20}/g, name: 'GitLab Runner Token', severity: 'critical' },
  // Terraform Cloud
  { pattern: /atlasv1\.[a-zA-Z0-9_-]{50,}/g, name: 'Terraform Cloud Token', severity: 'critical' },
  // HuggingFace
  { pattern: /hf_[a-zA-Z0-9]{34,}/g, name: 'HuggingFace API Token', severity: 'critical' }
];

// Test file path patterns — scanned for real secrets, but placeholder tokens are suppressed
const TEST_FILE_PATHS = [
  /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /__tests__\//, /test_.*\.py$/, /_test\.go$/
];

// Placeholder token patterns — suppress these in test files (explicit non-real tokens)
const TEST_PLACEHOLDER_PATTERNS = [
  /test_/i, /fake_/i, /example_/i, /your[_-]?key[_-]?here/i, /replace[_-]?me/i
];

const FALSE_POSITIVE_PATHS = [
  /\.md$/, /docs?\//, /README/i,
  /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/,
  /example/i, /sample/i, /template/i, /mock/i, /fixture/i
];

const FALSE_POSITIVE_CONTENT = [
  /YOUR[_-]?API[_-]?KEY/i, /REPLACE[_-]?WITH/i, /\$\{[^}]+\}/, /<[^>]+>/, /xxx+/i, /\*{3,}/, /\.{3,}/
];

function isPathFalsePositive(filePath) {
  return filePath && FALSE_POSITIVE_PATHS.some(p => p.test(filePath));
}

function isTestFile(filePath) {
  return filePath && TEST_FILE_PATHS.some(p => p.test(filePath));
}

function isTestFilePlaceholder(matchValue) {
  return TEST_PLACEHOLDER_PATTERNS.some(p => p.test(matchValue));
}

function isContentFalsePositive(content, match) {
  const idx = content.indexOf(match);
  const context = content.substring(Math.max(0, idx - 50), Math.min(content.length, idx + match.length + 50));
  return FALSE_POSITIVE_CONTENT.some(p => p.test(context));
}

function scanForSecrets(content, filePath) {
  if (isPathFalsePositive(filePath) || content.length < 8) {
    return { critical: [], high: [], medium: [], low: [] };
  }

  const testFile = isTestFile(filePath);
  const findings = { critical: [], high: [], medium: [], low: [] };

  for (const secretType of SECRET_PATTERNS) {
    secretType.pattern.lastIndex = 0;
    let match;
    while ((match = secretType.pattern.exec(content)) !== null) {
      if (isContentFalsePositive(content, match[0])) continue;
      // For test files, suppress placeholder tokens but scan real-looking tokens
      if (testFile && isTestFilePlaceholder(match[0])) continue;
      const lines = content.substring(0, match.index).split('\n');
      const redacted = match[0].length > 10
        ? match[0].substring(0, 6) + '...' + match[0].substring(match[0].length - 4)
        : match[0].substring(0, 3) + '***';
      findings[secretType.severity].push({
        type: secretType.name, severity: secretType.severity, line: lines.length, redacted
      });
    }
    // Early termination: skip lower severity if critical/high found
    if (findings.critical.length + findings.high.length > 0 &&
        (secretType.severity === 'medium' || secretType.severity === 'low')) break;
  }

  return findings;
}

createHook('SecretDetection', async (input) => {
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';
  const content = toolInput.content || toolInput.new_string || '';

  // 1. Check protected paths (from pre-write.sh)
  if (filePath) {
    for (const protectedPath of PROTECTED_PATHS) {
      if (filePath.startsWith(protectedPath)) {
        console.error(`[SecretDetection] BLOCKED: Write to protected path: ${filePath}`);
        return { deny: true, reason: `Cannot write to protected system path: ${filePath}` };
      }
    }
  }

  // 2. Warn about sensitive files
  if (filePath) {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (filePath.includes(pattern)) {
        console.error(`[SecretDetection] WARNING: Writing to sensitive file: ${filePath}`);
        // Don't return - continue to secret scan
        break;
      }
    }
  }

  // 3. Scan for secrets
  if (!content) return null;

  const findings = scanForSecrets(content, filePath);
  const allSignificant = [...findings.critical, ...findings.high];

  if (allSignificant.length > 0) {
    const findingsList = allSignificant.map(f => `- ${f.type} (line ${f.line}): ${f.redacted}`).join('\n');
    console.error(`[SecretDetection] BLOCKED: Found ${allSignificant.length} secret(s) in ${filePath}`);
    return { deny: true, reason: `Secret detected in file content:\n${findingsList}\n\nRemove secrets before writing. Use environment variables or .env files instead.` };
  }

  if (findings.medium.length > 0) {
    const findingsList = findings.medium.map(f => `- ${f.type} (line ${f.line}): ${f.redacted}`).join('\n');
    console.error(`[SecretDetection] BLOCKED: Found ${findings.medium.length} possible secret(s) in ${filePath}`);
    return { deny: true, reason: `Possible secret detected in file content:\n${findingsList}\n\nRemove secrets before writing. Use environment variables or .env files instead.` };
  }

  return null;
});
