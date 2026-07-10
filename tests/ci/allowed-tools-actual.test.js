/**
 * Advisory validator F1 — allowed-tools vs actual capability use.
 *
 * Tests the exported PURE helpers of
 * scripts/ci/advisory/allowed-tools-actual.cjs in isolation:
 *   - detectCapabilities(body): strong vs generous ("any") signal tiers,
 *   - parseAllowedTools(frontmatter): space/comma delim, wildcard, no-decl,
 *   - diffToolsVsCaps(declared, caps): LP1 (undeclared), LP2 (wildcard),
 *     LP3 (no-declaration), LP4 (over-declaration, actionable-only),
 *   - a normal Read/Grep/Glob agent produces zero findings,
 *   - run() returns a well-formed, non-throwing array.
 *
 * Hermetic: everything below drives the pure helpers with crafted strings —
 * no dependence on the live 58-agent catalog. (The one run() smoke test only
 * asserts shape/severities, never specific catalog counts.)
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { join } from 'path';

const require = createRequire(import.meta.url);
const MOD = join(process.cwd(), 'scripts', 'ci', 'advisory', 'allowed-tools-actual.cjs');
const v = require(MOD);

const {
  extractFrontmatterAndBody,
  parseAllowedTools,
  detectCapabilities,
  diffToolsVsCaps,
  LP4_ELIGIBLE_TOOLS,
  RULE,
} = v;

const ruleIds = (findings) => findings.map((f) => f.ruleId);
const hasRule = (findings, ruleId) => findings.some((f) => f.ruleId === ruleId);

describe('module contract', () => {
  it('exports the advisory validator shape', () => {
    expect(v.meta && v.meta.id).toBe('allowed-tools-actual');
    expect(typeof v.run).toBe('function');
    expect(typeof detectCapabilities).toBe('function');
    expect(typeof diffToolsVsCaps).toBe('function');
  });

  it('LP4 default allowlist excludes house-default boilerplate (Bash/Write/Edit) and Read/Grep/Glob', () => {
    expect(LP4_ELIGIBLE_TOOLS).toEqual(expect.arrayContaining(['WebFetch', 'WebSearch', 'Agent']));
    for (const t of ['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit']) {
      expect(LP4_ELIGIBLE_TOOLS).not.toContain(t);
    }
  });
});

describe('extractFrontmatterAndBody', () => {
  it('splits frontmatter from body', () => {
    const { frontmatter, body } = extractFrontmatterAndBody(
      '---\nname: x\nallowed-tools: Read Grep\n---\n# Body\nhello\n',
    );
    expect(frontmatter).toContain('allowed-tools: Read Grep');
    expect(body).toContain('# Body');
    expect(body).not.toContain('allowed-tools');
  });

  it('treats content with no frontmatter as all-body', () => {
    const { frontmatter, body } = extractFrontmatterAndBody('just body, no fence');
    expect(frontmatter).toBe('');
    expect(body).toBe('just body, no fence');
  });
});

describe('parseAllowedTools', () => {
  it('parses a space-delimited declaration', () => {
    const d = parseAllowedTools('name: x\nallowed-tools: Read Grep Glob Bash Agent\n');
    expect(d.hasDeclaration).toBe(true);
    expect(d.wildcard).toBe(false);
    expect([...d.tools].sort()).toEqual(['Agent', 'Bash', 'Glob', 'Grep', 'Read']);
  });

  it('parses a comma-delimited declaration', () => {
    const d = parseAllowedTools('allowed-tools: Read, Write, Bash\n');
    expect([...d.tools].sort()).toEqual(['Bash', 'Read', 'Write']);
  });

  it('tolerates a bracketed / quoted array form', () => {
    const d = parseAllowedTools('allowed-tools: ["Read", "Write", "Agent"]\n');
    expect([...d.tools].sort()).toEqual(['Agent', 'Read', 'Write']);
  });

  it('flags a wildcard grant', () => {
    expect(parseAllowedTools('allowed-tools: *\n').wildcard).toBe(true);
    expect(parseAllowedTools('allowed-tools: All tools\n').wildcard).toBe(true);
  });

  it('reports no declaration when allowed-tools is absent', () => {
    const d = parseAllowedTools('name: x\ntier: execution\n');
    expect(d.hasDeclaration).toBe(false);
    expect(d.tools.size).toBe(0);
  });
});

describe('detectCapabilities — two-tier (strong vs generous)', () => {
  it('marks a real backticked shell command as STRONG bash', () => {
    const caps = detectCapabilities('Then run `npm run migrate` to apply the change.');
    expect(caps.bash.strong).toBe(true);
    expect(caps.bash.any).toBe(true);
  });

  it('does NOT mark "run `agent-name`" as strong bash (agent invocation, not shell)', () => {
    // Regression: "run `cagents:ai-writing-editor`" previously produced a false LP1.
    const caps = detectCapabilities('Before returning, run `cagents:ai-writing-editor` (mode=both).');
    expect(caps.bash.strong).toBe(false);
  });

  it('marks soft prose ("execute") as generous-only, not strong', () => {
    const caps = detectCapabilities('The controller will execute the work items in order.');
    expect(caps.bash.strong).toBe(false);
    expect(caps.bash.any).toBe(true);
  });

  it('detects network capability (curl / WebFetch / fetch())', () => {
    expect(detectCapabilities('fetch data via `curl https://x`').network.strong).toBe(true);
    expect(detectCapabilities('Use WebFetch to read the page.').network.strong).toBe(true);
    expect(detectCapabilities('call fetch(url) then parse').network.strong).toBe(true);
  });

  it('treats the Agent TOOL (capitalized) as delegation, but not the lowercase "agent" noun', () => {
    expect(detectCapabilities('Spawn a specialist via the Agent tool.').delegation.strong).toBe(true);
    expect(detectCapabilities('delegate to backend-developer').delegation.strong).toBe(true);
    // "analytics agent" is a NOUN, not the tool — must not read as delegation.
    const noun = detectCapabilities('This is a consolidated analytics agent for modeling.');
    expect(noun.delegation.strong).toBe(false);
    expect(noun.delegation.any).toBe(false);
  });

  it('protects real delegators from LP4 via generous verbs (spawn/coordinate)', () => {
    expect(detectCapabilities('The lead will spawn teammates per wave.').delegation.any).toBe(true);
    expect(detectCapabilities('This controller coordinates specialists.').delegation.any).toBe(true);
  });
});

describe('diffToolsVsCaps — LP1 undeclared-but-used (HIGH)', () => {
  it('fires LP1 when the body shells out but Bash is not declared', () => {
    const caps = detectCapabilities('Run `npm test` to verify the change.');
    const declared = { tools: new Set(['Read', 'Grep', 'Glob']), hasDeclaration: true, wildcard: false };
    const findings = diffToolsVsCaps(declared, caps);
    expect(hasRule(findings, RULE.LP1)).toBe(true);
    const lp1 = findings.find((f) => f.ruleId === RULE.LP1);
    expect(lp1.severity).toBe('HIGH');
    expect(lp1.message).toMatch(/Bash/);
  });

  it('does NOT fire LP1 when Bash IS declared', () => {
    const caps = detectCapabilities('Run `npm test` to verify.');
    const declared = { tools: new Set(['Read', 'Bash']), hasDeclaration: true, wildcard: false };
    expect(hasRule(diffToolsVsCaps(declared, caps), RULE.LP1)).toBe(false);
  });

  it('fires LP1 for undeclared network capability', () => {
    const caps = detectCapabilities('Fetch the page with `curl https://example.com`.');
    const declared = { tools: new Set(['Read', 'Bash']), hasDeclaration: true, wildcard: false };
    const findings = diffToolsVsCaps(declared, caps);
    const lp1 = findings.find((f) => f.ruleId === RULE.LP1);
    expect(lp1).toBeTruthy();
    expect(lp1.message).toMatch(/WebFetch|WebSearch|network/);
  });

  it('does NOT raise HIGH for delegation prose (delegation is intentionally not LP1)', () => {
    const caps = detectCapabilities('Controllers spawn you; you use the Agent tool to delegate to specialists.');
    const declared = { tools: new Set(['Read', 'Grep', 'Glob']), hasDeclaration: true, wildcard: false };
    const findings = diffToolsVsCaps(declared, caps);
    expect(hasRule(findings, RULE.LP1)).toBe(false);
  });
});

describe('diffToolsVsCaps — LP2 wildcard (MEDIUM)', () => {
  it('fires LP2 on a wildcard grant', () => {
    const caps = detectCapabilities('does some things');
    const declared = { tools: new Set(['Read']), hasDeclaration: true, wildcard: true };
    const findings = diffToolsVsCaps(declared, caps);
    const lp2 = findings.find((f) => f.ruleId === RULE.LP2);
    expect(lp2).toBeTruthy();
    expect(lp2.severity).toBe('MEDIUM');
  });

  it('parseAllowedTools + diff wires a real wildcard frontmatter to LP2', () => {
    const d = parseAllowedTools('allowed-tools: *\n');
    const findings = diffToolsVsCaps(d, detectCapabilities('body'));
    expect(hasRule(findings, RULE.LP2)).toBe(true);
  });
});

describe('diffToolsVsCaps — LP3 no-declaration + capability (MEDIUM)', () => {
  it('fires LP3 when a capability is used but nothing is declared', () => {
    const caps = detectCapabilities('Run `git status` first.');
    const declared = { tools: new Set(), hasDeclaration: false, wildcard: false };
    const findings = diffToolsVsCaps(declared, caps);
    const lp3 = findings.find((f) => f.ruleId === RULE.LP3);
    expect(lp3).toBeTruthy();
    expect(lp3.severity).toBe('MEDIUM');
    // With no declaration, LP1/LP4 are moot — only LP3 should appear.
    expect(ruleIds(findings)).toEqual([RULE.LP3]);
  });

  it('does NOT fire LP3 when there is no declaration AND no capability', () => {
    const caps = detectCapabilities('This agent describes things in prose.');
    const declared = { tools: new Set(), hasDeclaration: false, wildcard: false };
    expect(diffToolsVsCaps(declared, caps)).toEqual([]);
  });
});

describe('diffToolsVsCaps — LP4 over-declaration (LOW), actionable-only', () => {
  it('fires LP4 for a declared Agent with no delegation signal', () => {
    const caps = detectCapabilities('This is an analytics agent that models data.'); // lowercase noun only
    const declared = { tools: new Set(['Read', 'Grep', 'Glob', 'Agent']), hasDeclaration: true, wildcard: false };
    const findings = diffToolsVsCaps(declared, caps);
    const lp4 = findings.filter((f) => f.ruleId === RULE.LP4);
    expect(lp4.length).toBe(1);
    expect(lp4[0].severity).toBe('LOW');
    expect(lp4[0].message).toMatch(/Agent/);
  });

  it('NEVER fires LP4 on Read/Grep/Glob even if forced into the allowlist', () => {
    const caps = detectCapabilities('reads and searches files'); // no actionable signals
    const declared = { tools: new Set(['Read', 'Grep', 'Glob', 'Bash', 'Agent']), hasDeclaration: true, wildcard: false };
    // Force the FULL actionable set (incl. Bash) to prove the guard is the
    // capability-mapping, not merely the default allowlist.
    const findings = diffToolsVsCaps(declared, caps, {
      lp4Tools: ['Read', 'Grep', 'Glob', 'Bash', 'Agent'],
    });
    const lp4Tools = findings.filter((f) => f.ruleId === RULE.LP4).map((f) => f.message);
    expect(lp4Tools.some((m) => /Bash/.test(m))).toBe(true); // actionable -> flagged
    expect(lp4Tools.some((m) => /Agent/.test(m))).toBe(true); // actionable -> flagged
    for (const ubiquitous of ['Read', 'Grep', 'Glob']) {
      expect(lp4Tools.some((m) => m.includes(`'${ubiquitous}'`))).toBe(false);
    }
  });

  it('does NOT fire LP4 when the declared actionable tool IS used', () => {
    const caps = detectCapabilities('Spawn specialists via the Agent tool and delegate to them.');
    const declared = { tools: new Set(['Read', 'Agent']), hasDeclaration: true, wildcard: false };
    expect(hasRule(diffToolsVsCaps(declared, caps), RULE.LP4)).toBe(false);
  });

  it('does NOT fire LP4 for Bash under the SHIPPED default allowlist (house boilerplate)', () => {
    const caps = detectCapabilities('This agent only writes prose and offers advice.');
    const declared = { tools: new Set(['Read', 'Grep', 'Glob', 'Bash']), hasDeclaration: true, wildcard: false };
    // Default opts => LP4_ELIGIBLE_TOOLS excludes Bash => no LP4.
    expect(hasRule(diffToolsVsCaps(declared, caps), RULE.LP4)).toBe(false);
  });
});

describe('diffToolsVsCaps — clean agents', () => {
  it('produces ZERO findings for a normal Read/Grep/Glob agent with matching body', () => {
    const caps = detectCapabilities('This agent reads files and searches the codebase for patterns.');
    const declared = { tools: new Set(['Read', 'Grep', 'Glob']), hasDeclaration: true, wildcard: false };
    expect(diffToolsVsCaps(declared, caps)).toEqual([]);
  });

  it('accepts a bare array/Set as the declared argument (convenience form)', () => {
    const caps = detectCapabilities('reads files');
    expect(diffToolsVsCaps(['Read', 'Grep', 'Glob'], caps)).toEqual([]);
    expect(diffToolsVsCaps(new Set(['Read', 'Grep', 'Glob']), caps)).toEqual([]);
  });
});

describe('run() — non-throwing, well-formed', () => {
  it('returns an array of normalized findings (or [] on error) and never throws', () => {
    let findings;
    expect(() => {
      findings = v.run();
    }).not.toThrow();
    expect(Array.isArray(findings)).toBe(true);
    for (const f of findings) {
      expect(typeof f.ruleId).toBe('string');
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(f.severity);
      expect(typeof f.file).toBe('string');
      expect(f.line).toBeNull();
      expect(typeof f.message).toBe('string');
    }
  });

  it('returns [] when pointed at an empty/absent agents dir (env override)', () => {
    const prev = process.env.CAGENTS_AGENTS_DIR;
    process.env.CAGENTS_AGENTS_DIR = join(process.cwd(), 'does-not-exist-xyz');
    try {
      // Re-require in a fresh module registry so the env override is read.
      const freshRequire = createRequire(import.meta.url);
      delete freshRequire.cache[MOD];
      const fresh = freshRequire(MOD);
      expect(fresh.run()).toEqual([]);
    } finally {
      if (prev == null) delete process.env.CAGENTS_AGENTS_DIR;
      else process.env.CAGENTS_AGENTS_DIR = prev;
    }
  });
});
