# Architecture Decision Record Template

## ADR-{number}: {title}

### Status
[Proposed | Accepted | Deprecated | Superseded by ADR-{n}]

### Context
What is the issue motivating this decision?

### Decision
What is the change being proposed/done?

### Consequences
What becomes easier or harder because of this change?

---

## Example ADR

### ADR-001: Use CRDT for Collaborative Editing

### Status
Accepted

### Context
We need real-time collaborative text editing with 10-50 concurrent users per document.

Considered:
1. **Operational Transformation (OT)**: Custom implementation, complex conflict resolution
2. **CRDT with Yjs**: Proven library, handles network partitions

### Decision
Use CRDT approach with Yjs library.

**Rationale**:
- Yjs is battle-tested (Notion, etc.)
- Handles offline editing better than OT
- 1 week implementation vs 3-4 weeks for custom OT
- Built-in rich text support (y-prosemirror)

**Trade-offs**:
- 20% larger payload size (acceptable)
- 150KB client bundle addition

### Consequences

**Positive**:
- Faster implementation
- Better offline support
- Proven reliability

**Negative**:
- Dependency on Yjs library
- Team needs to learn CRDT concepts

**Neutral**:
- Need WebSocket infrastructure
