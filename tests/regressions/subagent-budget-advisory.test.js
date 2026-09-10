import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

/**
 * WI-10 regression (session act_subagent-token-budget_260909_001).
 *
 * THE DOCTRINE THIS LOCKS
 * -----------------------
 * The per-subagent context budget (~100k input tokens, outer bound ~200k) is an
 * AIM. By explicit user constraint the whole program is ADVISORY-ONLY: no hard
 * kill, no blocking token gate, no CI threshold, no abort. Nothing measures the
 * aim and nothing acts on it; a spawning agent holds itself to it.
 *
 * THE BUG THIS PREVENTS
 * ---------------------
 * There is no failure in the tree today. The failure mode is a FUTURE one, and
 * it is the most likely thing that will happen to this work: a well-meaning
 * engineer reads "aim for ~100k input tokens", concludes that an unmeasured aim
 * is a half-finished feature, and helpfully converts it into a gate — a hook
 * that denies a spawn over a threshold, a CI check, a number in a conditional.
 * Every such edit is out of contract. Prose alone cannot stop it, because the
 * engineer doing it believes they are completing the work rather than reverting
 * it. This file is the mechanical lock that makes the reversal fail CI.
 *
 * RELATIONSHIP TO THE EXISTING UNIT TESTS (deliberate, not redundant)
 * ------------------------------------------------------------------
 * Two unit-test files already assert pieces of this at the level of a single
 * hook's behavior:
 *   - tests/hooks/spawn-footprint.test.js       "NIS-1" — name-based tripwires
 *     in that one hook's stripped source (threshold / permissionDecision /
 *     MAX_*TOKEN / process.exit).
 *   - tests/hooks/role-manifest-injector.test.js — the stanza literal's
 *     phrasing and the handler's output shape for a probe table of agent types.
 *
 * This file is a CROSS-SURFACE DOCTRINE test, the same species as
 * size-rule-doctrine.test.js: it asserts one invariant across hooks + rules +
 * playbook + settings.json as a single contract, so deleting any one unit test
 * does not quietly delete the doctrine. Where it touches the same ground it
 * does so from a different angle:
 *   - group 1 adds a STRUCTURAL check NIS-1 cannot do: a comparison operator
 *     against a token-count constant. NIS-1's `MAX_[A-Z_]*TOKEN` guard is
 *     name-based and would sail straight past `if (inputUncached > 100000)`.
 *   - group 2 checks EVERY ASSEMBLED BUNDLE (pointer + both stanzas) over
 *     `Object.keys(ROLE_POINTERS)` rather than the stanza literal over a probe
 *     table, so enforcement phrasing smuggled into a ROLE POINTER, or a new
 *     role key added without a probe, is caught.
 * The single line that does mirror NIS-1 (the /\bthreshold\b/i check) is
 * mirrored ON PURPOSE: a doctrine lock that depends on another file continuing
 * to exist is not a lock.
 *
 * PROVEN TO BITE (acceptance criterion, not a formality)
 * -----------------------------------------------------
 * Green baseline: 28 passed (28). Then two scratch mutations, each applied,
 * observed RED, and reverted:
 *
 *   (a) Deleted the no-gate disclaimer sentence from the playbook's aim
 *       section. Result: 1 failed | 27 passed —
 *       "3b. the aim section must carry an explicit no-gate disclaimer".
 *       Fails alone, so the signal names the defect precisely.
 *
 *   (b) Appended to a hook (NOT spawn-footprint.cjs — that file is a
 *       contractual tripwire and was never touched):
 *           const MAX_SUBAGENT_INPUT_TOKENS = 100000;
 *           const tokenCount = (usage && usage.input_tokens) || 0;
 *           if (tokenCount > MAX_SUBAGENT_INPUT_TOKENS) {
 *             return { hookSpecificOutput: { permissionDecision: 'deny' } };
 *           }
 *       Result: 3 failed | 25 passed — 5b (structural: the comparison, at
 *       ".claude/hooks/subagent-tracker.cjs:758", a line number verified
 *       against `grep -n` on the raw file), 5c (the constant name AND the
 *       hardcoded figure), 5d (that hook now both denies and gates on tokens).
 *
 * Revert was verified by `sha256sum -c` against a pre-mutation baseline, NOT by
 * `git diff --stat`: at the time of writing both mutated files already carried
 * unrelated uncommitted work from this session, so a clean `git diff` was never
 * the correct success signal. The checksums matched byte-for-byte and a
 * `grep -rn` for the scratch identifiers returned zero hits outside this file.
 *
 * One further red was observed that nobody staged: while mutation (a) was
 * applied, 5c independently went red on a DIFFERENT hook, catching a live
 * `if (tokenCount > 100000) return { permissionDecision: 'deny' }` that a
 * concurrent agent had just written. That is this test doing its actual job
 * against an edit it had no foreknowledge of. It also exposed a real hole in
 * the detector — see the TOKEN_VOCAB note below.
 */

