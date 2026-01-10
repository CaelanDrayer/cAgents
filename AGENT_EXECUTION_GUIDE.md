# Agent Execution Guide - V3 Consolidation
## How to Execute the V3 Consolidation Plan with Autonomous Agents

The V3 consolidation plan has been redesigned as **71 discrete, executable tasks** that can be assigned to specialized agents and run in parallel.

---

## Quick Start

### Option 1: Full Automated Execution (Recommended)

Execute the entire consolidation with a single command:

```bash
/trigger Execute complete V3 consolidation from V3_EXECUTABLE_WORKFLOW_PLAN.md
```

**What happens**:
1. **Trigger agent** parses the workflow plan
2. **Orchestrator** manages the 5 phases
3. **Universal-planner** breaks down each phase into tasks
4. **Universal-executor** assigns tasks to specialized agents
5. **Agents execute tasks** in parallel where possible
6. **Validation checkpoints** verify each phase before proceeding
7. **Results aggregated** and reported

**Duration**: 4-5 weeks with parallel execution (vs 12+ weeks sequential)

---

### Option 2: Phase-by-Phase Execution

Execute one phase at a time for more control:

```bash
# Phase 1: Cleanup & Analysis (1 week)
/trigger Execute Phase 1 of V3 consolidation (Cleanup & Analysis)

# Wait for validation, then proceed to Phase 2
/trigger Execute Phase 2 of V3 consolidation (Agent Optimization)

# Continue through all 5 phases...
```

---

### Option 3: Manual Task Assignment

Execute specific tasks or assign to specific agents:

```bash
# Execute single task
/trigger Execute task cleanup_001 from V3 consolidation plan

# Assign task to specific agent
/trigger Assign task optimize_011 to senior-developer and execute
```

---

## Workflow Architecture

### How It Works

```
User: /trigger Execute V3 consolidation

  ↓

Trigger Agent (Core)
  - Parses V3_EXECUTABLE_WORKFLOW_PLAN.md
  - Creates instruction: v3_consolidation_001
  - Routes to software domain (tier 4)

  ↓

Orchestrator (Core)
  - Phase management: routing → planning → executing → validating → complete
  - Coordinates all 5 phases

  ↓

Universal-Planner (Core)
  - Reads workflow plan
  - Breaks Phase 1 into 9 tasks (Wave 1.1, 1.2, 1.3)
  - Assigns agents: data-analyst, senior-developer, qa-lead
  - Writes task files to tasks/pending/

  ↓

Universal-Executor (Core)
  - Reads pending tasks
  - Executes Wave 1.1 tasks in parallel (4 tasks)
    ├─ Task(data-analyst): Extract agent metadata
    ├─ Task(senior-developer): Measure size baseline
    ├─ Task(senior-developer): Map deprecated agents
    └─ Task(qa-lead): Validate V2 baseline
  - Waits for wave completion
  - Executes Wave 1.2 tasks in parallel (3 tasks)
  - Executes Wave 1.3 validation (1 task, serial)

  ↓

Universal-Validator (Core)
  - Checks Phase 1 validation results
  - If PASS: Proceed to Phase 2
  - If FAIL: Escalate to HITL

  ↓

Repeat for Phases 2-5...

  ↓

Complete
  - All 71 tasks executed
  - 5 validation checkpoints passed
  - V3.0 ready for release
```

---

## Task Breakdown by Phase

### Phase 1: Cleanup & Analysis (9 tasks, 1 week)

**Wave 1.1** (Parallel - 4 tasks):
- `cleanup_001`: Extract agent metadata → **data-analyst** (2h)
- `cleanup_002`: Measure size baseline → **senior-developer** (1h)
- `cleanup_003`: Map deprecated agents → **senior-developer** (1h)
- `cleanup_004`: Validate V2 baseline → **qa-lead** (3h)

**Wave 1.2** (Parallel - 3 tasks):
- `cleanup_011`: Remove deprecated files → **senior-developer** (30m)
- `cleanup_012`: Update manifests → **senior-developer** (1h)
- `cleanup_013`: Update documentation → **scribe** (1h)

**Wave 1.3** (Serial - 1 task):
- `cleanup_020`: Validate Phase 1 → **qa-lead** (3h) **[CHECKPOINT]**

---

### Phase 2: Agent Optimization (16 tasks, 1 week)

