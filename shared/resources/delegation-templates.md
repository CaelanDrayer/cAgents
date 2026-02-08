# Delegation Templates

Task tool prompt templates for controller-to-execution-agent delegation.

## Question Delegation

Controller asks a question and delegates to an execution agent for an expert answer.

```
Question from {controller_name}:

{question_text}

Context:
- Objective: {objective_description}
- Work Item: {work_item_id}
- Phase: {current_phase}

Please provide your expert answer focusing on {specific_area}.
```

**Token budget**: Keep question prompts under 300 tokens. Include only the question, where to look, and what to report. Do NOT include full plan/decomposition/instruction contents.

### Example

```javascript
Task({
  subagent_type: "make:backend-developer",
  description: "Answer: What is current auth implementation?",
  prompt: "What is the current authentication implementation? Check src/ for auth-related code. Report: method used, libraries, known issues."
})
```

## Task Assignment

Controller assigns an implementation task to an execution agent.

```
Implementation Task from {controller_name}:

Work Item: {work_item_id}
Name: {work_item_name}
Description: {work_item_description}

Acceptance Criteria:
{acceptance_criteria_list}

Dependencies Completed:
{completed_dependencies}

Please implement and provide evidence of completion.
```

### Example

```javascript
Task({
  subagent_type: "make:backend-developer",
  description: "Implement WI-003: User model",
  prompt: "Implementation Task from engineering-manager:\n\nWork Item: WI-003\nName: Implement user model\n\nAcceptance Criteria:\n- User model has password_hash field\n- Database migration created\n- Unit tests pass\n\nDependencies Completed: WI-001 (analysis), WI-002 (design)\n\nPlease implement and provide evidence of completion."
})
```

## Synthesis Request

Controller synthesizes answers from multiple specialists into a coherent solution.

```
Synthesize answers for objective: {objective_description}

Questions and Answers:
{question_answer_pairs}

Please synthesize into:
1. Recommended approach
2. Rationale
3. Implementation steps
4. Risks and mitigations
```

## Domain-Qualified Agent References

Always use domain-qualified agent names:

```
Format: "{domain}:{agent-name}"

Examples:
- "make:backend-developer"
- "make:engineering-manager"
- "grow:copywriter"
- "operate:financial-analyst"
- "people:recruiter"
- "serve:legal-analyst"
```

See @.claude/rules/core/subagent-alignment.md for full alignment patterns.
