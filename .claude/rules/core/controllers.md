# Controller Coordination Guidelines

Question-based delegation patterns for controllers with v10 agent chaining support.

## v10 Agent Chaining: Topological Execution

Controllers execute work items in dependency order, passing context between agents via files:

```
Controller receives work_items.yaml with agent assignments + dependency graph
  1. Topological sort by dependencies -> execution order
  2. For each work item in order:
     a. Gather output files from completed dependencies
     b. Read dependency outputs and extract relevant context
     c. Spawn assigned agent via Task tool with:
        - Work item description + acceptance criteria
        - Context summary from dependency outputs
        - Path to write output file (outputs/WI-{N}_{name}.md)
     d. Agent executes and writes output to session dir
     e. Spawn reviewer to check against acceptance criteria
     f. If REVISE: re-spawn agent with feedback (max 3 rounds)
  3. Independent work items (no dependency between them) execute in parallel
  4. After all work items complete: write coordination_log.yaml
```

### File-Based Context Passing

Agents write outputs to the session directory:
```
outputs/
  WI-001_architecture.md    # architect's output
  WI-002_schema.md          # dba's output
  WI-003_implementation.md  # backend-developer's output
```

Controller reads dependency outputs and summarizes context for the next agent's prompt.

## CRITICAL: Controllers NEVER Do Direct Work

**Controllers are COORDINATORS, not IMPLEMENTERS.**

### Enforcement Rules

```yaml
controller_enforcement:
  # Controllers MUST use Task tool to spawn execution agents
  required_delegation: true
  minimum_subagents_per_objective: 2
  self_answered_questions: 0  # NEVER answer own questions

  # What controllers CAN do
  allowed_actions:
    - Ask questions (spawn execution agents via Task tool)
    - Synthesize answers from specialists
    - Create implementation task list
    - Write coordination_log.yaml
    - Report progress summaries

  # What controllers CANNOT do
  prohibited_actions:
    - Write code directly
    - Create content directly
    - Answer their own questions
    - Use Edit tool on implementation files
    - Skip delegation for "simple" tasks
```

### Anti-Patterns (NEVER DO THIS)

```
# WRONG - Controller doing direct work
Controller: "Let me fix that typo for you"
Controller: "Here's the improved wording: ..."
Controller: "I'll implement this change directly"

# RIGHT - Controller delegating to specialists
Controller: "Delegating to backend-developer for implementation"
Controller: "Spawning copywriter to improve wording"
Controller: "Asking qa-tester to verify the fix"
```

### Mandatory Delegation Flow

For EVERY question, controller MUST:
1. Formulate the question
2. Use Task tool to spawn execution agent
3. Wait for agent response
4. Record answer in coordination_log.yaml
5. Synthesize after all questions answered

```javascript
// Controller MUST do this for each question:
Task({
  subagent_type: "cagents:{execution_agent}",
  description: "Answer: {question}",
  prompt: "Question from controller: {question}\nProvide expert answer."
})
```

### Context-Efficient Question Delegation

When delegating questions to execution agents, keep prompts minimal:

**Good** (~200 tokens):
```javascript
Task({
  subagent_type: "cagents:backend-developer",
  description: "Answer: What is current auth implementation?",
  prompt: "What is the current authentication implementation? Check src/ for auth-related code. Report: method used, libraries, known issues."
})
```

**Bad** (~2000 tokens):
```javascript
Task({
  subagent_type: "cagents:backend-developer",
  description: "Answer: What is current auth implementation?",
  prompt: "[Full plan.yaml...] [Full decomposition.yaml...] [Full instruction.yaml...] Question: What is the current authentication implementation?"
})
```

**Rules**:
- Question prompts should be **under 300 tokens**
- Include only: the question, where to look, what to report
- Do NOT include plan/decomposition/instruction contents
- Execution agents can read session files themselves if needed

## Controller Role

Controllers are tier 2 agents that:
- Coordinate work between planning and execution
- Use domain expertise to break down objectives
- Delegate via questions (NOT task assignment)
- Synthesize specialist answers
- Create implementation tasks

## Question-Based Delegation Pattern

```
1. Controller receives objectives from plan.yaml
2. Controller breaks into specific questions
3. Controller identifies which execution agents to delegate to
4. Controller calls TodoWrite to show execution agents to user (MANDATORY)
5. Controller delegates questions to execution agents
6. Execution agents provide expert answers
7. Controller synthesizes answers into solution
8. Controller creates implementation tasks
9. Controller coordinates execution
10. Controller writes coordination_log.yaml
```

## MANDATORY: TodoWrite for Execution Agent Visibility

**Every controller MUST call TodoWrite after identifying which execution agents it will delegate to.** This gives the user real-time visibility into which agents are active.

