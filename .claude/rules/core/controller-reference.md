---
paths:
  - "agents/planner/**"
  - "agents/execution-monitor/**"
  - "agents/validator/**"
  - "**/config/planner_config.yaml"
---

# Controller Reference Details

Detailed schemas, examples, and protocols for controller coordination. See `controllers.md` for core rules.

## Reviewer Spawning Pattern

After each executor completes, spawn a reviewer:

```javascript
// Step 1: Executor implements
Agent({
  subagent_type: "cagents:{execution_agent}",
  description: "Implement: {work_item}",
  prompt: "Implement {work_item_description}.\nAcceptance criteria: {criteria}\n{feedback_from_previous_round if any}"
})

// Step 2: Reviewer evaluates
Agent({
  subagent_type: "cagents:reviewer",  // domain-agnostic reviewer (core/reviewer/)
  description: "Review: {work_item}",
  prompt: "Review implementation of {work_item_description}.\nAcceptance criteria: {criteria}\nCheck: Does implementation meet all criteria?\nOutput: PASS or REVISE with specific feedback."
})
```

### Reviewer Output Format

```yaml
review_result: PASS|REVISE
round: {current_round}
feedback: |
  {specific feedback if REVISE -- what needs to change and why}
criteria_met:
  - criterion: "{criterion_text}"
    met: true|false
    notes: "{details}"
```

## Blind Review Protocol (V10.6.0, Tier 3+ Only)

**Standard Review (Tier 2)**: Single reviewer, sees executor identity.

**Blind Review (Tier 3+)**:
1. Spawn 2-3 independent reviewers for each work item
2. Each reviewer gets the implementation without the name of the executor and
   without the verdict of any other reviewer
3. Reviewers evaluate independently against acceptance criteria
4. Controller collects all reviews and applies consensus rules

**Consensus Rules**:
```
if all_reviewers == PASS:
  Spawn Devil's Advocate reviewer (anti-sycophancy check)
  Devil's Advocate actively looks for weaknesses
  if devil_advocate == PASS: Accept (high confidence: 0.95)
  if devil_advocate == REVISE: Send feedback to executor (round += 1)

if majority == PASS (e.g., 2/3):
  Accept with noted dissent (confidence: 0.80)
  Log dissenting reviewer's feedback for validator

if majority == REVISE:
  Aggregate all feedback, send to executor (round += 1)
```

**Devil's Advocate Prompt**:
```javascript
Agent({
  subagent_type: "cagents:reviewer",
  description: "Devil's Advocate review: {work_item}",
  prompt: "You are a Devil's Advocate reviewer. Your job is to find weaknesses.\n" +
    "Previous reviewers all gave PASS. Actively look for:\n" +
    "- Edge cases not covered\n- Security vulnerabilities\n- Performance issues\n" +
    "- Acceptance criteria technically met but poorly implemented\n" +
    "Only output PASS if you genuinely cannot find issues.\n" +
    "Acceptance criteria: {criteria}"
})
```

**Anti-Sycophancy Measures**:
- Reviewers do NOT see executor name or previous review results
- Devil's Advocate is explicitly prompted to find weaknesses
- Unanimous PASS requires Devil's Advocate confirmation
- All review results logged in coordination_log.yaml for audit

## Dead-Letter Queue (V10.6.0)

LP-27 (v12.7.x) lowered the rounds-cap from 3 to 2. The cap is
`controller_revision.max_internal_rounds` in `pipeline_config.yaml`. A work item
that fails 2 reviewer rounds enters the dead-letter queue:

```yaml
# In coordination_log.yaml
dead_letter_items:
  - task_id: TASK-{N}
    name: "{task_name}"
    status: dead_letter
    rounds_attempted: 2
    last_feedback: "{reviewer's final feedback}"
    best_attempt_location: "outputs/TASK-{N}_{name}.md"
    reason: "Failed to meet acceptance criteria after 2 reviewer rounds"
```

**Dead-letter behavior**:
- Work item status set to `dead_letter` (not `completed`)
- Pipeline continues with remaining work items
- Validator classifies as `PARTIAL_PASS` when dead-letter items exist
- `PARTIAL_PASS` routes as PASS in pipeline (does not trigger re-execution)
- Dead-letter items are reported in validation_report.yaml for user visibility

**Pipeline routing** (pipeline_config.yaml):
```yaml
classification_mapping:
  PARTIAL_PASS: PASS
```

## coordination_log.yaml Review Tracking

```yaml
implementation_tasks:
  - task_id: TASK-01
    name: "{task_name}"
    assigned_to: cagents:{executor}
    agent_id: "{agent_id}"          # REQUIRED: Links to agent_tree.yaml entry for audit-trail traceability
    acceptance_criteria: [...]
    status: completed
    confidence: 0.85
    confidence_rationale: "Implementation verified, tests pass, edge cases covered"
    review_rounds:
      - round: 1
        reviewer: cagents:reviewer
        result: REVISE
        feedback: "Missing error handling for edge case X"
      - round: 2
        reviewer: cagents:reviewer
        result: PASS
        feedback: ""
    total_rounds: 2
```

