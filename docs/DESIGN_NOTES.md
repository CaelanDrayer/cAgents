# cAgents Design Notes (aspirational patterns)

> **These are design aspirations, NOT runtime-enforced behavior.** The patterns
> on this page were designed as best practices but are not enforced by any hook,
> not consistently produced by the runtime, and not required of agents. They are
> kept here as a record of intent and as optional guidance. This file lives under
> `docs/` and is **not auto-loaded** into agent rule context — it does not consume
> the always-loaded `.claude/rules/` budget. The corresponding `.claude/rules/`
> sections carry only a one-line pointer back to this page.
>
> If a pattern below ever graduates to enforced behavior (a hook that produces or
> verifies it, or a contract a test asserts), move its definition back into the
> relevant `.claude/rules/` file and delete it here.

## Three-File Session-Tracking Pattern (V8.0)

> Aspirational/historical. Not enforced or consistently used in practice.
> Sessions typically rely on `workflow/` artifacts (plan.yaml,
> coordination_log.yaml) and waypoints instead. Agents MAY use this pattern but
> are not required to.

Source pointer: `.claude/rules/memory/agent-memory.md`.

Compact session tracking that survives context compaction (60-80% savings vs
full logs):

1. **task_plan.md** (500-2000 tokens): Work item breakdown with completion status
2. **findings.md** (1000-5000 tokens): Discoveries, decisions, Q&A
3. **progress.md** (200-500 tokens): Current status and resume instructions

See `.claude/rules/memory/agent-memory-reference.md` for worked examples of each
file's shape.

## 2-Action Findings Capture Rule

> Aspirational best practice, not a mandatory requirement. Not enforced or
> consistently followed in practice. Agents SHOULD capture findings when
> practical but are not required to follow the strict 2-action cadence.

Source pointer: `.claude/rules/core/execution.md`.

Inspired by the attention-injection pattern for context engineering: execution
agents should persist findings to session files periodically to prevent
information loss during context compaction.

### Recommended Practice

> When performing multiple research operations, periodically save key findings to
> session files to guard against context compaction.

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
