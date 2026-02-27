# Orchestration Frameworks

## Phase Transition Flow

```
routing
  ↓ (Router assigns tier + template)
planning
  ↓ (Planner defines objectives, selects controller)
  ↓ [PLAN DISPLAY - show plan, then auto-proceed]
coordinating
  ↓ (Controller asks questions, synthesizes solution)
executing
  ↓ (Executor monitors controller, aggregates outputs)
validating
  ├─ PASS → completed
  ├─ FIXABLE → correcting
  └─ BLOCKED → blocked
```

## Invoking Universal Agents

### Routing Phase
```yaml
Task:
  subagent_type: "cagents:universal-router"
  description: "Route and classify instruction"
  prompt: |
    Route instruction: {instruction_id}
    Domain: {domain} (confidence: {confidence})
    Write: workflow/routing.yaml
```

### Planning Phase
```yaml
Task:
  subagent_type: "cagents:universal-planner"
  description: "Define objectives and select controller"
  prompt: |
    Plan execution: {instruction_id}
    Domain: {domain}, Tier: {tier}
    Write: workflow/plan.yaml, workflow/decomposition.yaml
```

### Coordinating Phase
```yaml
Task:
  subagent_type: "cagents:{controller-agent}"
  description: "Coordinate work using decomposition"
  prompt: |
    You are the coordinating controller.
    Decomposition: workflow/decomposition.yaml
    Objectives: {from plan.yaml}
    Write: workflow/coordination_log.yaml
```

## Plan Display Format

### Tier 2-4 (Full Display)

**Agent prefix convention**: Each phase/task shown to the user is prefixed with the executing agent name in brackets.

```
======================================
WORKFLOW PLAN
======================================
Request: {original_request}
Domain: {domain} | Tier: {tier}

OBJECTIVES:
1. {objective_1}
2. {objective_2}

WORK BREAKDOWN ({total_items} items):
- UNDERSTAND: {count} items
- DESIGN: {count} items
- BUILD: {count} items
- VERIFY: {count} items
- DOCUMENT: {count} items

CONTROLLERS:
- Primary: [{primary_controller}]
- Supporting: [{supporting_controllers} or 'None']

EXECUTION AGENTS:
- [{execution_agent_1}] {assigned_work_items}
- [{execution_agent_2}] {assigned_work_items}

CRITICAL PATH: {critical_path_summary}

[orchestrator] Proceeding to coordination...
======================================
```

## Task Inventory Integration

### When to Enable
| Workflow Size | Recommendation |
|---------------|----------------|
| < 20 tasks | Standard workflow |
| 20-50 tasks | Enable inventory |
| 50+ tasks | Required (context overflow) |

### Context Savings
| Tasks | Without Inventory | With Inventory | Savings |
|-------|-------------------|----------------|---------|
| 20 | 8K tokens | 2K tokens | 75% |
| 50 | 20K tokens | 3K tokens | 85% |
| 100 | 40K tokens | 4K tokens | 90% |

### Inventory Initialization
```yaml
Task:
  subagent_type: "cagents:task-inventory"
  description: "Initialize CSV inventory from decomposition"
  prompt: |
    Initialize task inventory:
    - Source: workflow/decomposition.yaml
    - Output: inventory/
    - Create: tasks.csv, batch_log.csv, assignments.csv
```

## Tier-Specific Workflows

| Tier | Controllers | Workflow |
|------|-------------|----------|
| **2** | 1 primary | routing → planning → coordinating → executing → validating |
| **3** | 1 primary + 1-2 supporting | Same, multi-controller coordination |
| **4** | 1 executive + 1 primary + 2-4 supporting + HITL | Same, with approval gates |

## Adaptive Execution

### Execution Mode Switching
```
If actual_duration > estimated_duration * 1.5:
  - Check if parallel execution possible
  - Switch from sequential → pipeline or swarm
  - Log adjustment for analytics
```

### Tier Escalation
```
If controller_questions > max_questions * 0.9:
  - Consider tier escalation (tier 2 → tier 3)
  - Add supporting controllers
  - Extend timeouts
```

## Phase Completion Detection

| Phase | Detection |
|-------|-----------|
| Routing | routing_decision.yaml exists |
| Planning | plan.yaml exists with controller assignment |
| Coordinating | coordination_log.yaml with status: completed |
| Executing | All tasks completed, outputs aggregated |
| Validating | validation_result in status.yaml |

## Error Handling

| Error | Response |
|-------|----------|
| Phase stuck | Check timeout, escalate to HITL |
| Controller blocked | Check coordination log, identify blockers |
| Agent unavailable | Log, retry, escalate if persistent |
| Invalid transition | Rollback to last checkpoint |
| Config missing | Log error, escalate to HITL |
