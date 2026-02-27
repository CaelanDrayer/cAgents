# TodoWrite Helper Patterns

Shared TodoWrite patterns for cAgents V7.0 to eliminate duplication.

**IMPORTANT: Agent Name Prefix Convention** - All tasks displayed to users MUST be prefixed with the executing agent's name in brackets: `[agent-name] task description`. This applies to both `content` and `activeForm` fields. This lets the user see which agent is responsible for each task at a glance.

## Standard Workflow TodoWrite Pattern

Use this pattern for standard tier 2+ workflows (routing -> planning -> coordinating -> executing -> validating):

```yaml
todos:
  - content: "[universal-router] Route request to appropriate domain and tier"
    status: "in_progress"
    activeForm: "[universal-router] Routing request to appropriate domain and tier"

  - content: "[universal-planner] Create objectives and select controllers"
    status: "pending"
    activeForm: "[universal-planner] Creating objectives and selecting controllers"

  - content: "[{controller}] Coordinate work via question-based delegation"
    status: "pending"
    activeForm: "[{controller}] Coordinating work via question-based delegation"

  - content: "[universal-executor] Execute implementation tasks"
    status: "pending"
    activeForm: "[universal-executor] Executing implementation tasks"

  - content: "[universal-validator] Validate outputs and quality"
    status: "pending"
    activeForm: "[universal-validator] Validating outputs and quality"
```

**Note**: Replace `{controller}` with the actual controller name once known (e.g., `engineering-manager`, `creative-director`). Before the controller is selected, use `[controller]` as a placeholder.

## Progressive Refinement Pattern (Agent Routing Updates)

**CRITICAL**: When any workflow agent determines which specific agent(s) will handle the next phase, it MUST immediately issue a TodoWrite update to replace generic placeholders with the specific agent name(s). This gives the user real-time visibility into agent routing decisions.

### How It Works

The TodoWrite list evolves as the workflow progresses and agents are identified:

**Step 1 -- Initial (before routing)**:
```yaml
todos:
  - content: "[/run] Route request to domain and tier"
    status: "in_progress"
    activeForm: "[/run] Routing request to domain and tier"
  - content: "[/run] Plan objectives and select controller"
    status: "pending"
    activeForm: "[/run] Planning objectives and selecting controller"
  - content: "[controller] Coordinate work via question-based delegation"
    status: "pending"
    activeForm: "[controller] Coordinating work via question-based delegation"
  - content: "[/run] Validate outputs and quality"
    status: "pending"
    activeForm: "[/run] Validating outputs and quality"
```

**Step 2 -- After routing selects controller** (e.g., `engineering-manager`):
```yaml
todos:
  - content: "[/run] Route request to domain and tier"
    status: "completed"
  - content: "[/run] Plan objectives and select controller"
    status: "in_progress"
    activeForm: "[/run] Planning objectives and selecting controller"
  - content: "[engineering-manager] Coordinate work via question-based delegation"
    status: "pending"
    activeForm: "[engineering-manager] Coordinating work via question-based delegation"
  - content: "[/run] Validate outputs and quality"
    status: "pending"
    activeForm: "[/run] Validating outputs and quality"
```

**Step 3 -- After controller identifies execution agents** (e.g., `backend-developer`, `qa-tester`, `security-specialist`):
```yaml
todos:
  - content: "[/run] Route request to domain and tier"
    status: "completed"
  - content: "[/run] Plan objectives and select controller"
    status: "completed"
  - content: "[engineering-manager] Coordinate work via question-based delegation"
    status: "in_progress"
    activeForm: "[engineering-manager] Coordinating work via question-based delegation"
  - content: "[backend-developer] Implement authentication fix"
    status: "pending"
    activeForm: "[backend-developer] Implementing authentication fix"
  - content: "[qa-tester] Create regression tests"
    status: "pending"
    activeForm: "[qa-tester] Creating regression tests"
  - content: "[security-specialist] Review security implications"
    status: "pending"
    activeForm: "[security-specialist] Reviewing security implications"
  - content: "[/run] Validate outputs and quality"
    status: "pending"
    activeForm: "[/run] Validating outputs and quality"
```

### Rules for Progressive Refinement

1. **Replace placeholders immediately**: As soon as an agent is identified, update `[controller]` to `[engineering-manager]`, etc.
2. **Show all executors**: When a controller delegates to multiple execution agents, add a separate TodoWrite entry for EACH one with the specific agent name
3. **Preserve completed entries**: Never remove completed entries -- only update pending/in_progress entries
4. **One update per routing decision**: Issue a TodoWrite update each time an agent routing decision is made
5. **Include task description**: Each executor entry should have a brief description of what that agent will do, not a generic placeholder

### Who Updates When

| Workflow Agent | Updates TodoWrite When | What Changes |
|----------------|----------------------|--------------|
| `/run` (routing) | Controller identified | `[controller]` -> `[engineering-manager]` |
| Controller | Execution agents identified | Add individual `[backend-developer]`, `[qa-tester]`, etc. entries |
| Controller | Implementation tasks created | Update executor entries with specific task descriptions |

