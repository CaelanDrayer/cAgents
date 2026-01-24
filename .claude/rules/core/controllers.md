# Controller Coordination Guidelines

Question-based delegation patterns for V7.0 controllers.

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
  subagent_type: "{domain}:{execution_agent}",
  description: "Answer: {question}",
  prompt: "Question from controller: {question}\nProvide expert answer."
})
```

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
3. Controller delegates questions to execution agents
4. Execution agents provide expert answers
5. Controller synthesizes answers into solution
6. Controller creates implementation tasks
7. Controller coordinates execution
8. Controller writes coordination_log.yaml
```

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

## CRITICAL: Do Not Ask Permission

**After completing coordination:**
- ✅ Write coordination_log.yaml with all Q&A, synthesis, and tasks
- ✅ Signal completion (coordination_log.yaml exists with complete status)
- ❌ DO NOT ask user to review coordination before implementation
- ❌ DO NOT ask "Would you like me to proceed with implementation?"
- ❌ DO NOT wait for user approval

The executor monitors you and will automatically proceed when coordination_log.yaml is complete. Your job is to coordinate work, not to ask permission to implement it.
