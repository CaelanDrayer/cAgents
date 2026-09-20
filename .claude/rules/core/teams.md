---
paths:
  - ".claude/rules/core/teams.md"
  - ".claude/rules/playbooks/pat-cross-teammate-request.md"
  - "agents/team-bootstrap.md"
  - "agents/team-bootstrap/**"
  - "agents/team-lead.md"
  - "agents/team-lead/**"
  - "agents/wave-reviewer/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/team-*.cjs"
  - ".claude/hooks/teammate-*.cjs"
  - "cagents-memory/_system/templates/teams/**"
  - "cagents-memory/sessions/team_*/team/**"
  - "tests/hooks/team-*.test.js"
  - "tests/hooks/teammate-*.test.js"
  - "tests/v12/*team*.test.js"
---

# Team Coordination Patterns

Guidelines for parallel team execution in cAgents using concurrent-Agent waves.

> **API change (Claude Code v2.1.178)**: `TeamCreate` and `TeamDelete` were
> **REMOVED**. Agent teams are now **implicit**. There is nothing to create and
> nothing to delete, and the cleanup is automatic at session end. Every
> reference to `TeamCreate` or `TeamDelete` in this file is **historical**, and
> it means "removed in 2.1.178, do not call". The DEFAULT execution model is
> **concurrent-Agent waves**, which the sections below describe. That model
> works in every harness. Named background teammates, and tmux or iTerm2 panes,
> are demoted to an OPTIONAL EXPERIMENTAL path. This file flags that path
> clearly.

## Overview

**Core Architecture**: `/team` decomposes the request into work items. Those
work items spread across as many waves as the work needs. Teams are
**implicit**, so the lead does NOT create a team.

For each wave, the lead spawns all wave subagents as **concurrent `Agent()`
calls issued in one message**. Those calls run synchronously, with
`run_in_background: false`. The lead therefore collects every wave result
together, validates the GATE, and then proceeds. Each wave subagent is a
controller agent, and it delegates to execution agents directly through the
Agent tool. More waves give better quality gating.

> Parallelism now comes from two sources. The first source is the concurrent
> `Agent()` subagent calls in each wave. The second source is each wave
> subagent, which recursively spawns its OWN subagents up to 5 levels deep.
>
> A subagent that needs a different specialty spawns that specialist as its own
> subagent. That move is downward nesting, and it replaces a request routed
> sideways through the lead. Downward nesting removes the lead-as-router
> bottleneck. It also removes the SendMessage overhead and the peer_request
> overhead.
>
> "Teammate" was the label for a wave unit under the named-teammate feature,
> which is now demoted. The wave unit is a subagent.

Team Mode gives you N-wave parallel execution. It has these parts:
- **Maximum wave decomposition**: /team breaks the request into work items
  across 3-10 waves. More waves are better.
- **Concurrent-Agent wave spawn**: for each wave, the lead issues all wave-K
  `Agent()` calls in ONE assistant message, synchronously, with
  `run_in_background: false`. Many tool uses in a single message run
  concurrently.
- **Implicit teams**: there is no `TeamCreate` call and no `TeamDelete` call.
  The team exists as the set of concurrently-spawned subagents, and the cleanup
  is automatic at session end.
- **GATE sentinel quality checks**: the lead validates between waves, before it
  proceeds.
- **Coordination tools**: `Agent` spawns the subagents. `TaskCreate`,
  `TaskUpdate`, `TaskList`, and `TaskGet` give task visibility and the
  gate-sentinel dependencies. `SendMessage` carries the messages between the
  lead and a named teammate. `SendMessage` is **experimental-path only**, and
  the default subagent-wave path does not use it.
- **Display**: `teammateMode` defaults to `in-process` (v2.1.179). The tmux
  split panes and the iTerm2 split panes are an EXPERIMENTAL-path option.
- **Every work item via controller**: wave subagents ARE controllers. They spawn
  execution agents directly through the Agent tool.
