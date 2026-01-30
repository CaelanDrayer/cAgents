# TodoWrite Patterns for Trigger

Progress tracking throughout all phases.

## Initial Task List

Create at start of workflow:

```javascript
TodoWrite({
  todos: [
    {content: "Initialize and parse user request", status: "in_progress", activeForm: "Initializing and parsing user request"},
    {content: "Gather context (git, project structure, frameworks)", status: "pending", activeForm: "Gathering context"},
    {content: "Detect domain with confidence scoring", status: "pending", activeForm: "Detecting domain with confidence scoring"},
    {content: "Classify intent (bug fix, feature, etc.)", status: "pending", activeForm: "Classifying intent"},
    {content: "Match workflow template", status: "pending", activeForm: "Matching workflow template"},
    {content: "Run pre-flight validation (4 levels)", status: "pending", activeForm: "Running pre-flight validation"},
    {content: "Create instruction folder with metadata", status: "pending", activeForm: "Creating instruction folder with metadata"},
    {content: "Track analytics and predictions", status: "pending", activeForm: "Tracking analytics and predictions"},
    {content: "Delegate to orchestrator for execution", status: "pending", activeForm: "Delegating to orchestrator for execution"}
  ]
})
```

## Update Timing Requirements

1. **At Start** (Phase 1):
   - Create comprehensive task list with ALL phases
   - Mark first task as in_progress
   - All other tasks as pending

2. **Between Phases**:
   - Mark current task as completed IMMEDIATELY when phase completes
   - Mark next task as in_progress IMMEDIATELY before starting next phase
   - NEVER have zero tasks in_progress during execution
   - NEVER have multiple tasks in_progress (only ONE at a time)

3. **At Completion**:
   - Mark final task as completed
   - Show completion summary to user

## Example Flow

```javascript
// Phase 1 Complete -> Phase 2 Start
TodoWrite({
  todos: [
    {content: "Initialize and parse user request", status: "completed", ...},
    {content: "Gather context (git, project structure, frameworks)", status: "in_progress", ...},
    {content: "Detect domain with confidence scoring", status: "pending", ...},
    // ... rest remain pending
  ]
})

// Phase 2 Complete -> Phase 3 Start
TodoWrite({
  todos: [
    {content: "Initialize and parse user request", status: "completed", ...},
    {content: "Gather context (git, project structure, frameworks)", status: "completed", ...},
    {content: "Detect domain with confidence scoring", status: "in_progress", ...},
    // ... rest remain pending
  ]
})
```

## User Communication Pattern

Combine TodoWrite with user-facing messages:

```markdown
[TodoWrite marks "Gather context" as in_progress]

Gathering project context...
  - Git context: 20 recent commits analyzed
  - Project structure: package.json, next.config.js found
  - Framework detected: Next.js 14.0.0
  - File types: 45% TypeScript, 30% JavaScript, 15% CSS, 10% other

[TodoWrite marks "Gather context" as completed, marks "Detect domain" as in_progress]

Detecting domain using 3-method analysis...
```

## Anti-Patterns (DO NOT DO)

- DON'T: Create TodoWrite only at start and never update
- DON'T: Batch update multiple tasks at once (except dry-run stop)
- DON'T: Forget to mark tasks complete when phases finish
- DON'T: Have ambiguous task descriptions
- DON'T: Skip TodoWrite updates between phases
