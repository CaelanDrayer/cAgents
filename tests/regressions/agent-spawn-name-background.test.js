import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Regression test for ENG-OBS-7 (CONFIRMED, critical) — `name:` silently
 * overrides `run_in_background: false` on the `Agent` tool.
 *
 * Bug: passing `name` to the Agent tool promotes the spawn to a named background
 *      teammate, which SILENTLY discards an explicit `run_in_background: false`.
 *      No error, no warning. The call returns immediately, the caller believes it
 *      holds a completed result, yields, and the delegation evaporates. The parent
 *      then re-does the work inline and its context balloons.
 * Root cause (doctrinal): CLAUDE.md § Task Lifecycle encourages naming spawns for
 *      per-subagent visibility, while `.claude/rules/core/delegation.md`
 *      § Synchronous Spawning mandates `run_in_background: false`. An agent that
 *      complies with BOTH rules as written gets a silently-backgrounded child.
 * Reproduced on Claude Code 2.1.221: two controller spawns at 21:22:08 and
 *      21:22:33 passed BOTH `run_in_background: False` AND `name:` and both ran in
 *      the background anyway; the re-spawns that omitted `name` DID block.
 * Test added: this file. It lints cAgents' own instruction surfaces
 *      (`.claude/skills/**`, `agents/**`, `.claude/rules/**`, `CLAUDE.md`,
 *      `docs/**`) for any `Agent(...)` invocation that carries BOTH a `name`
 *      argument and a falsy `run_in_background` — a combination that cannot do
 *      what it appears to say, so shipping it as guidance teaches the trap.
 * Violations found and fixed when this test was added (3, all the same block
 *      template copied across three files — each showed `run_in_background: false`
 *      and `name: "w{K}-task-{N}-{CONTROLLER_TYPE}"` in the same literal
 *      `Agent({...})` block, so anyone copy-pasting the block got a silently
 *      backgrounded wave subagent):
 *        .claude/skills/team/reference/spawn-brief-schema.md:66-67
 *        .claude/skills/team/reference/teammate-spawning-template.md:28-29
 *        .claude/skills/team/reference/wave-execution-detail.md:96-97
 *      Fix: the `name` / `team_name` lines were removed from those DEFAULT-path
 *      blocks (they were already annotated "omit on the default path") and
 *      replaced with a comment stating the precedence.
 * Could have caught by: exactly this lint. The three blocks had carried the
 *      forbidden combination since the concurrent-Agent wave model landed.
 *
 * DESIGN NOTES
 * - Detection is TEXTUAL, not AST-based: the scanned files are prose/markdown
 *   containing example invocations in several spellings (`Agent({ ... })` across
 *   many lines, one-line `Agent({ name, run_in_background: false })`, JS-ish `//`
 *   and YAML-ish `#` comments, `false` and `False`). The matcher tolerates all of
 *   those and is anchored on object-literal syntax so that ordinary prose
 *   mentioning the word "name" near a spawn does not trip it.
 * - ADVISORY-ONLY PHILOSOPHY: this file contains NO token gate, NO size
 *   threshold, NO count ceiling and NO abort. It asserts one thing only — that
 *   the repo never *instructs* an agent to use an impossible argument
 *   combination. Nothing here blocks on anything being "too big".
 * - This test file itself is excluded from the repo scan: its fixtures contain
 *   the forbidden combination on purpose.
 * - Explanatory text ABOUT this trap must NOT fail the test. Two narrow escape
 *   hatches exist, in preference order:
 *     1. `lint-allow: agent-name-background` in a comment near the example —
 *        the explicit, precise opt-out (see SUPPRESSION_MARKER).
 *     2. An anti-pattern CUE in the lead-in lines or in the matched lines
 *        themselves (see ANTI_PATTERN_CUES) — so doctrine files can write
 *        "never combine these" counter-examples without knowing about marker 1.
 *   The cue list is deliberately narrow. It intentionally EXCLUDES words that
 *   appear in legitimate spawn guidance ("omit", "only", "default",
 *   "experimental"); including any of those would have masked the three real
 *   violations above, which is asserted directly in the unit tests below.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..');

