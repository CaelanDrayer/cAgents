import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Regression test for V11.2.0 Standalone Contract (Q-001, v11.2.6).
 *
 * Bug: V11.2.0 introduced the standalone contract (no MCP servers, no mcp__* in
 *      allowed-tools, no Elicitation hooks, no MCP-suggesting prose) but did not
 *      add a regression test. The contract could be silently re-violated by a
 *      future PR without CI catching it. CLAUDE.md § Standalone Contract Rule 5
 *      explicitly mandates a regression test enforces this contract.
 * Root cause: missing test — the V11.2.0 mandate was satisfied for prose but not
 *      for code.
 * Test added: this file. It uses the function-extraction pattern: pure helper
 *      functions (scanFor*) are unit-tested against synthetic-input strings that
 *      *describe* contract violations without *declaring* them. The literal
 *      tokens ("mcp__", "mcpServers", "Elicitation") appear only inside `it()`
 *      bodies as test fixtures, never as declarations in production files.
 *      Failing-before evidence captured by short-circuiting one helper; see
 *      outputs/wave-3/failing-before.log and outputs/wave-3/passing-after.log.
 * Could have caught by: a CI regression test of the V11.2.0 contract — if such
 *      a test had existed, the V11.1.12 consumer-pattern PR would have failed
 *      CI immediately instead of requiring three follow-up bumps to revert.
 *
 * Design notes:
 * - Violation strings are built via concat (e.g., 'mcp' + '__' + 'test') so a
 *   naive grep for the raw token in the repo doesn't false-positive on this
 *   test file. The integration scan also explicitly excludes this test file.
 * - The contract is about declarations in production config (mcpServers blocks,
 *   allowed-tools, hook registrations) and load-bearing docs — not about
 *   metadata-about-the-contract inside test fixtures or rule files explaining
 *   the contract.
 */

const ROOT = process.cwd();
const ARCHETYPES = [
  'developer',
  'operator',
  'advisor',
  'analyst',
  'creator',
  'writer',
  'strategist',
  'core',
  'leadership',
];

// String constants assembled via concat to keep this file grep-clean for naive scanners.
const MCP_PREFIX = 'mcp' + '__';                   // matches "mcp__"
const MCP_SERVERS_KEY = 'mcp' + 'Servers';         // matches "mcpServers"
const ELICITATION = 'Elicit' + 'ation';            // matches "Elicitation"

// Self-path used by integration scan to exclude this file from its own scan.
const SELF_REL_PATH = 'tests/regressions/standalone-contract.test.js';

// -------------------------------------------------------------------
// Pure helper functions (unit-testable, no filesystem access)
// -------------------------------------------------------------------

/**
 * Detects a populated mcpServers block in JSON content.
 * Returns { found: bool, location: string|null }.
 *
 * A "populated" block is one where the key exists AND its value is a
 * non-empty object/array. An empty `{}` or absent key both PASS.
 */
function scanForMcpServersBlock(jsonContent) {
  if (typeof jsonContent !== 'string' || jsonContent.length === 0) {
    return { found: false, location: null };
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    // Malformed JSON — can't decide; report not-found and let JSON-syntax test handle it.
    return { found: false, location: null };
  }
  // Walk shallow + one nested level (plugin.json may declare nested config).
  function probe(obj, path) {
    if (!obj || typeof obj !== 'object') return null;
    if (MCP_SERVERS_KEY in obj) {
      const v = obj[MCP_SERVERS_KEY];
      if (v && typeof v === 'object') {
        const isEmpty = Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0;
        if (!isEmpty) {
          return path + '.' + MCP_SERVERS_KEY;
        }
      } else if (v !== null && v !== undefined && v !== '') {
        // Non-object truthy value (string, number) — also a violation.
        return path + '.' + MCP_SERVERS_KEY;
      }
    }
    for (const k of Object.keys(obj)) {
      const r = probe(obj[k], path + '.' + k);
      if (r) return r;
    }
    return null;
  }
  const loc = probe(parsed, '$');
  return { found: loc !== null, location: loc };
}

