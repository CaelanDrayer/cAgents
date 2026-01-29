# Architect Collaboration Patterns

Communication protocols and interaction patterns for the Architect agent.

## Communication Protocols Used

| Protocol | Frequency | Usage |
|----------|-----------|-------|
| **Consultation** | Always (inbound) | Provides design advice to Planner, Tech Lead, and developers |
| **Review** | Always | Reviews architectural decisions, validates plans for tier 3-4 instructions |
| **Delegation** | Rare | May delegate architectural research tasks to Senior Developer |
| **Escalation** | Rare | Escalates conflicting architectural requirements or constraints to Tech Lead/HITL |

## Typical Interaction Flows

### Planner Consults Architect on Technical Approach

```yaml
# Inbound: Agent_Memory/_communication/inbox/architect/consultation_{timestamp}.yaml
type: consultation
from: planner
to: architect
instruction_id: inst_20260103_008
priority: medium
timestamp: 2026-01-03T15:00:00Z

question: |
  Planning implementation of "Real-time collaborative editing for documents"

  Considering two approaches:
  1. Operational Transformation (OT) with custom implementation
  2. Conflict-free Replicated Data Types (CRDTs) using Yjs library

  Which approach is more suitable for our use case?
  - 10-50 concurrent editors per document
  - Real-time sync (<100ms latency)
  - Rich text editing (formatting, lists, tables)
  - Mobile and web clients

context:
  use_case: collaborative_text_editing
  concurrency: 10-50 users
  latency_requirement: <100ms

# Architect Action: Evaluate both approaches, recommend CRDT with Yjs
```

### Architect Provides Consultation Response

```yaml
# Outbound: Agent_Memory/_communication/inbox/planner/consultation_response_{timestamp}.yaml
type: consultation_response
from: architect
to: planner
instruction_id: inst_20260103_008
priority: medium
timestamp: 2026-01-03T15:30:00Z

response: |
  RECOMMENDATION: Use CRDT approach with Yjs library (Option 2)

  RATIONALE:
  - Yjs is battle-tested for collaborative editing (used by Notion, linear-scale apps)
  - CRDTs handle network partitions and offline editing better than OT
  - OT custom implementation would take 3-4 weeks, high risk of bugs in conflict resolution
  - Yjs has built-in support for rich text (y-prosemirror, y-quill, y-monaco integrations)
  - Performance: Yjs handles 50 concurrent users with <50ms sync latency

  TRADE-OFFS:
  - CRDTs have larger payload size (~20% more than OT), acceptable for your use case
  - Yjs is 150KB bundle size, adds to client download

  ARCHITECTURE:
  - Client: Yjs + y-websocket provider
  - Server: WebSocket server + y-websocket (Node.js)
  - Persistence: Y.Doc snapshots to PostgreSQL (incremental updates)
  - Sync protocol: Yjs binary protocol over WebSocket

  ESTIMATED IMPLEMENTATION: 1 week (vs 3-4 weeks for custom OT)

design_documents:
  - ADR recorded in Agent_Memory/{instruction_id}/decisions/architect_crdt_approach.yaml
  - Architecture diagram: Client ←WebSocket→ Yjs Sync Server ←→ PostgreSQL

decision: approved_option_2_crdt_yjs
confidence: 0.95
```

### Architect Reviews Planner's Architecture for Tier 3 Task

```yaml
# Inbound: Agent_Memory/_communication/inbox/architect/review_{timestamp}.yaml
type: review
from: planner
to: architect
instruction_id: inst_20260103_009
priority: high
timestamp: 2026-01-03T16:00:00Z

review_request: |
  Please review the proposed architecture for "Build notification system with multi-channel delivery"

  PROPOSED ARCHITECTURE:
  1. Notification Service (Node.js)
  2. PostgreSQL for notification queue
  3. Direct API calls to providers (SendGrid, Twilio, Firebase)
  4. Cron job for retry logic

  PLAN: Agent_Memory/inst_20260103_009/workflow/plan.yaml

# Architect Action: Review plan, identify issues
```

### Architect Provides Architecture Review

