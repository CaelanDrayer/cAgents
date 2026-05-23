# Wave Execution Detail

Per-wave spawn cycle, monitoring, gate flow, and inter-wave coordination details for /team.

## Step 5: Execute Waves 1..N-1 — Spawn Teammates Per Wave

This is the core execution loop. For EACH wave, spawn a fresh round of teammates, wait for completion, validate the gate, then proceed to the next wave.

```
for each wave K from 1 to N-1:

  5a. Display wave K status:
      "=== WAVE {K}/{N-1}: {wave_description} ==="
      List work items in this wave

  5b. Spawn teammates for wave K IN PARALLEL:
```

### Worktree Isolation (Recommended)

When teammates modify overlapping files, use `isolation: "worktree"` in the Task call to give each teammate an isolated git worktree. This prevents file conflicts during parallel execution.

```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",
  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",
  team_name: "{team_name}",
  isolation: "worktree",
  ...
})
```

**When to use worktree isolation**:
- Multiple teammates editing the same files (e.g., package.json, shared configs)
- Teammates running tests that produce temp files
- Any wave with 3+ teammates modifying code files

**When worktree is unnecessary**:
- Teammates writing to separate output directories (e.g., SESSION_DIR/outputs/task-N/)
- Documentation-only waves where files don't overlap
- Research/analysis waves that only read files

**Merge coordination after worktree waves**:
After all teammates in a worktree-isolated wave complete, the lead must merge:
1. Check for merge conflicts: `git diff` between worktrees
2. If no conflicts: merge automatically (fast-forward)
3. If conflicts: resolve by preferring the teammate whose work item has higher priority
4. Run guard command (npm test, lint) after merge to catch integration issues

### --members Batching

If wave K has more work items than the `--members` cap (default: 5), batch them into sub-waves. Each sub-wave spawns up to `--members` teammates in parallel, waits for all to complete, then spawns the next batch. Every work item gets its own dedicated teammate — never collapse multiple tasks into a single teammate.

```
items_in_wave = work_items_for_wave_K
batch_size = members_cap  # from --members flag, default 5
for batch in chunk(items_in_wave, batch_size):
  for each work_item in batch:
    Agent({...})  # one teammate per item
  # Wait for batch to complete before spawning next batch
  # Apply early shutdown (5c-1) as each teammate finishes
```

### Controller Resolution (Once Per Wave)

```
DEFAULT: Read plan.yaml -> controller_assignment -> primary
Example: plan.yaml says "primary: cagents:tech-lead"
  -> CONTROLLER_TYPE = "tech-lead"

WAVE-SPECIFIC CONTROLLERS: If plan.yaml has supporting controllers
(controller_assignment.supporting), different waves MAY use different
controllers based on the work items' domain alignment:
  - If ALL items in wave K match the primary controller's domain: use primary
  - If items in wave K match a supporting controller's domain: use that controller
  - Example: tier 3 with primary=tech-lead, supporting=[architect]
    Wave 1 (design): use architect; Waves 2-3 (implementation): use tech-lead

NEVER use work_items.yaml's per-item `agent` field as subagent_type.
The `agent` field (e.g., "backend-developer", "senior-developer") is an
EXECUTION agent — it lacks the Agent tool and CANNOT delegate work.
Only controllers (tech-lead, narrative-director, etc.) have Agent tool.

VALIDATION: controller_type must match an entry in domain_overrides.yaml
controller_catalog. If it doesn't, fall back to the tier_2 default
controller for the detected domain.
```

### Spawn Block

```
CONTROLLER_TYPE = plan.yaml -> controller_assignment -> primary

Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",
  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",
  team_name: "{team_name}",
  description: "Wave {K} - Execute TASK-{N}: <short description>",
  prompt: "<see reference/teammate-spawning-template.md for full prompt>"
})
```

See `reference/teammate-spawning-template.md` for the full teammate spawn prompt template including self-registration block.

### 5c. Monitor Wave K Progress

- Wait for teammate messages (they arrive automatically)
- Periodically check TaskList to see progress
- If a teammate flags an issue: course-correct if needed
- Track per-teammate timeout: if no progress after 5 minutes, consider recovery

### 5c-1. Early Individual Shutdown (Resource Optimization)

When a teammate reports completion (via SendMessage), shut it down IMMEDIATELY rather than waiting for the entire wave to finish:

```
On receiving "TASK-{N} complete" from w{K}-task-{N}-{type}:
  1. Verify the work item output exists in {SESSION_DIR}/outputs/task-{N}/
  2. If verified: send immediate shutdown
     SendMessage({ type: "shutdown_request",
                   recipient: "w{K}-task-{N}-{type}",
                   content: "TASK-{N} verified complete. Shutting down early." })
  3. Track: wave_K_completed += 1
  4. If wave_K_completed == wave_K_total: proceed to GATE validation (5d)
```

