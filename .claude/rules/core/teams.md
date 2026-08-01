---
paths:
  - "agents/core/team-*/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/team-*.cjs"
  - ".claude/hooks/teammate-*.cjs"
  - "cagents-memory/sessions/team_*/**"
---

# Team Coordination Patterns

Guidelines for parallel team execution in cAgents using concurrent-Agent waves.

> **API change (Claude Code v2.1.178)**: `TeamCreate` and `TeamDelete` were
> **REMOVED**. Agent teams are now **implicit** — there is nothing to create and
> nothing to delete; cleanup is automatic at session end. Every reference to
> `TeamCreate`/`TeamDelete` in this file is **historical** ("removed in 2.1.178 —
> do not call"). The DEFAULT execution model is **concurrent-Agent waves**
> (below), which works in every harness. Named background teammates + tmux/iTerm2
> panes are demoted to an OPTIONAL, clearly-flagged EXPERIMENTAL path.

## Overview

**Core Architecture**: `/team` decomposes the request into work items across as many waves as the work requires. Teams are **implicit** — the lead does NOT create a team. For each wave, the lead spawns all wave subagents as **concurrent `Agent()` calls issued in one message**, run synchronously (`run_in_background: false`) so it collects every wave result together, validates the GATE, then proceeds. Each wave subagent is a controller agent that delegates to execution agents directly via the Agent tool. More waves = better quality gating.

> Parallelism now comes from BOTH: (a) concurrent `Agent()` subagent calls per wave, AND (b) each wave subagent recursively spawning its OWN subagents (up to 5 levels deep). A subagent that needs a different specialty spawns that specialist as its own subagent (downward nesting) rather than routing a request sideways through the lead — this removes the lead-as-router bottleneck and the SendMessage/peer_request overhead. "Teammate" was the label for a wave unit under the now-demoted named-teammate feature; the wave unit is simply a subagent.

Team Mode enables N-wave parallel execution with:
- **Maximum wave decomposition**: /team breaks the request into work items across 3-10 waves (more waves preferred)
- **Concurrent-Agent wave spawn**: For each wave, the lead issues all wave-K `Agent()` calls in ONE assistant message (multiple tool uses in a single message run concurrently), synchronously (`run_in_background: false`)
- **Implicit teams**: No `TeamCreate`/`TeamDelete` — the team exists as the set of concurrently-spawned subagents; cleanup is automatic at session end
- **GATE sentinel quality checks**: Lead validates between waves before proceeding
- **Coordination tools**: `Agent` (spawn subagents), `TaskCreate`/`TaskUpdate`/`TaskList`/`TaskGet` (task visibility + gate-sentinel dependencies); `SendMessage` (lead↔named-teammate messaging — **experimental-path only**, not used on the default subagent-wave path)
- **Display**: `teammateMode` defaults to `in-process` (v2.1.179); tmux/iTerm2 split panes are an EXPERIMENTAL-path option
- **Every work item via controller**: Wave subagents ARE controllers that spawn execution agents directly via Agent tool
- **Shared task lists**: Built-in TaskCreate/TaskList at `~/.claude/tasks/{team-name}/`
- **Strategic Mode (v12.2.0+)**: For cross-domain requests, `/team` auto-enables strategic mode (Wave 0/1/2 = C-suite deliberation, Wave 3..N = per-domain dispatch). Auto-detection is driven by `router.domain_count >= 2`. Users can override with `--strategic` (force enable) or `--no-strategic` (force disable). The 9 leadership agents (CEO/CTO/CFO/CMO/COO/CHRO/CCO/CRO/CPO) act as Wave 0/1 subagents. See `.claude/skills/team/reference/strategic-mode.md` for the full protocol, brief schema, escalation, and examples.
- **Independent contexts**: Each subagent has its own context window

## CRITICAL: Wave Subagents ARE Controllers That Spawn Execution Agents Directly

**This is the principle of team mode, and it is unconditionally true.** Wave subagents do NOT implement work items directly. Each wave subagent is spawned as a controller agent (e.g., `cagents:tech-lead`) that delegates to execution agents via Agent tool, then spawns `cagents:reviewer` to validate. As of Claude Code 2.1.172 / cAgents v12.17.0, a subagent spawned at depth 1 reliably retains the `Agent` tool and spawns its execution agents and reviewer normally.

```
Subagent (controller, e.g., tech-lead) -> Agent(cagents:backend-developer)
  -> backend-developer implements work item
  -> Agent(cagents:reviewer) validates against acceptance criteria
  -> PASS or REVISE (max 2 rounds)
```

Wave subagents MAY also spawn deeper sub-agents within the 5-level nesting budget (skill loop = depth 0; the 5 levels are the subagent generations beneath it) when a work item genuinely warrants it — a subagent's execution agent can spawn its own helper sub-agent, and so on, up to the ceiling.

**Wave subagents spawn execution agents DIRECTLY rather than re-entering /run via the Skill tool.** As of CC 2.1.172 a nested `/run` from a subagent is technically possible within the depth budget, but it is avoided **by design for cost and clarity**: re-entering the full /run pipeline (orchestrator + planner + controller + validator) for a single wave's work items duplicates enrichment the lead already did in Wave 0 and burns extra context and tokens. Spawn the execution agent directly instead.

**Anti-patterns (NEVER DO):**
- Telling a subagent to invoke /run — re-entering the full pipeline duplicates Wave 0 enrichment and wastes tokens; spawn execution agents directly instead (by design for cost/clarity, NOT a harness limit)
- Having the team lead do implementation work
- Having wave subagents implement work items directly instead of spawning execution agents *(except the Nesting-Ceiling fallback below, when the `Agent` tool is verifiably absent)*
- Having wave subagents answer questions directly instead of delegating *(except when `Agent` is verifiably absent)*

## Nesting-Ceiling Degradation: Agent Tool Absent Only at the Depth Budget (repositioned in v12.17.0)

**Current model (CC ≥ 2.1.172).** Subagents spawn their own subagents up to **5 levels deep** (skill loop = depth 0). The `Agent` tool is present at every level from depth 1 through depth 5, so subagent controllers reliably spawn execution agents and reviewers — delegation is the expected behavior at every level.

**Graceful degradation is a DEFENSIVE FALLBACK**, not the expected depth-1 behavior. It triggers ONLY when the `Agent` tool is genuinely absent — at the actual nesting **ceiling** (a subagent at depth 5 cannot spawn a depth-6 child) or if a future/older harness regresses the capability. Verify the tool is actually absent before degrading; on CC ≥ 2.1.172 `Agent` is normally present at depths 1-4. The fallback applies to all spawning skills and all agent types: when `Agent` is verifiably absent, degrade to direct execution + self-validation rather than failing.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the canonical fallback pattern, the tool-inventory-check-before-BLOCKED rule, the ceiling/regression scope, and the historical pre-v12.17.0 depth-1 context.

## CRITICAL: Spawn Wave Subagents, Not Just Tasks

**The most common failure mode is creating tasks without spawning real subagents.** There is no `TeamCreate` step (the tool was removed in 2.1.178 — teams are implicit). For each wave the `/team` lead MUST execute BOTH steps:
1. **TaskCreate** -- create the wave's work items as shared tasks (visibility + gate-sentinel dependencies)
2. **Spawn wave subagents via concurrent `Agent()` calls in ONE message** -- issue all wave-K `Agent()` calls together, synchronously (`run_in_background: false`). Each `Agent()` call is a real subagent (a controller agent). Multiple tool uses in a single message run concurrently, giving true within-wave parallelism.

Both steps are required. Creating tasks without spawning subagents to execute them is the primary bug that causes /team to "never spin out team members." The team is implicit — it IS the set of subagents you spawn; nothing needs to be created first.

## Execution Pipeline

```
/team <request>
    |
    Step 1: PARSE request and flags
    Step 2: DECOMPOSE into work items with MAXIMUM wave granularity (3-10 waves)
    Step 3: TaskCreate -- create tasks for ALL work items + GATE sentinels with wave dependencies
    Step 4: Execute Wave 0 (enrichment + bootstrap) -- lead does this sequentially
    |
    Step 5: FOR EACH Wave K (1 to N-1):
    |   +-- Spawn ALL wave-K subagents as CONCURRENT Agent() calls in ONE message,
    |   |   synchronously (run_in_background: false), so the lead collects every
    |   |   wave-K result together before proceeding:
    |   |   +-- Agent(subagent 1, controller): Agent(execution agent) -> Agent(reviewer) --> result
    |   |   +-- Agent(subagent 2, controller): Agent(execution agent) -> Agent(reviewer) --> result
    |   |   +-- Agent(subagent 3, controller): Agent(execution agent) -> Agent(reviewer) --> result
    |   |                    (concurrent within wave -- one message, multiple Agent() tool uses)
    |   +-- Review wave-K results + TaskList status
    |   +-- Validate GATE-K when all wave-K items complete
    |   +-- Proceed to wave K+1 (AUTOMATIC) — spent subagents end automatically; no TeamDelete
    |
    Step 6: Execute final wave (integration + validation) -- lead does this
    Step 7: Report results (cleanup is automatic at session end — no TeamDelete)
```

**Steps 3-5 are MANDATORY and IMMEDIATE. Do not pause or ask permission between waves.**

**Why `run_in_background: false`**: since v2.1.198 subagents are **background-by-default**. To collect a wave's results synchronously (so the lead can validate GATE-K before the next wave), each wave-K `Agent()` call MUST set `run_in_background: false` explicitly.

**CRITICAL: Maximize waves.** More waves = more quality gates = higher quality output. There is nothing wrong with more waves. Prefer 5-7 waves over 2-3 waves.

## Team Coordination Mechanism (Implicit Teams)

Teams in cAgents are **implicit** — formed by the subagents the lead spawns, not created by an API call. The mechanism uses these callable tools:

| Tool | Purpose |
|------|---------|
| **Agent** | Spawn a subagent (a controller agent). Concurrent `Agent()` calls in one message = a parallel wave. This is how a "team" comes into existence — there is no separate create step. |
| **TaskCreate** | Create work items as shared tasks |
| **TaskUpdate** | Update task status, set owner, manage dependencies |
| **TaskList** | View all tasks and their status |
| **TaskGet** | Read full task details |
| **SendMessage** | Direct lead↔named-teammate messaging — **experimental-path only** (auto-resumes a stopped named teammate). Not used on the default subagent-wave path, which collects results synchronously. |

> **Removed in 2.1.178 — do not call**: `TeamCreate` (create team) and
> `TeamDelete` (clean up team). Teams are now implicit and cleanup is automatic
> at session end. These tools no longer exist; any surviving mention below is
> historical.

Key behaviors:
- Concurrent `Agent()` calls in a single message run in parallel — that IS the wave
- With `run_in_background: false`, the lead receives all wave results together (synchronous collection)
- Named-teammate messages arrive automatically, no polling (**experimental path only** — the default subagent-wave path collects results synchronously)
- File-lock based task claiming prevents race conditions
- Shared task list at `~/.claude/tasks/{team-name}/` (populated by TaskCreate)

## Claude Code Agent Teams: Capabilities and Limitations

> Most items below describe the interactive **experimental named-teammate path**
> (panes, direct teammate interaction, plan-approval). The DEFAULT concurrent-Agent
> wave model uses none of them — it just issues synchronous `Agent()` calls. Task
> dependencies, self-claiming, and worktree isolation apply to both paths.

### Capabilities
- **Direct teammate interaction**: Users can message teammates directly using Shift+Down (in-process) or clicking panes (split)
- **Plan approval mode**: Use `CLAUDE_CODE_PLAN_MODE_REQUIRED` to require teammates to plan before implementing. Lead reviews and approves/rejects plans.
- **Teammate model override**: Specify models per teammate: "Use Sonnet for each teammate"
- **Task dependencies**: Tasks can block other tasks. Blocked tasks auto-unblock when dependencies complete.
- **Self-claiming**: After finishing, teammates pick up next unassigned, unblocked task autonomously.
- **In-process navigation**: Shift+Down to cycle teammates, Enter to view, Escape to interrupt, Ctrl+T for task list.
- **Worktree isolation with sparse checkout**: Use `isolation: "worktree"` when spawning teammates for parallel file safety. In monorepos, add `worktree.sparsePaths` to settings to limit each teammate's checkout to only the modules it needs:

```json
{
  "worktree": {
    "sparsePaths": ["src/module-a/", "shared/"]
  }
}
```

This dramatically reduces checkout time and prevents teammates from accidentally modifying files outside their assigned module.

### Limitations (Claude Code Enforced)
- **No session resumption**: `/resume` and `/rewind` do not restore in-process teammates
- **SendMessage auto-resume**: A stopped teammate CAN be re-activated by sending it a message via SendMessage. Use this for follow-up work without spawning a fresh agent.
- **No nested teams**: Teammates cannot manage their own named teams. Only the lead spawns wave teammates. (Teammates DO retain the `Agent` tool and spawn execution agents + reviewers to depth 5 — that is normal delegation, not a nested team.)
- **One team per session**: The implicit team is per session; cleanup is automatic at session end (no `TeamDelete`).
- **Lead is fixed**: Cannot promote a teammate to lead or transfer leadership.
- **Permissions set at spawn**: All teammates start with lead's permission mode. Can change individually after spawning, but not at spawn time.
- **Task status can lag**: Teammates sometimes fail to mark tasks completed, blocking dependents.
- **Shutdown can be slow**: Teammates finish current request before shutting down.
- **Split panes require tmux/iTerm2**: Not supported in VS Code terminal, Windows Terminal, or Ghostty.

## Display Modes (teammateMode)

`teammateMode` controls how spawned teammates are displayed. It does NOT affect the DEFAULT concurrent-Agent execution model — synchronous concurrent `Agent()` waves work in every mode. The tmux/iTerm2 split-pane display is tied to the EXPERIMENTAL named-teammate path only.

| Mode | Behavior | Requirements | Path |
|------|----------|--------------|------|
| `"in-process"` (default, v2.1.179) | All teammates in main terminal (Shift+Up/Down) | None | Default + experimental |
| `"tmux"` | Force tmux split panes -- each teammate in own pane | tmux installed | **EXPERIMENTAL** only |
| `"iterm2"` | iTerm2 split panes | iTerm2 | **EXPERIMENTAL** only |
| `"auto"` | tmux/iTerm2 if inside a supporting session, otherwise in-process | None | Experimental if panes available |

The shipped default is `in-process` (reliability-first). Split panes require the experimental named-teammate path (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) and a tmux/iTerm2 terminal; they are not available in VS Code terminal, Windows Terminal, or Ghostty.

Configure in settings.json:
```json
{
  "teammateMode": "in-process"
}
```

Per-session: `claude --teammate-mode in-process`

## OPTIONAL: Experimental Named-Background-Teammate Path

> **EXPERIMENTAL / harness-variable. NOT the default — this path is not part of
> the default subagent-wave model.** Use ONLY when
> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` AND the harness supports interactive
> agent teams. If the feature is unavailable, you MUST fall back to the DEFAULT
> concurrent-Agent subagent-wave path above — never fail the wave.

The DEFAULT concurrent-Agent wave model (synchronous `Agent()` calls, one message
per wave) is reliability-first and works in every harness. This experimental path
trades that reliability for named, long-lived, background teammates that can be
messaged by name and displayed in tmux/iTerm2 panes.

When the gate is satisfied, the lead MAY instead:

1. **Spawn named background teammates**: `Agent({ name, run_in_background: true })`.
   The team is created implicitly by the spawn — there is still no `TeamCreate`.
   Any `team_name` argument is accepted-but-ignored.
2. **Coordinate by name**: `SendMessage({ to: name })` messages a specific
   teammate; sending to a stopped teammate **auto-resumes it by name** (v2.1.77).
   Use the shared Task list (`TaskCreate`/`TaskUpdate`/`TaskList`) for work
   distribution and self-claiming.
3. **Display in panes**: `teammateMode: "tmux"` or `"iterm2"` puts each teammate
   in its own split pane (requires tmux/iTerm2).

**Fallback rule (mandatory)**: if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is unset,
if `Agent({ run_in_background: true, name })` is unavailable, or if the harness
does not support interactive teams, the lead reverts to the DEFAULT synchronous
concurrent-Agent wave model. The default path never depends on any experimental
capability.

**Hook dependency**: the `TeammateIdle` and `TaskCompleted` hooks
(`teammate-idle-handler.cjs`, `team-task-complete.cjs`) support THIS experimental
path only — they fire for named background teammates and are no-ops on the default
concurrent-Agent path. The default path does not depend on them.

## When to Use Teams

### Use Team Mode
- Tier 3+ complex workflows with multiple work items
- Work items that can execute in parallel (few dependencies)
- Time-sensitive delivery requiring speedup
- Large features with distinct components

### Use Standard Mode
- Tier 2 moderate workflows
- Highly sequential work items
- Small changes with minimal parallelism benefit
- When team overhead exceeds benefit

## Team Suitability Criteria

```yaml
required:
  work_items: ">= 3"
  has_independent_items: true

preferred:
  tier: ">= 3"
  parallelism_score: "> 0.5"

disqualified:
  all_sequential: true
  tier: 2 with items < 4
```

## Team Lifecycle (Execute IMMEDIATELY -- No Permission Required)

```
1. Parse request and flags (including --waves <N>)
2. Decompose request into work items with MAXIMUM wave granularity
3. TaskCreate -- create ALL work items + GATE sentinels with wave dependencies IMMEDIATELY
4. Execute wave 0 (enrichment + bootstrap) sequentially
5. FOR EACH wave K (1 to N-1):
   a. Spawn ALL wave-K subagents as CONCURRENT Agent() calls in ONE message,
      synchronously (run_in_background: false)
   b. Collect wave-K results together; review TaskList status
   c. Validate GATE-K when all wave-K items complete
   d. Mark GATE-K complete -> proceed to wave K+1 (spent subagents end automatically)
6. Execute final wave (integration + validation) sequentially
7. Report results (cleanup automatic at session end — no TeamDelete)
```

**Steps 3-5 are MANDATORY and IMMEDIATE. Do not pause or ask permission between waves.**

**Wave count guidance:**
| Tier | Minimum waves | Typical waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

### Wave Subagent Spawn (implicit team — no TeamCreate)

There is no team-creation call. The lead spawns a wave by issuing all wave-K `Agent()` calls in ONE message, synchronously. The set of concurrent subagents IS the team.

```javascript
// One message, multiple Agent() tool uses = one concurrent wave.
// Each is a controller agent; run_in_background: false collects results synchronously.
Agent({
  subagent_type: "cagents:tech-lead",
  description: "WI-1: implement user model",
  run_in_background: false,
  prompt: "..."
})
Agent({
  subagent_type: "cagents:tech-lead",
  description: "WI-2: build login UI",
  run_in_background: false,
  prompt: "..."
})
// (issued together in the same assistant message → they run in parallel)
```

### Task Distribution

```javascript
// Create tasks for each work item
TaskCreate({
  subject: "TASK-01: Implement user model",
  description: "Execute via /run: ...",
  activeForm: "Implementing user model"  // optional
})

// Set dependencies
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] })
```

### Subagent Communication

Wave subagents are spawned as controller agents via the Agent tool (not via SendMessage). Each subagent receives its work item prompt directly in the `Agent()` call, and the lead collects its result synchronously (`run_in_background: false`) — **no SendMessage is needed on the default subagent-wave path**. The rest of this subsection describes the **experimental named-teammate path only**, where the lead↔named-teammate SendMessage channel handles status updates and shutdown requests:

```javascript
// Broadcast update (use sparingly)
SendMessage({
  type: "broadcast",
  content: "TASK-01 complete. TASK-03 now unblocked.",
  summary: "TASK-01 done, TASK-03 available"
})

