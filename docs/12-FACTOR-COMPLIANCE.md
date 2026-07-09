# cAgents — 12-Factor Agents Compliance Map

**Purpose**: This doc maps cAgents against the [12-Factor Agents methodology](https://github.com/humanlayer/12-factor-agents) by humanlayer, an industry-emerging design framework for LLM-powered software (modeled on the [12factor.net](https://12factor.net) app methodology). The mapping helps external reviewers and prospective adopters evaluate cAgents against a well-known standard, and documents where cAgents deliberately diverges.

**Scope**: cAgents v12.0.7+. Earlier versions may differ on partial-compliance items.

**Attribution**: Factor titles paraphrased from `humanlayer/12-factor-agents` (Apache-2.0 code + CC-BY-SA-4.0 content). No upstream prose is reproduced verbatim beyond factor titles.

**Source mapping basis**: `cagents-memory/sessions/team_external-samples-update_260520_003/outputs/wi-4/new-repos-characterization.md` (cAgents architect, 2026-05-20).

---

## Summary

| Factor | cAgents Status | One-Line Position |
|--------|----------------|-------------------|
| 1. Natural Language to Tool Calls | YES | `core/orchestrator` parses NL requests; `router` routes to skills + agents |
| 2. Own Your Prompts | YES | Planner assembles delegation prompts internally (task-decomposer + prompt-engineer were folded into the planner in v12.0.0); SKILL.md bodies own all controller/executor prompts |
| 3. Own Your Context Window | PARTIAL | Three-Tier Progressive Disclosure for SKILL.md + `PreCompact`/`PostCompact` hooks; no fine-grained per-tool token budget |
| 4. Tools Are Structured Outputs | PARTIAL | Agents emit YAML artifacts (`coordination_log.yaml`, `validation_report.yaml`); per-tool typed-output schemas are not enforced |
| 5. Unify Execution State and Business State | DIVERGENCE | cAgents intentionally separates execution-state (`status.yaml`, 5-state machine) from business-state (`work_items.yaml`, `coordination_log.yaml`) |
| 6. Launch/Pause/Resume with Simple APIs | YES | Waypoints + `/resume` + `PreCompact` save / `PostCompact` restore hooks |
| 7. Contact Humans with Tool Calls | PARTIAL | HITL gates via `core/hitl` + `approval-gate.cjs` hook; no out-of-band Slack/email/SMS channels |
| 8. Own Your Control Flow | YES | `pipeline_config.yaml`-driven state machine; revision routing (FAIL/REVISE) is hand-coded, not LLM-decided |
| 9. Compact Errors into Context Window | PARTIAL | `tool-failure-tracker.cjs` records failures but does not yet summarize for re-injection on retry |
| 10. Small, Focused Agents | YES | 58 agents across 9 archetypes (post-v12.20.0 catalog consolidation from 141; 42 routable + 16 core); per-agent SKILL.md scope guarded by `skill-size-monitor.cjs` |
| 11. Trigger from Anywhere | PARTIAL | Triggers from `/run`, `/team`, `/designer`, `/helper` (4 in-terminal skills; `/improve` folded into `/run` in v12.1.2, `/org` folded into `/team` strategic mode in v12.2.0); no webhook/cron/email/Slack triggers |
| 12. Make Your Agent a Stateless Reducer | DIVERGENCE | Controllers carry state across reviewer-loop rounds; session state lives in `cagents-memory/sessions/{id}/` files by design |

**Score**: 6 YES · 4 PARTIAL · 2 deliberate DIVERGENCE.

---

## Per-Factor Detail

### Factor 1: Natural Language to Tool Calls — YES

cAgents accepts natural-language requests at every skill entry point (`/run "fix the auth bug"`) and converts them into structured tool calls (Agent spawns, Bash, Write, Edit). The pipeline does this in two stages — `core/orchestrator` produces `enriched_context.yaml`, then `core/router` selects domain + tier + controller.

**cAgents implementation**: `core/orchestrator/SKILL.md`, `core/router/SKILL.md`, `.claude/skills/run/SKILL.md`.

### Factor 2: Own Your Prompts — YES

Every prompt that goes to an LLM is checked into the repo. Controller prompts live in `{archetype}/{branch?}/{agent}/SKILL.md`; delegation prompts are assembled by the planner (which absorbed the standalone `prompt-engineer` agent in v12.0.0) or fall back to controller-side templates. No prompts come from a hosted service.

**cAgents implementation**: 57 SKILL.md files (post-v12.20.0 catalog consolidation from 141); controller prompt-assembly logic in `.claude/rules/core/controllers.md`; planner's prompt-assembly sub-responsibility at `core/planner/SKILL.md`.

### Factor 3: Own Your Context Window — PARTIAL

cAgents controls SKILL.md loading via Three-Tier Progressive Disclosure (frontmatter always loaded, body on activation, `@resources/*.md` on demand) and saves/restores state across compaction via `PreCompact` / `PostCompact` hooks. What's missing: per-tool token budgeting, runtime context-window introspection, and explicit budget caps per agent spawn.

**cAgents implementation**: `.claude/rules/core/skill-format.md` (progressive disclosure); `.claude/hooks/pre-compact-save.cjs` + `post-compact-restore.cjs`.

### Factor 4: Tools Are Structured Outputs — PARTIAL

Coordination and validation outputs are YAML with a documented schema (`coordination_log.yaml` carries `schema_version: "1"`; `validation_report.yaml` emits PASS/FAIL/REVISE). Tool outputs themselves (Bash stdout, Read results) flow as raw strings — there is no enforcement of typed-output schemas on a per-tool basis.

**cAgents implementation**: `.claude/skills/run/reference/session-schema.md`; `core/validator/SKILL.md`.

### Factor 5: Unify Execution State and Business State — DELIBERATE DIVERGENCE

cAgents intentionally **separates** the two:

- **Execution state**: `cagents-memory/sessions/{id}/status.yaml`, driven by a 5-state machine (`INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED`). Owned by `/run` and pipeline hooks.
- **Business state**: `workflow/work_items.yaml`, `coordination_log.yaml`, agent-emitted artifacts. Owned by controllers and execution agents.

**Why we diverge**: (1) Execution-state churn (re-routes, REVISE cycles, max-5 revision budget) shouldn't pollute the audit trail of business decisions; (2) `validator` reasons about execution states without parsing business-state schemas; (3) pipeline introspection (`/run --analytics`) operates on execution state alone.

**What we lose**: A single "where am I, what am I doing" view requires reading both `status.yaml` and the workflow artifacts. Reproducing a session from a single state blob is not possible — you need both. Tradeoff accepted; the separation has paid for itself in pipeline observability.

### Factor 6: Launch/Pause/Resume with Simple APIs — YES

`/run` is the launch API. Pause happens implicitly at context compaction (state captured to `waypoints/`) and explicitly at HITL gates. Resume happens via Claude Code's `/resume` plus cAgents' `session-catchup.cjs` `SessionStart` hook, which detects incomplete sessions and offers continuation.

**cAgents implementation**: `.claude/hooks/session-catchup.cjs`, `.claude/hooks/pre-compact-save.cjs`, waypoint protocol in `.claude/rules/memory/agent-memory.md`.

### Factor 7: Contact Humans with Tool Calls — PARTIAL

cAgents has a dedicated `core/hitl` agent and an `approval-gate.cjs` `PreToolUse` hook that surfaces structured approval prompts before sensitive operations. Tier-4 workflows route to HITL by design. What's missing: out-of-band channels (Slack, email, SMS) — humans must be at the Claude Code terminal to respond.

**cAgents implementation**: `core/hitl/SKILL.md`, `.claude/hooks/approval-gate.cjs`, `.claude/hooks/bash-validator.cjs` (Tier-2 HITL prompts).

### Factor 8: Own Your Control Flow — YES

The `/run` state machine is config-driven, not LLM-driven. `cagents-memory/_system/config/pipeline_config.yaml` defines the state transitions; revision routing (FAIL→re-controller, REVISE→re-plan, max 5 cycles) is enforced in code, not asked of the model. The LLM picks *what* to do inside a state; cAgents decides *when* to transition.

**cAgents implementation**: `cagents-memory/_system/config/pipeline_config.yaml`, `.claude/skills/run/reference/state-machine.md`.

### Factor 9: Compact Errors into Context Window — PARTIAL

`tool-failure-tracker.cjs` records every `PostToolUseFailure` event to `workflow/tool_failures.yaml` and detects patterns (3+ failures suggests alternatives via systemMessage). What's missing: compaction. The tracker logs raw failures but does not yet summarize them for re-injection on the next agent retry. This remains an open improvement vector — track its eventual resolution via `CHANGELOG.md` entries referencing `tool-failure-tracker`.

**cAgents implementation**: `.claude/hooks/tool-failure-tracker.cjs`.

### Factor 10: Small, Focused Agents — YES (arguably over-shot)

58 agents across 9 archetypes — 42 routable + 16 core — each with a single SKILL.md scoped to one role. This is the post-v12.20.0 catalog consolidation from 141: the 84 absorbed agents were collapsed into mode flags rather than separate SKILL.md files, and 0 `_deprecated/` SKILL.md remain on disk. The `skill-size-monitor.cjs` `PreToolUse` hook warns at 600 lines and blocks at 900 to prevent SKILL.md bloat. The catalog may be over-fragmented for some domains — a future consolidation pass remains on the roadmap (see `CHANGELOG.md` for the v12.0.0/v12.7.0 consolidation pattern, which the next pass would extend) — but the "small, focused" principle is honored.

**cAgents implementation**: All 57 SKILL.md files; `.claude/hooks/skill-size-monitor.cjs`.

### Factor 11: Trigger from Anywhere — PARTIAL

cAgents triggers from four in-terminal skills (`/run`, `/team`, `/designer`, `/helper`) plus Claude Code's native `/memory` and `/init`. (`/improve` was folded into `/run` via the first-word keyword router in v12.1.2; `/org` was removed in v12.2.0 and absorbed into `/team` strategic mode.) Team initialization happens inline inside `/team` (the standalone `team-trigger` agent was removed in v12.0.0) but isn't a user-facing trigger. What's missing: webhook, cron, email, Slack, SMS, GitHub-issue, or PR-comment triggers. cAgents is a Claude Code plugin first; outer-loop triggers are a Phase-2 concern.

**cAgents implementation**: `.claude/skills/{run,team,designer,helper}/SKILL.md`.

### Factor 12: Make Your Agent a Stateless Reducer — DELIBERATE DIVERGENCE

cAgents agents are **not** stateless. Controllers carry context across reviewer-loop rounds (max 3 internal rounds + max 3 revision cycles, V12). Session state lives in `cagents-memory/sessions/{id}/` files — `workflow/`, `team/`, `outputs/`, `waypoints/` — and is mutated across phases.

**Why we diverge**: A pure-stateless reducer would force re-priming the controller's context on each reviewer round (re-loading work_items.yaml, re-reading the original plan, re-discovering prior decisions). For cAgents' use case — semi-interactive multi-agent coordination — that re-priming would burn tokens without changing outcomes. File-based memory is also what enables `Launch/Pause/Resume` (Factor 6); the two factors trade off against each other.

**What we lose**: Strict reproducibility. Re-running a workflow with the same input may not deterministically replay (LLM nondeterminism + accumulated controller state + session-scoped file mutations). For our domain, coordination quality outweighs deterministic replay; for safety-critical or formally-verified domains, a fork would want to invert this tradeoff.

---

## How to use this doc

- **Evaluating cAgents?** Read the Summary table for the snapshot; drill into specific factors that matter for your use case. The two DIVERGENCE rows are where cAgents most differs from the framework — check whether the tradeoff suits your needs.
- **Considering forking cAgents?** The DIVERGENCE factors (5 and 12) are the architectural points where your fork might choose to align differently. Be aware of what each one costs.
- **Contributing to cAgents?** New features should respect existing YES alignments and move PARTIAL items toward YES where feasible. New DIVERGENCE positions require an architect-tier discussion and a documented entry here.
- **Open improvement vectors**: PARTIAL items for Factors 3, 4, 7, 9, 11 are tracked via per-bump `CHANGELOG.md` entries and `docs/RELEASE_NOTES.md`. Contributions welcome.

## See also

- `CLAUDE.md` — canonical project architecture
- `docs/ARCHITECTURE.md` — subsystem deep dives
- `AGENTS.md` — multi-tool routing surface
- `docs/LIFECYCLE.md` — orthogonal lifecycle-axis view of the agent catalog
- Upstream: [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents)
