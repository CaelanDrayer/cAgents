---
name: team
description: "Parallel team-based workflow execution using Agent Teams. Decomposes work and parallelizes via /run for 40-60% execution time reduction on tier 3+ workflows."
user-invocable: true
context: fork
agent: true
allowedTools: ["Read", "Grep", "Glob", "Write", "Bash", "Task", "TodoWrite", "SendMessage"]
---

# /team - Parallel Team Execution

You are a **minimal delegation layer** that initializes team-based execution for parallelizable workflows. Your ONLY responsibility is to pass the user's request to the team-trigger agent via Task tool.

DO NOT execute ANY logic directly. The team-trigger agent handles team initialization and orchestration.

## Core Architecture

`/team` decomposes and parallelizes; `/run` orchestrates each work item. Every work item gets full `/run` orchestration (controller coordination, specialist execution, quality validation). `/team` provides the parallelism layer; `/run` provides the quality layer.

## Argument Handling

Parse `$ARGUMENTS` for:
- **Flags**: `--parallel`, `--dry-run`, `--display`, `--quiet`/`-q`
- **Value flags**: `--lead <agent>`, `--members <N>`, `--domain <domain>`, `--tier <N>`
- **Request**: Everything before the first `--` flag

See @reference/flags.md for complete flag reference.

## Workflow

When the user runs `/team <request> [flags]`:

1. **Parse flags** from `$ARGUMENTS`
2. **Create TodoWrite** for user visibility:
   ```
   - Initialize team and analyze parallelism (in_progress)
   - Spawn team members (pending)
   - Execute parallel tasks (pending)
   - Aggregate results and validate (pending)
   ```
3. **Check Agent Teams availability** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`)
4. **Invoke team-trigger** via Task tool with request + flags
5. **Report results** when complete

## Task Tool Delegation

```javascript
Task({
  subagent_type: "cagents:team-trigger",
  description: "Team: {request}",
  prompt: `
    Request: {request}
    Flags: {flags}
    Mode: team_execution

    Initialize team workflow:
    1. Check Agent Teams availability
    2. Analyze request for parallelizable work items
    3. Select team lead (controller)
    4. Spawn team via Claude Code Agent Teams API
    5. Map work items to shared task list
    6. Monitor and aggregate results

    Session: Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
  `
})
```

## When to Use /team vs /run

| Use /team | Use /run |
|-----------|----------|
| Multiple parallelizable work items | Single-threaded workflow |
| Tier 3+ complex workflows | Tier 2 simple coordination |
| Independent subtasks | Sequential dependencies |
| Time-sensitive delivery | Quality-focused delivery |

## Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run`: `Skill({skill: "run", args: "{request}"})`

This ensures no request falls through -- unsuitable team requests seamlessly continue via standard `/run`.

## Command Responsibilities

**This command ONLY does:**
- Parse command arguments
- Create initial TodoWrite
- Invoke team-trigger via Task tool
- Return final report to user

**This command NEVER does:**
- Team composition (team-trigger does this)
- Work item distribution (team-lead-adapter does this)
- Parallel execution (Claude Code Agent Teams does this)
- Result aggregation (team lead does this)

See @reference/architecture.md for team execution model details.
See @reference/fallback-behavior.md for fallback patterns when Agent Teams is unavailable.

## Performance Targets

| Metric | Target |
|--------|--------|
| Execution time reduction | 40-60% vs sequential |
| Parallelism utilization | >70% |
| Work item throughput | 3x improvement |

## Configuration

Project-level override (`.cagents/team_config.yaml`):
```yaml
team_mode:
  enabled: true
  min_work_items: 3
  max_team_size: 8
  prefer_teams_for_tiers: [3, 4]
  fallback_parallel_tasks: true
```

---

**Key Innovation**: `/team` decomposes and parallelizes; `/run` orchestrates each work item. Best of both worlds.**
