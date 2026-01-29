# Backend Developer Collaboration Patterns

Communication protocols and interaction flows for backend development.

## Communication Protocols

| Protocol | Frequency | Usage | Example |
|----------|-----------|-------|---------|
| Consultation | Often | Consult Frontend on API contracts, DBA on queries | "What data shape for /api/orders response?" |
| Review | Always | Request Security review for auth/payment endpoints | "Please review Stripe integration security" |
| Escalation | Sometimes | Escalate complex issues to Senior Dev | "Memory leak in WebSocket handler, need help" |
| Delegation | Rarely | N/A (Backend Dev doesn't delegate) | - |

## Typical Interaction Flows

### Flow 1: API Endpoint Implementation

```
Executor → Backend Dev (delegation): "Implement POST /api/orders endpoint"
Backend Dev → Frontend Dev (consultation): "What fields for order response?"
Frontend Dev → Backend Dev (response): "Need id, items[], total, status"
Backend Dev → Security (review): "Review order creation endpoint"
Security → Backend Dev (approval): "Approved, add rate limiting"
Backend Dev → Executor (completion): "Endpoint implemented with tests"
```

### Flow 2: Database Query Optimization

```
Frontend Dev → Backend Dev (escalation): "Product search timing out at 4.5s"
Backend Dev → DBA (consultation): "Need composite index for search filters?"
DBA → Backend Dev (response): "Add (category_id, price, brand_id) index"
Backend Dev → Frontend Dev (resolution): "Optimized to 180ms, deployed"
```

### Flow 3: Third-Party Integration

```
Tech Lead → Backend Dev (delegation): "Integrate Stripe for subscriptions"
Backend Dev → Architect (consultation): "Use checkout.sessions or payment intents?"
Architect → Backend Dev (guidance): "Use checkout.sessions for simplicity"
Backend Dev → Security (review): "Review webhook signature verification"
Security → Backend Dev (approval): "Approved, ensure idempotency"
Backend Dev → Tech Lead (completion): "Stripe integration live with webhooks"
```

## Message Templates

### Consultation to Frontend Developer

```yaml
type: consultation
from: backend-developer
to: frontend-developer
priority: medium

question: |
  Implementing POST /api/auth/register endpoint. What data shape for response?

  Option A: Return full user object + token
  Option B: Return only success message (verify email first)

context: |
  - Registration requires email verification before login
  - Frontend needs to show "Check your email" message
```

### Review Request to Security Specialist

```yaml
type: review
from: backend-developer
to: security-specialist
priority: high

review_type: security_review
scope: authentication_endpoint

details: |
  Please review POST /api/auth/register endpoint

  KEY CONCERNS:
  - Password hashing with bcrypt (cost factor 10)
  - Email verification token generation
  - Rate limiting (5 attempts/hour per IP)
  - Input validation (Joi schema)
```

### Consultation to DBA

```yaml
type: consultation
from: backend-developer
to: dba
priority: high

question: |
  Product search query timing out (4.5s). Need indexing advice.

  QUERY:
  SELECT * FROM products WHERE category_id = ? AND price BETWEEN ? AND ?

  CURRENT STATE:
  - 500k products, full table scan, no indexes

  QUESTION: Composite index or separate indexes?
```

## Inbox Management

**Check frequency**: Every task execution (start and checkpoints)

**Handle**:
1. Task delegations from Executor/Tech Lead
2. Consultation requests from Frontend Developer
3. Review responses from Security Specialist
4. Consultation responses from DBA/Architect
5. Broadcast announcements (deployment freezes, incidents)

**Response SLAs**:
- Consultation responses: 30 minutes simple, 2 hours complex
- Review requests: Submit within task completion
- Escalations: Immediate for blockers
