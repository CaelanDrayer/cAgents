# Orchestration Patterns

Workflow orchestration guidelines for cAgents V7.0.

## CRITICAL: Automatic Phase Transitions

**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN PHASES**

Phase transitions are AUTOMATIC. Orchestrator proceeds to next phase immediately when current phase completes.

### Automatic Transition Rules

- ✅ routing → planning: AUTOMATIC (no user permission needed)
- ✅ planning → coordinating: AUTOMATIC (no user permission needed)
- ✅ coordinating → executing: AUTOMATIC (no user permission needed)
- ✅ executing → validating: AUTOMATIC (no user permission needed)
- ✅ validating → complete: AUTOMATIC if PASS (no user permission needed)

### Only Ask User When

- Tier 4 HITL approval gates (specified in plan.yaml)
- Unrecoverable errors or blockers
- Ambiguous requirements that cannot be inferred
- Validation BLOCKED status (not FIXABLE)

**If requirements are clear and phase is complete, PROCEED automatically.**

## Workflow Phases

All tier 2+ workflows follow this pattern:

```
routing → planning → [PLAN DISPLAY] → coordinating → executing → validating
   ↓          ↓            ↓              ↓            ↓           ↓
  Router   Planner    Orchestrator   Controller   Executor   Validator
(tier 0-4) (objectives) (show plan)   (questions)  (monitor)  (quality)
```

**Plan Display**: After planning, orchestrator shows the plan to the user, then immediately proceeds to coordinating. This is visibility, not a checkpoint.

## Phase Responsibilities

### Routing (universal-router)
- Classify complexity tier (0-4)
- Set `requires_controller` flag for tier 2+
- Domain detection and validation

### Planning (universal-planner)
- Define objectives (WHAT needs to be done)
- Select controllers (primary + supporting)
- Create objective-driven plan (NOT detailed tasks)

### Coordinating (Controllers)
- Break objectives into questions
- Delegate questions to specialists
- Synthesize answers into solutions
- Create implementation tasks
- Write coordination_log.yaml

### Executing (universal-executor)
- Monitor controller progress (NOT execution agents)
- Track coordination_log.yaml completion
- Validate phase transitions

### Validating (universal-validator)
- Check coordination quality
- Verify output quality
- Validate no regressions

## Plan Display Phase

After planning completes (plan.yaml exists), orchestrator displays the plan before coordinating:

1. **Read** plan.yaml and decomposition.yaml
2. **Format** plan summary (objectives, work breakdown, controllers)
3. **Output** to user (unless `--quiet` flag)
4. **Proceed** immediately to coordinating (do NOT wait)

**Plan Display by Tier**:
- **Tier 0**: Skip (no plan)
- **Tier 1**: Brief 1-line summary
- **Tier 2-4**: Full plan with work breakdown

**IMPORTANT**: Showing plan ≠ Asking permission. Display then proceed.

## Key Principle

**Controllers coordinate, don't execute directly**. Use question-based delegation to specialists.
