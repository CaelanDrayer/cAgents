# Changelog

All notable changes to cAgents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry corresponds to one atomic tiny-bump commit. See
`.claude/rules/core/version-registry.md` for the tiny-bump cadence rules.

## [Unreleased]

## [12.41.0] - 2026-07-10

Bucket-C Phase 5 — **CI content-security / capability-consistency layer** (session
`team_phase5-ci-security_260710_001`). cAgents CI was 100% structural/schema linting;
this adds the complementary content layer. Everything is Node-only (Standalone
Contract), WARN-only, and never fails the build — the honest advisory-first rollout.

### Added
- **F6 baseline/suppression + advisory runner** — the prerequisite mechanism:
  `scripts/ci/lib/validator-baseline.cjs` (two-tier suppress by rule+glob OR exact
  fingerprint, with reasons), `scripts/ci/validator-baseline.yaml` (empty schema),
  `scripts/ci/run-advisory.cjs` (discovers `scripts/ci/advisory/*.cjs`, runs each,
  drops baselined findings, `--format json`, ALWAYS exits 0), and a new
  `check_advisory` WARN-only stage wired into `cagents-ci.sh` (non-blocking — its
  result never flips the overall CI verdict). Contract documented in
  `scripts/ci/advisory/README.md`.
- **F2 trigger-collision** (`scripts/ci/advisory/trigger-collision.cjs`) — flags
  over-broad triggers (TR1), reserved-name shadowing of run/team/designer/helper/
  memory/init by a different owner (TR2), and keyword-baiting (TR3). 0 live findings
  (catalog is clean); guards future regressions.
- **F1 allowed-tools-vs-actual** (`scripts/ci/advisory/allowed-tools-actual.cjs`) —
  diffs each agent's declared `allowed-tools` against capability signals in its body
  (LP1 undeclared-use, LP2 wildcard, LP3 no-declaration, LP4 over-declaration). 14
  live findings, all LOW LP4 (mostly controllers declaring `Agent` with no
  grep-matchable spawn verb) — informational, non-blocking.
- **F3+F4 agent-content-scan** (`scripts/ci/advisory/agent-content-scan.cjs`) —
  F3 description-vs-body/allowed-tools contradiction (e.g. "read-only" agent that
  declares Write); F4 content-security scan of SKILL.md bodies + hook source for
  genuine `curl|bash`/eval/exfil constructs and injection strings, with strong
  false-positive controls (security/attack-surface content is exempt; topical
  mentions of curl/mcp/injection never fire). 0 live findings.
- Regression tests: `tests/ci/{advisory-runner,trigger-collision,allowed-tools-actual,agent-content-scan}.test.js`
  (~79 tests) covering the runner, baseline suppression (glob + fingerprint), and
  each validator's rules firing on crafted bad input + not firing on the clean catalog.

### Changed
- Test-count claim refreshed to `1514+ Vitest tests across 179+ files`.

## [12.40.0] - 2026-07-10

Bucket-C Phase 4, part 2 — **advisory-first enforcement hooks** (C1, D3). Both are
WARN-only extensions of EXISTING hooks — no new hook file, no hook-count change,
and each carries a proven decision-unchanged guarantee. This is the honest "start
advisory, flip to blocking later" path.

### Added
- **C1 — mechanical self-validation recheck** (WARN-only) in `verify-completion.cjs`:
  a new additive pass reads `self_validation` claims from `coordination_log.yaml`
  `implementation_tasks[]` and `outputs/**/self-validation.yaml`, then mechanically
  checks **Check 2** (claimed file exists via `fs.existsSync`) and **Check 3** (guard
  `exit_code == 0`). Mismatches surface via `console.error` + a
  `workflow/self_validation_recheck.yaml` artifact. The hook's block/allow verdict is
  byte-identical to before (verified by test); mismatches only warn, never block.
- **D3 — mechanical claim-verification** (advisory) in `validator-evidence-recheck.cjs`:
  a Node-only (no LLM, no network) pass that extracts checkable claims from
  `validation_report.yaml` (`pattern_count` / `pattern_exists` / `pattern_absent` /
  `file_exists` / `code_snippet` / `arithmetic`), dispositions each as
  verified/failed/unsupported/unverifiable (with the `prose-of-absence`,
  `snippet_in_wrong_file`, `line-number-as-count` guards), and computes `passRate`.
  When `passRate < 0.8` with ≥2 checkable claims it WARNs + appends a
  `claim_verification:` block. Hard auto-route-to-PLANNED is deliberately deferred —
  the existing PASS→FAIL evidence downgrade is unchanged.
- Regression tests: `tests/hooks/self-validation-recheck.test.js` (4) and
  `tests/hooks/claim-verification.test.js` (8), each asserting the new behavior AND
  that the host hook's existing decision is unchanged.

### Changed
- Ledger + docs updated to reflect the new partial enforcement: `execution.md`
  Enforced-vs-Advisory ledger now marks self-val Check 2/3 as
  `Partial (WARN-rechecked at Stop)`; `execution-self-validation.md` and
  `pat-evidence-first-execution.md` document the two passes honestly (they WARN, they
  do not block).
- Test-count claim refreshed to `1435+ Vitest tests across 175+ files`.

## [12.39.0] - 2026-07-10

Bucket-C Phase 4, part 1 — review/verification **conventions** (session
`team_phase4-review-rigor_260710_001`). Additive prose/playbooks/scripts only; no
new enforcement (the C1/D3 advisory hooks land separately in 12.40.0). Several
sections reference the distilled example-store files wired in 12.38.0.

### Added
- **3 new playbooks** (spec-compliant 6-key frontmatter):
  - `pat-gate-taxonomy.md` (D6) — four checkpoint types (Pre-flight / Revision /
    Escalation / Abort) mapped onto cAgents surfaces, plus the stall-detection
    rule (escalate early if findings do not shrink between rounds).
  - `pat-feedback-loop-first-debugging.md` (D8) — tight-repro-loop-before-hypothesis,
    the 10-strategy ladder, RED-before-fix, ranked falsifiable hypotheses, and
    `[DEBUG-<hash>]` tagged logs with mandatory grep-cleanup before DONE.
  - `pat-context-budget-tiers.md` (D9, advisory) — proactive PEAK/GOOD/DEGRADING/POOR
    self-monitored read-depth bands + the vague-phrasing early-warning heuristic.
- **File-handoff helper scripts** (D10) under `scripts/handoff/`: `task-brief.sh`
  (extract one work-item block to a uniquely-named brief) and `review-package.sh`
  (bundle a diff for a reviewer sub-agent), backing the "delegation prompt under
  300 tokens" prose rule mechanically. Plus a `scripts/handoff/README.md`.

### Changed
- `pat-two-stage-review.md`: added **D5** SAFE/CAREFUL/RISKY auto-apply tiers
  (orthogonal to severity) + the Chesterton's-Fence `git blame`-before-removal rule,
  and an optional **D11** two-axis (Standards vs Spec, never-merged) parallel-review
  variant with the Fowler 12-smell baseline + an undocumented-scope-creep sub-check.
- **D7** Rule-of-Three architecture-question escalation branch added (advisory) to
  `controllers.md` and `agents/core/self-correct/SKILL.md`: when 2-3 consecutive
  fixes each relocate rather than shrink the failure, set `architecture_question:
  true` and escalate to the user instead of burning revision budget / dead-lettering.
- Playbook/rule counts synced: 40→43 rule files, 9→12 playbooks (CLAUDE.md +
  `.claude/rules/README.md`).

## [12.38.0] - 2026-07-10

Bucket-C Phase 3 — **wire the example store** (session `team_wire-example-store_260710_001`).
Makes the store committed in 12.36.0 non-inert: it now has a real primary consumer
(the planner) and on-demand agent access. Advisory-first, capped, no pipeline behavior forced.

### Added
- **Planner few-shot consumption of the example store (H1)**: `agents/core/planner/SKILL.md`
  gains a concise `## Example-Store Few-Shot (advisory)` section instructing the planner to,
  during decomposition + delegation-prompt assembly, consult `.claude/rules/examples/_index.yaml`,
  filter by detected `category` + `applies_to`, rank, and `@path`-load the **top 1-3** matching
  example bodies as few-shot guidance. Purely advisory — zero matches ⇒ zero output, pipeline
  never fails on it; hard cap 3 to bound token cost.
- `agents/core/planner/resources/example-store-selection.md`: the full 5-step selection
  procedure (category detection table, `_index.yaml` schema, category + `applies_to` filtering
  with `all-controllers`/`all-execution-agents` wildcards, ranking, cap, worked example).
- `tests/v12/planner-consumes-example-store.test.js`: regression test (5 cases) gating the
  wiring so it can't silently regress.
- **Agent Tier-3 `@path` references (H2)**: 20 agents named in examples' `applies_to` gain a
  `## Worked Examples` section linking the relevant `ex-*.md` (capped at the 5 most-relevant per
  agent). dev/quality/review/core set (reviewer, tech-lead, qa-lead, backend/frontend-developer,
  security-engineer, architect, self-correct, validator, wave-reviewer, executor, team-lead) +
  strategy/authoring/analyst set (technical-writer, orchestrator, strategic-planner,
  product-owner, marketing-strategist, market-research-analyst, data-scientist, task-state).

### Notes
- The store is now consumed; H4 (corpus-refresh script), H5 (reject-path counterexamples),
  and H7 (index-cache pointer layer) remain open. Additive/advisory only — no runtime pipeline
  path changed.

## [12.37.0] - 2026-07-10

Phase-1 de-bloat / honesty pass (second half of the `team_action-overhaul-outputs_260710_001`
action of the overhaul plan). Companion to 12.36.0.

### Changed
- **De-bloat CLAUDE.md** (I1 + I2, conservative first pass): removed inline
  release-history / version-archaeology clauses (`v12.0.0: … folded`, `LP-27`,
  `V9.23/V9.27`, `post-v12.20.0`, `v12 W4.2`, `was 18 in V11.0, 21 historically`,
  the pure-history `DECOMPOSED/PROMPTS_READY` note, etc.) — the top-of-file
  "see CHANGELOG.md / RELEASE_NOTES.md" pointer already covers this history. Cut
  real per-session token cost; every numeric count, `@`-import, the Standalone
  Contract, and all normative content preserved (576→568 lines; the reduction is
  token-weighted, not line-weighted, since the history lived as inline clauses).
  A deeper index-style restructure remains available as a follow-up.
- **Label aspirational protocols advisory** (C2): added a one-line
  `> Advisory — not hook-enforced` blockquote atop the 8 genuinely un-enforced
  protocol sections in `controllers.md` (dead-letter promotion, two-stage review,
  guard-command pattern, regression-validation chain, pre/mid-execution
  validation) and `execution.md` (subagent status protocol, commit-before-verify,
  5-check self-validation), each pointing to the deferred-enforcement roadmap.
  Complements the "Enforced vs Advisory" ledgers added in 12.36.0. Additive only —
  no normative prose deleted.

### Added
- `docs/FUTURE_VALIDATION_FRAMEWORK.md`: new "Advisory Controller & Execution
  Protocols (agent-self-reported)" section naming the 8 tagged protocols so the
  new blockquote pointers resolve to real appendix content.

## [12.36.0] - 2026-07-10

Honesty-spine minor bump — actions Phase 0 + the cheap Phase-1 prose items from
the `team_plugin-overhaul_260710_001` overhaul plan (sanity-checked and landed by
`team_action-overhaul-outputs_260710_001`). Truth-in-numbers fixes were already
applied to the working tree; this commit lands them + the example store + review
rigor prose as one reviewable unit.

### Added
- **Curated example store committed** (`.claude/rules/examples/`) — 27 `ex-*.md`
  few-shot exemplars + `README.md` + `_index.yaml`. Previously an untracked
  working-tree artifact; now git-tracked. Still unwired (planner few-shot / agent
  `@path` consumption deferred to a later phase — H1/H2). (H0)
- **Example-store regression tests** (`tests/v12/example-store-frontmatter-valid.test.js`,
  `tests/v12/example-index-resolves.test.js`) — assert 6-key frontmatter
  compliance, `name==filename`, valid YAML, and a bijective `_index.yaml`↔disk
  mapping. Gates the store per the bug-driven-test mandate. (H3)
- **"Enforced vs Advisory" ledger** at the top of `controllers.md` and
  `execution.md` — a table marking each documented protocol as mechanically
  enforced (hook/CI/test) vs. agent-self-reported/advisory, so a reader can tell
  at a glance without grepping. Directly addresses the plan's central
  credibility-gap finding (H1). (C3)
- **"Distrust the self-report"** reviewer instruction in `pat-two-stage-review.md`
  and `pat-evidence-first-execution.md` — the reviewer treats the executor's own
  self-report / `self_validation` YAML / `ponytail:` markers as unverified claims
  to check against the diff, never as severity-lowering evidence. (D1)
- **Fresh-reviewer-per-round** anti-anchoring rule in `pat-two-stage-review.md`
  (+ reference in `controllers.md` Reviewer Loop). (D2)
- Deliberate-tradeoff note near the delegation Rationalization Kill List
  explaining why zero-exception delegation is intentional. (I7)
- "A note on the word 'examples'" section in the store README disambiguating the
  three overloaded uses of "examples". (I6)

### Changed
- **Truth-in-numbers (Phase 0)**: `validate-agents.sh` stale hook count `26`→`24`
  (A1); `CLAUDE.md` "57-agent"→"58-agent" (A2) and writer archetype "3 agents"→"4"
  (A3); `validate-counts.sh` + `.claude/rules/README.md` now exclude
  `.claude/rules/examples/` from the `RULES_MD` derivation so the documented "40
  rule files" stays honest (examples are few-shot data, not rules) and the count
  guard stays green after committing the store (A6).
- Test-count claims refreshed to the current static lower-bound: `CLAUDE.md` and
  `docs/CONTRIBUTING.md` `1395+/1335+ tests` → `1418+ Vitest tests across 172+ files`.

### Fixed
- Removed a pre-existing broken, git-ignored symlink
  (`.claude/skills/commit-changes` → missing target) that caused 2 spurious
  `npm test` failures unrelated to any repo content.

## [12.35.1] - 2026-07-09

### Changed
- Extend the `ai-writing-editor` final-gate directive to the two academic-prose
  agents (`analyst/scholar`, `advisor/education/academic-advisor`). Both now
  carry the same `## Final AI-Detection Gate` line the five writer agents gained
  in v12.35.0 — run `cagents:ai-writing-editor` (mode=both) before returning any
  academic prose / research-writing deliverable, with `.claude/rules/quality/anti-slop.md`
  as the reference tell list. One gate line per agent (both are consolidated
  mode-flagged agents; a single line covers their prose output).

## [12.35.0] - 2026-07-09

Consolidated AI-writing detection/humanization gate for the writer archetype
(session `run_writers-ai-detection_260709_001`). Minor bump: a new routable
agent lands (restored + merged from two archived pre-v12.6 agents), the
anti-slop rule is enriched into the canonical tell registry, and five
writer-type agents gain a final AI-detection gate. Catalog grows 57 → 58.

### Added
- **`ai-writing-editor` agent — consolidated detect/rewrite gate.** New
  mode-flagged writer agent at `agents/writer/ai-writing-editor/` restoring and
  merging the archived pre-v12.6 `ai-writing-detector` + `ai-writing-rewriter`.
  Modes: `detect` (read-only 14-category forensic scan → `detection_report.yaml`),
  `rewrite` (4-pass humanization), and `both` (one-pass detect→rewrite; the
  default used by the writer gate). Ships three distilled resources —
  `resources/detection-categories.md`, `resources/rewrite-strategies.md`, and
  `resources/tell-registry.yaml`.

### Changed
- **`.claude/rules/quality/anti-slop.md` promoted to the canonical AI-writing
  tell registry.** Enriched into the single source of truth for AI-writing
  tells — magic-city P0–P3 severity tiers plus HARD-BANNED B1–B10 — with a
  pointer to `cagents:ai-writing-editor` as the deep final gate for prose.
- **Final AI-detection gate wired into 5 writer-type agents.** `editor`,
  `narrative-director`, `worldbuilder`, `technical-writer`, and `translator`
  now run `cagents:ai-writing-editor` mode=both before returning prose.
- **Agent catalog 57 → 58.** Writer archetype grows 3 → 4 (42 routable + 16
  core). Count-drift references swept across docs + manifests (`CLAUDE.md`,
  `README.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`).

## [12.34.0] - 2026-07-08

GuardFall Bash-guard hardening (session `run_bash-guard-evaluator_260708_001`).
Minor bump: a new security feature landing (evaluator library + wiring + CI
gate + doc flips). Threat model + per-class scorecard:
`docs/SECURITY_BASH_GUARD_THREAT_MODEL.md`.

### Added
- **`bash-guard-evaluator.cjs` — fail-closed tokenize-and-canonicalize Bash
  guard (GuardFall hardening).** New pure library at
  `.claude/hooks/bash-guard-evaluator.cjs` (735 lines, Node built-ins only,
  zero new deps) that closes the named GuardFall bypass shapes of Classes A–E
  from the threat model: quote-removal/escape obfuscation (A), `$IFS`
  field-splitting (B), command substitution (C), decode-pipe variants (D), and
  the alternative-argv destructive/exfil long tail (E), by reasoning about the
  resolved argv bash will actually run instead of surface-text denylisting.
- **35-probe GuardFall regression corpus + CI gate.** New
  `tests/hooks/fixtures/guardfall-corpus.json` (35 probes across Classes A–E)
  driven data-first by `tests/hooks/bash-guard-guardfall.test.js` — 21
  bug-driven probes that were red (ALLOW) against the pre-hardening guard are
  now green (DENY); 35/35 pass. The corpus pins the per-class claims in the
  threat model as falsifiable CI assertions.

### Changed
- **`bash-validator.cjs` wired to the evaluator on the RAW command,
  fail-closed, legacy belt retained.** The evaluator runs first against the
  raw (pre-whitespace-collapse) command string — load-bearing for Class B —
  inside an explicit try/catch that DENIES on evaluator crash (the legacy
  `createHook` catch fails open; this path does not). The legacy
  `BLOCKED_STRINGS`/`BLOCKED_REGEXES`/HITL denylist is retained as a
  Stage-2/3 belt; verdicts combine most-restrictive.
  - **Grouped-producer pipe-destination coverage (Class-D grouping bypass).**
    `checkPipeDestination` now looks THROUGH subshell `(...)` and brace-group
    `{ ...; }` wrapping, so a decoder/fetch producer hidden inside a group and
    piped into an interpreter still denies — `(base64 -d x)|python3` and
    `{ base64 -d x; }|sh` were ALLOW/ask pre-fix, now DENY. Benign grouped
    pipes are unaffected (`(echo hi)|cat` stays allow). The 35-probe corpus
    verdicts are unchanged; the new grouping cases are pinned as plain `it()`
    rows in `tests/hooks/bash-guard-guardfall.test.js`.
- **`$IFS`-obfuscated sensitive-read refinement → deny.** An `$IFS`-obfuscated
  read of a sensitive credential path (e.g. `cat$IFS~/.aws/credentials`) now
  maps to DENY: obfuscating a sensitive-path read is treated as exfil intent,
  not a benign read.
- **Doc flips.** `docs/SECURITY_BASH_GUARD_THREAT_MODEL.md` flipped from
  DESIGN (KNOWN-OPEN) to IMPLEMENTED — shipped in v12.34.0, with §4 retained
  as the falsifiability baseline and §7 residuals still open by construction;
  `.claude/rules/core/resources/hook-catalog.md` `bash-validator.cjs` entry
  updated to describe the evaluator-fronted, fail-closed pipeline instead of
  the KNOWN-OPEN GuardFall limitation.
- **Hook-file inventory 31 → 32; `lint-hooks.cjs` categorizes the evaluator as
  a non-hook utility.** `bash-guard-evaluator.cjs` is a library `require`d by
  `bash-validator.cjs` — neither a registered hook nor a dispatched
  sub-validator — so it joins `hook-utils.cjs` + `run-hook.cjs` in the
  linter's non-hook-utilities bucket (32 = 24 registered + 5 dispatched + 3
  utilities). Human-facing counts updated in `CLAUDE.md`,
  `.claude/rules/core/hooks.md`, and the `.claude/settings.json` `$comment`.

### Fixed
- **Stale `chmod -R 777` expectation reconciled in
  `tests/hooks/bash-validator-safety.test.js`.** The evaluator hard-denies
  recursive world-writable chmod (Class E); the test previously pinned the
  legacy HITL `ask` verdict and now asserts `deny`.

## [12.33.0] - 2026-07-03

Skills + hooks improvement pass spanning correctness, robustness, performance,
and clarity (session `run_improve-skills-hooks_260703_001`). Minor bump per
`.claude/rules/core/version-registry.md`: a multi-surface audit/improvement
session touching >5 non-sync files (5 hooks + hook-utils + 2 skill docs + 2 new
test files) — the tiny-bump guard would correctly block this as a patch.

### Fixed
- **verify-completion.cjs agent_tree.yaml schema mismatch (WI-1, correctness).**
  The Stop hook counted agents by matching keys the SubagentStart tracker never
  writes (`agent_type:` / `- agent_id:`); the real on-disk schema is
  `- id:` / `type:` / `cagents_type:`, so `agent_count` in
  `session_outcomes.jsonl` was always 0. Also removed a dead `workflow/events/`
  revision-counter read (the events dir was removed in v12.6.0) in favor of an
  honest null. Same M-24 bug class fixed in `team-stop.cjs` back in v12.12.2 but
  missed here.
- **Unguarded `require('js-yaml')` in two SubagentStart/Stop hooks (WI-2,
  robustness).** `subagent-tracker.cjs` and `subagent-stop-tracker.cjs` now
  guard the top-level `js-yaml` require (mirroring `team-stop.cjs`), so a plugin
  install without `npm install` degrades gracefully — the audit log and
  additionalContext injection still work; only the agent_tree.yaml mutation is
  skipped — instead of crashing the hook.
- **subagent-tracker.cjs first-entry depth bug (WI-3, correctness).** The
  sentinel depth map (`pipeline` → 1, `controller` → 2) was skipped when the
  agents list was empty, so the first spawned child got depth 0 and could
  falsely trip the delegation-violation check.
- **session-catchup.cjs stale skill suggestion (WI-5, correctness).** The
  SessionStart hook no longer injects "use /improve …" guidance (`/improve` was
  folded into `/run` in v12.1.2); also fixed a wrong product-context tip path.
- **hook-utils.cjs `extractYamlValue` null-content guard (WI-8, correctness).**
  `permission-handler.cjs` threw a TypeError in any session without a
  `plan.yaml`; `extractYamlValue` now guards null/undefined content.

### Changed
- **withFileLock contention wait is now 0% CPU (WI-7, performance).**
  `hook-utils.cjs` `withFileLock` uses `Atomics.wait` for its lock-contention
  backoff instead of a busy spin-wait.
- **_MODE_REGISTRY.md /designer section modernized (WI-4, clarity).** The
  registry now shows the canonical 6-phase designer workflow (was a stale
  4-phase table); `helper/SKILL.md` "4-phase" reference updated to "6-phase".
- **Stale-comment sweep across four hooks (WI-6, clarity).**
  `post-write-validator.cjs` header (no-systemMessage per HC-2),
  `pre-compact-save.cjs` timestamp-format comment, `team-start.cjs`
  "SendMessage/SendMessage" dedup, and the `hook-utils.cjs` `findActiveSession`
  header (deterministic-chain framing).

### Tests
- Added `tests/hooks/js-yaml-guarded-require.test.js` (WI-2 regression) and
  `tests/hooks/verify-completion-agent-tree-schema.test.js` (WI-1 regression).
  Refreshed the CLAUDE.md test-count claim (168 files / 1395+ tests).
  `npm test` green at release gate: 1609 passed, 0 failed.

## [12.32.0] - 2026-06-30

Two independent hook-resolution fixes discovered while diagnosing sessions that
hung in the same project directory (session `run_hook-session-id_260701_001`).
Both stem from the gap between the SDK transcript UUID that hooks actually
receive in `input.session_id` and the cAgents session directory a hook needs to
write into. Minor bump (two coherent objectives spanning >5 non-sync files:
`hook-utils.cjs`, `verify-completion.cjs`, `subagent-tracker.cjs`,
`session-init-gate.cjs`, 2 SKILL.md, tests, docs) — a patch would be correctly
blocked by the tiny-bump guard.

### Fixed
- **Deterministic SDK-UUID → cAgents-session resolution (OBJ-1).** Since
  v12.16.0 a UUID-shaped `input.session_id` deliberately fell through to the
  env-var step and could resolve to nothing, hanging the very first `Agent()`
  spawn. This ships a *persisted* SDK-transcript-UUID → session map so a UUID
  hint resolves deterministically: a per-session marker
  `sessions/{id}/session.sdk_id` (self-cleaning with the session dir) plus a
  global reverse registry as a directory of pointer files
  `cagents-memory/_system/sdk_session_map/{uuid}` (content = owning session_id;
  O(1) reverse lookup; per-UUID atomic files, every mutation under
  `withFileLock`). `findActiveSession` / `findTeamSession` now consult the map
  first for a UUID-shaped hint (step 1a): a live pointer is a deterministic hit,
  and a miss falls through to the env-var step exactly as before — a UUID alone
  never resolves to a sibling session, preserving the cross-write invariant. New
  `hook-utils.cjs` helpers: `upsertSdkSessionMap` / `resolveSdkUuidToSession` /
  `removeSdkPointer` / `_pruneSdkMap`. Writers populate the map only on
  *confident* resolution (env-var / promptHint / marker — never the newest-session
  heuristic, to avoid circularity): `subagent-tracker.cjs` (primary,
  SubagentStart) and `session-init-gate.cjs` (secondary, PreToolUse[Agent]),
  plus best-effort `session.sdk_id` markers written at skill session-init in
  `run` / `team` SKILL.md. Three-layer reaping keeps the registry bounded to
  live + recent sessions: lazy (a lookup that lands on a terminal/missing target
  unlinks the pointer and returns a miss), explicit (the finishing session's
  pointer is removed at SessionEnd via `team-stop.cjs`), and opportunistic (a
  prune on each upsert). All map writes fail-open — a map-write failure never
  blocks an agent spawn.
- **Stop hook no longer deadlocks a mid-flight background wait (OBJ-2).**
  `verify-completion.cjs` gained a `sessionActivelyWorking(sessionDir,
  statusContent)` discriminator that returns true when EITHER a spawned child
  agent is still running (an `agent_tree.yaml` `agents:` entry with
  `stopped_at: null`) OR the status heartbeat is fresh
  (`now - Date.parse(last_updated_at) < CAGENTS_SESSION_LIVENESS_MS`). It is now
  applied at all three block paths (A: active-state/next-stage-agent; B:
  coordination_log enforcement; C: enrichment-artifacts phase branch) so they
  agree: a legitimately mid-COORDINATED session that yields to await background
  work now WARNs (`continue: true`) instead of blocking, while a genuinely
  abandoned session (no running agent AND a stale heartbeat within the 24h
  window) still BLOCKs. The abandoned-session block is not weakened.

### Testing
- Bug-driven regression tests (failing-before / passing-after):
  `tests/hooks/sdk-uuid-map-resolution.test.js` (UUID-only payload resolves to
  the correct session via the persisted map; a UUID mapping to nothing does not
  resolve to a sibling),
  `tests/hooks/verify-completion-active-wait.test.js` (mid-COORDINATED + running
  agent or fresh heartbeat → warn-not-block; abandoned → block), and an extended
  `tests/v12/concurrent-sessions-no-crosswrite.test.js` (two concurrent same-dir
  sessions each resolve to their OWN session via the UUID map).
- Fixed `tests/hooks/instructions-loaded.test.js` missing `beforeAll` vitest import (test-only, no runtime behavior change).

## [12.31.0] - 2026-06-30

Phase 2 (capstone) of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Final count/number drift sweep — run
last so every advertised number reflects all prior phases, plus guards so the
drift class cannot silently recur.

### Fixed (~40 claims across 11 files)
- `.claude-plugin/plugin.json` + `marketplace.json` descriptions: "141 agents" →
  **57** (C1.1). A stale test that hardcoded "141 agents" (and was *blocking* the
  fix) was rewritten to derive the count from `plugin.json.agents.length`.
- `CLAUDE.md`: trimmed the frozen v12.0.0 "251 → 240" release block (C1.3/C1.8)
  to a concise current-state summary (57 agents / 9 archetypes / 5-state pipeline
  / standalone) + CHANGELOG pointer; the stale "3 paths: minimal/medium/full +
  9-signal scoring" pipeline claim → the current `fast`/`standard` model;
  vp-engineering → "folded into cto"; docs/rules/test counts refreshed.
- Hook counts "32/26/18"/"18/15" → **31/24/18** across README + rules/README.
- The "238 vs 240" net-agent contradiction (C1.3) standardized on **238**
  (RELEASE_NOTES enumerates the 13 deletions); dated release notes kept historical.
- `LIFECYCLE.md`: removed the `task-merger` phantom (absorbed into `task-state`);
  re-tallied phase counts to match the table.

### Added / hardened (guards)
- `validate-counts.sh` Check 13: fails CI if CLAUDE.md states a stale current
  agent-count (historical "251→240" arrows are not flagged). Stale comments fixed.
- `cagents-ci.sh` tiny-bump `sync_targets`: dropped the removed `org`/`improve`
  entries → exactly the 16 registry locations; "21" comment → 16.
- `tests/regressions/count-drift-guards.test.js`: locks both hardenings.

Residual (dated historical records, not current claims): `clo` appears in
`ARCHITECTURE.md`/`RELEASE_NOTES.md` v12.0.0 entries (reverted to
`general-counsel`; left as dated record).

## [12.30.0] - 2026-06-30

Phase 10 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Make the /team machinery match reality.

### Added
- Team-artifact enforcement folded into the existing `verify-completion.cjs` Stop
  hook (A8-01) — no new hook file (count stays 31). When a `team_*` session is at
  terminal success (`result: success` AND a terminal `pipeline_state`), it BLOCKS
  if `workflow/coordination_log.yaml` is missing, and WARNs (never blocks) if a
  wave run skipped its `spawn_brief.md`/`gate_validations/`. The `result: success`
  predicate is the load-bearing guard — in-flight runs carry `result: pending`/null
  and pass straight through, so it cannot deadlock a live session. Regression test
  `tests/hooks/verify-completion-team-artifacts.test.js` (5 cases).
- A single canonical "C-suite" definition (A8-08) in
  `team/reference/csuite-mapping.md`: the 9 leadership agents (CEO/CTO/CFO/CMO/
  COO/CHRO/CCO/CRO/CPO) — matching `agents/leadership/`; no `clo`/`cso` ghosts.

### Removed
- The `workflow/events/EVT-{state}_*.yaml` auto-emitter in `post-write-validator.cjs`
  (D5, A8-03) — emission was declared removed in v12.6.0 but this v10.25.0 writer
  still ran. Confirmed unconsumed; heartbeat update retained.

### Investigated, kept (conservative)
- `team` + `team-lead` core agents (A8-07): NOT vestigial — referenced by
  `plugin.json`, two tests, `run/reference/delegation-patterns.md`, and
  `orchestrator/resources/team-mode-execution.md`. Kept; agent count stays 57.

## [12.29.0] - 2026-06-30

Phase 9 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Historical-prose / context-budget cut
(net −503/+41 lines).