**Wave 2.1** (Parallel - 3 tasks):
- `optimize_001`: Create agent template → **architect** (2h)
- `optimize_002`: Design registry schema → **architect** (2h)
- `optimize_003`: Build optimization scripts → **senior-developer** (3h)

**Wave 2.2** (Parallel - 6 tasks):
- `optimize_011`: Optimize software leadership agents → **senior-developer** (4h)
- `optimize_012`: Optimize software dev agents → **senior-developer** (4h)
- `optimize_013`: Optimize QA agents → **qa-lead** (4h)
- `optimize_014`: Optimize business agents → **business-analyst** (4h)
- `optimize_015`: Optimize creative agents → **editor** (4h)
- `optimize_016`: Optimize cross-domain agents → **senior-developer** (3h)

**Wave 2.3-2.5** (Serial - 4 tasks):
- `optimize_020`: Generate registry → **data-analyst** (1h)
- `optimize_021`: Update universal-planner → **architect** (2h)
- `optimize_030`: Measure size reduction → **data-analyst** (30m)
- `optimize_031`: Validate Phase 2 → **qa-lead** (3h) **[CHECKPOINT]**

---

### Phase 3: Agent Consolidation (22 tasks, 1 week)

**Wave 3.1** (Parallel - 4 tasks):
- `consolidate_001`: Identify duplicates → **data-analyst** (2h)
- `consolidate_002`: Design shared agent pattern → **architect** (3h)
- `consolidate_003`: Map consolidation plan → **architect** (3h)
- `consolidate_004`: Create shared directory → **senior-developer** (1h)

**Wave 3.2** (Parallel - 5 tasks):
- `consolidate_011-015`: Create 15 shared agents → **business-analyst, data-analyst** (4h each)

**Wave 3.3** (Parallel - 11 tasks):
- `consolidate_021-031`: Update domain configs → **senior-developer** (1h each)

**Wave 3.4-3.6** (Serial - 5 tasks):
- `consolidate_030`: Remove duplicates → **senior-developer** (1h)
- `consolidate_041`: Regenerate registry → **data-analyst** (1h)
- `consolidate_042`: Update manifests → **senior-developer** (1h)
- `consolidate_050-052`: Validation checkpoint → **qa-lead** (7h) **[CHECKPOINT]**

---

### Phase 4: Cross-Domain Routing (16 tasks, 1 week)

**Wave 4.1** (Parallel - 3 tasks):
- `crossdomain_001`: Design routing protocol → **architect** (4h)
- `crossdomain_002`: Design workflow structure → **architect** (3h)
- `crossdomain_003`: Create routing config → **senior-developer** (2h)

**Wave 4.2** (Serial - 2 tasks):
- `crossdomain_011`: Enhance universal-executor → **architect** (4h)
- `crossdomain_012`: Enhance trigger agent → **architect** (3h)

**Wave 4.3** (Parallel - 6 tasks):
- `crossdomain_021-026`: Add cross-domain examples to 20 agents → **business-analyst, etc.** (3h each)

**Wave 4.4** (Serial - 2 tasks):
- `crossdomain_030`: Test cross-domain workflows → **qa-lead** (6h)
- `crossdomain_031`: Final validation → **qa-lead** (4h) **[CHECKPOINT]**

---

### Phase 5: Documentation & Launch (8 tasks, 3-4 days)

**Wave 5.1** (Parallel - 5 tasks):
- `launch_001-005`: Update documentation → **scribe** (10h total)

**Wave 5.2** (Serial - 3 tasks):
- `launch_011`: Create release notes → **scribe** (2h)
- `launch_012`: Final validation → **qa-lead** (4h) **[CHECKPOINT]**
- `launch_013`: Create git release → **tech-lead** (1h)

---

## Parallelization Strategy

### Parallel Execution Efficiency

**Total tasks**: 71
**Parallel tasks**: 55 (77%)
**Serial tasks**: 16 (23%)

**Expected speedup**: 3-4x vs sequential execution

### Example: Wave 2.2 (6 Tasks in Parallel)

```
Time: 0h ───────────────────────────────────> 4h

senior-dev-1  [████████ optimize_011 ████████]
senior-dev-2  [████████ optimize_012 ████████]
qa-lead       [████████ optimize_013 ████████]
biz-analyst   [████████ optimize_014 ████████]
editor        [████████ optimize_015 ████████]
senior-dev-3  [██████ optimize_016 ██████]

Sequential time: 23 hours
Parallel time: 4 hours
Speedup: 5.75x
```

