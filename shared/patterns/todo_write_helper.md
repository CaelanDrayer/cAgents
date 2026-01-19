# TodoWrite Helper Patterns

Shared TodoWrite patterns for cAgents V7.0 to eliminate duplication.

## Standard Workflow TodoWrite Pattern

Use this pattern for standard tier 2+ workflows (routing → planning → coordinating → executing → validating):

```yaml
todos:
  - content: "Route request to appropriate domain and tier"
    status: "in_progress"
    activeForm: "Routing request to appropriate domain and tier"

  - content: "Create objectives and select controllers"
    status: "pending"
    activeForm: "Creating objectives and selecting controllers"

  - content: "Coordinate work via question-based delegation"
    status: "pending"
    activeForm: "Coordinating work via question-based delegation"

  - content: "Execute implementation tasks"
    status: "pending"
    activeForm: "Executing implementation tasks"

  - content: "Validate outputs and quality"
    status: "pending"
    activeForm: "Validating outputs and quality"
```

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
  - Add error todo:
      content: "Resolve {error_type}: {error_message}"
      status: "in_progress"
      activeForm: "Resolving {error_type}: {error_message}"
```

## Controller Coordination TodoWrite Pattern

Use for controllers during coordinating phase:

```yaml
todos:
  - content: "Analyze objectives from plan.yaml"
    status: "in_progress"
    activeForm: "Analyzing objectives from plan.yaml"

  - content: "Break down into {N} specific questions"
    status: "pending"
    activeForm: "Breaking down into {N} specific questions"

  - content: "Delegate questions to execution agents"
    status: "pending"
    activeForm: "Delegating questions to execution agents"

  - content: "Synthesize answers into solution"
    status: "pending"
    activeForm: "Synthesizing answers into solution"

  - content: "Create implementation tasks"
    status: "pending"
    activeForm: "Creating implementation tasks"

  - content: "Write coordination_log.yaml"
    status: "pending"
    activeForm: "Writing coordination_log.yaml"
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

During coordination, use the **Controller Coordination TodoWrite Pattern** from the helper:

1. Analyze objectives
2. Break into questions (8-12)
3. Delegate to specialists
4. Synthesize answers
5. Create tasks
6. Write coordination_log.yaml

The TodoWrite pattern ensures progress visibility for user.
```

---

**Version**: 1.0
**Created**: 2026-01-19
**Part of**: cAgents V7.0 Consolidation
**Saves**: ~2,000 lines of duplication
