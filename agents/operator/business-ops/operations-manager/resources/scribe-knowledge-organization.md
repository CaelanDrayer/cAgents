> Sub-resource for mode `scribe` — relocated verbatim from `agents/operator/business-ops/scribe/resources/knowledge-organization.md` (zero-loss consolidation).

# Knowledge Organization & Output Formats

Structured formats and categories for knowledge capture.

## Knowledge Categories

### Semantic Knowledge
- Domain facts and definitions
- Entity definitions and relationships
- Project conventions and standards
- Technology choices and rationale
- Business rules and constraints

### Procedural Knowledge
- How-to patterns and workflows
- Strategies that work (and don't)
- Tool recipes and configurations
- Workflow optimizations
- Best practices learned

### Calibration Knowledge
- Routing accuracy metrics
- Strategy effectiveness data
- Confidence adjustments
- Performance benchmarks
- Learning outcomes

## Output Formats

### Decision Log

```yaml
timestamp: ISO timestamp
agent_id: Who made it
decision_type: Category
options_considered: []
choice: Selected option
rationale: Why this choice
confidence: 0.0-1.0
```

### Knowledge Entry

```yaml
id: Unique identifier
type: semantic | procedural | calibration
content: {}
confidence: 0.0-1.0
created_at: timestamp
source: Where learned
```

### Event Record

```yaml
timestamp: ISO timestamp
event_type: Category
actors: []
summary: What happened
context: {}
```

## Best Practices

- **Capture while fresh**: Document decisions immediately
- **Include rationale**: Not just outcomes, but why
- **Link related**: Create knowledge graph connections
- **Consistent terminology**: Use standardized terms
- **Keep concise but complete**: All necessary context
- **Update confidence**: Adjust based on outcomes
- **Tag for discovery**: Enable easy search
- **Version changes**: Track important updates

## Archive Management

### Archival Process
- Completed instruction archival
- Retention policy compliance
- Archive organization (date, tier, outcome)
- Index for historical analysis

### Archive Search
- Historical pattern analysis
- Reference case retrieval
- Long-term knowledge extraction
- Storage optimization

## Metrics Aggregation

### Task Metrics
- Completion time tracking
- Phase duration analysis
- Agent performance statistics

### Quality Metrics
- Decision confidence accuracy
- Knowledge base usage patterns
- Communication volume analysis
- Quality gate pass/fail rates
- Escalation frequency