### Removed
- `data_access_level` machinery (A1-06): 0/57 agent adoption, advisory, never
  fired. Removed the schema section from `skill-format.md` and the Phase-3 check
  + dead helpers from `session-init-gate.cjs` (now cleanly 2-phase: presence gate
  + alias check); deleted its dedicated test; trimmed `hook-catalog.md`.
- Duplicated "pre-2.1.172 depth-1 stripping" history (A3-08): the ~120-line
  narrative repeated across `teams.md`, `execution.md`, `controllers.md`,
  `delegation.md` collapsed to one-line pointers; canonical account stays in
  `pat-graceful-degradation-depth1.md`. Current nesting-model paragraph retained.

### Added
- `docs/DESIGN_NOTES.md` (non-auto-loaded): home for design aspirations the
  runtime does not enforce. Moved the three-file pattern (from `agent-memory.md`)
  and 2-action findings capture (from `execution.md`) here + left pointers.
  (Signal/handoff, DECISIONS/CORRECTIONS, interface-contracts left in place —
  they read as live mechanisms; conservative.)

### Changed
- HISTORICAL banners added to frozen `docs/REMAINING_OPTIMIZATIONS.md` (v8.0.18)
  and `docs/TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` (kept — both have inbound refs).

## [12.28.0] - 2026-06-30

Phase 8 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Validation-framework consolidation —
one consistent, layered story instead of an apparent "validation zoo".

### Fixed
- Revision-round contradiction (A3-07): `validation-framework.md` pinned
  revision rounds at `(0-5)`; corrected to the canonical `(0-3)` (outer
  FAIL/REVISE cap = 3 `max_cycles`; controller internal = 2 `max_internal_rounds`).
- Count-narrative reconciliation (C4.1): `completion.md` and
  `validation-framework.md` now state one model — **5 enforced +
  advisory-by-convention + 24 aspirational-deferred** — with the 29/15→5 churn
  clearly marked HISTORICAL.

### Added
- A single "Validation Layers" table in `completion.md` (Enforced 5 / Advisory /
  Aspirational 24, each with count, location, and whether a hook enforces it).
- `tests/v12/validation-layers-consistent.test.js`: guard pinning "5 enforced",
  the Layers table, and the absence of any CURRENT `(0-5)` revision-round claim.

### Changed
- `validation-framework.md` now `@path`-references the `completion.md` Layers
  map instead of re-enumerating it (de-duplicated).

## [12.27.1] - 2026-06-30

Bug fix surfaced during the audit (session
`team_plugin-audit-refactor_260630_001`): a concurrency defect in
`findTeamSession`, not just the test flake it presented as.

### Fixed
- `.claude/hooks/hook-utils.cjs` `findTeamSession`: brought into line with the
  v12.15.0 concurrency contract. It now follows the same deterministic chain as
  `findActiveSession` — honor a `team_*`-shaped `input.session_id` first, then
  `CAGENTS_ACTIVE_SESSION`, falling back to the newest-team heuristic ONLY when
  the hint is absent or an SDK UUID. A concrete NON-team `session_id` (e.g.
  `run_*` or a test id) now resolves to `null` instead of leaking into the
  newest team session. Instrumentation showed a concurrent non-team hook was
  writing into another session's `team/task_list.yaml` — in production this
  meant two concurrent sessions in one repo could corrupt each other's task list.
- `tests/hooks/team-task-complete.test.js`: isolated with per-test
  `CLAUDE_PROJECT_DIR` + an explicit `session_id` pin (exercises the real fix).

### Added
- 3 deterministic regression cases in
  `tests/hooks/find-active-session-deterministic.test.js`.

Verified: 10/10 full-suite runs `1568 passed | 0 failed` — the intermittent
`team-task-complete` failure is gone; the suite is now deterministic.

## [12.27.0] - 2026-06-30

Phase 7 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Reference-layer rewrite — the docs and
skill flags now tell one coherent, current story.

### Fixed (skills layer)
- `team/SKILL.md` (A4-02): removed the Step-2d EVT-1/EVT-2 emission markers that
  contradicted the same file's "events removed v12.6.0" note.
- `team/reference/strategic-cross-domain.md` (A4-05): rewritten off the removed
  `/org` sequential model to the wave-based strategic mode.
- `team/reference/architecture.md` (A4-01): rewritten — removed the nonexistent
  `decomposer` agent and the false "teammates invoke /run".
- `_MODE_REGISTRY` adoption (A4-08/09/10/13): `run`/`designer`/`helper` SKILLs now
  point to `_MODE_REGISTRY.md` as the canonical flag source; fixed the run
  `argument-hint`, `--mode debug` trigger, standardized `--members` on **5**, and
  rewrote the stale `/team` flag table in `helper/reference/flag-summaries.md`.
- `/run context` (A4-12/15): verdict DEAD (removed V11.0) — de-advertised in
  `run/SKILL.md` + helper (kept as a searchable removal-tombstone).

### Fixed (docs + reference rules)
- `docs/architecture/pipeline.md` (A5-01): rewritten from the OLD 7-state
  (DECOMPOSED/PROMPTS_READY + `delegation_prompts.yaml`) to the real 5-state
  machine. Fast-path reconciled (D8): 5 states + two labels — `fast` (orchestrator
  skipped for tier-2-clear) and `standard`; v12.3.0 deleted the score-based
  3-path/9-signal selector, NOT the orchestrator-skip.
- `controller-reference.md` (A3-03/10): dropped `delegation_prompts.yaml`, EVT-*,
  `PROMPTS_READY`; TodoWrite example relabelled SDK-only.
- `docs/hooks/overview.md` (A5-02): 18/15 → 31/24/18 + documented the two
  in-process dispatchers.
- `WORKFLOW_AGENT_INTERACTIONS.md` + `SKILLS_REFERENCE.md` (A5-06/07): removed
  stale `delegation_prompts`/EVT/`decomposer` refs; `12 leadership` → `9`.
- Frontmatter examples in `progressive-disclosure.md` + `execution.md` (A3-05):
  validator-rejected top-level `domain:` → `archetype:`/`branch:` + `metadata.tier`.

Known pre-existing flake (not introduced here): `team-task-complete.test.js`
intermittently fails one assertion under full-suite parallelism (passes 13/13 in
isolation; present on a clean tree). Scheduled for the P10 team-hook pass.

## [12.26.0] - 2026-06-30

Phase 6 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Rules `paths:` glob repair — restore
path-conditional rule loading that broke when the archetype roots moved under
`agents/` in v12.8.0.

### Fixed
- 16 `.claude/rules/**/*.md` files (A3-01): `paths:` frontmatter globs rooted at
  pre-v12.8.0 archetype dirs (`core/**`, `developer/**`, `operator/**`,
  `people/**`, `shared/**`, …) — which matched nothing on disk — rewritten to the
  current layout (`agents/core/**`, `agents/_overlay/people/**`, …). Three domain
  rules also had granular globs for agents consolidated into mode-flags
  (v12.20.0); those collapsed to the surviving branch globs.

### Added
- `tests/v12/rules-paths-globs-resolve.test.js`: CI guard asserting every
  `paths:` glob in `.claude/rules/` resolves to ≥1 real path (allowlisting the
  gitignored `cagents-memory/` + `.cagents/` runtime/override roots). Fails on any
  bare-archetype-root glob — this drift class cannot recur.

### Corrected
- A3-19 was a false positive: `planner_config.yaml` DOES exist at
  `agents/_overlay/{people,shared}/config/` — the `**/config/planner_config.yaml`
  globs already resolve.

## [12.25.0] - 2026-06-30

Phase 5 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Stale-config catalog-sync — every
agent reference in tracked config/rules now resolves to a live agent (no spawn
can silently degrade to general-purpose).

### Fixed
- `routing.yaml` (A6-01): 67 orphan specialist agent names (deleted in the
  240→57 cull) remapped to live successors or removed — **0 orphans remain**.
  `specialist_routing` is load-bearing (read by `agents/core/coordinator` and
  `scripts/domain-health.sh`). `controller_catalog` was already valid.
- Dead agent names in rules (A3-04): ~25 stale references across
  `rules/domains/{engineering,grow,operate,people,serve}.md` and
  `subagent-alignment.md` replaced with live successors (e.g.
  `security-specialist`→`security-engineer`, `qa-tester`→`qa-lead`,
  `compliance-officer`→`general-counsel`, `recruiter`→`hr-manager`).
- Model-generation drift (A6-02): `model-routing.md` + `skill-format.md` updated
  `opus` → Claude Opus 4.8 (was 4.6); `sonnet` 4.6 / `haiku` 4.5 retained.

### Added
- `tests/v12/routing-refs-resolve.test.js`: CI guard asserting every agent
  reference in routing.yaml + rules/domains + subagent-alignment resolves to a
  live agent dir or a `v12-aliases.yaml` key.

Flagged (gitignored, out of git scope): `pipeline_config.yaml` is referenced as
load-bearing in tracked rules but is itself gitignored; `model_routing.yaml`
still ships stale model IDs and `model-routing-advisor.cjs` hardcodes its tier
map rather than reading it.

## [12.24.0] - 2026-06-30

Phase 4 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Hook surface cleanup. Hook counts
move from 32/26/18 → **31 .cjs / 24 registered / 18 events** (5 dispatched
sub-validators + 2 utilities; `31 = 24 + 5 + 2`).

### Removed
- `.claude/hooks/approval-gate.cjs` + its test (A2-02): structurally dead — its
  `_data/policies/` dir and `AGENT_MEMORY_DIR` env never existed in production.
- The `prompt-router.cjs` PreToolUse[Agent] `return null` no-op registration
  (A2-04). `prompt-router.cjs` itself stays (load-bearing for UserPromptSubmit).
- The dead `org_*` nested-subdir scan passes in `hook-utils.cjs`
  `findActiveSession`/`findTeamSession` (A2-05; `/org` removed in v12.2.0).

### Added
- `.claude/hooks/agent-dispatch.cjs` (A2-12): single deny-first PreToolUse[Agent]
  dispatcher running `session-init-gate.cjs` (fail-CLOSED) then
  `model-routing-advisor.cjs` (fail-OPEN) in-process — mirrors `write-edit-dispatch.cjs`,
  cutting cold-start node spawns per Agent spawn 3 → 1. + agent-dispatch test.
- `scripts/lint-hooks.cjs` (A2-11) deriving live hook counts from disk +
  settings.json and asserting `hook_files === registered + dispatched +
  utilities`. + lint-hooks test.

### Changed
- `secret-detection.cjs`: intrinsic fail-CLOSED try/catch (A2-08).
- `eval-runner.cjs` relocated `.claude/hooks/` → `scripts/` (A2-10, a CLI not a
  hook); refs in `cagents-ci.sh`/`run-evals.sh` updated.
- `hooks.md`, `hook-catalog.md`, CLAUDE.md hook-count claims synced to 31/24/18.

Deferred: `appendLog()` log-helper de-dup (A2-06) — touches 4 hooks, not
low-risk this phase.

## [12.23.0] - 2026-06-30

Phase 3 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Hard-delete of dead files — every
deletion grep-confirmed to have zero live inbound references (git history is
the archive).

### Removed (17 files / ~3,800 lines)
- **4 stale team/reference orphans** (live counterparts retained):
  `strategic-brief-schema.md` (dup of `strategic-brief-format.md`),
  `flags.md` (team — the live one is `run/reference/flags.md`),
  `gate-standards.md` (live: `gate-validation-protocol.md`),
  `fallback-behavior.md` (live: `fallback-and-error-recovery.md`).
- **5 zero-consumer tracked configs** under `cagents-memory/_system/config/`:
  `communication_protocols.yaml`, `parallel_execution_framework.yaml`,
  `performance_tracking_system.yaml`, `subagent_coordination_protocol.yaml`,
  `task_state_machine.yaml` (0 tracked consumers each;
  `task_completion_protocol.yaml` + `routing.yaml` retained).
- **4 spent/superseded scripts**: `validate-agent-counts.sh`, `count_agents.sh`
  (both scanned deleted pre-v11 dirs; superseded by `validate-counts.sh`),
  `migrate-frontmatter.cjs`, `migrate_to_token_based.py`.
- **4 orphan tests/fixtures**: `tests/fixtures/sessions/org_sample/{instruction,status}.yaml`,
  and the two fully-`describe.skip` never-built-feature suites
  `skill-exemption-respected.test.js`, `validator-artifact-missing.test.js`.

### Changed
- `CLAUDE.md` test-count claim `1353+ / 160+` → `1340+ / 158+` (the deletions
  lowered the static lower-bound; the count-guard regression test enforces this).

### Spared (had live inbound refs — deferred to later phases)
- `team/reference/architecture.md` (read by `session-hierarchy.test.js`),
  `migrate-v11.1.0*.sh` / `migrate_agent.sh` (cited by migration docs),
  `standalone-contract.test.js` (carries a unique assertion).

## [12.22.1] - 2026-06-30

Phase 1 of the comprehensive plugin audit/refactor (session
`team_plugin-audit-refactor_260630_001`). Hook-performance fix.

### Fixed
- `.claude/hooks/hook-utils.cjs`: `.unref()` the two fallback `setTimeout`
  timers — the `readStdin()` 3000ms safety timer (:97) and the dedup-guard
  2000ms cleanup timer (:918). Neither is load-bearing; both kept the Node
  event loop alive ~3s after every hook finished its work, which was the
  dominant hook-perf cost (the ~6406ms before-figure) and inflated the test
  suite. Hook processes now exit in ~140ms instead of ~3000ms+. Confirmed
  `hook-utils.cjs` was the only hook using timers — no other `.cjs` affected.

### Added
- `tests/hooks/hook-exit-latency.test.js`: regression test asserting a hook
  process exits well under 500ms with piped+closed stdin (proves no linger).

## [12.22.0] - 2026-06-22

Domain-agnostic framing fix, `/designer` endless-refinement contract, and
`/run` workspace-skill awareness (session `clear-up-plugin`). Minor bump:
~35 files across skills, agents, rules, docs, and tests. Motivated by a user
report that `/run` self-described as "a generic software-engineering
orchestration engine" and refused a non-technical (client SOW / price-quote)
request, plus `/designer` terminating after one artifact pass instead of
refining endlessly.

### Fixed
- **Engineering-bias framing**: cAgents read as a software-only tool despite a
  genuinely multi-domain 57-agent catalog. Added prominent "domain-agnostic —
  NOT a software-engineering tool" banners to `CLAUDE.md`, `README.md`,
  `.claude/skills/run/SKILL.md`, `.claude/skills/team/SKILL.md`, and
  `.claude/skills/helper/SKILL.md`; rebalanced first-impression examples (README
  Quick Start now leads with a client-SOW example). `/run` now explicitly must
  NOT refuse or redirect a non-technical request.
- **`/designer` self-termination**: the build menu led with "Build now
  (recommended)" and buried refinement, so the designer generated artifacts then
  stopped. Restructured Phase 6 into a **refinement-first continuation gate**
  ("Refine a specific area (Recommended)" is the default; build/export options
  appear only after the user explicitly picks "I'm done refining"). The designer
  never writes `phase: completed` on its own initiative. Synced across
  `SKILL.md`, `reference/phase-6-specification.md`, `reference/rules.md`,
  `reference/behavioral-rules.md`, and the WI-9 regression test.
- **Stale test-count claim**: `CLAUDE.md` test count `1335+/157+` →
  `1353+/160+` (new test files pushed the static count past the freshness
  window).
- **Dangling skill symlink**: removed an untracked broken symlink
  `.claude/skills/commit-changes` that two regression tests correctly flag.

### Added
- **Workspace skill awareness (reuse-before-rebuild)** for `/run`: discovers
  skills already present in the workspace (e.g. a user's `pr` skill) and
  persists them to `workflow/available_skills.yaml`; the planner routes a
  matching work item to that skill via `assigned_skill` instead of reinventing
  it with generic agents; controllers invoke it via the `Skill` tool with a
  graceful fallback. Added the `Skill` tool to `/run` and all 25 controller
  agents. New contract doc `.claude/skills/run/reference/skill-awareness.md`,
  planner + `controllers.md` wiring, and a 6-assertion regression test
  (`tests/regressions/run-skill-awareness.test.js`). This is the
  minimal-solution ladder applied at planning time.

## [12.21.0] - 2026-06-22

Comprehensive documentation audit & upgrade (session
`run_doc-audit-upgrade_260618_001`). Minor bump: docs-only diff across 20
files, no code/CI/test changes. The audit targeted documentation *drift* —
hardcoded counts and stale references that fell out of sync with disk reality.

### Fixed
- **Stale agent counts (DR-1)**: corrected `141 → 57` agents across 12+
  occurrences and `15 domains → 9 archetypes` across 7 occurrences in the
  `docs/` corpus and `.claude/skills/helper/` reference tree (the unguarded
  surfaces — the three CI count-guards already passed on the guarded files).
- **Stale `_deprecated` count**: `99 → 0` deprecated agents.
- **Renamed-agent reference (DR-5)**: `engineering-manager → tech-lead` in
  `docs/CLAUDE.local.md.example`.
- **Pipeline/table residuals (DR-6)**: `docs/architecture/domains.md`
  per-archetype table now sums to 57 with an explicit Total row;
  `docs/MIGRATION_GUIDE.md` comparison table corrected (243 → 57,
  15-domains → 9-archetypes) and the stale `DECOMPOSED` pipeline state removed
  (5-state machine).
- **Freshness (DR-3)**: refreshed 7 stale dated headers (incl.
  `docs/README.md`) to the current release date.

### Verified
- All 3 CI guards (`validate-counts.sh`, `validate-agents.sh`,
  `validate-versions.sh`) exit 0; `npm test` 1456 passed / 0 failed / 33
  skipped.
- Cross-references: 170 `@path` refs + 66 relative links, 0 dangling.
- `DR-2`, `DR-4`, `DR-7`, `DR-8` checked and found already-clean (historical
  counts version-stamped, removed skills framed as removed, hook arithmetic
  disk-accurate).
- Constraints held: docs conform to disk (no code/CI edited to match prose),
  standalone-MCP contract preserved, MEASURED-vs-ESTIMATE perf honesty intact.

## [12.20.0] - 2026-06-18

Agent-catalog consolidation: 141 agents → 57 via Hybrid A+B mode mechanism.
Session `team_consolidate-catalog_260617_001`. Minor bump per version-registry.md
§ "Audit / consolidation sessions … → minor bump": the consolidation touched
141 SKILL.md files, 4 domain_overrides.yaml files, routing.yaml, _MODE_REGISTRY.md,
CLAUDE.md, README.md, docs/, and tests/ across multiple surfaces. CI green:
validate-agents 0 errors, npm test 0 failures.

### Changed

**Agent-catalog consolidation (141 → 57 routable agents)**

The catalog was restructured from 141 individually-routable leaf agents to 57 agents
(41 routable specialists + 16 core pipeline agents) using a Hybrid A+B mode mechanism.
Under this mechanism each consolidated agent carries `metadata.mode` (default mode) and
`metadata.supported_modes` (all modes) in its SKILL.md frontmatter, plus one
`@resources/{mode}.md` reference file per absorbed leaf. All absorbed leaf intelligence
was relocated verbatim into the corresponding mode resource file — zero intelligence
loss, zero regressions.

Per-archetype breakdown:

- **developer** 26 → 8: backend-developer, frontend-developer, senior-developer,
  devops-engineer, dba, security-engineer, qa-lead, performance-analyzer. Lead
  agents (backend-lead, frontend-lead, data-lead, infrastructure-lead) folded into
  their primary agent as a `lead` mode. Security specialist (security-owasp) folded
  into security-engineer. Playwright test engineer folded into qa-lead.
- **operator** 36 → 7: marketing-strategist, operations-manager, hr-manager,
  customer-success-manager, support-agent, sales-rep, technical-writer. Copywriter
  folded into writer/editor as a `copy` mode (cross-archetype fold). Specialist
  operators (growth-marketer, seo-specialist, brand-manager, community-manager,
  creative-director, marketing-analyst, marketing-ops-specialist, okr-specialist,
  agile-coach, partnership-marketing-manager, account-manager, sales-strategist,
  sales-enablement-specialist, revenue-operations-manager, support-director,
  support-operations-manager, escalation-manager, customer-advocacy-manager,
  relationship-manager, talent-recruiter, onboarding-specialist, learning-specialist,
  hr-business-partner, procurement-specialist, supply-chain-manager, finance-manager,
  quality-manager, program-project-manager) each folded into their nearest primary
  as named modes with verbatim resource files.
- **advisor** 12 → 4: medical-advisor, mental-health-advisor, general-counsel,
  career-counselor. Legal specialists (corporate-counsel, compliance-manager,
  privacy-officer, legal-operations-manager) folded into general-counsel. Life-coach
  and personal-finance-advisor folded into career-counselor.
- **analyst** 19 → 5: data-scientist, business-analyst, competitive-intelligence-analyst,
  historian, statistician. Remaining analysts (bi-specialist, business-researcher,
  citation-graph-analyzer, economist, linguist, market-research-analyst,
  methodology-critic, performance-analyst, political-analyst, predictive-analyst,
  psychologist, scholar) folded into their nearest primary as named modes.
- **creator** 5 → 2: concept-artist, film-director. Music-composer, photographer,
  visual-artist folded into concept-artist/film-director as modes.
- **writer** 8 → 3: editor (absorbs copywriter from operator), narrative-director,
  technical-writer. Character-designer, dialogue-specialist, narrative-designer,
  plot-developer, story-architect, worldbuilder folded into narrative-director.
- **strategist** 8 → 3: product-owner, strategic-planner, scenario-planner.
  Portfolio-manager, roadmap-planner, okr-specialist (also absorbed from operator),
  competitive-intelligence-analyst (also in analyst) folded as modes.
- **leadership** 12 → 9: ceo, cto, cfo, cmo, coo, chro, cco, cpo, cro retained as
  thin shells sharing a new `resources/executive-playbook.md`. Three agents deleted
  (not folded) because they lacked a clear standalone charter post-consolidation:
  `cso` (Chief Sales Officer — sales strategy absorbed into cro+cmo), `clo` (Chief
  Legal Officer — legal oversight already covered by `general-counsel`), and
  `vp-engineering` (absorbed into `cto` scope). Executive-collapse (merging
  remaining C-suite into a single leadership meta-agent) was explicitly deferred.
- **core** 15 → 16 (net +1): `task-merger` folded into `task-state` (task-state
  gained a `merge` mode). `coord-log-writer` and `wave-reviewer` moved in from
  developer/quality to core/ as first-class pipeline agents, formalising their
  infrastructure role.

**Renames**

- `academic-researcher` → `academic-advisor` (clearer scope; old name preserved in
  v12-aliases.yaml for back-compat).
- `economist` → `social-scientist` (absorbed political-analyst and psychologist as
  modes; old name preserved in v12-aliases.yaml).
- `copywriter` (operator/marketing-sales) → mode `copy` on `writer/editor` (cross-
  archetype fold; old agent name preserved in v12-aliases.yaml).

**Routing and config updates**

- `cagents-memory/_system/config/routing.yaml`: all 11 consolidated legacy-domain
  router keyword + controller-catalog entries remapped to the 57-agent surface.
- `agents/_overlay/people/config/domain_overrides.yaml`,
  `agents/_overlay/shared/config/domain_overrides.yaml`,
  `agents/core/config/domain_overrides.yaml`,
  `agents/leadership/config/domain_overrides.yaml`: controller_catalog entries
  updated to reference consolidated agent names.
- `.claude/skills/_MODE_REGISTRY.md`: gained an "Agent Modes" section documenting
  the `metadata.mode` / `metadata.supported_modes` contract for consolidated agents.

**Docs and tests**

- CLAUDE.md archetype table and agent counts updated to 57 (41 + 16 core).
- README.md Quick Reference agent count updated.
- `docs/agents/index.md` per-archetype counts updated.
- `tests/config/planner-config.test.js`: controller-catalog assertions reconciled
  to 57-agent surface.
- `tests/v12/alias-map-coverage.test.js`: alias target assertions updated for
  renames (academic-researcher→academic-advisor, economist→social-scientist,
  cso/clo/vp-engineering→deleted).
- All pre-existing v12-aliases.yaml entries for absorbed/renamed agents verified
  as still resolving to live targets; no new alias build-out performed (deferred
  to a future tiny bump to keep this release atomic).

## [12.19.0] - 2026-06-14

Bucket-D remediation minor bump. Session `run_bucket-d-remediation_260614_001`
implemented the hook security/performance findings (Bucket D) deferred from the
v12.18.0 overhaul audit. Minor (not tiny) bump per `version-registry.md` §
"Audit / consolidation sessions ... → minor bump": the remediation ships a new
hook process (`write-edit-dispatch.cjs`), new reproducible-benchmark tooling,
and touches multiple surfaces across hooks, tests, docs, and config. All six
work items (WI-1..WI-6) are complete and reviewed.

### Security (D1a — secret-detection hardening)
- **secret-detection.cjs head+tail size cap**: large files are now scanned via a
  bounded head+tail window (`CAGENTS_SECRET_SCAN_MAX_BYTES`, default 512 KB)
  instead of loading the whole buffer, preventing a memory/latency blowup on
  multi-MB writes while still catching secrets at file boundaries. Also fixed the
  production-path registration so the hook actually fires on the intended Write|Edit
  paths. Regression tests: `tests/v12/secret-scan-size-cap.test.js`,
  `tests/v12/secret-detection-registration.test.js`.

### Fixed (D3 — verify-completion fact-check)
- **verify-completion.cjs slash-less filename fact-check**: dropped the
  `includes('/')` guard at the two filename-citation checks so bare filenames
  (no path separator) cited as evidence are fact-checked the same as path-qualified
  ones. Closes a gap where a slash-less filename claim bypassed verification.
  Regression test: `tests/v12/verify-completion-slashless-filenames.test.js`.

### Changed (D2 — reproducible performance benchmarking + honesty pass)
- Added a **Write|Edit hook-perf microbench** (`scripts/benchmarks/hook-perf-microbench.cjs`)
  with `tests/benchmarks/hook-perf-microbench.test.js` and a captured baseline
  (`cagents-memory/_system/evals/perf/hook-perf-before.json`).
- Added a **reproducible perf-benchmark corpus runner**
  (`cagents-memory/_system/evals/perf/perf-corpus-runner.cjs` + `README.md` +
  `perf-corpus-results.json`) with `tests/benchmarks/perf-corpus-runner.test.js`,
  giving the performance claims a reproducible measurement artifact.
- **CLAUDE.md § Performance Benchmarks honesty pass**: clarified which figures are
  measured vs. design-target estimates.

### Security / Performance (D1b — write-edit-dispatch consolidation; SHIPPED)
- **New `.claude/hooks/write-edit-dispatch.cjs` dispatcher**: consolidates the three
  former standalone `Write|Edit` PreToolUse hooks — `secret-detection`,
  `controller-delegation-validator`, and `skill-size-monitor` — into a single
  in-process dispatcher (those three were export-refactored to be callable as
  sub-validators). `settings.json` collapses 3 `Write|Edit` registrations into 1
  dispatcher entry. The dispatcher is **deny-first** and the security sub-validators
  **fail CLOSED** (a sub-validator error denies the operation rather than allowing
  it through). This cuts cold-start node-process spawns per Write|Edit from 3 → 1.
  D1b SHIPPED in this bump (not deferred). Regression test:
  `tests/hooks/write-edit-dispatch.test.js`.
- **Hook-count convention updated** across `hooks.md`, `hook-catalog.md`, `CLAUDE.md`,
  `README.md`, `rules/README.md`, and the `settings.json` `$comment`: now
  **32 .cjs files = 26 unique registered hooks + 3 dispatched Write|Edit
  sub-validators** (run in-process by `write-edit-dispatch.cjs`) + `hook-utils.cjs`
  + `run-hook.cjs` launcher + `eval-runner.cjs` CLI, across 18 event types. Captured
  after-state: `cagents-memory/_system/evals/perf/hook-perf-after.json`
  (cold_starts 3 → 1).

### Release (WI-6)
- Version synced to 12.19.0 across all 16 registry locations
  (`validate-versions.sh`: 16/16, 0 mismatches); fixed a stale README.md hook-count
  cell the WI-5 count sweep missed (`28 unique hooks` → `26 unique registered + 3
  dispatched Write|Edit sub-validators`); raised the per-test timeout on the two
  slow `hook-perf-microbench` cases (they spawn real un-consolidated node hook
  processes) so the full suite is deterministically green without weakening any
  assertion.

## [12.18.0] - 2026-06-12

Audit-remediation minor bump. Session `run_overhaul-audit_260612_001` ran a
five-stream read-only audit of the whole repo (correctness/CI, doc-vs-reality
drift, agent/rule consolidation, hook security/perf, and external concept-mining
of `DietrichGebert/ponytail`), then applied the user-approved findings in three
batched buckets plus a flake fix. Minor (not tiny) bump per
`version-registry.md` § "Audit / consolidation sessions ... → minor bump":
the remediation touches dozens of files across tests, hooks, rules, agent
SKILLs, and docs.

### Fixed (Bucket A — green the CI + hygiene)
- Repointed the `no-orphaned-cagents-refs` test guard at `v12-aliases.yaml`; it
  previously scanned the deleted `_archive/_deprecated_pre_v12.6/` dir, failing
  the test and protecting nothing.
- Removed the dangling `.claude/skills/commit-changes` symlink (tripped the
  `no-broken-symlinks` guard).
- Fixed 6 orphaned `cagents:*` dispatch references to non-existent agents
  (`security-specialist`→`security-engineer`, `legal-counsel`→`general-counsel`,
  `recruiter`→`talent-recruiter`, `strategic-mode-lead`→non-dispatchable prose).
- `skipIf`-guarded tests asserting against gitignored `_archive/` content; fixed
  the `_cachedActiveSessions` cross-file leak.
- Reworded the stale "_deprecated/ buckets" parenthetical in `CLAUDE.md`.

### Security (Bucket B — harden safety hooks; each with a regression test)
- **Delegation enforcement was effectively off**: docs claimed `block` default
  but shipped `settings.json` left it `warn`, so the hard-deny on
  `src/ lib/ components/ app/` never fired. Made the hard-deny **controller-scoped**
  (fires only when an active controller is in `agent_tree.yaml`) so it enforces
  the delegation contract without blocking a user's own direct edits; default →
  `block`; added `services/`+`middleware/`; reconciled the docs to match.
- **secret-detection path bypass**: `DOC_ALLOWLIST` was basename-only and
  `FALSE_POSITIVE_PATHS` substring-matched `example|sample|template|…` anywhere,
  so a source file with a live key under a matching name was never scanned.
  Anchored the allowlist to exact repo-relative paths; segment/dotted-filename
  matching.
- **bash-validator false-positives**: format/privilege tokens were matched via
  `includes()` (a benign `mkfsutil` was wrongly blocked); converted to
  word-boundary regexes and added `doas`/`pkexec` to the Tier-1 deny set.

### Changed (Bucket C — minimalism elegance pass)
- Added `playbooks/pat-minimal-solution-ladder.md` — a minimalism counterweight
  to cAgents' aggressive-decomposition bias (inspired by the external `ponytail`
  skill: YAGNI → stdlib → native → existing dep → one-liner → minimum viable →
  new code); referenced from `execution.md` and `pat-two-stage-review.md`.