// Shut down teammate
SendMessage({
  type: "shutdown_request",
  recipient: "teammate-1",
  content: "All work complete."
})
```

**SendMessage auto-resume** (CC 2.1.77): Sending a message to a stopped teammate automatically resumes it. The team lead can use this to re-activate a teammate that completed its wave work without needing to spawn a new agent instance:

```javascript
// Resume a stopped teammate by sending it a message
SendMessage({
  type: "direct",
  recipient: "teammate-2",
  content: "New work available: TASK-07 is now unblocked. Please claim and execute."
})
```

Update the teammate lifecycle expectations accordingly: teammates that finish a wave and stop are NOT gone — they can be re-activated via SendMessage for follow-up work items.

## Cross-Teammate Request Pattern

> **LEGACY — experimental-named-teammate-path only; OBSOLETE under the default
> subagent model.** This pattern's founding premise (Claude Code forbids nested
> teams, so a teammate that needs help must route a request *sideways* through
> the lead) is obsolete under the default subagent-wave model. A wave subagent
> that needs another specialty simply spawns that specialist as its OWN downward
> sub-subagent (depth-5 nesting) — there is **no peer_request, no sideways peer
> messaging, and no lead-as-router hop** on the default path. The protocol below
> is retained only for the experimental named-background-teammate path.

A teammate sometimes needs help from another teammate. Claude Code forbids nested teams and direct teammate-to-teammate messaging (the lead is fixed), and the aggressive-delegation rule forbids the lead from executing implementation work itself. The `peer_request` protocol resolves the gap: teammate A emits a structured request, the lead routes it via a 4-branch decision tree, and the requested work happens through a peer or a fresh spawn — never through the lead's own hands.

```
   +-----------+    (1) SendMessage(type=peer_request) +    +-----------+
   |Teammate A | ---  writes outputs/wave-K/                 |Teammate B |
   | (wave K)  |       peer_requests/REQ-{N}.yaml  ----->    | (wave K)  |
   +-----------+                                             +-----+-----+
         |                                                         ^
         |                                                         |
         v                                                         |
   +-----+-----+   (2) Reads only REQ-{N}.yaml                     |
   |   Lead    |       (lead-context discipline)                   |
   | (Step 5d) |   (3) Decision tree:                              |
   |   loop    |       RELAY  -> SendMessage to B ----------------->
   +-----+-----+       SPAWN  -> Agent(cagents:{type}) fresh TM
                       PROMOTE-> append work_items_wave_{K+1}.yaml
                       REJECT -> SendMessage A with rationale