This frees resources (tmux panes, context windows) as soon as each teammate finishes.

### 5c-2. Automatic Teammate Failure Recovery

See `reference/fallback-and-error-recovery.md` for the full recovery chain (RETRY → SIMPLIFY → ESCALATE).

### 5d-pre. Write child_controllers.yaml Manifest

After all wave K teammates complete (or are marked blocked), append controller entries to `${SESSION_DIR}/workflow/child_controllers.yaml`. See `reference/parent-session-extraction.md` for format.

### 5d. Validate GATE-K

When all wave K items complete (or are blocked):
- Verify outputs exist for each work item in wave K
- Check quality gate criteria based on wave type (see `reference/gate-validation-protocol.md`)
- If gate passes: Mark GATE-K task as completed (unblocks wave K+1)
- If gate fails but blocked items exist: Apply partial pass — mark gate as conditionally passed with noted gaps; proceed with degraded scope
- If gate fails without blocked items: Report issues, spawn fix-up teammates, re-validate

### 5e. Shut Down Remaining Wave K Teammates

Most teammates should already be shut down via early individual shutdown (5c-1). Send shutdown to any that remain:

```
SendMessage({ type: "shutdown_request", recipient: "w{K}-task-{N}-{type}", content: "Wave {K} complete." })
```

### 5f. Proceed to Wave K+1 (AUTOMATIC — Do NOT Ask Permission)

### 5f-1. Write Wave Completion Event

```yaml
# workflow/events/EVT-{K}.yaml
event_id: EVT-{K}
type: wave_complete
wave: {K}
items_completed: {count}
timestamp: "{ISO_TIMESTAMP}"
```

**Each wave is a distinct spawn-execute-validate cycle.** This ensures quality gates are enforced between phases, outputs from earlier waves are available to later waves, and issues are caught early.

## Step 6: Final Wave — Integration + Validation (Lead Does This)

### 6a. Spawn Integration Controller

```
Agent({
  subagent_type: "cagents:{primary_controller_from_plan}",
  description: "Integration: Merge outputs from all {N} waves",
  prompt: "You are the {controller_name} controller performing final integration.\n\nSESSION: {SESSION_DIR}/\n\nAll {N-1} execution waves are complete. Read workflow/coordination_log.yaml and outputs/ from each wave and WI. Merge cross-WI outputs, resolve conflicts, write final integrated outputs. Write coordination_log.yaml with integration results."
})
```

### 6b. Spawn Final Validator

```
Agent({
  subagent_type: "cagents:validator",
  description: "Final validation: All waves and WIs complete",
  prompt: "You are the validator performing final validation.\n\nSESSION: {SESSION_DIR}/\n\nAll {N} waves and integration are complete. Validate all acceptance criteria across all WIs and all wave gates. Write workflow/validation_report.yaml with PASS/FAIL/REVISE classification."
})
```

If PASS: Pipeline complete. Proceed to cleanup.
If FAIL with partial results: Report partial completion summary (see `reference/partial-results.md`).
If FAIL without partial results: Report issues with evidence. Suggest `/run --resume {SESSION_ID}`.

## Cross-Wave Coordination

### File-Based Handoffs Between Waves

Each wave's outputs are available to subsequent waves via the shared session directory:

```
Wave 1 teammate (TASK-01):
  Completes -> writes outputs/task-01/api_spec.yaml
  TaskUpdate(TASK-01, completed)
  SendMessage(lead, "TASK-01 done")

Lead validates GATE-1 -> marks complete -> unblocks wave 2

Wave 2 teammate (TASK-03, depends on TASK-01):
  Reads outputs/task-01/api_spec.yaml from session dir
  Builds on wave 1 outputs
  Writes outputs/task-03/implementation/
```

### Intra-Wave Parallelism

Within a single wave, all teammates run in parallel. Use TaskUpdate `addBlockedBy` for any intra-wave dependencies.

### Task Dependencies

- **Inter-wave**: Enforced via GATE sentinel tasks (wave K+1 items blocked by GATE-K)
- **Intra-wave**: Set via TaskUpdate `addBlockedBy` based on decomposition dependency graph
- Dependencies auto-unblock via TaskList

### Teammate Autonomy

- Teammates flag issues to lead via SendMessage but continue working
- Lead can course-correct if needed but doesn't block progress
- All enrichment always runs (consistency over speed)
- Teammates within a wave operate independently
