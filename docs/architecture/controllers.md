# Controller Architecture

## Overview

Controllers are tier 2 agents that coordinate work between planning and execution. They NEVER do direct work -- all implementation is delegated to execution agents via the Agent tool.

## Question-Based Delegation

```
1. Controller receives objectives from plan.yaml
2. Breaks objectives into specific questions
3. Identifies execution agents to delegate to
4. Delegates questions via Agent tool
5. Execution agents provide expert answers
6. Controller synthesizes answers into solution
7. Creates implementation tasks
8. Coordinates execution with reviewer loops
9. Writes coordination_log.yaml
```

## Agent Chaining (v10)

v10 introduces agent chaining for dependent work items:
- Decomposer creates a dependency graph with topological ordering
- Controller executes work items in dependency order
- Completed work items pass context to dependent items via file-based handoffs
- Each work item includes `depends_on` and `provides_context_for` fields

## Reviewer Loops

After each executor completes:
1. Spawn reviewer to evaluate against acceptance criteria
2. If PASS: proceed to next work item
3. If REVISE: send feedback to executor (max 3 rounds)
4. After 3 rounds: accept best result, escalate issues to validator

## Controllers by Domain

| Domain | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|
| Engineering | tech-lead | + architect, security-lead | cto + tech-lead |
| Creative | narrative-director | + story-architect, editor | cco + narrative-director |
| Business | operations-manager | + strategic-planner | cpo + cfo |
| Growth | campaign-manager | + marketing-strategist | cro + campaign-manager |
| People | hr-manager | + talent-acquisition-manager | chro + hr-manager |
| Service | customer-success-manager, general-counsel | + support-director | general-counsel |

## Coordination Log

Output written to `workflow/coordination_log.yaml`:
```yaml
controller: cagents:tech-lead
objectives: [...]
questions_asked:
  - question: "What is the current auth implementation?"
    delegated_to: cagents:backend-developer
    answer: "JWT-based with refresh tokens"
synthesized_solution:
  approach: "Extend existing JWT system"
  rationale: "Minimal disruption"
implementation_tasks:
  - task_id: TASK-01
    name: "Add MFA support"
    assigned_to: cagents:backend-developer
    acceptance_criteria: [...]
    status: completed
    review_rounds:
      - round: 1
        result: PASS
status: completed
```