## Phase Transition TodoWrite Pattern

Use when marking a phase complete and transitioning to next phase:

```yaml
# Mark current phase complete
TodoWrite:
  - Update current task status: "in_progress" → "completed"
  - Update next task status: "pending" → "in_progress"
```

**CRITICAL**: NEVER have zero tasks in_progress. Always mark one task complete and immediately mark the next as in_progress in the same TodoWrite call.

## Error Handling TodoWrite Pattern

Use when encountering validation failures or blockers:

```yaml
# Mark failed task
TodoWrite:
  - Current task status: "in_progress" → "pending"
  - Add error todo (prefix with the agent handling the error):
      content: "[{agent}] Resolve {error_type}: {error_message}"
      status: "in_progress"
      activeForm: "[{agent}] Resolving {error_type}: {error_message}"
```

## Controller Coordination TodoWrite Pattern

Use for controllers during coordinating phase. Prefix with the controller's own name:

```yaml
todos:
  - content: "[{controller}] Analyze objectives from plan.yaml"
    status: "in_progress"
    activeForm: "[{controller}] Analyzing objectives from plan.yaml"

  - content: "[{controller}] Break down into {N} specific questions"
    status: "pending"
    activeForm: "[{controller}] Breaking down into {N} specific questions"

  - content: "[{controller}] Delegate questions to execution agents"
    status: "pending"
    activeForm: "[{controller}] Delegating questions to execution agents"

  - content: "[{controller}] Synthesize answers into solution"
    status: "pending"
    activeForm: "[{controller}] Synthesizing answers into solution"

  - content: "[{controller}] Create implementation tasks"
    status: "pending"
    activeForm: "[{controller}] Creating implementation tasks"

  - content: "[{controller}] Write coordination_log.yaml"
    status: "pending"
    activeForm: "[{controller}] Writing coordination_log.yaml"
```

**Note**: Replace `{controller}` with the actual controller name (e.g., `[engineering-manager]`, `[creative-director]`).

**After identifying execution agents**, update the TodoWrite to add specific executor entries using the **Progressive Refinement Pattern**. For example, after `engineering-manager` determines it needs `backend-developer` and `qa-tester`:

```yaml
todos:
  - content: "[engineering-manager] Analyze objectives from plan.yaml"
    status: "completed"
  - content: "[engineering-manager] Break down into 4 specific questions"
    status: "completed"
  - content: "[engineering-manager] Delegate questions to execution agents"
    status: "in_progress"
    activeForm: "[engineering-manager] Delegating questions to execution agents"
  - content: "[backend-developer] Answer: What is current auth implementation?"
    status: "pending"
    activeForm: "[backend-developer] Analyzing current auth implementation"
  - content: "[qa-tester] Answer: What test coverage exists?"
    status: "pending"
    activeForm: "[qa-tester] Analyzing test coverage"
  - content: "[engineering-manager] Synthesize answers into solution"
    status: "pending"
    activeForm: "[engineering-manager] Synthesizing answers into solution"
  - content: "[engineering-manager] Create implementation tasks"
    status: "pending"
    activeForm: "[engineering-manager] Creating implementation tasks"
  - content: "[engineering-manager] Write coordination_log.yaml"
    status: "pending"
    activeForm: "[engineering-manager] Writing coordination_log.yaml"
```

## Usage

Agents import this helper via:

```markdown
@shared/patterns/todo_write_helper.md
```

Then reference specific patterns:
- **Standard workflow pattern**: For tier 2+ workflows
- **Phase transition pattern**: When completing phases
- **Error handling pattern**: When encountering failures
- **Controller coordination pattern**: For coordinating phase

## Benefits

- **2,000+ lines eliminated**: No duplication across agents
- **Consistency**: All agents use same TodoWrite patterns
- **Maintainability**: Update pattern once, affects all agents
- **Clarity**: Single source of truth for TodoWrite usage

## Example Usage in Agent

```markdown
---
name: engineering-manager
tier: controller
domain: make
---

# Engineering Manager

@shared/patterns/todo_write_helper.md

## Coordinating Phase

During coordination, use the **Controller Coordination TodoWrite Pattern** from the helper,
replacing `{controller}` with your agent name (`engineering-manager`):

1. [engineering-manager] Analyze objectives
2. [engineering-manager] Break into questions (8-12)
3. [engineering-manager] Delegate to specialists
4. [engineering-manager] Synthesize answers
5. [engineering-manager] Create tasks
6. [engineering-manager] Write coordination_log.yaml

The agent-prefixed TodoWrite pattern ensures the user can see which agent is
responsible for each task at a glance.
```

---

**Version**: 2.0
**Created**: 2026-01-19
**Updated**: 2026-02-27 (Progressive Refinement Pattern for agent routing visibility)
**Part of**: cAgents V9.18.0
**Saves**: ~2,000 lines of duplication
