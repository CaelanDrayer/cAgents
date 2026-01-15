# Execution Agent Patterns

Guidelines for tier 3 execution agents.

## Execution Agent Role

Execution agents are specialists that:
- Answer questions from controllers with expertise
- Execute implementation tasks assigned by controllers
- Provide concrete, specific answers
- Focus on their domain of expertise

## Agent Tier Designation

### Tier 2: Controllers
- Coordinate work via question-based delegation
- Synthesize answers from multiple specialists
- Examples: engineering-manager, architect, campaign-manager

### Tier 3: Execution
- Answer questions with domain expertise
- Execute specific implementation tasks
- Examples: backend-developer, copywriter, financial-analyst

### Tier 4: Support
- Foundational services (scribe, data-extractor)
- Utility functions across domains

## Frontmatter Requirements

**Controller Agent**:
```yaml
---
name: engineering-manager
tier: controller
domain: engineering
coordination_style: question_based
typical_questions: [...]
---
```

**Execution Agent**:
```yaml
---
name: backend-developer
tier: execution
domain: engineering
answers_questions: [...]
executes_tasks: [...]
---
```

## Subagent Architecture

Agents delegate to specialists, don't execute directly:

```
Pattern: "Use {subagent} to {task}"
Example: Controller → backend-developer (question) → answer → synthesis
```

Benefits: Modularity, specialization, parallelization (up to 50 concurrent)