- **Shared task lists**: the built-in TaskCreate and TaskList keep the list at
  `~/.claude/tasks/{team-name}/`.
- **Strategic Mode (v12.2.0+)**: for a cross-domain request, `/team` auto-enables
  strategic mode. Waves 0, 1, and 2 hold the C-suite deliberation, and waves 3
  to N hold the per-domain dispatch. `router.domain_count >= 2` drives the
  auto-detection. A user can override it with `--strategic` to force it on, or
  with `--no-strategic` to force it off. The 9 leadership agents act as Wave 0
  and Wave 1 subagents. They are CEO, CTO, CFO, CMO, COO, CHRO, CCO, CRO, and
  CPO. See `.claude/skills/team/reference/strategic-mode.md` for the full
  protocol, the brief schema, the escalation, and the examples.
- **Independent contexts**: each subagent has its own context window.

## CRITICAL: Wave Subagents ARE Controllers That Spawn Execution Agents Directly

**This is the principle of team mode, and it is unconditionally true.** Wave
subagents do NOT implement work items directly. The lead spawns each wave
subagent as a controller agent, such as `cagents:tech-lead`. That controller
delegates to execution agents through the Agent tool. It then spawns
`cagents:reviewer` to validate the work.

Claude Code 2.1.172 and cAgents v12.17.0 changed the tool surface. A subagent
spawned at depth 1 now keeps the `Agent` tool reliably. It spawns its execution
agents and its reviewer in the normal way.

```
Subagent (controller, e.g., tech-lead) -> Agent(cagents:backend-developer)
  -> backend-developer implements work item
  -> Agent(cagents:reviewer) validates against acceptance criteria
  -> PASS or REVISE (max 2 rounds)
```

Wave subagents MAY also spawn deeper sub-agents inside the 5-level nesting
budget. The skill loop is depth 0, and the 5 levels are the subagent generations
beneath it. Do this when a work item genuinely needs it. The execution agent of
a subagent can spawn its own helper sub-agent, and that chain continues up to
the ceiling.

**Wave subagents spawn execution agents DIRECTLY. They do not re-enter /act
through the Skill tool.** On CC 2.1.172 a nested `/act` call from a subagent is
possible inside the depth budget. The design of cAgents avoids that call, **by
intent, for cost and for clarity**.

The full /act pipeline holds the orchestrator, the planner, the controller, and
the validator. Re-entry into that pipeline for the work items of a single wave
duplicates the enrichment that the lead already did in Wave 0. It also burns
extra context and extra tokens. Spawn the execution agent directly instead.

**Anti-patterns (NEVER DO):**
- Do not tell a subagent to invoke /act. Re-entry into the full pipeline
  duplicates the Wave 0 enrichment and wastes tokens. Spawn execution agents
  directly instead. This rule is a design choice for cost and for clarity, and
  it is NOT a harness limit.
- Do not let the team lead do implementation work.
- Do not let a wave subagent implement a work item directly in place of a spawn
  of an execution agent. The one exception is the Nesting-Ceiling fallback
  below, when the `Agent` tool is verifiably absent.
- Do not let a wave subagent answer a question directly in place of a
  delegation. The one exception is again a verifiably absent `Agent` tool.

Spawned subagents carry an advisory per-subagent context aim. See
`.claude/rules/playbooks/pat-context-budget-tiers.md` for the figures, and for
the delegation levers that hold them. The aim applies to every wave subagent
you spawn. It also applies to every agent that they spawn beneath them.

## Nesting-Ceiling Degradation: Agent Tool Absent Only at the Depth Budget (repositioned in v12.17.0)

**Current model (CC ≥ 2.1.172).** Subagents spawn their own subagents up to
**5 levels deep**, and the skill loop is depth 0. The `Agent` tool is present at
every level from depth 1 through depth 5. Subagent controllers therefore spawn
execution agents and reviewers reliably. Delegation is the expected behavior at
every level.

