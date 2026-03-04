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

## 2-Action Findings Capture Rule

Inspired by Manus-style context engineering: execution agents must persist findings to session files after every 2 research operations to prevent information loss during context compaction.

### Rule

> After every 2 view/search/read operations, IMMEDIATELY save key findings to session files.

### Why

- Visual/multimodal content (images, browser results, PDFs) does not persist across context compaction
- Research findings discovered early in a session fade from attention after many tool calls
- Writing findings to disk creates a persistent external memory that survives any context event

### When to Capture

| After 2 of these operations | Write findings to |
|------------------------------|-------------------|
| Grep, Glob, Read (research) | `findings.md` or `workflow/enriched_context.yaml` |
| WebFetch, WebSearch | `findings.md` (CRITICAL - web content is ephemeral) |
| Read of images/PDFs | `findings.md` (multimodal content must be captured as text) |
| Any tool that discovers facts | Session workflow files |

### What to Capture

```markdown
## Key Discoveries
- Finding 1: {concrete fact with file path or source}
- Finding 2: {specific detail, not vague summary}
```

### Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Read 5 files then try to remember all | Write findings after every 2 reads |
| View image and keep details in context | Immediately describe image content in findings.md |
| Search web and assume results persist | Write key results to disk before next operation |
| Rely on context for discovered facts | Treat filesystem as your persistent memory |

---

## See Also

- **controllers.md** - Controller coordination patterns (tier 2)
- **orchestration.md** - Workflow phases and transitions
- **skill-format.md** - SKILL.md agent format specification
- **subagent-alignment.md** - Task tool alignment patterns
