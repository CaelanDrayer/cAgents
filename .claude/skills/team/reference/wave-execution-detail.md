# Wave Execution Detail

This file gives the details of the per-wave spawn cycle for /team. It also covers the monitoring, the gate flow, and the coordination between the waves.

## Step 5: Execute Waves 1..N-1 — Spawn Subagents Per Wave

This is the core execution loop. For EACH wave, spawn a fresh round of subagents. Collect their results, and validate the gate. Then go on to the next wave. Each wave subagent can spawn its own subagents to depth 5, for any specialty that it needs. The parallelism therefore grows beyond the fan-out of one wave.

```
for each wave K from 1 to N-1:

  5a. Display wave K status:
      "=== WAVE {K}/{N-1}: {wave_description} ==="
      List work items in this wave

  5b. Spawn subagents for wave K IN PARALLEL:
```

### Worktree Isolation (Recommended)

If two subagents change the same files, use `isolation: "worktree"` in the Task call. Each subagent then gets an isolated git worktree. This stops a file conflict during the parallel execution.

```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",
  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",   # EXPERIMENTAL named-teammate path only — omit on the default path
  team_name: "{team_name}",                  # EXPERIMENTAL only — accepted-but-ignored (teams are implicit)
  isolation: "worktree",
  ...
})
```

**When to use worktree isolation**:
- Many subagents edit the same files, for example package.json and the shared configs.
- The subagents run tests that produce temporary files.
- A wave has 3 subagents or more that change code files.

**When worktree is unnecessary**:
- The subagents write to separate output directories, for example SESSION_DIR/outputs/task-N/.
- The wave is documentation only, and no two files overlap.
- The wave does research or analysis, and it only reads files.

**Merge coordination after worktree waves**:
A worktree-isolated wave completes when all of its subagents complete. The lead must then merge the work:
1. Do a check for merge conflicts. Run `git diff` between the worktrees.
2. If there is no conflict, merge automatically with a fast-forward.
3. If there is a conflict, resolve it. Prefer the subagent whose work item has the higher priority.
4. After the merge, run the guard command, such as npm test or lint. It catches an integration issue.

### --members Batching

The `--members` cap has a default of 5. If wave K holds more work items than that cap, put them into sub-waves. Each sub-wave spawns up to `--members` subagents in parallel. It waits for all of them to complete, and it then spawns the next batch. Every work item gets its own dedicated subagent. Never collapse two tasks into one subagent.

```
items_in_wave = work_items_for_wave_K
batch_size = members_cap  # from --members flag, default 5
for batch in chunk(items_in_wave, batch_size):
  for each work_item in batch:
    Agent({...})  # one subagent per item
  # Wait for batch to complete before spawning next batch
  # (experimental path only) apply early shutdown (5c-1) as each teammate finishes
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
  run_in_background: false,                   # DEFAULT: synchronous, lead collects results together
  # NO `name` and NO `team_name` on this path. Passing `name` promotes the spawn to a
  # named background teammate and SILENTLY overrides `run_in_background: false` (ENG-OBS-7),
  # so the lead never collects the result. Named teammates belong to the EXPERIMENTAL path
  # only, which spawns with `run_in_background: true` and collects via SendMessage.
  description: "Wave {K} - Execute TASK-{N}: <short description>",
  prompt: "<see reference/teammate-spawning-template.md for full prompt>"
})
```

For the full spawn prompt template of a subagent, see `reference/teammate-spawning-template.md`. That template includes the self-registration block.

### 5b-i. Report Cap — Why 12 Lines and 15 Words

The four lead-context disciplines bound the per-wave loads of the lead. They do not bound its **fan-in**. The fan-in is k subagent reports across N waves, and it grows with the size of the work. No reduction elsewhere bounds it. The cap in `SKILL.md` § Wave Report Cap and Lead Read Whitelist keeps the share of each report small.

The cap is sized against this arithmetic:

| Quantity | Value |
|----------|-------|
| Subagent waves | wave count minus 2 (the first and last waves are lead-sequential) |
| Reports per wave | one report for each work item. The `--members` cap, which defaults to 5, limits how many run at the same time in a batch. It does not limit how many report. |
| Illustrative tier-4 shape (10 waves, 5 WIs per wave) | 8 subagent waves x 5 = 40 reports |
| Ceiling per report | 12 lines x 15 words = 180 words, roughly 250 tokens |
| Fan-in at that shape | roughly 10K tokens |
| Typical tier 3 (6 waves, 4 WIs per wave) | 16 reports, roughly 4K tokens at the ceiling |

These are illustrative shapes, and they are not ceilings. The report count for each wave follows the work-item count. The decomposition of the planner drives that count. A tier-4 program with 60 to 100 work items produces 60 to 100 reports. The job of the cap is to make each report cheap. It does not make the count small, and nothing here bounds the count.

Twelve lines is the smallest count that still carries what the lead acts on. Those items are the status, the WI id, a one-sentence outcome, the artifact pointer, and each blocker. The 15-word bound exists because twelve paragraph-length lines satisfy a line count alone. Without that bound the cap is decorative.

Nothing measures this. No hook counts the lines, no CI stage checks a report, and no threshold blocks a wave. The cap holds for one reason only. It is written into the spawn brief that the subagent reads, and it is written into the lead contract.

### 5b-ii. Lead Read Whitelist — Default-Deny

`SKILL.md` § Wave Report Cap and Lead Read Whitelist lists the twelve artifacts that the lead may read. The session denies everything else by default. This table holds the denied set that matters most in the wave loop:

