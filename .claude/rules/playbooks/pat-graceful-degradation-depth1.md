---
name: pat-graceful-degradation-depth1
description: "Pattern: how cAgents agents at depth >= 1 gracefully degrade when the Claude Code runtime strips the Agent (and TodoWrite/TaskUpdate) tools from their surface. Applies across all skills (/run, /team, legacy /org)."
license: MIT
compatibility: "Claude Code 2.1.x+, cAgents 12.x+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "controllers, execution agents, reviewers"
  applies_to:
    - cagents:tech-lead
    - cagents:architect
    - cagents:team-lead
    - all-controllers
    - all-execution-agents
---

# Pattern: Graceful Degradation Under Depth-1 Tool Stripping

**Applies to: all cAgents controllers and execution agents spawned at depth >= 1 by Claude Code, regardless of which skill spawned them (`/run`, `/team`, or legacy `/org`).**

## What gets stripped

When any cAgents agent is spawned at nesting depth >= 1 by Claude Code, the runtime tool surface for that spawned agent may NOT include the `Agent` tool — even when the agent's SKILL.md frontmatter correctly declares `allowed-tools: Agent Read Grep Glob Write Edit Bash TodoWrite`. The `TodoWrite` and `TaskUpdate` tools are also frequently absent at this nesting level.

The depth-1 stripping behavior applies uniformly across:

- **All spawning skills**: `/run` (controllers at depth-1), `/team` (teammates at depth-1, including C-suite agents in Wave 0/1 of strategic mode). The v12.1.0 spike (session `run_improve-team-context_260521_001`) reproduced the stripping under `/run` — a controller spawned by `/run` at depth-1 received "Agent is not available inside subagents." on attempting `Agent(subagent_type: "general-purpose")`. Pre-v12.2.0 the same stripping affected the now-removed `/org` skill; the limitation predates and survives /org's removal.
- **All agent types**: plugin-namespaced `cagents:*` subagents AND built-in agent types (`general-purpose`, `Explore`, `Plan`). The audit (`team_doc-update-plugin-audit_260503_001`) and the v12.1.0 spike both confirmed the limitation is type-agnostic.

## Root cause

Claude Code platform behavior for any subagent at depth >= 1. The 2-level subagent nesting limit (depth-0 = skill loop, depth-1 = spawned agent, no further nesting) is enforced upstream by withholding the spawning tool (`Agent`) from depth-1 agents, regardless of what the SKILL.md `allowed-tools` declares. cAgents config (`.claude/settings.json`, `.claude-plugin/plugin.json`) cannot override this — there is no documented CC setting that re-exposes `Agent` to depth-1 subagents.

## The rule

When any spawned agent discovers that `Agent` is unavailable, it MUST gracefully degrade to direct execution rather than fail the work item:

1. **Direct execution.** The agent executes the work item itself using the tools it does have (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`).
2. **Reviewer skip.** Skip the `Agent(cagents:reviewer)` validation call — it is not available. Instead, the agent self-validates against acceptance criteria via the 5 hook-verifiable checks in `.claude/rules/core/resources/execution-self-validation.md`.
3. **Self-validation logging.** Write the result to `outputs/task-{N}/self-validation.yaml` with the standard `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` field.
4. **Lead-side review (optional).** The team lead, which DOES have Agent at level 0, can run a wave-N+1 review pass using `Agent(cagents:reviewer)` against any teammate output that needs deeper validation.

## Documentation requirement

The coordination_log for the session/wave MUST include the literal sentence "Agent/subagent-spawn tool was not available" so that `verify-completion.cjs` recognizes the graceful-degradation pattern and downgrades the protocol-violation warning.

## Tool inventory check before BLOCKED

For execution agents specifically: before reporting `BLOCKED` because a tool is missing, check whether the missing tool is `Agent`, `TodoWrite`, or `TaskUpdate` — these are commonly stripped at depth >= 1 and the work item should be completed without them. Only `BLOCKED` if a critical tool (e.g., `Bash`, `Write`, `Edit`) is genuinely absent.

When `TaskUpdate` is stripped, status reporting falls back to writing to `outputs/task-{N}/self-validation.yaml` with the standard `status:` field. The controller/lead aggregates self-validation YAMLs at the wave or session gate.

## Upstream configuration null-finding (PHASE-N1)

Confirmed via `claude-code-guide` agent (May 2026): the public Claude Code documentation at `docs.claude.com/docs/en/` exposes **no** documented mechanism for re-enabling the `Agent` tool on a depth-1 plugin-namespaced subagent. Specifically:

- No `settings.json` key (project, user, or managed-policy scope) re-exposes `Agent` to nested plugin subagents.
- No `.claude-plugin/plugin.json` field unlocks the spawning tool for `cagents:*` agents at depth >= 1.
- No documented environment variable (e.g., `CLAUDE_CODE_*`) controls the depth-1 stripping behavior.
- No per-spawn `allowed-tools` override on the Agent tool itself can re-add a stripped tool to the spawned agent's surface.

Agents and reviewers MUST NOT propose `settings.json` / `plugin.json` / env-var fixes for depth-1 Agent-tool stripping — the limitation is enforced in the Claude Code runtime, not in cAgents-controllable configuration. The graceful-degradation pattern above is the only correct response.

## Empirical reproduction

- `team_doc-update-plugin-audit_260503_001` (original audit, May 3 2026)
- `team_continue-cagents-w6_260505_001` (spawn-crash reproduction, May 5 2026)
- `team_phase11-w6-resume_260505_005` (graceful-degradation success, May 5 2026)
- `run_improve-team-context_260521_001` (v12.1.0 spike confirming /run depth-1 stripping)

Lead direct execution per W6 W2 completed in ~25 minutes vs. the projected 1.5-hour teammate path, demonstrating that direct execution is often *faster* than spawning teammates for mechanical work.

## Future work

If a future Claude Code version exposes `Agent` to depth-1 subagents — or if a per-spawn `allowed-tools` flag becomes available on the Agent tool itself — this pattern can be retired and the unconditional "spawned agents ARE delegators" pattern restored. Until then, both patterns are valid in every cAgents skill: delegation when Agent is exposed, direct execution + self-validation when it is not.

## See also

- `cagents-memory/_knowledge/agent-tool-depth1-stripping.md` — formal pattern + asks-for-Anthropic-upstream document
- `cagents-memory/_knowledge/cc-plugin-subagent-spawn-bug.md` — original reproduction evidence
- `.claude/rules/core/resources/execution-self-validation.md` — the 5-check self-validation protocol used when Agent is stripped
