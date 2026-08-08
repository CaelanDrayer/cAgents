---
paths:
  - ".claude/rules/playbooks/pat-graceful-degradation-depth1.md"
  - ".claude/rules/core/execution.md"
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/core/teams.md"
  - ".claude/rules/core/delegation.md"
  - "agents/**"
  - ".claude/skills/act/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/verify-completion.cjs"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/outputs/**"
  - "tests/v12/deep-nesting-enablement.test.js"
  - "tests/hooks/verify-completion-graceful-degradation.test.js"
name: pat-graceful-degradation-depth1
description: "Pattern: Nesting-Ceiling Degradation — a defensive fallback for when the Agent (and TodoWrite/TaskUpdate) tools are genuinely absent, i.e. at the actual nesting ceiling (a subagent at depth 5 cannot spawn depth 6) or if a harness regresses. REPOSITIONED in v12.17.0: deep subagent nesting is now the default on Claude Code 2.1.172+, so this is no longer the expected depth-1 behavior."
license: MIT
compatibility: "Claude Code 2.1.172+, cAgents 12.17.0+"
metadata:
  version: "2.0.0"
  author: cagents
  audience: "controllers, execution agents, reviewers"
  applies_to:
    - cagents:tech-lead
    - cagents:architect
    - cagents:team-lead
    - all-controllers
    - all-execution-agents
---

# Pattern: Nesting-Ceiling Degradation (fallback for absent Agent tool)

> ## Status: REPOSITIONED in v12.17.0
>
> As of **Claude Code 2.1.172**, subagents **can spawn their own subagents up
> to 5 levels deep**. This was empirically verified on **Claude Code 2.1.173**
> in session `run_deep-nesting-enablement_260611_001`: a spawn chain ran
> depth 1 → 2 → 3 → 4 → 5 → 6 with the `Agent` tool present at every level and
> **zero stripping**. The "Agent tool stripped at depth ≥ 1" behavior that this
> playbook originally addressed is **NO LONGER the default**.
>
> This pattern is therefore **repositioned from "the expected depth-1 behavior"
> to a defensive FALLBACK**. It now applies only when the `Agent` tool is
> *genuinely* absent — at the actual nesting **ceiling** (a subagent at depth 5
> cannot spawn a depth-6 child), or if a future/older harness regresses the
> capability. The load-bearing fallback guidance below (tool-inventory check,
> TaskUpdate substitution, no-reviewer-call rule, the coordination_log sentinel
> sentence, and the self-validation YAML path) is **retained intact** because it
> is still correct for that fallback case.
>
> **Default expectation on CC 2.1.172+**: agents at depth 1–4 retain the
> `Agent` tool and spawn subagents normally. Do NOT pre-emptively degrade.
> Degrade only after a verified tool-inventory check shows `Agent` is absent.

**Applies as a fallback to: any cAgents controller or execution agent that,
after a tool-inventory check, finds the `Agent` tool genuinely absent —
regardless of which skill spawned it (`/act`, `/team`, or legacy `/org`).**

## When this fallback fires

The `Agent` tool is genuinely absent (and this pattern applies) in two cases:

1. **Nesting ceiling reached.** A subagent at depth 5 cannot spawn a depth-6
   child — the 5-level budget (`max_nesting_depth: 5`, counting the skill loop
   as depth 0) is exhausted. The harness does not expose a spawning tool past
   the ceiling.
2. **Harness regression / older harness.** A future Claude Code version, or an
   environment older than 2.1.172, may not support deep nesting and may withhold
   the `Agent` tool from subagents. If you find yourself on such a harness, this
   fallback restores correct behavior.

In both cases the agent verifies the absence via a tool-inventory check (below)
before degrading. On CC 2.1.172+ at depths 1–4 the tool is present and you must
NOT degrade.

## Root cause (historical)

> **Historical — pre-2.1.172.** Before Claude Code 2.1.172, the platform
> enforced a 2-level subagent nesting limit (depth 0 = skill loop, depth 1 =
> spawned agent, no further nesting) by withholding the spawning tool (`Agent`)
> from depth-1 agents, regardless of what the SKILL.md `allowed-tools` declared.
> Historically the `Agent` tool was stripped at depth ≥ 1 as the default
> behavior, and the `TodoWrite` / `TaskUpdate` tools were frequently absent at
> that nesting level too. cAgents config (`.claude/settings.json`,
> `.claude-plugin/plugin.json`) could not override it — there was no documented
> CC setting that re-exposed `Agent` to depth-1 subagents.
>
> **This is no longer the case.** Claude Code 2.1.172 added deep subagent
> nesting; on 2.1.173 (this environment) the `Agent` tool is present at every
> level of a depth 1 → 6 chain. The historical limitation now survives only as
> the ceiling/regression fallback described above.

## What was historically stripped (for reference)

> **Historical framing.** Before v12.17.0, the depth-1 stripping was documented
> as applying uniformly across all spawning skills and all agent types:
>
> - **All spawning skills**: `/act` (controllers at depth-1), `/team` (subagents
>   at depth-1 [historically labeled "teammates"], including C-suite agents in
>   Wave 0/1 of strategic mode). The
>   v12.1.0 spike (session `run_improve-team-context_260521_001`) reproduced the
>   stripping under `/act` — a controller spawned by `/act` at depth-1 received
>   "Agent is not available inside subagents." on attempting
>   `Agent(subagent_type: "general-purpose")`. Pre-v12.2.0 the same stripping
>   affected the now-removed `/org` skill.
> - **All agent types**: plugin-namespaced `cagents:*` subagents AND built-in
>   agent types (`general-purpose`, `Explore`, `Plan`). The audit
>   (`team_doc-update-plugin-audit_260503_001`) and the v12.1.0 spike both
>   confirmed the limitation was type-agnostic.
>
> These records are pre-2.1.172 history. They no longer describe current default
> behavior — see the v12.17.0 verification in the Empirical record section.

## The rule (fallback behavior)

When a spawned agent's tool-inventory check confirms that `Agent` is genuinely
absent (ceiling or regression — see "When this fallback fires"), it MUST
gracefully degrade to direct execution rather than fail the work item:

1. **Direct execution.** The agent executes the work item itself using the tools
   it does have (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`).
2. **Reviewer skip.** Skip the `Agent(cagents:reviewer)` validation call — it is
   not available. Instead, the agent self-validates against acceptance criteria
   via the 5 hook-verifiable checks in
   `.claude/rules/core/resources/execution-self-validation.md`.
3. **Self-validation logging.** Write the result to
   `outputs/task-{N}/self-validation.yaml` with the standard
   `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` field.
4. **Lead-side review (optional).** The team lead (or a parent agent that DOES
   have `Agent`) can run a follow-up review pass using `Agent(cagents:reviewer)`
   against any output that needs deeper validation.

On CC 2.1.172+ at depths 1–4, none of the above applies — spawn normally.

## Documentation requirement (fallback)

When this fallback fires, the coordination_log for the session/wave MUST include
the literal sentence "Agent/subagent-spawn tool was not available" so that
`verify-completion.cjs` recognizes the graceful-degradation pattern and
downgrades the protocol-violation warning. The sentinel is still keyed on by the
hook and remains valid for the ceiling/regression case.

## Tool inventory check before BLOCKED

Before reporting `BLOCKED` because the `Agent` tool is missing, **first verify
the tool is actually absent** — do not assume it. On CC ≥ 2.1.172 the `Agent`
tool is normally present at depths 1–4, so a missing-Agent assumption is usually
wrong. Only when the tool-inventory check confirms `Agent`, `TodoWrite`, or
`TaskUpdate` is genuinely absent (ceiling reached, or a regressed/older harness)
should you complete the work item without it. Never report `BLOCKED` for a
missing `Agent` tool without first confirming the tool is truly gone. Reserve
`BLOCKED` for cases where a critical tool (e.g., `Bash`, `Write`, `Edit`) is
genuinely absent.

When `TaskUpdate` is genuinely absent, status reporting falls back to writing to
`outputs/task-{N}/self-validation.yaml` with the standard `status:` field. The
controller/lead aggregates self-validation YAMLs at the wave or session gate.

## Upstream configuration note (historical PHASE-N1 finding)

> **Historical.** In May 2026, the `claude-code-guide` agent confirmed that the
> public Claude Code documentation exposed no documented mechanism to re-enable
> the `Agent` tool on a depth-1 plugin-namespaced subagent — no `settings.json`
> key, no `plugin.json` field, no environment variable, and no per-spawn
> `allowed-tools` override could re-add the stripped tool. That null-finding was
> the basis for "the graceful-degradation pattern is the only correct response."
>
> **As of v12.17.0 this is moot for the default case**: Claude Code 2.1.172
> ships deep nesting natively, so no config workaround is needed — the `Agent`
> tool is simply present. The historical guidance still holds for the
> ceiling/regression fallback: do not propose config fixes to re-enable `Agent`
> past the genuine nesting ceiling; degrade to direct execution instead.

## Empirical record

> **Pre-2.1.172 history (degradation observed as default):**
>
> - `team_doc-update-plugin-audit_260503_001` (original audit, May 3 2026)
> - `team_continue-cagents-w6_260505_001` (spawn-crash reproduction, May 5 2026)
> - `team_phase11-w6-resume_260505_005` (graceful-degradation success, May 5 2026)
> - `run_improve-team-context_260521_001` (v12.1.0 spike confirming /act depth-1 stripping)
>
> Lead direct execution per W6 W2 completed in ~25 minutes vs. the projected
> 1.5-hour subagent path, demonstrating that direct execution was often *faster*
> than spawning subagents for mechanical work.

**v12.17.0 verification (deep nesting confirmed live — stripping gone):**

- `run_deep-nesting-enablement_260611_001` (this session, Claude Code 2.1.173).
  A spawn chain was driven depth 1 → 2 → 3 → 4 → 5 → 6. The `Agent` tool was
  present at every level and **zero stripping** was observed; no cAgents config
  blocked it. This confirms the CC 2.1.172 changelog entry ("Sub-agents can now
  spawn their own sub-agents, up to 5 levels deep") and obsoletes the
  "Agent stripped at depth ≥ 1 as default" framing.

## Future work — the future arrived

The future this playbook once anticipated is now live: Claude Code 2.1.172+
exposes the `Agent` tool to nested subagents up to the 5-level ceiling, so the
unconditional "spawned agents ARE delegators" pattern is restored as the default.
This playbook is **retained only as a ceiling/regression fallback** — invoked
when a subagent at the depth-5 ceiling cannot spawn deeper, or when running on a
regressed/older harness that withholds the `Agent` tool. If a future Claude Code
version were to raise or remove the 5-level ceiling, the ceiling branch of this
fallback would narrow further; the regression branch remains as defensive
insurance.

## See also

- `cagents-memory/_knowledge/agent-tool-depth1-stripping.md` — formal pattern + asks-for-Anthropic-upstream document (historical)
- `cagents-memory/_knowledge/cc-plugin-subagent-spawn-bug.md` — original reproduction evidence (historical)
- `.claude/rules/core/resources/execution-self-validation.md` — the 5-check self-validation protocol used when `Agent` is genuinely absent