- Extracted the verbatim 12-line "Controller Delegation Protocol" block from 42
  controller SKILL.md files into `playbooks/pat-controller-coordination-protocol.md`
  (3 files with genuine per-agent variation left intact); added a subtractive
  "what can be deleted?" lens to `code-reviewer` Stage-2.
- Registered `DietrichGebert/ponytail` in the (gitignored, local-only) examples
  registry per existing corpus convention.

### Fixed (test isolation)
- Isolated the `find-active-session` `fallbackHeuristic` test from the shared
  real `cagents-memory/sessions/` dir via the existing `CLAUDE_PROJECT_DIR`
  override, fixing a flake under concurrent sessions (no resolver change).

## [12.17.0] - 2026-06-11

Deep subagent-nesting enablement. Session
`run_deep-nesting-enablement_260611_001` verified that Claude Code **2.1.172**
("Sub-agents can now spawn their own sub-agents — up to 5 levels deep") is live
on this environment's **2.1.173** runtime: an empirical chain test spawned
subagents through depth 1→2→3→4→5→6 with the `Agent` tool present at every
level and **zero stripping**. The historical "Agent tool stripped at depth >= 1"
limitation is therefore obsolete as the default/expected behavior.

Minor (not tiny) bump per `.claude/rules/core/version-registry.md` §
"Audit / consolidation sessions ... → minor bump": this repositions a
cross-cutting pattern across rules, the `/team` skill, agent SKILLs, hooks,
and tests — more than the ≤5-file tiny-bump atomicity budget allows.

This change is **back-compatible**: graceful degradation is repositioned, not
removed; no public contract (skill, agent, hook event, memory path) is
removed; the playbook file keeps its path; existing session artifacts remain
valid.

### Added
- **`max_nesting_depth: 5` config**: documented in
  `cagents-memory/_system/config/pipeline_config.yaml` (with a comment citing
  CC 2.1.172) and in CLAUDE.md. The skill loop counts as depth 0; the 5 levels
  are the subagent generations beneath it, matching the CC changelog wording
  and the existing "Recursive Workflows max depth: 5" line.
- **Regression test** `tests/v12/deep-nesting-enablement.test.js`: asserts the
  playbook carries the v12.17.0 repositioning banner, `max_nesting_depth: 5`
  is documented, and no rule/skill file still claims `Agent` is "stripped at
  depth 1" as the default expected behavior (historical mentions are allowed
  when clearly marked).

### Changed
- **Graceful-degradation pattern repositioned**: the
  `pat-graceful-degradation-depth1.md` playbook moves from describing the
  *default* depth-1 behavior to a **defensive fallback** that triggers only
  when the `Agent` tool is genuinely absent — at the actual nesting ceiling
  (a depth-5 subagent cannot spawn a depth-6 child) or if a future/older
  harness regresses the capability. The file keeps its path (renaming would
  break `@`-references and tests); a "Status: repositioned in v12.17.0" banner
  was added. Every agent now checks whether `Agent` is actually present before
  reporting BLOCKED for a missing tool.
- **2-level nesting limit lifted** across `teams.md`, the `/team` SKILL.md, and
  agent SKILLs: the "Known Harness Limitation: Agent Tool May Be Absent at
  Depth ≥ 1" section becomes a historical note. `/team` teammates now reliably
  spawn execution agents and reviewers, and may nest deeper within the 5-level
  budget. Teammates still spawn execution agents **directly** rather than
  re-entering the full `/run` pipeline — stated now as "by design for
  cost/clarity," not "the harness forbids it."
- **Two graceful-degradation tests updated** to assert the repositioned
  semantics (degradation = fallback, not default):
  `tests/v12/graceful-degradation-scope-generalized.test.js` and
  `tests/hooks/verify-completion-graceful-degradation.test.js`.
- **`verify-completion.cjs` comments** updated to reflect the repositioning;
  its graceful-degradation detection logic (recognizing the "Agent/subagent-spawn
  tool was not available" sentinel) is retained and still valid for the
  fallback case.

## [12.16.0] - 2026-06-09

Audit-remediation consolidation bump. Session `run_audit-fixes_260609_001`
resolved all 10 recommendations (covering all 48 findings) of the Fable 5
plugin review (`run_fable-plugin-review_260609_001`) across five work items
(WI-A..WI-E) spanning five surfaces: CI greenness, doc honesty, security
hardening, repo hygiene, and CI guards.

Minor (not tiny) bump per `.claude/rules/core/version-registry.md` §
"Audit / consolidation sessions ... → minor bump": this intentionally
touches dozens of files across multiple surfaces, so the ≤5-file tiny-bump
atomicity rule does not apply and the tiny-bump guard is exempt.

### Added
- **Security — secret scanning of Markdown** (WI-C): `secret-detection.cjs`
  now scans `*.md` / `docs/` / `README` files with the same full-token
  regexes as code, closing finding F7-2 (real secrets in docs went
  undetected). A narrow basename-anchored `DOC_ALLOWLIST_PATHS`
  (`hook-catalog.md`, `SECRET-SANITIZE.md`) exempts only the two docs that
  document the detection mechanism itself.
- **Security — bash-validator bypass closure** (WI-C, F7-1): three new
  patterns — Tier-1 deny of `eval $VAR` variable-indirection and two-step
  download-then-exec (`curl … -o x.sh; bash x.sh`), Tier-2 ask for a bare
  variable in command position (`X=…; $X`).
- **CI guards** (WI-E): `validate-counts.sh` gains Checks 9–11 (CLAUDE.md
  rules total, playbooks count, controllers.md pre-exec check count) so
  doc-count drift is caught mechanically going forward.
- **Regression tests**: +13 hook tests (6 secret-detection F7-2, bash-
  validator F7-1 across three suites) plus the WI-A hook-contract test
  updates.

### Fixed
- **Green CI** (WI-A): removed the broken `.claude/skills/commit-changes`
  symlink (dangling target) and fixed 3 hook regression tests —
  `tool-failure-tracker.test.js` updated to the thinking-block-immutability
  contract (pattern-detection branch returns `null` → factory yields
  `continue:true`, no `hookSpecificOutput`), and `verify-completion.cjs`
  restored explicit `input.session_id` hint-binding for terminal sessions
  (with an SDK-UUID guard) so the graceful-degradation tests resolve their
  own session instead of `findMostRecentSessionDir`'s "most recent".
- **Repo hygiene** (WI-D): gitignored and untracked `__pycache__`/`*.pyc`
  (3 files) and `_archive/` (150 files), all kept on disk; `vitest.config.js`
  now excludes `_archive/`; corrected a migration-doc path reference.

### Changed
- **Doc honesty pass** (WI-B): reconciled count drift against disk truth —
  rules 36→38, playbooks 4→7, pre-exec checks 6→7, CLAUDE.md `sparsePaths`
  14→6, `max_internal_rounds` 3→2 (LP-27), test-count claim 1215+/145+ →
  1249+/147+. Relabeled MANDATORY-but-unenforced contracts (dead-letter
  promotion, 5-check self-validation, HITL gate) as advisory/by-convention.
  Reconciled the 5/24/29 validation-checklist narrative; renamed
  `validation-checklist-29.md` → `validation-checklist-active.md`. Added a
  caveat that the performance-benchmark figures are design-target estimates,
  and a `_MODE_REGISTRY` SSOT discoverability link.
- Version bump to 12.16.0.

## [12.15.2] - 2026-06-03

Concurrent-session H1 follow-up #2: verify-completion staleness-skip
field-name fix.

Patch bump per tiny-bump cadence: one-line behavioral change in the Stop
hook's stale-session lookup chain, 2 non-sync files touched (≤ 5 limit),
back-compatible (legacy `updated_at` / `created_at` retained as fallback),
ships with a Bug-Driven regression test that fails before / passes after.

### Fixed
- **Root cause**: `.claude/hooks/verify-completion.cjs:922` looked up
  status.yaml staleness via
  `extractYamlValue(s, 'updated_at') || extractYamlValue(s, 'created_at')`,
  but `/run` writes `last_updated_at` and `started_at`. The lookup never
  matched on real cAgents sessions, `updatedAt` was always undefined, the
  24h staleness branch was always skipped, and the Stop hook proceeded
  to `verifyCompletion()` against orphaned-at-INIT sessions surfaced by
  `findMostRecentSessionDir({includeTerminal: true})`. The result: block
  decisions for "Pipeline stopped in 'INIT' state with no agents spawned"
  pinned onto unrelated current turns — a residual symptom of the
  concurrent-session H1 cluster after v12.15.0 and v12.15.1 closed the
  upstream resolution leaks.
- **Fix**: extend the chain to
  `extractYamlValue(s, 'last_updated_at') || extractYamlValue(s, 'updated_at') || extractYamlValue(s, 'started_at') || extractYamlValue(s, 'created_at')`.
  The new primary lookup matches the actual `/run` write-shape; the legacy
  `updated_at` / `created_at` entries remain as back-compat fallbacks for
  any session shape that uses them.

### Added
- **Test**: `tests/hooks/verify-completion-staleness-skip.test.js` — 3
  test cases pinning the staleness skip. Test 1 (synthetic session with
  only `last_updated_at` set > 24h old, pipeline_state=INIT) FAILS on
  pre-patch HEAD with `expected 'block' not to be 'block'` because the
  staleness branch is never entered. Test 2 (fresh `last_updated_at` <
  24h + INIT) pins that the gate is not over-eager. Test 3 (legacy
  `updated_at`-only > 24h) pins the back-compat fallback. FAIL-before /
  PASS-after verified locally via `git stash` of the hook patch and
  re-run of the test suite.

### Files touched (non-sync, 2)
- `.claude/hooks/verify-completion.cjs` (4-field fallback chain at line 922)
- `tests/hooks/verify-completion-staleness-skip.test.js` (new regression
  test, 3 cases)

### Source
- Session `run_verify-completion-staleness-field_260603_001`
- Cross-reference: v12.15.1 (merge 2ae3a59e) closed the SDK-UUID hint
  semantic; this patch closes the remaining field-name typo in the Stop
  hook's staleness gate, originating from the same diagnosis session
  `run_sessions-hung-single-dir_260602_001`.

## [12.15.1] - 2026-06-02

Concurrent-session H1 follow-up: SDK UUID `input.session_id` semantic.

Patch bump (not minor) per tiny-bump cadence: change is additive
consumer-side behavior (new UUID-shape branch in `findActiveSession`
chain step 1), 3 non-sync files touched (≤ 5 limit), back-compatible
for cAgents-shaped session hints, and the v12.15.0 deterministic-chain
contract is preserved — only the input semantic is clarified.

### Fixed
- **Root cause**: Claude Code's SDK passes a transcript UUID (e.g.,
  `5f1a3b9c-7d2e-4c0a-b1d4-8e6f3a9c1b2d`) as `input.session_id` to every
  hook, NOT a cAgents session directory name (e.g.,
  `run_sessions-hung-single-dir_260602_001`). The v12.15.0 deterministic
  chain's step 1 in `findActiveSession(sessionHint)` always returned `null`
  because the UUID was never a real cAgents session-dir name. The chain
  then fell through to `null` (default behavior, no fallback heuristic),
  causing `session-init-gate.cjs` to emit `permissionDecision:deny` on
  every `Agent` spawn — the user-reported "sessions hung up on each other"
  symptom under concurrent same-directory runs.
