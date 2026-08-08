# cAgents Release Notes

**Current Version**: 12.66.0
**Release Date**: July 14, 2026
**Status**: Production-Ready

> **Note**: This file carries condensed per-release notes. The canonical [CHANGELOG.md](../CHANGELOG.md) remains the source of truth for full per-bump detail; this file summarizes each released version for quick scanning.

## V12.66.0 — August 8, 2026 (`/run` renamed to `/act`)

> **BREAKING FOR USERS: `/run` is gone. Use `/act`.**
> Claude Code now ships a **built-in `run` skill**, and the two names collide.
> There is **no back-compat shim and no alias**. Typing `/run` no longer reaches
> cAgents. It invokes Claude Code's built-in skill, which launches and drives
> your project's app. That is a completely different operation, and nothing
> warns you that you got the wrong one. Replace every `/run X` with `/act X`.

Flags and modes carry over unchanged: `/act review src/`,
`/act improve --scope src/auth/`, `/act context ...`, `/act --mode debug ...`.

An alias is not possible. Slash commands resolve inside the harness before any
cAgents hook observes a tool call, so nothing in this repository can intercept
`/run` and forward it. Renaming was the only option.

**Why a minor bump.** This is the same clean-removal shape as `/improve`
(folded into `/run`, v12.1.2) and `/org` (removed for `/team` strategic mode,
v12.2.0): a user-typed command dropped with no alias, neither taking a major
bump. Nothing else in the contract surface moved: the 60-agent catalog, hook
events, the 5-state pipeline, and the memory layout are unchanged.

**Two bugs fixed in the same release**, both of which fail silently:

- **Workspace-skill discovery was about to offer the harness's `run` skill to
  the planner.** The skill-awareness exclusion list excluded cAgents' own
  pipeline skills *by name*, so renaming `/run` promoted Claude Code's built-in
  `run` into a "discoverable workspace skill" the planner could assign to a work
  item, reintroducing exactly the ambiguity the rename removes. The mirror
  image was also live: the own-skill exclusion tuple still read
  `run`/`team`/`designer`/`helper`, leaving `act` off its own list, so the
  planner could emit `assigned_skill: act` and the controller would call
  `Skill({skill: "act"})`, recursing into the whole pipeline.
- **`scripts/maintenance/session-gc.cjs` held a second, independent
  `SESSION_PREFIXES` list** that never gained `'act_'`. Every new `act_*`
  session would have been invisible to garbage collection: never archived,
  never deleted, accumulating forever. A drift guard now asserts the two prefix
  lists agree.

**Session directories are not renamed.** New sessions are `act_*`; the 21 live
and 26 archived `run_*` directories keep their names and continue to resolve,
resume, and get swept, because `run_` is retained in `SESSION_PREFIXES` as a
legacy reader.

**Scope.** ~250 files across 30+ work items: 1,504 live `/run` references
repointed (the other 187 are historical record in this and the other history
files and were deliberately left alone), 117 `skills/run` paths, five
silent-failure sites repaired, and a new regression guard pinning 8 collision
sites with 21 assertions. Suite: 2,497 tests across 214 files.

## V12.20.0 – V12.42.0 — June 18 to July 14, 2026 (consolidated summary)

This span shipped as roughly 30 tiny/minor bumps. The per-bump detail lives in the canonical [CHANGELOG.md](../CHANGELOG.md); the themes below summarize what changed across the range so this file stays a coherent narrative history.

- **Agent-catalog consolidation → 57, then 58** (v12.20.0, v12.35.0): The catalog was restructured from 141 individually-routable leaf agents to 57 (41 routable specialists + 16 core) via a Hybrid A+B mode mechanism — absorbed specialists became `metadata.mode` variants backed by verbatim `@resources/{mode}.md` files, with zero intelligence loss. v12.35.0 then added the consolidated `ai-writing-editor` agent and a final AI-detection gate for writer-type agents, growing the catalog to its current **58**.
- **Comprehensive plugin audit/refactor** (v12.23.0 – v12.31.0): A ten-phase audit (`team_plugin-audit-refactor`) hard-deleted dead files, cleaned the hook surface (consolidated the PreToolUse[Agent] hooks into `agent-dispatch.cjs`), repaired `paths:` rule globs broken by the v12.8.0 layout move, resynced stale config/routing catalogs so no spawn silently degrades, consolidated the validation framework into one layered story, matched the `/team` machinery to reality, and ran a final count-drift sweep backed by new CI guards.
- **Documentation & framing** (v12.21.0, v12.22.0): A documentation audit corrected stale counts and references across the corpus; the domain-agnostic "NOT a software-engineering tool" framing was made prominent; `/designer` gained a refinement-first continuation contract; and `/run` gained workspace-skill awareness (reuse-before-rebuild).
- **Hook resilience & performance** (v12.22.1, v12.32.0, v12.33.0): Unref'd lingering timers so hook processes exit in ~140ms; added deterministic SDK-transcript-UUID → session resolution so concurrent same-directory sessions never cross-write; and fixed the Stop hook so a mid-flight background wait is no longer deadlocked.
- **Security — GuardFall Bash-guard hardening** (v12.34.0): Added the fail-closed tokenize-and-canonicalize `bash-guard-evaluator.cjs` library, closing the named Class A–E single-command bypass shapes, backed by a 35-probe regression corpus (hook-file inventory 31 → 32). See `docs/SECURITY_BASH_GUARD_THREAT_MODEL.md`.
- **Honesty-spine overhaul** (v12.36.0 – v12.41.0): Committed and wired the curated example store (`.claude/rules/examples/`) as planner few-shot input; added "Enforced vs Advisory" ledgers so readers can tell mechanically-enforced protocols from agent-self-reported ones; added review-rigor playbooks; and shipped an advisory-first (WARN-only) CI content-security / capability-consistency layer plus mechanical self-validation and claim-verification rechecks.
- **`/team` re-anchored on a concurrent-Agent default** (v12.42.0): Claude Code v2.1.178 removed the `TeamCreate` / `TeamDelete` tools. `/team` now spawns each wave as concurrent `Agent()` calls in one message (teams are implicit; cleanup is automatic at session end); the named-background-teammate + tmux-panes mechanism is retained only as an optional experimental path.

## V12.19.0 — June 14, 2026 (Bucket D: hook security + performance)

Bucket-D hook security/performance remediation (session `run_bucket-d-remediation_260614_001`), implementing findings deferred from the v12.18.0 overhaul audit.

- **Secret-scan size cap**: `secret-detection.cjs` scans large files via a bounded head+tail window (`CAGENTS_SECRET_SCAN_MAX_BYTES`, default 512 KB) instead of loading the whole buffer, preventing a memory/latency blowup on multi-MB writes; production-path registration fixed so the hook fires on the intended Write|Edit paths.
- **Write|Edit hook dispatcher (D1b)**: new `write-edit-dispatch.cjs` consolidates the three former standalone `Write|Edit` PreToolUse hooks (secret-detection, controller-delegation-validator, skill-size-monitor) into one deny-first, in-process dispatcher. Security sub-validators fail CLOSED; cold-start node spawns per Write|Edit cut 3 → 1.
- **Reproducible perf benchmarking (D2)**: added a Write|Edit hook-perf microbench (`scripts/benchmarks/hook-perf-microbench.cjs`) and a perf-corpus runner with committed baselines, plus a CLAUDE.md honesty pass separating measured figures from design-target estimates.
- **verify-completion fact-check (D3)**: slash-less filename citations are now fact-checked the same as path-qualified ones.

## V12.18.0 — June 12, 2026 (audit remediation)

Five-stream read-only repo audit (session `run_overhaul-audit_260612_001`) applied in three buckets plus a flake fix.

- **Bucket A (green CI + hygiene)**: repointed the `no-orphaned-cagents-refs` guard at `v12-aliases.yaml`, removed a dangling `commit-changes` symlink, and fixed 6 orphaned `cagents:*` dispatch references to non-existent agents.
- **Bucket B (harden safety hooks)**: made the delegation hard-deny controller-scoped (default → `block`; added `services/` + `middleware/`); anchored secret-detection's allowlist to exact repo-relative paths; converted bash-validator format/privilege checks to word-boundary regexes and added `doas`/`pkexec` to the Tier-1 deny set.
- **Bucket C (minimalism pass)**: added `pat-minimal-solution-ladder.md`, extracted the duplicated Controller Delegation Protocol into `pat-controller-coordination-protocol.md`, and added a subtractive "what can be deleted?" lens to code-reviewer Stage-2.

## V12.17.0 — June 11, 2026 (deep subagent nesting)

Verified Claude Code 2.1.172+ lets subagents spawn their own subagents up to 5 levels deep (session `run_deep-nesting-enablement_260611_001`); the historical "Agent tool stripped at depth ≥ 1" limitation is now obsolete.

- **Added**: `max_nesting_depth: 5` documented in `pipeline_config.yaml` + CLAUDE.md; regression test `deep-nesting-enablement.test.js`.
- **Changed**: graceful-degradation repositioned from the default depth-1 behavior to a defensive fallback (fires only at the nesting ceiling or on a regressed harness); the 2-level nesting limit lifted across `teams.md`, the `/team` skill, and agent SKILLs. Back-compatible — no public contract removed.

## V12.16.0 — June 9, 2026 (audit remediation)

Resolved all 10 recommendations (48 findings) of the Fable 5 plugin review (session `run_audit-fixes_260609_001`).

- **Security**: secret-detection now scans Markdown / docs with the same full-token regexes as code (a narrow `DOC_ALLOWLIST` exempts only the two docs that document the detection mechanism); bash-validator gains `eval $VAR` variable-indirection and download-then-exec patterns.
- **CI guards**: `validate-counts.sh` Checks 9–11 (CLAUDE.md rules total, playbooks count, pre-exec check count) so doc-count drift is caught mechanically.
- **Fixed/Changed**: greened CI (broken symlink + 3 hook tests), gitignored `__pycache__` / `_archive/` (kept on disk), and a doc-honesty pass reconciling count drift and relabeling unenforced contracts as advisory.

## V12.15.2 — June 3, 2026

Concurrent-session H1 follow-up: `verify-completion.cjs` staleness-skip field-name fix.

- The Stop hook's staleness lookup used `updated_at` / `created_at`, but `/run` writes `last_updated_at` / `started_at`, so the 24h staleness branch never fired and block decisions leaked onto unrelated turns. Extended the lookup chain to the actual write-shape with the legacy fields as fallbacks. Regression test: `verify-completion-staleness-skip.test.js`.

## V12.15.1 — June 2, 2026

Concurrent-session H1 follow-up: SDK UUID `input.session_id` semantic.

- Claude Code passes an SDK transcript UUID (not a cAgents session-dir name) as `input.session_id`, so the v12.15.0 deterministic chain returned `null` and `session-init-gate.cjs` denied every Agent spawn under concurrent runs. `findActiveSession` now detects the UUID shape and falls through to the env-var / promptHint steps; cAgents-shaped hints resolve as before. Regression test: `session-init-gate-uuid-payload.test.js`.

## V12.15.0 — June 2, 2026 (concurrent-session hook resilience)

Hardened cAgents hooks against two concurrent same-directory sessions so hooks fired by one instance never read or write the other's session tree (session `run_concurrent-session-hooks_260602_001`).

- **Deterministic resolution**: `findActiveSession` chain is now `sessionHint → CAGENTS_ACTIVE_SESSION → promptHint → null`; the legacy newest-first / grace heuristic is gated behind `{fallbackHeuristic: true}`.
- **Liveness filter** in session-catchup (LIVE sessions filtered out of resume offers), `withFileLock` around remaining shared-file appends, and `session_id`-bound secret restore. Closed hazards H1–H6 and H8; H7 deferred.

## V12.14.0 — June 1, 2026 (cross-teammate requests)

`/team` teammates can now ask the lead to route work to another teammate via a named `peer_request` protocol (session `run_improve-team-messaging_260602_001`).

