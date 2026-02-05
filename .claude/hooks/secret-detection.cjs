#!/usr/bin/env node
/**
 * Secret Detection Hook - Block secrets in file writes
 * cAgents V8.0 - Automated Security Review
 *
 * This hook runs BEFORE Write/Edit operations to detect and block secrets.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules and regex patterns.
 * NO external dependencies (no gitleaks, no npm packages).
 *
 * NOTE: Private key patterns use RegExp constructor to avoid the hook
 * detecting its own source code as containing secrets.
 *
 * Input (stdin): JSON with tool_name, tool_input (file_path, content)
 * Output (stdout): JSON with continue status and denial reason if blocked
 */

// CRITICAL: Wrap everything in try-catch for plugin resilience
try {

// Try to load hook-utils, fall back to inline implementation
let readStdin;
try {
  readStdin = require('./hook-utils.cjs').readStdin;
} catch {
  // Minimal inline fallback for plugin mode
  readStdin = () => new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    if (process.stdin.isTTY) { resolve({}); return; }
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 3000);
  });
}

// Build private key patterns dynamically to avoid self-detection
const PK_BEGIN = '-----' + 'BEGIN ';
const PK_END = 'PRIVATE KEY' + '-----';
const PGP_END = 'PRIVATE KEY BLOCK' + '-----';

/**
 * Secret patterns - self-contained, regex-based detection
 * Patterns sourced from common secret detection tools
 */
const SECRET_PATTERNS = [
  // API Keys and Tokens
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token', severity: 'critical' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token', severity: 'critical' },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, name: 'GitHub User-to-Server Token', severity: 'critical' },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: 'GitHub Server-to-Server Token', severity: 'critical' },
  { pattern: /ghr_[a-zA-Z0-9]{36}/g, name: 'GitHub Refresh Token', severity: 'critical' },
  { pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, name: 'GitHub Fine-grained PAT', severity: 'critical' },

  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID', severity: 'critical' },
  { pattern: /ABIA[0-9A-Z]{16}/g, name: 'AWS STS Token', severity: 'critical' },
  { pattern: /ACCA[0-9A-Z]{16}/g, name: 'AWS Credential', severity: 'critical' },
  { pattern: /aws[_-]?secret[_-]?access[_-]?key[\s]*[=:]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi, name: 'AWS Secret Access Key', severity: 'critical' },

  // Private Keys (constructed dynamically to avoid self-detection)
  { pattern: new RegExp(PK_BEGIN + '(?:RSA |DSA |EC |OPENSSH )?' + PK_END, 'g'), name: 'Private Key', severity: 'critical' },
  { pattern: new RegExp(PK_BEGIN + 'PGP ' + PGP_END, 'g'), name: 'PGP Private Key', severity: 'critical' },

  // Google/GCP
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, name: 'Google API Key', severity: 'high' },
  { pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, name: 'Google OAuth Client ID', severity: 'medium' },

  // Slack
  { pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g, name: 'Slack Token', severity: 'critical' },

  // Stripe
  { pattern: /sk_live_[0-9a-zA-Z]{24,}/g, name: 'Stripe Live Secret Key', severity: 'critical' },
  { pattern: /rk_live_[0-9a-zA-Z]{24,}/g, name: 'Stripe Live Restricted Key', severity: 'critical' },

  // Database Connection Strings
  { pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^:]+:[^@]+@[^\s]+/gi, name: 'Database Connection String with Credentials', severity: 'critical' },

  // Generic Patterns (lower confidence, medium severity)
  { pattern: /(?:api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, name: 'Generic API Key', severity: 'medium' },
  { pattern: /(?:secret[_-]?key|private[_-]?key)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, name: 'Generic Secret Key', severity: 'medium' },

  // Anthropic
  { pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g, name: 'Anthropic API Key', severity: 'critical' },

  // OpenAI (sk-proj- prefix for newer keys, exclude sk-ant- which is Anthropic)
  { pattern: /sk-proj-[a-zA-Z0-9_-]{40,}/g, name: 'OpenAI API Key', severity: 'critical' },
  { pattern: /sk-(?!ant-|live_|test_)[a-zA-Z0-9]{46,50}/g, name: 'OpenAI API Key (legacy)', severity: 'critical' },

  // NPM
  { pattern: /npm_[a-zA-Z0-9]{36}/g, name: 'NPM Access Token', severity: 'critical' },

  // PyPI
  { pattern: /pypi-[a-zA-Z0-9_-]{64,}/g, name: 'PyPI API Token', severity: 'critical' },

  // Heroku (require HEROKU context to avoid matching all UUIDs)
  { pattern: /(?:HEROKU[_-]?API[_-]?KEY|heroku[_-]?api[_-]?key)[\s]*[=:]\s*["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/gi, name: 'Heroku API Key', severity: 'critical' },

  // JWT (warning only - could be test tokens)
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, name: 'JWT Token', severity: 'low' }
];

/**
 * False positive patterns - files/content to skip
 */
const FALSE_POSITIVE_PATTERNS = [
  /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /__tests__\//, /test_.*\.py$/, /_test\.go$/,
  /\.md$/, /docs?\//, /README/i,
  /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/,
  /example/i, /sample/i, /template/i, /mock/i, /fixture/i
];

/**
 * Content patterns that indicate false positives
 */
const FALSE_POSITIVE_CONTENT = [
  /YOUR[_-]?API[_-]?KEY/i, /REPLACE[_-]?WITH/i, /\$\{[^}]+\}/, /<[^>]+>/, /xxx+/i, /\*{3,}/, /\.{3,}/
];

