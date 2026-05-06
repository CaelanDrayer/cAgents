---
paths:
  - "core/team-*/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/team-*.cjs"
  - ".claude/hooks/teammate-*.cjs"
  - "cagents-memory/sessions/team_*/**"
---

# Team Coordination Patterns

Guidelines for parallel team execution in cAgents V9.2 using Claude Code's built-in agent teams.

## Overview

**Core Architecture**: `/team` decomposes the request into work items across as many waves as the work requires, creates a real agent team via TeamCreate, and spawns teammates per-wave who are controller agents that delegate to execution agents directly via Agent tool. Each teammate appears as a tmux pane (when teammateMode=tmux). More waves = better quality gating.

Team Mode enables N-wave parallel execution with:
- **Maximum wave decomposition**: /team breaks the request into work items across 3-10 waves (more waves preferred)
- **Per-wave spawn cycles**: Teammates are spawned fresh for each wave, shut down after wave completes
- **GATE sentinel quality checks**: Lead validates between waves before proceeding
- **Built-in agent teams**: TeamCreate, SendMessage, TaskCreate/TaskList for coordination
- **teammateMode: tmux**: Each teammate in its own tmux split pane (managed by Claude Code)
- **Every work item via controller**: Teammates ARE controllers that spawn execution agents directly via Agent tool
- **Shared task lists**: Built-in TaskCreate/TaskList at `~/.claude/tasks/{team-name}/`
- **Independent contexts**: Each teammate has its own context window

## CRITICAL: Teammates ARE Controllers That Spawn Execution Agents Directly

**This is the principle of team mode when the harness exposes the Agent tool to teammates.** When Agent is available, teammates do NOT implement work items directly. Each teammate is spawned as a controller agent (e.g., `cagents:engineering-manager`) that delegates to execution agents via Agent tool, then spawns `cagents:reviewer` to validate.

```
Teammate (controller, e.g., engineering-manager) -> Agent(cagents:backend-developer)
  -> backend-developer implements work item
  -> Agent(cagents:reviewer) validates against acceptance criteria
  -> PASS or REVISE (max 3 rounds)
```

**Teammates do NOT invoke /run via Skill tool.** Claude Code enforces a 2-level subagent nesting limit. Since /team teammates are already level 1 subagents, they spawn execution agents at level 2 directly.

**Anti-patterns (NEVER DO):**
- Telling a teammate to invoke /run (exceeds nesting limit)
- Having the team lead do implementation work
- Having teammates implement directly without spawning execution agents *(unless the Known Harness Limitation below applies)*
- Having teammates answer questions directly instead of delegating *(unless Agent is unavailable)*

## Known Harness Limitation: Agent Tool May Be Absent in Teammate Tool Surface

**Empirically observed (CC 2.1.x, cAgents v11.1.4 and earlier):** When a controller agent (e.g., `cagents:engineering-manager`) is spawned as a /team teammate, the Claude Code runtime tool surface for that teammate may NOT include the `Agent` tool — even when the controller's SKILL.md frontmatter correctly declares `allowed-tools: Agent Read Grep Glob Write Edit Bash TodoWrite`. The `TodoWrite` and `TaskUpdate` tools are also frequently absent at this nesting level.

**Root cause:** Claude Code platform behavior for plugin-namespaced (`cagents:*`) subagents at depth >= 1. The 2-level subagent nesting limit (lead at level 0, teammates at level 1) is enforced upstream by withholding the spawning tool (`Agent`) from level-1 plugin subagents, regardless of what the SKILL.md `allowed-tools` declares. cAgents config (`.claude/settings.json`, `.claude-plugin/plugin.json`) cannot override this — there is no documented CC setting that re-exposes `Agent` to nested plugin subagents.

**Evidence chain (session `team_doc-update-plugin-audit_260503_001`):**
- 7 sampled controllers (engineering-manager, backend-lead, frontend-lead, architect, tech-lead, qa-lead, operations-manager) all declare `allowed-tools: Agent ...` in their SKILL.md frontmatter — verified correct.
- Wave-1 controllers reported the missing-tool symptom directly (`outputs/audit/rules-count.yaml` lines 61-69).
- Wave-2 and Wave-3 teammates independently confirmed the deferred-tools list excluded `Agent`, `TodoWrite`, and `TaskUpdate` at their nesting level.
- `.claude/settings.json` contains no `agent` block restricting tools; `.claude-plugin/plugin.json` declares no per-agent tool restriction. The limit is enforced upstream by Claude Code, not by cAgents config.

**Graceful degradation rule:** When a teammate controller discovers that the `Agent` tool is unavailable in its runtime surface, it MUST gracefully degrade to direct execution rather than failing the work item:

