# Context Recovery Patterns

Detailed strategies for recovering from context overflow during subagent execution.

## Context Exhaustion Signals

Detect that a subagent ran out of context window capacity before completing its assigned work.

### Primary Signals

| Signal | Detection Method | Confidence |
|--------|-----------------|------------|
| Partial outputs | Expected deliverables missing from `outputs/` | High |
| Checkpoint with exhaustion type | `waypoints/*.yaml` has `type: exhaustion` or `type: critical` | Definitive |
| Incomplete coordination_log | Work items still `in_progress` or `pending` in coordination_log.yaml | High |
| Truncated Task result | Task tool returns shorter output than expected, missing sections | Medium |
| Abrupt stop mid-file | Output file ends mid-sentence or mid-block | High |

### Secondary Signals

- Agent produced some files but not all listed in its task assignment
- Test files reference functions that were never created
- Documentation references sections that do not exist
- coordination_log shows questions answered but implementation tasks not started

### False Positives to Exclude

Before triggering context recovery, verify the failure is not caused by:
- Agent error (bad prompt, wrong agent type) - check for error messages first
- Missing dependencies (blocked work items) - check dependency graph
- Permission issues (file write denied) - check hook logs
- Validation rejection (agent finished but output failed quality gates)

## Checkpoint Reading

Load and interpret checkpoint or waypoint files from the failed agent session.

### Checkpoint File Locations

```
sessions/{session_id}/
  waypoints/wp-*.yaml          # Waypoint snapshots
  workflow/coordination_log.yaml  # Partial coordination state
  tasks/in_progress/           # Tasks that were running
  tasks/completed/             # Tasks that finished
  outputs/partial/             # Partial deliverables
```

### Checkpoint Fields

```yaml
# waypoint file structure
id: WP-003
type: exhaustion          # or: critical, phase_transition, pre_compact
phase: executing
created_at: "2026-01-28T14:30:00Z"

work_items:
  completed:
    - id: WI-001
      evidence: "src/models/user.ts created"
    - id: WI-002
      evidence: "migrations/001_users.sql created"
  in_progress:
    - id: WI-003
      partial_output: "src/services/auth.ts (60% complete, missing token refresh)"
  pending:
    - id: WI-004
    - id: WI-005

partial_outputs:
  - path: "outputs/partial/auth-service.ts"
    completeness: 0.6
  - path: "outputs/partial/auth-tests.ts"
    completeness: 0.3

acceptance_criteria_progress:
  total: 12
  met: 5
  partially_met: 2
  not_started: 5

resume_hints:
  next_action: "Complete auth service token refresh logic"
  context_needed: ["task_plan.md", "findings.md", "outputs/partial/auth-service.ts"]
```

### Reading Priority

1. Read most recent waypoint file first (highest `WP-XXX` number)
2. Cross-reference with coordination_log.yaml for work item status
3. Check `outputs/partial/` for salvageable partial work
4. Check `tasks/completed/` for finished items that do not need re-doing

## Work Splitting Strategy

Break remaining work into micro-tasks that fit within context limits.

### Splitting Rules

#### Group by File

Each file operation becomes a separate micro-task:
```yaml
# Before (one large task)
task: "Implement auth module"
files: [auth-service.ts, auth-middleware.ts, auth-routes.ts, auth-tests.ts]

# After (split by file)
micro_tasks:
  - scope: "auth-service.ts"
    description: "Complete auth service with login, logout, token refresh"
  - scope: "auth-middleware.ts"
    description: "Create auth middleware for route protection"
  - scope: "auth-routes.ts"
    description: "Create auth API routes"
  - scope: "auth-tests.ts"
    description: "Write tests for auth service and routes"
```

#### Group by Operation

Separate read/analyze from write/implement from test/validate:
```yaml
micro_tasks:
  - type: analyze
    description: "Read existing code, identify integration points"
  - type: implement
    description: "Write the new module code"
  - type: test
    description: "Create and run tests for the module"
```

#### Group by Dependency Chain

Independent items run in parallel, dependent items run sequentially:
```yaml
parallel_group_1: [WI-004, WI-006]   # No dependencies on each other
parallel_group_2: [WI-005]            # Depends on WI-004
sequential: [WI-007]                   # Depends on WI-005 and WI-006
```

### Token Estimation Heuristics

Use line-count to estimate token requirements per micro-task:

| Operation | Tokens per Line | Example |
|-----------|----------------|---------|
| Reading existing code | ~5 tokens/line | 200-line file = ~1K tokens |
| Generating new code | ~8 tokens/line | 100-line file = ~800 tokens |
| Reading + modifying | ~10 tokens/line | Read 200 lines + edit = ~2K tokens |
| Test generation | ~8 tokens/line | 50-line test = ~400 tokens |
| Documentation | ~6 tokens/line | 80-line doc = ~480 tokens |

**Budget per micro-task**: ~8K tokens total (prompt + context + generation)
- Reserve ~2K for prompt and instructions
- Reserve ~3K for context (existing code, checkpoint data)
- Leave ~3K for agent output generation

### Minimum Task Size

Never split below **2K tokens** per micro-task. Below this threshold, the overhead of spawning, prompting, and consolidating exceeds the work itself.

