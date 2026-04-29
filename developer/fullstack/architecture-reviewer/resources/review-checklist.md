# Architecture Review Checklist

## Layering
- [ ] Clear separation of concerns
- [ ] No layer violations
- [ ] Dependencies point inward
- [ ] Abstractions at boundaries

## Coupling
- [ ] Low coupling between modules
- [ ] High cohesion within modules
- [ ] Interface segregation
- [ ] No circular dependencies

## Scalability
- [ ] Identified bottlenecks
- [ ] Horizontal scaling possible
- [ ] Caching strategy defined
- [ ] Database design reviewed

## Error Handling
- [ ] Boundary error handling
- [ ] Graceful degradation
- [ ] Logging and monitoring
- [ ] Recovery strategies

## API Design
- [ ] Consistent conventions
- [ ] Versioning strategy
- [ ] Documentation complete
- [ ] Error responses defined

## Output Format
```yaml
review_id: arch_rev_001
severity: high
findings:
  - issue: "Description"
    file: "path:line"
    recommendation: "Fix approach"
    blocking: true/false
```