/** Instruction surfaces where cAgents tells agents how to spawn. */
const SCAN_DIRS = ['.claude/skills', '.claude/rules', 'agents', 'docs'];
const SCAN_FILES = ['CLAUDE.md'];

/** This file carries the forbidden combination in fixtures on purpose. */
const SELF = join('tests', 'regressions', 'agent-spawn-name-background.test.js');

// --- Matcher primitives -----------------------------------------------------

/** A line whose leading token is a `name` key: `name:`, `"name":`, `- name =`. */
const NAME_KEY_LINE = /^\s*(?:[-*+>]\s*)*["'`]?name["'`]?\s*[:=]/;
/**
 * A `name` key in object-literal position: `{ name,` / `{ name:` / `, name:` /
 * `, "name" =`. Requires an opening brace or comma immediately before, so prose
 * like "SendMessage({to: name})" or "give it a `name` for tracking" never matches.
 */
const NAME_KEY_INLINE = /[{,]\s*["'`]?name["'`]?\s*(?:[:=]|[,}])/;
/** `run_in_background: false` in every spelling seen in the repo (incl. `False`). */
const RIB_FALSY = /\brun_in_background["'`]?\s*[:=]\s*["'`]?\s*(?:false|no|off|0)\b/i;

const AGENT_CALL = /\bAgent\s*\(/;
/** A line that is nothing but closing punctuation — ends a multi-line call. */
const CLOSER_LINE = /^\s*[)}\]]+[,;]?\s*$/;
const FENCE_LINE = /^\s*```/;

const SUPPRESSION_MARKER = /lint-allow:\s*agent-name-background/i;
const ANTI_PATTERN_CUES =
  /(never|do not|don't|doesn't|must not|cannot|can't|\bwrong\b|❌|anti-?pattern|counter-?example|incorrect|broken|\btrap\b|silently|eng-obs-7|forbidden|\bavoid\b|\bbug\b)/i;

/** Hard cap so an unbalanced example can never swallow a whole file. */
const MAX_CALL_LINES = 60;
/** Lead-in lines inspected for a disclaimer before the call. */
const LOOKBACK_LINES = 5;

function hasNameArg(line) {
  return NAME_KEY_LINE.test(line) || NAME_KEY_INLINE.test(line);
}

/**
 * Find every `Agent(...)` invocation that carries BOTH a `name` argument and a
 * falsy `run_in_background`. Pure function over text — no I/O, no network.
 */
export function findNameWithBlockingSpawn(text) {
  const lines = text.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    if (!AGENT_CALL.test(lines[i])) continue;

    // Determine the call region. A call that opens and closes on one line is
    // "inline"; otherwise walk forward to the first closing-punctuation line or
    // code-fence boundary, capped at MAX_CALL_LINES.
    const tail = lines[i].slice(lines[i].search(AGENT_CALL));
    const inline = /\bAgent\s*\([^()]*\)/.test(tail);
    let end = i;
    if (!inline) {
      for (let j = i + 1; j < Math.min(lines.length, i + MAX_CALL_LINES); j++) {
        end = j;
        if (CLOSER_LINE.test(lines[j]) || FENCE_LINE.test(lines[j])) break;
      }
    }

    const region = lines.slice(i, end + 1);
    const nameLines = [];
    const ribLines = [];
    region.forEach((line, k) => {
      if (hasNameArg(line)) nameLines.push(i + k + 1);
      if (RIB_FALSY.test(line)) ribLines.push(i + k + 1);
    });
    if (nameLines.length === 0 || ribLines.length === 0) continue;

    const lookback = lines.slice(Math.max(0, i - LOOKBACK_LINES), i);

    // Escape hatch 1: explicit suppression marker anywhere in lead-in or region.
    if (SUPPRESSION_MARKER.test([...lookback, ...region].join('\n'))) continue;

    // Escape hatch 2: the example is introduced or annotated as an anti-pattern.
    const matchedLines = [...new Set([...nameLines, ...ribLines])].map((n) => lines[n - 1]);
    if (ANTI_PATTERN_CUES.test([...lookback, ...matchedLines].join('\n'))) continue;

    violations.push({ line: i + 1, nameLines, ribLines });
  }
  return violations;
}

function collectMarkdown(dir, acc) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '_archive') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectMarkdown(full, acc);
    else if (entry.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function scannedFiles() {
  const files = [];
  for (const d of SCAN_DIRS) {
    const p = join(REPO_ROOT, d);
    if (existsSync(p)) collectMarkdown(p, files);
  }
  for (const f of SCAN_FILES) {
    const p = join(REPO_ROOT, f);
    if (existsSync(p)) files.push(p);
  }
  return files.filter((f) => !relative(REPO_ROOT, f).split(sep).join('/').endsWith(SELF.split(sep).join('/')));
}

// --- Unit tests: the matcher must be red-capable and prose-tolerant ----------

describe('findNameWithBlockingSpawn (matcher)', () => {
  it('flags a multi-line Agent call carrying both name and run_in_background: false', () => {
    const bad = [
      'Agent({',
      '  subagent_type: "cagents:tech-lead",',
      '  run_in_background: false,',
      '  name: "w1-task-1-tech-lead",',
      '  prompt: "..."',
      '})',
    ].join('\n');
    expect(findNameWithBlockingSpawn(bad)).toHaveLength(1);
  });

  it('flags the exact historical block that shipped in three team reference files', () => {
    // Verbatim shape of the ENG-OBS-7 violations. This asserts the cue list is
    // not broad enough to exempt a real violation: the annotation on these lines
    // ("EXPERIMENTAL named-teammate path only - omit on the default path")
    // must NOT read as an anti-pattern disclaimer.
    const historical = [
      'The lead spawns each subagent with this ~80-token prompt (`run_in_background: false` on the default path):',
      '',
      '```javascript',
      'Agent({',
      '  subagent_type: "cagents:{CONTROLLER_TYPE}",',
      '  run_in_background: false,                    // DEFAULT: synchronous, lead collects results together',
      '  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",     // EXPERIMENTAL named-teammate path only - omit on the default path',
      '  team_name: "{team_name}",                    // EXPERIMENTAL only - accepted-but-ignored (teams are implicit)',
      '  description: "Wave {K}",',
      '})',
      '```',
    ].join('\n');
    expect(findNameWithBlockingSpawn(historical)).toHaveLength(1);
  });

  it('flags the one-line object-literal spelling', () => {
    expect(findNameWithBlockingSpawn('Agent({ name: "x", run_in_background: false })')).toHaveLength(1);
  });

  it('flags the shorthand spelling `Agent({ name, run_in_background: false })`', () => {
    expect(findNameWithBlockingSpawn('Use `Agent({ name, run_in_background: false })` here.')).toHaveLength(1);
  });

  it('flags capitalised `False` (the spelling in the reproduced transcript)', () => {
    const bad = 'Agent({ subagent_type: "cagents:architect", run_in_background: False, name: "wi01-spec" })';
    expect(findNameWithBlockingSpawn(bad)).toHaveLength(1);
  });

  it('flags YAML-ish spellings with `#` comments', () => {
    const bad = ['Agent({', '  run_in_background: false,   # blocking', '  name: "worker",             # tracked', '})'].join('\n');
    expect(findNameWithBlockingSpawn(bad)).toHaveLength(1);
  });

  it('allows a named teammate spawned with run_in_background: true', () => {
    expect(findNameWithBlockingSpawn('Agent({ name, run_in_background: true })')).toHaveLength(0);
  });

  it('allows an unnamed synchronous spawn', () => {
    const good = ['Agent({', '  subagent_type: "cagents:tech-lead",', '  run_in_background: false,', '})'].join('\n');
    expect(findNameWithBlockingSpawn(good)).toHaveLength(0);
  });

  it('does not trip on prose mentioning "name" near a synchronous spawn', () => {
    const prose =
      'For each wave the lead issues concurrent `Agent()` calls with `run_in_background: false`; ' +
      'coordinate via `SendMessage({to: name})` and give each task a `name` for visibility.';
    expect(findNameWithBlockingSpawn(prose)).toHaveLength(0);
  });

  it('does not trip on a TaskCreate `name:` field that follows a closed Agent call', () => {
    const text = [
      'Agent({',
      '  subagent_type: "cagents:tech-lead",',
      '  run_in_background: false,',
      '})',
      '',
      'implementation_tasks:',
      '  - name: "[backend-developer] Implement endpoints"',
    ].join('\n');
    expect(findNameWithBlockingSpawn(text)).toHaveLength(0);
  });

  it('exempts a counter-example introduced by anti-pattern prose', () => {
    const doc = [
      'Never combine the two — `name` implies background and silently discards the blocking request:',
      '',
      'Agent({ name: "worker", run_in_background: false })',
    ].join('\n');
    expect(findNameWithBlockingSpawn(doc)).toHaveLength(0);
  });

  it('exempts a counter-example annotated inline on the matched lines', () => {
    const doc = [
      'Agent({',
      '  name: "worker",             // WRONG: silently overrides the line below',
      '  run_in_background: false,',
      '})',
    ].join('\n');
    expect(findNameWithBlockingSpawn(doc)).toHaveLength(0);
  });

  it('exempts an example carrying the explicit suppression marker', () => {
    const doc = [
      '<!-- lint-allow: agent-name-background — illustrating the ENG-OBS-7 combination -->',
      'Agent({ name: "worker", run_in_background: false })',
    ].join('\n');
    expect(findNameWithBlockingSpawn(doc)).toHaveLength(0);
  });

  it('never lets an unbalanced example swallow more than MAX_CALL_LINES', () => {
    const text = ['Agent({', '  subagent_type: "x",', ...Array(200).fill('  filler: 1,')].join('\n') + '\n  name: "late",\n  run_in_background: false,';
    expect(findNameWithBlockingSpawn(text)).toHaveLength(0);
  });
});

