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
> to 5 levels deep**. An experiment verified this on **Claude Code 2.1.173**, in
> session `run_deep-nesting-enablement_260611_001`. A spawn chain ran
> depth 1 → 2 → 3 → 4 → 5 → 6. The `Agent` tool was present at every level, with
> **zero stripping**. The "Agent tool stripped at depth ≥ 1" behavior that this
> playbook first addressed is **NO LONGER the default**.
>
> This pattern is therefore **repositioned from "the expected depth-1 behavior"
> to a defensive FALLBACK**. It now applies only when the `Agent` tool is
> *genuinely* absent. That happens at the real nesting **ceiling**, where a
> subagent at depth 5 cannot spawn a depth-6 child. It also happens if an older
> harness or a future harness regresses the capability.
>
> The load-bearing fallback guidance below is **retained intact**, because it is
> still correct for that fallback case. That guidance is the tool-inventory
> check, the TaskUpdate substitution, the no-reviewer-call rule, the
> coordination_log sentinel sentence, and the self-validation YAML path.
>
> **Default expectation on CC 2.1.172+**: an agent at depth 1–4 keeps the
> `Agent` tool and spawns subagents normally. Do NOT degrade before you need to.
> Degrade only after a verified tool-inventory check shows that `Agent` is
> absent.

**This is a fallback. It applies to any cAgents controller or execution agent
that does a tool-inventory check and finds the `Agent` tool genuinely absent. It
applies whatever skill spawned that agent: `/act`, `/team`, or the legacy
`/org`.**

## When this fallback fires

The `Agent` tool is genuinely absent in two cases, and this pattern applies to
both of them:

1. **Nesting ceiling reached.** A subagent at depth 5 cannot spawn a depth-6
   child. The 5-level budget is `max_nesting_depth: 5`, and it counts the skill
   loop as depth 0. That budget is now used up. The harness exposes no spawning
   tool past the ceiling.
2. **Harness regression, or an older harness.** A future Claude Code version can
   drop its support for deep nesting. An environment older than 2.1.172 can also
   withhold the `Agent` tool from subagents. On such a harness, this fallback
   restores correct behavior.

In both cases the agent confirms the absence with the tool-inventory check
below, before it degrades. On CC 2.1.172+ at depths 1–4 the tool is present, and
you must NOT degrade.

## Root cause (historical)

> **Historical, pre-2.1.172.** Before Claude Code 2.1.172, the platform enforced
> a 2-level subagent nesting limit. Depth 0 was the skill loop, depth 1 was the
> spawned agent, and there was no further nesting. The platform enforced that
> limit by withholding the `Agent` spawning tool from depth-1 agents, whatever
> the SKILL.md `allowed-tools` field declared.
>
> Historically the `Agent` tool was stripped at depth ≥ 1 as the default
> behavior. The `TodoWrite` tool and the `TaskUpdate` tool were also absent at
> that nesting level much of the time. cAgents config could not override it, and
> that config is `.claude/settings.json` plus `.claude-plugin/plugin.json`. No
> documented CC setting re-exposed `Agent` to a depth-1 subagent.
>
> **This is no longer the case.** Claude Code 2.1.172 added deep subagent
> nesting. On 2.1.173, which is this environment, the `Agent` tool is present at
> every level of a depth 1 → 6 chain. The historical limitation now survives only
> as the ceiling fallback and the regression fallback described above.

## What was historically stripped (for reference)

> **Historical framing.** Before v12.17.0, the depth-1 stripping was documented
> as a uniform behavior across every spawning skill and every agent type:
>
> - **All spawning skills**: `/act`, whose controllers sat at depth-1, and
>   `/team`, whose subagents sat at depth-1. History labeled those subagents
>   "teammates", and they included the C-suite agents in Wave 0 and Wave 1 of
>   strategic mode. The v12.1.0 spike, in session
>   `run_improve-team-context_260521_001`, reproduced the stripping under `/act`.
>   A controller that `/act` spawned at depth-1 received "Agent is not available
>   inside subagents." when it tried `Agent(subagent_type: "general-purpose")`.
>   Before v12.2.0 the same stripping affected the now-removed `/org` skill.
> - **All agent types**: plugin-namespaced `cagents:*` subagents, and also the
>   built-in agent types `general-purpose`, `Explore`, and `Plan`. The audit in
>   `team_doc-update-plugin-audit_260503_001` and the v12.1.0 spike both
>   confirmed that the limitation was type-agnostic.
>
> These records are pre-2.1.172 history. They no longer describe the current
> default behavior. See the v12.17.0 verification in the Empirical record
> section.

## The rule (fallback behavior)

Sometimes the tool-inventory check of a spawned agent confirms that `Agent` is
genuinely absent. The cause is the ceiling or a regression, as in "When this
fallback fires". In that case the agent MUST degrade gracefully to direct
execution. It MUST NOT fail the work item.

1. **Direct execution.** The agent does the work item itself, with the tools it
   does have. Those tools are `Read`, `Write`, `Edit`, `Bash`, `Grep`, and
   `Glob`.
2. **Reviewer skip.** Skip the `Agent(cagents:reviewer)` validation call, because
   it is not available. The agent instead self-validates against the acceptance
   criteria, with the 5 hook-verifiable checks in
   `.claude/rules/core/resources/execution-self-validation.md`.