/**
 * Detects mcp__-prefixed tokens in an `allowed-tools` declaration extracted
 * from a SKILL.md frontmatter line or block.
 * Returns { found: bool, matches: string[] }.
 *
 * Accepts the raw line/block. Treats whitespace and YAML list syntax as
 * separators. Catches both `allowed-tools: Read Bash mcp__foo` and YAML list
 * form.
 */
function scanAllowedToolsForMcpPrefix(allowedToolsBlock) {
  if (typeof allowedToolsBlock !== 'string') {
    return { found: false, matches: [] };
  }
  const tokens = allowedToolsBlock.split(/[\s,\-:\[\]"']+/).filter((t) => t.length > 0);
  const matches = tokens.filter((t) => t.startsWith(MCP_PREFIX));
  return { found: matches.length > 0, matches };
}

/**
 * Detects Elicitation hook event registrations in a settings.json content
 * string. Returns { found: bool, events: string[] }.
 *
 * Looks for `Elicitation` or `ElicitationResult` as top-level keys in the
 * `hooks` block. The contract forbids cAgents from registering handlers for
 * these MCP-protocol events.
 */
function scanHookRegistrationForElicitation(settingsContent) {
  if (typeof settingsContent !== 'string') {
    return { found: false, events: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(settingsContent);
  } catch {
    return { found: false, events: [] };
  }
  const hooks = parsed.hooks;
  if (!hooks || typeof hooks !== 'object') {
    return { found: false, events: [] };
  }
  const events = Object.keys(hooks).filter((k) => k.startsWith(ELICITATION));
  return { found: events.length > 0, events };
}

/**
 * Detects MCP-integration suggestions in documentation prose.
 * Returns { found: bool, lines: number[] }.
 *
 * Looks for phrases that *recommend* MCP integration, e.g.:
 *   - "Use the X MCP server"
 *   - "Configure your MCP server"
 *   - "mcp__github__create_issue" (a usage example, not a contract reference)
 *
 * Allows references when `opts.allowAttackSurface` is true (security agents
 * may legitimately discuss MCP as an attack surface to audit).
 *
 * Allowed contexts (NOT violations):
 *   - "MCP" in a list of acronyms
 *   - Discussion of the contract itself (e.g., "no mcpServers", "no mcp__*")
 *   - "MCP-suggesting" appearing in contract documentation
 *   - "via MCP" only when in the same line as "attack surface", "audit", etc.
 *
 * Heuristic check: scan for the mcp__ prefix as a literal usage example or
 * for "Use the [X] MCP" recommendation patterns.
 */
function scanDocsForMcpSuggestions(mdContent, opts = {}) {
  const allowAttackSurface = opts.allowAttackSurface !== false; // default true
  if (typeof mdContent !== 'string') {
    return { found: false, lines: [] };
  }
  const lines = mdContent.split('\n');
  const violations = [];
  const suggestPatterns = [
    /\buse\s+(the\s+)?[\w-]*\s*MCP\s+(server|integration|tool)/i,
    /\bconfigure\s+(an?|your|the)\s+MCP\s+(server|tool)/i,
    /\b(install|add|enable)\s+(an?|your|the)\s+MCP\s+(server|tool)/i,
  ];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines about the contract itself.
    if (/standalone\s+contract|contract\s+(rule|guard)|no\s+mcp/i.test(line)) continue;
    // Skip lines about attack surface auditing.
    if (allowAttackSurface && /attack\s+surface|audit|adversar|vulner/i.test(line)) continue;
    // Skip lines that quote/reference cAgents history (e.g., "V11.1.12 introduced...")
    if (/v11\.\d|consumer.pattern|stage\s+1|reverts?|reverted/i.test(line)) continue;
    for (const pat of suggestPatterns) {
      if (pat.test(line)) {
        violations.push(i + 1);
        break;
      }
    }
  }
  return { found: violations.length > 0, lines: violations };
}

// -------------------------------------------------------------------
// Filesystem walker for SKILL.md
// -------------------------------------------------------------------

function* walkSkillMd(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      yield* walkSkillMd(full);
    } else if (entry === 'SKILL.md') {
      yield full;
    }
  }
}