- New playbook `pat-cross-teammate-request.md` (schema + 4-branch RELAY / SPAWN / PROMOTE / REJECT decision tree); `teams.md` and `/team` Step 5d wired to route inbound requests; NEEDS_CONTEXT extended with optional `requested_peer` / `peer_request_ref` (back-compatible).
- Non-goals: no nested teams, no direct teammate-to-teammate messaging — all cross-teammate work routes through the lead.

## V12.13.0 — June 1, 2026 (hook audit remediation)

Addressed 18 of 106 findings from the hook-system audit (session `run_fix-hook-audit-findings_260602_001`).

- **HIGH (9/9)**: tool-failure-tracker brought under the thinking-block-immutability contract; hook-catalog corrected for controller-delegation-validator / session-init-gate / permission-handler / team-stop semantics; Cloudflare bare-hex pattern downgraded high → medium.
- **MEDIUM (10/32)**: real bug fixed in team-stop agent-count (was matching the wrong `- agent_id:` shape); plus dead-code, dedup, and YAML-escape fixes. 24 MEDIUM + 65 LOW deferred.

## V12.12.1 — June 1, 2026

Follow-up patch to v12.12.0 (session `team_plugin-sanity-pass_260601_001`).

- Fixed two vitest file-fork concurrency races (the doc-counts mutation tests now write bogus content to temp-dir copies via `CAGENTS_VALIDATE_COUNTS_CLAUDE_MD` / `CAGENTS_PLUGIN_JSON_PATH` overrides; the canonical files are never mutated), removed a re-created `commit-changes` symlink and gitignored it, and cleaned phantom doc references plus added HISTORICAL banners to two stale docs.

## V12.12.0 — June 1, 2026 (plugin sanity pass + thinking-block-400 fix)

A 7-wave audit/cleanup (session `team_plugin-sanity-pass_260601_001`) shipped alongside the carry-forward thinking-block-400 hook fix.

- **Sanity pass**: removed canonical `/improve` framing across 9 /helper reference docs (→ `/run` keyword-router), fixed rules/docs drift and phantom path-globs, repaired broken cross-doc links and 144 → 141 count drift, and deleted a broken symlink.
- **thinking-block 400**: six hooks dropped `systemMessage` from latest-turn-suspect branches (advisory text redirected to stderr + a disk log), fixing Anthropic API 400 errors at `/team` wave boundaries while preserving all file-write side effects. Extended thinking stays enabled.

## V12.11.0 — May 27, 2026

Final organization + documentation reconciliation pass (session `team_final-org-docs_260528_001`).

- Confirmed repo-layout integrity (9 archetype roots + `agents/_overlay`, 141 agents); reconciled count drift to disk truth (README 238 → 141, docs 144 → 141, pipeline 7 → 5 states, max 5 → 3 revision cycles); added `validate-counts.sh` Check 2b (targeted absence guard) so stale agent-totals can no longer pass a presence-only check.

## V12.10.0 — May 27, 2026

FU-3 bare-prose `universal-*` rename (session `run_fu3-universal-prose_260527_001`).

- Token-only sweep of the last bare `universal-*` prose mentions (router / planner / validator / executor / self-correct) across 25 `agents/**` files, completing the v12.5.0 pipeline-agent rename; added a `no-bare-universal-prose-refs` regression guard.

## V12.9.0 — May 23, 2026

Cleanup-and-fix pass (session `run_big-cleanup-fix_260524_001`).

- Removed a dangling `commit-changes` symlink (green CI), repointed 4 orphaned `related_agents` cross-refs to their LP-12/LP-13 successors, refreshed stale count prose, and triaged removed-skill / consolidated-agent references (kept migration/history, cleaned 2 genuinely-stale invocation forms).

## V12.8.0 — May 23, 2026 (root directory streamline)

Layout refactor — no behavioral change.

- The 9 archetype dirs moved under `agents/`; the 2 legacy overlays moved to `agents/_overlay/`; `plugin.json` paths, scripts, `worktree.sparsePaths`, and ~12 tests updated. Root cleanup removed `Agent_Memory/`, `outputs/`, `templates/`, and stray files. Also auto-generated `KNOWN_AGENTS` in model-routing-advisor from `plugin.json` (LP-16).

## V12.7.0 — May 22, 2026 (doc + wiring audit + self-improvement backlog)

Post-v12.6.0 documentation/wiring audit (session `team_doc-review-full_260522_001`) plus the 28-item self-improvement backlog (session `team_execute-self-improvement_260522_001`).

- 84 files patched across 5 waves: validate-versions 17 → 16 slots, validate-agents warnings 61 → 0, 233 agent-name drift hits → 0.
- Self-improvement backlog folded the writer trio into `editor` and academic searchers into `scholar` (catalog 144 → 141), added `validate-counts.sh` / `validate-planner-output.cjs`, consolidated delegation hooks into `prompt-router`, extracted 4 playbooks, and lowered `max_internal_rounds` 3 → 2 (LP-27).

## V12.6.0 — May 21, 2026 (Pillar 4: drop external-UI schema contract)

- BREAKING: session YAML is now an internal-only cAgents contract. Removed UI-only emitter fields and file emissions, dropped the pre-v12 `DECOMPOSED` / `PROMPTS_READY` state names from active hooks, and removed the external schema contract test + fetcher. Added a best-effort migration script and 3 regression tests. Completes the 4-pillar arc (v12.3.0 → v12.6.0).

## V12.5.0 — May 21, 2026 (Pillar 3: naming renames)

- BREAKING hard cutover: renamed 10 core infrastructure agents — `universal-router → router`, `universal-planner → planner`, `universal-validator → validator`, `universal-executor → executor`, `universal-self-correct → self-correct`, `generic-coordinator → coordinator`, `team-trigger → team`, `team-lead-adapter → team-lead`, `task-consolidator → task-merger`, `task-inventory → task-state`. No aliases for the 10 renames; 10 regression tests added.

## V12.4.0 — May 21, 2026 (Pillar 2: compression)

- Catalog audit-extract-collapse pass shrank the active agent catalog 240 → 144; 96 never-spawned agents moved to `{archetype}/_deprecated/` buckets (kept on disk for alias resolution, excluded from `plugin.json`). Added `scripts/audit-agents.mjs`, the `playbooks/` landing zone, and 3 regression tests; survivors include all spawned, alias-target, controller/infrastructure, and curated canonical specialists.

## V12.2.0 — May 21, 2026 (BREAKING: /org removed)

v12.2.0 removes the `/org` skill and folds cross-domain coordination into
`/team` via auto-enabled strategic mode. This is a BREAKING change with no
back-compat alias — `/org X` invocations now fail with "skill not found".

### Breaking Change: /org Skill Removed

- **`/org` skill deleted.** The `.claude/skills/org/` directory is gone.
  Cross-domain strategy is now handled by `/team` with auto-strategic mode:
  Wave 0 = parallel C-suite analysis, Wave 1 = dependent C-suite analysis
  + objections, Wave 2 = brief synthesis, Wave 3..N = per-domain dispatch.
- **Auto-detection.** `/team` automatically enables strategic mode when
  `router.domain_count >= 2`. Users can override with
  `--strategic` (force enable) or `--no-strategic` (force disable).
- **Leadership agents preserved.** The 12 C-suite agents (CEO/CTO/CFO/CMO/
  COO/CHRO/CCO/CSO/CRO/CPO/CLO/VP-Engineering) keep their existing
  locations and SKILL.md schemas. Only the invoking skill changes.
- **Migration.** Replace `/org X` with `/team X` (auto-detects strategic
  mode for cross-domain requests).

### Changed

- `/team` SKILL.md grows a "Strategic Mode" section with reference docs
  migrated from `org/reference/` to `team/reference/strategic-*.md`.
- `core/router/SKILL.md` extended with `domain_count` and
  `detected_domains[]` output fields.
- Plugin manifest skill count: 5 → 4.
- `strategic_brief.yaml` schema adds `dependency_type` per domain entry.

### External-UI consumer

cAgents no longer treats any external visualizer as a downstream
consumer. Session schema references to external-UI compatibility are
removed.

