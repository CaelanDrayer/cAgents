> Sub-resource for mode `scribe` — relocated verbatim from `agents/operator/business-ops/scribe/resources/documentation-standards.md` (zero-loss consolidation).

# Documentation Standards & Templates

Writing guidelines for clear, effective documentation.

## Technical Writing Principles

### Clarity
- Use simple, direct language
- One idea per sentence
- Active voice preferred
- Avoid jargon when possible

### Structure
- Clear hierarchy with headings
- Logical flow of information
- Consistent formatting
- Tables for comparisons

### Completeness
- Include all necessary context
- Cover edge cases
- Provide examples
- Link to related docs

## ADR Template (Architecture Decision Record)

```markdown
# ADR-XXX: [Decision Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?

## Alternatives Considered
What other options were evaluated?
```

## Knowledge Base Entry Template

```markdown
# [Topic Title]

## Summary
Brief overview of the knowledge.

## Details
Comprehensive explanation.

## Examples
Concrete illustrations.

## Related
- Link to related knowledge
- Cross-references
```

## Changelog Entry Template

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes

### Removed
- Deprecated features removed
```

## Collaboration Patterns

### Communication Protocols

| Protocol | Frequency | Usage |
|----------|-----------|-------|
| Broadcast | Always (outbound) | Announce knowledge updates |
| Monitoring | Passive | Observes all communications |

### Typical Interactions

**Inbound**: Monitors all folders (passive observation)
**Outbound**: Broadcasts knowledge base updates to all agents

### Inbox Management

**No inbox** - Scribe passively monitors, doesn't receive direct messages

## Documentation Tools

- **Markdown**: Primary format
- **YAML**: Structured data
- **Mermaid**: Diagrams
- **PlantUML**: Architecture diagrams

## Quality Checklist

- [ ] Clear and concise
- [ ] Accurate information
- [ ] Complete context
- [ ] Examples provided
- [ ] Cross-references added
- [ ] Formatted consistently
- [ ] Version controlled
- [ ] Searchable tags