const ROOT = process.cwd();
const HOOKS_DIR = join(ROOT, '.claude', 'hooks');
const SETTINGS = join(ROOT, '.claude', 'settings.json');
const SPAWN_FOOTPRINT = join(HOOKS_DIR, 'spawn-footprint.cjs');
const INJECTOR = join(HOOKS_DIR, 'role-manifest-injector.cjs');
const PLAYBOOK = '.claude/rules/playbooks/pat-context-budget-tiers.md';
const DELEGATION = '.claude/rules/core/delegation.md';

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Collapse every whitespace run to a single space.
 *
 * LOAD-BEARING. Both doctrine sentences are HARD-WRAPPED in their source files
 * across two or three lines. A naive single-line `grep -F` / `toContain` on raw
 * bytes returns false for a sentence that is present and correct — a FALSE RED
 * that has already cost two agents in this session. Normalize first, always.
 */
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * Slice a markdown section from its heading to the next boundary. The search
 * for the stop boundary starts after the heading line so a heading cannot
 * terminate its own section. Same shape as size-rule-doctrine.test.js.
 */
function section(content, startRe, stopRe) {
  const start = content.search(startRe);
  if (start === -1) return '';
  const rest = content.slice(start);
  const firstLineEnd = rest.indexOf('\n');
  if (firstLineEnd === -1) return rest;
  const stop = rest.slice(firstLineEnd).search(stopRe);
  return stop === -1 ? rest : rest.slice(0, firstLineEnd + stop);
}

/**
 * Blank out comments and string/template bodies so only EXECUTABLE source is
 * examined. Header prose deliberately names the things it forbids ("There is
 * deliberately NO threshold...") and the budget stanza is a template literal
 * that legitimately says "about 100k input tokens" — scanning raw bytes would
 * flag the doctrine itself. Order: block comments, then template literals,
 * then quoted strings, then line comments.
 *
 * Each neutralized region is replaced with SPACES, keeping its newlines, so the
 * result is the same length and the same line count as the input. That is what
 * lets a finding report a line number that matches the real file: an earlier
 * revision collapsed block comments to a single space and reported
 * `subagent-tracker.cjs:668` for a gate that actually sat ~20 lines further
 * down, which is worse than no line number at all.
 */
const blank = (m) => m.replace(/[^\n]/g, ' ');

function stripJs(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, blank)
    .replace(/"(?:\\.|[^"\\\n])*"/g, blank)
    .replace(/'(?:\\.|[^'\\\n])*'/g, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank);
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

// --- the token-gate detector ------------------------------------------------
//
// Calibrated empirically against all 34 hooks so it has ZERO false positives on
// the tree as it stands. The near-misses it must NOT fire on, all real:
//   - bash-guard-evaluator.cjs  — a shell LEXER whose `tokens` are argv words,
//     compared all over the place, plus `MAX_LEN = 20000` (an input length cap).
//   - secret-detection.cjs      — `tokenStart` / `tokenEnd` CHARACTER OFFSETS
//     compared against each other, plus `512 * 1024` byte caps.
//   - validator-evidence-recheck.cjs — `tokens` are whitespace-split WORDS,
//     filtered with `t.length >= 4`.
//   - hook-utils / team-stop / verify-completion — `1000`, `60000`, `3600000`,
//     `1800000` MILLISECOND durations and a `guard < 5000` loop bound.
//   - spawn-footprint.cjs       — `task.token_count.input === fp.token_count.input`,
//     an idempotence check between two FIELDS with no constant on either side.
// Hence: bare "token" is not enough (that is what catches lexers and offsets),
// and a big number is not enough (that is what catches milliseconds). A finding
// needs LLM-token vocabulary near the comparison AND something constant-ish as
// an operand.