**Graceful degradation is a DEFENSIVE FALLBACK**, and it is not the expected
depth-1 behavior. It triggers ONLY when the `Agent` tool is genuinely absent.
That happens at the real nesting **ceiling**, where a subagent at depth 5 cannot
spawn a depth-6 child. It also happens if an older harness or a future harness
regresses the capability.

Make sure the tool is absent before you degrade. On CC ≥ 2.1.172 the `Agent`
tool is normally present at depths 1 through 4. The fallback applies to every
spawning skill, and to every agent type. When `Agent` is verifiably absent,
degrade to direct execution and self-validation. Do not fail the work item.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the
canonical fallback pattern. That playbook holds the
tool-inventory-check-before-BLOCKED rule, the scope of the ceiling and of a
harness regression, and the historical depth-1 context from before v12.17.0.

## CRITICAL: Spawn Wave Subagents, Not Just Tasks

**The most common failure mode is the creation of tasks with no real subagent
spawn.** There is no `TeamCreate` step, because the tool was removed in 2.1.178
and teams are implicit. For each wave the `/team` lead MUST do BOTH steps:
1. **TaskCreate** -- create the work items of the wave as shared tasks. They
   give visibility and the gate-sentinel dependencies.
2. **Spawn wave subagents via concurrent `Agent()` calls in ONE message** --
   issue all wave-K `Agent()` calls together, synchronously, with
   `run_in_background: false`. Each `Agent()` call is a real subagent, and that
   subagent is a controller agent. Many tool uses in a single message run
   concurrently, and that gives true within-wave parallelism.

Both steps are needed. If you create the tasks but spawn no subagent to execute
them, /team appears to "never spin out team members." That is the primary bug.
The team is implicit. It IS the set of subagents you spawn, and nothing needs to
be created first.

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

**Why `run_in_background: false`**: since v2.1.198 subagents are
**background-by-default**. Each wave-K `Agent()` call MUST therefore set
`run_in_background: false` explicitly. That setting collects the results of a
wave synchronously, so the lead can validate GATE-K before the next wave.

**CRITICAL: Maximize waves.** More waves give more quality gates, and more
quality gates give higher quality output. There is nothing wrong with more
waves. Prefer 5-7 waves over 2-3 waves.

## Team Coordination Mechanism (Implicit Teams)

Teams in cAgents are **implicit**. The subagents that the lead spawns form the
team, and no API call creates it. The mechanism uses these callable tools:

| Tool | Purpose |
|------|---------|
| **Agent** | Spawn a subagent, which is a controller agent. Concurrent `Agent()` calls in one message make a parallel wave. That is how a "team" comes into existence, and there is no separate create step. |
| **TaskCreate** | Create work items as shared tasks |
| **TaskUpdate** | Update task status, set owner, manage dependencies |
| **TaskList** | View all tasks and their status |
| **TaskGet** | Read full task details |
| **SendMessage** | Direct messaging between the lead and a named teammate. It is **experimental-path only**, and it auto-resumes a stopped named teammate. The default subagent-wave path does not use it, because that path collects its results synchronously. |

> **Removed in 2.1.178. Do not call them**: `TeamCreate` created a team, and
> `TeamDelete` cleaned one up. Teams are now implicit, and the cleanup is
> automatic at session end. These tools no longer exist. Any mention of them
> below is historical.

Key behaviors:
- Concurrent `Agent()` calls in a single message run in parallel. Those calls
  ARE the wave.
- With `run_in_background: false`, the lead receives all the wave results
  together. That is synchronous collection.
- Named-teammate messages arrive automatically, and the lead does no polling.
  This behavior is **experimental path only**, because the default
  subagent-wave path collects its results synchronously.
- Task claiming uses a file lock, and that lock prevents a race condition.
- The shared task list is at `~/.claude/tasks/{team-name}/`, and TaskCreate
  populates it.

## Claude Code Agent Teams: Capabilities and Limitations

> Most items below describe the interactive **experimental named-teammate
> path**. That path covers the panes, the direct teammate interaction, and the
> plan-approval step. The DEFAULT concurrent-Agent wave model uses none of them.
> It issues synchronous `Agent()` calls and nothing more. Task dependencies,
> self-claiming, and worktree isolation apply to both paths.