See [CHANGELOG](../CHANGELOG.md#1220---2026-05-21) for full details.

## Historical Entries

## V12.1.2 — April 29, 2026

Previously marked Current Version. Folds `/improve` into `/run` via a
first-word keyword router and removes the standalone `/improve` skill.
See [CHANGELOG](../CHANGELOG.md) for details.

## V12.0.0 — May 20, 2026 (Consolidation Release)

v12.0.0 is the major consolidation release. Total agents 251 -> 238;
pipeline transitions 7 -> 5; legacy domain dirs 13 -> 2; execution
self-validation checks 15 -> 5.

### Pipeline & Controller Consolidation

- **Pipeline collapse (7 -> 5 states)**: `/run` state machine reduced
  from `INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY ->
  COORDINATED -> VALIDATED` to `INIT -> ORCHESTRATED -> PLANNED ->
  COORDINATED -> VALIDATED`. `task-decomposer` and `prompt-engineer`
  folded into `planner` as sub-responsibilities. Output schemas
  (`work_items.yaml`, `delegation_prompts.yaml`) preserved but written by
  planner directly.
- **engineering-manager -> tech-lead merge**: Two engineering controllers
  consolidated into a single fullstack `tech-lead`. 222 active references
  swept across SKILL.md, rules, tests, and config. Alias preserved in
  `scripts/migration/v12-aliases.yaml`.
- **architecture-reviewer collapsed**: Removed as standalone agent; reborn
  as `architect --review` mode flag.

### Agent Catalog Changes

- **Marketing-sales consolidation (38 -> 25)**: 13 marketing-sales agents
  absorbed across 6 groups (G1-G6). All 13 fold sources aliased.
- **chief-legal-officer -> clo**: Standardized C-suite naming.
- **vp-engineering moved to `leadership/`**: Now lives alongside other
  C-suite agents.
- **devops-lead -> infrastructure-lead**: Renamed and relocated to
  `developer/infrastructure/`.
- **engine-developer, game-programmer moved**: Relocated to
  `developer/backend/`.
- **Net agent count: 251 -> 238** (13 deletions: task-decomposer,
  prompt-engineer, engineering-manager, architecture-reviewer, 13
  marketing-sales merges; offset by vp-engineering move and clo rename).

### Quality & Configuration

- **max_revision_cycles 5 -> 3**: Tightened revision budget in
  `pipeline_config.yaml` per audit. Validator REVISE/FAIL routing capped
  at 3 cycles.
- **Execution self-validation (15 -> 5 hook-verifiable checks)**: The
  aspirational 15-check protocol replaced with 5 mechanically-verifiable
  checks: evidence freshness, file existence, guard exit codes, git state,
  file:line accuracy. Aspirational checks moved to
  `docs/FUTURE_VALIDATION_FRAMEWORK.md` for graduation tracking. See
  `.claude/rules/core/resources/execution-self-validation.md` for the new
  honesty contract.

### Filesystem Cleanup

- **11 legacy domain dirs deleted**: `engineering/`, `creative/`,
  `business/`, `growth/`, `service/`, `science/`, `health/`, `education/`,
  `personal/`, `arts/`, `trades/`. `people/` and `shared/` retained as
  routing-config-only overlays.
- **`cagents-memory/_communication/` removed**: Unused agent-messaging
  inbox/broadcast directory deleted; 58 stale SKILL.md references swept.

### Migration

All v11 -> v12 agent renames and merges are preserved via
`scripts/migration/v12-aliases.yaml` so existing session artifacts
referencing pre-v12 agent names continue to resolve. Tracking lives at
`_archive/v12-migration/migration-state.yaml`.

> Release discipline: cAgents evolves via **tiny bumps** — patch-level
> increments that each ship exactly one coherent change. See the
> "Tiny-Bump Cadence" section of `.claude/rules/core/version-registry.md`
> for the six atomicity criteria. v12.0.0 ships as a major bump because
> the pipeline state-machine reduction and controller merges constitute
> public-contract changes; per-bump entries during the revamp live in
> `CHANGELOG.md`.

> Release discipline: cAgents evolves via **tiny bumps** — patch-level
> increments that each ship exactly one coherent change. See the
> "Tiny-Bump Cadence" section of `.claude/rules/core/version-registry.md`
> for the six atomicity criteria. Per-bump entries live in `CHANGELOG.md`;
> this file keeps the longer narrative history.

---

## Version History

- [v11.1.4](#v1114---april-29-2026) - Plugin health sweep, archetype-canonical doc alignment (Current)
- [v11.1.3](#v1113---april-29-2026) - Stale-agent-reference cleanup post-v11.1.0 migration
- [v11.1.0](#v1110) - Builder-role archetype tree migration; cagents-memory rename
- [v11.0.0](#v1100) - Skill consolidation (`/improve` replaces `/review`+`/optimize`); `/context`/`/debug` removed
- [v10.26.0](#v10260---april-16-2026) - Release polish and production readiness
- [v10.25.6](#v10256---april-15-2026) - Documentation overhaul, 262 agents across 15 domains, 10 skills, 27 hooks
- [v10.23.0](#v10230) - 29-check validation framework, regression validation chain, mandatory self-validation protocol
- [v10.22.0](#v10220) - Two-stage review protocol (spec compliance then code quality), 5 pipeline improvements
- [v10.20.0](#v10200) - 23 agent communication gap fixes, Growth domain expanded from 35 to 39 agents
- [v10.18.0](#v10180) - Vibe field on all 262 agents, worktree isolation, guard command pattern, skill chaining
- [v10.16.0](#v10160) - Session ID naming overhaul with readable slugs, agent_id linking
- [v10.12.0](#v10120) - External-UI plugin integration with 15 session visualization improvements
- [v10.6.0](#v1060) - Confidence tiers, blind review, dead-letter queue, handoff documents
- [v10.3.0](#v1030) - Creative domain overhaul (24 to 30 agents, all on Opus 4.6)
- [v10.0.0](#v1000) - 15 domains (expanded from 8), agent chaining with topological execution
- [v9.26.0](#v9260---february-27-2026) - /org corporate hierarchy orchestration, COO controller promotion, --brief flag, strategic brief awareness
- [v9.23.0](#v9230---february-27-2026) - Event-driven pipeline, prompt-engineer agent, reviewer loops, revision routing
- [v9.22.0](#v9220---february-27-2026) - Nesting reduction, PostToolUse validation, enhanced audit trail
- [v9.21.0](#v9210---february-27-2026) - Documentation sync + stale reference fixes
- [v9.20.0](#v9200---february-27-2026) - TodoWrite blocking prerequisite enforcement
- [v9.19.1](#v9191---february-27-2026) - Embedded TodoWrite in /run workflow steps
- [v9.19.0](#v9190---february-27-2026) - Flattened /run to 2-level chain + TodoWrite progressive refinement
- [v9.17.0](#v9170---february-27-2026) - Agent name prefixing in TodoWrite patterns
- [v9.16.1](#v9161---february-27-2026) - Agent audit trail with SubagentStop tracking
- [v9.16.0](#v9160---february-26-2026) - AI writing detection enhancements
- [v9.15.1](#v9151---february-26-2026) - /team skill rewrite for reliable team spawning
- [v9.15.0](#v9150---february-26-2026) - Agent namespace correction to cagents: prefix
- [v9.14.1](#v9141---february-26-2026) - Hook system validation fixes from workflow audit
- [v9.14.0](#v9140---february-26-2026) - AI writing detection and rewrite agents
- [v9.13.0](#v9130---february-25-2026) - Self-contained hook paths via CLAUDE_PLUGIN_ROOT
- [v9.12.0](#v9120---february-25-2026) - Hook paths via CAGENTS_DIR env from settings.json
- [v9.10.6](#v9106---february-25-2026) - Hook path fixes using CLAUDE_PROJECT_DIR
- [v9.10.5](#v9105---february-24-2026) - Zero tolerance direct handling in /run
- [v9.10.4](#v9104---february-24-2026) - Portable hook paths with CAGENTS_DIR env var
- [v9.10.3](#v9103---february-24-2026) - 10 hook system bugs + Controller Delegation Protocol
- [v9.10.2](#v9102---february-23-2026) - Explicit 236-agent registration in plugin.json
- [v9.10.1](#v9101---february-23-2026) - Directory-based agent discovery for Claude Desktop
- [v9.10.0](#v9100---february-23-2026) - CJS-only hooks, run-hook.cjs launcher, Claude 4.6 models
- [v9.9.0](#v990---february-22-2026) - /team delegates routing+planning to /run
- [v9.7.0](#v970---february-22-2026) - /team direct TeamCreate and teammate spawning
- [v9.6.2](#v962---february-22-2026) - Remove unreliable prompt-type Stop hook
- [v9.6.1](#v961---february-22-2026) - Teammate /run Skill enforcement + hook path fixes
- [v9.6.0](#v960---february-22-2026) - Team templates, wave execution, interface contracts
- [v9.5.2](#v952---february-7-2026) - Remove unsupported SessionStart prompt hook
- [v9.5.1](#v951---february-7-2026) - Hook JSON output format corrections
- [v9.5.0](#v950---february-7-2026) - CJS-only hook architecture refactoring
- [v9.4.1](#v941---february-7-2026) - Hook corrections + context optimization
- [v9.4.0](#v940---february-7-2026) - Skill improvements from comprehensive review
- [v9.3.5](#v935---february-7-2026) - Remove non-functional context-overflow hook
- [v9.3.4](#v934---february-7-2026) - Hook reliability fixes
- [v9.3.3](#v933---february-7-2026) - Final consistency pass
- [v9.3.2](#v932---february-7-2026) - Consistency fixes
- [v9.3.1](#v931---february-7-2026) - Skills path + stop hook fixes
- [v9.3.0](#v930---february-7-2026) - /helper skill + frontmatter fixes
- [v9.2.0](#v920---february-7-2026) - Built-in Agent Teams migration
- [v9.1.2](#v912---february-7-2026) - Stop hook JSON validation fix
- [v9.1.1](#v911---february-7-2026) - tmux split pane refinements
- [v9.1.0](#v910---february-7-2026) - tmux split panes for team execution
- [v9.0.0](#v900---february-7-2026) - Platform Alignment Edition

---

## v11.1.4 - April 29, 2026

**Theme**: Comprehensive plugin health sweep. Closes the v11.1.0 archetype
migration cleanup, brings every documentation, config, and validation script
into sync with the canonical 9-archetype tree, and prunes stale slot
definitions from the version registry tooling.

### Highlights

- **Archetype-canonical doc alignment**: 9 archetypes (`developer`, `operator`,
  `advisor`, `analyst`, `creator`, `writer`, `strategist`, `core`,
  `leadership`) are now explicitly documented as the canonical organization.
  The 15-domain framing is preserved as a *routing/config overlay* — 13
  legacy domain dirs survive on disk holding only `config/domain_overrides.yaml`
  (router_keywords + controller_catalog) that the planner still consumes.
  `CLAUDE.md` and `README.md` lead with the archetype tree and label the
  legacy dirs explicitly.
- **111 → 0 validator warnings**: A single script-driven sweep resolved the
  full backlog of `validate-agents.sh` warnings — 43 broken `related_agents`
  cross-references retargeted to existing agents (`compliance-officer` →
  `compliance-manager`, `social-media-manager` → `campaign-manager`, etc.), 26
  legacy `related-agents` (hyphen) fields migrated to the structured
  `related_agents:` block, 28 missing `color` fields and 13 missing `model`
  fields added with sensible defaults.
- **Hook count corrections**: `.claude/settings.json` `$comment` field and
  `validate-agents.sh:444` assertion both updated to match reality (29 .cjs
  files = 26 unique registered hooks + utils + launcher + eval CLI). The
  off-by-one PASS counter (244/243) caused by a non-agent `log_pass` call
  was fixed; validator now reports 243/243.
- **`sync-agents.sh --check` flag**: True dry-run that compares
  `plugin.json` against the archetype-tree SKILL.md inventory without
  mutation. Exits 0 in-sync, 1 on drift. Includes regression test
  asserting `mtime` is unchanged across `--check` invocations.
- **Version registry pruning**: `validate-versions.sh` previously listed
  24 slots (10 stale: pointed at `engineering/plugin.json`,
  `.claude/skills/review/SKILL.md`, etc., none of which exist post-V11.0).
  Pruned to track exactly the 18 canonical slots from
  `.claude/rules/core/version-registry.md`. Now reports
  `Checked 18/18, 0 mismatches, 0 skipped`.
- **Two regression tests added** (Bug-Driven Testing mandate):
  - `tests/regression/related-agents-validation.test.js` — asserts the
    sweep stays applied (warnings stay near zero on every CI run).
  - `tests/regression/sync-agents-check.test.js` — asserts the `--check`
    contract.
- **Local cleanup**: `cagents-memory-staging/file-move-table.tsv` (v11.1.0
  migration record) archived to `archive/migration/v11.1.0/`. Empty
  `cagents-memory-staging/` directory removed. Both locations gitignored.

### Validator status at HEAD

```
$ bash scripts/ci/validate-agents.sh
Total agents: 243   Passed: 243   Warnings: 0   Errors: 0

$ bash scripts/ci/validate-versions.sh
Checked 18/18 locations, 0 mismatches, 0 skipped — PASS at 11.1.4

$ bash scripts/lint-agents.sh
243/243 agents pass schema validation
```

---

## v11.1.3 - April 29, 2026

**Theme**: Stale-agent-reference cleanup discovered during v11.1.0 migration.
Replaced three orphan references (`compliance-officer` →
`compliance-manager`, `talent-acquisition-manager` → `talent-recruiter`)
in shared/people config files and dropped two nonexistent paths from
`scripts/fix-resource-frontmatter.sh`.

---

## v11.1.0

**Theme**: Builder-role archetype tree migration. The per-domain
`{domain}/agents/` layout was replaced with a 9-archetype root system
(`developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`,
`strategist`, `core`, `leadership`). 3-level archetypes (developer,
operator, advisor) require a `branch:` field; 2-level archetypes
(analyst, creator, writer, strategist) and flat archetypes (core,
leadership) do not. The `cagents-memory/` directory was renamed (from
`Agent_Memory/`) for project-local clarity. Top-level `domain:`
frontmatter field was replaced by `archetype:` + optional `branch:`.

---

## v11.0.0

**Theme**: Skill consolidation. `/review` and `/optimize` merged into
`/improve` (`--mode review|optimize|full`). `/context` replaced by
`/run context …` passthrough. `/debug` replaced by `/run --mode debug`.
Six user-invocable skills remain: `/run`, `/team`, `/org`, `/designer`,
`/improve`, `/helper`. See `docs/MIGRATION-V11.md` for the migration
guide.

---

## v10.26.6 – v10.26.10 - April 21, 2026

**Theme**: `/context` utility demotion arc. Five-patch sequence that moves
`/context` from a user-invocable slash command to a Claude-invoked utility,
preserving the data file path `cagents-memory/_projects/{hash}/product_context.yaml`
at every step.

| Bump | Change |
|------|--------|
| 10.26.6 | Hide `/context` from the `/` menu via frontmatter flip (`metadata.user-invocable: "false"`). `plugin.json` description reworded to "8 user skills + /context utility". |
| 10.26.7 | Document the orchestrator's direct READ path in `core/orchestrator/resources/product-context-loader.md`. No code change; formalizes the helper contract. |
| 10.26.8 | Remove `/context` from `/helper` public catalog. New "Internal utilities (Claude-invoked)" subsection; comparison tables drop the `/context` column. Claims the "Planned" slot reserved in 10.26.4. |
| 10.26.9 | Add `/run context show\|init\|update\|clear` passthrough subcommands. Front-door dispatch in Step 1 of `/run` skips the state machine and calls `Skill({ skill: "context", args: "<sub>" })`. |
| 10.26.10 | Tighten `/context` description to utility-facing. Add back-compat pointer to `/run context show`. Finalize the demotion arc. |

**Data invariant**: `cagents-memory/_projects/{hash}/product_context.yaml` is
unchanged across all five patches. Users who typed `/context` get a
migration pointer to `/run context show`. The orchestrator continues to
read the YAML directly during INIT-state enrichment per the
`orchestration-reference.md:18,27` contract.

**Regression coverage**: five new test files —
`tests/skills/context-invocation.test.js` (V10.26.6),
`tests/orchestrator/product-context-read.test.js` (V10.26.7),
updated `tests/skills/helper-catalog.test.js` (V10.26.8),
`tests/skills/run-context-passthrough.test.js` (V10.26.9), and
`tests/skills/context-utility-final.test.js` (V10.26.10).

---

## v10.26.0 - April 16, 2026

**Theme**: Release polish and production readiness. Distribution cleanup removes internal strategy documents and legacy directories from git-tracked distribution. Version tracking expanded, templates consolidated, and branding standardized across all manifests.

### Changes

**Distribution Cleanup**
- Removed competitive intelligence and internal strategy documents from git-tracked distribution (moved to archive/)
- Removed legacy `core/commands/` directory (superseded by `.claude/skills/`)
- Removed deprecated `settings.shell-only.json`

**Version Tracking Expanded**
- `sync-versions.sh` now covers 21 locations (up from 18), including `README.md`, `docs/README.md`, and `docs/RELEASE_NOTES.md`

**Template Consolidation**
- 3 template directories merged into canonical `docs/templates/` (10 templates)

**Documentation Accuracy**
- Fixed docs count, hook count, and file naming consistency in `CLAUDE.md`

**Branding Standardization**
- Consistent copyright (CaelanDrayer) and GitHub URLs across all manifests

**Distribution Control**
- Added `.npmignore` for controlled plugin distribution

**README Improvements**
- Replaced non-existent sub-plugin references with domain-routing guidance

---

## v10.25.6 - April 15, 2026

**Theme**: Documentation overhaul and accuracy pass. All documentation updated to reflect current state: 262 agents across 15 domains, 10 skills, 27 registered hooks (30 .cjs files), 29 rules files.

### Changes

- Updated README.md: stats table (10 skills, 27 hooks), hook table expanded from 12 to 27 entries, added /hookify skill section, fixed PreToolUse[Task] to PreToolUse[Agent], version history updated
- Updated package.json description: 262 agents across 15 domains with 10 skills
- Updated plugin.json and marketplace.json: 10 skills, 27 hooks, /hookify listed
- Audited and fixed all docs/*.md files for stale agent counts, domain counts, hook counts, skill counts
- Fixed RELEASE_NOTES.md header and added V10.x version history entries
- Fixed MIGRATION_GUIDE.md: 15 domains, 262 agents
- Fixed DOMAIN_STRUCTURE_STANDARD.md: 262 agents across 15 directories
- Fixed architecture/overview.md: 262 agents across 15 domains
- Fixed agents/index.md: 262 agents across 15 domains

---

## v9.26.0 - February 27, 2026

**Theme**: Corporate hierarchy orchestration -- New `/org` command that maps cAgents' 239 agents to a corporate hierarchy model. CEO logic runs inline, C-suite agents provide parallel domain analysis, two-phase deliberation produces a strategic brief, and sequential `/team` instances execute per domain (dependency-ordered). COO promoted to controller tier. `/run` gains `--brief` flag. `/team` gains strategic brief awareness.

### New Features

**1. /org Command** (`.claude/skills/org/`)
- 6-state pipeline: INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE
- CEO inline logic with C-suite parallel spawning
- Two-phase deliberation (analysis + objections)
- Strategic brief generation (`strategic_brief.yaml`)
- Parallel `/team` delegation per domain
- Structured escalation protocol (execution -> controller -> C-suite -> CEO -> user)
- Smart routing: single domain simple -> /run, single domain complex -> /team, multi-domain -> full hierarchy
- Reference files: flags.md, csuite-mapping.md, strategic-brief-schema.md, escalation-protocol.md, examples.md
- Pipeline config: `org_pipeline_config.yaml`

**2. COO Controller Promotion**
- `make/agents/coo/SKILL.md`: tier changed from `execution` to `controller`
- Added Agent tool to allowed tools list
- Added `coordination_style: question_based` and `typical_questions`
- Added /org integration section for operate_ops domain analysis
- Added to `make/config/planner_config.yaml` controller_catalog as tier_3

**3. /run --brief Flag**
- New `--brief <path>` flag reads strategic_brief.yaml for context
- Passes CEO-level mission, success criteria, and domain assignments to enrichment agents
- Enables /org -> /run delegation with strategic framing

**4. /team Strategic Brief Awareness**
- Detects `strategic_brief.yaml` in session directory
- Reads mission and success criteria for enrichment context
- Writes `domain_status` updates to brief (CEO monitoring interface)
- Checks for escalation directives from CEO

### Configuration Changes

| File | Change |
|------|--------|
| `cagents-memory/_system/config/org_pipeline_config.yaml` | New: 6-state machine, C-suite config, routing rules |
| `make/agents/coo/SKILL.md` | Modified: execution -> controller tier |
| `make/config/planner_config.yaml` | Modified: COO added to tier_3 controllers |
| `.claude/skills/run/SKILL.md` | Modified: --brief flag added |
| `.claude/skills/team/SKILL.md` | Modified: strategic_brief.yaml awareness added |

### Documentation Updates

| File | Change |
|------|--------|
| `CLAUDE.md` | /org in skills table, quick reference, directory structure |
| `WORKFLOW_AGENT_INTERACTIONS.md` | /org section, updated commands overview and summary |
| `docs/RELEASE_NOTES.md` | This entry |

### Version Bump

All 10 version files bumped: 9.25.0 -> 9.26.0

### Migration Notes

- No breaking changes. Existing /run and /team workflows unchanged.
- COO reclassification: existing workflows referencing COO as execution agent will now get controller behavior (question-based delegation). This is an improvement, not a regression.
- Agent count remains 239 (COO reclassified, not new).

---

## v9.23.0 - February 27, 2026

**Theme**: Event-driven agent pipeline -- Replace one-shot delegation with state machine engine. Each agent enriches the user's request before passing downstream. Revision loops at both controller and pipeline levels ensure quality. New prompt-engineer agent crafts optimized delegation prompts.

**New Agent**:
- `prompt-engineer` (core/prompt-engineer/SKILL.md): Sits between decomposer and controller. Reads work items, analyzes codebase, crafts optimized delegation prompts with code snippets, constraints, and anti-patterns. Registered in core and root plugin.json.
- Agent count: 238 -> 239 (15 core + 14 shared + 210 domain)

**New Files**:
- `cagents-memory/_system/config/pipeline_config.yaml`: State machine definition (INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED), revision routing, model routing, controller revision settings
- `cagents-memory/_system/templates/event.yaml`: Event schema template for pipeline agents

**Major Rewrites**:
- `/run` SKILL.md: Replaced 6-step fixed workflow with state machine loop reading pipeline_config.yaml. /run spawns agents sequentially at level 1, reads completion events to advance state. Supports revision routing (FAIL -> PROMPTS_READY, REVISE -> PLANNED, max 5 cycles). Detects pre-enrichment for /team teammate flows via --session flag.
- `/team` SKILL.md: Replaced 3-wave model with 5-wave model. Wave 0 (lead: enrichment via orchestrator+planner+decomposer), Wave 1-3 (teammates: each runs /run --session for prompt-engineer+controller+reviewer+validator), Wave 4 (lead: integration+final validation). Teammate autonomy: flag issues but continue working. Cross-WI file-based handoffs.

**Updated Core Agents**:
- `orchestrator`: Added event writing for enriched_context.yaml output
- `planner`: Added event writing for plan.yaml output
- `task-decomposer`: Added event writing for work_items.yaml output, pipeline-standard filename
- `validator`: Changed PASS/FIXABLE/BLOCKED to PASS/FAIL/REVISE classification. FAIL triggers controller re-execution, REVISE triggers re-planning. Added event writing with classification metadata.

**Updated Rules**:
- `controllers.md`: Added reviewer loop section. After executor completes, controller spawns reviewer (max 3 internal rounds). review_rounds tracking in coordination_log.yaml. Controller writes completion event.
- `orchestration.md`: Full rewrite with event-driven state machine model, pipeline config, event files, revision routing, /team 5-wave integration.

**Updated Documentation**:
- CLAUDE.md: Updated architecture (state machine), delegation chain, core infrastructure (15 agents), workflow execution, skills descriptions, team mode, quick reference
- Version bump: 9.22.0 -> 9.23.0 across all 10 version files

**Design Source**: `cagents-memory/sessions/designer_20260227_082000/design_document.md`

---

## v9.22.0 - February 27, 2026

**Theme**: Nesting reduction + quality infrastructure -- /run runs inline (no fork), /team teammates spawn controllers directly, PostToolUse validation hook, enhanced agent audit trail with completion summaries and duration tracking.

**Breaking Changes**:
- `/run` SKILL.md: `context: fork` changed to `context: none`. /run now runs inline in the current conversation context instead of forking a subagent. This eliminates one nesting level.
- `/team` teammate prompts: Teammates now spawn controllers directly via Agent tool instead of invoking /run as a nested Skill fork. Team lead assigns controllers during decomposition.

**Changes**:
- `/run` context changed from `fork` to `none` (minimizes subagent nesting per Claude Code constraints)
- `/team` Step 2 now assigns a controller per work item during decomposition
- `/team` Steps 5/8 (wave 0/2) use direct controller delegation instead of Skill("run")
- `/team` Step 6 teammate prompt spawns assigned controller directly via Agent tool
- New `post-write-validator.cjs` PostToolUse hook validates JSON/YAML syntax after Write/Edit
- Enhanced `subagent-stop-tracker.cjs` captures `last_assistant_message` summary and `duration_seconds`
- Agent audit trail now includes `completion_summary` and `duration_seconds` per agent in `agent_tree.yaml`
- Global audit log (`agent_spawns.log`) includes stop event summaries
- File change audit trail added (`workflow/file_changes.log`) via PostToolUse hook
- Updated architecture documentation across CLAUDE.md, orchestration.md, hooks.md, controllers.md
- Version synced to 9.22.0 across all version files

**New Hook**: `PostToolUse[Write|Edit]` -> `post-write-validator.cjs` (18th .cjs file, 15th registered hook)

**Nesting Model** (before vs after):
- `/run` direct: fork(1) -> controller(2) -> execution(3) => inline(0) -> controller(1) -> execution(2)
- `/team` teammate: teammate -> Skill/run fork(1) -> controller(2) -> execution(3) => teammate -> controller(1) -> execution(2)

**Files Changed**: 20+ files across skills, hooks, settings, rules, docs, and manifests

---

## v9.21.0 - February 27, 2026

**Theme**: Documentation sync + stale reference fixes -- comprehensive alignment of all documentation with current v9.20 architecture.

**Changes**:
- Updated RELEASE_NOTES.md with all missing v9.5.1-v9.20.0 entries (was stuck at v9.5.0)
- Fixed RELEASE_NOTES.md "Current State" section (was v8.0.28 with wrong agent counts -- now v9.21.0 with 238 agents)
- Fixed package.json description (said V9.14, now V9.21.0)
- Fixed README.md version references (V9.19 -> V9.20/V9.21)
- Fixed TEAM_MODE.md stale architecture references (removed trigger -> router + planner 5-level chain, updated to flattened 2-level)
- Fixed SKILLS.md skill line counts (were from v9.0 era)
- Fixed team architecture.md reference file (showed old 5-level chain)
- Version synced to 9.21.0 across all 12 version files

**Files Changed**: 16 files across docs, manifests, and configuration

---

## v9.20.0 - February 27, 2026

**Theme**: TodoWrite blocking prerequisite enforcement -- restructured /run steps so TodoWrite is ACTION 1 per phase, added mandatory TodoWrite to all 57 controllers, stronger helper patterns.

**Changes**:
- Restructured /run 6-step workflow so TodoWrite is ACTION 1 or ACTION 2 in every step (minimum 4 TodoWrite calls per execution)
- Added mandatory TodoWrite requirement to all 57 controller agents for execution agent visibility
- Enhanced /helper skill with stronger patterns
- Fixed stale documentation references
- Version synced to 9.20.0 across all manifests

---

## v9.19.1 - February 27, 2026

**Theme**: Embedded TodoWrite directives directly into /run workflow steps.

**Changes**:
- TodoWrite calls now appear as explicit ACTION items within each /run step
- Prevents TodoWrite from being treated as optional afterthought
- Each step shows exactly when and what to write to TodoWrite

---

## v9.19.0 - February 27, 2026

**Theme**: Flattened /run to 2-level delegation chain + hook path fix + TodoWrite progressive refinement.

**Changes**:
- **Flattened architecture**: /run now performs routing, planning, and orchestration inline (no separate trigger, orchestrator, router, planner agents)
- Only controller and execution agents are spawned as subagents (2 levels instead of 5)
- Hook path resolution: bash -c wrapper with 3-tier fallback chain (CLAUDE_PLUGIN_ROOT -> CLAUDE_PROJECT_DIR -> pwd)
- TodoWrite progressive refinement: controllers update TodoWrite entries as execution agents are identified
- V9.18 replaced the 5-level chain that caused Agent tool unavailability, context exhaustion, and empty session directories

---

## v9.17.0 - February 27, 2026

**Theme**: Agent name prefixing in TodoWrite patterns.

**Changes**:
- All TodoWrite entries now prefixed with executing agent name (e.g., `[engineering-manager] Coordinate work`)
- Gives users real-time visibility into which agent is performing which task
- Applied across all controller and /run TodoWrite patterns

---

## v9.16.1 - February 27, 2026

**Theme**: Agent audit trail with SubagentStop tracking + race condition fix.

**Changes**:
- Added `subagent-stop-tracker.cjs` hook for SubagentStop events
- Agent tree now records `stopped_at` timestamps when agents finish
- Fixed race condition in session discovery when status.yaml hasn't been written yet
- Global audit log at `cagents-memory/_system/logs/agent_spawns.log`

---

## v9.16.0 - February 26, 2026

**Theme**: AI writing detection enhancements.

**Changes**:
- Added perplexity, burstiness, and LIX readability analysis to AI writing detector
- Enhanced human-like rewrite strategies for AI writing rewriter
- Improved detection accuracy with new linguistic metrics

---

## v9.15.1 - February 26, 2026

**Theme**: /team skill rewrite for reliable team spawning + tmux sessions.

**Changes**:
- Rewrote /team SKILL.md with explicit step-by-step execution instructions
- Eliminated common failure modes (creating tasks without spawning teammates, skipping TeamCreate)
- Added wave-based execution model (wave 0 bootstrap, wave 1 parallel, wave 2 integration)
- Added reference files: architecture.md, fallback-behavior.md, flags.md

---

## v9.15.0 - February 26, 2026

**Theme**: Agent namespace correction to cagents: prefix + session linkage.

**Changes**:
- Corrected agent namespace to use `cagents:` prefix consistently
- Added session linkage for subagent tracking
- Fixed agent discovery in plugin contexts

---

## v9.14.1 - February 26, 2026

**Theme**: Resolve 6 hook system validation issues from workflow tree audit.

**Changes**:
- Fixed 6 hook validation issues identified during comprehensive workflow audit
- Improved hook error handling and output format compliance

---

## v9.14.0 - February 26, 2026

**Theme**: AI writing detection and rewrite agents.

**Changes**:
- New `ai-writing-detector` agent with 14-category hallmark scanning
- New `ai-writing-rewriter` agent with 5-pass humanization pipeline
- Detection patterns cover: hedging language, formulaic transitions, passive voice overuse, etc.
- Rewrite strategies: vocabulary diversification, sentence restructuring, rhythm variation
- Added to Make domain (agents count: 236 -> 238)
- Fixed scripts and resource stubs

---

## v9.13.0 - February 25, 2026

**Theme**: Self-contained hook paths via CLAUDE_PLUGIN_ROOT env var.

**Changes**:
- All hook paths now use `${CLAUDE_PLUGIN_ROOT}` for self-contained plugin operation
- Eliminates dependency on working directory for hook resolution
- Works correctly when cAgents installed as a Claude Code plugin

---

## v9.12.0 - February 25, 2026

**Theme**: Hook paths via CAGENTS_DIR env from settings.json.

**Changes**:
- Added `CAGENTS_DIR` custom env var approach for hook path resolution
- Settings.json env section used to pass directory path to hooks

---

## v9.10.6 - February 25, 2026

**Theme**: Hook path fixes using CLAUDE_PROJECT_DIR.

**Changes**:
- Use `$CLAUDE_PROJECT_DIR` for hook paths (custom env vars not expanded by Claude Code)
- Fixed hook resolution in subagent contexts

---

## v9.10.5 - February 24, 2026

**Theme**: Zero tolerance direct handling in /run -- always delegate.

**Changes**:
- Enforced strict delegation policy: /run NEVER handles requests directly
- All requests delegated to subagents via Agent tool without exception
- If delegation fails, /run reports failure rather than falling back to direct handling

---

## v9.10.4 - February 24, 2026

**Theme**: Portable hook paths with CAGENTS_DIR env var.

**Changes**:
- Use `CAGENTS_DIR` environment variable for portable hook paths across projects
- Works when cAgents is installed outside the working directory

---

## v9.10.3 - February 24, 2026

**Theme**: 10 hook system bugs resolved + Controller Delegation Protocol added to all 57 controllers.

**Changes**:
- Resolved 10 hook system bugs identified in comprehensive audit
- Added Controller Delegation Protocol to all 57 controller agent SKILL.md files
- Protocol enforces: controllers NEVER do direct work, minimum 2 subagents per objective

---

## v9.10.2 - February 23, 2026

**Theme**: Explicit 236-agent registration in plugin.json for Claude Desktop.

**Changes**:
- Explicitly registered all 236 agents in root plugin.json `agents` array
- Required for Claude Desktop which needs explicit agent paths (no directory scanning)

---

## v9.10.1 - February 23, 2026

**Theme**: Directory-based agent discovery for Claude Desktop compatibility.

**Changes**:
- Added directory-based agent discovery approach
- Ensures agents are discoverable in Claude Desktop environments

---

## v9.10.0 - February 23, 2026

**Theme**: CJS-only hook architecture with run-hook.cjs launcher + Claude 4.6 model support.

**Changes**:
- Added `run-hook.cjs` launcher that resolves hook paths using `__dirname`
- All settings.json hook commands now invoke via `node .claude/hooks/run-hook.cjs <hook-name>`
- Added Claude 4.6 model routing: Opus 4.6 (reasoning), Sonnet 4.6 (execution), Haiku 4.5 (support)
- `opusplan` hybrid model for controllers (Opus 4.6 planning + Sonnet 4.6 execution)

---

## v9.9.0 - February 22, 2026

**Theme**: /team delegates routing+planning to /run's infrastructure.

**Changes**:
- /team now reuses /run's routing and planning infrastructure
- Eliminates duplicated domain detection and tier classification logic
- Consistent decomposition quality across /team and /run workflows

---

## v9.7.0 - February 22, 2026

**Theme**: /team directly orchestrates TeamCreate and teammate spawning.

**Changes**:
- /team now calls TeamCreate directly instead of delegating to team-trigger
- Simplified team creation pipeline for reliability
- Teammates spawned via Agent tool with explicit /run Skill invocation

---

## v9.6.2 - February 22, 2026

**Theme**: Remove unreliable prompt-type Stop hook causing JSON validation errors.

**Changes**:
- Removed prompt-type Stop hook that caused recurring JSON validation failures
- `verify-completion.cjs` command hook provides equivalent file-based verification

---

## v9.6.1 - February 22, 2026

**Theme**: Enforce teammate /run Skill invocation + hook path fixes.

**Changes**:
- Enforced that teammates MUST invoke /run via Skill tool (not implement directly)
- Fixed hook paths with CLAUDE_PLUGIN_ROOT resolution

---

## v9.6.0 - February 22, 2026

**Theme**: Team templates, wave execution, interface contracts.

**Changes**:
- **Team templates**: 7 pre-built templates (fullstack-app, api-service, frontend-app, content-campaign, data-pipeline, game-project, custom)
- **Wave execution**: 3-wave model (bootstrap -> parallel -> integration) with gate sentinel pattern
- **Interface contracts**: Explicit provider/consumer contracts between teams with artifact verification
- **Gate sentinel pattern**: Wave ordering enforced via TaskCreate dependencies (no custom orchestration)
- Auto-template selection based on keyword/domain/project scoring

---

## v9.5.2 - February 7, 2026

**Theme**: Remove unsupported SessionStart prompt hook + fix secret-detection output.

**Changes**:
- Removed SessionStart prompt hook (not supported by Claude Code for this event type)
- Fixed secret-detection.cjs output format compliance

---

## v9.5.1 - February 7, 2026

**Theme**: Correct hook JSON output formats per Claude Code event type specs.

**Changes**:
- Fixed JSON output format for multiple hooks to comply with Claude Code specifications
- Ensured hookSpecificOutput matches expected schema for each event type

---

## v9.5.0 - February 7, 2026

**Theme**: CJS-only hook architecture -- ground-up refactoring eliminating the dual shell+JS hook system.

**Root Cause Analysis**: Versions 9.1.2 through 9.4.1 each contained hook fixes for recurring bugs caused by the dual-language architecture. The fundamental issues were:
- Shell hooks' `set -euo pipefail` (from `core.sh`) propagating strict mode into hooks
- ERR EXIT traps causing duplicate JSON output on error paths
- fd redirection (`exec 3>&1; exec 1>&2`) fragility for stdout/stderr separation
- Shell dispatch layer (`hook-dispatch.sh`, `hook-dispatch-node.sh`) adding indirection that amplified errors
- PreToolUse deny using exit 2 instead of exit 0 + deny JSON

**Solution**: Consolidate to CJS-only architecture with `createHook()` factory pattern.

**Infrastructure Changes**:
- New `createHook(name, handler)` factory in `hook-utils.cjs` -- eliminates ~25 lines of boilerplate per hook
- New `findTeamSession()` helper extracted from 4 duplicated team hooks
- New `bash-validator.cjs` hook replacing `pre-bash.sh`
- All hooks invoked directly via `node .claude/hooks/<name>.cjs` (no dispatch layer)
- Shorthand result types: `{ deny: true, reason }` and `{ allow: true, reason }`

**Shell Hooks Eliminated (9)**:
- `hooks/session/on-session-start.sh` -> merged into `session-catchup.cjs`
- `hooks/session/on-session-end.sh` -> merged into `team-stop.cjs`
- `hooks/workflow/stop-workflow.sh` -> merged into `verify-completion.cjs`
- `hooks/tools/pre-bash.sh` -> replaced by `bash-validator.cjs`
- `hooks/tools/pre-write.sh` -> merged into `secret-detection.cjs`
- `hooks/workflow/on-task-start.sh` -> removed (minimal logging only)
- `hooks/workflow/on-task-complete.sh` -> removed (minimal logging only)
- `hooks/workflow/on-workflow-complete.sh` -> removed (archiving logic minimal)
- `hooks/workflow/on-user-prompt.sh` -> removed (context injection minimal)

**Dispatch Scripts Eliminated (2)**:
- `scripts/hook-dispatch.sh` -> no longer needed
- `scripts/hook-dispatch-node.sh` -> no longer needed

**Hook Registry Updated** (`settings.json`):
- All hooks now `node .claude/hooks/<name>.cjs` (was `$CLAUDE_PLUGIN_ROOT/scripts/hook-dispatch*.sh`)
- Removed SubagentStop event (was on-workflow-complete.sh, minimal)
- Removed UserPromptSubmit event (was on-user-prompt.sh, minimal)
- Removed PostToolUse[Task] event (was on-task-complete.sh, minimal)
- Removed PreToolUse[Task] event (was on-task-start.sh, minimal)
- CAGENTS_VERSION env updated to 9.5.0

**Refactored Hooks (12)**:
- `session-catchup.cjs` - 123 lines (was 205), uses createHook()
- `verify-completion.cjs` - 112 lines (was 204), uses createHook()
- `pre-compact-save.cjs` - 115 lines (was 363), uses createHook()
- `secret-detection.cjs` - 167 lines (was 249), uses createHook(), merged pre-write.sh
- `notification.cjs` - 53 lines (was 121), uses createHook()
- `subagent-tracker.cjs` - 50 lines (was 147), uses createHook()
- `tool-failure-tracker.cjs` - 77 lines (was 164), uses createHook()
- `team-start.cjs` - 81 lines (was 205), uses createHook()
- `team-stop.cjs` - 77 lines (was 252), uses createHook(), merged on-session-end.sh
- `team-task-complete.cjs` - 109 lines (was 315), uses createHook()
- `teammate-idle-handler.cjs` - 39 lines (was 110), uses createHook()
- `permission-handler.cjs` - 56 lines (was 141), uses createHook()

**New Hook (1)**:
- `bash-validator.cjs` - 62 lines, replaces pre-bash.sh, uses createHook()

**Validation**: All 13 hooks tested with empty input (`echo '{}' | node .claude/hooks/<name>.cjs`) producing valid `{"continue":true}` JSON. Security hooks tested with targeted inputs (dangerous commands, protected paths, secret patterns) -- all correctly deny/allow as expected.

**Documentation Updated**:
- `.claude/rules/core/hooks.md` - Rewritten for V9.5 CJS-only architecture
- `CLAUDE.md` - Updated hook counts, version references
- `docs/RELEASE_NOTES.md` - This entry

**Impact Summary**:
| Metric | Before (V9.4) | After (V9.5) | Change |
|--------|---------------|--------------|--------|
| Shell hooks | 9 | 0 | -100% |
| Dispatch scripts | 2 | 0 | -100% |
| CJS hooks | 12 | 13 | +1 (bash-validator) |
| Total hook lines | ~2,800 | ~1,060 | -62% |
| Hook boilerplate per file | ~25 lines | 0 (createHook) | -100% |
| Hook bug fix commits (9.1-9.4) | 5 | 0 (target) | Architectural fix |

---

## v9.4.1 - February 7, 2026

**Theme**: Hook correctness + context optimization + skill UX.

**Hook Fixes (7 categories)**:
- Fixed shell hook ERR EXIT trap pattern causing potential double JSON output (8 hooks)
- Fixed PreToolUse hooks using exit 2 instead of exit 0 with deny JSON (pre-bash.sh, pre-write.sh, secret-detection.cjs)
- Fixed SubagentStart hook using wrong input fields (`subagent_type` -> `agent_type`/`agent_id`)
- Fixed TaskCompleted hook using wrong input fields (now uses `task_subject`, `task_description`, `teammate_name`)
- Fixed TeammateIdle hook using wrong fallback field (`agent_name` -> `teammate_name` only)
- Updated hook dispatcher comments to reflect correct exit code semantics
- Unified version across all 14 manifest/config/settings files to 9.4.1

**Context Optimization (77% token reduction)**:
- Added path-specific YAML frontmatter to 13 rules files for conditional loading
- Rules now only load when working in relevant directories (e.g., hooks.md only for hook files)
- Always-loaded: orchestration, controllers, execution, shared-questions, agent-memory, completion

**Skill UX**:
- Added `argument-hint` frontmatter to all 6 skills for better command-line discovery

**Documentation**:
- Updated hooks.md exit code docs (exit 0 + deny JSON, not exit 2)
- Updated RELEASE_NOTES.md with v9.3.3 through v9.4.1 entries

## v9.4.0 - February 7, 2026

**Theme**: Skill improvements from comprehensive review.

- Fixed /run domain terminology (Engineering/Creative/Revenue -> Make/Grow/Operate)
- Fixed /review self-recursive delegation (was delegating to itself via cagents:review)
- Marked /optimize --continuous mode as planned/not-yet-implemented
- Added /helper self-reference section and updated overview tables
- Fixed .gitignore blocking all reference/ directories (tracked 23 skill reference files)
- Added --resume flag to /run for session continuation
- Added error handling section to /run

## v9.3.5 - February 7, 2026

**Theme**: Remove non-functional context-overflow hook.

- Removed context-overflow.cjs registration (ContextOverflow not a valid hook type)
- Cleaned up references in hooks.md and README.md

## v9.3.4 - February 7, 2026

**Theme**: Hook reliability - double JSON output, missing paths, permissions.

- Fixed hooks producing duplicate JSON output on error paths
- Fixed missing session path resolution in stop-workflow.sh
- Fixed env var priority in hook-utils.cjs

## v9.3.3 - February 7, 2026

**Theme**: Final consistency pass - all versions, counts, docs unified.

- Unified all version references to 9.3.3

## v9.3.2 - February 7, 2026

**Theme**: Consistency Pass - Unified versions, corrected counts, added safety blocks.

- Unified version to 9.3.2 across all 16 manifest/config files (root, marketplace, package.json, settings, 7 domain plugins)
- Fixed CJS hook count from 11 to 12 in documentation (CLAUDE.md, hooks.md, README.md, setup.sh)
- Fixed shell hook count from 7 to 9 in setup.sh
- Fixed Tier 1 agent count from 12 to 14 in CLAUDE.md
- Added `mkfs` to pre-bash.sh blocked command patterns
- Removed dead `index.js` reference from package.json
- Removed stale V9.0 version strings from setup.sh

## v9.3.1 - February 7, 2026

**Theme**: Plugin discoverability + stop hook reliability.

- Added `"skills": "./.claude/skills/"` to plugin.json so slash commands are discoverable when installed as a plugin
- Fixed sessions/ path in stop-workflow.sh
- Fixed env var priority in hook-utils.cjs (CLAUDE_PROJECT_DIR before CLAUDE_PLUGIN_ROOT)
- Added stop_hook_active loop protection and decision:block format in verify-completion.cjs

## v9.3.0 - February 7, 2026

**Theme**: New /helper command + skill frontmatter corrections.

- New `/helper` skill (7 files) for command guidance, natural language recommendation, comparisons, and topic deep dives
- Fixed skill frontmatter across all 6 skills: `allowedTools` -> `allowed-tools` (kebab-case)
- Removed invalid `agent: true/false` boolean fields (should be string subagent type or omitted)
- Removed undocumented `context: none` (omitting field achieves same behavior)
- Synced settings templates and package.json versions

## v9.2.0 - February 7, 2026

**Theme**: Built-in Agent Teams migration.

- Migrated `/team` from manual tmux scripting to Claude Code's built-in agent teams API
- Uses `TeamCreate`, `SendMessage`, `TaskCreate`/`TaskList`/`TaskUpdate`, `TeamDelete`
- `teammateMode: "tmux"` in settings.json provides split pane display automatically
- Updated team-trigger and team-lead-adapter agents to v2.0
- Updated all team documentation (CLAUDE.md, teams.md, TEAM_MODE.md, architecture.md, fallback-behavior.md)

## v9.1.2 - February 7, 2026

**Theme**: Stop hook JSON validation bugfix.

- Fixed 3 interconnected bugs in stop hook JSON output

## v9.1.1 - February 7, 2026

**Theme**: tmux split pane refinements.

- Refined tmux split pane team parallel execution

## v9.1.0 - February 7, 2026

**Theme**: tmux split panes for team parallel execution.

- Added tmux split pane parallelism for `/team` command
- Each work item runs in its own tmux pane via `claude /run`
- Team leads operate in delegate mode
- 40-60% execution time reduction target

## v9.0.0 - February 7, 2026

**Theme**: Platform Alignment Edition - Major overhaul aligning cAgents with Claude Code's latest platform capabilities.

### Skills Migration (Phase 1)
- Migrated 5 commands from `core/commands/` to `.claude/skills/` format
- Each skill has SKILL.md (~120-300 lines) + `reference/` subdirectory with detailed docs
- `/run`, `/team`, `/review`, `/optimize`: `context: fork`, `agent: true` (isolated execution)
- `/designer`: `context: none`, `agent: false` (interactive AskUserQuestion in main context)
- All skills use `$ARGUMENTS` substitution and `allowedTools` arrays
- Total: 5 SKILL.md files + 25 reference files

### Hooks Overhaul (Phase 2)
- **5 new CJS hooks**: tool-failure-tracker (PostToolUseFailure), subagent-tracker (SubagentStart), teammate-idle-handler (TeammateIdle), permission-handler (PermissionRequest), team-task-complete upgrade (TaskCompleted)
- **2 hook dispatchers**: `scripts/hook-dispatch.sh` and `scripts/hook-dispatch-node.sh` — eliminates verbose bash-in-JSON wrappers in settings.json
- **2 prompt hooks**: SessionStart (cAgents context + auto-proceed policy), Stop (completion verification checklist)
- **3 orphaned hooks registered**: team-start.cjs → SubagentStart, team-stop.cjs → SessionEnd, team-task-complete.cjs → TaskCompleted
- **hook-utils.cjs enhanced**: Added parseTaskList, areDependenciesMet, findAvailableWork utilities
- **14 hook event types** now covered (was 10)

### Settings Enhancement (Phase 3)
- Added `displayOrigin: "cAgents"` for branded output
- Added `trustProjectMdFiles: true` for CLAUDE.md trust
- Added declarative `permissions` block (allow/deny patterns)
- Added `CAGENTS_VERSION: "9.0.0"` environment variable
- Settings restructured with dispatcher pattern (30% smaller)

### Agent Configuration (Phase 4)
- **All 236 agents updated** with batch script (`scripts/update-agent-frontmatter.js`)
- `tools:` converted from comma-separated strings to JSON arrays
- `maxTurns:` added: infrastructure (15-50), controllers (40), execution (30), support (10)
- `permissionMode: "bypassPermissions"` added to infrastructure + controllers (~67 agents)
- `memory: {"project": true}` added to learning agents (controllers, qa-lead, optimizer, architect)
- `disallowedTools: ["Task"]` added to support agents
- Controllers updated from `model: opus` to `model: "opusplan"` (Opus planning + Sonnet execution)

### Manifest Sync (Phase 5)
- All 9 manifests synchronized to version 9.0.0 (was: root 8.7.0, core 8.6.0, domains 8.5.2)
- `"commands"` arrays removed from root and core manifests (skills auto-discovered)
- `"agents"` arrays added to all domain manifests
- Created `scripts/sync-versions.sh` for future version consistency

### Context Management (Phase 6)
- **6 agents converted to progressive disclosure**: creative-director, game-designer, campaign-manager, marketing-strategist, hr-manager, customer-success-manager (10/10 complete)
- **Shared resources created**: `shared/resources/` with common-questions.md, evidence-patterns.md, completion-protocol.md, delegation-templates.md
- **PreCompact hook enhanced**: Now saves controller coordination state (questions completed/remaining, work item status, explicit resume instructions)

### Documentation (Phase 7)
- CLAUDE.md: Commands → Skills section, version 9.0.0, directory structure, quick reference
- hooks.md: 14 event types, 3 hook types, new hooks documented
- skill-format.md: New frontmatter fields (maxTurns, permissionMode, memory, opusplan)
- progressive-disclosure.md: Updated status (10/10 complete)
- model-routing.md: opusplan, effort levels, 1M context, env variable priority
- Release notes: V9.0 entry

### Summary

| Area | Files Created | Files Modified |
|------|--------------|----------------|
| Skills Migration | 30 | 0 |
| Hooks Overhaul | 7 | 4 |
| Settings | 0 | 3 |
| Agent Config | 1 script | ~236 agents |
| Manifests | 1 script | 9 manifests |
| Context | ~18 | 7 |
| Documentation | 0 | 8 |

**Breaking Changes**: Commands array removed from manifests. Skills in `.claude/skills/` replace `core/commands/`. Agent frontmatter format changed (tools string → array).

---

- [v8.0.2](#v802---january-27-2026) - Review Fixes
- [v8.0.1](#v801---january-27-2026) - Validation Pass
- [v8.0.0](#v800---january-27-2026) - Infrastructure & Learning Edition
- [v7.5.1](#v751---january-22-2026) - Documentation & Domain Rules Edition
- [v7.5.0](#v750---january-22-2026) - Task Inventory Edition
- [v7.4.2](#v742---january-21-2026) - CLAUDE.md Optimization
- [v7.4.1](#v741---january-21-2026) - Decomposition Refinement
- [v7.4.0](#v740---january-21-2026) - Aggressive Task Decomposition Edition
- [v7.3.2](#v732---january-20-2026) - Marketplace Update
- [v7.3.1](#v731---january-20-2026) - Game Dev Edition
- [v7.1.0](#v710---january-19-2026) - Super-Domain Consolidation
- [v7.0.4](#v704---january-18-2026) - Consolidation Metrics Update
- [v7.0.3](#v703---january-18-2026) - Super-Domain Architecture
- [v7.0.2](#v702---january-17-2026) - Trigger V2.0 Enhancement
- [v7.0.1](#v701---january-15-2026) - Plugin Cache Fix
- [v7.0.0](#v700---january-13-2026) - Production Baseline

---

## v8.0.2 - January 27, 2026

**Theme**: Review Fixes

### Changes

- Fix version mismatch in package.json (7.5.1 → 8.0.2)
- Sync agent count across CLAUDE.md and package.json (231)
- Update version in CLAUDE.md footer (8.0.0 → 8.0.2)
- Sync all documentation to reflect accurate agent counts

---

## v8.0.1 - January 27, 2026

**Theme**: Validation Pass

### Changes

- Validated all 25 V8.0 improvements with evidence
- Updated all domain plugin.json versions to 8.0.1
- Fixed `eval` security risk in scripts/lib/core.sh (indirect variable expansion)
- Fixed arithmetic increment for `set -e` compatibility in CI scripts
- Corrected SKILL.md agent count in RELEASE_NOTES.md (6 make/ + 2 cross-domain)
- Updated ARCHITECTURE.md version to V8.0.1

---

## v8.0.0 - January 27, 2026

**Theme**: Infrastructure & Learning Edition - 25 Major Improvements

### Overview

V8.0 represents a major infrastructure upgrade with 25 improvements across 3 phases:
- **Phase 1**: Hook system, progressive disclosure, model routing, security review
- **Phase 2**: Session management, metrics, evaluations, CI/CD, skill creator
- **Phase 3**: Project-level routing, internal tools, instinct-based learning

**Design Constraint**: 100% self-contained (no external dependencies)

### Phase 1: Foundation (8 Improvements)

#### 1. Claude Code Hooks System
**Files**: `hooks/hooks.json`, `hooks/*.sh`

Complete hook system with 12 hook types documented and 4 implementations:
- `PreToolUse` - Pre-execution validation
- `PostToolUse` - Post-execution tracking
- `PreSubagentInvoke` - Subagent validation
- `PostSubagentInvoke` - Result tracking

**Hook Features**:
- Timeout enforcement (default 10s, max 30s)
- JSON communication protocol
- Return codes: `approve`, `modify`, `reject`
- Comprehensive documentation

#### 2. Progressive Skill Disclosure (SKILL.md)
**Files**: `make/agents/*/SKILL.md` (6 agents)

Agents converted to modular SKILL.md format with resources/ directories:
- architect (+ resources/adr-template.md, design-patterns.md)
- backend-developer (+ resources/api-patterns.md)
- devops-lead
- frontend-developer
- qa-lead (+ resources/test-strategy.md)
- security-specialist

Additional cross-domain agents:
- grow/agents/marketing-strategist
- operator/people-ops/hr-business-partner

**Structure**:
```
SKILL.md/
├── agent.md          # Core identity (always loaded)
├── core-skills.md    # Essential capabilities
├── advanced-skills.md # On-demand loading
├── examples.md       # Reference examples
└── patterns.md       # Common patterns
```

**Benefits**: 40-60% context reduction for simple tasks

#### 3. 4-Tier Model Routing
**Files**: `cagents-memory/_system/config/model_routing.yaml`

Dynamic model selection based on:
- Task complexity tier (0-4)
- Execution scenario (background, think, longContext, default)
- Agent type (controller, execution, support)
- Cost optimization targets

**Model Matrix**:
| Tier | Default | Think | Background |
|------|---------|-------|------------|
| 0-1 | Haiku | Sonnet | Haiku |
| 2 | Sonnet | Opus | Haiku |
| 3 | Sonnet | Opus | Haiku |
| 4 | Opus | Opus | Sonnet |

**Expected Savings**: 30-50% cost reduction

#### 4. Comprehensive Security Review
**Files**: `cagents-memory/_system/config/secret_detection.yaml`

20+ secret detection patterns:
- API keys (AWS, GCP, Azure, Stripe, etc.)
- Tokens (JWT, OAuth, GitHub, etc.)
- Credentials (passwords, private keys)
- Connection strings (database, redis, etc.)

**Detection Features**:
- High confidence scoring (0.95+)
- Path-based exclusions (.env.example, tests/)
- Action recommendations per pattern

### Phase 2: Operations (15 Improvements)

#### 5-7. Session Management System
**Files**: `cagents-memory/_system/config/session_management.yaml`, `scripts/session/*.sh`

- **Waypoint System**: Named checkpoints for workflow recovery
- **Recovery Protocol**: 4-level recovery (checkpoint, phase, session, manual)
- **Three-File Pattern**: status.yaml, plan.yaml, coordination_log.yaml

#### 8-10. Metrics Infrastructure
**Files**: `cagents-memory/_system/config/metrics_config.yaml`, `cagents-memory/_system/metrics/`

- **Config**: Metric definitions, collection rules
- **Session Tracking**: Per-session metrics collection
- **Daily Aggregation**: Automated daily rollups

**Metrics Tracked**:
- Workflow metrics (duration, success rate, tier distribution)
- Agent metrics (invocations, response time, delegation rate)
- Cost metrics (tokens, USD by model)
- Quality metrics (validation scores, rework rate)

#### 11-13. Evaluation Framework
**Files**: `cagents-memory/_system/evals/`

- **Quality Evaluations**: Output quality scoring
- **Completeness Evaluations**: Task completion verification
- **Coordination Evaluations**: Controller effectiveness

**Eval Categories**:
- Decomposition quality
- Question effectiveness
- Synthesis quality
- Evidence completeness

#### 14-16. CI/CD Scripts
**Files**: `scripts/ci/*.sh`

- `cagents-ci.sh` - Main CI entry point
- `run-evals.sh` - Evaluation runner
- `check-quality.sh` - Quality gate checker

**Features**:
- Exit codes for CI integration
- JSON output option
- Configurable thresholds
- GitHub Actions compatible

#### 17-18. Skill Creator Scripts
**Files**: `scripts/skills/*.js`

- `init_agent.js` - Initialize new SKILL.md agent
- `validate_agent.js` - Validate SKILL.md structure

**No external dependencies** (uses built-in Node.js only)

#### 19. Subagent Alignment Documentation
**Files**: `.claude/rules/core/subagent-alignment.md`

Best practices for subagent coordination:
- Context passing patterns
- Response format standards
- Error handling guidelines
- Delegation anti-patterns

### Phase 3: Polish (6 Improvements)

#### 20. Project-Level Model Routing
**Files**: Updated `model_routing.yaml`, `.claude/rules/infrastructure/model-routing.md`

Projects can override default routing via `.cagents/model_routing.yaml`:

```yaml
# .cagents/model_routing.yaml
default_model: sonnet
tier_models:
  tier_4: sonnet  # Force Sonnet even for tier 4
cost_limits:
  max_cost_per_session: 5.00
disable_opus: true  # Strict cost control
```

**Override Options**:
- default_model
- tier_models
- scenario_models
- agent_models
- cost_limits
- disable_opus / disable_haiku

#### 21-23. Internal Tool Registry
**Files**: `cagents-memory/_system/tools/registry.js`, `file-tools.js`, `yaml-tools.js`

Fast internal operations without spawning external processes:

**File Tools**:
- `file:read`, `file:write`, `file:exists`
- `dir:list`, `dir:create`
- `path:resolve`, `path:join`

**YAML Tools** (simple parser, no dependencies):
- `yaml:parse`, `yaml:stringify`
- `yaml:read`, `yaml:write`
- `yaml:get`, `yaml:set` (by key path)

**Benefit**: 30-40% faster internal operations

#### 24-25. Instinct-Based Pattern Learning
**Files**: `cagents-memory/_knowledge/patterns/*.yaml`, `cagents-memory/_knowledge/learning/`

Pattern extraction from successful workflows:

**Pattern Files**:
- `decomposition-patterns.yaml` - Work breakdown patterns by domain
- `coordination-patterns.yaml` - Question and delegation patterns
- `success-patterns.yaml` - Success factors and failure anti-patterns

**Learning Pipeline**:
1. Extraction - Extract metrics from completed workflows
2. Analysis - Group and analyze patterns
3. Validation - Statistical significance testing
4. Integration - Update pattern files

**Pattern Categories**:
- Engineering (bug fix, feature, refactoring)
- Creative (content, design)
- Marketing (campaign)
- Operations (process improvement)

### Summary: 25 Improvements

| Phase | Category | Count | Key Files |
|-------|----------|-------|-----------|
| 1 | Hook System | 1 | `hooks/hooks.json`, `hooks/*.sh` |
| 1 | Progressive Disclosure | 1 | `make/agents/SKILL.md/` (9 agents) |
| 1 | Model Routing | 1 | `model_routing.yaml` |
| 1 | Security Review | 1 | `secret_detection.yaml` |
| 2 | Session Management | 3 | `session_management.yaml`, `scripts/session/` |
| 2 | Metrics | 3 | `metrics_config.yaml`, `metrics/` |
| 2 | Evaluations | 3 | `evals/` |
| 2 | CI/CD | 3 | `scripts/ci/` |
| 2 | Skill Creator | 2 | `scripts/skills/` |
| 2 | Documentation | 1 | `subagent-alignment.md` |
| 3 | Project Routing | 1 | `model_routing.yaml` v2.0 |
| 3 | Internal Tools | 3 | `tools/registry.js`, `file-tools.js`, `yaml-tools.js` |
| 3 | Pattern Learning | 2 | `patterns/`, `learning/` |
| **Total** | | **25** | |

### Migration from V7.5

V8.0 is backwards compatible with V7.5 workflows. New features are opt-in:

1. **Hooks**: Automatically loaded from `hooks/hooks.json` if present
2. **SKILL.md**: Coexists with traditional agent files
3. **Model Routing**: Defaults work without configuration
4. **Project Overrides**: Only if `.cagents/model_routing.yaml` exists
5. **Pattern Learning**: Passive collection, no workflow changes needed

### Breaking Changes

None. V8.0 is fully backwards compatible.

### Performance Impact

| Metric | V7.5 | V8.0 | Change |
|--------|------|------|--------|
| Context (simple tasks) | 100% | 40-60% | -40-60% (SKILL.md) |
| Model costs | 100% | 50-70% | -30-50% (routing) |
| Internal operations | 100% | 60-70% | -30-40% (tools) |
| Pattern reuse | Manual | Automatic | Learning system |

### Files Added

```
hooks/
├── hooks.json
├── pre-tool-use.sh
├── post-tool-use.sh
├── pre-subagent.sh
└── post-subagent.sh

cagents-memory/_system/
├── config/
│   ├── model_routing.yaml (updated v2.0)
│   ├── secret_detection.yaml
│   ├── session_management.yaml
│   └── metrics_config.yaml
├── tools/
│   ├── registry.js
│   ├── file-tools.js
│   └── yaml-tools.js
├── metrics/
│   └── ...
└── evals/
    └── ...

cagents-memory/_knowledge/
├── patterns/
│   ├── decomposition-patterns.yaml
│   ├── coordination-patterns.yaml
│   └── success-patterns.yaml
└── learning/
    └── config.yaml

scripts/
├── ci/
│   ├── cagents-ci.sh
│   ├── run-evals.sh
│   └── check-quality.sh
├── knowledge/
│   └── pattern-extractor.cjs    # moved from cagents-memory/_knowledge/learning/ (now version-controlled)
├── session/
│   └── ...
└── skills/
    ├── init_agent.js
    └── validate_agent.js

make/agents/SKILL.md/
├── backend-developer/
├── frontend-developer/
├── devops-lead/
├── architect/
├── qa-lead/
├── security-specialist/
├── technical-writer/
├── dba/
└── ml-engineer/

.claude/rules/
├── core/
│   └── subagent-alignment.md
└── infrastructure/
    └── model-routing.md
```

### Git Tag

v8.0.0

---

## v7.5.1 - January 22, 2026

**Theme**: Documentation & Domain Rules Edition

**Changes**:
- Archive legacy V7.3.0 documentation (65% docs folder reduction: 744KB to 260KB)
- Add domain-specific rules for grow, operate, people, serve super-domains
- Add shared-questions.md documenting universal controller question patterns
- Consolidate duplicate agent templates
- Archive versioned subdirectories (designer-v2, optimizer-v7, trigger-v2, reviewer-v3)

**Impact**:
- 100% domain rules coverage (was 20%)
- Cleaner docs/ structure with archived legacy content
- Standardized controller question patterns documented

**Files Changed**: 33 files archived, 5 domain rule files added

**Git Tag**: v7.5.1

---

## v7.5.0 - January 22, 2026

**Theme**: Task Inventory Edition - CSV-based workflow management

**Major Features**:
- **task-state agent**: CSV-based external state management for large workflows
- **Batch delegation**: Assign 25 tasks per operation (vs 1 task per operation)
- **Checkpoint/resume**: Full pause/resume capability at any workflow point
- **Progress queries**: 500-token summaries instead of 10K+ task loads
- **Context savings**: 60-80% reduction for workflows with 20+ tasks

**Enhancements**:
- Orchestrator V6.1: Inventory integration, batch coordination
- Core agents: 11 to 12 (task-state added)
- Total agents: 230 to 231

**Inventory Features**:
- `tasks.csv`: Full task state with dependencies
- `batch_log.csv`: Operation history and token savings tracking
- `assignments.csv`: Agent workload tracking
- Checkpoints: Auto-save every 30 minutes

**Use Case**: Enables workflows with 100+ tasks without context overflow

**Git Tag**: v7.5.0
**Commit**: 5f0284d

---

## v7.4.2 - January 21, 2026

**Theme**: CLAUDE.md Optimization

**Changes**:
- Optimize CLAUDE.md structure and content
- Improve readability and organization
- Update references to match V7.4 patterns

**Impact**: Better developer experience with cleaner documentation

**Git Tag**: v7.4.2
**Commit**: b89fde5

---

## v7.4.1 - January 21, 2026

**Theme**: Decomposition Refinement

**Changes**:
- Refinements to task decomposition patterns
- Minor bug fixes in decomposition edge cases
- Documentation updates

**Git Tag**: v7.4.1
**Commit**: d240e98

---

## v7.4.0 - January 21, 2026

**Theme**: Aggressive Task Decomposition Edition

**Major Changes**:
- **Command Rename**: `/trigger` to `/run`, `/designer` to `/explore`, `/reviewer` to `/review`
- **task-decomposer agent**: Comprehensive work breakdown from abstract requests
- **Universal-planner V6.0**: 5-level decomposition framework
- **Orchestrator V6.0**: Decomposition-aware coordination
- **Standardized memory paths**: `sessions/{command}_{timestamp}/`

**Decomposition Philosophy**: Users state outcomes, system extrapolates ALL requirements

**5-Level Decomposition Framework**:
1. Request Analysis (type, action, subject extraction)
2. Component Extraction (understand, design, build, verify, document)
3. Implicit Discovery (security, testing, docs user didn't mention)
4. Dependency Mapping (critical path, parallel opportunities)
5. Work Item Generation (with acceptance criteria)

**Example**: User says "add auth" -> System generates 30+ work items with full requirements

**Agent Count**: 229 to 230 (task-decomposer added)
**Core Infrastructure**: 10 to 11 agents

**Breaking Changes**:
- Commands renamed (aliases available for 30 days)
- Memory folder structure changed to standardized pattern

**Git Tag**: v7.4.0
**Commit**: e9ca653

---

## v7.3.2 - January 20, 2026

**Theme**: Marketplace Update

**Changes**:
- Update marketplace.json to v7.3.2
- Sync all plugin manifests
- Documentation consistency updates

**Git Tag**: v7.3.2
**Commit**: 3c00f2e

---

## v7.3.1 - January 20, 2026

**Theme**: Game Dev Edition

**Major Features**:
- **28 new game development agents** added to Make domain
- **Game engines supported**: Unity, Unreal Engine, Godot
- **Specializations**: Design, programming, art, audio, production, narrative, QA, monetization

**New Agents**:
- **Core Development** (8): game-designer, level-designer, game-programmer, engine-developer, graphics-programmer, ai-programmer, network-programmer, tools-programmer
- **Art & Animation** (6): concept-artist, 3d-modeler, texture-artist, animator, vfx-artist, ui-artist
- **Audio** (3): sound-designer, music-composer, audio-programmer
- **Design & Writing** (4): narrative-game-designer, quest-designer, economy-designer, game-writer
- **Production & QA** (4): game-producer, technical-artist, qa-tester-games, localization-lead
- **Specialized** (3): monetization-designer, live-ops-specialist, accessibility-game-designer

**Agent Count**: 201 to 229

**Impact**: Full game development pipeline support from concept to live operations

**Git Tag**: v7.3.1
**Commit**: 26b1111

---

## v7.1.0 - January 19, 2026

**Theme**: Super-Domain Consolidation

**Major Changes**:
- **64% agent reduction**: 560 legacy agents to 201 production agents
- **70% directory reduction**: 22 directories to 7 directories
- Remove legacy business/ and creative/ domains
- Consolidate to 5 super-domains: Make, Grow, Operate, People, Serve
- Update all plugin manifests to V7.1.0

**Optimization Enhancements**:
- Add caching to validate_agent_configs.py (20-40% faster repeated runs)
- Add parallel processing to lint_agent_docs.py (40-60% faster linting)
- Create post_release_cleanup.py automation script
- Archive V7.0.3 migration scripts (14 files)

**Documentation**:
- Clean root directory (3 markdown files: CLAUDE.md, README.md, WORKFLOW_AGENT_INTERACTIONS.md)
- Archive release documentation to archive/
- Update architecture documentation

**Final State**: 201 production agents, clean architecture, ready for Game Dev Edition

**Git Tag**: v7.1.0
**Commit**: 797dfc9

---

## v7.0.4 - January 18, 2026

**Theme**: Consolidation Metrics Update

**Changes**:
- Update package.json with V7.0.3 consolidation metrics
- Documentation updates for super-domain architecture
- Performance metrics validation

**Git Tag**: v7.0.4
**Commit**: 5a7e4dd

---

## v7.0.3 - January 18, 2026

**Theme**: Super-Domain Architecture & Ralph Loop Integration

**Major Changes**:
- **5 super-domains**: Make, Grow, Operate, People, Serve (consolidation from 22 directories)
- **Ralph Loop-inspired infrastructure modernization**:
  - Bash script library for file operations
  - Lifecycle hooks (before/after phases)
  - Atomic file operations
  - Markdown frontmatter state management

**Features Added**:
- Script library in `scripts/lib/`
- Hook system for workflow phases
- State management via frontmatter
- Atomic update patterns

**Impact**: 70% reduction in directory complexity, improved infrastructure reliability

**Git Tag**: v7.0.3
**Commits**: 142b4ea, 8e1c6b9, 2072226

---

## v7.0.2 - January 17, 2026

**Theme**: Trigger V2.0 Enhancement

**Features**:
- **Context-aware domain detection** (keyword + project + git + framework)
- **Confidence scoring** on all detection (0.0-1.0 scores, thresholds)
- **Intent classification** (bug fix, feature, question, etc.)
- **Workflow templates** with pattern matching
- **Pre-flight validation** (4 levels: context, feasibility, resources, conflicts)
- **Interactive mode** with user preference gathering
- **Dry-run mode** for previewing workflow
- **Historical learning** from past workflows

**Enhancement Impact**: 30-50% faster workflow initialization, 92%+ domain detection accuracy

**Git Tag**: v7.0.2
**Commit**: 37e23ca

---

## v7.0.1 - January 15, 2026

**Theme**: Plugin Cache Fix

**Changes**:
- Force plugin cache refresh
- Fix agent discovery issues
- Minor manifest updates

**Git Tag**: v7.0.1
**Commit**: af08035

---

## v7.0.0 - January 13, 2026

**Theme**: Production Baseline

**Major Features**:
- **70% faster** workflow execution (11.2s to 3.4s)
- **17% fewer agents** (229 to 193) through intelligent consolidation
- **96% domain coverage** (practically universal)
- **Zero critical security issues** (production-hardened)
- **Production-ready quality** (83% test coverage, 96% documentation)

See full V7.0.0 release notes in archive/docs/ for complete details.

**Git Tag**: v7.0.0
**Commit**: (initial production release)

---

## Current State (v9.22.0)

**Total Agents**: 238
- Core Infrastructure: 14 (trigger, team-trigger, team-lead-adapter, orchestrator, hitl, optimizer, router, planner, executor, validator, self-correct, task-merger, task-decomposer, task-state)
- Shared: 14 (cross-domain capabilities)
- Make: 111 (engineering + creative + product + game development)
- Grow: 38 (marketing + sales)
- Operate: 13 (finance + operations)
- People: 20 (HR + talent)
- Serve: 28 (customer experience + legal + compliance)

**Architecture**: Inline 2-level delegation with Controller-Centric Question-Based Delegation:
- /run runs inline (context: none), delegates to controller -> execution agents
- /team teammates spawn controllers directly (no Skill fork nesting)
- PostToolUse validation hook for JSON/YAML syntax checking
- Enhanced audit trail with completion summaries and duration tracking
- TodoWrite blocking prerequisite enforcement for user-visible progress
- CJS-only hook system (15 hooks via createHook() factory)
- CSV Task Inventory (60-80% context savings)
- Agent Teams for parallel execution (40-60% time reduction)
- Claude 4.6 model routing (Opus 4.6, Sonnet 4.6, Haiku 4.5)

**Key V9.22 Features**:
- /run context: none (inline execution, eliminates fork nesting level)
- /team teammates spawn controllers directly via Agent tool
- PostToolUse[Write|Edit] validation hook (post-write-validator.cjs)
- SubagentStop captures completion_summary and duration_seconds
- File change audit trail (workflow/file_changes.log)
- Team lead assigns controllers during work item decomposition

**Performance**:
- 2-level delegation chain eliminates context exhaustion at deep nesting
- 60-80% context savings for large workflows (CSV task inventory)
- 40-60% execution time reduction (Agent Teams parallel execution)
- 30-40% simpler planning (objectives vs detailed tasks)
- Up to 50x speedup with parallel execution (swarm mode)

---

## Getting Started

### Installation

**Git Clone** (Recommended):
```bash
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents
```

### Your First Workflow

```bash
# Simple task
/run "Fix the authentication bug in src/auth.ts"

# Complex task
/run "Build a complete e-commerce app with Stripe payment integration"

# Multi-domain task
/run "Create Q4 marketing campaign and financial forecast"

# Design session
/designer "Design a real-time multiplayer game architecture"

# Code review
/review src/
```

### Verify Installation

```bash
# Check version (should show 9.20.0+)
cat .claude-plugin/plugin.json | grep version
```

---

## Documentation

**Core Documentation**:
- **Quick Start**: `README.md`
- **Complete Reference**: `CLAUDE.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Commands**: `docs/COMMANDS.md`
- **Release Notes**: `docs/RELEASE_NOTES.md` (this file)

**V9.22 Specific**:
- **Model Routing**: `.claude/rules/infrastructure/model-routing.md`
- **Hooks**: `.claude/hooks/*.cjs` (15 CJS hooks via createHook() factory)
- **Rules**: `.claude/rules/` (20 modular rule files)
- **Skills**: `.claude/skills/` (6 skills: run, team, designer, review, optimize, helper)

---

## Support

**GitHub Repository**: https://github.com/CaelanDrayer/cAgents

**Reporting Issues**:
1. Check existing issues
2. If new, create an issue with:
   - cAgents version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior

---

## License

cAgents is released under the MIT License.

Copyright (c) 2025-2026 CaelanDrayer

---

**Current Version**: 12.66.0
**Release Date**: July 14, 2026
**Git Tag**: v12.42.0