/**
 * LLM-token vocabulary. Deliberately excludes the BARE word "token" — that is
 * what keeps shell-lexer tokens, character offsets, and split words out.
 *
 * The camelCase half is not symmetry for its own sake. An earlier revision of
 * this detector matched only snake_case (`token_count`) and was demonstrated to
 * MISS `if (tokenCount > 100000)` — the single most natural spelling of the
 * regression. It survived only because the separate budget-figure check
 * happened to catch the literal `100000`; `tokenCount > 150000` would have
 * walked past both checks untouched. Keep both conventions.
 */
const TOKEN_VOCAB =
  /\btokens?_(?:count|budget|limit|threshold|cap|max|ceiling|quota|used|total|usage)\b|\b(?:input|output|total|context)_tokens\b|\bcache_(?:read|creation)_input_tokens\b|\b(?:total|input|output|context|subagent|spawn)Tokens\b|\btokens?(?:Count|Used|Total|Budget|Limit|Threshold|Cap|Ceiling|Quota|Size|Usage)\b|\btoken[ _-]?(?:budget|limit|threshold|cap|ceiling|quota)\b|\bcontext[ _-]?budget\b/i;

/** The token-limit constant naming family, in any case convention. */
const LIMIT_NAME =
  /\b(?:MAX|MIN|LIMIT|THRESHOLD|BUDGET|CAP|CEILING|QUOTA)_[A-Z0-9_]*TOKENS?\b|\bTOKENS?_(?:MAX|MIN|LIMIT|THRESHOLD|BUDGET|CAP|CEILING|QUOTA)\b|\b(?:max|min|limit|threshold|budget|cap|ceiling|quota)[A-Za-z0-9]*Tokens\b|\btokens?(?:Max|Min|Limit|Threshold|Budget|Cap|Ceiling|Quota)\b/;

/** Token-scale literal: >= 1000. Token counts are counted in thousands. */
const BIG_NUM = /\b\d[\d_]{3,}\b/;

/** Comparison operators that can form a pass/fail gate. */
const CMP_SOURCE = '(?:>=|<=|>|<|===|!==|==|!=)';

const VOCAB_WINDOW = 90;
const OPERAND_WINDOW = 60;

/**
 * Find comparisons that gate on a token count. Returns [{ where, snippet }].
 */
function findTokenGates(rel, rawSrc) {
  const code = stripJs(rawSrc);
  const found = [];
  const cmp = new RegExp(CMP_SOURCE, 'g');
  let m;
  while ((m = cmp.exec(code)) !== null) {
    const vocab = code.slice(Math.max(0, m.index - VOCAB_WINDOW), m.index + VOCAB_WINDOW);
    if (!TOKEN_VOCAB.test(vocab)) continue;
    const operands = code.slice(Math.max(0, m.index - OPERAND_WINDOW), m.index + OPERAND_WINDOW);
    if (!BIG_NUM.test(operands) && !LIMIT_NAME.test(operands)) continue;
    found.push({ where: `${rel}:${lineOf(code, m.index)}`, snippet: norm(operands) });
  }
  return found;
}

/** The two doctrine figures as code constants. Prose may say them; code may not. */
const BUDGET_FIGURE_LITERAL = /\b(?:100_?000|200_?000)\b|\b[12]e5\b/;

const hookFiles = readdirSync(HOOKS_DIR)
  .filter((f) => f.endsWith('.cjs'))
  .sort();