## Confidence Tiers (V10.6.0)

Every completed work item MUST include a `confidence` score (0.0-1.0):

| Range | Tier | Meaning | Action |
|-------|------|---------|--------|
| 0.9-1.0 | **High** | Verified with tests/evidence, all criteria met | Accept |
| 0.7-0.89 | **Medium** | Likely correct, some criteria verified | Accept with note |
| 0.5-0.69 | **Low** | Partially verified, gaps in evidence | Flag for validator |
| 0.0-0.49 | **Very Low** | Unverified, inferred, or speculative | Trigger re-review |

**Rules**: `confidence` is mandatory. An item below 0.7 triggers more scrutiny. The
validator uses the scores to set the order of its checks.

## Completion Event Schema (HISTORICAL: EVT-* emission removed in v12.6.0)

> Before v12.6.0, controllers emitted a `workflow/events/EVT-{N}.yaml` completion
> event on each state transition. v12.6.0 removed EVT-file emission, which agrees
> with `orchestration-reference.md`. The terminal artifact of a controller is now
> `coordination_log.yaml` alone. v12.0.0 also removed the `delegation_prompts.yaml`
> input, so controllers use standard delegation prompts. The schema below stays for
> back-compat with archived sessions.

```yaml
event_id: EVT-{N}
state: COORDINATED
agent: cagents:{controller_name}
timestamp: "{ISO_TIMESTAMP}"
duration_seconds: {elapsed}
inputs_consumed:
  - workflow/work_items.yaml
outputs_produced:
  - workflow/coordination_log.yaml
next_state: VALIDATED
metadata:
  work_items_completed: {count}
  total_review_rounds: {sum_across_all_items}
  items_with_revisions: {count_of_items_that_needed_revision}
```

## Decision Log Protocol (V10.6.0)

Controllers maintain append-only decision logs during coordination.

### DECISIONS.md Example

```markdown
# Decisions Log

## [2026-03-07T05:30:00Z] Decision: Use JWT over session tokens
- Context: Auth system design for user service
- Rationale: Stateless, better for API clients, scales horizontally
- Alternatives rejected: Session tokens (stateful, requires sticky sessions)
- Confidence: 0.85
- Made by: cagents:architect
```

### CORRECTIONS.md Example

```markdown
# Corrections Log

## [2026-03-07T06:00:00Z] Correction: Switch from bcrypt to argon2
- Original decision: Use bcrypt for password hashing
- Why changed: Reviewer identified bcrypt's 72-byte limit as a security concern
- New approach: argon2id with memory cost 64MB
- Detected by: cagents:reviewer (round 2)
```

### File Locations

```
cagents-memory/_projects/{project_hash}/DECISIONS.md   # Persistent across sessions
cagents-memory/_projects/{project_hash}/CORRECTIONS.md  # Persistent across sessions
workflow/DECISIONS.md                                  # Session-scoped copy
workflow/CORRECTIONS.md                                # Session-scoped copy
```

### _projects/{hash}/ Convention

- `{hash}` comes from the project root path, such as the first 8 chars of SHA-256
- Contains DECISIONS.md, CORRECTIONS.md, and other cross-session state
- Created on first use, never deleted automatically

## Task-Tracking Examples (interactive: TaskCreate; SDK: TodoWrite)

Interactive Claude Code sessions are the primary cAgents runtime. They MUST use
`TaskCreate`, `TaskUpdate`, `TaskList`, and `TaskGet`. `TodoWrite` is the equivalent
for the Agent SDK and for a non-interactive run. Do not use `TodoWrite` in an
interactive runtime. The examples below use the interactive `TaskCreate` form.

**Good** (descriptive, action-oriented):
```
TaskCreate({ subject: "[orchestrator] Enriching request context" })
TaskCreate({ subject: "[planner] Planning objectives and selecting controller" })
TaskCreate({ subject: "[tech-lead] Coordinating implementation with execution agents" })
TaskCreate({ subject: "[backend-developer] Implementing user authentication endpoint" })
TaskCreate({ subject: "[qa-lead] Validating auth endpoint against acceptance criteria" })
TaskCreate({ subject: "[validator] Validating outputs against acceptance criteria" })
// Drive status with TaskUpdate({ taskId, status: "in_progress" | "completed" })
```

**Bad** (state-machine jargon, generic placeholders):
```
[/act] Pipeline: INIT (enriching context)
[/act] Pipeline: ORCHESTRATED (planning)
[controller] Pipeline: PLANNED (coordinating)
[exec_agent_1] specific_task_1
```