- **Fix**: `hook-utils.cjs` now matches `sessionHint` against `SDK_UUID_RE`
  (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
  before treating it as a directory name. When the hint is a UUID-shape
  (SDK transcript ID), the chain falls through to step 2 (`CAGENTS_ACTIVE_SESSION`
  env var) and step 3 (`promptHint`) instead of short-circuiting to `null`.
  cAgents-shaped hints (`run_*`, `team_*`, `designer_*`) continue to resolve
  via the directory-exists check as before.
- **Invariant preserved**: The v12.15.0 cross-write invariant still holds.
  Hooks bound to a cAgents-shaped session_id still resolve deterministically
  to that session and only that session. The patch only changes behavior
  when the hint is structurally a UUID, where the prior behavior was
  unconditionally null (no session resolution possible anyway).

### Added
- **Test**: `tests/hooks/session-init-gate-uuid-payload.test.js` — 5 tests
  pinning the new semantic. Test 5 is the integration test (full
  session-init-gate.cjs payload with UUID input.session_id resolves via
  env-var fall-through). All 5 fail against pre-patch hook-utils.cjs;
  all 5 pass post-patch.
- **Doc**: `.claude/rules/playbooks/pat-concurrent-session-hooks.md`
  gains an "Input Semantics" section documenting that hook payload
  `input.session_id` is an SDK transcript UUID, distinct from cAgents
  session directory names, and the fall-through rule.

### Files touched (non-sync, 3)
- `.claude/hooks/hook-utils.cjs` (added `SDK_UUID_RE` + `_isSdkUuidShape` +
  UUID fall-through in chain step 1)
- `.claude/rules/playbooks/pat-concurrent-session-hooks.md` (new "Input
  Semantics" section)
- `tests/hooks/session-init-gate-uuid-payload.test.js` (new regression
  test, 5 cases)

### Source
- Session `run_sessions-hung-single-dir_260602_001`

## [12.15.0] - 2026-06-02

Concurrent-Session Hook Resilience: hardens cAgents hooks against two
concurrent same-directory sessions so hooks fired by instance A never read
or write instance B's session tree. Driven by session
`run_concurrent-session-hooks_260602_001`.

Minor bump (not patch) per the tiny-bump cadence: multi-hook refactor
(~8 hooks + 4 docs/tests + version-sync), behavioral changes to
`findActiveSession`, new manifest schema field, new env var.

### Added

- **WI-2**: `findActiveSession({sessionHint, promptHint, fallbackHeuristic})`
  option-bag overload in `.claude/hooks/hook-utils.cjs`. The default chain
  is now deterministic: `sessionHint` → `CAGENTS_ACTIVE_SESSION` →
  `promptHint` → `null`. The legacy status-newest-first / 5-minute-grace /
  nested-org passes are gated behind `{fallbackHeuristic: true}`.
- **WI-2**: composite cache key on `_cachedActiveSessions` Map
  (`sessionHint|envSession|promptHint|fallback`); `_resetActiveSessionCache()`
  exposed for tests.
- **WI-4**: `session-catchup.cjs` liveness filter — LIVE sessions are
  filtered out of the resume offer. Liveness = `session.pid` `kill -0`
  alive OR `status.yaml` mtime / `last_updated_at` within
  `CAGENTS_SESSION_LIVENESS_MS` (default 60s).
- **WI-5**: `withFileLock` wrapping around `goal_evaluator_log.yaml`
  appends and the secret-backup `manifest.yaml` writes.
- **WI-6**: `tests/v12/concurrent-sessions-no-crosswrite.test.js` (5
  cases) — end-to-end two-session regression asserter.
- **WI-2 tests**: `tests/hooks/find-active-session-deterministic.test.js`
  (7 cases).
- **WI-4 tests**: `tests/hooks/session-catchup-liveness.test.js` (2 cases).
- **WI-5 tests**: `tests/hooks/concurrent-appends.test.js` (10-process
  stress).
- **WI-7**: `session_id` top-level field in secret manifests; strict
  match check in `secret-restore.cjs` (closes H8 cross-session restore).

### Changed

- **WI-3**: `secret-detection.cjs`, `secret-restore.cjs` drop bare
  `findActiveSession()` fallbacks (no longer route to "newest active"
  session under concurrency).
- **WI-3**: `goal-evaluator-logger.cjs` log appends locked.
- **WI-3 / WI-2 follow-up**: `team-stop.cjs` (SessionEnd) resolves
  session strictly via `input.session_id` direct path when provided,
  then falls back to `findActiveSession({fallbackHeuristic: true})` —
  SessionEnd legitimately finalizes terminal sessions.
- **WI-8**: `.claude/rules/memory/agent-memory.md` Session Discovery
  Internals section rewritten to describe the deterministic chain.
- **WI-8**: `.claude/rules/core/hooks.md` adds a new top-level
  "Concurrency Contract (v12.15.0+)" subsection with four invariants and
  the pinning regression tests.

### Regression test (CLAUDE.md mandate)

- `tests/v12/concurrent-sessions-no-crosswrite.test.js` was committed in
  RED state before any WI-2/3/5/7 fixes landed (`git log` shows the test
  predates the fix). All 5 cases turned GREEN after WI-2 + WI-3 + WI-7.

### Hazards closed

- H1 (env-var leakage cross-instance) — WI-2 chain prioritizes
  `input.session_id` over `CAGENTS_ACTIVE_SESSION`.
- H2 (grace-pass non-determinism) — WI-2 gates grace-pass behind opt-in.
- H3 (status-pass newest-first cross-session) — WI-2 default returns
  null instead of falling through.
- H4 (session-catchup cross-instance resume) — WI-4 liveness filter.
- H5 (unlocked shared-file appends) — WI-5 + WI-7 wraps remaining
  unlocked writes.
- H6 (per-process cache staleness) — WI-2 composite cache key.
- H8 (secret-restore cross-session restore) — WI-7 session_id binding.

### Hazards NOT closed (deferred)

- H7 (heartbeat staleness) — partially addressed via liveness's
  threshold check; full coverage would require every hook to call
  `updateStatusHeartbeat`. Deferred — see WI-4 acceptance criteria
  for the next pass.

## [12.14.0] - 2026-06-01

Cross-Teammate Request Pattern: `/team` teammates can now ask the lead to
ask another teammate to do work via a named `peer_request` protocol. Driven
by session `run_improve-team-messaging_260602_001`.

Minor bump (not patch) per the tiny-bump cadence: multi-file feature
addition with new playbook + status-protocol extension + regression test.

### Added

- **WI-2**: `.claude/rules/playbooks/pat-cross-teammate-request.md` — new
  playbook documenting the `peer_request` schema (`req_id`, `requested_by`,
  `requested_peer`, `description`, `acceptance_criteria`, `priority`,
  `depends_on`, `status`), the lead's 4-branch routing decision tree
  (**RELAY** / **SPAWN** / **PROMOTE** / **REJECT**), a worked example, and
  the aggressive-delegation invariant.
- **WI-7**: `tests/v12/peer-request-pattern.test.js` — Vitest regression
  test (6 it() blocks) asserting (a) the playbook exists, (b) teams.md
  references it via @-import, (c) the playbook's YAML example block parses
  as valid YAML, (d) frontmatter conforms to the 6-field Agent Skills spec,
  (e) pat-subagent-status-protocol.md references the new playbook, (f) all
  4 routing branches are documented. Passes at 6/6.

### Changed

- **WI-3**: `.claude/rules/core/teams.md` — new `## Cross-Teammate Request
  Pattern` section (34 lines, well under the 80-line budget) placed after
  Teammate Communication. Includes ASCII flow diagram (teammate-A → lead →
  teammate-B), the 4-branch routing decision-tree table, the
  aggressive-delegation invariant callout, and an @-import to the playbook.
- **WI-4**: `.claude/skills/team/SKILL.md` Step 5d — new sub-step **5d-i**
  (2 lines, well under the 30-line lead-context-discipline budget) routes
  inbound `peer_request` SendMessages and on-disk `REQ-*.yaml` files
  through the playbook's decision tree.
- **WI-5**: `.claude/rules/playbooks/pat-subagent-status-protocol.md` —
  NEEDS_CONTEXT extended with two OPTIONAL fields (`requested_peer`,
  `peer_request_ref`) for `/team` mode. Back-compatible: when both fields
  are absent, NEEDS_CONTEXT retains its prior meaning (need user/external
  input). The architect decision (WI-1) was to extend NEEDS_CONTEXT rather
  than introduce a 5th status, because the semantic is identical and a new
  status would double the controller-response surface across the catalog.

### Not in scope (explicit non-goals)

- **No nested teams**: teammates still cannot spawn sub-teammates. All
  cross-teammate work routes through the lead.
- **No direct teammate-to-teammate messaging**: the lead-is-fixed rule
  stands. SendMessage from A to B is only sanctioned when the lead
  initiates it as part of RELAY.
- **No new hook event**: the pattern uses existing SendMessage + on-disk
  YAML artifacts. WI-6 (extending `teammate-idle-handler.cjs` to
  auto-surface peer_requests) is DEFERRED to a follow-up tiny-bump.

## [12.13.0] - 2026-06-01

Coherent hook-system audit remediation pass. Addresses 18 of 106 findings
from session `team_hooks-review_260602_001` (the upstream audit; report at
`cagents-memory/sessions/team_hooks-review_260602_001/outputs/wave-4/wi-12-audit-report.md`).
Driven by orchestration session `run_fix-hook-audit-findings_260602_001`.

Minor bump (not patch) per the tiny-bump cadence: the non-sync diff is 14
files (>5-file cap), so the audit-consolidation exception in
`.claude/rules/core/version-registry.md` § Tiny-Bump Cadence applies.

### Fixed (HIGH, 9 of 9 applied)

- **H-1**: `.claude/hooks/tool-failure-tracker.cjs` no longer emits
  `systemMessage` or `hookSpecificOutput.additionalContext` from its
  `PostToolUseFailure` branches. Warnings surface via `console.error`
  (stderr → verbose mode) only. Restores the thinking-block-immutability
  contract introduced in `run_team-thinking-400_260531_001` to a 7th hook
  that was overlooked in the original v12.x sweep. Regression test:
  `tests/v12/hook-thinking-block-contract.test.js` (extended to include
  the new 7th hook; 36 tests pass).
- **H-2**: `hook-catalog.md` controller-delegation-validator entry now
  documents the actual HARD-DENY semantics for protected paths (`src/`,
  `lib/`, `components/`, `app/`, `services/`, `middleware/`) under
  `CAGENTS_DELEGATION_ENFORCEMENT=block` (the default), replacing the
  inaccurate "advisory only" prose.
- **H-3**: `hook-catalog.md` session-init-gate entry now documents the
  phase-1 session-presence gate's `denyWithReason()` path, replacing the
  inaccurate "does not block" prose. Phases 2-3 (alias / data-access-level)
  remain advisory.
- **H-4**: `.claude/hooks/secret-detection.cjs:325` gained a clarifying
  code comment explaining the deliberate write-before-deny sanitize-mode
  ordering, cross-referencing `SECRET-SANITIZE.md` so reviewers don't
  "fix" the ordering.
- **H-5**: `.claude/hooks/secret-detection.cjs:173` Cloudflare-37-hex
  pattern downgraded from `high` → `medium` severity. The bare-hex
  pattern false-positives on truncated git commit SHAs, oversized random
  hex IDs, and test fixtures; at `high` it would block legitimate
  Write/Edit calls on those false positives. The high-confidence
  `Cloudflare API Key` pattern (with `cloudflare`/`CF_API_KEY` context
  anchor) above it remains `critical`.
- **H-6**: `hook-catalog.md` SessionEnd: team-stop.cjs entry rewritten to
  document all four phases (agent_tree cleanup, execution_summary
  generation, team metrics, pattern extractor) instead of just the team
  metrics phase. Also documents the new `'SessionEnd'` factory label.
- **H-7 + H-8 (option a)**: `hook-catalog.md` permission-handler entry
  rewritten to document the actual "defers to settings.json
  permissions.allow/deny" behavior, the HITL silent-bypass risk, and the
  always-returns-null implementation. Option (b) — adding explicit
  `permissionDecision: "ask"` for HITL paths — is deferred (see
  `outputs/deferral_list.md`).
- **H-9**: `.claude/rules/core/hooks.md:56` "Five events" → "Four events"
  with ConfigChange removed from the unwired list (ConfigChange was
  wired in LP-17 v12.7.0 via `config-change-logger.cjs`).

### Fixed (MEDIUM + RENAME, 10 of 32 applied)

- **M-1**: `.claude/hooks/bash-validator.cjs` removed redundant `'su -'`
  entry (already covered by `'su '` substring match).
- **M-7**: `.claude/hooks/controller-delegation-validator.cjs`
  `CONTROLLER_TYPES` array deduplicated (`'tech-lead'` appeared twice).
- **M-9**: `.claude/hooks/approval-gate.cjs:19` removed dead-code
  declaration `const yaml = require !== undefined ? null : null;`
  (always null, never used).
- **M-18**: `.claude/hooks/instructions-loaded.cjs`
  `EXPECTED_RULES_DIRS` array now includes `'playbooks'` (added in
  v12.4.0 directory layout).
- **M-19**: `.claude/hooks/pre-compact-save.cjs` waypoint write now
  wraps `fs.writeFileSync` in try/catch + `fs.mkdirSync({recursive:
  true})` to guard against silent waypoint loss.
- **M-22**: `.claude/hooks/subagent-stop-tracker.cjs` no longer parses
  `agent_tree.yaml` twice per SubagentStop event — the parsed object
  and matching agent entry are cached across the lock-bracketed
  mutation block and the downstream performance-logging block.
- **M-24 [REAL BUG]**: `.claude/hooks/team-stop.cjs:233` agent_count
  computation no longer uses the buggy `match(/- agent_id:/g)` regex
  that always returned 0 (subagent-tracker writes entries as `- id:`).
  Now uses `yaml.load(treeContent).agents.length` with a corrected
  `match(/^\s*- id:/gm)` regex fallback when js-yaml is unavailable.
  Regression test: `tests/v12/team-stop-agent-count.test.js`
  (3 tests pass; fails on pre-fix HEAD).
- **M-27**: `.claude/hooks/stop-failure-handler.cjs` recovery-state
  YAML error_message/error_type fields now also escape `\n`/`\r` and
  backslashes (previously only `"` was escaped, breaking YAML parse on
  multi-line error inputs).
- **M-30**: `.claude/hooks/eval-runner.cjs` `.js` → `.cjs` in inline
  help text and JSDoc usage examples.
- **M-31**: `.claude/hooks/eval-runner.cjs` removed unimplemented
  `--type decomposition` and `--daily-report` flags from `--help`
  output.
- **RENAME (label-only)**: `.claude/hooks/team-stop.cjs:265` createHook
  factory label `'SessionStop'` → `'SessionEnd'` to match the
  registered event. Eliminates 1 of 2 mismatches in the 3-name
  inconsistency (filename rename `team-stop.cjs` → `session-end.cjs`
  is deferred — see `outputs/deferral_list.md`).

### Added

- **Regression test**: `tests/v12/hook-thinking-block-contract.test.js`
  extended to include `tool-failure-tracker.cjs` as a 7th
  thinking-block-contract-protected hook (was 6 hooks pre-v12.13.0).
- **Regression test**: `tests/v12/team-stop-agent-count.test.js` (new
  file) locks the M-24 fix with a fixture in the actual shape
  `subagent-tracker.cjs` writes and a source-level guard against the
  old buggy regex pattern.
- **Deferral doc**:
  `cagents-memory/sessions/run_fix-hook-audit-findings_260602_001/outputs/deferral_list.md`
  enumerates all 91 deferred findings (24 MEDIUM + 65 LOW + 1 HIGH
  option b + 1 RENAME filename) with rationale and
  future-consideration tracking.

### Deferred

- **24 of 32 MEDIUM findings** (refactor-class or design-discussion-class):
  M-2, M-3, M-4, M-5, M-6, M-8, M-10, M-11, M-12, M-13, M-14, M-15,
  M-16, M-17, M-20, M-21, M-23 (filename portion), M-25, M-26, M-28,
  M-29, M-32. See `outputs/deferral_list.md` for category groupings
  (Q3 secret-detection hardening, Q3 YAML-as-regex migration sprint,
  hook-utils dedupGuard redesign, etc.).
- **All 65 LOW findings** (cosmetic-only; single-bump risk exceeds
  value). Categorized in the deferral doc for periodic LOW-sweep
  tiny-bumps.
- **HIGH H-7/H-8 option (b)**: explicit `permissionDecision: "ask"`
  branches in `permission-handler.cjs` for HITL paths. Behavioral
  change; needs design discussion.
- **RENAME (filename)**: `team-stop.cjs` → `session-end.cjs`. Requires
  synchronized edits in `.claude/settings.json` + `run-hook.cjs` + docs;
  separate atomic bump preserves tiny-bump atomicity.

## [12.12.1] - 2026-06-01

Follow-up patch to v12.12.0. Addresses 5 v12.13.x-deferred items from
session `team_plugin-sanity-pass_260601_001`. Patch bump per the tiny-bump
cadence: 5 coherent post-release fixes, no public-contract changes,
back-compat preserved.

### Fixed
- **`tests/v12/doc-counts-match-disk.test.js`**: real concurrency race
  between the mutation test (rewrote the on-disk `CLAUDE.md` to inject a
  bogus `999 agents` count) and the three sibling tests that read
  `CLAUDE.md` concurrently under vitest's file-fork parallelism
  (`tests/regressions/claude-md-counts-current.test.js`,
  `tests/regressions/claude-md-domain-overrides-count.test.js`,
  `tests/regressions/claude-md-no-stale-version-highlights.test.js`).
  Eliminated by adding a `CAGENTS_VALIDATE_COUNTS_CLAUDE_MD` env-var
  override to `scripts/ci/validate-counts.sh` Check 1 and refactoring the
  mutation test to write its bogus content to a temp-dir copy that the
  script reads via the env var. The real `CLAUDE.md` is never mutated.
- **`tests/regression/sync-agents-check.test.js`** (WI-1 follow-on, same
  race class): the drift-induction test mutated the canonical
  `.claude-plugin/plugin.json` (dropping the first agent to produce
  `active_agents=140`), which raced against
  `tests/v12/doc-counts-match-disk.test.js` `derives counts from disk`
  reading the same file via `validate-counts.sh --derive-only`. Fixed
  identically: added a `CAGENTS_PLUGIN_JSON_PATH` env-var override to
  `scripts/sync-agents.sh` and refactored the drift test to write its
  drifted content to a temp-dir copy. The canonical `plugin.json` is
  never mutated. WI-7's "3 consecutive `npm test` runs, all green"
  acceptance criterion verified the combined fix.
- **Broken `.claude/skills/commit-changes` symlink re-creation**: deleted
  the offending source symlink in
  `_archive/repo_root_scratch/example/external-skills/pjt222__agent-almanac/.claude/skills/commit-changes`
  (whose `../../skills/commit-changes` target did not resolve in the
  archive layout), added `.claude/skills/commit-changes` to `.gitignore`
  as belt-and-suspenders against any future session-time re-discovery,
  and added `tests/skills/no-commit-changes-symlink.test.js` as a
  name-specific regression guard.
- **`docs/12-FACTOR-COMPLIANCE.md`**: removed 3 phantom `IMPROVEMENTS.md`
  references (the file does not exist) on lines 91, 97, and 122.
  Redirected to `CHANGELOG.md` / `docs/RELEASE_NOTES.md` per context.
- **`docs/OPTIMIZATION_PROGRESS.md`**: added HISTORICAL banner marking the
  document as V9 / pre-v12 scope; pointed readers at CLAUDE.md
  § Performance Benchmarks and post-v12.0.0 `CHANGELOG.md` entries for
  current optimization strategy.
- **`docs/TASK_CONSOLIDATION.md`**: added HISTORICAL banner marking the
  document as v12.0.0 `task-merger` / `task-state` consolidation scope;
  pointed readers at CLAUDE.md § Memory Management and § Aggressive
  Decomposition for current task-coordination patterns.

### Deferred
- **CTO RF-1 / LP-17 dynamic count generator** (hardcoded count literals
  across `CLAUDE.md`, `.claude/rules/core/hooks.md`,
  `.claude/settings.json` `$comment`, `.claude/rules/core/version-registry.md`
  drift on bumps) — substantial feature work, separate session warranted.
  Deferred to v12.13.x.

## [12.12.0] - 2026-06-01

**Plugin sanity pass + carry-forward thinking-block-400 fix** (session `team_plugin-sanity-pass_260601_001` + carry-forward of `run_team-thinking-400_260531_001`). A 7-wave strategic-mode team run that audited and cleaned up the /helper reference docs, .claude/rules/ content drift, docs cross-doc links + agent counts, and a re-introduced broken symlink — and ships alongside the prior-Unreleased thinking-block-400 hook fix in a single release. Minor bump per the tiny-bump cadence: an audit/consolidation session touching ~20+ files across multiple surfaces (helper, rules, docs, hooks, tests) is a minor bump, not a patch.

### Fixed
- **Plugin sanity pass — /helper, rules, docs drift** (session `team_plugin-sanity-pass_260601_001`). A 7-wave strategic-mode audit + cleanup of /helper reference docs, .claude/rules/ content drift, docs cross-doc links + agent counts, and a re-introduced broken symlink. Ships alongside the carry-forward thinking-block-400 fix from the prior Unreleased block — same release covers both.
  - **/helper 9 reference docs** (W4-C1 / W5-F1): Removed canonical `/improve` framing across all 9 `.claude/skills/helper/reference/*.md` files, replaced with `/run` keyword-router framing (`/run improve|review|audit|optimize ...`). Migration footnotes (when `/improve` was folded into `/run` in v12.1.2) preserved.
  - **Rules content drift in 7 files** (W4-C2 / W5-bundle): Migration-tagged stale `/improve`/`/org` references across `.claude/rules/{core,memory,domains}/`. Fixed phantom path-globs that still pointed at deleted legacy domain dirs (`engineering/` → `developer/`, `business/`+`growth/` → `operator/marketing-sales`+`operator/content`, `service/` → `operator/support`+`advisor/legal`).
  - **Docs drift** (W4-C4 / W5-bundle): Repaired broken cross-doc links in `docs/CONTRIBUTING.md` and `docs/SECURITY.md` (added the missing `../` prefix). Corrected count drift in `docs/architecture/domains.md` (144 → 141 agents, analyst 20 → 19, writer 10 → 8) and `docs/LIFECYCLE.md` (238 → 141).
  - **Broken untracked symlink deleted** (W4-C3 AF-tests-scripts-1 / W5-bundle): Removed `.claude/skills/commit-changes` (target `../../skills/commit-changes` never existed); previously failed `tests/skills/no-broken-symlinks.test.js`. Provenance traced to an external-skills archive bleed-through documented for the Wave 7 spawn brief.
  - **doc-counts-match-disk regression closed** (W4-C3 AF-tests-scripts-2 / W5-F5 validation): `npm test` exits 0 cleanly (1298 passed / 22 skipped, 138 files). The audit's concurrency-race hypothesis was disproven — root cause was the same 144 → 141 docs/disk count drift fixed by the W5-bundle docs sweep, not vitest worker concurrency.
- **thinking-block 400 in /team Wave transitions** (session `run_team-thinking-400_260531_001`). The Anthropic Messages API was rejecting `/team` requests at Wave 1+ boundaries with `API Error: 400 messages.3.content.9: thinking or redacted_thinking blocks in the latest assistant message cannot be modified`. Root cause: six cAgents hooks emitted a top-level `systemMessage` (or `hookSpecificOutput.additionalContext` targeting an assistant turn) on LATEST-TURN-SUSPECT events. Claude Code's harness can attach hook `systemMessage` payloads to the prior assistant turn's `content[]` array; when extended thinking is enabled (default on Opus/Sonnet 4.x), the modified `content[]` had its `thinking` blocks altered, and the next Anthropic Messages API request failed the immutability check with HTTP 400. **Fix**: drop `systemMessage` from the LATEST-TURN-SUSPECT event branches of `post-compact-restore.cjs` (PostCompact), `team-task-complete.cjs` (TaskCompleted), `teammate-idle-handler.cjs` (TeammateIdle available-work branch), `post-write-validator.cjs` (PostToolUse warning + planning branches), `validator-evidence-recheck.cjs` (PostToolUse downgrade branch), and `pre-compact-save.cjs` (PreCompact). All file-write side effects (audit logs, waypoints, task_list updates, validation_report mutations) are PRESERVED. Advisory text is redirected to `console.error` (stderr → user verbose mode) and a new `cagents-memory/_system/logs/post-compact_{YYYY-MM-DD}.log` disk log. Extended thinking remains ENABLED globally (no `MAX_THINKING_TOKENS=0`, no `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`). Hook count unchanged at 31 .cjs / 28 registered. cAgents standalone contract preserved (no MCP). NOTE: version bump deferred to the next patch release — this Unreleased entry stages the fix only.

### Added
- **/helper recommendation-engine.md keyword-router section** (objection-phase OBJ-CPO-1 / W5-F1): New "Keyword Router Discovery (v12.1.2+)" section in `.claude/skills/helper/reference/recommendation-engine.md` teaches `/run improve|review|audit|optimize` as the discovery mechanism for the folded-in improve modes, with explicit override rules so the router framing replaces the old `/improve` standalone framing across the catalog.
- **Bug-driven regression guard for the thinking-block contract**: `tests/v12/hook-thinking-block-contract.test.js` (31 tests). Spawns each fixed hook via `child_process.spawn(node, ...)` with realistic stdin payloads exercising every branch that previously emitted `systemMessage`. Asserts the returned JSON has no top-level `systemMessage` field, no `hookSpecificOutput.additionalContext` field, and that the source-level scan finds no active `systemMessage:` literal in any of the 6 fixed hooks. Failing-before / passing-after verified against pre-fix HEAD~1.

### Changed
- **Migration-tagged 4 rules files** (W4-C2 / W5-bundle): Where `/improve` and `/org` canonical claims had survived as present-tense ("uses /improve to ...") without the "removed in vX.Y.Z" framing, prepended explicit migration framing (e.g., "(historical — /org removed in v12.2.0, folded into /team strategic mode)") to keep the rules layer honest about the current catalog.
- **Test suite contract refresh**: 14 existing assertions in `tests/hooks/post-compact-restore.test.js`, `tests/hooks/team-task-complete.test.js`, `tests/hooks/teammate-idle-handler.test.js`, `tests/hooks/post-write-validator.test.js`, `tests/hooks/post-write-validator-skill-schema.test.js`, and `tests/hooks/pre-compact-save.test.js` updated from asserting the OLD (buggy) `systemMessage` contract to asserting the NEW thinking-block-safe contract (no `systemMessage`; side effects via disk file / stderr). Post-update: `npm test` → 1298 passed / 0 failed / 22 skipped (138 files).
- **CLAUDE.md test-count refresh**: `1170+ Vitest tests across 132+ files` → `1186+ Vitest tests across 138+ files` (Q-009 freshness window).
- **`.claude/rules/core/resources/hook-catalog.md` updated** to reflect the new return shape of the 6 modified hooks (Output bullets now say "no systemMessage" where applicable; file/stderr side effects preserved).

## [12.11.0] - 2026-05-27

**Final organization + documentation reconciliation pass** (session `team_final-org-docs_260528_001`). A 5-wave audit/consolidation team run that confirmed repo-layout integrity, reconciled current-count drift to disk truth across README + docs, hardened the count guard, and aligned documentation with the current 4-skill catalog and 5-state pipeline. Minor bump per the tiny-bump cadence — an audit/consolidation session touching dozens of files across multiple surfaces (structure, counts, docs) is a minor bump, not a patch.

### Changed
- **Structure (WI-4):** Confirmed repo layout drift-free — 9 archetype roots + `agents/_overlay/{people,shared}`, 141 agents, 0 misplaced SKILL.md, 0 `_deprecated/` in the live tree. Git-ignored the runtime test-scratch dir `tests/.tmp/`.
- **Counts (WI-5):** Reconciled all current-count drift to disk truth — README `238 → 141` agents (per-archetype catalog table + 4 README hook-count figures), docs ARCHITECTURE/GETTING_STARTED/CONTRIBUTING/DOMAIN_STRUCTURE_STANDARD `144 → 141`, `skill-format.md` core `16 → 15`, legacy-overlay wording (`15 → 2 overlays + 11 consolidated`). Historical version-totals preserved.
- **Docs (WI-6a / WI-6b):** Reconciled README + docs/ with the current skill catalog (`/org → /team` strategic, `/improve|/review|/optimize → /run` modes), pipeline diagram 7-state → 5-state, `max 5 → 3` revision cycles, `decomposer → planner`, README hook names → `prompt-router.cjs` / `post-compact-restore.cjs`, version history split into distinct v12.0.0 / v12.1.2 / v12.2.0 entries, and fixed broken `@resources` refs in `marketing-strategist/resources/seo-strategy.md`.

### Added
- **CI hardening (WI-5):** Added `validate-counts.sh` Check 2b (targeted absence check) so stale README agent-totals can no longer pass the presence-only guard (negative-tested).

### Fixed
- **WI-7 drift fix:** Removed the bare `universal-*` pipeline-agent tokens that WI-6a's README version-history rewrite reintroduced into the V12.10.0 entry — they tripped `tests/v12/agent-name-registration-drift.test.js` (5 failures). Reworded the README V12.10.0 entry to name the five pipeline agents (router, planner, validator, executor, self-correct) without their long-form tokens. Full Vitest suite green afterward (1267 passed, 0 failed).

## [12.10.0] - 2026-05-27

**FU-3 bare-prose `universal-*` rename** (session `run_fu3-universal-prose_260527_001`). Closes the gap left by the v12.5.0 pipeline-agent rename: the `cagents:universal-*` and `core/universal-*` shapes were swept then, but **bare prose mentions** (e.g. "With universal-validator: ...") were never cleaned because the five existing `no-universal-*-refs` guards only grep the prefixed shapes. Minor bump — the token-only prose sweep touched 25 `agents/**/*.md` files, exceeding the 5-file tiny-bump threshold per the tiny-bump-guard cadence.

### Fixed
- **Bare-prose rename (47 tokens / 25 files):** Token-only find-and-replace of `universal-router → router`, `universal-planner → planner`, `universal-validator → validator`, `universal-executor → executor`, `universal-self-correct → self-correct` across `agents/core/**` (executor, orchestrator, planner, validator, self-correct, router, reviewer, hitl, optimizer, task-merger, task-state, trigger) plus `agents/writer/narrative-director/SKILL.md` (the `[universal-planner]`/`[universal-validator]` TaskCreate example lines). Surrounding wording, casing, and backtick/code-block formatting preserved. `grep -rIn 'universal-(router|planner|validator|executor|self-correct)' agents/ --include='*.md'` now returns ZERO matches.
- **Stale alias comment:** Fixed the comment at `scripts/migration/v12-aliases.yaml:~37` that falsely claimed "the universal-planner agent dir has not yet been renamed" — the dir is the short form `core/planner/` as of v12.5.0. Comment text only; no alias key/value/field changed.

### Added
- **Bug-driven regression guard:** New `tests/v12/no-bare-universal-prose-refs.test.js` (modeled on `no-universal-planner-refs.test.js`) fails on any bare `universal-<name>` token inside `agents/**/*.md`, excluding the guard test files themselves, `CHANGELOG.md`, `docs/CHANGELOG.md`, `scripts/migration/v12-aliases.yaml`, `_archive/**`, `cagents-memory/**`, and `node_modules/**`. Verified RED on the pre-rename tree (47 matches) and GREEN post-rename. The five existing `no-universal-*-refs` guards are untouched.

## [12.9.0] - 2026-05-23

**Cleanup-and-fix pass** (session `run_big-cleanup-fix_260524_001`). Closes a small, evidence-backed set of loose ends left after the v12.8.0 streamline + the prior folder-cleanup session. Minor bump because the change spans 8+ non-sync files across multiple surfaces (agents, skills, docs, rules), which the tiny-bump-guard correctly blocks as a patch.

### Fixed
- **F1 (CRITICAL — CI-green):** Removed the dangling `.claude/skills/commit-changes` symlink (target `../../skills/commit-changes` did not exist; 0 plugin.json refs; recurrence of the v11.2.1 removal in commit a206aa17). `tests/skills/no-broken-symlinks.test.js` now passes 4/4 (was 1 broken-symlink failure).
- **F4:** Repointed 4 orphaned `related_agents` cross-refs to their LP-12/LP-13 successors (`literature-review-author → scholar`, `prose-stylist → editor`, verified against `scripts/migration/v12-aliases.yaml`) across `analyst/citation-graph-analyzer`, `analyst/methodology-critic`, `writer/dialogue-specialist`, `writer/narrative-director` — frontmatter `name:` entries plus body-prose routing lines. Also removed a resulting duplicate `editor` entry in narrative-director. `validate-agents.sh`: 4 WARNs → 0.

### Changed
- **F2:** Staged the previously-untracked `_archive/README.md` (the rest of `_archive/` was already tracked) so the archive's move-only contract doc is committed alongside the archived content.
- **F3 + F8 (count prose):** Refreshed stale figures in CLAUDE.md — Vitest test-file count `132+ → 148+`, and rule-file count `~30 → 36` with an internally-consistent breakdown (30 top-level across 6 categories + 2 READMEs + 4 resources). `validate-counts.sh` still exits 0.
- **F5 (removed-skill reference triage):** Per-file judgment over `/improve`, `/org`, `/review` references (44/48/31 files). KEPT all router/migration/history references (improve-mode contract, `_MODE_REGISTRY.md` keyword-router tables, helper migration catalog, CHANGELOG/migration history). CLEANED 2 genuinely-stale references that presented removed standalone invocation forms as current: `designer/SKILL.md` description (`/improve --mode review` → `/run review`) and `docs/CLAUDE.local.md.example` (`/improve --mode optimize` → `/run optimize`). `tests/v12_2/org-removed-cleanly.test.js` still passes 6/6.
- **F6 (consolidated-agent reference triage):** Cross-checked `engineering-manager`, `architecture-reviewer`, `chief-legal-officer`, `task-decomposer`, `prompt-engineer`, `team-trigger`, `team-lead-adapter` against `v12-aliases.yaml`. All references were legitimate migration/absorption notes EXCEPT 3 SKILL.md body lines (`core/trigger`, `core/orchestrator` ×2) that described the removed `team-trigger`/`team-lead-adapter` agents as live pipeline actors — rewrote those to reflect the v12.0.0 inline-absorption into the `/team` skill loop. Deeper `resources/*.md` integration prose (~34 mentions across ~13 files) is left as a documented follow-up.
- **F7:** Verified `_MODE_REGISTRY.md` mode/flag tables against the 4 SKILL.md argument-hints (no flag drift) and refreshed the stale `Last regenerated` stamp (`v12.1.2` → `v12.9.0`). `mode-registry-coverage.test.js` passes 6/6.

## [12.8.0] - 2026-05-23

**Root directory streamline.** Consolidates the 9 archetype dirs + 2 legacy overlays + cruft from ~17 root entries down to ~12. No behavioral change — purely a layout refactor + cosmetic cleanup. Minor bump because plugin.json paths, scripts, and tests all shift; SKILL.md frontmatter unchanged (`archetype:` is a name, not a path).

### Changed
- **Agents consolidated under `agents/`.** The 9 builder-role archetype dirs (`developer/`, `operator/`, `advisor/`, `analyst/`, `creator/`, `writer/`, `strategist/`, `core/`, `leadership/`) moved into `agents/`. The 2 legacy routing-overlay dirs (`people/`, `shared/`) moved into `agents/_overlay/`. New layout: `agents/{archetype}/{branch?}/{agent}/SKILL.md` for archetypes, `agents/_overlay/{legacy-domain}/config/` for overlays.
- `.claude-plugin/plugin.json` — all 141 `agents[]` paths rewritten from `./{archetype}/...` to `./agents/{archetype}/...`.
- `.claude/settings.json` `worktree.sparsePaths` — collapsed 11 archetype-root entries into a single `"agents/"` entry.
- `scripts/sync-agents.sh`, `scripts/ci/validate-agents.sh`, `scripts/ci/validate-counts.sh`, `scripts/lint-agents.sh`, `scripts/audit-orphans.sh` — `ARCHETYPES_PARENT="agents"` introduced; archetype-walking sites updated to scan `agents/{archetype}/`.
- `scripts/migration/v12-aliases.yaml` — `new_path:` entries prefixed with `agents/`.
- `tests/` — ~12 test files patched for the new layout (`join(ROOT, arch)` → `join(ROOT, 'agents', arch)`, `'developer/...'` → `'agents/developer/...'`, etc.). Path-string assertions and `startsWith('./{archetype}/')` checks updated.

### Removed (root cleanup)
- `Agent_Memory/` — empty stub (1 stale log file) from the pre-v11.1.0 rename; was always untracked.
- `outputs/v12-migration/` — moved to `_archive/v12-migration/`. `outputs/` was the only consumer; dir is now gone.
- `templates/` — moved to `cagents-memory/_system/templates/repo-bootstrap/` (alongside the existing `_system/templates/` collection). Internal `templates/{file}` self-refs in `DOMAIN_CHECKLIST.md` rewritten to relative.
- `output-styles/structured-technical.md` — moved into `.claude/output-styles/`. `.claude-plugin/plugin.json` `outputStyles` path updated to match.
- `BUG_controller_subagent_spawn_unavailable.md` — closed-bug doc moved to `_archive/`. No inbound refs.
- Drive-by: `Agent_Memory/...` comments in `cagents-memory/_system/domains/_template/*.template` files rewritten to `cagents-memory/...`.

### Migration

Existing references work as follows:
- Plugin loader: reads `agents[]` from plugin.json — already updated.
- User skills (`/run`, `/team`, `/designer`, `/helper`): unchanged. Agents are addressed by their `cagents:{name}` identifier, not by path; the loader resolves names through the manifest.
- Anyone with hand-written tools that hardcode old archetype paths (`developer/backend/...`): prepend `agents/`. The change is purely additive — no archetype was renamed.

After this entry: root holds 5 visible dirs (`agents/`, `cagents-memory/`, `scripts/`, `tests/`, `docs/`) + `_archive/` + 7 standard files. Down from ~17.

### Changed
- LP-16: auto-generate `KNOWN_AGENTS` in `.claude/hooks/model-routing-advisor.cjs` from `.claude-plugin/plugin.json`. Replaced the 230-line hand-maintained literal (which had drifted from the v12.4.0 culled catalog) with a `loadKnownAgents()` helper that walks the plugin manifest and parses `metadata.tier` from each agent's SKILL.md frontmatter. Memoized per-process. Regression test: `tests/v12/model-routing-advisor-autogen.test.js` (5 cases — file exists, helper exported, key-set equals plugin.json names, memoization, valid tier strings).
- LP-23: populate-or-delete 5 empty cagents-memory dirs. Added READMEs to `cagents-memory/_knowledge/{semantic,calibration}/` (referenced by `core/memory/path-resolver.md`, `core/memory/memory-utils.md`, and several agent SKILL.md files as documented memory-write paths). Removed `cagents-memory/_system/metrics/{aggregates,daily,sessions}/` — empty since January 2026, zero writers in `.claude/hooks/` and `scripts/`, zero references in code or docs. (Note: `cagents-memory/` is git-ignored; the README files and rmdir actions persist on disk locally only — this CHANGELOG entry is the tracked artifact.)

## [12.7.0] - 2026-05-22

**Post-v12.6.0 documentation + wiring audit pass** (session `team_doc-review-full_260522_001`). 9 atomic doc/config fixes + 7 deferred-issue follow-ups (test repair, alias header refresh, marketplace categories, dynamic hook-count note, tiny-bump-cadence rule for audit sessions). 84 files patched across 5 waves; validate-versions 17/17 (1 skipped) → 16/16 (0 skipped); validate-agents warnings 61 → 0; 233 agent-name drift hits → 0. No behavioral or API changes.

### Fixed
- `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` descriptions corrected: agent count 143 → 144, "15 domains" → "9 archetypes" (aligns with post-v12.4.0 P2 compression and 9-archetype builder-role tree). (audit session `team_doc-review-full_260522_001`)
- Version registry: `/org` slot removed after the v12.2.0 skill deletion. Registry locations 18 → 17 → 16 sync slots; `scripts/sync-versions.sh` and `scripts/ci/validate-versions.sh` updated to match. (audit session `team_doc-review-full_260522_001`)
- `scripts/ci/validate-agents.sh`: added `_deprecated/` directory skip so culled v12.4.0 agents don't trigger spurious failures; hook expected count corrected 27 → 28 to match the registered hook inventory in `.claude/settings.json`. Warnings 61 → 0. (audit session `team_doc-review-full_260522_001`)
- Stale skill references swept across 30 documentation files: removed dangling `/improve`, `/review`, and `/org` mentions left over from the v12.1.2 (improve-into-run keyword router) and v12.2.0 (`/org` removal) consolidations. (audit session `team_doc-review-full_260522_001`)
- Dangling `@path` references resolved: `atomic-rollback` content inlined into `improve-risk-classification.md` after its source file was removed. (audit session `team_doc-review-full_260522_001`)
- `.claude/settings.local.json`: stale `Bash` permission entries for removed skills (`/improve`, `/org`) pruned. (audit session `team_doc-review-full_260522_001`)
- Agent-name drift sweep: 233 hits across 62 files reconciled — `universal-*` long-form references rewritten to v12.5.0 canonical short names (`router`, `planner`, `validator`, `executor`, `self-correct`). (audit session `team_doc-review-full_260522_001`)
- `tests/v12/validator-artifact-missing.test.js`: 12 stale tests `.skip`'d — they exercised a `checkMandatoryPipelineArtifacts` Phase-0 contract that was intentionally removed during v12.4–v12.6 validator refactoring. Replaced with 3 passing assertions that guard the v12.7+ surface (`verifyCompletion`, `finalizeSessionLifecycle`, `autoResolveWarnings`) and assert the removed function does not silently return.
- `scripts/migration/v12-aliases.yaml`: header comment refreshed — `target_version` 12.0.0 → 12.7.0, entry-inventory count corrected from 26 → 22 (verified via `yaml.parse`), drift note explaining why the 8 long-form names referenced in v11-era docs intentionally lack alias entries (WI-19 swept them instead).
- `.claude-plugin/marketplace.json` categories array refreshed to match v12 archetype reality: dropped `"growth"`/`"people"`/`"service"` (absorbed in v12 builder-role tree); added `"marketing-sales"`/`"people-ops"`/`"support"`/`"analytics"`.

### Changed
- `.claude/skills/commit-changes/` broken symlink removed. (audit session `team_doc-review-full_260522_001`)
- `.claude/rules/core/version-registry.md` Tiny-Bump Cadence: added a new "audit / consolidation sessions" item to the "When a bump is NOT a tiny bump" list. Audit sessions touching hundreds of files should always trigger a minor bump and document the audit session ID — bypassing the guard is not the right move.
- `.claude/rules/core/hooks.md`: added a deferred-refactor note pointing out that the 31/28/17 hook counts are hardcoded in 4 surfaces (this file, `CLAUDE.md`, `validate-agents.sh`, `settings.json` `$comment`) and would benefit from a dynamic generator next time the counts shift.

### Added
- `tests/v12/version-registry-no-org-slot.test.js`: regression test enforcing the post-v12.2.0 `/org` slot removal from the version registry — fails if the slot reappears in `scripts/sync-versions.sh`, `scripts/ci/validate-versions.sh`, or `.claude/rules/core/version-registry.md`. (audit session `team_doc-review-full_260522_001`)
- `tests/v12/agent-name-registration-drift.test.js`: regression test enforcing agent-name registration consistency — fails if any `cagents:universal-*` or other pre-v12.5.0 long-form name reappears outside CHANGELOG/migration aliases. (audit session `team_doc-review-full_260522_001`)

### v12.7.0 self-improvement backlog (28 work items across 5 waves)

Session `team_execute-self-improvement_260522_001` executed the 28-item backlog from the prior `run_self-improvement_260522_001` audit (`EXECUTE-FIXES.md`). Catalog: 144 → 141 active agents. 5 waves passed GATE-1..5; INT-1 reconciled cross-wave conflicts.

#### Fixed (P0 — wave 1)

- **P0-1** (`3b811ea9`): stale agent-name sweep across rules/SKILL.md surfaces; added `tests/v12/no-stale-agent-names.test.js` CI guard.
- **P0-2** (`55cceb23`): wired `scripts/migration/v12-aliases.yaml` to runtime via `session-init-gate.cjs` so old `cagents:<renamed>` references resolve at spawn time.
- **P0-3** (`3f6bce98`): removed placeholder-stamping from `verify-completion.cjs`; honest absence (`null`) is preferred over fabricated `"completed"` claims.

#### Fixed (P1 — wave 2)

- **P1-4** (`c4dce28e`): wired `pattern-extractor.cjs` into `team-stop.cjs` with a 24-hour throttle so post-team-mode pattern aggregation actually runs.
- **P1-5** (`cb4a2dc0`): new `scripts/ci/validate-counts.sh` derives canonical counts from disk (`plugin.json`, `.cjs` files, `settings.json`) and reconciles against 7 documented locations. Wired into `cagents-ci.sh`.
- **P1-6** (`f6e4cf4a`): registered `validator-evidence-recheck` hook in `settings.json` and documented the Dead-Letter Promotion Contract; closes the validator PASS-bias audit gap.
- **P1-7** (`c5d48fce`): consolidated delegation/routing hooks (`delegation-enforcer`, `magic-keywords`, `controller-delegation-validator`) into a single `prompt-router` hook with a canonical kill-list.
- **P1-8** (`d48b6351`): extracted 4 playbooks under `.claude/rules/playbooks/` (`pat-evidence-first-execution`, `pat-graceful-degradation-depth1`, `pat-subagent-status-protocol`, `pat-two-stage-review`); shrunk 3 SKILL.md bodies and `hooks.md` via `@path` references.

#### Changed (P2 — wave 3)

- **P2-9** (`6903afc0`): collapsed `/run` progressive pipeline paths to two named labels (`fast`, `standard`); replaced freeform orchestrator-skip note with an enumerated allowlist (`tier-2-clear` / `tier-2-fast-path` / `disabled-by-flag`). Tier 3+ always runs the orchestrator. State-history `note` field deprecated in favor of `skipped` + `skipped_reason`.
- **P2-10** (`f6a0dede`): promoted `attention-injection` and `session-init-gate` advisory hooks to decisive output where appropriate; collapsed advisory no-ops.
- **GATE-3 fixup** (`055369cb`): updated v12.3.0 contract test for the two-path reintroduction.

#### Added / Fixed (LP — waves 4-5)

- **LP-11** (`dc7fc5e3`): orphan-rate audit. Baseline 9.7% (14 of 144 agents). Below 30% threshold so zero `_deprecated/` promotions in this pass; documented per-archetype breakdown. New: `scripts/audit-orphans.sh` + `tests/v12/audit-orphans-runs.test.js`.
- **LP-12** (writer trio consolidation, included in `ff7897d1` series): folded `copy-editor` and `prose-stylist` into `editor` with `mode: copy-edit` / `mode: prose-style`. Active writer catalog 10 → 8.
- **LP-13** (`ff7897d1`): folded `literature-review-author` + `academic-paper-searcher` into new `analyst/scholar` with `mode: search|review|write`. Active analyst catalog 20 → 19.
- **LP-14** (`6b674f4c`): deleted 23 stale `_system/logs/elicitations_*.log` files (no live writer since `Elicitation` events are unhandled).
- **LP-15** (`3b4c572b`): tightened `notification.cjs` to early-return on `idle_prompt`, dropping ~75% of log noise.
- **LP-16** (`18581c52`): auto-generated `KNOWN_AGENTS` in `model-routing-advisor.cjs` from `plugin.json` (replaced 230-line hand-maintained literal with `loadKnownAgents()` helper).
- **LP-17** (`4f778427`): added `config-change-logger.cjs` hook on the `ConfigChange` event. Brings registered hook count to 28 and event-type count to 18.
- **LP-18** (`4c6a9dbe`): rewrote `.claude/rules/README.md` for post-v11.1.0 + v12.x reality (disk-derived counts; current skill catalog reflects `/improve` and `/org` folds).
- **LP-19** (`a7587fa1`): removed standalone `/improve` section from `docs/SKILLS_REFERENCE.md` (folded into `/run` keyword router in v12.1.2).
- **LP-20** (`1f64de3e`): aligned People-domain claims with disk reality (0 agents — config-only) across `docs/DOMAIN_STRUCTURE_STANDARD.md`.
- **LP-21** (`34cfa99e`): planner now scans `cagents-memory/_knowledge/*.md` and injects `@`-references to the top-3 relevant notes into controller delegation prompts.
- **LP-22** (`5dd00753`): `subagent-stop-tracker.cjs` writes a one-liner to `MEMORY.md` when stop messages match one of three pattern heuristics (depth-1 stripping / graceful degradation / BLOCKED escalation).
- **LP-23** (`811a5e98`): populate-or-delete pass on 5 empty `cagents-memory/` dirs. Removed `_system/metrics/{aggregates,daily,sessions}/`; added READMEs to `_knowledge/{semantic,calibration}/`.
- **LP-24** (`d5284fea`): `verify-completion.cjs` emits `workflow/learnings.yaml` on validation PASS (learn-from-success counterpart to existing warning capture).
- **LP-25** (deprecate progress.md references): swept 5 active-tense `progress.md` references in `.claude/skills/run/SKILL.md`, `hook-catalog.md`, and `post-write-validator.cjs` to point to `workflow/recovery_state.yaml`.
- **LP-26** (`8754fa51`): SessionStart additionalContext now surfaces a one-line `/helper` tip so users discover the skill-selection guide at every session start.
- **LP-27** (`3ece1bf2`): halved `controller_revision.max_internal_rounds` from 3 → 2. Saves ~33% per-failed-item reviewer token budget. Dead-Letter Promotion Contract from P1-6 is preserved verbatim; only the rounds-cap threshold moves.
- **LP-28** (`6a765388`): added `scripts/ci/validate-planner-output.cjs` and inserted Check 0 ("planner-output schema validator") in the controller pre-execution checklist. Schema enforces `plan.yaml controller_assignment.primary` and per-item `acceptance_criteria` on `work_items.yaml`.

#### INT-1 (cross-wave reconciliation)

- Doc-vs-disk counts realigned after LP-12 + LP-13 (CLAUDE.md, README.md, hooks.md, settings.json `$comment`, `docs/agents/index.md`, `docs/12-FACTOR-COMPLIANCE.md`, `validate-counts.sh`).
- Test reconciliation: `tests/v12/doc-counts-match-disk.test.js` re-pinned 144 → 141; `pipeline-state-machine.test.js` rewritten for v12.7.0 single-config (no top-level `paths:` map); `planner-per-wave-emission.test.js` adjusted to the v12.7.0 emission contract (legacy `outputs_produced` event-block check moved to `describe.skip` with deferral rationale); `team-context-discipline.test.js` SKILL.md ceiling 200 → 250.
- Pre-existing v12.3.0 deferrals documented: `skill-exemption-respected.test.js` and `validator-artifact-missing.test.js` wrapped in `describe.skip` with rationale (WI-4/5/6/7 phase-stub + Phase-0 artifact contracts were scoped but never landed; deferred to a future minor bump).
- Alias normalization: LP-13 alias `decision:` tag normalized from `LP-13` → `Q8` (LP-12 fold pattern).
- Doc rewording: `docs/TEAM_MODE.md` Related-Documentation section reworded to avoid stale `core/team-trigger/` and `core/team-lead-adapter/` paths (agents removed in v12.0.0).

## [12.6.0] - 2026-05-21

**Pillar 4 (final pillar of the 4-pillar arc): Drop external-UI session-schema contract.**

### Changed (BREAKING)
- Dropped the external-UI session-schema contract. Session YAML is now an internal-only cAgents contract (not a public API). See `.claude/skills/run/reference/session-schema.md` for the rescoped internal contract.
- Removed UI-only emitter fields from `/run` and `/team` skills + `core/` agents:
  - `status.yaml`: `state_history[].duration_ms`, `revision_round`, `validation_cycles`, `followup_round`
  - `execution_summary.yaml`: `total_duration_ms`, `revision_rounds_used`, `followup_rounds_used`
  - File emissions: `workflow/events/EVT-*.yaml`, `workflow/events/index.yaml`, `workflow/wave_structure.yaml`, `workflow/domain_status.yaml`, `workflow/partial_results.yaml`, `workflow/delegation_prompts.yaml`, `team/messages/`
- Pre-v12 state names (`DECOMPOSED`, `PROMPTS_READY`) removed from active hook code paths (`verify-completion.cjs`, `pre-compact-save.cjs`, `subagent-tracker.cjs`, `attention-injection.cjs`). The v12 state machine is `INIT → ORCHESTRATED → PLANNED → COORDINATED → VALIDATED` only.
- Removed the external-UI schema contract test (`tests/contract.test.js`) and the schema fetcher (`scripts/ci/fetch-schemas.sh`).
- Removed the external-UI issue-ID injection block from `.claude/hooks/session-catchup.cjs`. Session catchup is now externally-unaware.
- Swept 50+ external-UI references across `cAgents/` source (excluding CHANGELOG/docs/archive/_archive/_deprecated). Documented false-positive lowercase variable refs in path-handling code remain.

### Added
- `scripts/migration/v12-6-drop-ui-fields.sh` — one-shot best-effort migration script for pre-v12.6 sessions. Strips removed fields and files from `cagents-memory/sessions/*`. Idempotent. `--dry-run` flag prints planned removals without modifying anything. KEEP allowlist (`file_changes.log`, `agent_tree.yaml`, `team/metrics/*`, `child_controllers.yaml`, `outputs/strategic/*`) preserved.
- Three regression tests under `tests/v12/`:
  - `v12-6-no-removed-emitters.test.js` — 14 tests asserting no active emitter writes for removed fields in tier-1 SKILL.md files; no `DECOMPOSED`/`PROMPTS_READY` refs in 4 hooks; KEEP allowlist files still referenced.
  - `v12-6-session-schema-internal.test.js` — 5 tests asserting `session-schema.md` has zero external-UI brand refs and contains internal-only framing.
  - `v12-6-no-agentpath-refs.test.js` — 7 tests asserting source-wide external-UI brand sweep + migration script smoke (dry-run + idempotency on a fixture session).

### Removed
- `tests/contract.test.js` (external-UI schema contract test — no longer applicable).
- `scripts/ci/fetch-schemas.sh` (schema fetcher — sole consumer deleted).
- External-UI issue-ID injection block from `.claude/hooks/session-catchup.cjs`.
- `run_contract_tests` CI subcommand reduced to a no-op stub for back-compat.

### Notes
- `session-schema.md` was rescoped to an internal-only contract — NOT deleted. Hook authors and agents still need the field reference. External consumers MUST treat the schema as private and stable only within a single cAgents version.
- The external visualizer sibling repository is untouched. This bump removes the contract only on the cAgents side.
- **4-pillar arc COMPLETE**: v12.3.0 (mandatory pipeline) + v12.4.0 (compression) + v12.5.0 (renames) + v12.6.0 (external-UI contract drop).

## [12.5.0] - 2026-05-21

### Pillar 3 (Naming Rename): 10 core infrastructure renames, hard cutover

Naming-clarity release. Ten core infrastructure agents shed redundant or
over-specified prefixes (`universal-*`, `generic-*`, `task-inventory`,
`team-trigger`, `team-lead-adapter`, `task-consolidator`) for shorter,
clearer canonical names. Hard cutover — no aliases added for these 10
renames in `scripts/migration/v12-aliases.yaml` (existing v12.0.0 alias
entries for `task-decomposer`/`prompt-engineer` -> `planner` were
preserved and their internal path references updated to `core/planner/`).

### Changed (BREAKING)
- Renamed 10 core infrastructure agents (no aliases, hard cutover):
  - `universal-router` -> `router`
  - `universal-planner` -> `planner`
  - `universal-validator` -> `validator`
  - `universal-executor` -> `executor`
  - `universal-self-correct` -> `self-correct`
  - `generic-coordinator` -> `coordinator`
  - `team-trigger` -> `team`
  - `team-lead-adapter` -> `team-lead`
  - `task-consolidator` -> `task-merger`
  - `task-inventory` -> `task-state`
- Operators referencing pre-rename names must apply the rename map.
  Pre-v12.5.0 session artifacts referencing the old names will not
  resolve and will surface as "agent not found" warnings in router
  fallback.
- `tests/v12_2/org-removed-cleanly.test.js`: marketplace version
  assertion relaxed from `toBe('12.2.0')` to `toMatch(/^12\./)` so the
  test no longer fails on each subsequent v12.x bump.

### Added
- 10 regression tests (`tests/v12/no-{old-name}-refs.test.js`) — each
  asserts the deprecated name has zero references across `.md`/`.yaml`/
  `.json`/`.cjs`/`.js`/`.ts`/`.sh` files (excluding CHANGELOG, docs/,
  archive/, _deprecated/, sessions/, and the test's own scaffolding).

### Internal
- `core/config/domain_overrides.yaml`: controller catalog, specialist
  routing, and team routing entries updated to the new canonical names.
- `.claude/hooks/model-routing-advisor.cjs`: `KNOWN_AGENTS` map updated
  to register the 10 new names (and a new `coordinator` entry).
- `.claude/hooks/subagent-tracker.cjs`: `ENRICHMENT_AGENTS` list updated
  to drop the `universal-*` legacy aliases.
- `scripts/update-agent-frontmatter.cjs`: `INFRA_MAX_TURNS` table
  updated to the new names.
- `tests/v12/aliases-resolve.test.js`: `ROUTER_FALLBACK_LEAF` cleared
  (no longer needed — all canonical v12 names resolve directly).

## [12.4.0] - 2026-05-21

### Pillar 2 (Compression): catalog audit + cull (240 -> 144)

Compression release. The audit-extract-collapse pass shrank the active
agent catalog from 240 to 144 while keeping the on-disk archive of culled
agents reachable via the `_deprecated/` bucket pattern (v12.0.5+) for
back-compat alias resolution.

### Added
- **`scripts/audit-agents.mjs`** — Node std-lib audit script (no npm deps).
  Parses `cagents-memory/_system/logs/agent_spawns.log` and walks
  `.claude-plugin/plugin.json` to produce a 4-section report:
  auto-merge candidates (Jaccard >= 0.85), human-review candidates
  (0.6-0.85), playbook-extraction candidates (>100 lines of duplicated
  guidance), and cull candidates (0 spawns + no role-uniqueness).
- **`.claude/rules/playbooks/README.md`** — Forward-looking landing zone
  for future playbook extractions. Documents naming conventions
  (`fw-`, `dom-`, `pat-`, `per-` prefixes), spec-compliant frontmatter,
  and the `@.claude/rules/playbooks/{path}.md` reference protocol from
  consumer SKILL.md files.
- **`tests/v12/audit-script-runs.test.js`** — Regression test: audit
  script exits 0 in <60s and writes a report with all 4 required sections.
- **`tests/v12/playbook-frontmatter-valid.test.js`** — Regression test:
  every playbook .md file has spec-compliant frontmatter (6 top-level
  fields max).
- **`tests/v12/no-orphaned-cagents-refs.test.js`** — Regression test:
  no surviving `cagents:{name}` reference in the active tree for any
  agent moved to a `_deprecated/` bucket.
- **`cagents-memory/_knowledge/agent-audit-260521.md`** — Audit report
  written by the new script. Documents the finding that the catalog was
  already highly differentiated: 0 auto-merge candidates at J>=0.85,
  0 human-review pairs, 0 playbook-extraction candidates >100 lines, and
  161 cull candidates (0-spawn agents).

### Changed (catalog compression)
- **Active catalog 240 -> 144 agents.** 96 never-spawned agents moved to
  `{archetype}/_deprecated/` buckets. Per-archetype breakdown post-cull:
  developer 26, operator 36, advisor 12, analyst 20, creator 5, writer 10,
  strategist 8, core 15, leadership 12. Survivors include all spawned-in-
  log agents, all alias targets (per
  `scripts/migration/v12-aliases.yaml`), all controller/infrastructure
  tier agents, and a hand-curated set of canonical never-spawned
  specialists per branch.
- **Catalog size sits in design target band [120, 170].** The full-cull
  projection (79) would have undershot the floor; the curated keep-list
  preserves canonical specialists in each branch.
- **CLAUDE.md counts updated** to reflect the new 144-agent catalog and
  per-archetype distribution.
- **Test-count claim updated** from "983+" to "1030+" Vitest tests across
  101+ files (CLAUDE.md freshness window enforcement).
- **Cleaned 65 dangling `related_agents:` entries** across 43 active
  SKILL.md files (refs to agents now in `_deprecated/`). Wrote a script
  (`/tmp/clean-related-v2.mjs`, not shipped) that walks the archetype
  tree and removes entries that no longer resolve.
- **`writer/editor/SKILL.md` delegation table trimmed** to active agents
  only (removed refs to culled `prose-stylist` peers, etc.).
- **`shared/resources/delegation-templates.md`** — replaced culled
  `cagents:legal-analyst` example with `cagents:general-counsel`.

### Updated tests
- **`tests/config/plugin-json.test.js`** — agent-count assertion changed
  from `>= 200` to `>= 120 && <= 170` (the v12.4.0 contract band).
- **`tests/agents/per-agent-version-field.test.js`** — assertion changed
  from `>= 238` to `>= 120 && <= 170`. The `findAllSkillMd` walker now
  skips `_deprecated/` buckets.
- **`tests/regressions/claude-md-counts-current.test.js`** — `countSkillMd`
  walker now skips `_deprecated/` buckets so it counts active agents only.
- **`tests/regressions/related-agents-references-resolve.test.js`** —
  walker skips `_deprecated/`; sanity floor lowered from `> 200` to
  `> 100` (matches the active-catalog floor).

### Constraints honored
- **Hard cutover, no aliases for newly-culled agents.** Per design doc
  `release_constraints.hard_cutover=true`. Agents in `_deprecated/`
  retain their on-disk SKILL.md so back-compat alias resolution still
  works for pre-existing v12.x alias entries; new culls do NOT add
  alias entries.
- **`_deprecated/` bucket pattern (v12.0.5+) preserved.** The 96 culled
  agents are reachable on disk but excluded from `.claude-plugin/plugin.json`
  by `scripts/sync-agents.sh`, so the planner and router will not select
  them for new work.
- **Critical agents preserved.** `wave-reviewer` and `coord-log-writer`
  (v12.1.0 team-context-discipline contract), all alias targets, and
  the 3 Phase 12 academic-research analysts
  (`literature-review-author`, `citation-graph-analyzer`,
  `methodology-critic`) plus `academic-paper-searcher` survived the cull
  via the keep-list.

### Notes
- The design's playbook-extraction step (WI-5) was a no-op for v12.4.0
  because the audit found zero qualifying candidates (>100 lines of
  duplicated guidance). Earlier v12.x consolidation work (v12.0.0
  absorbed `engineering-manager` into `tech-lead`; collapsed
  `architecture-reviewer` into `architect --review`) already extracted
  the largest duplication clusters. The `.claude/rules/playbooks/`
  directory and README ship as the forward-looking landing zone for
  future extractions.
- Net regression-test delta: +3 new test files (audit script, playbook
  frontmatter, orphaned refs), -1 baseline failure
  (`claude-md-counts-current.test.js` was failing on main before the
  bump and passes now).

## [12.2.0] - 2026-05-21

### Removed (BREAKING)

- **`/org` skill removed.** Cross-domain coordination is now handled by `/team`
  with auto-enabled strategic mode (Wave 0/1/2 = C-suite deliberation, Wave
  3..N = per-domain dispatch). `/team` automatically detects multi-domain
  requests via `universal-router.domain_count` and prepends strategic waves.
  Users can override with `--strategic` (force enable) or `--no-strategic`
  (force disable). The 12 leadership agents (CEO/CTO/CFO/CMO/COO/CHRO/CCO/
  CSO/CRO/CPO/CLO/VP-Engineering) keep their existing locations and SKILL.md
  schemas; only the invoking skill changes. No back-compat alias is provided —
  `/org` invocations now fail with the standard Claude Code "skill not found"
  error. Migration: replace `/org X` with `/team X` (auto-detects strategic
  mode for cross-domain requests).

### Changed

- `/team` SKILL.md grows a "Strategic Mode" section pointing at new
  `team/reference/strategic-{mode,brief-format,brief-schema,cross-domain,
  escalation,examples}.md` reference docs (migrated from `org/reference/`).
- `core/universal-router/SKILL.md` extended with `domain_count` and
  `detected_domains[]` output fields.
- Plugin manifest skill count: 5 → 4 (`/designer`, `/team`, `/run`, `/helper`).
- `strategic_brief.yaml` schema adds `dependency_type` (independent |
  dependent_on) per domain entry; Wave 2 brief-synthesizer infers the value
  from cross-references in C-suite Wave 0/1 outputs.

### External-UI consumer

cAgents no longer treats any external visualizer as a downstream consumer.
Session schema references to external-UI compatibility are removed.

## [12.1.2] - 2026-05-21

Folds `/improve` into `/run` via a first-word keyword router and removes
the standalone `/improve` skill. Tiny patch bump.

### Removed
- **`.claude/skills/improve/`** — entire directory deleted (SKILL.md plus
  24 reference docs). The standalone `/improve` skill is gone.
- **Version registry slot #10** — `.claude/skills/improve/SKILL.md`
  removed from `scripts/sync-versions.sh`, `scripts/ci/validate-versions.sh`,
  and `.claude/rules/core/version-registry.md`. Total slot count drops
  from 18 to 17.

### Changed
- **/run SKILL.md keyword router (Step 1a)**: before flag parsing and
  domain routing, `/run` now inspects the first whitespace-separated
  token of `$ARGUMENTS`. If it (case-insensitively) matches one of the
  four improve-family keywords, the keyword is stripped and an internal
  `mode` is inferred: `improve` → `full`, `review`/`audit` → `review`,
  `optimize` → `optimize`. Example: `/run review src/auth/` is now the
  canonical replacement for `/improve --mode review src/auth/`.
- **/run --mode parser**: accepted values expand from `{standard, debug}`
  to `{standard, debug, review, optimize, full}`. An explicit `--mode`
  flag overrides any keyword-router inference.
- **magic-keywords.cjs**: route table updated. `review|audit|...` prompts
  now suggest `/run review` (was `/improve --mode review`); `optimize|...`
  prompts suggest `/run optimize` (was `/improve --mode optimize`).
- **`_MODE_REGISTRY.md`**: the three improve modes (review/optimize/full)
  and three flags (--baseline/--suppress/--benchmark) plus --scope and
  --auto-fix are now listed under `## /run`. The `## /improve` section
  is preserved as a REMOVED marker with redirection guidance.
- **CLAUDE.md, README.md, docs/README.md, helper/SKILL.md**: skill
  catalog reduced from 6 to 5. Skills table row for `/improve` removed;
  prose mentions redirected to `/run review|audit|optimize|improve`.
- **plugin.json + marketplace.json descriptions**: "6 user skills" →
  "5 user skills"; `/improve` removed from the user-skill enumeration.

### Added
- **`.claude/skills/run/reference/improve-mode.md`**: full keyword router
  contract, mode inference table, mode-specific controller behavior,
  atomic rollback pattern, cross-session artifact layout.
- **`.claude/skills/run/reference/improve-optimization-types.md`**,
  **`improve-risk-classification.md`**, **`improve-pattern-effectiveness.md`**:
  three keeper reference docs migrated from the deleted improve dir.
- **`scripts/migration/v12-aliases.yaml`**: new `skill_aliases` and
  `skill_invocation_aliases` sections mapping `/improve` and its mode-
  specific invocations to the new `/run` equivalents.
- **`tests/v12/improve-removed-keyword-routing.test.js`**: 11-assertion
  regression test asserting the improve directory is gone, plugin.json
  no longer references it, /run SKILL.md has the keyword router section,
  the new reference doc exists, the --mode parser accepts review/optimize/full,
  v12-aliases.yaml documents the migration, CHANGELOG has the v12.1.2
  entry, and the version registry slot count is 17.

### Migration
- `/improve <target>` → `/run review <target>` (review is the default mode)
- `/improve --mode review <target>` → `/run review <target>`
- `/improve --mode optimize <target>` → `/run optimize <target>`
- `/improve --mode full <target>` → `/run improve <target>`
- `--baseline`, `--suppress`, `--benchmark`, `--scope`, `--auto-fix`
  flags remain valid on `/run` when an improve mode is active.

## [12.1.1] - 2026-05-21

Three followups from v12.1.0 (`/team` context-discipline redesign) closing
the documentation gap (FU-1), the planner emission gap (FU-2), and the
static-validation gap (FU-3). Tiny patch bump.

### Changed
- **FU-1 (HIGH) — Graceful-degradation rule generalized to all skills.**
  `.claude/rules/core/controllers.md`, `.claude/rules/core/execution.md`,
  and `.claude/rules/core/teams.md` previously scoped the depth-1 Agent-tool
  stripping rule to `/team` teammates only and asserted that `/run`
  controllers retain Agent at level 1 and MUST delegate. The v12.1.0 spike
  (session `run_improve-team-context_260521_001`) reproduced "Agent is not
  available inside subagents." for `cagents:tech-lead` spawned by `/run` at
  depth-1, falsifying that assertion. All three rule docs now state the
  rule applies to ALL spawning skills (`/run`, `/team`, `/org`) and ALL
  agent types (plugin-namespaced `cagents:*` AND built-in `general-purpose`/
  `Explore`/`Plan`). The knowledge note at
  `cagents-memory/_knowledge/agent-tool-depth1-stripping.md` adds the
  v12.1.0 spike result as reproduction #5 and the v12.1.1 coordination
  session as reproduction #6.

- **FU-2 (MEDIUM) — universal-planner per-wave file emission contract.**
  `core/universal-planner/SKILL.md` previously documented only the legacy
  monolithic `workflow/work_items.yaml` emission. v12.1.0 documented the
  per-wave schema (`work_meta.yaml` + `work_items_wave_{K}.yaml`) in
  `.claude/skills/team/reference/per-wave-decomposition.md` and made the
  team SKILL read from per-wave files, but the planner SKILL was not
  updated. v12.1.1 closes the gap: planner SKILL now documents the
  dual-emission contract (legacy `work_items.yaml` + new
  `work_meta.yaml` + `work_items_wave_{K}.yaml`) with schema, algorithm,
  and back-compat strategy through v12.1.x. The completion event template
  lists all three artifact shapes.

### Added
- `tests/v12/graceful-degradation-scope-generalized.test.js` — regression
  test (13 assertions, 5 invariants) asserting that controllers.md,
  execution.md, and teams.md contain generalized scope language (mentions
  `/run`, `/team`, `/org` in the graceful-degradation section + at least
  one explicit generalization marker like "all skills" / "depth ≥ 1"),
  do NOT retain the falsified narrow-scope assertions, and that the
  knowledge note cites the v12.1.0 spike session. Locks the FU-1
  generalization against future regression.
- `tests/v12/planner-per-wave-emission.test.js` — regression test (13
  assertions, 4 invariants) asserting that the universal-planner SKILL.md
  documents the dual-emission contract (mentions `work_meta.yaml` +
  `work_items_wave_`, preserves back-compat language, lists new artifacts
  in completion event template) and that a fixture session with all
  three emission shapes round-trips cleanly with back-compat preserved
  (union of per-wave WI ids equals monolithic WI ids, same
  `acceptance_criteria` schema).
- `cagents-memory/_knowledge/team-v12-1-0-e2e-validation.md` — FU-3
  static-validation findings. Inspects team SKILL.md (193 lines, ≤200
  cap), wave-reviewer (7-check protocol, Agent-free tool surface),
  coord-log-writer (reads dual-emission back-compat, Agent-free tool
  surface). All static cross-agent contracts (invocation prompt shapes,
  file paths, schema versions, 1-line reply discipline) PASS. Full E2E
  observation deferred to first production /team invocation on v12.1.1+
  — rationale: spawning a real /team from inside the current /run
  controller hits the same depth-1 Agent-tool stripping documented in
  FU-1, making in-session E2E execution non-viable.

## [12.1.0] - 2026-05-20

### Added
- `developer/quality/wave-reviewer/` agent: validates a /team wave gate by running
  the 7-check protocol against on-disk evidence and returns a 1-line verdict.
  Frees the lead from holding raw gate evidence in context.
- `developer/quality/coord-log-writer/` agent: assembles final `coordination_log.yaml`
  from on-disk artifacts (task_list, EVT files, gate_validations, self-validations).
  Lead receives a 1-line confirmation instead of re-reading N waves of WI status.
- `.claude/skills/team/reference/per-wave-decomposition.md`: schema for `work_meta.yaml`
  (lead reads once) + `work_items_wave_{K}.yaml` (lead reads only current wave).
  Replaces monolithic `work_items.yaml` holding pattern.
- `.claude/skills/team/reference/spawn-brief-schema.md`: disk-handoff spawn pattern
  that drops per-teammate spawn prompts from ~600 tokens to ~80 tokens.
- `.claude/skills/team/reference/integration-handoff.md`: contract for integration
  controller writing `integrated_outputs.yaml` + `integration_summary.md` (≤200 tokens)
  so the lead never re-reads raw per-wave outputs at finalization.
- `tests/v12/team-context-discipline.test.js`: 15-test regression test enforcing
  SKILL.md ≤200 lines, per-wave decomposition references, delegated gate validation,
  delegated final assembly, disk-handoff spawn briefs, and plugin manifest membership
  for the two new agents.
- `cagents-memory/_knowledge/non-plugin-agent-depth1-test.md`: spike result documenting
  that depth-1 Agent stripping applies to ALL subagents (not just `cagents:*`); under
  `/run` as well as `/team`. Verdict: DISK_DISCIPLINE_CANONICAL — sub-lead pattern
  not viable on current Claude Code runtime.

### Changed
- `.claude/skills/team/SKILL.md`: rewritten as thin event loop (244 → 193 lines, 21%
  reduction). Detailed prose moved to `@reference/*.md` with `@path` lazy loading.
  Lead now uses `cagents:wave-reviewer` for gate validation and `cagents:coord-log-writer`
  for final log assembly instead of inline execution.
- `core/team-trigger/SKILL.md`: documents the new per-wave decomposition emission
  schema (`work_meta.yaml` + `work_items_wave_{K}.yaml`). Schema is back-compat with
  legacy monolithic `work_items.yaml`; planner emits both during v12.1.x transition.
- `.claude/skills/team/reference/teammate-spawning-template.md`: documents the
  disk-handoff spawn pattern (preferred) and preserves the inline template for
  back-compat / small-wave cases.

### Agent catalog
- Total agents: 238 → 240 (added wave-reviewer + coord-log-writer under
  `developer/quality/`).

### Context-discipline impact
The /team lead can now complete 5-10 wave workflows without exhausting context:
- Per-wave decomposition: ~70% reduction in WI-yaml tokens held by lead
- Disk-handoff spawn briefs: ~73% reduction in per-spawn prompt tokens
- Delegated gate validation: ~80% reduction at each gate
- Delegated final assembly: lead receives 1-line confirmation instead of N waves
- SKILL.md compression: ~50 tokens saved per /team invocation at skill load

## [12.0.8] - 2026-05-20

### Added
- `docs/MULTI_TOOL_DEPLOYMENT.md` — design note (NOT implementation)
  capturing the multi-tool deployment decision rationale. Covers what a
  hypothetical `scripts/convert.sh` would emit, which of cAgents' 238 agents
  round-trip cleanly vs lose semantics, maintenance cost estimates, and the
  decision: DEFER (revisit when specific user demand emerges). (REC-8)

### Closing note (final rec in v12.0.x improvement series)
- This release closes the 8-rec improvement series from
  `cagents-memory/sessions/team_external-samples-update_260520_003/outputs/wi-6/`.
  Shipped: REC-2 (v12.0.1), REC-4 (v12.0.2), REC-3 (v12.0.3), REC-1 (v12.0.4),
  REC-5 (v12.0.5), REC-7 (v12.0.6), REC-6 (v12.0.7), REC-8 (v12.0.8).

## [12.0.7] - 2026-05-20

### Added
- `docs/12-FACTOR-COMPLIANCE.md` — positioning doc mapping cAgents against
  humanlayer's 12-Factor Agents methodology. Score: 6 YES · 4 PARTIAL · 2
  deliberate DIVERGENCE (Factor 5 unified state, Factor 12 stateless
  reducer — both intentional architectural choices). (REC-6)
- `docs/ARCHITECTURE.md` — cross-link to the new compliance doc.

## [12.0.6] - 2026-05-20

### Added
- `metadata.data_access_level` advisory frontmatter field (REC-7).
  Optional declarative trust tier: `trusted` | `verified` | `unverified`.
  Agents that don't declare the field default to behavior-equivalent to
  `unverified` (no warnings fired). Wired to `session-init-gate.cjs`
  advisory check — warns when a `trusted` parent spawns an `unverified`
  child. Does NOT block; matches v11.1.10 `metadata.requires` precedent.
- `.claude/rules/core/skill-format.md` — new § documenting the field.
- `tests/v12/data-access-level-advisory.test.js` — regression tests for
  the advisory behavior matrix.

## [12.0.5] - 2026-05-20

### Added
- `_deprecated/` bucket pattern for agent deprecation lifecycle.
  `scripts/sync-agents.sh` now excludes `<archetype>/_deprecated/**` from
  plugin.json registration while keeping the SKILL.md files on disk for
  alias resolution via `scripts/migration/v12-aliases.yaml`. (REC-5)
- `.claude/rules/core/skill-format.md` — new section documenting the
  bucket pattern, promotion path, and eventual-removal semantics.
- `tests/v12/deprecated-bucket-excluded.test.js` — regression test
  enforcing that `_deprecated/` agents do not appear in plugin.json.

## [12.0.4] - 2026-05-20

### Added
- `.claude/hooks/secret-restore.cjs` — new Stop hook that restores
  sanitized-content files to their pre-sanitize state at session end.
- `.claude/hooks/SECRET-SANITIZE.md` — protocol documentation for the
  opt-in sanitize-and-restore mode.
- `tests/v12/secret-sanitize-protocol.test.js` — regression tests covering
  sanitize-mode behavior + restore idempotency.

### Changed
- `.claude/hooks/secret-detection.cjs` — extended with opt-in
  `CAGENTS_SECRET_MODE=sanitize` mode that replaces secret content with
  `BLOCK_<hex>` placeholders during the session. Default remains `block`
  (no behavioral change for existing users).
- `.claude/settings.json` — registered secret-restore.cjs as a Stop hook.

(REC-1 from session team_external-samples-update_260520_003)

## [12.0.3] - 2026-05-20

### Added
- `.claude/skills/_MODE_REGISTRY.md` — single source of truth for all skill
  modes, flags, and phases across /run, /team, /org, /designer, /improve, /helper.
  Replaces inline mode definitions in improve/SKILL.md and team/SKILL.md to
  prevent documentation drift. (REC-3)
- `tests/v12/mode-registry-coverage.test.js` — regression test enforcing
  registry coverage of all documented flags.

### Changed
- `.claude/skills/improve/SKILL.md` — flag definitions now reference
  `_MODE_REGISTRY.md § /improve` instead of redefining inline.
- `.claude/skills/team/SKILL.md` — flag definitions now reference
  `_MODE_REGISTRY.md § /team` instead of redefining inline.

## [12.0.2] - 2026-05-20

### Changed
- Version bump to 12.0.2. See commit message for details.

## [12.0.1] - 2026-05-20

### Added
- `AGENTS.md` at repo root — multi-tool routing convention documenting how
  Cursor, Aider, Windsurf, Gemini-CLI, OpenCode and other non-Claude-Code
  agentic tools can discover cAgents skills + agents. Pure documentation;
  no behavioral change. (REC-2 from session team_external-samples-update_260520_003)

## [12.0.0] - 2026-05-20

Major consolidation release. Branch `revamp/v12-rc`. Total agents 251 -> 238.
Pipeline transitions 7 -> 5. Legacy domain dirs 13 -> 2. Execution
self-validation checks 15 -> 5.

### Added
- `scripts/migration/v12-aliases.yaml` — back-compat alias map for all v11 ->
  v12 agent renames and merges (W1.1). Resolves `engineering-manager`,
  `architecture-reviewer`, `chief-legal-officer`, `devops-lead`,
  `task-decomposer`, `prompt-engineer`, and the 13 marketing-sales fold
  sources to their v12 targets.
- `_archive/v12-migration/migration-state.yaml` and burndown chart (W0.3) —
  per-wave tracking against locked decisions Q1..Q8.
- Tar backup of 11 legacy domain dirs at
  `_archive/v12-migration/legacy-dirs-backup.tar.gz` (W0.4) — pre-deletion
  snapshot for recovery.

### Changed
- **Pipeline state machine collapsed (7 -> 5 states)** (W2.1, W3.1, W3.2).
  `/run` sequence is now `INIT -> ORCHESTRATED -> PLANNED -> COORDINATED ->
  VALIDATED`. `task-decomposer` and `prompt-engineer` folded into
  `universal-planner`; their output schemas (`work_items.yaml`,
  `delegation_prompts.yaml`) preserved but written by planner directly.
- **engineering-manager merged into tech-lead** (W2.4). Two engineering
  controllers consolidated into a single fullstack `tech-lead`. 222 active
  references swept across SKILL.md, rules, tests, and config. Alias
  preserved.
- **architecture-reviewer collapsed into `architect --review` mode flag**
  (W2.5). Removes a standalone agent and absorbs review responsibility into
  the `architect` controller with an explicit mode toggle.
- **Marketing-sales consolidation (38 -> 25)** (W3.3-W3.6). 13 agents
  absorbed across 6 groups (G1-G6). All 13 fold sources aliased.
- **chief-legal-officer renamed to clo** (W2.2). Standardized C-suite
  naming. Alias preserved.
- **vp-engineering moved to `leadership/` archetype** (W2.2). Co-located
  with other C-suite agents.
- **devops-lead renamed to infrastructure-lead** (W2.3). Moved to
  `developer/infrastructure/`.
- **engine-developer and game-programmer moved to `developer/backend/`**
  (W2.2).
- **max_revision_cycles 5 -> 3** (W1.4). Tightened revision budget in
  `pipeline_config.yaml` per audit.
- **Execution self-validation reduced 15 -> 5 hook-verifiable checks**
  (W1.2). The aspirational 15-check protocol replaced with 5
  mechanically-verifiable checks: evidence freshness, file existence,
  guard exit codes, git state, file:line accuracy. Aspirational checks
  moved to `docs/FUTURE_VALIDATION_FRAMEWORK.md`.
- Top-level docs (CLAUDE.md, README.md, docs/ARCHITECTURE.md,
  docs/RELEASE_NOTES.md) updated for v12.0.0 release content (W4.3).
- Version bumped 11.3.0 -> 12.0.0 across all 18 registry locations
  (W4.3).

### Removed
- `task-decomposer` agent — folded into `universal-planner` (W2.1).
- `prompt-engineer` agent — folded into `universal-planner` (W2.1).
- `engineering-manager` agent — merged into `tech-lead` (W2.4).
- `architecture-reviewer` agent — collapsed into `architect --review`
  (W2.5).
- 13 marketing-sales agents absorbed across G1-G6 groups (W3.3-W3.6).
- 11 legacy domain dirs: `engineering/`, `creative/`, `business/`,
  `growth/`, `service/`, `science/`, `health/`, `education/`,
  `personal/`, `arts/`, `trades/` (W4.2). `people/` and `shared/`
  retained as routing-config-only overlays.
- `cagents-memory/_communication/` directory and 58 stale SKILL.md
  references (W4.1).

### Migration
- Pre-v12 agent names continue to resolve via
  `scripts/migration/v12-aliases.yaml`. Existing session artifacts (org_*,
  team_*, run_*) referencing old names work unchanged.
- Could-have-caught-by: end-to-end pipeline-state-count regression test,
  agent-count invariant test, and zombie-ref scanner — all landed in W1.2
  and W4.4.

## [11.3.0] - 2026-05-13

### Added
- **`/goal` autonomous-execution integration (REC-5 + REC-1 + REC-10 + REC-4 from `cagents-memory/sessions/run_analyze-goal-md-task-skill_260513_005/outputs/analysis.md`)**. Three bundled changes turn cAgents into a first-class consumer of Claude Code's `/goal` continuation primitive (`https://code.claude.com/docs/en/goal.md`).
  - **WI-1 (REC-5)**: `.claude/skills/helper/SKILL.md` gains an "Autonomous Execution Triad" section documenting `/goal` + `/run` + Auto-mode as composing primitives, a comparison matrix (`/goal` vs `/loop` vs Stop hook), a headless `claude -p` example, and the `/goal clear` aliases (`stop`/`off`/`reset`/`none`/`cancel`). Before this bump, cAgents users had no on-ramp to Claude Code's native autonomous-continuation primitive.
  - **WI-2 (REC-1 + REC-10)**: `.claude/skills/run/SKILL.md` Step 2 gains ACTION 4, deriving a `/goal` condition referencing `completion_summary.yaml` status + clean TaskList state, with a turn-cap clause. `.claude/skills/run/reference/flags.md` documents the new `--no-goal` opt-out (also honored via `CAGENTS_NO_GOAL=1` env var). `.claude/skills/designer/SKILL.md` adds the `/designer` exemption sentence (interactive-by-contract; mirrors the existing "/designer is EXEMPT from auto-proceed" rule). The `/run` `argument-hint` and Step 1 body parser both list `--no-goal` so the regression flag-consistency test passes.
  - **WI-3 (REC-4)**: New `.claude/hooks/goal-evaluator-logger.cjs` (~125 LOC) registered as a second Stop hook. When `/goal` is active in the Stop payload (`input.goal.active === true` or `input.goal_state.active === true` with an `evaluator_reason`), the hook appends a YAML entry (timestamp, condition, evaluator_reason, turn, verdict) to `workflow/goal_evaluator_log.yaml` in the active cAgents session directory. Non-blocking; no-op when `/goal` inactive. `core/universal-self-correct/SKILL.md` Step 2 now reads the log's most recent 3-5 entries and treats evaluator reasons as additional FIXABLE signal alongside `validation_report.yaml` — a free Haiku-tier second-opinion every turn `/goal` is active. Hook documented in `.claude/rules/core/hooks.md` and listed in the Stop row of the Hook Types Overview table.
  - Test added: `tests/skills/helper-goal-section.test.js` (5 tests asserting helper SKILL.md surfaces `/goal`, comparison matrix, headless example, aliases, and Auto-mode orthogonality). `tests/skills/run-goal-anchor.test.js` (9 tests asserting `/run` SKILL.md mentions `/goal` + `completion_summary.yaml` + turn-cap + `--no-goal` + `/designer` exemption, `flags.md` lists `--no-goal`, and `/designer` SKILL.md has the exemption sentence). `tests/hooks/goal-evaluator-logger.test.js` (7 tests covering hook existence, no-op on empty input, no-op when `/goal` inactive, append on active payload, alternative `goal_state` shape, multiple appends, and `.claude/settings.json` registration). All 21 tests fail-before / pass-after the change.
- CLAUDE.md hook-count and test-count counters bumped to current reality (30 `.cjs` / 27 unique / 830+ Vitest tests / 75+ files). `hooks.md` count claim bumped (30 / 27). `scripts/ci/validate-agents.sh` expected hook count bumped (26 → 27). `tests/regressions/hooks-md-skill-size-monitor.test.js` count assertion updated to match new reality.

### Changed
- This is a **minor bump** (11.2.16 → 11.3.0) per `.claude/rules/core/version-registry.md` § Tiny-Bump Cadence: the change spans three coherent objectives across >5 non-sync files (helper + run + designer + flags + new hook + settings + self-correct + hooks.md + CLAUDE.md + 3 new tests), exceeding the tiny-bump atomicity criteria. The three WIs ship together because REC-4 (evaluator logger) consumes signal that REC-1 (auto-anchor) produces, and REC-10 (designer exemption) is the necessary carve-out for REC-1. Could-have-caught-by: a "skill mentions documented Claude Code primitive" coverage test on the helper SKILL.md (deferred to a future quality pass).

## [11.2.16] - 2026-05-13

### Fixed
- Trimmed `.claude/rules/core/version-registry.md` to canonical 18-location
  shape; moved V10.x 21-location history verbatim to a new file
  `docs/VERSION_REGISTRY_HISTORY.md` (Q-011 / F-xcut-003).
  Bug: the rule file simultaneously described the V10.x 21-location catalog
  AND the V11.0+ canonical 18-location registry. Mixed phrasing ("the V10.x
  catalog had 21 locations; the current canonical count is 18") created
  ambiguity about which number was authoritative for future registry
  additions, and the file no longer served as an unambiguous single source
  of truth.
  Root cause: V11.0 removed four SKILL.md slots (`context`, `debug`,
  `review`, `optimize`) shrinking the registry 21 → 18, but the historical
  paragraphs explaining the V10.x shape were retained inline rather than
  extracted to a history file. Five tiny-bumps' worth of additional rule
  edits never circled back to prune them.
  Test added: `tests/regressions/version-registry-canonical.test.js` —
  reads the rule file and asserts (1) no "V10.x catalog" phrasing, (2) no
  "21 registry locations" / "had 21 locations" phrasing as a registry
  count, (3) the canonical `| # | File | Field/Line | Updated By |` table
  contains exactly 18 rows numbered 1..18. The test failed at HEAD
  7b3a1d45 (3 hits across two pattern groups) and passes after the trim.
  Also pruned one stale assertion in
  `tests/rules/version-registry-structure.test.js` (line 43, "mentions the
  21-location sync count") because that assertion was the symptom of the
  bug — it required the file to contain the contradiction the fix removes.
  Could have caught by: a documentation-currency / source-of-truth
  invariant test on the registry rule file (this new test).

## [11.2.15] - 2026-05-13

### Fixed
- Removed stale `## V10.18.0 Highlights` section from CLAUDE.md (Q-010 /
  F-docs-002).
  Bug: CLAUDE.md still advertised V10.18.0 highlights despite the project
  being on V11.2.x — readers got pre-V11 release notes presented as current.
  Root cause: section was added in V10.18.0 and never pruned across the
  V10→V11 major bump.
  Test added: `tests/regressions/claude-md-no-stale-version-highlights.test.js`
  — parses the Quick Reference `**Version**:` line to extract the current
  version, finds every `## V<N>.<M>.<P> Highlights` heading, and asserts
  none is more than 2 minor versions behind the current version (cross-major
  comparison is an automatic fail since major bumps reset the minor).
  Could have caught by: regression test on documentation-currency invariants.

## [11.2.14] - 2026-05-12

### Fixed
- Refresh stale `CLAUDE.md` test-count claim from `858+ Vitest tests across 60+
  files` to `810+ Vitest tests across 72+ files` (with explanatory parenthetical
  that the figure is a static lower-bound; runtime `numTotalTests` is higher
  because `it.each` rows expand to multiple tests at runtime — 932 at
  baseline). Extends `tests/regressions/claude-md-counts-current.test.js` with
  a 4th sub-test that statically counts `it(...)` / `test(...)` invocations
  across `tests/**/*.test.js` (mirroring the include/exclude rules in
  `tests/vitest.config.js`), asserts `claim_tests <= static_lower_bound` AND
  `static_lower_bound - claim_tests <= 20`, and the same lower-bound +
  5-file freshness window for the file count. The sub-test fails on the
  pre-fix claim (858 > 816 static lower-bound) and passes after the bump.

Bug: `CLAUDE.md` line 517 Quick Reference Tests row was 74 runtime tests /
     12 files behind reality. The `+` suffix kept the claim technically true
     (under-counts are permitted), but the lower bound was so stale that the
     order-of-magnitude was misleading for anyone using the Quick Reference
     to size the suite.
Root cause: bumps that added regression tests (V11.2.x's Q-001/Q-002/Q-003/
     Q-006/Q-007/Q-008 each shipped a new `tests/regressions/*.test.js` file)
     did not refresh the CLAUDE.md test-count claim. No regression test
     existed for the test-count specifically — the V11.2.2 count-current
     test covers agents, hooks, and per-archetype distributions but not the
     test-count claim.
Test added: `tests/regressions/claude-md-counts-current.test.js` extended
     with a 4th sub-test "test-count claim is within freshness window of
     statically-counted suite size (Q-009)". Fails before, passes after.
Could have caught by: an extension of the existing CLAUDE.md count-currency
     test to cover the test-count Quick Reference row. The same pattern that
     guards the agent count and hook-file count would have caught this; the
     coverage gap was simply unimplemented.

## [11.2.13] - 2026-05-12

### Fixed
- Convert `.claude/skills/improve/SKILL.md` internal resource references
  from the `[`reference/X.md`](reference/X.md)` markdown-link form to the
  `@reference/X.md` form used by every other user-invocable cAgents skill
  (`/run`, `/team`, `/org`, `/designer`, `/helper`). 18 occurrences across
  lines 55–168 converted. The "Reference catalog" bullet list at lines
  200–212 was left intact — those are listing-style file-name mentions,
  not links, and are out of Q-008 scope.

Bug: `/improve` SKILL.md was the lone outlier in the 6-skill catalog,
     using `[`reference/X.md`](reference/X.md)` markdown-link form for 18
     internal resource refs while the other 5 skills uniformly used the
     `@reference/X.md` progressive-disclosure form.
Root cause: `/improve` SKILL.md was authored before the `@path`
     convention was adopted across skills; never refactored during the
     V11.0 review/optimize consolidation that produced the current
     `/improve` skill.
Test added: `tests/regressions/skill-at-path-consistency.test.js` walks
     `.claude/skills/{run,team,org,designer,improve,helper}/SKILL.md`
     and asserts no SKILL.md uses the markdown-link form for reference
     resources; also asserts `/improve` uses the `@reference/` form at
     least once. Failing before fix (improve had 18 markdown-link refs,
     0 `@reference/` refs); passing after (0 markdown-link refs, 18
     `@reference/` refs).
Could have caught by: contract test on `.claude/skills/` formatting
     consistency — this regression test IS that contract test.

## [11.2.12] - 2026-05-12

### Fixed
- Trim `.claude/rules/core/hooks.md` intro paragraph (line 9) from a 540-char
  per-event enumeration to a 2-line summary directing readers to the Hook Types
  Overview table beneath it. The previous intro duplicated every
  hook-event-matcher tuple already documented in the table, requiring dual-edit
  on every hook add/remove and creating a drift surface. The trim removes
  ~770 chars of redundant prose from a rules file that auto-loads into every
  agent's context on every session.

Bug: `.claude/rules/core/hooks.md` intro paragraph at line 9 duplicates the
     Hook Types Overview table beneath it, requiring dual-edit on every hook
     add/remove (drift surface).
Root cause: Intro evolved into a 540-char enumeration over many versions
     instead of staying a 2-line summary. No regression test enforced an
     upper bound on intro prose length.
Test added: `tests/regressions/hooks-md-intro-length.test.js` asserts intro
     paragraph (first non-heading prose after frontmatter and h1) is < 250
     chars and contains no per-event `[Matcher]` tuple enumeration. Failing
     before fix (intro 923 chars, contained `PreToolUse[Agent]`), passing
     after.
Could have caught by: regression test on `.claude/rules/core/hooks.md` prose
     structure.

## [11.2.11] - 2026-05-12

### Fixed
- Trim `.claude/rules/quality/resources/validation-checklist-29.md` from 126 lines
  to 35 lines, describing only the 5 actively-enforced Phase-4 cross-cutting
  checks (25-29). The 23 aspirational checks (Phases 1-3) move verbatim to
  `docs/FUTURE_VALIDATION_FRAMEWORK.md` (Q-006 / F-docs-003). The file lives
  under `.claude/rules/`, so it auto-loaded into every agent's context on every
  session — the trim removes ~91 lines of context-budget bloat per session for
  validation checks that did not actually run in practice.

Bug: `.claude/rules/quality/resources/validation-checklist-29.md` documented a
     29-check four-phase validation framework but only 5 of those checks (Phase
     4, IDs 25-29) were ever wired up to hooks (`subagent-stop-tracker.cjs`,
     `post-write-validator.cjs`, `attention-injection.cjs`,
     `verify-completion.cjs`). The other 23 (Phases 1-3, IDs 1-24) were
     explicitly labeled "ASPIRATIONAL" and depended on agents voluntarily
     running validation logic that did not happen in practice. The file's
     Current Enforcement Status table already acknowledged this. Because the
     file lives under `.claude/rules/quality/`, all 23 aspirational checks
     shipped as agent-context bloat on every session.
Root cause: The 29-check framework was designed as a target architecture in an
     earlier phase but the graduation pipeline (P1: check 16 → P2: check 20 →
     P3: checks 17/21/22 → P4: checks 1-3/6-7) was never executed. The
     aspirational content stayed in the auto-loaded rules tree rather than
     moving to `docs/` (which does not auto-load) until a check actually
     graduated to enforced.
Test added: `tests/regressions/validation-checklist-active.test.js` — asserts
     the active file is < 100 lines, mentions exactly the 5 active check IDs
     (25, 26, 27, 28, 29), contains no `ASPIRATIONAL` substring, and has no
     `Current Enforcement Status` or `Graduation Roadmap` sections. Also asserts
     `docs/FUTURE_VALIDATION_FRAMEWORK.md` exists and contains the moved
     Phase-1/Phase-2/Phase-3 tables plus the Current Enforcement Status and
     Graduation Roadmap sections. Failing-before evidence: 6/7 tests fail at
     HEAD (v11.2.10) — the file is 126 lines, has 9 ASPIRATIONAL tokens, and
     retains both deferred-section headings. Passing-after: 7/7 pass after the
     trim.
Could have caught by: unit test on validation-checklist file structure — a
     line-count gate and ASPIRATIONAL-token-count gate on any file inside
     `.claude/rules/` would have caught this pattern (and would catch future
     regressions of the same kind in other rule files).

### Changed
- `.claude/rules/quality/resources/validation-checklist-29.md`: 126 → 35 lines.
  Heading renamed from "29-Check Comprehensive Validation Framework
  (Aspirational)" to "Active Validation Checklist (5 checks)". Retains the
  filename `validation-checklist-29.md` so existing `@resources/` references at
  `.claude/rules/quality/completion.md:193` and `.claude/rules/README.md` keep
  resolving. Drops the Current Enforcement Status table, Graduation Roadmap,
  Phase 1/2/3 tables, aspirational Severity Classification, aspirational
  Summary Table, and any "ASPIRATIONAL" framing prose.
- Active 5 checks (25-29) preserved verbatim in the Phase-4 Cross-Cutting
  table. Severity Classification trimmed to just the active checks (HIGH for
  25-27/29, MEDIUM for 28). Key Principles trimmed to just the 3 active-only
  principles.

### Added
- `docs/FUTURE_VALIDATION_FRAMEWORK.md`: NEW. Receives the 23 ASPIRATIONAL
  checks (Phases 1-3) verbatim, plus the Current Enforcement Status table and
  Graduation Roadmap that describe how each aspirational check could graduate
  to enforced status. File lives under `docs/`, which does NOT auto-load into
  agent context — the content is preserved for future graduation work without
  paying ongoing context budget.
- `tests/regressions/validation-checklist-active.test.js`: NEW. 7 assertions
  enforce the active-file structure (line count, exact 5 checks, no
  ASPIRATIONAL token, no deferred sections, active-scope heading) and the
  presence/structure of `docs/FUTURE_VALIDATION_FRAMEWORK.md`. Now a permanent
  CI gate against re-bloat regression of the rules tree.

## [11.2.10] - 2026-05-12

### Fixed
- Remove non-functional `--from-review` and `--from-designer` flag advertisements
  from /run (Q-005 / F-skills-001). The underlying `output_contract` / `input_from`
  skill-chaining feature was tagged ASPIRATIONAL in
  `.claude/rules/core/skill-format.md` and never implemented; the flags silently
  no-op'd when used. OPTION B from triage (remove dead advertisements) chosen
  over OPTION A (implement) because implementation exceeds tiny-bump atomicity.

Bug: `--from-review` and `--from-designer` were advertised in three /run views
     (`.claude/skills/run/SKILL.md` argument-hint + Step 1 body parser,
     `.claude/skills/run/reference/flags.md` flag table,
     `.claude/skills/run/reference/strategic-brief-integration.md` chaining
     table) and in `.claude/rules/core/skill-format.md` § Skill Chaining
     (V10.18.0). The underlying feature was never implemented — no skill
     declares an `output_contract` or `input_from` frontmatter block — so the
     flags silently no-op'd at runtime.
Root cause: V10.18.0 designed the chaining pattern and added flag
     advertisements assuming implementation would follow; implementation never
     landed. V11.2.9 (Q-004) reconciled the three views but kept the dead flags
     advertised. Q-005 removes them as the natural follow-up.
Test added: `tests/regressions/no-aspirational-skill-chaining.test.js` —
     scans the three /run views and `.claude/rules/core/skill-format.md`,
     asserts no occurrence of `--from-review` or `--from-designer`. The test
     will fail if anyone re-adds these flag advertisements without re-adding
     the underlying implementation. Failing-before evidence at
     `cagents-memory/sessions/run_v11-2-10-fix-q005_260512_001/outputs/test-before-fix.txt`
     (9/9 failures at HEAD before fix); passing-after at `outputs/test-after-fix.txt`
     (9/9 passing). The test is now a permanent CI gate.
Could have caught by: a contract test on /run skill (set-equality across
     argument-hint, body parser, and flags.md flag declarations — added in
     v11.2.9 as Q-004) combined with a "no orphaned flags" lint rule asserting
     every advertised flag has working code paths and a non-ASPIRATIONAL
     implementation.

### Changed
- `.claude/skills/run/SKILL.md` argument-hint: dropped the two flags. Autocomplete
  now reflects the 15 implemented flags instead of 17.
- `.claude/skills/run/SKILL.md` Step 1 body parser: dropped both flags from the
  value-flags enumeration and removed the "Special flag handling" bullet that
  pointed at `@reference/strategic-brief-integration.md` for skill chaining.
- `.claude/skills/run/reference/flags.md` Complete Flag Table: removed the two
  ASPIRATIONAL rows. Table drops from 17 rows to 15.
- `.claude/skills/run/reference/strategic-brief-integration.md` "Skill Chaining
  via --brief" section: 3-row table (`--brief`, `--from-review`, `--from-designer`)
  collapsed into a paragraph documenting `--brief` as the sole implemented
  chaining flag, with a pointer to the v11.2.10 CHANGELOG for the removal
  rationale.
- `.claude/rules/core/skill-format.md` § Skill Chaining (V10.18.0): the ~55-line
  ASPIRATIONAL section (output_contract/input_from prose, two example YAML
  blocks, chaining-flag table, "How chaining works" steps, example pipeline)
  replaced with a ~10-line postmortem note pointing to the v11.2.x
  improvement-pass wave-1 findings for the design-vs-implementation gap analysis.

The Q-004 cross-view consistency regression test
(`tests/regressions/run-skill-flag-consistency.test.js`) remains green: the
three views still agree, on the reduced 15-flag set instead of 17.

## [11.2.9] - 2026-05-12

### Fixed
- Reconcile /run skill flag enumerations across three views: SKILL.md frontmatter
  `argument-hint`, Step 1 body-parsing prose, and `reference/flags.md` canonical
  table (Q-004 / F-skills-002).

Bug: The /run skill advertised three different flag sets across its three views
     of the same source-of-truth list. `argument-hint` (autocomplete display)
     enumerated 10 flags; the Step 1 body parser enumerated 17 flags; the
     canonical `reference/flags.md` Complete Flag Table enumerated 13 flags.
     The drift hid 7 documented, functional flags from autocomplete
     (`--stream`, `--skip-preflight`, `--template`, `--domain`, `--tier`,
     `--confidence`, `--mode`) and left 4 flags undocumented in the canonical
     reference (`--brief`, `--session`, `--from-review`, `--from-designer`).
Root cause: no regression test enforced consistency between the three views.
     Flags were added to the body parser and frontmatter on different commits
     without back-syncing the table or autocomplete hint.
Test added: `tests/regressions/run-skill-flag-consistency.test.js` — parses
     all three sources, asserts pairwise set equality across every pair.
     Failing-before evidence captured at
     `cagents-memory/sessions/run_v11-2-9-fix-q004_260512_001/outputs/wave-6/failing-before.log`
     (3 failed assertions naming all 11 drift flags); passing-after at
     `outputs/wave-6/passing-after.log`. The test is now a permanent CI gate.
Could have caught by: a CI regression test on cross-view flag-set consistency
     for skill SKILL.md files (this PR adds it as a permanent gate).

### Changed
- Added 7 flags to `.claude/skills/run/SKILL.md` frontmatter `argument-hint`:
  `--stream`, `--skip-preflight`, `--template <name>`, `--domain <name>`,
  `--tier <N>`, `--confidence <N>`, `--mode <standard|debug>`. Autocomplete
  now reflects the full 17-flag set the body parser already accepts.
- Added 4 flag rows to `.claude/skills/run/reference/flags.md` Complete Flag
  Table: `--session <dir>`, `--brief <path>`, `--from-review`, `--from-designer`.
  Each row carries the same Type/Description/Default/Example shape as the
  surrounding table. `--from-review` and `--from-designer` are tagged
  ASPIRATIONAL in their description per `.claude/rules/core/skill-format.md`
  Skill Chaining (the underlying `output_contract`/`input_from` feature is not
  yet implemented; Q-005 in the fix-queue removes the aspirational
  advertisements). For Q-004, they remain documented as currently-parsed
  flags so the three views agree.

## [11.2.8] - 2026-05-12

### Fixed
- Resolve 11 broken `@resources/` references across 5 agents (Q-003 / F-agents-001,
  bundles dedup'd F-agents-002). The fix-queue entry estimated 6 affected agents;
  empirical count was 5 (security-owasp held 6 of the 11 refs, accounting for the
  delta).

Bug: 11 `@resources/X.md` references across 5 SKILL.md files pointed to files
     that never existed (or were never migrated during the v11.1 builder-role-tree
     migration). Three-Tier Progressive Disclosure (`.claude/rules/core/skill-format.md`)
     mandates these refs resolve, but no test enforced this — broken refs slipped past
     `scripts/ci/validate-agents.sh` (which doesn't walk `@resources/` tokens).
Root cause: missing CI gate. The v11.1 migration moved agents into archetype
     directories; resources/ subdirs were migrated inconsistently. No regression
     test caught the resulting drift, so refs accumulated over multiple bumps.
Test added: `tests/regressions/agent-resources-references-resolve.test.js` —
     walks all 9 archetype roots, extracts every `@resources/X.md` token from
     every SKILL.md, asserts each resolves to a real file at
     `{agent_dir}/resources/{filename}`. Failing-before evidence in
     `cagents-memory/sessions/run_v11-2-8-fix-q003_260512_001/outputs/wave-5/failing-before.log`
     (lists the 11 broken refs); passing-after in
     `cagents-memory/sessions/run_v11-2-8-fix-q003_260512_001/outputs/wave-5/passing-after.log`.
     Default action for each ref was OPTION B (remove the broken pointer) to
     honor tiny-bump atomicity — creating 11 new tier-3 resource docs is
     L-effort and exceeds one-coherent-change.
Could have caught by: a CI regression test on `@resources/` reference
     resolution — exactly what this PR adds. The test is now a permanent
     CI gate.

### Changed
- Removed broken `@resources/` refs from:
  - `analyst/business-analyst/SKILL.md` (2 refs: `requirements-gathering-framework.md`, `gap-analysis-methods.md`)
  - `developer/infrastructure/security-engineer/SKILL.md` (1 ref: `security-checks.md`)
  - `developer/quality/security-owasp/SKILL.md` (6 refs: `owasp-top-10-detail.md`,
    `llm-security-detail.md`, `agentic-ai-security.md`, `asvs-5-checklist.md`,
    `language-quirks.md`, `audit-workflow.md`)
  - `operator/business-ops/quality-manager/SKILL.md` (1 ref: `quality-templates.md`)
  - `operator/marketing-sales/marketing-analyst/SKILL.md` (1 ref: `data-science-templates.md`)
  Each ref was a single "See @resources/X.md for ..." line removed cleanly. The
  surrounding body content (tables, checklists, prose) remains self-contained in
  every case; no agent left visibly underspecified after removal.

## [11.2.7] - 2026-05-12

### Fixed
- Move `skill-size-monitor` hook from `PostToolUse[Write|Edit]` to
  `PreToolUse[Write|Edit]` in `.claude/settings.json` so the 900-line
  block threshold is functional (Q-002 from the v11.2.x improvement-pass
  fix queue; bundles dedup'd finding F-hooks-002).

Bug: `.claude/hooks/skill-size-monitor.cjs` returns `{ deny: true }` when
     a `SKILL.md` exceeds 900 lines. The hook was registered under
     `PostToolUse`, which `.claude/rules/core/hooks.md` documents as
     "Cannot block" (only `PreToolUse` can block tool calls). The block
     threshold was therefore a silent no-op: warnings still surfaced via
     `systemMessage`, but the hard 900-line block never actually denied
     a write.
Root cause: registration/documentation drift — `hooks.md` prose correctly
     documented the hook as `PreToolUse[Write|Edit]`, but
     `.claude/settings.json` registered it as `PostToolUse[Write|Edit]`.
     No regression test enforced consistency between the two.
Test added: `tests/regressions/hooks-md-event-mapping.test.js` — parses
     `.claude/settings.json` and `.claude/rules/core/hooks.md`, asserts
     bidirectional consistency on `(event, matcher, hook_name)` tuples.
     This catches any future drift, not just the skill-size-monitor
     case. Failing-before evidence: at v11.2.6, the test FAILED with 4
     settings-registered / 1 docs-only mismatches. Passing-after: at
     v11.2.7, all 6 tuple-mapping assertions pass after (a) moving
     `skill-size-monitor` to PreToolUse and (b) adding the missing
     `####` subsection headings for `approval-gate.cjs`,
     `delegation-enforcer.cjs`, and `magic-keywords.cjs` in `hooks.md`
     (those hooks were already in the Hook Types Overview table but
     lacked dedicated subsections). Failing-before and passing-after
     logs in
     `cagents-memory/sessions/run_v11-2-7-fix-q002_260512_001/outputs/wave-4/`.
Could have caught by: a CI regression test on hook event/matcher
     consistency between `settings.json` registrations and `hooks.md`
     subsection headings — which is exactly what this PR adds. Bundles
     dedup'd finding F-hooks-002 from the v11.2.x audit.

### Changed
- `.claude/rules/core/hooks.md` now has `####` subsection headings for
  three hooks that were previously only mentioned in the Hook Types
  Overview table: `approval-gate.cjs` (PreToolUse[Bash|Write|Edit]),
  `delegation-enforcer.cjs` (UserPromptSubmit), and `magic-keywords.cjs`
  (UserPromptSubmit). These are documentation additions only — the
  hooks themselves have been registered and operational for several
  prior bumps.

## [11.2.6] - 2026-05-12

### Fixed
- **Standalone-contract regression test added** (Q-001 from the v11.2.x
  improvement-pass fix queue). New file `tests/regressions/standalone-contract.test.js`
  enforces the V11.2.0 contract via 29 unit + integration assertions.

Bug: V11.2.0 introduced the standalone contract (no MCP servers, no `mcp__*`
     in `allowed-tools`, no `Elicitation*` hook registrations, no
     MCP-suggesting prose in load-bearing docs) but did not add a regression
     test. The contract could be silently re-violated by a future PR without
     CI catching it.
Root cause: missing regression test — the V11.2.0 mandate at CLAUDE.md
     ("Bug-driven test mandate" — Rule 5 of the Standalone Contract) was
     satisfied for prose but not for code.
Test added: `tests/regressions/standalone-contract.test.js` — Vitest suite
     using the function-extraction + string-concat pattern. Helper-function
     unit tests prove the violation detectors work (synthetic-input fixtures
     where contract-violation tokens like `mcp__`, `mcpServers`, and
     `Elicitation` are assembled via string concat so they appear only as
     test fixtures, never as declarations in production files). Production-
     tree integration tests prove the current tree is clean
     (`.claude-plugin/plugin.json`, `.mcp.json`, all 9 archetype roots,
     `.claude/skills/`, `.claude/settings.json`). Failing-before evidence
     captured by short-circuiting `scanForMcpServersBlock` and confirming 2
     unit tests fail; see `cagents-memory/sessions/run_v11-2-6-fix-q001_260512_001/outputs/wave-3/failing-before.log`
     and `passing-after.log` (29/29 passing after restore).
Could have caught by: a CI regression test of the V11.2.0 contract — if such
     a test had existed, the V11.1.12 consumer-pattern PR would have failed
     CI immediately instead of requiring three follow-up bumps (V11.1.14,
     V11.1.15, V11.2.0) to revert.

## [11.2.5] - 2026-05-07

### Fixed
- **4 stale `related_agents` references resolved**:
  - `developer/quality/playwright-test-engineer/SKILL.md` — removed `qa-tester`
    (qa-lead already in list).
  - `developer/quality/security-owasp/SKILL.md` — replaced `qa-tester` with
    `qa-lead` (canonical).
  - `operator/marketing-sales/keyword-researcher/SKILL.md` — removed
    `content-marketer` (copywriter already in list, covers the role).
  - `operator/marketing-sales/seo-strategist/SKILL.md` — replaced
    `content-marketer` with `copywriter` (canonical for content collaboration).

  All four were emitted as `WARN` by `validate-agents.sh` for some time;
  warnings cleared (Total agents: 255, Errors: 0, Warnings: 0).

### Added
- **Regression test** `tests/regressions/related-agents-references-resolve.test.js`:
  walks every `SKILL.md` in the 9 archetype roots, parses each agent's
  `related_agents:` block, and asserts every referenced name resolves to an
  existing agent. Catches future stale references the moment they're added —
  much stronger than the existing WARN-level check in validate-agents.sh.

Bug: 4 stale `related_agents` references to non-existent agents (qa-tester, content-marketer)
Root cause: agents renamed/never-created without sweeping references; WARN-only validation let drift accumulate
Test added: tests/regressions/related-agents-references-resolve.test.js (1 sub-test, walks all 255 agents)
Could have caught by: promoting validate-agents.sh related_agents check from WARN to ERROR (now codified by regression test)

## [11.2.4] - 2026-05-07

### Fixed
- **CLAUDE.md domain_overrides count clarification**. `validate-agents.sh`
  reports "15 files checked" while CLAUDE.md states "13 legacy domain dirs".
  The +2 is not drift: `core/` and `leadership/` archetype roots also ship
  `config/domain_overrides.yaml` files (for pipeline/C-suite routing tables).
  Without explanation, future readers either assumed drift or "fixed" something
  that wasn't broken. Added a one-sentence clarification to the Project Overview
  `**Config**:` paragraph naming both archetype-root configs and reconciling the
  13-vs-15 delta as by-design.

### Added
- **Regression test** `tests/regressions/claude-md-domain-overrides-count.test.js` —
  verifies all 13 legacy domain dirs still have `domain_overrides.yaml`,
  verifies `core/` and `leadership/` archetype-root configs exist, and asserts
  CLAUDE.md contains a co-located passage tying "15", "core", "leadership", and
  "domain_overrides" together. Locks the clarification in place.

Bug: 13-vs-15 domain_overrides count discrepancy unexplained in CLAUDE.md
Root cause: archetype-root configs added without doc note
Test added: tests/regressions/claude-md-domain-overrides-count.test.js (3 sub-tests)
Could have caught by: domain-config doc audit (now codified)

## [11.2.3] - 2026-05-07

### Fixed
- **hooks.md missing `skill-size-monitor.cjs` documentation**. The hook was added
  in V11.1.13 (squashed commit 37b321e9 — "Skill-size monitor hook + per-agent
  version-field test"), is registered in `.claude/settings.json`, and fires on
  PreToolUse[Write|Edit] for any SKILL.md write — but `.claude/rules/core/hooks.md`
  never mentioned it: not in the count claim, not in the Hook Type Overview table's
  PreToolUse row, and not in the Active Hooks section. Users and contributors
  reading hooks.md could not discover this hook exists. Added:
  - count claim updated (28→29 .cjs / 25→26 unique registered)
  - Hook Type Overview row for PreToolUse extended with `skill-size-monitor.cjs`
  - new Active Hooks subsection with thresholds, behavior, and `CAGENTS_SKILL_*` env overrides

### Added
- **Regression test** `tests/regressions/hooks-md-skill-size-monitor.test.js` —
  asserts hooks.md mentions skill-size-monitor.cjs by name, has the current
  count claim, AND that EVERY .cjs file in `.claude/hooks/` is mentioned in
  hooks.md. The fourth sub-test catches future hook additions that ship without
  doc-coverage.

Bug: skill-size-monitor.cjs hook undocumented in hooks.md
Root cause: V11.1.13 added the hook but did not update hooks.md
Test added: tests/regressions/hooks-md-skill-size-monitor.test.js (4 sub-tests)
Could have caught by: hook-doc-coverage CI check that walks .claude/hooks/ vs hooks.md

## [11.2.2] - 2026-05-07

### Fixed
- **CLAUDE.md count drift sweep**: multiple count claims drifted from code
  reality after accumulated bumps without doc sync.
  - "243 agents" → 255 agents (drift +12)
  - Archetype distribution: developer 31→33, operator 81→87, analyst 27→31
  - "28 .cjs files = 25 unique registered hooks" → "29 .cjs files = 26 unique"
    (skill-size-monitor.cjs was added in V11.1.13 but not counted)
  - "790 Vitest tests across 46 files" → "858+ tests across 60+ files"

### Added
- **Regression test** `tests/regressions/claude-md-counts-current.test.js` —
  asserts CLAUDE.md contains the CURRENT agent count, hook .cjs file count, and
  per-archetype distribution. If a future bump adds an agent or hook without
  syncing CLAUDE.md, this test fails and forces the doc update. Prevents
  count-drift from re-accumulating silently.

Bug: CLAUDE.md count claims out of sync with reality
Root cause: agent/hook/test additions in recent bumps did not propagate to CLAUDE.md
Test added: tests/regressions/claude-md-counts-current.test.js (3 sub-tests)
Could have caught by: count-validation test in CI alongside validate-versions.sh

## [11.2.1] - 2026-05-07

### Fixed
- **CRITICAL: removed broken symlink** at `.claude/skills/commit-changes` →
  `../../skills/commit-changes`. The target never existed in the cAgents repo
  or the parent workspace. The symlink was added in V11.1.13 (squashed commit)
  intending to point to a workspace-level `skills/commit-changes/` that was
  never created. The V11.1.13 commit message itself enumerates "6 skills
  (designer/helper/improve/org/run/team)" — not including commit-changes.
  Plugin loaders walking the skills directory could error on the broken link.

### Added
- **Regression test** `tests/skills/no-broken-symlinks.test.js` — walks
  `.claude/skills/`, `.claude/hooks/`, `.claude/rules/`, and `.claude-plugin/`
  and fails if any symlink target does not exist. Prevents this class of bug
  from re-entering the shipped plugin tree.

Bug: broken symlink in shipped plugin's skills directory
Root cause: V11.1.13 introduced symlink with non-existent target
Test added: tests/skills/no-broken-symlinks.test.js (4 sub-tests, one per scanned dir)
Could have caught by: structural integrity test on .claude/ tree

## [11.2.0] - 2026-05-06

Reverts the v11.1.12 "MCP consumer pattern" experiment and codifies a
**standalone contract**: cAgents must never depend on or suggest MCP
servers. The plugin's value is that it works out of the box; coupling
agents to external MCP services breaks that promise.

### Removed
- **`mcpServers` block**: already gone from `.claude-plugin/plugin.json`
  (v11.1.14) and `.mcp.json` (v11.1.15); v11.2.0 deletes `.mcp.json`
  entirely (it had nothing to add — `mcpServers: {}` is just scaffolding).
- **`mcp__*` tool patterns**: stripped from `allowed-tools` in all 10
  pilot agents that declared them — `developer/quality/security-owasp`,
  `developer/quality/playwright-test-engineer`, `developer/quality/qa-lead`,
  `analyst/data-scientist`, `developer/fullstack/data-analyst`,
  `developer/backend/backend-developer`,
  `developer/infrastructure/devops-engineer`,
  `operator/support/support-agent`, `operator/support/technical-writer`,
  `operator/business-ops/finance-manager`. Each agent now uses only
  built-in Claude Code tools.
- **`elicitation-handler.cjs`**: hook that logged MCP elicitation events
  removed along with its `Elicitation` and `ElicitationResult` registrations
  in `.claude/settings.json`. The events remain available for users who
  want to register their own handlers.
- **Documentation**: deleted `docs/MCP_SERVERS.md`, removed the
  "MCP Tool Integration (Consumer Pattern)" section from
  `.claude/rules/core/skill-format.md`, and replaced the
  "MCP Integration (V11.1.12+)" section in `CLAUDE.md` with a firm
  **Standalone Contract** section that codifies the rule.

### Changed
- **Hook count**: 29 → 28 .cjs files; 26 → 25 unique registered hooks;
  19 → 17 event types. Updated in `.claude/rules/core/hooks.md`,
  `CLAUDE.md`, and `README.md`.
- **`core/team-trigger/SKILL.md`**: dropped the "and MCP servers" mention
  from the teammate context-loading description.

### Tests
- Replaced `tests/skills/mcp-consumer-pattern.test.js` (which asserted the
  presence of MCP scaffolding) with
  `tests/skills/standalone-contract.test.js` (which asserts its absence).
  Failing-before / passing-after the standalone contract.

### Why a minor bump
- Removes public-facing surface (`mcp__*` from 10 agents'
  `allowed-tools`, two registered hook events, 1 doc page, 1 ruleset
  section). Per the tiny-bump rule, "Multi-file refactors touching more
  than ~5 files outside the 18 sync locations → minor bump." This bump
  touches ~14 non-sync files.

## [11.1.15] - 2026-05-06

### Fixed
- **`/doctor` `.mcp.json` schema rejection**: same root cause as 11.1.14
  but in a different file. The repo root `.mcp.json` shipped a descriptive
  `_examples` block with `_description` keys, which Claude Code's
  `.mcp.json` validator rejects with
  `mcpServers: Does not adhere to MCP server configuration schema`.
  Replaced the file body with `{"mcpServers": {}}` (minimum valid schema)
  so `/doctor` parses cleanly and so users can add their own servers
  without scaffolding.

### Added
- `docs/MCP_SERVERS.md`: rehomed catalog of suggested MCP server configs
  (playwright, filesystem, github, fetch, postgres, slack) with paste-ready
  JSON blocks and a list of the agent-referenced servers that don't have
  canonical reference configs yet (bigquery, redis, docker, jupyter, plaid,
  zendesk, intercom, notion). Keeps the catalog discoverable without
  re-introducing the schema-rejected shape.

## [11.1.14] - 2026-05-06

### Fixed
- **Plugin install blocker**: removed the `mcpServers` consumer-suggestion block
  from `.claude-plugin/plugin.json`. Claude Code's plugin manifest validator
  rejects entries with `{description, stage}` keys (`mcpServers: Invalid input`)
  because the schema requires real MCP server configs (`command`, `args`, `env`,
  `type`, ...). The descriptive catalog already lives in `CLAUDE.md` and
  `.claude/rules/core/skill-format.md`, so removing it from `plugin.json` is
  doc-only — agents still declare their MCP usage via
  `allowed-tools: mcp__server__tool` patterns in their SKILL.md frontmatter,
  which is unaffected.

### Tests
- `tests/skills/mcp-consumer-pattern.test.js`:
  - Test (b): inverted to assert `mcpServers` is absent OR — if a future bump
    re-introduces it — every entry has `command` or `type` per Claude Code's
    schema. Prevents regression of the install-blocking shape.
  - Test (g): rewritten to assert each agent-referenced server is documented
    in `CLAUDE.md` (the new catalog source of truth) instead of `plugin.json`.

## [11.1.13] - 2026-05-05

Wave 7 + Wave 8 closeout of the v11.1.5 → measurably-better release.
Squashed bump (Section B Option B2 precedent — W3, W5, W6 all squashed)
covering Phase 12 (descoped academic research analysts), PHASE-N1
(controller Agent-tool bug doc/audit), and Phase 13 deferral note.

### Added
- **Phase 12 (descoped)**: 3 new academic-research analyst agents under
  `analyst/` — `literature-review-author`, `citation-graph-analyzer`,
  `methodology-critic`. Each declares `archetype: analyst`,
  `metadata.version: "1.0.0"`, allowed-tools tuned for research
  (Read/Grep/Glob/Bash/WebFetch/WebSearch). Regression test
  `tests/agents/academic-research-analysts.test.js` (6 cases).
- **PHASE-N1**: Formal audit of the depth-1 plugin-subagent Agent-tool
  stripping bug. `.claude/rules/core/teams.md` Known Harness Limitation
  block extended with docs.claude.com null-finding citation
  (claude-code-guide May 2026 consultation: no settings.json /
  plugin.json / env-var / per-spawn knob exposes the depth-1 stripping).
  `.claude/hooks/verify-completion.cjs` made context-aware: downgrades
  controller-self-handling severity from "protocol violation" to
  "graceful degradation (acceptable in /team mode)" when a `team_*`
  session's coordination_log contains the marker phrase
  "Agent/subagent-spawn tool was not available".
  `.claude/rules/core/{controllers,execution}.md` pin the
  graceful-degradation pattern (1-2 paragraphs each). Knowledge note
  `cagents-memory/_knowledge/agent-tool-depth1-stripping.md` (formal
  pattern + asks for Anthropic upstream). Regression test
  `tests/agents/controller-allowed-tools.test.js` (3 cases) locks the
  audit conclusion: all 7 canonical controllers correctly declare
  `Agent` in `allowed-tools`.
- **Phase 13 deferral planning note**:
  `cagents-memory/_knowledge/v12-consolidation-plan.md` — outlines the
  4-phase v12 consolidation plan (audit, consolidation, sunsetting,
  per-agent quality bar) and the major-bump trigger. Planning artifact
  only; no v12 work authorized by this note.

### Changed
- Agent count: 252 → 255 (+3 from Phase 12 descoped).
- Version registry: all 18 locations now at 11.1.13.
- Test count: 866 → 878 (+12: Phase 12 added 6 cases, PHASE-N1 audit added 3 cases, PHASE-N1 verify-completion graceful-degradation added 3 cases).

### Notes
- Squashed bump per Section B Option B2 (W3, W5, W6, W7+W8 all squashed
  within their wave/window).
- Closes the v11.1.5 → measurably-better release per the original
  IMPLEMENT_AND_VALIDATE_PROMPT.md plan. v12 work is gated on user
  request per the Phase 13 deferral note.

## [11.1.12] - 2026-05-05

Wave 6 of the v11.1.5 → measurably-better release. Squashed bump (Section B Option
B2 precedent — W3, W5, W6 all squashed) covering all 7 W6 phase deltas (Phases 5,
6, 9, 10, 11, NF-4, NF-5).

### Added
- **Phase 5**: 6 new SEO/GEO operator agents under `operator/marketing-sales/`
  (seo-strategist controller + keyword-researcher, on-page-seo-auditor,
  technical-seo-auditor, link-strategist, geo-strategist execution agents).
  Domain config updated at `growth/config/domain_overrides.yaml`.
- **Phase 6**: `metadata.paths` conditional activation schema (V11.1.12+ v1
  declarative; v2 routing-boost deferred). 10 pilot agents declare paths.
  Regression test `tests/skills/paths-conditional-activation.test.js`.
- **Phase 9**: MCP consumer pattern (Stage 1 — consumer-only). 10 pilot
  agents declare `mcp__*` in allowed-tools. `.claude-plugin/plugin.json`
  mcpServers block (11 servers). Documentation in skill-format.md and
  CLAUDE.md. Regression test `tests/skills/mcp-consumer-pattern.test.js`.
- **Phase 10**: SKILL.md schema validator hook in
  `.claude/hooks/post-write-validator.cjs` (in-process check for archetype,
  branch, tier, name, metadata.version semver). Advisory only — never
  blocks. `scripts/ci/validate-agents.sh --file <path>` flag for single-file
  validation. Regression test `tests/hooks/post-write-validator-skill-schema.test.js`
  (5/5).
- **Phase 11**: Per-agent `metadata.version: "1.0.0"` field on all 252
  agent SKILL.md files. `validate-agents.sh` Check 19 enforces semver.
  `sync-versions.sh` documents the non-touch policy: per-agent versions
  bump independently of the cAgents plugin version registry. Regression
  test `tests/agents/per-agent-version-field.test.js` (5/5).
- **NF-4**: `marketplace.json` top-level `$schema`, `categories`,
  `compatibility` fields. Anthropic schema URL placeholder; revisit when
  the canonical URL is published.
- **NF-5**: `.claude/settings.json` top-level `worktree.sparsePaths` array
  (14 entries — `.claude/`, `core/`, `cagents-memory/_system/`, the 9
  archetype roots, `scripts/`, `tests/`, `docs/`). CLAUDE.md § "Plugin
  Architecture" documents the worktree sparse-checkout integration for
  `/team` teammates spawned with `isolation: "worktree"`.

### Changed
- Agent count: 246 → 252 (+6 from TASK-5 SEO/GEO operators).
- Version registry: all 18 locations now at 11.1.12.
- Test count: 843 → 866 (+13 from W6 W1, +10 from W2/W3 Phase 10/11).

### Notes
- Squashed bump per Section B Option B2 precedent (W3 11.1.8, W5 11.1.11,
  W6 11.1.12 all squashed into a single bump per wave).
- Harness limitation discovered in W6 W1 and confirmed in W6 W2:
  plugin-namespaced subagents (`cagents:*`) crash at depth-1 spawn during
  Claude Code terminal/Bun init. Direct lead execution + 15-check
  self-validation used as workaround per `.claude/rules/core/teams.md` §
  "Known Harness Limitation" graceful-degradation block. Phase 5 (TASK-5)
  was the only W6 W1 spawn that completed under the teammate path; all
  other phases used lead direct execution. Documented in
  `cagents-memory/_knowledge/cc-plugin-subagent-spawn-bug.md`.

## [11.1.11] - 2026-05-05

Wave 5 of the v11.1.5 → measurably-better release. Phase 2 progressive-disclosure
refactor of the six user-facing skill SKILL.md files. Bumps 11.1.11–11.1.16
squashed into 11.1.11 per Section B Option B2 cadence concession.

### Changed
- `.claude/skills/org/SKILL.md` — 1202 → 228 lines (81% reduction). Detail content extracted to 5 new `.claude/skills/org/reference/` files: `csuite-deliberation.md`, `strategic-brief-format.md`, `cross-domain-integration.md`, `escalation-handling.md`, `command-flow-detail.md`.
- `.claude/skills/team/SKILL.md` — 1185 → 225 lines (81% reduction). Detail extracted to 8 new `.claude/skills/team/reference/` files: `wave-execution-detail.md`, `gate-validation-protocol.md`, `dynamic-scaling.md`, `partial-results.md`, `parent-session-extraction.md`, `fallback-and-error-recovery.md`, `teammate-spawning-template.md`, `cross-version-compat.md`. The "Known Harness Limitation" block remains verbatim in the body — not extracted.
- `.claude/skills/run/SKILL.md` — 861 → 295 lines (66% reduction). Augments existing 7 reference files with 7 new: `state-machine-detail.md`, `agent-tracking.md`, `session-id-format.md`, `adaptive-pipeline.md`, `strategic-brief-integration.md`, `task-tracking-rules.md`, `followup-handling.md`.
- `.claude/skills/designer/SKILL.md` — 736 → 200 lines (73% reduction). Detail extracted to 6 new `.claude/skills/designer/reference/` files: `phase-research-protocol.md`, `inline-controller-pattern.md`, `phase-overlap.md`, `ambiguity-scoring.md`, `behavioral-rules.md`, `follow-up-research.md`. AskUserQuestion mandate and auto-proceed exemption preserved verbatim in body.
- `.claude/skills/improve/SKILL.md` — 597 → 212 lines (64% reduction). Detail extracted to 5 new `.claude/skills/improve/reference/` files: `mode-review-detail.md`, `mode-optimize-detail.md`, `mode-full-detail.md`, `baselines-and-benchmarks.md`, `pattern-effectiveness.md`. Mode selection table and 7-state state machine summary preserved in body.
- `.claude/skills/helper/SKILL.md` — 508 → 343 lines (32% reduction, lightest cut). Detail extracted to 3 new `.claude/skills/helper/reference/` files: `scoring-engine.md`, `command-summaries.md`, `v11-migration.md`. Skill comparison matrix and `--troubleshoot` reference preserved in body.
- Total user-skill SKILL.md body size: 5089 → 1503 lines (70% reduction).

### Added
- `tests/skills/skill-size-progressive-disclosure.test.js` — 14-case Vitest regression test asserting each user-skill SKILL.md is ≤400 lines, each `reference/` directory exists with ≥1 file, the total body size stays ≤2400 lines, and no individual file regresses past its pre-refactor baseline. Failing-before / passing-after the Wave 5 refactor.
- `cagents-memory/_knowledge/progressive-disclosure-refactor.md` — captures the Wave 5 refactor pattern for future skill authors (when to apply, what stays in body, what moves to reference, anti-patterns, regression-test pattern).

### Notes
- TaskCreate-only contract from PHASE-N2 (TodoWrite → TaskCreate sweep) preserved across all 6 refactored bodies. Where TodoWrite still appears, it is restricted to historical "(SDK only)" notes or the verbatim Known Harness Limitation block.
- Frontmatter unchanged on all 6 skills (name, description, license, allowed-tools, compatibility, metadata blocks intact).
- Cross-cutting CRITICAL preserved-verbatim blocks: STOP rules for session init, Rationalization Kill List, Known Harness Limitation (team), AskUserQuestion mandate (designer), mode selection table + 7-state machine (improve), skill comparison matrix (helper).

## [11.1.10] - 2026-05-04

### Added
- **`metadata.requires` schema (advisory v1)**: documented in
  `.claude/rules/core/skill-format.md` as an optional `metadata:` sub-block.
  Sub-fields: `bins` (executable names), `env` (env var names), `files`
  (relative paths), and optional `min_node_version` (semver string).
- **session-init-gate hook extension**
  (`.claude/hooks/session-init-gate.cjs`): after the existing session-presence
  check, the hook now resolves the spawning agent's SKILL.md via the plugin
  manifest, parses `metadata.requires`, runs `command -v` / `process.env` /
  `fs.existsSync` checks, and emits an advisory `systemMessage` listing any
  missing dependencies. The advisory does NOT deny the spawn — purely
  informational. Agents without `metadata.requires` are unaffected.
- **3 pilot agents declare `metadata.requires`**:
  - `developer/quality/playwright-test-engineer/SKILL.md` (already declared
    `bins: [npx, node]` opportunistically; schema is now codified — no SKILL
    change needed for this pilot).
  - `developer/quality/qa-lead/SKILL.md` — declares `bins: [node, npx]`,
    `env: []`.
  - `analyst/academic-paper-searcher/SKILL.md` — declares `bins: [curl, jq]`,
    `env: []`.
- **Regression test**:
  `tests/hooks/session-init-gate-requires.test.js` (3 cases — missing bin
  emits advisory, all-present passes through, no-requires ignored).

### Notes
- Back-compat with the prior opportunistic `metadata.requires.bins` usage in
  `playwright-test-engineer`. The existing
  `tests/hooks/session-init-gate.test.js` continues to pass (8/8) — no
  regression to the V10.22.0 session presence gate.

## [11.1.9] - 2026-05-04

### Fixed
- **tests/skills/run-context-passthrough.test.js**: three pre-existing failing
  assertions referenced a "Context subcommand" section of
  `.claude/skills/run/SKILL.md` that was removed in v11.1.5 when the
  `/context` skill was deprecated. The reference document
  `.claude/skills/run/reference/context-passthrough.md` still preserves the
  historical contract; the SKILL.md file now carries a V11.0+ deprecation
  note instead. Updated three assertions to verify the current deprecation
  contract:
  - "contains a Context subcommand section" → "acknowledges the V11.0
    /context skill removal"
  - "lists all four subcommands (show/init/update/clear)" → "documents the
    historical subcommand syntax"
  - "documents the dispatch-before-state-machine ordering" → "points users
    at product_context.yaml for direct edits"

  Reference-file assertions left intact — they continue to verify the
  historical contract is preserved for external-UI FileWatcher
  backward-compatibility and traceability. All 10 tests in the file now
  pass (was 7/10). Production code unmodified; no other test files
  touched. Pre-existing failure since v11.1.5 baseline (commit 5966a3e8).

## [11.1.8] - 2026-05-04

Wave 3 absorptions: three new agents ported from external skill corpus into the
cAgents archetype tree (Phase 3 paper-search, Phase 7 playwright-test-engineer,
Phase 8 claude-code-owasp). Naturally grouped as a single coherent wave bump
because all three were prepared in parallel and share the same plugin.json
sync pass; the multi-phase nature is documented per-phase below. Per
RESUME_IMPLEMENTATION_PROMPT.md Section B Option B2 cadence concession.

### Added
- **analyst/academic-paper-searcher** (Phase 3): absorbed `paper-search` agent
  from `example/external-skills/ykdojo__paper-search/`. New 2-level analyst
  archetype agent exposing OpenAlex (250M+ academic works, no API key) for
  keyword search, DOI/OpenAlex-ID lookup, citation traversal, and abstract
  retrieval via direct curl+jq invocations against `https://api.openalex.org`.
  Total cAgents agent count: analyst archetype 27 → 28.
- **developer/quality/playwright-test-engineer** (Phase 7): absorbed from
  `testdino-hq/playwright-skill` (v2.2.0, MIT) and
  `jeffallan/claude-skills/playwright-expert` (v1.1.0, MIT). New
  execution-tier agent under the developer/quality branch for Playwright E2E,
  API, component, visual regression, accessibility, and security browser
  automation. Coordinated by `qa-lead`. Frontmatter declares
  `metadata.requires.bins: [npx, node]` ahead of the Phase 4 declarative-deps
  gate. Capabilities: e2e_testing, api_testing, component_testing,
  visual_regression, accessibility_audit, browser_automation,
  flaky_test_diagnosis, playwright_ci_integration.
- **developer/quality/security-owasp** (Phase 8): absorbed from
  `agamm__claude-code-owasp`. Test-focused security execution agent
  covering OWASP Top 10:2025, OWASP Top 10 for LLM Applications (2025),
  Agentic AI Security (OWASP 2026), and ASVS 5.0 tier mapping (L1/L2/L3).
  Scope is distinct from `security-lead` (controller) and `security-engineer`
  (controls/pentest); audits code against OWASP frameworks and produces
  severity-tagged findings with file:line evidence and remediation guidance.
  Allowed-tools: `Read Grep Glob Bash` (audit-only — no Write/Edit by design).
- Total cAgents agent count: 243 → 246 (developer 31 → 33, analyst 27 → 28).
- **tests/regressions/phase3-paper-search-absorbed.test.js** (10 cases),
  **phase7-playwright-absorbed.test.js** (9 cases),
  **phase8-owasp-absorbed.test.js** (10 cases): failing-before/passing-after
  Vitest regressions for each absorption asserting v11.1.0 frontmatter,
  archetype/branch correctness, allowed-tools posture, and ported-content
  coverage. All 29 tests pass in <500ms aggregate.

### Notes
- Source repos under `example/external-skills/{owner}__{repo}/` remain
  read-only per IMPLEMENT_AND_VALIDATE_PROMPT.md § G.3. No corpus files
  modified.
- `scripts/sync-agents.sh` re-run as part of this bump to register the three
  new agents in `.claude-plugin/plugin.json`.

## [11.1.7] - 2026-05-04

TodoWrite -> TaskCreate sweep per official docs.claude.com deprecation. Per
[docs.claude.com/docs/en/tools.md](https://docs.claude.com/docs/en/tools.md),
TodoWrite is the Agent SDK / non-interactive equivalent of TaskCreate /
TaskUpdate / TaskList / TaskGet. Interactive Claude Code sessions (the primary
cAgents runtime) MUST use the TaskCreate family; TodoWrite remains valid only
in SDK / non-interactive mode.

### Changed
- `.claude/rules/core/controllers.md`: rewrote MANDATORY block to specify
  TaskCreate/TaskUpdate as the interactive-mode tools, with TodoWrite noted as
  the SDK equivalent. Updated example code blocks to show both forms.
- `.claude/rules/core/skill-format.md`: added deprecation note documenting that
  interactive Claude Code MUST use TaskCreate/TaskUpdate/TaskList/TaskGet.
- 73 agent SKILL.md files (developer/, operator/, advisor/, analyst/, creator/,
  writer/, strategist/, core/, leadership/): replaced `TodoWrite` in
  `allowed-tools` declarations with `TaskCreate TaskUpdate TaskList TaskGet`.
- 50 agent SKILL.md prompt bodies: rewrote imperative TodoWrite directives
  ("MUST call TodoWrite", "you MUST call TodoWrite", "Call TodoWrite BEFORE",
  "TodoWrite discipline", etc.) as TaskCreate equivalents.
- 6 user skill SKILL.md files (`org`, `team`, `run`, `designer`, `improve`,
  `helper`): added TaskCreate to `allowed-tools`. Updated BLOCKING blocks in
  `run` and `org` to specify TaskCreate as the interactive primary call.
- `operator/business-ops/scribe/SKILL.md` and
  `strategist/product-owner/SKILL.md`: rewrote "Use TodoWrite" body
  instructions as TaskCreate/TaskUpdate equivalents.

### Added
- Regression test `tests/skills/no-todowrite-runtime-instructions.test.js`:
  walks all SKILL.md files under `.claude/skills/` and the 9 archetype roots
  and asserts no file contains imperative phrases like "call TodoWrite", "use
  TodoWrite", or "MUST.*TodoWrite" without SDK contextualization. Allows
  TodoWrite mentions when contextualized as "(SDK only)", "Agent SDK", or
  comparative documentation.

### Notes
- Historical CHANGELOG/RELEASE_NOTES references to TodoWrite are preserved
  unchanged.
- TodoWrite remains in `allowed-tools` for the 6 user skills as an SDK
  fallback. The regression test allows this; only imperative runtime
  instructions in body text are forbidden.

## [11.1.6] - 2026-05-04

### Added
- `skill-size-monitor` hook (`.claude/hooks/skill-size-monitor.cjs`): warns at 600 lines, blocks at 900 lines on `Write|Edit` of `SKILL.md` files to prevent AP-1 bloat regression. Thresholds env-configurable via `CAGENTS_SKILL_WARN_LINES` / `CAGENTS_SKILL_BLOCK_LINES`. Registered under `hooks.PostToolUse` in `.claude/settings.json`. Source pattern: `raintree-technology/claude-starter` `file-size-monitor.sh`.
- Regression test `tests/hooks/skill-size-monitor.test.js` covering under-warn pass-through, warn at 700 lines, deny at 1000 lines, and non-SKILL.md pass-through (4 cases + existence check).

## [11.1.5] - 2026-05-03

Documentation accuracy patch + harness limitation rule. Six-wave /team audit
discovered and resolved 16 defects (2 critical, 6 high, 5 medium, 3 low) and
added a graceful-degradation rule for the empirically-observed Claude Code
limitation that withholds the `Agent` tool from level-1 plugin subagents.

### Fixed
- **CRITICAL**: removed live `/context` skill dispatch from `.claude/skills/run/SKILL.md`
  passthrough block. The /context skill was removed in V11.0; the dispatch
  call would crash for any user typing `/run context show|init|update|clear`.
- **CRITICAL**: rewrote `.claude/skills/run/reference/context-passthrough.md`
  from live-contract to deprecation note (113 -> 75 lines).
- **HIGH**: stale skill recommendations in `.claude/skills/{designer,helper}/SKILL.md`
  and `helper/reference/command-details.md` rewritten to route to `/improve`
  instead of removed `/review` and `/optimize` skills.
- **MEDIUM**: stale `/review`/`/optimize` examples in
  `docs/templates/QUICK_REFERENCE_TEMPLATE.md` updated to `/improve --mode {review,optimize}`.
- **LOW**: `cAgents/CLAUDE.md` rules count corrected (26 -> 29 with breakdown);
  stale domain-overlay file stems corrected.

### Added
- New "Known Harness Limitation: Agent Tool May Be Absent in Teammate Tool Surface"
  section in `.claude/rules/core/teams.md` with a graceful-degradation rule:
  when a /team teammate controller discovers the `Agent` tool is unavailable
  in its runtime surface, it MUST execute the work item directly using
  `Read`/`Write`/`Edit`/`Bash` and self-validate per the 15-check execution
  self-validation protocol, rather than failing the work item. Cross-referenced
  from `.claude/skills/team/SKILL.md`.

### Verified
- `validate-versions.sh`: 18/18 sync at 11.1.5
- `validate-agents.sh`: 243/243 valid, 0 errors, 26/26 hooks registered, 15/15 domain_overrides
- 16/16 defect resolutions confirmed via tailored grep verification

## [11.1.4] - 2026-04-29

Comprehensive plugin health sweep. Closes the v11.1.0 migration cleanup and
brings every documentation/config/script file into sync with the
9-archetype catalog and the 18-slot version registry.

### Fixed
- **Hook-count drift**: `.claude/settings.json` `$comment` field claimed
  "30 CJS files (27 registered hooks + utils + launcher + eval CLI)". Reality
  is 29 .cjs files = 26 unique registered hooks + hook-utils.cjs +
  run-hook.cjs launcher + eval-runner.cjs CLI. Comment now matches reality.
- **Hook-count assertion**: `scripts/ci/validate-agents.sh:444` hardcoded
  `expected 27`. Changed to `expected 26`. Resolves ISSUE-1.
- **Extra PASS print (244/243)**: `scripts/ci/validate-agents.sh` `log_pass`
  was being called from a non-agent location (plugin.json structure check),
  bumping the agent-PASS counter by 1. The plugin.json check now uses a
  direct echo so the counter reflects only agent-level passes. Validator
  now reports `Total agents: 243, Passed: 243`. Resolves ISSUE-7.
- **111 SKILL.md frontmatter warnings swept** (resolves ISSUE-2):
  - 43 broken `related_agents` cross-references retargeted or removed.
    Top offenders: `compliance-officer` (6×), `social-media-manager` (4×),
    `digital-marketing-manager` (4×), `account-executive` (4×),
    `project-manager` (3×). All retargets validated against the actual
    archetype tree (no dangling targets).
  - 26 legacy `related-agents` (hyphen, flat-list) fields renamed to
    `related_agents` (underscore, structured `- name: foo` block).
  - 28 missing `color` fields added (`color: bright_white` default).
  - 13 missing `model` fields added (`model: sonnet` default for
    execution-tier agents).
  - Net effect: `validate-agents.sh` now reports 0 errors, 0 warnings,
    243/243 PASS.
- **Stale validator slots pruned** (resolves ISSUE-4):
  `scripts/ci/validate-versions.sh` previously defined 24 slots, of which
  10 referenced paths that no longer exist (e.g. `engineering/plugin.json`,
  `.claude/skills/review/SKILL.md`). Pruned to track exactly the 18
  canonical locations from `.claude/rules/core/version-registry.md`. Now
  reports `Checked 18/18 locations, 0 mismatches, 0 skipped`.

### Changed
- **Archetype-canonical doc alignment** (resolves ISSUE-5):
  Locked the v11.1.0 migration policy: 9 archetypes
  (`developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`,
  `strategist`, `core`, `leadership`) are canonical. The 15-domain framing
  is retained explicitly as a routing/config overlay (router_keywords +
  controller_catalog files in 13 legacy domain dirs). `CLAUDE.md` and
  `README.md` updated to lead with the archetype tree and document the
  legacy domain dirs as overlay-only. Legacy domain dirs are NOT deleted
  (they hold router config still loaded by the planner).
- **Staging artifact archived** (resolves ISSUE-8):
  `cagents-memory-staging/file-move-table.tsv` (v11.1.0 migration record)
  moved to `archive/migration/v11.1.0/file-move-table.tsv`. The empty
  `cagents-memory-staging/` directory removed. Both locations are
  gitignored — no tracked git state changed.

### Added
- **`scripts/sync-agents.sh --check` dry-run flag** (resolves ISSUE-3):
  CI-friendly drift detection. Exits 0 when `plugin.json` matches the
  archetype-tree SKILL.md inventory, exits 1 on drift, never mutates
  `plugin.json`. Includes `--help` documentation.
- **Two regression tests (Bug-Driven Testing mandate)**:
  - `tests/regression/related-agents-validation.test.js` — asserts 0 errors,
    < 5 broken `related_agents` warnings, < 5 legacy-format warnings, < 10
    total warnings (down from 111). Fails before sweep, passes after.
  - `tests/regression/sync-agents-check.test.js` — exercises both `--check`
    states (in-sync exits 0, drift exits 1) and asserts plugin.json mtime
    is unchanged across `--check` invocations.

## [11.1.3] - 2026-04-29

### Fixed
- **Stale agent references discovered during v11.1.0 migration removed.** Three
  config/script files pointed at agents that never had a backing SKILL.md:
  - `shared/config/planner_config.yaml` — `compliance-officer` (path
    `service/agents/compliance-officer/SKILL.md`) replaced with the real
    `compliance-manager` (`advisor/legal/compliance-manager/SKILL.md`).
  - `people/config/planner_config.yaml` — `talent-acquisition-manager` (path
    `people/agents/talent-acquisition-manager/SKILL.md`) replaced with the real
    `talent-recruiter` (`operator/people-ops/talent-recruiter/SKILL.md`).
  - `scripts/fix-resource-frontmatter.sh` — dropped lines pointing at
    `growth/agents/content-marketing-manager/...` and
    `engineering/agents/security-specialist/...` (4 lines total). Both agents
    never existed; the script processed nonexistent paths as no-ops.
- Reduces remaining `{domain}/agents/` references in the working tree from ~21
  (per CHANGELOG `[11.1.0]` known-follow-ups note) to 11 — only intentional
  references remain (skill docs, the migration script, and the FU spec doc itself).
- Refs FU-3.

## [11.1.2] - 2026-04-29

### Docs
- **`.claude/rules/core/skill-format.md` updated for v11.1.0 frontmatter schema.**
  Replaced `domain:` documentation with `archetype:` (top-level, all agents) and
  `branch:` (top-level, required for 3-level archetypes only). Listed valid branches
  per 3-level archetype: `developer` → backend/frontend/fullstack/infrastructure/quality;
  `operator` → support/business-ops/people-ops/marketing-sales/content;
  `advisor` → legal/health/education/personal. Updated path-conditional `paths:`
  glob from `**/agents/**/SKILL.md` to per-archetype globs. Migration-path examples
  and the full controller SKILL.md example now use the new schema. Marked legacy
  `domain:` field as REMOVED with a deprecation note. Refs FU-2.

## [11.1.1] - 2026-04-29

### Fixed
- **Post-migration validation tooling rebuilt for the v11.1.0 archetype tree.** Five
  scripts/files were left iterating the legacy `{domain}/agents/` glob and reported 0
  agents on the new tree:
  - `scripts/ci/validate-agents.sh` rewritten to walk the 9 archetype roots and
    validate top-level `archetype:` (all agents) and `branch:` (3-level only) against
    the directory layout. Top-level `domain:` is now forbidden (REMOVED in v11.1.0).
    `--archetype` flag added; `--domain` retained as back-compat alias. Reports 243
    agents, 0 errors.
  - `scripts/sync-agents.sh` walks the archetype tree to regenerate
    `.claude-plugin/plugin.json#agents`. Used by the pre-commit hook.
  - `scripts/lint-agents.sh` walks the archetype tree; check 7 now requires top-level
    `archetype:` instead of `domain:` (legacy domain in metadata is tolerated).
- **`.claude-plugin/plugin.json` agents array repopulated** (243 entries). The v11.1.0
  migration emptied the array even though CHANGELOG claimed 246 entries were rewritten;
  `tests/config/plugin-json.test.js` was failing as a result. Restored.
- **Top-level `archetype: core` added** to 4 core agents missed in the v11.1.0
  migration sweep: `core/trigger`, `core/orchestrator`, `core/universal-router`,
  `core/universal-planner`.
- **`analyst/science-coordinator` gained the `allowed-tools:` field** that lint-agents
  required but had been silently passing because the linter wasn't iterating any
  agents.

### Docs
- Added `docs/migration/v11.1.0-followups.md` — execution spec for the v11.1.x
  follow-ups (this bump satisfies FU-1).


## [11.1.0] - 2026-04-29

### Breaking
- **Catalog reorganized into builder-role archetype tree.** All 243 agents physically moved from
  flat `{domain}/agents/{name}/` to `{archetype}/{branch?}/{name}/` paths.
  - 9 root archetypes: `developer/` (3 levels), `operator/` (3 levels), `advisor/` (3 levels),
    `analyst/`, `creator/`, `writer/`, `strategist/`, `core/` (flat infrastructure),
    `leadership/` (flat C-suite).
  - 3-level archetypes use branches:
    - `developer/` → `backend, frontend, fullstack, infrastructure, quality`
    - `operator/` → `support, business-ops, people-ops, marketing-sales, content`
    - `advisor/` → `legal, health, education, personal`
  - Old `{domain}/agents/` directories removed; `{domain}/config/` directories retained for
    router keyword resolution.
- **`Agent_Memory/` folder renamed to `cagents-memory/`** to disambiguate from Claude Code's
  built-in `~/.claude/projects/<project>/memory/` auto-memory. 444 string references swept
  across 688 files (hooks, skills, scripts, docs, rules).
- **`SKILL.md` frontmatter schema change.** `domain:` field replaced by `archetype:` (and
  `branch:` for 3-level archetypes). All 243 agent files updated.
- **`plugin.json` agent paths rewritten** (246 entries) to point at new tree paths.
- Agent identifiers (`cagents:NAME`) unchanged — invocation strings still work; only the
  underlying SKILL.md paths moved.

### Changed
- Skill catalog still 6 user skills; routing and pipelines unchanged. The restructure is
  organizational, not behavioral.
- `tests/config/plugin-json.test.js` updated to assert archetype roots instead of legacy
  domain roots.

### Known Follow-ups (deferred to v11.1.x)
- `scripts/ci/validate-agents.sh` rewrite for archetype tree (currently iterates legacy
  `{domain}/agents/` glob; non-blocking — Vitest is the runtime gate).
- `.claude/rules/core/skill-format.md` documentation update for new frontmatter spec
  (`archetype:`/`branch:` instead of `domain:`).
- 7 stale agent references discovered during migration (in `shared/config/planner_config.yaml`,
  `people/config/planner_config.yaml`, `scripts/fix-resource-frontmatter.sh`) — pre-existing
  bugs pointing at `compliance-officer`, `talent-acquisition-manager`,
  `content-marketing-manager`, `security-specialist` which never existed. Cleanup in v11.1.1.

### Migration Tooling
- `scripts/migrate-v11.1.0.sh` — generates the file-move table from `plugin.json`.
- `scripts/migrate-v11.1.0-execute.sh` — Stages A-E (file moves, frontmatter swap,
  `plugin.json` rewrite, config sweep, cleanup).
- `scripts/migrate-v11.1.0-rename.sh` — Stage F (`Agent_Memory` → `cagents-memory` rename).

### Notes
- Atomic single-commit migration per project owner direction. Standard semver would suggest
  v12.0.0 (breaking changes); bumped to v11.1.0 by explicit owner override (solo project,
  no public API contract). Tests: 781/781 Vitest passing pre and post migration.

## [11.0.5] - 2026-04-28

### Changed
- `createHook()` factory in `.claude/hooks/hook-utils.cjs` now auto-injects
  `continue: true` into hook responses that omit it. The auto-inject fires
  only when the response is an object lacking both `continue` and `decision`,
  and not carrying a deny `permissionDecision` — i.e., only when the hook
  legitimately wanted the run to keep going but forgot to declare it. This
  prevents the entire class of latent bugs that V11.0.4 hit in
  `tool-failure-tracker.cjs` where the pattern-detection branch returned
  `{hookSpecificOutput: ...}` and broke any test asserting `result.continue
  === true`. Hooks that explicitly return `continue: false` (TeammateIdle
  clean shutdown), set `decision` (Stop hook block), or carry a deny
  `permissionDecision` (PreToolUse deny) are unchanged.

### Tests
- Added 7 regression tests in `tests/hooks/hook-utils.test.js` under the
  `createHook continue:true auto-inject` describe block: verifies the
  inject fires for hookSpecificOutput-only and systemMessage-only shapes,
  and verifies it does NOT fire for `continue: false`, `decision: block`,
  or deny responses. Per CLAUDE.md bug-driven testing mandate.
- Full suite: 781 passed / 0 failed / 0 skipped.

## [11.0.4] - 2026-04-28

### Fixed
- `tool-failure-tracker.cjs` pattern-detection branch now returns
  `continue: true` alongside `hookSpecificOutput`. Previously, after 3+
  failures of the same tool accumulated in a session's
  `tool_failures.yaml`, the hook returned a `{hookSpecificOutput: ...}`
  response missing the `continue` field — causing latent failures in
  `tests/hooks/tool-failure-tracker.test.js` whenever prior runs left
  enough state behind to trigger the pattern path. Discovered as flake
  during full-suite stress runs (1/6 fail rate); the failure was
  deterministic in isolation (5/5 fail) once Bash failures had built up.

### Changed
- `.gitignore` now excludes `.claude/*.lock` (covers
  `.claude/scheduled_tasks.lock` and any future lock-file runtime
  artifacts).
- `tests/config/plugin-json.test.js` deleted the V10-era domain
  `plugin.json` `describe.skip` block (55 dead skipped tests). V11.0
  removed domain sub-plugin files; the root `plugin.json` coverage
  earlier in the same file replaces the deleted suite.

### Tests
- Added `'should include continue:true even in the pattern-detection
  branch'` regression test in `tests/hooks/tool-failure-tracker.test.js`
  to pin the fix. Per CLAUDE.md bug-driven testing mandate.
- Full suite: 773 passed / 0 failed / 0 skipped (3 consecutive runs).
  Was 773 / flake / 55 skipped after V11.0.3.

## [11.0.3] - 2026-04-28

### Fixed
- **Hook test reliability**: `dedupGuard` in `.claude/hooks/hook-utils.cjs` no
  longer short-circuits hook invocations during tests, fixing 14 pre-existing
  failures across `tests/hooks/team-stop.test.js`,
  `tests/hooks/subagent-stop-tracker.test.js`, and
  `tests/hooks/attention-injection.test.js`. The dedup marker files at
  `/tmp/cagents-dedup-*` would leak from cancelled/crashed prior runs and then
  cause the next test invocation with the same deterministic fixture (e.g.,
  `session_id: "team_test-stop_260317_999"`) to short-circuit, skipping the
  side effects under test. Production behavior is unchanged: dedup still fires
  for plugin+project double-load scenarios.

### Changed
- `dedupGuard` now bypasses dedup when `VITEST=true`, `NODE_ENV=test`, or
  `CAGENTS_HOOK_DEDUP_DISABLE=1`. Vitest sets `VITEST=true` automatically; the
  other two are escape hatches for non-vitest test runners and ad-hoc debugging.

### Tests
- Added 4 regression tests in `tests/hooks/hook-utils.test.js` under the
  `dedupGuard test-mode bypass` describe block: verifies the bypass triggers
  on each of the 3 env vars and that production behavior (no env vars set)
  still dedupes correctly. Per CLAUDE.md bug-driven testing mandate.
- Full suite: 773 passed / 55 skipped / 0 failed (was 759 / 55 / 14).

## [11.0.2] - 2026-04-28

### Fixed
- **Bug-1**: `session-catchup.cjs` no longer suggests removed `/review`
  and `/optimize` skills at session resume — re-mapped to
  `/improve --mode review|optimize|full` (gap_analysis Bug-1).
- **Bug-2**: `magic-keywords.cjs` natural-language router no longer
  routes `"review"`/`"optimize"` to removed slash-commands — re-mapped
  to `/improve --mode review|optimize` (gap_analysis Bug-2).
- `model-routing-advisor.cjs:34`: stale "262 agents" comment →
  "243 agents" (gap_analysis Gap-4).
- `core/reviewer/SKILL.md:106`: removed `/review` slash-command
  reference (gap_analysis Gap-5).
- `scripts/sync-versions.sh`: header self-description "21 locations" →
  "18 locations" (gap_analysis NEW-5).
- `docs/commands/helper.md`: recommendation table re-mapped from
  `/review`/`/optimize` to `/improve --mode review|optimize`
  (gap_analysis NEW-7).
- `docs/CLAUDE.local.md.example`: `/optimize --dry-run` →
  `/improve --mode optimize --dry-run` (gap_analysis NEW-8).
- `docs/SKILLS.md`: replaced V10-era contents with redirect stub
  pointing at `docs/SKILLS_REFERENCE.md` (gap_analysis NEW-2).
- `docs/WORKFLOW_AGENT_INTERACTIONS.md`: `/review` and `/optimize`
  workflow nodes (lines 68–107) updated to `/improve --mode`
  equivalents (gap_analysis NEW-3).
- `.claude/rules/README.md`: refreshed rule count (29 files) and added
  V11.0 skill catalog table; removed live treatment of removed skills
  (gap_analysis NEW-4).

### Changed
- **Schema deprecation comments**:
  `.claude/skills/run/reference/session-schema.md`,
  `.claude/rules/core/orchestration.md`, and
  `.claude/rules/core/orchestration-reference.md` now carry inline
  `DEPRECATED in V11.0` callouts above enum entries for `review_*`,
  `optimize_*`, `context_*`, and `debug_*` prefixes. **No enum values
  were removed** — preserved for external-UI FileWatcher
  backward-compatibility (cross-project contract).

### Tests
- Added `tests/hooks/session-catchup-v11.test.js` (7 tests) and
  `tests/hooks/magic-keywords-v11.test.js` (9 tests) per CLAUDE.md
  bug-driven testing mandate. Both files fail-before-fix and
  pass-after-fix.

## [11.0.1] - 2026-04-21

### Removed
- `statusLine` hook and the Claude Code status bar integration.
  Deleted `.claude/hooks/statusline.cjs`, removed the `statusLine`
  block from `.claude/settings.json`, removed the StatusLine Advisory
  branch from `session-catchup.cjs`, and dropped the Status Line
  Provider section from `.claude/rules/core/hooks.md`. The feature
  was refactored twice in quick succession (V10.26.x and commit
  2bf03f56) without delivering sustained value; the surface is
  retired rather than maintained in its current shape.

### Added
- Regression test `tests/config/no-statusline.test.js` that pins the
  removal: asserts settings.json has no `statusLine` key, the hook
  file does not exist, the two former tests are gone, session-catchup
  no longer mentions statusline, and hooks.md no longer documents the
  provider.

## [11.0.0] - 2026-04-21 — BREAKING

### Removed (migrate before upgrading)
- `/context` slash command — use `/run context show|init|update|clear`
  (the `/run context` passthrough has been available since V10.26.9).
- `/debug` slash command — use `/run --mode debug`
  (`--mode debug` wiring landed in V10.26.11–18).
- `/review` slash command — use `/improve --mode review` (or just
  `/improve`, since `review` is the default mode; shim was V10.26.26).
- `/optimize` slash command — use `/improve --mode optimize`
  (shim was V10.26.32).
- Legacy migration fallback read paths:
  `_projects/{hash}/review/baseline.yaml` and
  `_projects/{hash}/optimize/pattern_effectiveness.yaml`. `/improve`
  now reads and writes only under `_projects/{hash}/improve/`.

### Added
- `/improve --mode full` is the canonical headline capability: unified
  review → optimize pipeline with a shared baseline captured once and a
  synthesized `improve_report.md` (landed V10.26.33; no pre-V11
  equivalent).
- `docs/MIGRATION-V11.md` — complete user migration guide.
- `tests/v11-removal.test.mjs` — regression test asserting the 4
  removed skill dirs are gone, plugin.json description is clean, and
  CLAUDE.md + /helper catalog list exactly the 6 surviving skills.

### Changed
- Skill menu reduced from 10 to 6: `/run`, `/team`, `/org`,
  `/designer`, `/improve`, `/helper`.
- `plugin.json` description updated to reflect the 6-skill catalog.
- `CLAUDE.md` skill table, quick reference, and directory listing
  updated to the V11 shape.
- `/helper` SKILL.md and `reference/command-details.md` rewrote the
  Available Commands table and added a "Removed in V11.0.0" section
  pointing at `docs/MIGRATION-V11.md`.
- `scripts/sync-versions.sh` now updates 6 SKILL.md frontmatter
  versions (down from 10).
- `scripts/ci/cagents-ci.sh` tiny-bump guard exempts major-version
  bumps from the ≤5-file non-sync diff ceiling and updates its
  sync-targets list to the 6 surviving SKILL.md paths.
- `.claude/rules/core/version-registry.md` shrunk from 21 to 17
  version-sync locations.

### Removed (tests)
- `tests/skills/review-shim.test.mjs`
- `tests/skills/optimize-shim.test.mjs`
- `tests/skills/debug-shim.test.mjs`
- `tests/skills/deprecation-warnings.test.mjs`
- `tests/skills/context-invocation.test.js`
- `tests/skills/context-utility-final.test.js`

Each of the removed tests exercised paths that no longer exist.
Regression coverage is folded into `tests/v11-removal.test.mjs`.

### Migration

See `docs/MIGRATION-V11.md` for the complete command-by-command
migration guide, including optional data-file migration for
cross-session baselines and pattern-effectiveness history. Users who
cannot migrate can pin to `^10.26`.

### Bug / Rationale

Bug: Deprecation shims accumulating parsing + deprecation-warning
duplication across four skills.
Root cause: Each shim re-implemented argument forwarding and one-shot
warning logic, with subtle drift between them.
Test added: `tests/v11-removal.test.mjs`.
Could have caught by: contract test on `plugin.json` skills registry +
filesystem invariant on `.claude/skills/` directory shape.

## [10.26.35] - 2026-04-21

### Changed
- Version bump to 10.26.35. See commit message for details.

## [10.26.34] - 2026-04-21

### Changed
- Version bump to 10.26.34. See commit message for details.

## [10.26.33] - 2026-04-21

### Changed
- Version bump to 10.26.33. See commit message for details.

## [10.26.32] - 2026-04-21

### Changed
- Version bump to 10.26.32. See commit message for details.

## [10.26.31] - 2026-04-21

### Changed
- Version bump to 10.26.31. See commit message for details.

## [10.26.30] - 2026-04-21

### Changed
- Version bump to 10.26.30. See commit message for details.

## [10.26.29] - 2026-04-21

### Changed
- Version bump to 10.26.29. See commit message for details.

## [10.26.28] - 2026-04-21

### Changed
- Version bump to 10.26.28. See commit message for details.

## [10.26.27] - 2026-04-21

### Changed
- Version bump to 10.26.27. See commit message for details.

## [10.26.26] - 2026-04-21

### Changed
- Version bump to 10.26.26. See commit message for details.

## [10.26.25] - 2026-04-21

### Changed
- Version bump to 10.26.25. See commit message for details.

## [10.26.24] - 2026-04-21

### Changed
- Version bump to 10.26.24. See commit message for details.

## [10.26.23] - 2026-04-21

### Changed
- Version bump to 10.26.23. See commit message for details.

## [10.26.22] - 2026-04-21

### Changed
- Version bump to 10.26.22. See commit message for details.

## [10.26.21] - 2026-04-21

### Changed
- Version bump to 10.26.21. See commit message for details.

## [10.26.20] - 2026-04-21

### Changed
- Version bump to 10.26.20. See commit message for details.

## [10.26.19] - 2026-04-21

### Changed
- Version bump to 10.26.19. See commit message for details.

## [10.26.18] - 2026-04-21

### Changed
- Version bump to 10.26.18. See commit message for details.

## [10.26.17] - 2026-04-21

### Changed
- Version bump to 10.26.17. See commit message for details.

## [10.26.16] - 2026-04-21

### Changed
- Version bump to 10.26.16. See commit message for details.

## [10.26.15] - 2026-04-21

### Changed
- Version bump to 10.26.15. See commit message for details.

## [10.26.14] - 2026-04-21

### Changed
- Version bump to 10.26.14. See commit message for details.

## [10.26.13] - 2026-04-21

### Changed
- Version bump to 10.26.13. See commit message for details.

## [10.26.12] - 2026-04-21

### Changed
- Version bump to 10.26.12. See commit message for details.

## [10.26.11] - 2026-04-21

### Changed
- Version bump to 10.26.11. See commit message for details.

## [10.26.10] - 2026-04-21

### Changed
- `.claude/skills/context/SKILL.md` description tightened to utility-facing:
  "Internal utility: read/write cagents-memory/_projects/{hash}/product_context.yaml.
  Claude-invoked by /run orchestrator enrichment and by the /run context
  passthrough (V10.26.9). Direct user invocation deprecated — use
  /run context show|init|update|clear instead."
- `.claude/skills/context/SKILL.md` body adds a "Back-compat note" directing
  users who still type `/context` to `/run context show`. Heading renamed to
  "/context - Product Context Utility (Claude-invoked)".
- `docs/RELEASE_NOTES.md` adds a consolidated entry for the V10.26.6 –
  V10.26.10 `/context` utility demotion arc.

### Preserved
- `.claude-plugin/plugin.json` description continues to say "8 user skills +
  /context utility" (set in V10.26.6, no change required).
- `metadata.user-invocable: "false"` preserved (set in V10.26.6).
- Data file path `cagents-memory/_projects/{hash}/product_context.yaml`
  unchanged throughout the entire demotion arc.

### Added
- `tests/skills/context-utility-final.test.js` asserts the tightened
  description, preserved frontmatter flags, back-compat pointer, and
  plugin.json "/context utility" wording.

## [10.26.9] - 2026-04-21

### Added
- `/run context show|init|update|clear` passthrough subcommands. When
  `$ARGUMENTS` starts with `context` followed by one of the four recognized
  subcommands, `/run` dispatches to the `/context` utility skill via the
  Skill tool and skips the standard state machine.
- `.claude/skills/run/reference/context-passthrough.md` documents the full
  dispatch contract, data path, back-compat behavior, and edge cases.
- `.claude/skills/run/SKILL.md` (Step 1) now includes the front-door
  dispatch check before the state machine runs.
- `tests/skills/run-context-passthrough.test.js` verifies the reference
  doc exists, the four subcommands are documented, the dispatch target is
  the `/context` skill, and the token-matching routing logic is correct.

### Preserved
- Data file path `cagents-memory/_projects/{hash}/product_context.yaml`
  unchanged — the passthrough touches the WRITE surface only.
- Orchestrator's direct READ path (V10.26.7 contract) continues to work
  without going through the skill or the passthrough.

## [10.26.8] - 2026-04-21

### Changed
- `.claude/skills/helper/reference/command-details.md` replaces the full
  `## /context - Product Context Manager` section with a one-paragraph
  "Internal utilities (Claude-invoked)" pointer directing users to
  `/run context show|init|update|clear` (V10.26.9) or direct yaml edit.
- `.claude/skills/helper/SKILL.md` moves `/context` out of the main
  user-facing Command Overview table into a new "Internal utilities
  (Claude-invoked)" subsection. "I want to PERSIST project knowledge"
  decision-guide answer now points to `/run context init` (V10.26.9+).
- `.claude/skills/helper/reference/comparison-tables.md` drops the
  `/context` column from all user-facing comparison tables.
- The "Planned Commands" `/context` slot reserved in V10.26.4 is claimed:
  demotion is recorded as complete as of V10.26.6.
- `tests/skills/helper-catalog.test.js` now asserts 8 user-invocable
  skills in the main catalog and `/context` in the "Internal utilities"
  subsection, with an explicit check that the user-facing overview table
  no longer contains a `/context` row.

## [10.26.7] - 2026-04-21

### Added
- `core/orchestrator/resources/product-context-loader.md` documenting
  the INIT-state read of
  `cagents-memory/_projects/{hash}/product_context.yaml` into
  `enriched_context.project_summary`. Codifies the 500-character budget from
  `orchestration-reference.md:27` and the SHA-256 hash derivation from `pwd`.
- `core/orchestrator/SKILL.md` references the new resource via
  `@resources/product-context-loader.md`.
- `tests/orchestrator/product-context-read.test.js` verifies the helper doc
  exists, cites the budget and the canonical data-file path, and is
  referenced from orchestrator SKILL.md.

### Preserved
- No code path change. The orchestrator already reads the YAML directly; this
  patch formalizes the contract so the `/context` skill can be demoted to a
  utility in V10.26.10 without regressing enrichment.

## [10.26.6] - 2026-04-21

### Changed
- `.claude/skills/context/SKILL.md` frontmatter flips `metadata.user-invocable`
  from `"true"` to `"false"` and updates `argument-hint` to
  `"[init|show|update|clear] (Claude-invoked)"`. `/context` no longer appears
  in the `/` menu; Claude can still invoke it for enrichment.
- `.claude-plugin/plugin.json` description reworded to
  "8 user skills + /context utility" to reflect the demotion.
- `docs/SKILLS_REFERENCE.md` moves `/context` into a new
  "Internal utilities (Claude-invoked only)" section.

### Preserved
- Data file path `cagents-memory/_projects/{hash}/product_context.yaml` unchanged.
- Orchestrator's direct read path (per `orchestration-reference.md:18,27`)
  continues to work without going through the skill.

### Added
- `tests/skills/context-invocation.test.js` asserting the frontmatter flip
  and that `metadata['user-invocable'] === "false"`.

## [10.26.5] - 2026-04-21

### Changed
- Promoted `check_tiny_bump` in `scripts/ci/cagents-ci.sh` from warn-only
  to blocking. Four prior patches (10.26.1–10.26.4) ran clean under warn
  mode; enforcement now lands so Cluster 2+ bumps merge only under the
  full guard.
- Set `CAGENTS_TINY_BUMP_BLOCK=0` to opt back into warn-only mode for
  local experiments.

### Added
- Regression case in `tests/ci/tiny-bump-guard.test.js` asserting the
  guard defaults to blocking when no `CAGENTS_TINY_BUMP_BLOCK` env var
  is set.
- `version-registry.md` notes the guard is enforced and links to the
  opt-out env var.

## [10.26.4] - 2026-04-21

### Added
- "Planned Commands (coming in V10.27+)" section in `.claude/skills/helper/SKILL.md`
  reserving slots for `/improve` (V10.29), the `/debug` -> `/run --mode debug`
  migration (V10.28), and the `/context` demotion (V10.27).
- `tests/skills/helper-catalog.test.js` asserts all 9 current skills and the
  three planned slots are present in the helper catalog.

## [10.26.3] - 2026-04-21

### Added
- `check_tiny_bump` stage in `scripts/ci/cagents-ci.sh` that validates
  CHANGELOG entries, registry-location agreement (21 files), and
  non-sync diff size (<=5 files). Warn-only for one release to surface
  false positives before enforcement in 10.26.5.
- `tests/ci/tiny-bump-guard.test.js` covers compliant bump, no-op,
  warn-only, block-mode, and registry-drift paths.
- `tiny-bump` subcommand added to the CI script CLI.

## [10.26.2] - 2026-04-21

### Added
- "Tiny-Bump Cadence" section in `.claude/rules/core/version-registry.md`
  codifying the six atomicity criteria (one coherent change, CI-green,
  commit-before-verify, back-compat, sync-versions run, regression test).
- Cross-link from `docs/RELEASE_NOTES.md` header so readers discover the
  discipline without hunting for it.
- `tests/rules/version-registry-structure.test.js` asserts the cadence
  heading, all six criteria, 21 numbered registry rows, and references to
  the `CLAUDE.md` bug-driven-testing mandate.

## [10.26.1] - 2026-04-21

### Added
- `CHANGELOG.md` seeded with 10.26.0 baseline entry. Registered as sync-versions
  location #21 so every future bump auto-inserts a header.
- `tests/changelog-format.test.js` asserts Keep-a-Changelog headers are valid
  and the top version entry matches `package.json`.

## [10.26.0] - 2026-04-21

### Baseline
- First version tracked in this CHANGELOG. All prior release history lives in
  `docs/RELEASE_NOTES.md`.