### Capabilities
- **Direct teammate interaction**: a user can message a teammate directly. Push
  Shift+Down in the in-process mode, or click a pane in the split mode.
- **Plan approval mode**: use `CLAUDE_CODE_PLAN_MODE_REQUIRED` to make each
  teammate plan before it implements. The lead then reviews each plan, and it
  approves or rejects that plan.
- **Teammate model override**: specify a model for each teammate, as in "Use
  Sonnet for each teammate".
- **Task dependencies**: a task can block another task. A blocked task
  auto-unblocks when its dependencies complete.
- **Self-claiming**: after a teammate finishes, it picks up the next unassigned
  and unblocked task on its own.
- **In-process navigation**: push Shift+Down to cycle the teammates, Enter to
  view one, Escape to interrupt one, and Ctrl+T for the task list.
- **Worktree isolation with sparse checkout**: use `isolation: "worktree"` when
  you spawn a teammate, for parallel file safety. In a monorepo, add
  `worktree.sparsePaths` to the settings. That field limits the checkout of each
  teammate to the modules that it needs:

```json
{
  "worktree": {
    "sparsePaths": ["src/module-a/", "shared/"]
  }
}
```

This setting cuts the checkout time by a large amount. It also stops a teammate
from an accidental change to a file outside its assigned module.

### Limitations (Claude Code Enforced)
- **No session resumption**: `/resume` and `/rewind` do not restore an
  in-process teammate.
- **SendMessage auto-resume**: you CAN re-activate a stopped teammate. Send it a
  message with SendMessage. Use this for follow-up work, so that you do not
  spawn a fresh agent.
- **No nested teams**: a teammate cannot manage its own named team. Only the
  lead spawns wave teammates. A teammate DOES keep the `Agent` tool, and it
  spawns execution agents and reviewers to depth 5. That is normal delegation,
  and it is not a nested team.
- **One team per session**: the implicit team lives for one session. The cleanup
  is automatic at session end, and there is no `TeamDelete` call.
- **Lead is fixed**: you cannot promote a teammate to lead, and you cannot
  transfer the leadership.
- **Permissions set at spawn**: every teammate starts with the permission mode
  of the lead. You can change one teammate after the spawn, but not at spawn
  time.
- **Task status can lag**: a teammate sometimes fails to mark its task
  completed, and that blocks the dependent tasks.
- **Shutdown can be slow**: a teammate finishes its current request before it
  shuts down.
- **Split panes require tmux or iTerm2**: the VS Code terminal, the Windows
  Terminal, and Ghostty do not support them.

## Display Modes (teammateMode)

`teammateMode` controls how Claude Code displays a spawned teammate. It does NOT
affect the DEFAULT concurrent-Agent execution model. Synchronous concurrent
`Agent()` waves work in every mode. The split-pane display of tmux and iTerm2 is
tied to the EXPERIMENTAL named-teammate path only.

| Mode | Behavior | Requirements | Path |
|------|----------|--------------|------|
| `"in-process"` (default, v2.1.179) | All teammates in main terminal (Shift+Up/Down) | None | Default + experimental |
| `"tmux"` | Force tmux split panes -- each teammate in own pane | tmux installed | **EXPERIMENTAL** only |
| `"iterm2"` | iTerm2 split panes | iTerm2 | **EXPERIMENTAL** only |
| `"auto"` | tmux/iTerm2 if inside a supporting session, otherwise in-process | None | Experimental if panes available |

The shipped default is `in-process`, because reliability comes first. Split
panes need the experimental named-teammate path, which is
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. They also need a tmux terminal or an
iTerm2 terminal. They are not available in the VS Code terminal, in the Windows
Terminal, or in Ghostty.

Configure in settings.json:
```json
{
  "teammateMode": "in-process"
}
```

Per-session: `claude --teammate-mode in-process`