```

| Branch | Trigger | Lead action |
|--------|---------|-------------|
| RELAY | intra-wave, peer B alive or stoppable, scope <= 1 WI | `SendMessage` to B (auto-resumes) |
| SPAWN | intra-wave, new work-item-sized scope | `Agent({subagent_type: "cagents:{type}", ...})` |
| PROMOTE | out-of-wave scope or violates GATE-K | Append to `work_items_wave_{K+1}.yaml` |
| REJECT | violates aggressive-delegation, `not_in_scope`, or unsafe | `SendMessage` A with rationale |

**Aggressive-delegation invariant**: the lead's only valid actions on a peer_request are SendMessage, Agent() spawn, PROMOTE, or REJECT. The lead never reads the requested artifact and writes it itself, and never uses Edit/Write/Bash to implement the requested work. See `.claude/rules/core/delegation.md` § Controller-Side Corollary.

Teammate A reports `status: NEEDS_CONTEXT` with optional `requested_peer: teammate-{name}` and `peer_request_ref: outputs/wave-{K}/peer_requests/REQ-{N}.yaml` (extension to the 4-status protocol — see `.claude/rules/playbooks/pat-subagent-status-protocol.md`).

See @.claude/rules/playbooks/pat-cross-teammate-request.md for the canonical schema, decision tree, worked example, and risk table.

### Cleanup

Cleanup is **automatic** — there is no `TeamDelete` call (the tool was removed in
2.1.178). Synchronously-spawned wave subagents end when they return their result;
any remaining implicit team state is torn down at session end. The lead does not
manage team teardown.

> Historical: `TeamDelete()` was the pre-2.1.178 teardown call. Do not call it —
> it no longer exists.

## Team Lead (Controller) Behavior

### Delegate Mode Enforcement

Team leads ONLY coordinate. They NEVER implement.

```yaml
allowed_actions:
  - Spawn wave subagents via concurrent Agent() calls (run_in_background: false)
  - Distribute work items to subagents via TaskCreate (SendMessage is experimental-path only)
  - Monitor task list progress via TaskList
  - Request status from named teammates via SendMessage (experimental path only)
  - Synthesize subagent outputs
  - Write coordination_log.yaml
  # Cleanup is automatic at session end — no TeamDelete call (removed in 2.1.178)

