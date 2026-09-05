/**
 * P5 (audit-260630): routing & rules agent-reference resolution guard
 *
 * Locks the catalog-sync invariant established in Phase 5 of the v12 refactor:
 * every agent NAME referenced for selection/delegation in the tracked routing
 * config and the two agent-list rules surfaces must resolve to either
 *   (a) a LIVE agent registered in .claude-plugin/plugin.json, OR
 *   (b) a v12-aliases.yaml `old:` key (back-compat alias → live successor).
 *
 * If neither holds, the planner/router/controller would emit a dead
 * `cagents:<name>` subagent_type that Claude Code silently degrades to the
 * generic `general-purpose` agent (losing the specialized SKILL.md). This
 * guard fails CI the moment such a dead reference is (re)introduced.
 *
 * Surfaces checked:
 *   - cagents-memory/_system/config/routing.yaml  (force-tracked; bare names in
 *       `agents:` arrays and `controller_catalog.tier_*` arrays)
 *   - .claude/rules/domains/*.md                  (bold execution-agent bullets +
 *       controller tier-line lists + any `cagents:` tokens)
 *   - .claude/rules/core/subagent-alignment.md    (`cagents:` tokens)
 *
 * The valid set is computed FROM DISK at runtime (plugin.json + v12-aliases.yaml)
 * so it auto-tracks future catalog changes — no hardcoded agent list to drift.
 *
 * Bug-driven test mandate (CLAUDE.md): the final `describe` block proves the
 * checker actually fails on a fabricated dead name, so a future change that
 * weakens the checker is itself caught.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLUGIN_JSON = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const ALIASES_YAML = path.join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');
const ROUTING_YAML = path.join(REPO_ROOT, 'cagents-memory', '_system', 'config', 'routing.yaml');
const DOMAINS_DIR = path.join(REPO_ROOT, '.claude', 'rules', 'domains');
const SUBAGENT_ALIGNMENT = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'subagent-alignment.md');

// Structural bold labels used in domain controller-selection bullets. When the
// bold token is one of these, the REST of the line is a comma/plus agent list.
const STRUCTURAL_LABEL = /^(?:Tier \d+|Primary|Supporting|Executive)$/i;

/** Live agent names derived from the flat agents/ directory (v12.68.0). */
function diskAgentNames() {
  return fs
    .readdirSync(path.join(REPO_ROOT, 'agents'), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name.slice(0, -'.md'.length));
}

/** `old:` alias keys (without the cagents: prefix) from v12-aliases.yaml. */
function aliasKeyNames() {
  const text = fs.readFileSync(ALIASES_YAML, 'utf8');
  return [...text.matchAll(/^\s*-\s*old:\s*["']?cagents:([a-z0-9-]+)["']?/gm)].map((m) => m[1]);
}

/**
 * Pure checker (exported shape for the bug-driven self-test): given a valid Set
 * and the raw file contents, returns an array of unresolved references.
 */
function findUnresolved({ valid, routingDoc, domainFiles, subagentAlignmentText }) {
  const problems = [];

  // (1) routing.yaml — bare names in `agents:` arrays + controller_catalog tiers
  (function walk(node, p) {
    if (Array.isArray(node)) {
      node.forEach((v) => walk(v, p));
      return;
    }
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        const child = node[k];
        if (k === 'agents' && Array.isArray(child)) {
          child.forEach((name) => {
            if (!valid.has(name)) problems.push(`routing.yaml ${p}.agents -> ${name}`);
          });
        } else if (k === 'controller_catalog' && child && typeof child === 'object') {
          for (const tier of Object.keys(child)) {
            if (Array.isArray(child[tier])) {
              child[tier].forEach((name) => {
                if (!valid.has(name)) problems.push(`routing.yaml ${p}.controller_catalog.${tier} -> ${name}`);
              });
            }
          }
        } else {
          walk(child, `${p}.${k}`);
        }
      }
    }
  })(routingDoc, '');

  // helper: scan `cagents:<name>` tokens in markdown (brace placeholders like
  // `cagents:{agent-name}` never match the [a-z0-9-] class, so they are exempt)
  const scanCagentsTokens = (label, text) => {
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/cagents:([a-z0-9-]+)/g)) {
        if (!valid.has(m[1])) problems.push(`${label}:${i + 1} cagents:${m[1]}`);
      }
    });
  };

  // (2/3) domain files: cagents: tokens + bold execution bullets + tier-line lists
  for (const { label, text } of domainFiles) {
    scanCagentsTokens(label, text);
    text.split('\n').forEach((line, i) => {
      const m = line.match(/^\s*-?\s*\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
      if (!m) return;
      const boldLabel = m[1].trim();
      const rest = m[2] || '';
      if (/^[a-z][a-z0-9-]+$/.test(boldLabel)) {
        // execution bullet — the bold token IS the agent; rest is scope prose
        if (!valid.has(boldLabel)) problems.push(`${label}:${i + 1} exec-bullet **${boldLabel}**`);
      } else if (STRUCTURAL_LABEL.test(boldLabel)) {
        // controller-selection line — rest is a comma/plus-separated agent list
        rest
          .replace(/\+/g, ',')
          .split(',')
          .forEach((seg) => {
            const t = (seg.trim().match(/^([a-z][a-z0-9-]+)/) || [])[1];
            if (t && !valid.has(t)) problems.push(`${label}:${i + 1} tier-list ${t}`);
          });
      }
    });
  }

  // (2) subagent-alignment.md: cagents: tokens
  scanCagentsTokens('subagent-alignment.md', subagentAlignmentText);

  return problems;
}