## OPTIONAL: Experimental Named-Background-Teammate Path

> **EXPERIMENTAL and harness-variable. This is NOT the default, and this path is
> not part of the default subagent-wave model.** Use it ONLY when
> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` AND the harness supports interactive
> agent teams. If the feature is unavailable, you MUST fall back to the DEFAULT
> concurrent-Agent subagent-wave path above. Never fail the wave.

The DEFAULT concurrent-Agent wave model issues synchronous `Agent()` calls, one
message per wave. It puts reliability first, and it works in every harness. This
experimental path trades that reliability for named, long-lived, background
teammates. You can message such a teammate by name, and you can display it in a
tmux pane or an iTerm2 pane.

When the gate is satisfied, the lead MAY instead:

1. **Spawn named background teammates**: call
   `Agent({ name, run_in_background: true })`. The spawn creates the team
   implicitly, and there is still no `TeamCreate` call. Any `team_name` argument
   is accepted, and then it is ignored.
2. **Coordinate by name**: `SendMessage({ to: name })` messages one specific
   teammate. A message to a stopped teammate **auto-resumes it by name**
   (v2.1.77). Use the shared Task list for work distribution and for
   self-claiming. That list uses `TaskCreate`, `TaskUpdate`, and `TaskList`.
3. **Display in panes**: `teammateMode: "tmux"` or `teammateMode: "iterm2"` puts
   each teammate in its own split pane. This needs tmux or iTerm2.

**Fallback rule (mandatory)**: the lead reverts to the DEFAULT synchronous
concurrent-Agent wave model in three cases. The first case is an unset
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. The second case is an unavailable
`Agent({ run_in_background: true, name })`. The third case is a harness with no
support for interactive teams. The default path never depends on an experimental
capability.

**Hook dependency**: the `TeammateIdle` hook and the `TaskCompleted` hook
support THIS experimental path only. Their files are
`teammate-idle-handler.cjs` and `team-task-complete.cjs`. They fire for a named
background teammate, and they are no-ops on the default concurrent-Agent path.
The default path does not depend on them.

## When to Use Teams

### Use Team Mode
- A tier 3+ complex workflow with many work items.
- Work items that can execute in parallel, with few dependencies.
- A time-sensitive delivery that needs a speedup.
- A large feature with distinct components.

### Use Standard Mode
- A tier 2 moderate workflow.
- Work items that are highly sequential.
- A small change with little parallelism benefit.
- Any case where the team overhead is larger than the benefit.

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

### Wave Subagent Spawn (implicit team, with no TeamCreate call)

There is no team-creation call. The lead spawns a wave: it issues all wave-K
`Agent()` calls in ONE message, synchronously. The set of concurrent subagents
IS the team.

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

**Do NOT pass `name` on this path.** `name` forces the spawn into the
background, and it overrides `run_in_background: false` in silence. This was
CONFIRMED on Claude Code 2.1.221. The lead then returns in the belief that the
wave completed, and it does the work of the wave itself.

An unnamed spawn is the only way to get a blocking spawn. Track each subagent
with a `TaskCreate` whose subject matches its `description`. That task is the
source of per-subagent visibility, and `name` is not. `name` belongs only to the
experimental named-teammate path below, where you collect each result explicitly
with `SendMessage`. See @.claude/rules/core/delegation.md § Synchronous Spawning
for the precedence.

### Task Distribution

```javascript
// Create tasks for each work item
TaskCreate({
  subject: "TASK-01: Implement user model",
  description: "Execute via /act: ...",
  activeForm: "Implementing user model"  // optional
})

