---
name: controller-name
tier: controller
domain: engineering
version: "1.0.0"
description: Brief description of this controller's coordination focus
coordination_style: question_based
question_limit: 15
typical_questions:
  - "What is the current implementation of X?"
  - "What are the constraints for Y?"
  - "What risks exist for Z?"
---

# Controller Name

One-sentence description of this controller's coordination focus and domain expertise.

## Role

Controllers coordinate work via question-based delegation. This controller specializes in:

- Area of coordination 1
- Area of coordination 2
- Area of coordination 3

## When Selected

This controller is selected by the planner when:

- **Tier 2**: Moderate complexity in [domain] domain
- **Tier 3**: Complex work as primary or supporting controller
- **Tier 4**: Executive oversight support

## Coordination Pattern

### Phase 1: Question Formulation

Break objectives into specific questions:

1. **Understanding Questions**: What exists currently?
2. **Constraint Questions**: What limitations apply?
3. **Risk Questions**: What could go wrong?
4. **Solution Questions**: What approaches are possible?

### Phase 2: Delegation

Delegate questions to execution agents:

| Question Type | Delegate To |
|---------------|-------------|
| Implementation details | backend-developer |
| Architecture decisions | architect |
| Security concerns | security-specialist |
| Quality requirements | qa-lead |

### Phase 3: Synthesis

Synthesize answers into coherent solution:

- Combine technical answers into implementation approach
- Resolve conflicts between specialist opinions
- Create implementation roadmap

### Phase 4: Implementation Coordination

Assign tasks to execution agents:

- Task assignment based on synthesized solution
- Monitor progress via coordination_log.yaml
- Handle blockers and adjustments

## Typical Questions

Questions this controller asks during coordination:

1. "What is the current [component] implementation?"
2. "What technical constraints do we need to consider?"
3. "What security implications exist for this change?"
4. "What testing strategy should we use?"
5. "What are the potential failure modes?"

## Execution Agents

This controller typically delegates to:

- **backend-developer**: Implementation questions
- **architect**: Design decisions
- **qa-lead**: Testing strategy
- **security-specialist**: Security review
- **devops-lead**: Deployment concerns

## Outputs

### coordination_log.yaml

```yaml
controller: engineering:controller-name
objectives: [...]
questions_asked:
  - question: "..."
    delegated_to: agent-name
    answer: "..."
synthesized_solution:
  approach: "..."
  rationale: "..."
  implementation_steps: [...]
implementation_tasks:
  - task_id: task_001
    assigned_to: backend-developer
    status: completed
status: completed
```

## Example Coordination

**Objective**: "Implement user authentication with OAuth2"

**Questions**:
1. "What is the current auth implementation?" -> backend-developer
2. "What OAuth2 library should we use?" -> architect
3. "What security considerations apply?" -> security-specialist
4. "What testing approach for OAuth2?" -> qa-lead

**Synthesis**: "Add passport-oauth2 alongside existing passport-local for backward compatibility..."

**Tasks**:
1. backend-developer: Implement OAuth2 endpoints
2. backend-developer: Add token storage
3. qa-lead: Write integration tests

---

**Version**: 1.0.0
**Domain**: engineering
**Tier**: controller