function extractAllowedToolsBlock(skillMdContent) {
  // YAML frontmatter is delimited by --- at the start.
  const fmMatch = skillMdContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return '';
  const fm = fmMatch[1];
  // Match `allowed-tools:` either as a single-line value or as a YAML block.
  // Single-line: `allowed-tools: Read Bash Agent`
  // Block: `allowed-tools:\n  - Read\n  - Bash`
  const inlineMatch = fm.match(/^\s*allowed-tools:\s*(.+)$/m);
  if (inlineMatch) {
    return inlineMatch[1];
  }
  // Block form.
  const blockMatch = fm.match(/^\s*allowed-tools:\s*\n((?:\s+-\s*.+\n?)+)/m);
  if (blockMatch) {
    return blockMatch[1];
  }
  return '';
}

// -------------------------------------------------------------------
// Unit tests: helper functions detect violations correctly
// -------------------------------------------------------------------

describe('Standalone Contract V11.2.0 — helper functions detect violations', () => {
  describe('scanForMcpServersBlock', () => {
    it('detects a populated mcpServers block at the top level', () => {
      // Build the violation string via concat so this file is grep-clean.
      const obj = {};
      obj[MCP_SERVERS_KEY] = { foo: { command: 'bar' } };
      const violatingJson = JSON.stringify(obj);
      const result = scanForMcpServersBlock(violatingJson);
      expect(result.found).toBe(true);
      expect(result.location).toContain(MCP_SERVERS_KEY);
    });

    it('detects a populated mcpServers block nested under a config key', () => {
      const obj = { config: {} };
      obj.config[MCP_SERVERS_KEY] = { srv: {} };
      const violatingJson = JSON.stringify(obj);
      const result = scanForMcpServersBlock(violatingJson);
      expect(result.found).toBe(true);
    });

    it('allows an empty mcpServers block (PASS)', () => {
      const obj = {};
      obj[MCP_SERVERS_KEY] = {};
      const cleanJson = JSON.stringify(obj);
      expect(scanForMcpServersBlock(cleanJson).found).toBe(false);
    });

    it('allows absent mcpServers key (PASS)', () => {
      const cleanJson = JSON.stringify({ name: 'cagents', version: '11.2.6' });
      expect(scanForMcpServersBlock(cleanJson).found).toBe(false);
    });

    it('handles malformed JSON gracefully (returns not-found)', () => {
      const result = scanForMcpServersBlock('{ broken json');
      expect(result.found).toBe(false);
    });

    it('handles empty input gracefully', () => {
      expect(scanForMcpServersBlock('').found).toBe(false);
      expect(scanForMcpServersBlock(null).found).toBe(false);
    });
  });

  describe('scanAllowedToolsForMcpPrefix', () => {
    it('detects a single mcp__-prefixed token in a space-separated list', () => {
      // Build the violation token via concat so this file is grep-clean.
      const violatingTools = 'Read Bash ' + MCP_PREFIX + 'github_create_issue Write';
      const result = scanAllowedToolsForMcpPrefix(violatingTools);
      expect(result.found).toBe(true);
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]).toContain(MCP_PREFIX);
    });

    it('detects multiple mcp__-prefixed tokens', () => {
      const violatingTools =
        'Read ' + MCP_PREFIX + 'foo Bash ' + MCP_PREFIX + 'bar Write';
      const result = scanAllowedToolsForMcpPrefix(violatingTools);
      expect(result.found).toBe(true);
      expect(result.matches.length).toBe(2);
    });

    it('detects mcp__ tokens in a YAML list block', () => {
      const violatingBlock = '  - Read\n  - ' + MCP_PREFIX + 'test\n  - Bash';
      const result = scanAllowedToolsForMcpPrefix(violatingBlock);
      expect(result.found).toBe(true);
    });

    it('passes on a clean allowed-tools line', () => {
      const cleanTools = 'Read Bash Write Edit Grep Glob Agent TaskCreate';
      expect(scanAllowedToolsForMcpPrefix(cleanTools).found).toBe(false);
    });

    it('passes on an empty input', () => {
      expect(scanAllowedToolsForMcpPrefix('').found).toBe(false);
      expect(scanAllowedToolsForMcpPrefix(null).found).toBe(false);
    });
  });

  describe('scanHookRegistrationForElicitation', () => {
    it('detects Elicitation hook event registration', () => {
      // Build the violation key via concat so this file is grep-clean.
      const settings = { hooks: {} };
      settings.hooks[ELICITATION] = [{ hooks: [{ type: 'command', command: 'foo' }] }];
      const violatingSettings = JSON.stringify(settings);
      const result = scanHookRegistrationForElicitation(violatingSettings);
      expect(result.found).toBe(true);
      expect(result.events).toContain(ELICITATION);
    });

    it('detects ElicitationResult hook event registration', () => {
      const settings = { hooks: {} };
      settings.hooks[ELICITATION + 'Result'] = [{ hooks: [] }];
      const violatingSettings = JSON.stringify(settings);
      const result = scanHookRegistrationForElicitation(violatingSettings);
      expect(result.found).toBe(true);
    });

    it('passes on settings with no Elicitation hooks', () => {
      const cleanSettings = JSON.stringify({
        hooks: {
          SessionStart: [{ hooks: [] }],
          PreToolUse: [{ matcher: 'Bash', hooks: [] }],
        },
      });
      expect(scanHookRegistrationForElicitation(cleanSettings).found).toBe(false);
    });

    it('passes on settings with no hooks block at all', () => {
      const cleanSettings = JSON.stringify({ env: { FOO: 'bar' } });
      expect(scanHookRegistrationForElicitation(cleanSettings).found).toBe(false);
    });

    it('handles malformed input gracefully', () => {
      expect(scanHookRegistrationForElicitation('not json').found).toBe(false);
      expect(scanHookRegistrationForElicitation('').found).toBe(false);
    });
  });

  describe('scanDocsForMcpSuggestions', () => {
    it('detects "Use the X MCP server" recommendation', () => {
      const violatingMd = 'To get started:\n\nUse the GitHub MCP server to fetch issues.\n';
      const result = scanDocsForMcpSuggestions(violatingMd);
      expect(result.found).toBe(true);
      expect(result.lines).toContain(3);
    });

    it('detects "Configure your MCP server" recommendation', () => {
      const violatingMd = '# Setup\n\nConfigure your MCP server in settings.json.\n';
      const result = scanDocsForMcpSuggestions(violatingMd);
      expect(result.found).toBe(true);
    });

    it('detects "Install an MCP server" recommendation', () => {
      const violatingMd = 'Step 1: Install an MCP server for your database.\n';
      const result = scanDocsForMcpSuggestions(violatingMd);
      expect(result.found).toBe(true);
    });

    it('allows contract-discussion language (e.g., "no mcpServers")', () => {
      const cleanMd = '# Standalone Contract\n\ncAgents has no mcpServers blocks.\n';
      expect(scanDocsForMcpSuggestions(cleanMd).found).toBe(false);
    });

    it('allows attack-surface references for security agents', () => {
      const securityMd =
        '## Threats\n\nAudit MCP servers as a potential attack surface. ' +
        'Use the GitHub MCP server only after vetting.\n';
      // The "Use the GitHub MCP server" phrase is on the same line as
      // "attack surface" context — should be allowed.
      const result = scanDocsForMcpSuggestions(securityMd, { allowAttackSurface: true });
      expect(result.found).toBe(false);
    });

    it('allows historical context references (V11.1.12 consumer pattern)', () => {
      const historicalMd =
        '## History\n\nV11.1.12 introduced an MCP consumer pattern. ' +
        'Configure your MCP server was the recommended path. ' +
        'V11.2.0 reverted this.\n';
      const result = scanDocsForMcpSuggestions(historicalMd);
      expect(result.found).toBe(false);
    });

    it('handles empty/null input', () => {
      expect(scanDocsForMcpSuggestions('').found).toBe(false);
      expect(scanDocsForMcpSuggestions(null).found).toBe(false);
    });
  });
});