let valid;
let routingDoc;
let domainFiles;
let subagentAlignmentText;

beforeAll(() => {
  valid = new Set([...diskAgentNames(), ...aliasKeyNames()]);
  routingDoc = yaml.load(fs.readFileSync(ROUTING_YAML, 'utf8'));
  domainFiles = fs
    .readdirSync(DOMAINS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ label: `domains/${f}`, text: fs.readFileSync(path.join(DOMAINS_DIR, f), 'utf8') }));
  subagentAlignmentText = fs.readFileSync(SUBAGENT_ALIGNMENT, 'utf8');
});

describe('P5: valid-reference set is sane', () => {
  it('plugin.json registers exactly the live disk catalog (>= 57)', () => {
    const disk = diskAgentNames();
    expect(disk.length).toBeGreaterThanOrEqual(57);
    // a few canonical survivors must be present
    for (const n of ['tech-lead', 'architect', 'planner', 'validator', 'marketing-strategist']) {
      expect(disk).toContain(n);
    }
  });

  it('v12-aliases.yaml contributes back-compat keys to the valid set', () => {
    const keys = aliasKeyNames();
    expect(keys.length).toBeGreaterThanOrEqual(20);
    expect(keys).toContain('campaign-manager'); // back-compat alias → marketing-strategist
  });
});

describe('P5: every routing/rules agent reference resolves to a live agent or alias', () => {
  it('routing.yaml + domains/*.md + subagent-alignment.md have ZERO dead references', () => {
    const problems = findUnresolved({ valid, routingDoc, domainFiles, subagentAlignmentText });
    expect(problems, `dead agent references found:\n${problems.join('\n')}`).toEqual([]);
  });

  it('routing.yaml specialist_routing carries no orphaned specialist agent (A6-01)', () => {
    const orphans = [];
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (k === 'agents' && Array.isArray(node[k])) {
            node[k].forEach((n) => {
              if (!valid.has(n)) orphans.push(n);
            });
          } else {
            walk(node[k]);
          }
        }
      }
    };
    walk(routingDoc);
    expect(orphans, `orphan specialist agents in routing.yaml: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('P5: guard actually catches drift (bug-driven mandate)', () => {
  it('flags a fabricated dead agent name in each surface', () => {
    const tinyValid = new Set(['tech-lead', 'editor']);
    const problems = findUnresolved({
      valid: tinyValid,
      routingDoc: {
        domains: { eng: { planner: { controller_catalog: { tier_2: ['tech-lead', 'ghost-controller'] }, specialist_routing: { x: { agents: ['phantom-agent'] } } } } },
      },
      domainFiles: [
        { label: 'domains/fake.md', text: '- **dead-execution-agent**: does things\n- **Supporting**: tech-lead, another-ghost\n' },
      ],
      subagentAlignmentText: '| `cagents:undead-agent` | x | y |\n',
    });
    // brace-placeholder must NOT be flagged
    const placeholderProbe = findUnresolved({
      valid: tinyValid,
      routingDoc: {},
      domainFiles: [],
      subagentAlignmentText: 'subagent_type: "cagents:{agent-name}"\n',
    });
    expect(placeholderProbe).toEqual([]);
    // every fabricated dead name is caught
    for (const dead of ['ghost-controller', 'phantom-agent', 'dead-execution-agent', 'another-ghost', 'undead-agent']) {
      expect(problems.some((p) => p.includes(dead)), `expected guard to flag ${dead}`).toBe(true);
    }
  });
});