// Set dependencies
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] })
```

### Subagent Communication

The lead spawns wave subagents as controller agents, through the Agent tool. It
does not spawn them through SendMessage. Each subagent receives its work item
prompt directly in the `Agent()` call. The lead then collects the result
synchronously, with `run_in_background: false`. **No SendMessage is needed on
the default subagent-wave path.**

The rest of this subsection describes the **experimental named-teammate path
only**. On that path the SendMessage channel between the lead and a named
teammate handles the status updates and the shutdown requests:

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

**SendMessage auto-resume** (CC 2.1.77): a message to a stopped teammate resumes
that teammate automatically. The team lead can use this to re-activate a
teammate that completed its wave work. The lead then needs no new agent
instance:

```javascript
// Resume a stopped teammate by sending it a message
SendMessage({
  type: "direct",
  recipient: "teammate-2",
  content: "New work available: TASK-07 is now unblocked. Please claim and execute."
})
```

Update your expectations of the teammate lifecycle. A teammate that finishes a
wave and stops is NOT gone. You can re-activate it with SendMessage, for a
follow-up work item.

## Cross-Teammate Request Pattern

> **LEGACY, for the experimental named-teammate path only. It is OBSOLETE under
> the default subagent model.** The founding premise of this pattern was that
> Claude Code forbids nested teams, so a teammate that needs help must route a
> request *sideways* through the lead. That premise is obsolete under the
> default subagent-wave model.
>
> A wave subagent that needs another specialty spawns that specialist as its OWN
> downward sub-subagent, with depth-5 nesting. On the default path there is **no
> peer_request, no sideways peer messaging, and no lead-as-router hop**. The
> protocol below stays only for the experimental named-background-teammate path.

A teammate sometimes needs help from another teammate. Claude Code forbids
nested teams, and it forbids direct messaging between two teammates, because the
lead is fixed. The aggressive-delegation rule also forbids the lead from doing
implementation work itself.

The `peer_request` protocol resolves the gap. Teammate A emits a structured
request. The lead routes that request through a 4-branch decision tree. The
requested work then happens through a peer, or through a fresh spawn. It never
happens through the hands of the lead.

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

**Aggressive-delegation invariant**: the lead has four valid actions on a
peer_request. They are a SendMessage, an `Agent()` spawn, a PROMOTE, and a
REJECT. The lead never reads the requested artifact and writes it itself. The
lead never uses Edit, Write, or Bash to implement the requested work. See
`.claude/rules/core/delegation.md` § Controller-Side Corollary.

Teammate A reports `status: NEEDS_CONTEXT`. That report carries an optional
`requested_peer: teammate-{name}` field, and an optional
`peer_request_ref: outputs/wave-{K}/peer_requests/REQ-{N}.yaml` field. Those two
fields extend the 4-status protocol. See
`.claude/rules/playbooks/pat-subagent-status-protocol.md`.

See @.claude/rules/playbooks/pat-cross-teammate-request.md for the canonical schema, decision tree, worked example, and risk table.

### Cleanup

Cleanup is **automatic**. There is no `TeamDelete` call, because the tool was
removed in 2.1.178. A synchronously-spawned wave subagent ends when it returns
its result. Any implicit team state that is left is torn down at session end.
The lead does not manage the team teardown.

> Historical: `TeamDelete()` was the teardown call before 2.1.178. Do not call
> it, because it no longer exists.

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

**Self-Claiming (Preferred)**: a subagent checks TaskList and claims an
available task, after it completes its current work. The built-in file lock
prevents a race condition.

**Direct Assignment**: the lead assigns a task to a specific subagent. It uses
TaskUpdate to set the owner, and it uses SendMessage to tell that subagent.

## Shared Task List

The built-in tools manage the tasks. A task has these states:

```
pending --> in_progress --> completed
```

Dependencies: use `addBlockedBy` in TaskUpdate. A blocked task auto-unblocks
when its dependencies complete.

## Fallback Behavior

### Unsuitable Request Fallback

A request can be unsuitable for team execution. Three signals show this: tier 2,
too few work items, and work items that are all sequential. In that case, do
these steps:
1. Tell the user: "Request better suited for standard execution."
2. Delegate to `/act` automatically, for standard orchestration.

### Display Mode Fallback

- `"auto"` mode: it falls back to in-process automatically, if the session is
  not inside tmux.
- `"tmux"` mode: it needs an installed tmux. If tmux is unavailable, it uses
  in-process.
- `"in-process"`: it works in any terminal.

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
- Send a status query with SendMessage.
- If the subagent does not respond, spawn a replacement subagent.
- Reassign the work item.

### Deadlock Detection
- Find the circular dependencies with TaskList.
- Break the cycle: make the items sequential.
- Warn the user about the degraded parallelism.

### Partial Completion
- Complete the part that you can complete.
- Write down the partial results clearly.
- Return the status of each item that succeeded, and of each item that failed.

## Team Templates

These are pre-built team structures for common project types. A template defines
the teams, the delivery waves, the quality gates, and the interface contracts.

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

cAgents auto-selects a template. It scores each template against the request:

```
Score = keyword * 0.4 + domain * 0.2 + signal * 0.2 + items * 0.2
Select top scorer above confidence_threshold (0.6)
```

Override with flags: `--template <id>`, `--no-template`, `--waves <N>`

### Template Location

`cagents-memory/_system/templates/teams/` with `_index.yaml` catalog.

## Wave Execution

Waves are delivery phases. TaskCreate dependencies enforce them, through the
gate sentinel tasks. **Maximize the number of waves.** More waves give better
quality gating, and they give more coordination points.

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

Not every request needs every wave type. Prefer MORE granular waves over fewer
consolidated ones. If the work items span two or more concerns, such as research
AND implementation, split them into separate waves.

### Gate Sentinel Pattern

```
Wave 0 tasks -> GATE-0 (addBlockedBy: all wave-0 tasks)
Wave 1 tasks (addBlockedBy: [GATE-0]) -> GATE-1 (addBlockedBy: all wave-1 tasks)
Wave 2 tasks (addBlockedBy: [GATE-1])
```

The team lead validates the quality gate criteria before it marks GATE-N
complete. That mark unblocks the next wave. There is no custom orchestration
code, because this uses the built-in TaskCreate dependencies.

### Quality Gates

Each wave has a quality gate. The gate has two fields:
- **criteria**: the list of conditions to check.
- **verification_method**: how to do the check. The four methods are
  file_exists, output_exists, test_result, and manual_review.

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

A contract defines an interface between two teams. It is an agreement that one
wave establishes, and that the next wave consumes.

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

1. **At gate validation**: make sure the contract artifacts exist, before you
   mark the gate complete.
2. **During parallel execution**: each consumer task references the contract
   artifacts in its instructions.
3. **At final gate**: make sure that every contract is established, and that
   every contract is consumed.

### Contract Status

Tracked in coordination_log.yaml:
```yaml
contracts:
  - interface: "Database Schema"
    status: fulfilled  # established | consumed | fulfilled | violated