## Micro-Task Prompt Template

Minimal prompt for spawning continuation subagents:

```yaml
Task:
  description: "Continue: {brief_scope_description}"
  prompt: |
    Continue work from checkpoint.

    Original task: {task_description}
    Scope: {specific_files_or_items}
    Completed so far: {completed_items_summary}
    Your assignment: {specific_remaining_items}
    Acceptance criteria: {relevant_criteria_only}
    Session: {session_path}

    IMPORTANT:
    - Only work on items listed in "Your assignment"
    - Do not repeat work listed in "Completed so far"
    - Write outputs to: {output_path}
    - If you find partial work in outputs/partial/, build on it
```

### Prompt Sizing Guidelines

- Keep prompt under 2K tokens
- Include only acceptance criteria relevant to this micro-task
- Summarize completed work (do not paste full outputs)
- Reference files by path rather than including content inline
- Let the agent read files it needs via Read tool

## Result Consolidation

Merge outputs from multiple micro-tasks into a unified deliverable.

### File-Based Consolidation

When each micro-task produces distinct files:
1. List all expected output files from the task plan
2. Verify each file exists in the output directory
3. Check file is non-empty and syntactically valid
4. Log missing files for re-assignment or escalation

```yaml
consolidation_check:
  expected_files:
    - path: "src/services/auth.ts"
      produced_by: micro-task-1
      status: present
    - path: "src/middleware/auth.ts"
      produced_by: micro-task-2
      status: present
    - path: "src/routes/auth.ts"
      produced_by: micro-task-3
      status: missing  # Needs re-assignment
```

### Content-Based Consolidation

When micro-tasks produce sections of a single document:
1. Collect sections in planned order
2. Verify section boundaries do not overlap
3. Check for consistent formatting and terminology
4. Assemble final document with section markers removed

### Validation-Based Consolidation

After file or content assembly:
1. Run acceptance criteria checks against consolidated output
2. Verify cross-references between files (imports, function calls)
3. Run linting or syntax checks if applicable
4. Flag any criteria still unmet for targeted follow-up

## Escalation Triggers

When to stop retrying and escalate to HITL.

### Immediate Escalation

| Trigger | Reason | Action |
|---------|--------|--------|
| Same micro-task fails 2x | Infinite loop detected | Escalate with failure log |
| Total continuations > 5 | Task fundamentally too large | Escalate with checkpoint and progress |
| Micro-tasks produce conflicting outputs | Merge conflict, inconsistent state | Escalate with both outputs for human decision |
| No progress between continuations | Agent is stuck, no new completed items | Escalate with full diagnostic |

### Graceful Escalation

When escalating, provide:
```yaml
escalation_report:
  original_task: {description}
  total_work_items: {count}
  completed: {count_and_list}
  remaining: {count_and_list}
  attempts: {continuation_count}
  failure_reason: {specific_reason}
  partial_outputs: {file_paths}
  checkpoint: {waypoint_path}
  recommendation: "Split into separate workflow sessions" | "Needs human design input" | "Scope reduction required"
```

### Continuation Budget

```yaml
limits:
  max_continuations_per_task: 5
  max_micro_tasks_per_split: 20
  max_retries_per_micro_task: 2
  max_total_micro_task_failures: 5
```

If any limit is reached, escalate rather than continuing.

## Anti-Patterns

What NOT to do during context overflow recovery.

### 1. Retrying at the Same Scope

**Wrong**: Re-spawn the exact same task with the same prompt and context size.
**Why**: The agent will exhaust context at the same point again.
**Right**: Split the remaining work into smaller micro-tasks before retrying.

### 2. Passing Full Context from Failed Task

**Wrong**: Copy the entire conversation history from the failed agent into the continuation prompt.
**Why**: This immediately fills the new agent's context, defeating the purpose of splitting.
**Right**: Pass only the checkpoint summary, relevant file paths, and specific assignment.

### 3. Splitting Too Small

**Wrong**: Create micro-tasks smaller than 2K tokens (e.g., "rename this one variable").
**Why**: The overhead of spawning, prompting, and consolidating exceeds the actual work.
**Right**: Keep micro-tasks between 2K-8K tokens. Combine trivially small items.

### 4. Ignoring Partial Outputs

**Wrong**: Discard everything the failed agent produced and start from scratch.
**Why**: The failed agent may have completed 60-80% of the work before exhausting context.
**Right**: Read `outputs/partial/` and checkpoint data. Build on completed work.

### 5. No Progress Tracking Between Continuations

**Wrong**: Spawn continuations without checking what was actually accomplished.
**Why**: Risk of repeating completed work or missing incomplete items.
**Right**: After each continuation, update the checkpoint and compare against the original plan.

### 6. Parallel Micro-Tasks with Shared State

**Wrong**: Launch parallel micro-tasks that write to the same file or depend on each other's output.
**Why**: Race conditions, overwrites, and inconsistent state.
**Right**: Only parallelize truly independent micro-tasks. Sequence anything with shared files or dependencies.

### 7. Skipping Re-Validation

**Wrong**: Mark the task as complete after consolidation without re-validating.
**Why**: Micro-task outputs may be individually correct but collectively inconsistent.
**Right**: Always run universal-validator on the consolidated output before marking complete.