prohibited_actions:
  - Edit/Write implementation files
  - Answer questions directly
  - Execute work items themselves
  - Skip delegation for "simple" tasks
```

### Work Distribution Strategies

**Self-Claiming (Preferred)**: Subagents check TaskList and claim available tasks after completing current work. Built-in file-lock prevents race conditions.

**Direct Assignment**: Lead assigns tasks to specific subagents via TaskUpdate (set owner) and SendMessage.

## Shared Task List

Tasks managed via built-in tools with these states:

```
pending --> in_progress --> completed
```

Dependencies: Use `addBlockedBy` in TaskUpdate. Blocked tasks auto-unblock when dependencies complete.

## Fallback Behavior

### Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run` for standard orchestration.

### Display Mode Fallback

- `"auto"` mode: Automatically falls back to in-process if not inside tmux
- `"tmux"` mode: Requires tmux installed; in-process if unavailable
- `"in-process"`: Works in any terminal

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Execution time reduction | 40-60% | vs sequential baseline |
| Parallelism utilization | >70% | actual / potential parallel |
| Work item throughput | 3x | items/minute improvement |

## Session Structure

```
cagents-memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml    # Team composition + display mode
|   +-- messages/             # Communication log
|   +-- metrics/
|       +-- timing.yaml
|       +-- parallelism.yaml
+-- workflow/
|   +-- plan.yaml
|   +-- work_items.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

Built-in resources (managed by Claude Code):
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

## Error Handling

### Subagent Failure
- Send status query via SendMessage
- If unresponsive: spawn replacement subagent
- Reassign work item

### Deadlock Detection
- Detect circular dependencies via TaskList
- Break cycle by sequentializing
- Warn about degraded parallelism

### Partial Completion
- Complete what can be completed
- Document partial results clearly
- Return with status of succeeded/failed items

## Team Templates

Pre-built team structures for common project types. Templates define teams, delivery waves, quality gates, and interface contracts.

### Available Templates

| Template | Teams | Waves | Domain |
|----------|-------|-------|--------|
| `fullstack-app` | Platform + Product + Experience | 3 | make:engineering |
| `api-service` | API + Data + Security | 2 | make:engineering |
| `frontend-app` | UI/UX + Components + State | 2 | make:engineering |
| `content-campaign` | Strategy + Content + Distribution | 3 | grow:marketing |
| `data-pipeline` | Ingestion + Transform + Serving | 2 | make:engineering |
| `game-project` | Core Dev + Art & Audio + Design & QA | 3 | make:game-development |
| `_custom` | User-defined | User-defined | Any |

### Auto-Selection

Templates are auto-selected by scoring against the request:

```
Score = keyword * 0.4 + domain * 0.2 + signal * 0.2 + items * 0.2
Select top scorer above confidence_threshold (0.6)
```

Override with flags: `--template <id>`, `--no-template`, `--waves <N>`

### Template Location

`cagents-memory/_system/templates/teams/` with `_index.yaml` catalog.

## Wave Execution

Waves are delivery phases enforced via TaskCreate dependencies (gate sentinel tasks). **Maximize the number of waves** -- more waves provide better quality gating and coordination points.

### Wave Types

| Type | Executor | Description |
|------|----------|-------------|
| `bootstrap` | Lead (sequential) | Foundation setup, contracts, scaffolding |
| `research` | Wave subagents (parallel) | Analysis, information gathering |
| `design` | Wave subagents (parallel) | Architecture decisions, interface definitions |
| `implementation` | Wave subagents (parallel) | Core build work |
| `supporting` | Wave subagents (parallel) | Secondary features, integrations |
| `testing` | Wave subagents (parallel) | QA, security, validation |
| `documentation` | Wave subagents (parallel) | Docs, cleanup, optimization |
| `integration` | Lead (sequential) | Merge, final testing, polish |

Not all wave types are needed for every request, but prefer MORE granular waves over fewer consolidated ones. If work items span multiple concerns (e.g., research AND implementation), split them into separate waves.

### Gate Sentinel Pattern

```
Wave 0 tasks -> GATE-0 (addBlockedBy: all wave-0 tasks)
Wave 1 tasks (addBlockedBy: [GATE-0]) -> GATE-1 (addBlockedBy: all wave-1 tasks)
Wave 2 tasks (addBlockedBy: [GATE-1])
```

Team lead validates quality gate criteria before marking GATE-N complete, which unblocks the next wave. No custom orchestration code -- uses built-in TaskCreate dependencies.

### Quality Gates

Each wave has a quality gate with:
- **criteria**: List of conditions to verify
- **verification_method**: How to check (file_exists, output_exists, test_result, manual_review)

Example:
```yaml
quality_gate:
  name: "GATE-0: Foundation Ready"
  criteria:
    - "Project structure created"
    - "Database schema defined"
    - "Interface contracts documented"
  verification_method: file_exists