3. **Self-validation logging.** Write the result to
   `outputs/task-{N}/self-validation.yaml`, with the standard
   `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` field.
4. **Lead-side review (optional).** The team lead can run a follow-up review
   pass with `Agent(cagents:reviewer)`, against any output that needs deeper
   validation. Any parent agent that DOES have `Agent` can run that pass too.

On CC 2.1.172+ at depths 1–4, none of the above applies. Spawn normally.

## Documentation requirement (fallback)

When this fallback fires, the coordination_log MUST hold one literal sentence.
That log belongs to the session, or to the wave. The sentence is
"Agent/subagent-spawn tool was not available". That sentence lets `verify-completion.cjs` recognize the graceful-degradation
pattern, and downgrade the protocol-violation warning. The hook still keys on
the sentinel, and the sentinel stays valid for the ceiling case and for the
regression case.

## Tool inventory check before BLOCKED

Before you report `BLOCKED` for a missing `Agent` tool, **make sure that the
tool is absent.** Do not assume it. On CC ≥ 2.1.172 the `Agent` tool is normally
present at depths 1–4. An assumption of a missing `Agent` is therefore wrong most
of the time.

Run the tool-inventory check first. It can confirm that `Agent`, `TodoWrite`, or
`TaskUpdate` is genuinely absent. Only then complete the work item without that
tool. The cause is a ceiling that you reached, or a regressed or older harness. Never
report `BLOCKED` for a missing `Agent` tool until you confirm that the tool is
gone. Reserve `BLOCKED` for a genuinely absent critical tool, such as `Bash`,
`Write`, or `Edit`.

When `TaskUpdate` is genuinely absent, report the status by writing to
`outputs/task-{N}/self-validation.yaml`, with the standard `status:` field. The
controller or the lead aggregates those self-validation YAML files at the wave
gate or at the session gate.

## Upstream configuration note (historical PHASE-N1 finding)

> **Historical.** In May 2026, the `claude-code-guide` agent confirmed a null
> finding. The public Claude Code documentation exposed no documented mechanism
> to re-enable the `Agent` tool on a depth-1 plugin-namespaced subagent. No
> `settings.json` key, no `plugin.json` field, no environment variable, and no
> per-spawn `allowed-tools` override could re-add the stripped tool. That null
> finding was the basis for "the graceful-degradation pattern is the only
> correct response."
>
> **As of v12.17.0 this is moot for the default case.** Claude Code 2.1.172
> ships deep nesting natively, so no config workaround is needed. The `Agent`
> tool is present. The historical guidance still holds for the ceiling fallback
> and for the regression fallback. Do not propose a config fix to re-enable
> `Agent` past the genuine nesting ceiling. Degrade to direct execution instead.

## Empirical record

> **Pre-2.1.172 history, where the degradation was the default behavior:**
>
> - `team_doc-update-plugin-audit_260503_001`: the original audit, May 3 2026.
> - `team_continue-cagents-w6_260505_001`: the spawn-crash reproduction, May 5
>   2026.
> - `team_phase11-w6-resume_260505_005`: the graceful-degradation success, May 5
>   2026.
> - `run_improve-team-context_260521_001`: the v12.1.0 spike that confirmed the
>   /act depth-1 stripping.
>
> In W6 W2 the lead ran the work directly and finished in about 25 minutes. The
> projected subagent path was 1.5 hours. For mechanical work, direct execution
> was therefore *faster* than a spawn of subagents.

**v12.17.0 verification: deep nesting was confirmed live, and the stripping is
gone.**

- `run_deep-nesting-enablement_260611_001`, this session, on Claude Code 2.1.173.
  A spawn chain was driven depth 1 → 2 → 3 → 4 → 5 → 6. The `Agent` tool was
  present at every level, and **zero stripping** was observed. No cAgents config
  blocked it. This confirms the CC 2.1.172 changelog entry, "Sub-agents can now
  spawn their own sub-agents, up to 5 levels deep". It also obsoletes the
  "Agent stripped at depth ≥ 1 as default" framing.

## Future work: the future arrived

The future that this playbook once anticipated is now live. Claude Code 2.1.172+
exposes the `Agent` tool to a nested subagent, up to the 5-level ceiling. The
unconditional "spawned agents ARE delegators" pattern is therefore the default
again.

This playbook is **retained only as a ceiling fallback and a regression
fallback**. It is invoked when a subagent at the depth-5 ceiling cannot spawn
deeper. It is also invoked on a regressed or older harness that withholds the
`Agent` tool. If a future Claude Code version raises the 5-level ceiling or
removes it, the ceiling branch of this fallback narrows further. The regression
branch stays as defensive insurance.

## See also

- `cagents-memory/_knowledge/agent-tool-depth1-stripping.md`: the formal
  pattern, plus the asks-for-Anthropic-upstream document. Historical.
- `cagents-memory/_knowledge/cc-plugin-subagent-spawn-bug.md`: the original
  reproduction evidence. Historical.
- `.claude/rules/core/resources/execution-self-validation.md`: the 5-check
  self-validation protocol, used when `Agent` is genuinely absent.
