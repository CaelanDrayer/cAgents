# Documentation Standards - Conciseness First

**Goal**: Minimize context window usage while maintaining clarity.

## Core Principles

1. **Essential only** - Remove all nice-to-have content
2. **Bullets over paragraphs** - Dense information format
3. **1-2 examples max** - More examples → archive
4. **No redundancy** - Say it once, reference elsewhere
5. **Tables for comparisons** - More efficient than prose

## File Size Targets

| File Type | Max Lines | Current Avg | Target Reduction |
|-----------|-----------|-------------|------------------|
| CLAUDE.md | 300 | 1,733 | 85% ✓ (now 214) |
| Core agents | 300 | 550 | 45% |
| Team agents | 400 | 700 | 43% |
| Command files | 200 | 250 | 20% |

## Agent File Template

```markdown
---
name: agent-name
description: One-line description. Use when X.
tools: Read, Grep, Glob, Write, Edit, Bash, TodoWrite
model: sonnet
---

# {Agent Name}

**Role**: One sentence describing core responsibility

**Use When**: Bulleted list of 3-5 scenarios

## Responsibilities

- Bullet 1
- Bullet 2
- Bullet 3

## Workflow

1. Step 1
2. Step 2
3. Step 3

## Key Capabilities

- Capability 1: Brief description
- Capability 2: Brief description

## Example

Single concise example (3-5 lines max)

## Collaboration

**Consults**: agent1, agent2
**Delegates to**: agent3, agent4
**Reports to**: agent5

## Output Format

Expected output structure (if applicable)

---

**Lines**: <200 for team agents, <250 for leads, <300 for core
```

## Writing Style

### ❌ Avoid

```markdown
In this comprehensive section, we will explore the various capabilities
that this agent possesses, examining in detail how each capability
contributes to the overall effectiveness of the system.
```

### ✅ Prefer

```markdown
## Capabilities

- Code review: Security, performance, standards
- Auto-fix: Generate fixes with diffs
- Learning: Track patterns across reviews
```

### ❌ Avoid

```markdown
When you encounter a situation where you need to perform a code review,
you should first consider whether the code in question relates to
security concerns, and if so, you should prioritize security analysis...
```

### ✅ Prefer

```markdown
**Priority Order**:
1. Security (auth, crypto, tokens)
2. Public APIs
3. High complexity files
4. Frequently changed files
```

## Example Limits

- **Commands**: 1-2 examples per use case
- **Agents**: 1 example workflow max
- **Architecture docs**: Reference diagrams, don't duplicate

## Code Snippets

Keep under 10 lines. If longer → archive with reference.

## Cross-References

Link to archive instead of duplicating:
```markdown
See `archive/docs/DETAILED_GUIDE.md` for comprehensive examples.
```

## What Goes to Archive

- Detailed how-to guides
- Extensive examples (3+ examples)
- Migration guides
- Implementation deep-dives
- Performance analysis details
- Complete feature comparisons

## What Stays in Core Docs

- Essential architecture
- Command syntax
- Agent listings
- Quick reference
- Common workflows (1-2 examples)
- Key concepts

## Review Checklist

Before committing documentation:

- [ ] Under target line count?
- [ ] No redundant information?
- [ ] Examples limited to 1-2?
- [ ] Bullets instead of paragraphs?
- [ ] Tables for comparisons?
- [ ] Detailed content moved to archive?
- [ ] Cross-references to archive added?

## Agent Optimization Checklist

- [ ] Frontmatter concise (1-line description)?
- [ ] Role in 1 sentence?
- [ ] Responsibilities in bullets?
- [ ] Workflow in numbered steps?
- [ ] Single example (if needed)?
- [ ] Collaboration section present?
- [ ] Under line target?

---

**Result**: 60-70% reduction in context usage while maintaining clarity.