// --- Integration: the repo's own instruction surfaces ------------------------

describe('ENG-OBS-7: no cAgents instruction surface teaches `name` + blocking spawn', () => {
  const files = scannedFiles();

  it('scans a non-trivial set of markdown instruction surfaces', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('contains no Agent invocation carrying both `name` and a falsy `run_in_background`', () => {
    const offenders = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      for (const v of findNameWithBlockingSpawn(readFileSync(file, 'utf8'))) {
        offenders.push(`${rel}:${v.line} (name at line ${v.nameLines.join(',')}, run_in_background at line ${v.ribLines.join(',')})`);
      }
    }
    expect(
      offenders,
      offenders.length === 0
        ? ''
        : [
            'ENG-OBS-7: these Agent invocations pass BOTH `name` and a falsy `run_in_background`.',
            'That combination cannot do what it appears to say: `name` promotes the spawn to a',
            'named background teammate and SILENTLY discards `run_in_background: false`, so the',
            'caller never collects the result and the delegation evaporates.',
            '',
            'Fix one of these ways:',
            '  - work you must collect in-turn: OMIT `name`, keep `run_in_background: false`',
            '  - a genuinely resumable named teammate: keep `name`, use `run_in_background: true`,',
            '    and collect it explicitly via SendMessage',
            '  - deliberately illustrating the trap: add `lint-allow: agent-name-background`',
            '    in a comment on or just above the example',
            '',
            offenders.map((o) => `  - ${o}`).join('\n'),
          ].join('\n')
    ).toEqual([]);
  });
});
