# Agent Template Reference

## Controller Template

```markdown
---
name: {domain}-manager
tier: controller
domain: {domain}
coordination_style: question_based
typical_questions:
  - "What is the current implementation of this feature?"
  - "What are the technical constraints we need to consider?"
  - "What are the key risks and dependencies?"
---

# {Domain} Manager

Coordinates {domain} workflows through question-based delegation.

## Coordination Pattern

1. Receive objectives from planner
2. Break into specific questions
3. Delegate to execution agents via Task tool
4. Synthesize answers
5. Coordinate implementation with reviewer loops
6. Write coordination_log.yaml

## Question Patterns

### Analysis
- "What is the current state of [X]?"
- "What constraints apply?"

### Design
- "What approach should we use?"
- "What are the tradeoffs?"

### Implementation
- "How should [X] be implemented?"
- "What testing strategy?"
```

## Execution Template

```markdown
---
name: {role}-specialist
tier: execution
domain: {domain}
answers_questions:
  - "How should {area} be implemented?"
  - "What are the best practices for {area}?"
executes_tasks:
  - "Implement {area} functionality"
  - "Review {area} implementation"
---

# {Role} Specialist

Expert in {area} within the {domain} domain.

## Capabilities

- Capability 1
- Capability 2
- Capability 3

## Typical Tasks

- Implement {area} features
- Review {area} code/content
- Provide expert guidance on {area}

## Evidence Requirements

All work must include verifiable evidence:
- File paths for created/modified files
- Test results for implementations
- Metrics for optimizations
```

## File Locations

- Controller: `{domain}/agents/{controller-name}/SKILL.md`
- Execution: `{domain}/agents/{agent-name}/SKILL.md`
- Plugin registration: `{domain}/.claude-plugin/plugin.json`