| Denied | Who reads it instead |
|--------|----------------------|
| `outputs/wave-{K}/task-{N}/**`, which is any work product of a subagent | `cagents:reviewer` inside the wave subagent, and `cagents:wave-reviewer` at the gate |
| `workflow/gate_validations/**` | `cagents:wave-reviewer` writes it; the lead reads only the 1-line verdict |
| `outputs/integration/integrated_outputs.yaml` | `cagents:coord-log-writer`. The lead reads `integration_summary.md`. |
| `workflow/coordination_log.yaml` | `cagents:coord-log-writer` writes it |
| `work_items_wave_{J}.yaml` for J other than the current K | the wave-J subagents, in wave J |
| any repository file under review | the execution agent that owns the work item |

Every row has the same shape. The artifact has an owner, and that owner is not the lead. Sometimes a lead opens one of these files to check the work. That lead takes back the delegated verification, and it brings the fan-in term back in the same move.

### 5c. Monitor Wave K Progress

- Default path: the wave subagents return synchronously, and the lead collects all of the results together. Experimental named-teammate path: wait for the teammate messages, which arrive automatically.
- Check TaskList at regular intervals to see the progress.
- If a subagent flags an issue, correct the course when that is necessary.
- Track the timeout of each subagent. If there is no progress after 5 minutes, consider a recovery.

### 5c-1. Early Individual Shutdown (Resource Optimization) — Experimental Path Only

**On the DEFAULT path this step is unnecessary.** A synchronous wave subagent returns its result, so there is nothing to shut down early. On the EXPERIMENTAL named-teammate path only, a teammate reports its completion with SendMessage. Shut that teammate down IMMEDIATELY. Do not wait for the whole wave to finish:

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

This frees the resources as soon as each teammate finishes. Those resources are the tmux panes and the context windows.

### 5c-2. Automatic Subagent Failure Recovery

For the full recovery chain, see `reference/fallback-and-error-recovery.md`. That chain is RETRY → SIMPLIFY → ESCALATE.

### 5d-pre. Write child_controllers.yaml Manifest

Wait until all of the wave K subagents complete, or until they carry the blocked mark. Then add the controller entries to `${SESSION_DIR}/workflow/child_controllers.yaml`. For the format, see `reference/parent-session-extraction.md`.

### 5d. Validate GATE-K

Do these steps when all of the wave K items complete, or when they are blocked:
- Make sure that an output exists for each work item in wave K.
- Do a check of the quality gate criteria for the wave type. See `reference/gate-validation-protocol.md`.
- If the gate passes, mark the GATE-K task as completed. That mark unblocks wave K+1.
- If the gate fails and a blocked item exists, apply a partial pass. Mark the gate as conditionally passed, and write down the gaps. Continue with the reduced scope.
- If the gate fails and no item is blocked, report the issues. Spawn fix-up subagents, and validate again.

### 5e. Shut Down Remaining Wave K Subagents — Experimental Path Only

**On the DEFAULT path there is nothing to shut down.** A synchronous wave subagent already returned its result. On the EXPERIMENTAL named-teammate path only, most teammates already stopped through the early individual shutdown in 5c-1. Send a shutdown to each teammate that stays:

```
SendMessage({ type: "shutdown_request", recipient: "w{K}-task-{N}-{type}", content: "Wave {K} complete." })
```

### 5f. Proceed to Wave K+1 (AUTOMATIC — Do NOT Ask Permission)

Release v12.6.0 removed the wave-completion emission to `workflow/events/EVT-{K}.yaml`. The `completed` status of the GATE-{K} task is now the canonical wave-gate signal.

**Each wave is a distinct spawn-execute-validate cycle.** This cycle makes sure that the quality gates hold between the phases. It also makes the outputs of the earlier waves available to the later waves, and it catches each issue early.

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

If the verdict is PASS, the pipeline is complete. Go on to the cleanup.
If the verdict is FAIL and partial results exist, report a partial completion summary. See `reference/partial-results.md`.
If the verdict is FAIL and no partial result exists, report the issues with evidence. Suggest `/act --resume {SESSION_ID}`.

## Cross-Wave Coordination

### File-Based Handoffs Between Waves

The shared session directory makes the outputs of each wave available to the waves that follow:

```
Wave 1 subagent (TASK-01):
  Completes -> writes outputs/task-01/api_spec.yaml
  TaskUpdate(TASK-01, completed)
  Returns result to lead ("TASK-01 done")

Lead validates GATE-1 -> marks complete -> unblocks wave 2

Wave 2 subagent (TASK-03, depends on TASK-01):
  Reads outputs/task-01/api_spec.yaml from session dir
  Builds on wave 1 outputs
  Writes outputs/task-03/implementation/
```

### Intra-Wave Parallelism

Within one wave, all of the subagents run in parallel. For a dependency inside the wave, use `addBlockedBy` in TaskUpdate.

### Task Dependencies

- **Inter-wave**: the GATE sentinel tasks enforce this. GATE-K blocks the items of wave K+1.
- **Intra-wave**: set this with `addBlockedBy` in TaskUpdate. Use the dependency graph from the decomposition.
- The dependencies auto-unblock through TaskList.

### Subagent Autonomy

- A subagent surfaces each issue to the lead, and it continues to work. On the default path it does this in its returned result. On the experimental named-teammate path it uses SendMessage.
- The lead can correct the course when that is necessary, and it does not block the progress.
- All of the enrichment always runs. Consistency is more important than speed.
- The subagents inside a wave operate independently.