Call TodoWrite BEFORE starting to delegate questions:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[{your_controller_name}] Coordinate: ask questions and synthesize", "status": "in_progress", "id": "coordinate"},
  {"content": "[{exec_agent_1}] {specific_task_1}", "status": "pending", "id": "exec1"},
  {"content": "[{exec_agent_2}] {specific_task_2}", "status": "pending", "id": "exec2"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

Replace placeholders with actual agent names and task descriptions. As each execution agent completes, update their entry to `completed`.

## Controller Selection by Tier

**Tier 2** (Moderate): 1 primary controller
- Example: engineering-manager for bug fixes

**Tier 3** (Complex): 1 primary + 1-2 supporting
- Example: engineering-manager + architect + security-specialist

**Tier 4** (Expert): 1 executive + 1 primary + 2-4 supporting + HITL
- Example: cto + engineering-manager + architect + devops-lead

## Key Guidelines

- **Ask, don't assign**: "What is current auth?" not "Analyze auth"
- **Synthesis drives implementation**: Combine answers coherently
- **Adaptive coordination**: Follow-up questions based on answers
- **Expert-driven**: Use domain knowledge to determine HOW

## Reviewer Loop (V9.23.0 Event-Driven Pipeline)

Controllers now include an internal reviewer loop. After each executor completes implementation, the controller spawns a reviewer to evaluate against acceptance criteria. If the reviewer identifies issues, the controller sends feedback back to the executor for revision. This loops up to 3 times before escalating to /run's validator.

### Reviewer Loop Flow

```
Controller receives work item with acceptance criteria
  |
  +-> Spawn executor (level 2) -> implementation
  |
  +-> Spawn reviewer (level 2) -> review_report.yaml
  |     |
  |     +-> PASS: Accept implementation, move to next work item
  |     +-> REVISE: Send feedback to executor
  |           |
  |           +-> Re-spawn executor with feedback (round 2)
  |           +-> Re-spawn reviewer (round 2)
  |           +-> ... (max 3 internal rounds)
  |           +-> After round 3: Accept best result, escalate issues to validator
  |
  +-> Write coordination_log.yaml with review_rounds tracking
```

### Reviewer Spawning Pattern

After each executor completes, spawn a reviewer:

```javascript
// Step 1: Executor implements
Task({
  subagent_type: "cagents:{execution_agent}",
  description: "Implement: {work_item}",
  prompt: "Implement {work_item_description}.\nAcceptance criteria: {criteria}\n{feedback_from_previous_round if any}"
})

// Step 2: Reviewer evaluates
Task({
  subagent_type: "cagents:reviewer",  // or domain-specific reviewer (qa-tester, etc.)
  description: "Review: {work_item}",
  prompt: "Review implementation of {work_item_description}.\nAcceptance criteria: {criteria}\nCheck: Does implementation meet all criteria?\nOutput: PASS or REVISE with specific feedback."
})
```

### Reviewer Output Format

The reviewer should output:

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

### Revision Round Handling

```
if review_result == PASS:
  Accept implementation, proceed to next work item
elif review_result == REVISE and round < 3:
  Re-spawn executor with: original prompt + reviewer feedback
  Increment round counter
elif review_result == REVISE and round >= 3:
  Accept best available result
  Log unresolved issues for validator escalation
  Continue to next work item
```

### coordination_log.yaml Review Tracking

Add `review_rounds` to coordination_log.yaml for each work item:

```yaml
implementation_tasks:
  - task_id: WI-001
    name: "{task_name}"
    assigned_to: cagents:{executor}
    acceptance_criteria: [...]
    status: completed
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

### Write Completion Event

After all work items are coordinated (with reviewer loops), write a completion event:

```yaml
event_id: EVT-{N}
state: COORDINATED
agent: cagents:{controller_name}
timestamp: "{ISO_TIMESTAMP}"
duration_seconds: {elapsed}
inputs_consumed:
  - workflow/delegation_prompts.yaml
  - workflow/work_items.yaml
outputs_produced:
  - workflow/coordination_log.yaml
next_state: COORDINATED
metadata:
  work_items_completed: {count}
  total_review_rounds: {sum_across_all_items}
  items_with_revisions: {count_of_items_that_needed_revision}
```

## CRITICAL: Do Not Ask Permission

**After completing coordination:**
- ✅ Write coordination_log.yaml with all Q&A, synthesis, review rounds, and tasks
- ✅ Write completion event to workflow/events/
- ✅ Signal completion (coordination_log.yaml exists with complete status)
- ❌ DO NOT ask user to review coordination before implementation
- ❌ DO NOT ask "Would you like me to proceed with implementation?"
- ❌ DO NOT wait for user approval

The /run state machine monitors completion events and will automatically proceed to validation when coordination_log.yaml is complete. Your job is to coordinate work (including reviewer loops), not to ask permission.

---

## See Also

- **orchestration.md** - Workflow phases and automatic transitions
- **execution.md** - Execution agent patterns (tier 3)
- **shared-questions.md** - Universal controller question patterns
- **completion.md** - Task completion protocol and evidence requirements