```

## Template and Wave Execution (DEFAULT)

**Templates with wave execution are the DEFAULT for a tier 3+ request.** The
auto-selection runs automatically. Fall back to flat execution in these three
cases only:
- The user passes the `--no-template` flag explicitly.
- No template scores above the confidence threshold of 0.6.
- No template exists in `cagents-memory/_system/templates/teams/`.

Under flat execution the system does a plain parallel distribution. There are no
waves, and there are no gates.

## Integration Points

- **trigger + router + planner**: these agents are available for routing and for
  planning. `/act` uses them. `/team` can use them through
  `mode: team_planning_only`.
- **`/team` skill loop**: it decomposes the request directly. It then executes
  the waves: it spawns the subagents as concurrent `Agent()` calls. Teams are
  implicit, so there is no TeamCreate call. Release v12.0.0 removed the
  standalone `team-trigger` agent, and this work is now inline in the `/team`
  SKILL.md.
- **controller delegate-mode wrapper**: the `/team` lead applies the
  delegate-mode pattern directly to its chosen controller. It validates the
  gates, and it tracks the contracts. Release v12.0.0 removed the standalone
  `team-lead-adapter` agent, and this is now an inline pattern in `/team`.
- **orchestrator**: it detects team mode, and it routes the request correctly.
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
