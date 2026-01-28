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
 * Input (stdin): JSON with tool_name, tool_input (file_path, content)
 * Output (stdout): JSON with continue status and denial reason if blocked
 */

const fs = require('fs');
const path = require('path');

/**
 * Secret patterns - self-contained, regex-based detection
 * Patterns sourced from common secret detection tools
 */
const SECRET_PATTERNS = [
  // API Keys and Tokens
  {
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    name: 'GitHub Personal Access Token',
    severity: 'critical'
  },
  {
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    name: 'GitHub OAuth Token',
    severity: 'critical'
  },
  {
    pattern: /ghu_[a-zA-Z0-9]{36}/g,
    name: 'GitHub User-to-Server Token',
    severity: 'critical'
  },
  {
    pattern: /ghs_[a-zA-Z0-9]{36}/g,
    name: 'GitHub Server-to-Server Token',
    severity: 'critical'
  },
  {
    pattern: /ghr_[a-zA-Z0-9]{36}/g,
    name: 'GitHub Refresh Token',
    severity: 'critical'
  },
  {
    pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
    name: 'GitHub Fine-grained PAT',
    severity: 'critical'
  },

  // AWS
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    name: 'AWS Access Key ID',
    severity: 'critical'
  },
  {
    pattern: /ABIA[0-9A-Z]{16}/g,
    name: 'AWS STS Token',
    severity: 'critical'
  },
  {
    pattern: /ACCA[0-9A-Z]{16}/g,
    name: 'AWS Credential',
    severity: 'critical'
  },
  {
    pattern: /aws[_-]?secret[_-]?access[_-]?key[\s]*[=:]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi,
    name: 'AWS Secret Access Key',
    severity: 'critical'
  },

  // Private Keys
  {
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    name: 'Private Key',
    severity: 'critical'
  },
  {
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    name: 'PGP Private Key',
    severity: 'critical'
  },

  // Google/GCP
  {
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    name: 'Google API Key',
    severity: 'high'
  },
  {
    pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g,
    name: 'Google OAuth Client ID',
    severity: 'medium'
  },

  // Slack
  {
    pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
    name: 'Slack Token',
    severity: 'critical'
  },

  // Stripe
  {
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    name: 'Stripe Live Secret Key',
    severity: 'critical'
  },
  {
    pattern: /rk_live_[0-9a-zA-Z]{24,}/g,
    name: 'Stripe Live Restricted Key',
    severity: 'critical'
  },

  // Database Connection Strings
  {
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^:]+:[^@]+@[^\s]+/gi,
    name: 'Database Connection String with Credentials',
    severity: 'critical'
  },

  // Generic Patterns (lower confidence, medium severity)
  {
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
    name: 'Generic API Key',
    severity: 'medium'
  },
  {
    pattern: /(?:secret[_-]?key|private[_-]?key)[\s]*[=:]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
    name: 'Generic Secret Key',
    severity: 'medium'
  },

  // Anthropic
  {
    pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g,
    name: 'Anthropic API Key',
    severity: 'critical'
  },

  // OpenAI
  {
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    name: 'OpenAI API Key',
    severity: 'critical'
  },

  // NPM
  {
    pattern: /npm_[a-zA-Z0-9]{36}/g,
    name: 'NPM Access Token',
    severity: 'critical'
  },

  // PyPI
  {
    pattern: /pypi-[a-zA-Z0-9_-]{64,}/g,
    name: 'PyPI API Token',
    severity: 'critical'
  },

  // Heroku
  {
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    name: 'Heroku API Key (UUID format)',
    severity: 'medium'
  },

  // JWT (warning only - could be test tokens)
  {
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    name: 'JWT Token',
    severity: 'low'
  }
];

/**
 * False positive patterns - files/content to skip
 */