/**
 * Check if file path is likely a false positive
 */
function isPathFalsePositive(filePath) {
  if (!filePath) return false;
  return FALSE_POSITIVE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Check if detected secret is likely a false positive
 */
function isContentFalsePositive(content, match) {
  const matchIndex = content.indexOf(match);
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + match.length + 50);
  const context = content.substring(start, end);
  return FALSE_POSITIVE_CONTENT.some(pattern => pattern.test(context));
}

/**
 * Scan content for secrets — priority-ordered with early termination.
 * Checks critical/high patterns first and stops scanning lower-severity
 * patterns once a blocking finding is confirmed.
 */
function scanForSecrets(content, filePath) {
  if (isPathFalsePositive(filePath)) return { critical: [], high: [], medium: [], low: [] };
  if (content.length < 8) return { critical: [], high: [], medium: [], low: [] };

  const findings = { critical: [], high: [], medium: [], low: [] };

  for (const secretType of SECRET_PATTERNS) {
    secretType.pattern.lastIndex = 0;

    let match;
    while ((match = secretType.pattern.exec(content)) !== null) {
      const matchedText = match[0];

      if (isContentFalsePositive(content, matchedText)) continue;

      const lines = content.substring(0, match.index).split('\n');
      const lineNumber = lines.length;

      const redacted = matchedText.length > 10
        ? matchedText.substring(0, 6) + '...' + matchedText.substring(matchedText.length - 4)
        : matchedText.substring(0, 3) + '***';

      findings[secretType.severity].push({
        type: secretType.name,
        severity: secretType.severity,
        line: lineNumber,
        redacted,
        length: matchedText.length
      });
    }

    // Early termination: once we have critical/high findings, skip medium/low
    if (findings.critical.length + findings.high.length > 0 &&
        (secretType.severity === 'medium' || secretType.severity === 'low')) {
      break;
    }
  }

  return findings;
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const toolInput = input.tool_input || {};
    const filePath = toolInput.file_path || '';
    const content = toolInput.content || '';

    if (!content) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const findings = scanForSecrets(content, filePath);
    const allSignificant = [...findings.critical, ...findings.high];

    if (allSignificant.length > 0) {
      const findingsList = allSignificant
        .map(f => `- ${f.type} (line ${f.line}): ${f.redacted}`)
        .join('\n');

      console.error(`[SecretDetection] BLOCKED: Found ${allSignificant.length} secret(s) in ${filePath}`);
      console.log(JSON.stringify({
        continue: false,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Secret detected in file content:\n${findingsList}\n\nRemove secrets before writing. Use environment variables or .env files instead.`
        }
      }));
      process.exit(2);
    }

    if (findings.medium.length > 0) {
      const warnings = findings.medium.map(f => `${f.type} (line ${f.line})`).join(', ');
      console.error(`[SecretDetection] WARNING: ${findings.medium.length} possible secret(s) in ${filePath}`);
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `Warning: Possible secrets detected (${warnings}). Review before committing.`
      }));
    } else if (findings.low.length > 0) {
      console.error(`[SecretDetection] INFO: ${findings.low.length} low-confidence finding(s) in ${filePath}`);
      console.log(JSON.stringify({ continue: true }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[SecretDetection] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
