# TodoWrite Helper Patterns

Shared TodoWrite patterns for cAgents V9.21 to eliminate duplication.

**IMPORTANT: Agent Name Prefix Convention** - All tasks displayed to users MUST be prefixed with the executing agent's name in brackets: `[agent-name] task description`. This applies to both `content` and `activeForm` fields. This lets the user see which agent is responsible for each task at a glance.

## BLOCKING REQUIREMENT: TodoWrite Calls

**TodoWrite is a BLOCKING PREREQUISITE.** You CANNOT proceed to the next action until you have called TodoWrite. This is not optional. This is the primary mechanism for user-visible progress tracking. Without TodoWrite, the user has zero visibility into what is happening.

**If you skip a TodoWrite call, the workflow is broken.**

## TodoWrite Call Checklist

Every workflow agent MUST follow this checklist:

- [ ] **Before starting work**: Call TodoWrite with initial task list
- [ ] **After each routing/planning decision**: Call TodoWrite to update agent names
- [ ] **Before delegating to execution agents**: Call TodoWrite to show which agents will work
- [ ] **After each phase completes**: Call TodoWrite to mark completed and advance next to in_progress
- [ ] **At completion**: Call TodoWrite with all tasks marked completed

## Standard Workflow TodoWrite Pattern

Use this pattern for standard tier 2+ workflows (routing -> planning -> coordinating -> validating):

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "in_progress", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "pending", "id": "plan"},
  {"content": "[controller] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

**Note**: Replace `[controller]` with the actual controller name once known (e.g., `[engineering-manager]`, `[creative-director]`). Before the controller is selected, use `[controller]` as a placeholder.

## Progressive Refinement Pattern (Agent Routing Updates)

**CRITICAL**: When any workflow agent determines which specific agent(s) will handle the next phase, it MUST immediately issue a TodoWrite update to replace generic placeholders with the specific agent name(s). This gives the user real-time visibility into agent routing decisions.

### How It Works

The TodoWrite list evolves as the workflow progresses and agents are identified:

**Step 1 -- Initial (before routing)**:
```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "in_progress", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "pending", "id": "plan"},
  {"content": "[controller] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

**Step 2 -- After routing selects controller** (e.g., `engineering-manager`):
```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "in_progress", "id": "plan"},
  {"content": "[engineering-manager] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

**Step 3 -- After controller identifies execution agents** (e.g., `backend-developer`, `qa-tester`, `security-specialist`):
```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[engineering-manager] Coordinate: ask questions and synthesize", "status": "in_progress", "id": "coordinate"},
  {"content": "[backend-developer] Implement authentication fix", "status": "pending", "id": "exec1"},
  {"content": "[qa-tester] Create regression tests", "status": "pending", "id": "exec2"},
  {"content": "[security-specialist] Review security implications", "status": "pending", "id": "exec3"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
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
| `/run` (Step 2) | Session initialized | Initial 4-item task list |
| `/run` (Step 3) | Controller identified | `[controller]` -> `[engineering-manager]` |
| `/run` (Step 5) | Before delegation | Mark coordination as in_progress |
| Controller | Execution agents identified | Add individual `[backend-developer]`, `[qa-tester]`, etc. entries |
| `/run` (Step 6) | After controller returns | Mark all tasks completed |

## Phase Transition TodoWrite Pattern

Use when marking a phase complete and transitioning to next phase:

**CRITICAL**: NEVER have zero tasks in_progress. Always mark one task complete and immediately mark the next as in_progress in the same TodoWrite call.

## Error Handling TodoWrite Pattern

Use when encountering validation failures or blockers:

```
TodoWrite([
  ...previous completed entries...,
  {"content": "[{agent}] Resolve {error_type}: {error_message}", "status": "in_progress", "id": "error"}
])
```

## Controller Coordination TodoWrite Pattern

Use for controllers during coordinating phase. Prefix with the controller's own name.

After identifying execution agents, update the TodoWrite to add specific executor entries:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[engineering-manager] Coordinate: ask questions and synthesize", "status": "in_progress", "id": "coordinate"},
  {"content": "[backend-developer] Answer: What is current auth implementation?", "status": "pending", "id": "exec1"},
  {"content": "[qa-tester] Answer: What test coverage exists?", "status": "pending", "id": "exec2"},
  {"content": "[engineering-manager] Synthesize answers into solution", "status": "pending", "id": "synthesize"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

**Note**: Replace agent names and task descriptions with actuals. The `[/run]` prefix items are preserved from the initial task list.

## Usage

Agents import this helper via:

```markdown
@shared/patterns/todo_write_helper.md
```

Then reference specific patterns:
- **Standard workflow pattern**: For tier 2+ workflows
- **Progressive refinement pattern**: When agents are identified
- **Phase transition pattern**: When completing phases
- **Error handling pattern**: When encountering failures
- **Controller coordination pattern**: For coordinating phase

## Anti-Patterns (DO NOT DO)

- DO NOT create TodoWrite only at start and never update
- DO NOT batch update multiple tasks at once (except dry-run stop)
- DO NOT forget to mark tasks complete when phases finish
- DO NOT have ambiguous task descriptions
- DO NOT skip TodoWrite updates between phases
- DO NOT leave generic `[controller]` or `[executor]` placeholders after the specific agent is known
- DO NOT show a single `[executor] Execute tasks` entry when multiple executors are involved -- list each one separately
- DO NOT proceed to the next step without calling TodoWrite first

---

**Version**: 3.0
**Created**: 2026-01-19
**Updated**: 2026-02-27 (Blocking prerequisite enforcement, call checklist, stronger anti-patterns)
**Part of**: cAgents V9.22.0
**Saves**: ~2,000 lines of duplication