1. **Direct execution**: The teammate executes the work item itself using the tools it does have (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`).
2. **Reviewer skip**: Skip the `Agent(cagents:reviewer)` validation call — it is not available. Instead, the teammate self-validates against acceptance criteria using the 15-check execution self-validation protocol (see `.claude/rules/core/resources/execution-self-validation.md`).
3. **Self-validation logging**: Write the self-validation result to `outputs/task-{N}/self-validation.yaml` with the standard `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` field.
4. **Lead-side review (optional)**: The team lead, which DOES have Agent at level 0, can run a wave-N+1 review pass using `Agent(cagents:reviewer)` against any teammate output that needs deeper validation.

**This degradation is acceptable for /team workflows.** It is NOT acceptable for `/run` workflows, where controllers run at level 1 with the lead-equivalent tool surface and Agent is available — there, the reviewer-loop pattern remains mandatory.

**Future work:** If a future Claude Code version exposes `Agent` to plugin-namespaced level-1 subagents (or if a per-spawn `allowed-tools` flag becomes available on the Agent tool itself), this limitation block can be removed and the unconditional "Teammates ARE Controllers That Spawn Execution Agents" pattern restored. Until then, both patterns are valid: delegation when Agent is exposed, direct execution + self-validation when it is not.

### Upstream Configuration Null-Finding (PHASE-N1, V11.1.13)

**Confirmed via `claude-code-guide` agent (May 2026):** the public Claude Code documentation at `docs.claude.com/docs/en/` exposes **no** documented mechanism for re-enabling the `Agent` tool on a depth-1 plugin-namespaced subagent. Specifically:

- No `settings.json` key (project, user, or managed-policy scope) re-exposes `Agent` to nested plugin subagents.
- No `.claude-plugin/plugin.json` field unlocks the spawning tool for `cagents:*` agents at depth ≥ 1.
- No documented environment variable (e.g., `CLAUDE_CODE_*`) controls the depth-1 stripping behavior.
- No per-spawn `allowed-tools` override on the Agent tool itself can re-add a stripped tool to the spawned agent's surface.

This null-finding strengthens the "this is upstream Claude Code platform behavior, not cAgents config" position. Agents and reviewers MUST NOT propose `settings.json` / `plugin.json` / env-var fixes for the depth-1 Agent-tool stripping — the limitation is enforced in the Claude Code runtime, not in cAgents-controllable configuration. The graceful-degradation pattern above remains the only correct response.

**Empirical reproduction count (as of V11.1.13):** 3 sessions —
- `team_doc-update-plugin-audit_260503_001` (original W6 W1 audit, May 3 2026)
- `team_continue-cagents-w6_260505_001` (W6 W1 spawn-crash reproduction, May 5 2026)
- `team_phase11-w6-resume_260505_005` (W6 W2 graceful-degradation success, May 5 2026)

Lead direct execution per W6 W2 completed in ~25 minutes vs. the projected 1.5-hour teammate path, demonstrating that direct execution is often *faster* than spawning teammates for mechanical work — the bug's practical delivery impact is bounded.

See `cagents-memory/_knowledge/agent-tool-depth1-stripping.md` for the formal pattern + asks-for-Anthropic-upstream document, and `cagents-memory/_knowledge/cc-plugin-subagent-spawn-bug.md` for the original reproduction evidence.

## CRITICAL: Create Teams, Not Just Tasks

**The most common failure mode is creating tasks without spawning real team members.** The `/team` skill MUST execute ALL THREE steps:
1. **TeamCreate** -- Create a real agent team (NOT just a task list). This is what enables tmux panes.
2. **TaskCreate** -- Create work items as shared tasks
3. **Spawn teammates via Agent tool** -- Each Task call creates a real Claude Code instance (appears as tmux pane)

All three steps are required. Creating tasks without spawning teammates to execute them is the primary bug that causes /team to "never spin out team members."

## Execution Pipeline

```
/team <request>
    |
    Step 1: PARSE request and flags
    Step 2: DECOMPOSE into work items with MAXIMUM wave granularity (3-10 waves)
    Step 3: TeamCreate -- create team IMMEDIATELY
    Step 4: TaskCreate -- create tasks for ALL work items + GATE sentinels with wave dependencies
    Step 5: Execute Wave 0 (enrichment + bootstrap) -- lead does this sequentially
    |
    Step 6: FOR EACH Wave K (1 to N-1):
    |   +-- Spawn teammates for wave K (ALL at once, in parallel)
    |   |   +-- Teammate 1 (controller): Agent(execution agent) -> Agent(reviewer) --> Complete
    |   |   +-- Teammate 2 (controller): Agent(execution agent) -> Agent(reviewer) --> Complete
    |   |   +-- Teammate 3 (controller): Agent(execution agent) -> Agent(reviewer) --> Complete
    |   |                    (parallel within wave -- each in own tmux pane)
    |   +-- Monitor wave K via TaskList + teammate messages
    |   +-- Validate GATE-K when all wave K items complete
    |   +-- Shut down wave K teammates
    |   +-- Proceed to wave K+1 (AUTOMATIC)
    |
    Step 7: Execute final wave (integration + validation) -- lead does this
    Step 8: Shutdown remaining teammates + TeamDelete + report results
```

**Steps 3-6 are MANDATORY and IMMEDIATE. Do not pause or ask permission between waves.**

**CRITICAL: Maximize waves.** More waves = more quality gates = higher quality output. There is nothing wrong with more waves. Prefer 5-7 waves over 2-3 waves.

## Built-in Agent Teams

cAgents uses Claude Code's built-in agent teams feature, which provides:

| Tool | Purpose |
|------|---------|
| **TeamCreate** | Create team with shared task list |
| **TeamDelete** | Clean up team and task resources |
| **TaskCreate** | Create work items as shared tasks |
| **TaskUpdate** | Update task status, set owner, manage dependencies |
| **TaskList** | View all tasks and their status |
| **TaskGet** | Read full task details |
| **SendMessage** | Direct messaging between lead and teammates |

Key behaviors:
- Teammate messages arrive automatically (no polling)
- Idle notifications sent when teammates finish turns
- File-lock based task claiming prevents race conditions
- Team config at `~/.claude/teams/{team-name}/config.json`
- Task list at `~/.claude/tasks/{team-name}/`

## Claude Code Agent Teams: Capabilities and Limitations

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
- **No nested teams**: Teammates cannot spawn their own teams. Only the lead manages the team.
- **One team per session**: Clean up current team before starting a new one.
- **Lead is fixed**: Cannot promote a teammate to lead or transfer leadership.
- **Permissions set at spawn**: All teammates start with lead's permission mode. Can change individually after spawning, but not at spawn time.
- **Task status can lag**: Teammates sometimes fail to mark tasks completed, blocking dependents.
- **Shutdown can be slow**: Teammates finish current request before shutting down.
- **Split panes require tmux/iTerm2**: Not supported in VS Code terminal, Windows Terminal, or Ghostty.

## Display Modes (teammateMode)

| Mode | Behavior | Requirements |
|------|----------|--------------|
| `"auto"` (default) | tmux if inside tmux session, otherwise in-process | None |
| `"tmux"` | Force tmux split panes -- each teammate in own pane | tmux installed |
| `"in-process"` | All teammates in main terminal (Shift+Up/Down) | None |

Configure in settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Per-session: `claude --teammate-mode tmux`

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
3. TeamCreate -- create team and shared task list IMMEDIATELY
4. TaskCreate -- create ALL work items + GATE sentinels with wave dependencies
5. Execute wave 0 (enrichment + bootstrap) sequentially
6. FOR EACH wave K (1 to N-1):
   a. Spawn wave K teammates IN PARALLEL
   b. Monitor wave K via TaskList + teammate messages
   c. Validate GATE-K when all wave K items complete
   d. Shut down wave K teammates
   e. Mark GATE-K complete -> proceed to wave K+1
7. Execute final wave (integration + validation) sequentially
8. Shutdown remaining teammates + TeamDelete
```

**Steps 3-6 are MANDATORY and IMMEDIATE. Do not pause or ask permission between waves.**

**Wave count guidance:**
| Tier | Minimum waves | Typical waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

### Team Creation

```javascript
TeamCreate({
  team_name: "cagents-team-{session_id}",
  description: "Parallel execution of {request}"
})
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

### Teammate Communication

Teammates are spawned as controller agents via Agent tool (not via SendMessage). Each teammate receives its work item prompt directly in the Task call. Communication between lead and teammates uses SendMessage for status updates and shutdown requests:

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

### Cleanup

```javascript
// After all teammates shut down:
TeamDelete()
```

## Team Lead (Controller) Behavior

### Delegate Mode Enforcement

Team leads ONLY coordinate. They NEVER implement.

```yaml
allowed_actions:
  - Distribute work items to teammates via SendMessage
  - Monitor task list progress via TaskList
  - Request status from teammates via SendMessage
  - Synthesize teammate outputs
  - Write coordination_log.yaml
  - Shut down teammates via SendMessage (shutdown_request)
  - Clean up team via TeamDelete

prohibited_actions:
  - Edit/Write implementation files
  - Answer questions directly
  - Execute work items themselves
  - Skip delegation for "simple" tasks
```

### Work Distribution Strategies

**Self-Claiming (Preferred)**: Teammates check TaskList and claim available tasks after completing current work. Built-in file-lock prevents race conditions.

**Direct Assignment**: Lead assigns tasks to specific teammates via TaskUpdate (set owner) and SendMessage.

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

### Teammate Failure
- Send status query via SendMessage
- If unresponsive: spawn replacement teammate
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
| `research` | Teammates (parallel) | Analysis, information gathering |
| `design` | Teammates (parallel) | Architecture decisions, interface definitions |
| `implementation` | Teammates (parallel) | Core build work |
| `supporting` | Teammates (parallel) | Secondary features, integrations |
| `testing` | Teammates (parallel) | QA, security, validation |
| `documentation` | Teammates (parallel) | Docs, cleanup, optimization |
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
- **team-trigger**: Decomposes request directly, creates team via TeamCreate, spawns teammates, executes waves
- **team-lead-adapter**: Wraps controller in delegate mode, validates gates, tracks contracts
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
  teammate_mode: tmux    # auto | tmux | in-process
```

---

**Part of**: cAgents Core Infrastructure - Built-in Agent Teams Integration