```

See @.claude/rules/core/controllers.md for detailed validation checkpoint specifications and guard command patterns.

## Interface Contracts

Contracts define interfaces between teams -- agreements established in one wave and consumed in the next.

### Contract Schema

```yaml
contracts:
  - provider: platform       # Team that creates the interface
    consumer: product        # Team that depends on it
    interface: "Database Schema"
    established_in: 0        # Wave where provider creates artifact
    consumed_in: 1           # Wave where consumer uses it
    artifacts: ["schema.prisma", "src/models/"]
```

### Contract Enforcement

1. **At gate validation**: Verify contract artifacts exist before marking gate complete
2. **During parallel execution**: Consumer tasks reference contract artifacts in instructions
3. **At final gate**: Verify all contracts established and consumed

### Contract Status

Tracked in coordination_log.yaml:
```yaml
contracts:
  - interface: "Database Schema"
    status: fulfilled  # established | consumed | fulfilled | violated
```

## Template and Wave Execution (DEFAULT)

**Templates with wave execution are the DEFAULT for tier 3+ requests.** Auto-selection runs automatically. Only fall back to flat execution when:
- `--no-template` flag is explicitly used
- No template scores above the confidence threshold (0.6)
- No templates exist in `cagents-memory/_system/templates/teams/`

When flat execution is used, the system behaves as a simple parallel distribution without waves or gates.

## Integration Points

- **trigger + router + planner**: Available for routing and planning (used by /run, optionally by /team via `mode: team_planning_only`)
- **`/team` skill loop**: Decomposes the request directly and executes waves by spawning subagents as concurrent `Agent()` calls (implicit teams — no TeamCreate). The standalone `team-trigger` agent was removed in v12.0.0 — this work is now inlined in the `/team` SKILL.md.
- **controller delegate-mode wrapper**: The `/team` lead applies the delegate-mode pattern directly to its chosen controller, validates gates, and tracks contracts (the standalone `team-lead-adapter` agent was removed in v12.0.0 — this is now an inline pattern in `/team`)
- **orchestrator**: Detects team mode, routes appropriately
- **Hooks**: team-start.cjs, team-stop.cjs, team-task-complete.cjs, teammate-idle-handler.cjs

## Configuration

Project override (`.cagents/team_config.yaml`):
```yaml
team_mode:
  enabled: true
  min_work_items: 3
  max_team_size: 8
  prefer_teams_for_tiers: [3, 4]
  teammate_mode: in-process    # in-process (default) | tmux | iterm2 | auto — tmux/iterm2 are experimental-path only
```

---

**Part of**: cAgents Core Infrastructure - Built-in Agent Teams Integration
