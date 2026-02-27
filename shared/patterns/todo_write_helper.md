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

**Version**: 1.0
**Created**: 2026-01-19
**Part of**: cAgents V7.0 Consolidation
**Saves**: ~2,000 lines of duplication
