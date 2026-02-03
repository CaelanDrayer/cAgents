# Executor Patterns

## Controller Handoff Pattern

```yaml
Task:
  subagent_type: "{domain}:{controller_name}"
  description: "Coordinate {objective} via question-based delegation"
  prompt: |
    You are the primary controller for this workflow.

    Instruction ID: {instruction_id}
    Objectives: {list from plan.yaml}
    Success Criteria: {list from plan.yaml}

    Your Responsibilities:
    1. Break objectives into specific questions
    2. Delegate questions to execution agents
    3. Collect and synthesize answers
    4. Create implementation tasks
    5. Write workflow/coordination_log.yaml

    Constraints:
    - Max questions: {max_questions}
    - Context budget: {budget} tokens
```

## Blocker Detection

### Blocker Types

| Type | Severity | Recovery |
|------|----------|----------|
| **Question Unanswered** (10+ min) | MAJOR | Retry with fallback agent |
| **Circular Delegation** | CRITICAL | HALT - escalate to HITL |
| **Max Questions Exceeded** | CRITICAL | Force synthesis |
| **Timeout Approaching** (85%) | WARNING | Warn controller |
| **Synthesis Incomplete** | MAJOR | Request controller complete |
| **Controller Crashed** | CRITICAL | Retry once, then escalate |

### Auto-Recovery Workflow

```yaml
1. Detect blocker type
2. Check if auto-recoverable
3. Attempt recovery action
4. If recovery succeeds → continue monitoring
5. If recovery fails → escalate to universal-self-correct
6. If self-correct fails → escalate to HITL
```

### Question Unanswered Recovery

```yaml
Steps:
  1. Wait 10 min after question asked
  2. If no answer → check execution agent status
  3. If agent crashed → retry with fallback agent
  4. If agent stuck → escalate to controller
  5. Max retries: 3
  6. If all fail → mark unanswered, notify controller
```

## Tier-Based Timeouts

| Tier | Timeout | Warning (85%) | Action at Timeout |
|------|---------|---------------|-------------------|
| 2 | 30 min | 25 min | Escalate with synthesis so far |
| 3 | 60 min | 50 min | Escalate with partial coordination |
| 4 | 120 min | 100 min | Request HITL approval to continue |

## Execution Summary Format

```yaml
instruction_id: {id}
coordination_approach: question_based
controller_primary: {domain}:{controller}
controller_supporting: []

coordination_stats:
  questions_asked: 8
  questions_answered: 8
  max_questions_limit: 20
  utilization: 40%
  coordination_time_minutes: 25

synthesis:
  objectives_addressed: [obj-1, obj-2, obj-3]
  solution_summary: "{from coordination_log}"
  key_decisions: [...]

implementation_tasks:
  count: 12
  tasks: [...]

outputs_produced:
  - outputs/architecture_decision.md
  - outputs/implementation_plan.md

preliminary_quality_assessment:
  completeness: high
  synthesis_quality: high
  actionability: high
  issues: []

next_phase: validating
```

## Handoff to Validator

```yaml
# Update execution_state.yaml
phase: completed
controller_status: completed
validation_ready: true
outputs_for_validation:
  - outputs/execution_summary.yaml
  - workflow/coordination_log.yaml
  - {all other outputs}
```

## Validation Before Handoff

Executor validates structure before handoff:
- coordination_log.yaml exists
- Has questions_asked (non-empty array)
- Has synthesized_solution (non-empty)
- Has implementation_tasks (non-empty array)
- Questions count <= max_questions
- All questions answered OR marked skipped

If any check fails:
- Set validation_ready: false
- Request controller fix issues
- If no response → escalate to validator anyway (will reject)
