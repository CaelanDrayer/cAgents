# Self-Correct Patterns

## Coordination Corrections

### Missing coordination_log
```yaml
Issue: coordination_log.yaml doesn't exist
Strategy: Re-spawn controller from plan.yaml

Task:
  subagent_type: {plan.controller_assignment.primary}
  description: "Complete coordination phase"
  prompt: |
    You are the controller for this workflow.
    Complete the coordination phase.

    Objectives: {from plan.yaml}
    Success Criteria: {from plan.yaml}

    Write: workflow/coordination_log.yaml

Estimated time: 30-60 min
Max retries: 2
```

### Incomplete synthesis
```yaml
Issue: coordination_log exists but synthesis incomplete
Strategy: Prompt controller to complete synthesis

Task:
  subagent_type: {plan.controller_assignment.primary}
  description: "Complete synthesis in coordination_log"
  prompt: |
    Your coordination_log.yaml has incomplete synthesis.

    Existing Q&A: {questions_asked section}

    Complete the synthesis section with:
    - Root cause (if applicable)
    - Approach (high-level strategy)
    - Rationale (why this approach)
    - Implementation steps
    - Risks and mitigations
    - Estimated effort

Estimated time: 15-30 min
Max retries: 2
```

### Vague answers
```yaml
Issue: Answers not detailed enough for synthesis
Strategy: Request clarification from execution agents

Task:
  subagent_type: {original_execution_agent}
  description: "Clarify vague answer"
  prompt: |
    Your previous answer was too vague.

    Original question: {question}
    Your answer: {vague_answer}

    Provide more specific details:
    - Concrete examples or code snippets
    - File paths and line numbers
    - Specific recommendations
    - Estimated effort

Estimated time: 10-20 min per question
Max retries: 2
```

### Unanswered questions
```yaml
Issue: Questions delegated but not answered
Strategy: Re-delegate to original agent

Task:
  subagent_type: {delegated_to agent}
  description: "Answer delegated question"
  prompt: |
    You were delegated a question but didn't provide an answer.

    Question: {question}
    Context: {objectives and success criteria}

    Please answer with specific details and recommendations.

Estimated time: 10-20 min per question
Max retries: 2
```

### Weak synthesis
```yaml
Issue: Synthesis lacks detail and coherence
Strategy: Prompt controller to strengthen

Task:
  subagent_type: {plan.controller_assignment.primary}
  description: "Strengthen synthesis"
  prompt: |
    Your synthesis needs more detail.

    Current synthesis: {existing_synthesis}
    Q&A exchanges: {questions_asked section}

    Strengthen by:
    1. Connecting answers to approach
    2. Providing concrete implementation steps
    3. Identifying risks from answers
    4. Explaining rationale based on expert input

Estimated time: 20-30 min
Max retries: 2
```

## Output Quality Corrections

### test_coverage_low (< 80%)
```yaml
Strategy: Add test cases for uncovered paths
Agent: backend-developer or frontend-developer
Estimated time: 15-30 min
Max retries: 2
```

### linting_errors
```yaml
Strategy: Auto-fix (no agent needed)
Command: eslint --fix . && prettier --write .
Estimated time: 5 min
Max retries: 1
```

### missing_documentation
```yaml
Strategy: Generate docs from code
Agent: scribe
Estimated time: 20-30 min
Max retries: 2
```

### format_violations
```yaml
Strategy: Restructure to match template
Agent: None (auto-fix) or domain-specific
Estimated time: 10-15 min
Max retries: 1
```

## Re-Validation Process

```yaml
Task:
  subagent_type: "cagents:universal-validator"
  description: "Re-validate after corrections"
  prompt: |
    Re-validate after correction attempts.

    Original issues: {list}
    Fixes applied: {list}

    Run full validation and classify as PASS/FIXABLE/BLOCKED.
    Include coordination validation if tier 2+.
```

### Result Handling
- **PASS**: Update status.yaml to completed
- **FIXABLE** (issues remain): Check retry count, retry or escalate
- **BLOCKED**: Stop, document, escalate to HITL

## Escalation Triggers

Immediately escalate when:
- Circular delegation detected
- Question limit exceeded with no path forward
- Fixes made things worse
- Max retries exceeded
- Estimated fix time > 2 hours
- Required agent not available
- Issue requires architectural change

## Learning from Corrections

Track per correction:
- Issue type
- Fix strategy used
- Agent invoked
- Time taken
- Success/failure
- Retry count

Update calibration every 10 corrections:
- Success rate per issue type
- Most effective agents
- Common escalation patterns

Example metrics:
```yaml
test_coverage_low: 85% success, avg 20min
linting_errors: 98% success, avg 3min
missing_coordination_log: 75% success, avg 45min
vague_answers: 90% success, avg 15min per question
```

## Rollback Capability

If corrections make things worse:
1. Detect regression (compare new vs original report)
2. Document the regression
3. Revert changes (git reset, restore backup)
4. Mark issues as non-fixable
5. Escalate to HITL with what was attempted