---

## Validation Checkpoints

**5 mandatory checkpoints** that must PASS before proceeding:

### Checkpoint 1: Phase 1 Validation (`cleanup_020`)
- ✅ All 11 domains pass tier 0-2 workflows
- ✅ No regressions vs V2 baseline
- ✅ 55 deprecated agents removed successfully

**If FAIL**: Rollback Phase 1, escalate to tech-lead

---

### Checkpoint 2: Phase 2 Validation (`optimize_031`)
- ✅ All 11 domains pass with optimized agents
- ✅ Agent registry functional
- ✅ Size <= 3.5 MB
- ✅ Context usage decreased

**If FAIL**: Rollback Phase 2, review optimization quality

---

### Checkpoint 3: Phase 3 Validation (`consolidate_052`)
- ✅ Shared agents work in all declared domains
- ✅ No capability loss from consolidation
- ✅ Size <= 2.5 MB
- ✅ All 11 domains functional

**If FAIL**: Rollback Phase 3, review consolidation mappings

---

### Checkpoint 4: Phase 4 Validation (`crossdomain_031`)
- ✅ Cross-domain workflows functional (10+ scenarios)
- ✅ Parent-child relationships tracked correctly
- ✅ No circular dependencies
- ✅ Context passing works

**If FAIL**: Rollback Phase 4, fix routing logic

---

### Checkpoint 5: Pre-Launch Validation (`launch_012`)
- ✅ Complete system functional
- ✅ All documentation complete
- ✅ Size target met (2.0-2.5 MB)
- ✅ Context improvements verified
- ✅ GO/NO-GO decision

**If FAIL**: HOLD LAUNCH, escalate to vp-engineering

---

## Monitoring Progress

### Real-Time Progress Tracking

```bash
# Check overall progress
cat Agent_Memory/v3_consolidation/progress.yaml

# Check current phase status
cat Agent_Memory/v3_consolidation_*/status.yaml

# View completed tasks
ls Agent_Memory/v3_consolidation_*/tasks/completed/

# View task outputs
ls Agent_Memory/v3_consolidation_*/outputs/final/
```

### Progress Dashboard

```yaml
# Agent_Memory/v3_consolidation/progress.yaml

overall:
  total_tasks: 71
  completed: 23
  in_progress: 4
  pending: 44
  blocked: 0

phases:
  phase1:
    status: completed
    tasks_completed: 9/9
    validation: PASS
    duration: 6.5 hours

  phase2:
    status: in_progress
    tasks_completed: 14/16
    validation: pending
    current_wave: wave_2.4

current_phase: phase2
estimated_completion: 2026-02-05
```

---

## Agent Assignments

### Agents Used in Consolidation

| Agent | Role | Tasks | Hours |
|-------|------|-------|-------|
| **qa-lead** | Validation & testing | 8 | 32 |
| **senior-developer** | Implementation & scripting | 12 | 42 |
| **architect** | Design & architecture | 8 | 30 |
| **data-analyst** | Analysis & metrics | 6 | 12 |
| **business-analyst** | Business domain work | 8 | 28 |
| **scribe** | Documentation | 5 | 12 |
| **tech-lead** | Orchestration & release | 2 | 6 |
| **editor** | Creative domain work | 1 | 4 |

**Total agent-hours**: ~166 hours
**Calendar time** (with parallel execution): 4-5 weeks

---

## Error Handling

### Task Failures

If a task fails:

```yaml
task_result:
  task_id: optimize_011
  status: FAILED
  error: "Optimization script crashed on tech-lead.md"
  agent: senior-developer

executor_action:
  1. Move task to tasks/blocked/
  2. Log error details
  3. Attempt recovery with self-correct agent
  4. If recovery fails, escalate to tech-lead
  5. Tech-lead decides: retry, skip, or block phase
```

### Validation Failures

If a validation checkpoint fails:

```yaml
validation_result:
  checkpoint: phase2_validation
  status: FAIL
  reason: "Size target exceeded: 3.8 MB > 3.5 MB target"

orchestrator_action:
  1. BLOCK progression to Phase 3
  2. Escalate to tech-lead
  3. Tech-lead reviews:
     - Can we adjust target? (increase to 4 MB)
     - Should we optimize more agents?
     - Is the target unrealistic?
  4. Decision: adjust-target, retry-phase, or abort
```

---

## Rollback Procedures

### Full Rollback