const FALSE_POSITIVE_PATTERNS = [
  // Test files
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test_.*\.py$/,
  /_test\.go$/,

  // Documentation
  /\.md$/,
  /docs?\//,
  /README/i,

  // Lock files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,

  // Example/sample files
  /example/i,
  /sample/i,
  /template/i,
  /mock/i,
  /fixture/i
];

/**
 * Content patterns that indicate false positives
 */
const FALSE_POSITIVE_CONTENT = [
  // Placeholder patterns
  /YOUR[_-]?API[_-]?KEY/i,
  /REPLACE[_-]?WITH/i,
  /\$\{[^}]+\}/,  // Template variables
  /<[^>]+>/,      // Placeholder brackets
  /xxx+/i,        // Redacted patterns
  /\*{3,}/,       // Asterisk placeholders
  /\.{3,}/        // Ellipsis placeholders
];

/**
 * Read JSON from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));

    setTimeout(() => resolve({}), 1000);
  });
}

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
  // Check surrounding context (50 chars before/after)
  const matchIndex = content.indexOf(match);
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + match.length + 50);
  const context = content.substring(start, end);

  return FALSE_POSITIVE_CONTENT.some(pattern => pattern.test(context));
}

/**
 * Scan content for secrets
 */
function scanForSecrets(content, filePath) {
  const findings = [];

  // Skip if file path indicates false positive
  if (isPathFalsePositive(filePath)) {
    return findings;
  }

  for (const secretType of SECRET_PATTERNS) {
    // Reset regex state
    secretType.pattern.lastIndex = 0;

    let match;
    while ((match = secretType.pattern.exec(content)) !== null) {
      const matchedText = match[0];

      // Skip false positives
      if (isContentFalsePositive(content, matchedText)) {
        continue;
      }

      // Find line number
      const lines = content.substring(0, match.index).split('\n');
      const lineNumber = lines.length;

      // Redact the secret for display
      const redacted = matchedText.length > 10
        ? matchedText.substring(0, 6) + '...' + matchedText.substring(matchedText.length - 4)
        : matchedText.substring(0, 3) + '***';

      findings.push({
        type: secretType.name,
        severity: secretType.severity,
        line: lineNumber,
        redacted: redacted,
        length: matchedText.length
      });
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

    // Skip if no content to scan
    if (!content) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Scan for secrets
    const findings = scanForSecrets(content, filePath);

    // Filter by severity for blocking
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');
    const allSignificant = [...criticalFindings, ...highFindings];

    if (allSignificant.length > 0) {
      // Block the write
      const findingsList = allSignificant
        .map(f => `- ${f.type} (line ${f.line}): ${f.redacted}`)
        .join('\n');

      const output = {
        continue: false,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Secret detected in file content:\n${findingsList}\n\nRemove secrets before writing. Use environment variables or .env files instead.`
        }
      };

      console.error(`[SecretDetection] BLOCKED: Found ${allSignificant.length} secret(s) in ${filePath}`);
      console.log(JSON.stringify(output));
      process.exit(2);
    }

    // Check for medium/low severity (warn but allow)
    const mediumFindings = findings.filter(f => f.severity === 'medium');
    const lowFindings = findings.filter(f => f.severity === 'low');

    if (mediumFindings.length > 0) {
      const warnings = mediumFindings
        .map(f => `${f.type} (line ${f.line})`)
        .join(', ');

      const output = {
        continue: true,
        systemMessage: `Warning: Possible secrets detected (${warnings}). Review before committing.`
      };

      console.error(`[SecretDetection] WARNING: ${mediumFindings.length} possible secret(s) in ${filePath}`);
      console.log(JSON.stringify(output));
    } else if (lowFindings.length > 0) {
      // Low severity - just log, don't show message
      console.error(`[SecretDetection] INFO: ${lowFindings.length} low-confidence finding(s) in ${filePath}`);
      console.log(JSON.stringify({ continue: true }));
    } else {
      // All clear
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[SecretDetection] Error: ${error.message}`);
    // Don't block on error
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