/** Hook base names registered in settings.json, via the run-hook.cjs launcher. */
function registeredHookNames() {
  const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
  const names = new Set();
  for (const matchers of Object.values(settings.hooks || {})) {
    for (const matcher of matchers || []) {
      for (const hook of matcher.hooks || []) {
        const m = /run-hook\.cjs['"\s]+([a-z0-9-]+)/.exec(hook.command || '');
        if (m) names.add(m[1]);
      }
    }
  }
  return [...names].sort();
}

// Import the injector's real exports. CAGENTS_DISPATCH_IMPORT suppresses
// createHook() registration so require() does not try to read stdin.
//
// The flag is RESTORED immediately after the require. process.env is shared by
// every test file that vitest runs in the same worker process, so setting it and
// walking away would silently change how a later file's hooks behave — the kind
// of cross-file contamination that presents as an unrelated flake.
const require_ = createRequire(import.meta.url);
const priorDispatchFlag = process.env.CAGENTS_DISPATCH_IMPORT;
process.env.CAGENTS_DISPATCH_IMPORT = '1';
const { buildRoleBundle, handler, ROLE_POINTERS, BUDGET_AIM_STANZA } = require_(INJECTOR);
if (priorDispatchFlag === undefined) delete process.env.CAGENTS_DISPATCH_IMPORT;
else process.env.CAGENTS_DISPATCH_IMPORT = priorDispatchFlag;

/** Phrasings that would convert the aim into a promise of enforcement. */
const ENFORCEMENT_PHRASES = ['must not exceed', 'hard limit', 'will be killed', 'aborted'];

describe('WI-10: the per-subagent context budget is ADVISORY — no gate, no threshold, no abort', () => {
  // -------------------------------------------------------------------------
  // 1. spawn-footprint.cjs — the instrument stays an instrument.
  // -------------------------------------------------------------------------
  describe('1. spawn-footprint.cjs records numbers and gates nothing', () => {
    const raw = readFileSync(SPAWN_FOOTPRINT, 'utf8');

    it('1a. the header still states the no-threshold contract in its own words', () => {
      // The positive half of the lock. Adding a gate now requires DELETING a
      // sentence that forbids it, which is a much louder edit in review than
      // slipping a comparison past an absence-only assertion.
      // Strip the JSDoc ` * ` line markers BEFORE normalizing: the sentence is
      // hard-wrapped inside a block comment, so whitespace normalization alone
      // leaves "comparison in * this file" — the same false-red shape as the
      // hard-wrapped markdown below, one layer deeper.
      const header = norm(
        raw.slice(0, raw.indexOf('---------')).replace(/^\s*\*\s?/gm, ' '),
      );
      expect(header).toContain(
        'There is deliberately NO threshold, budget, warning level, or comparison in this file.',
      );
      expect(header).toContain('It NEVER blocks, denies, fails a build, gates a merge');
    });

    it('1b. executable source names no threshold', () => {
      // Mirrors NIS-1 on purpose: see the header note. A doctrine lock that
      // depends on another file continuing to exist is not a lock.
      expect(stripJs(raw)).not.toMatch(/\bthreshold\b/i);
    });

    it('1c. executable source compares no token count against a constant', () => {
      // The structural check NIS-1 cannot do. NIS-1 forbids the NAME
      // `MAX_*TOKEN`; it would pass `if (inputUncached > 100000)` unchanged.
      const gates = findTokenGates('.claude/hooks/spawn-footprint.cjs', raw);
      expect(
        gates,
        `spawn-footprint.cjs must contain no token-count comparison:\n${gates
          .map((g) => `  ${g.where}  ${g.snippet}`)
          .join('\n')}`,
      ).toEqual([]);
    });

    it('1d. executable source declares no token-limit constant and no budget figure', () => {
      const code = stripJs(raw);
      expect(code).not.toMatch(LIMIT_NAME);
      expect(code).not.toMatch(BUDGET_FIGURE_LITERAL);
    });
  });

  // -------------------------------------------------------------------------
  // 2. The role-manifest budget stanza promises an aim, never enforcement.
  // -------------------------------------------------------------------------
  describe('2. the role-manifest budget stanza promises no enforcement, for every role', () => {
    const roleKeys = Object.keys(ROLE_POINTERS);

    it('2a. ROLE_POINTERS is non-empty, so the per-role loops below are not vacuous', () => {
      // Guard against the silent-pass failure mode: an empty or renamed export
      // would make every `for (const key of roleKeys)` assertion trivially true.
      expect(roleKeys.length).toBeGreaterThan(0);
      expect(typeof BUDGET_AIM_STANZA).toBe('string');
      expect(BUDGET_AIM_STANZA.trim().length).toBeGreaterThan(0);
    });

    it('2b. the stanza states an aim and names its own lack of enforcement', () => {
      const lower = BUDGET_AIM_STANZA.toLowerCase();
      for (const phrase of ENFORCEMENT_PHRASES) {
        expect(lower, `the stanza must not promise enforcement: "${phrase}"`).not.toContain(phrase);
      }
      expect(lower).toContain('advisory');
      expect(norm(lower)).toContain('no hook gates, stops, or cuts short a spawn over them');
    });

    it('2c. EVERY assembled role bundle carries the stanza and none of the enforcement phrasings', () => {
      // Iterates ROLE_POINTERS rather than a hardcoded role list, so a role
      // added tomorrow is covered with no action by its author. Checks the
      // whole assembled bundle, not just the stanza literal, so enforcement
      // phrasing smuggled into a ROLE POINTER is caught too.
      for (const key of roleKeys) {
        const bundle = buildRoleBundle(key);
        const lower = bundle.toLowerCase();
        expect(lower, `${key} bundle lost the advisory budget stanza`).toContain(
          'context budget (advisory',
        );
        for (const phrase of ENFORCEMENT_PHRASES) {
          expect(lower, `${key} bundle promises enforcement: "${phrase}"`).not.toContain(phrase);
        }
      }
    });

    it('2d. the injector emits no permissionDecision / deny / block for ANY ROLE_POINTERS key', async () => {
      for (const key of roleKeys) {
        expect(buildRoleBundle(key), `${key} bundle leaked a decision field`).not.toMatch(
          /permissionDecision|"deny"|"block"/,
        );
      }
      // And through the handler, for every role key plus the unknown-role paths.
      for (const agentType of [...roleKeys, 'cagents:backend-developer', '', undefined]) {
        const result = await handler({ hook_event_name: 'SubagentStart', agent_type: agentType });
        expect(
          JSON.stringify(result),
          `agent_type=${String(agentType)} leaked a decision`,
        ).not.toMatch(/permissionDecision|"deny"|"block"/);
        expect(
          result && result.continue,
          `agent_type=${String(agentType)} halted the spawn`,
        ).not.toBe(false);
      }
    });

    it('2e. the injector source contains no deny/block emission and no token gate at all', () => {
      const rawInjector = readFileSync(INJECTOR, 'utf8');
      const code = stripJs(rawInjector);
      expect(code).not.toMatch(/permissionDecision/);
      expect(code).not.toMatch(/\bdecision\s*:/);
      expect(code).not.toMatch(LIMIT_NAME);
      expect(findTokenGates('.claude/hooks/role-manifest-injector.cjs', rawInjector)).toEqual([]);
    });

    it('2f. the stanza matches none of the kill/abort/exceed phrasings (stanza-scoped)', () => {
      // SCOPED TO THE STANZA ON PURPOSE, not folded into the shared
      // ENFORCEMENT_PHRASES list used by 2b/2c/3d. Bare "abort" cannot go in
      // that list: the playbook's own disclaimer sentence READS "no hook, no CI
      // check, no abort — by design", so a shared bare-"abort" ban would make
      // the doctrine sentence fail the doctrine test (3d scans that prose).
      // What is forbidden is the stanza PROMISING a kill, not prose DENYING one.
      //
      // This list is regex-based where the phrase family matters more than one
      // spelling: ENFORCEMENT_PHRASES carries the literal 'aborted' and
      // 'will be killed', which both walk past 'aborts', 'abort the spawn', and
      // 'killed at 200k'.
      const FORBIDDEN = [
        /must not exceed/i,
        /hard limit/i,
        /will be killed/i,
        /\babort/i,
        /\bkilled\b/i,
        /\bexceeds?\b.*\btokens?\b/i,
      ];
      for (const pattern of FORBIDDEN) {
        expect(
          BUDGET_AIM_STANZA,
          `BUDGET_AIM_STANZA must not promise enforcement (matched ${pattern}). This ` +
            'stanza is charged to EVERY spawn, so enforcement language here teaches ' +
            'the whole system that the aim is a gate. Its current phrasing — "no hook ' +
            'gates, stops, or cuts short a spawn over them, and nothing measures them" ' +
            '— is deliberate: it names the absence of enforcement without using a verb ' +
            'that implies one.',
        ).not.toMatch(pattern);
      }
      // Not vacuous: the figures and the advisory framing must still be present.
      const flat = norm(BUDGET_AIM_STANZA);
      expect(flat).toContain('advisory');
      expect(flat).toMatch(/100k input tokens/);
      expect(flat).toMatch(/200k input tokens/);
    });
  });

  // -------------------------------------------------------------------------
  // 3. The playbook's aim section disclaims enforcement explicitly.
  // -------------------------------------------------------------------------
  describe('3. the playbook aim section carries an explicit no-gate disclaimer', () => {
    const playbook = read(PLAYBOOK);
    const aim = section(playbook, /^## The per-subagent context aim \(advisory\)$/m, /^## /m);

    it('3a. the aim section exists and is scoped to the aim', () => {
      expect(aim, `${PLAYBOOK} lost its aim section heading`).not.toBe('');
      expect(norm(aim)).toContain('Aim for about 100k input tokens');
    });

    it('3b. the aim section must carry an explicit no-gate disclaimer', () => {
      // Hard-wrapped across two source lines — normalize before comparing.
      expect(norm(aim)).toContain(
        'Both figures are aims. Nothing measures or enforces them — no hook, no CI check, no abort — by design.',
      );
    });

    it('3c. the disclaimer covers the outer bound too, not only the inner aim', () => {
      expect(norm(aim)).toContain('This outer bound is advisory, not enforced.');
    });

    it('3d. the aim section promises no enforcement anywhere in its prose', () => {
      const lower = norm(aim).toLowerCase();
      for (const phrase of ENFORCEMENT_PHRASES) {
        expect(lower, `the aim section must not promise enforcement: "${phrase}"`).not.toContain(
          phrase,
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. delegation.md keeps its sentence AND reconciles the two actors.
  // -------------------------------------------------------------------------
  describe('4. delegation.md keeps the no-threshold sentence and reconciles the two actors', () => {
    const delegation = read(DELEGATION);
    const sizeRule = section(delegation, /^## The Size Rule$/m, /^## /m);

    it('4a. The Size Rule section still exists', () => {
      expect(sizeRule, `${DELEGATION} lost "## The Size Rule"`).not.toBe('');
    });

    it('4b. the no-threshold / no-CI-gate sentence survives byte-identical', () => {
      // Asserted as the COMPLETE statement including the
      // already-considered-and-rejected clause, which is the part that answers
      // a future "why not just add a check?". Hard-wrapped across L99-L102 in
      // source: a single-line grep -F on raw bytes is a FALSE RED.
      expect(norm(sizeRule)).toContain(
        'Nothing measures this rule and nothing blocks on it — no threshold, no CI gate, no warning. ' +
          'It holds on instruction quality alone. Any future proposal to add a size check, a token gate, ' +
          'or a blocking threshold has already been considered and rejected.',
      );
    });

    it('4c. a reconciliation subsection lives INSIDE The Size Rule', () => {
      expect(sizeRule).toMatch(/^### Two actors, two rules$/m);
    });

    it('4d. the reconciliation names BOTH actors and exempts neither rule', () => {
      const reconciliation = section(sizeRule, /^### Two actors, two rules$/m, /^#{2,3} /m);
      const text = norm(reconciliation);
      expect(reconciliation).not.toBe('');
      // Actor 1: the main session, governed by a size class.
      expect(text).toContain('WHAT THE MAIN SESSION CARRIES');
      expect(text).toContain('a size class, never a token count');
      // Actor 2: the spawned subagent, governed by an advisory per-spawn aim.
      expect(text).toContain('HOW LARGE A SPAWNED SUBAGENT');
      expect(text).toContain('OWN CONTEXT GETS');
      expect(text).toContain('advisory, with no gate');
      // Neither is an exception to the other — that is the whole point.
      expect(text).toContain(
        'Neither rule is an exception to the other; they describe different actors.',
      );
    });

    it('4e. The Size Rule still restates no token count for the main session', () => {
      // The per-subagent aim must not have leaked a number into this section.
      expect(sizeRule).not.toMatch(/\d[\d,]*\s*[kK]?\s*tokens?\b/);
    });
  });

  // -------------------------------------------------------------------------
  // 5. No registered hook gained a deny path keyed to a token count.
  // -------------------------------------------------------------------------
  describe('5. no cAgents hook gained a deny/block path keyed to a token count', () => {
    const registered = registeredHookNames();

    it('5a. every hook registered in settings.json resolves to a file the scan covers', () => {
      // Without this, a rename could move a hook out of the scanned set and
      // the scan below would pass by covering nothing.
      expect(registered.length).toBeGreaterThan(0);
      for (const name of registered) {
        const file = `${name}.cjs`;
        expect(existsSync(join(HOOKS_DIR, file)), `${file} is registered but absent`).toBe(true);
        expect(hookFiles, `${file} is registered but outside the scanned set`).toContain(file);
      }
    });

    it('5b. no hook compares a token count against a constant', () => {
      // Scans ALL hooks in the directory — a superset of the registered set, so
      // the dispatched sub-validators (secret-detection,
      // controller-delegation-validator, skill-size-monitor, session-init-gate,
      // model-routing-advisor) are covered even though settings.json names only
      // their dispatchers.
      const findings = [];
      for (const file of hookFiles) {
        const rel = `.claude/hooks/${file}`;
        findings.push(...findTokenGates(rel, readFileSync(join(HOOKS_DIR, file), 'utf8')));
      }
      expect(
        findings,
        `a token-count gate appeared in a hook — the budget is ADVISORY:\n${findings
          .map((f) => `  ${f.where}  ${f.snippet}`)
          .join('\n')}`,
      ).toEqual([]);
    });

    it('5c. no hook declares a token-limit constant or hardcodes a budget figure', () => {
      // Catches the constant even when it is not compared yet, and catches a
      // string-valued one ('100000') that 5b's numeric operand check would miss.
      const offenders = [];
      for (const file of hookFiles) {
        const code = stripJs(readFileSync(join(HOOKS_DIR, file), 'utf8'));
        const name = LIMIT_NAME.exec(code);
        if (name) offenders.push(`${file}: token-limit constant "${name[0]}"`);
        const figure = BUDGET_FIGURE_LITERAL.exec(code);
        if (figure) offenders.push(`${file}: hardcoded budget figure "${figure[0]}"`);
      }
      expect(
        offenders,
        `the budget figures belong in prose, not in hook code:\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });

    it('5d. the deny-capable hooks deny on paths and roles, never on a token count', () => {
      // Hooks legitimately emit permissionDecision:deny (bash-validator,
      // controller-delegation-validator, permission-handler). The invariant is
      // not "no deny" but "no deny keyed to a token count" — and a file with no
      // token-count conditional at all cannot have one, which 5b establishes
      // file by file. This test pins the reasoning to the actual deny set so a
      // NEW deny-capable hook is visible in the diff rather than silent.
      const denyCapable = hookFiles.filter((file) =>
        /permissionDecision/.test(stripJs(readFileSync(join(HOOKS_DIR, file), 'utf8'))),
      );
      expect(denyCapable.length).toBeGreaterThan(0);
      for (const file of denyCapable) {
        expect(
          findTokenGates(`.claude/hooks/${file}`, readFileSync(join(HOOKS_DIR, file), 'utf8')),
          `${file} emits permissionDecision AND gates on a token count`,
        ).toEqual([]);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. The detector is not a no-op. Self-test with synthetic sources.
  // -------------------------------------------------------------------------
  describe('6. the detector provably bites (self-test)', () => {
    it('6a. catches a named token-limit constant used in a conditional', () => {
      const mutated = [
        'const MAX_SUBAGENT_INPUT_TOKENS = 100000;',
        'function h(usage) {',
        '  const inputTokens = usage.input_tokens;',
        '  if (inputTokens > MAX_SUBAGENT_INPUT_TOKENS) {',
        "    return { hookSpecificOutput: { permissionDecision: 'deny' } };",
        '  }',
        '  return null;',
        '}',
      ].join('\n');
      expect(findTokenGates('synthetic.cjs', mutated).length).toBeGreaterThan(0);
      expect(stripJs(mutated)).toMatch(LIMIT_NAME);
      expect(stripJs(mutated)).toMatch(BUDGET_FIGURE_LITERAL);
    });

    it('6b. catches a bare numeric comparison with no telltale constant name', () => {
      const mutated = [
        'function h(usage) {',
        "  if (usage.input_tokens >= 200000) return { decision: 'block' };",
        '  return null;',
        '}',
      ].join('\n');
      // This is the case NIS-1's name-based MAX_*TOKEN guard would miss.
      expect(findTokenGates('synthetic.cjs', mutated).length).toBeGreaterThan(0);
      expect(stripJs(mutated)).not.toMatch(LIMIT_NAME);
    });

    it('6c. catches the camelCase spelling with a figure outside the doctrine pair', () => {
      // REGRESSION ON THE DETECTOR ITSELF. An earlier revision matched only
      // snake_case and missed `if (tokenCount > 100000)`; it was rescued purely
      // by the budget-figure literal check. With a figure that is NOT 100k/200k
      // that rescue disappears, so the vocabulary has to carry it alone.
      const mutated = [
        'function gate(tokenCount) {',
        "  if (tokenCount > 150000) return { permissionDecision: 'deny' };",
        '  return null;',
        '}',
      ].join('\n');
      const code = stripJs(mutated);
      expect(code).not.toMatch(LIMIT_NAME);
      expect(code).not.toMatch(BUDGET_FIGURE_LITERAL);
      // Nothing else can catch this one. The structural check must.
      expect(findTokenGates('synthetic.cjs', mutated).length).toBeGreaterThan(0);
    });

    it('6d. does NOT fire on the near-misses that really exist in the tree', () => {
      const benign = [
        // millisecond durations
        'const SENTINEL_THROTTLE_MS = 24 * 60 * 60 * 1000; if (ageMs < SENTINEL_THROTTLE_MS) {}',
        // shell-lexer tokens
        "const tokens = seg.argv; for (const t of tokens) { if (t.canon !== '(') {} }",
        // character offsets named token*
        'const tokenEnd = idx + match.length; if (mStart < tokenEnd && mEnd > tokenStart) return true;',
        // whitespace-split words
        'const tokens = needle.split(/\\s+/).filter((t) => t.length >= 4);',
        // byte caps
        'const MAX_BYTES = 512 * 1024; if (content.length > MAX_BYTES) {}',
        // the real idempotence check in spawn-footprint.cjs
        'if (task.token_count && task.token_count.input === fp.token_count.input) continue;',
      ];
      for (const src of benign) {
        expect(findTokenGates('synthetic.cjs', src), `false positive on: ${src}`).toEqual([]);
      }
    });

    it('6e. the normalizer is what makes the hard-wrapped sentences matchable', () => {
      // Pins the trap itself: the raw bytes do NOT contain the sentence.
      const sentence =
        'Nothing measures this rule and nothing blocks on it — no threshold, no CI gate, no warning.';
      const raw = read(DELEGATION);
      expect(raw).not.toContain(sentence);
      expect(norm(raw)).toContain(sentence);
    });
  });
});