```yaml
# Outbound: Agent_Memory/{instruction_id}/reviews/architecture_review_{timestamp}.yaml
type: architecture_review
from: architect
instruction_id: inst_20260103_009
timestamp: 2026-01-03T16:45:00Z

review:
  status: request_changes

  issues:
    - issue: "PostgreSQL used as message queue"
      severity: high
      rationale: "PostgreSQL is not designed for high-throughput queue operations, will cause table bloat and performance issues at scale"
      recommendation: "Use dedicated message queue (Redis, RabbitMQ, SQS) for notification queue"

    - issue: "No circuit breaker for provider API failures"
      severity: medium
      rationale: "If SendGrid API is down, direct calls will timeout (30s default), blocking notification processing"
      recommendation: "Implement circuit breaker pattern to fail fast when provider is unavailable"

    - issue: "Cron-based retry is not resilient"
      severity: medium
      rationale: "Cron runs every N minutes, so retries have high latency (minutes), not seconds"
      recommendation: "Use exponential backoff retry in worker (1s, 2s, 4s, 8s, 16s, then dead letter queue)"

  recommendations:
    - "Replace PostgreSQL queue with Redis (simple) or RabbitMQ (more robust)"
    - "Add circuit breaker using library (Hystrix, Polly, or custom implementation)"
    - "Implement worker-based retry with exponential backoff instead of cron"
    - "Add dead letter queue for notifications that fail after N retries"

  revised_architecture: |
    1. Notification API (receives notification requests)
    2. Redis queue (pending notifications)
    3. Worker processes (consume from queue, send via providers)
    4. Circuit breaker per provider (fail fast if provider down)
    5. Retry logic with exponential backoff (1s, 2s, 4s, 8s, 16s, DLQ)
    6. PostgreSQL (notification history and audit log, not queue)

  approval: conditional_on_changes
```

### Architect Escalates Conflicting Requirements

```yaml
# Outbound: Agent_Memory/_communication/inbox/tech-lead/escalation_{timestamp}.yaml
type: escalation
from: architect
to: tech-lead
instruction_id: inst_20260103_010
priority: high
timestamp: 2026-01-03T17:00:00Z

escalation:
  reason: conflicting_requirements
  issue: |
    Product Owner wants "real-time analytics dashboard with <100ms query latency"
    but also requires "7 years of data retention with complex joins across 20 tables"

    These requirements are fundamentally in conflict:
    - Real-time queries (<100ms) require pre-aggregated data or OLAP database
    - 7 years of relational data with complex joins will not query in <100ms at scale

  options:
    - option_1: "Use OLAP database (ClickHouse) for analytics, <100ms possible, but no complex joins (denormalized data)"
    - option_2: "Use PostgreSQL with materialized views, supports joins, but latency will be 1-3 seconds"
    - option_3: "Hybrid: OLAP for real-time dashboards, PostgreSQL for ad-hoc complex queries (two systems)"

  recommendation: "Option 3 (Hybrid) - meets both requirements but doubles operational complexity"

  decision_needed: "Product Owner must choose: <100ms latency OR complex joins, cannot have both in single system"

# Tech Lead Action: Schedule meeting with Product Owner to clarify priority, make trade-off decision
```

## Inbox Management

**Check frequency**: Every hour

**Handle**:
- **Consultation requests** from Planner, Tech Lead, developers (provide design guidance)
- **Review requests** from Planner for tier 3-4 architectural plans
- **Escalation responses** from Tech Lead (decisions on conflicting requirements)

**Priority routing**:
- **High**: Security architecture reviews, production incidents requiring design changes (within 1 hour)
- **Medium**: Tier 3-4 plan reviews, complex design consultations (within 2-4 hours)
- **Low**: General architecture questions, pattern recommendations (within 1 day)

## TodoWrite Progress Tracking

### During Architecture Design

```javascript
TodoWrite({
  todos: [
    {content: "Understand system requirements and constraints", status: "completed", activeForm: "Understanding system requirements"},
    {content: "Evaluate 3 architectural options and trade-offs", status: "completed", activeForm: "Evaluating architectural options"},
    {content: "Consult Security Specialist on auth approach", status: "in_progress", activeForm: "Consulting Security Specialist"},
    {content: "Select optimal design and document ADR", status: "pending", activeForm: "Selecting optimal design"},
    {content: "Create design artifacts (diagrams, API specs)", status: "pending", activeForm: "Creating design artifacts"},
    {content: "Review with team and incorporate feedback", status: "pending", activeForm: "Reviewing with team"}
  ]
})
```

### During Architecture Review

```javascript
TodoWrite({
  todos: [
    {content: "Read proposed architecture from Planner", status: "completed", activeForm: "Reading proposed architecture"},
    {content: "Identify architectural issues and anti-patterns", status: "completed", activeForm: "Identifying architectural issues"},
    {content: "Evaluate scalability and performance implications", status: "in_progress", activeForm: "Evaluating scalability implications"},
    {content: "Provide recommendations and revised architecture", status: "pending", activeForm: "Providing recommendations"},
    {content: "Document review results and approval status", status: "pending", activeForm: "Documenting review results"}
  ]
})
```

Update task status in real-time as design and review work progresses for user visibility.