// -------------------------------------------------------------------
// Integration tests: production tree is clean
// -------------------------------------------------------------------

describe('Standalone Contract V11.2.0 — production tree is clean', () => {
  it('plugin.json has no populated mcpServers block', () => {
    const pluginJsonPath = join(ROOT, '.claude-plugin', 'plugin.json');
    expect(existsSync(pluginJsonPath)).toBe(true);
    const content = readFileSync(pluginJsonPath, 'utf8');
    const result = scanForMcpServersBlock(content);
    expect(result.found).toBe(false);
    if (result.found) {
      throw new Error(
        `plugin.json contains a populated mcpServers block at ${result.location}. ` +
          `The standalone contract forbids this.`
      );
    }
  });

  it('.mcp.json has no populated mcpServers block (or does not exist)', () => {
    const mcpJsonPath = join(ROOT, '.mcp.json');
    if (!existsSync(mcpJsonPath)) {
      // Absent file PASSES.
      return;
    }
    const content = readFileSync(mcpJsonPath, 'utf8');
    const result = scanForMcpServersBlock(content);
    expect(result.found).toBe(false);
    if (result.found) {
      throw new Error(
        `.mcp.json contains a populated mcpServers block at ${result.location}. ` +
          `The standalone contract forbids this.`
      );
    }
  });

  it('no agent SKILL.md declares mcp__ in allowed-tools', () => {
    const violations = [];
    for (const arch of ARCHETYPES) {
      for (const skillMd of walkSkillMd(join(ROOT, 'agents', arch))) {
        const content = readFileSync(skillMd, 'utf8');
        const block = extractAllowedToolsBlock(content);
        if (!block) continue;
        const result = scanAllowedToolsForMcpPrefix(block);
        if (result.found) {
          violations.push({
            file: relative(ROOT, skillMd),
            tokens: result.matches,
          });
        }
      }
    }
    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file} → ${v.tokens.join(', ')}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} agent SKILL.md file(s) with mcp__ tokens in allowed-tools:\n${msg}`
      );
    }
    expect(violations).toEqual([]);
  });

  it('no skill SKILL.md (.claude/skills/) declares mcp__ in allowed-tools', () => {
    const skillsDir = join(ROOT, '.claude', 'skills');
    const violations = [];
    if (existsSync(skillsDir)) {
      for (const skillMd of walkSkillMd(skillsDir)) {
        const content = readFileSync(skillMd, 'utf8');
        const block = extractAllowedToolsBlock(content);
        if (!block) continue;
        const result = scanAllowedToolsForMcpPrefix(block);
        if (result.found) {
          violations.push({
            file: relative(ROOT, skillMd),
            tokens: result.matches,
          });
        }
      }
    }
    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file} → ${v.tokens.join(', ')}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} skill SKILL.md file(s) with mcp__ tokens in allowed-tools:\n${msg}`
      );
    }
    expect(violations).toEqual([]);
  });

  it('settings.json registers no Elicitation* hook events', () => {
    const settingsPath = join(ROOT, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const content = readFileSync(settingsPath, 'utf8');
    const result = scanHookRegistrationForElicitation(content);
    if (result.found) {
      throw new Error(
        `settings.json registers Elicitation* hook events: ${result.events.join(', ')}. ` +
          `The standalone contract forbids handlers for MCP protocol events.`
      );
    }
    expect(result.found).toBe(false);
  });

  it('regression test file itself is excluded from the integration scan', () => {
    // Sanity check: this test file contains the literal violation tokens as
    // metadata-about-the-contract (inside concat'd test fixtures and this very
    // assertion). The integration scans above MUST NOT treat it as a violation.
    // The scans only check production config and SKILL.md frontmatter, not
    // arbitrary .js files, so this is structural rather than enforced via an
    // exclude list. Verify the structural exclusion by confirming this file is
    // not under a path the integration scans walk.
    const selfPath = join(ROOT, SELF_REL_PATH);
    expect(existsSync(selfPath)).toBe(true);

    // The integration scans walk: .claude-plugin/plugin.json, .mcp.json,
    // 9 archetype dirs for SKILL.md, .claude/skills/ for SKILL.md, and
    // .claude/settings.json. None of these include tests/ — confirming
    // structural exclusion.
    for (const arch of ARCHETYPES) {
      expect(SELF_REL_PATH.startsWith(arch + '/')).toBe(false);
    }
    expect(SELF_REL_PATH.startsWith('.claude/skills/')).toBe(false);
    expect(SELF_REL_PATH).not.toBe('.claude/settings.json');
    expect(SELF_REL_PATH).not.toBe('.claude-plugin/plugin.json');
    expect(SELF_REL_PATH).not.toBe('.mcp.json');
  });
});