```bash
# Abort entire consolidation
git checkout main
git branch -D v3-consolidation

# Clear Agent_Memory
rm -rf Agent_Memory/v3_consolidation*
```

### Phase Rollback

```bash
# Rollback to Phase N
git checkout v3-phase-{N}-validated

# Clear Phase N+1 work
rm -rf Agent_Memory/v3_consolidation/phase{N+1}

# Resume from Phase N validation checkpoint
/trigger Resume V3 consolidation from Phase {N} validation
```

### Task Rollback

```bash
# Undo specific task
git checkout HEAD -- <files-modified-by-task>

# Mark task for retry
mv Agent_Memory/v3_consolidation_*/tasks/completed/task_XXX.yaml \
   Agent_Memory/v3_consolidation_*/tasks/pending/
```

---

## Success Criteria

V3 consolidation is **successful** when:

✅ **All 71 tasks completed** without blocking failures
✅ **All 5 validation checkpoints passed**
✅ **Plugin size 2.0-2.5 MB** (64% reduction from 5.6MB)
✅ **All 11 domains functional** (tier 0-3 workflows pass)
✅ **Cross-domain routing works** (10+ scenarios tested)
✅ **Shared agents functional** (all declared domains tested)
✅ **Context usage decreased** vs V2 baseline
✅ **Documentation complete** (CLAUDE.md, README, guides)
✅ **V3.0 tagged and released** in git

---

## Example: Executing Full Consolidation

```bash
# Step 1: Review the plan
cat V3_EXECUTABLE_WORKFLOW_PLAN.md

# Step 2: Launch the workflow
/trigger Execute complete V3 consolidation from V3_EXECUTABLE_WORKFLOW_PLAN.md

# The system will:
# - Create instruction: v3_consolidation_20260110_001
# - Parse 71 tasks from the plan
# - Execute Phase 1 (9 tasks)
# - Run validation checkpoint
# - If PASS: Continue to Phase 2
# - Execute Phase 2 (16 tasks)
# - Run validation checkpoint
# - Continue through all 5 phases...

# Step 3: Monitor progress
watch -n 60 'cat Agent_Memory/v3_consolidation/progress.yaml'

# Step 4: Review results after each phase
cat Agent_Memory/v3_consolidation_*/validation/phase1_results.yaml
cat Agent_Memory/v3_consolidation_*/validation/phase2_results.yaml
# etc...

# Step 5: After all phases complete
cat Agent_Memory/v3_consolidation_*/validation/phase4_final_results.yaml

# If PASS:
#   - V3.0 is ready for release
#   - Launch script creates git tag
#   - Documentation updated
#   - Plugin published to marketplace

# If FAIL:
#   - Review failure logs
#   - Decide on rollback vs fix
#   - Escalated to vp-engineering
```

---

## Advantages of Agent-Executable Design

### 1. Parallelization
- **77% of tasks run in parallel** (55/71)
- **3-4x speedup** vs sequential execution
- **Optimal resource utilization** (8 agents working simultaneously)

### 2. Fault Tolerance
- **Task-level granularity** - failures isolated to individual tasks
- **Automatic retry** via self-correct agent
- **Clear escalation paths** when automation fails
- **Phase-level rollback** without losing all progress

### 3. Progress Tracking
- **Real-time visibility** into workflow status
- **Checkpoint validation** ensures quality gates
- **Clear success criteria** for each task
- **Automated reporting** at each milestone

### 4. Flexibility
- **Execute full workflow** or individual phases
- **Run specific tasks** for testing
- **Resume from checkpoints** after fixes
- **Parallel development** of different phases

### 5. Auditability
- **Every task logged** with inputs/outputs
- **Agent assignments tracked** for accountability
- **Validation results preserved** for compliance
- **Complete history** in Agent_Memory

---

## Next Steps

1. **Review the plan**: Read V3_EXECUTABLE_WORKFLOW_PLAN.md
2. **Approve for execution**: Tech-lead or VP-Engineering approval
3. **Launch Phase 1**: Execute cleanup and analysis
4. **Validate checkpoint**: Ensure no regressions
5. **Proceed through phases**: One at a time or full automation
6. **Launch V3.0**: After final validation passes

---

**Ready to Execute**: Yes
**Execution Mode**: Automated agent-driven workflow
**Estimated Duration**: 4-5 weeks with parallel execution
**Success Probability**: High (with 5 validation checkpoints)
**Recommended Approach**: Full automated execution with monitoring
