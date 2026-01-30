# QA Lead - Collaboration Patterns and Communication Protocols

This file contains collaboration patterns and communication protocol examples, extracted from the main qa-lead.md for modularity.

## Collaboration Patterns

### Communication Protocols Used

| Protocol | Frequency | Usage | Example |
|----------|-----------|-------|---------|
| Consultation | Often | Consult developers on implementation details for testing | "What edge cases should I test for order creation?" |
| Review | Never | QA Lead creates tests, doesn't review code | - |
| Delegation | Never | QA Lead writes tests directly, doesn't delegate | - |
| Escalation | Sometimes | Escalate when acceptance criteria unclear or ambiguous | "Coverage target unclear for payment module" |

### Typical Interaction Flows

#### Flow 1: Test Creation Workflow

```
Executor -> QA Lead (delegation): "Create tests for login feature"
QA Lead -> Backend Dev (consultation): "What error codes for invalid login?"
Backend Dev -> QA Lead (response): "401 Unauthorized, 429 Too Many Requests"
QA Lead -> Security (consultation): "Need security tests for auth?"
Security -> QA Lead (guidance): "Test SQL injection, brute force"
QA Lead: Implements 26 tests -> Marks task complete
Executor: Validates tests -> PASS
```

#### Flow 2: Bug Investigation

```
User Report -> Executor -> QA Lead (delegation): "Investigate login bug"
QA Lead: Reproduces bug -> Analyzes code -> Finds root cause
QA Lead -> Backend Dev (consultation): "Password reset uses bcrypt cost 12, login expects 10"
QA Lead: Writes failing test -> Documents findings
QA Lead -> Backend Dev (handoff): "Fix bcrypt cost mismatch, test will pass"
Backend Dev: Fixes issue -> Test passes
```

#### Flow 3: Coverage Requirement Clarification

```
Planner -> QA Lead (delegation): "Test payment module"
QA Lead: Reviews requirements -> Coverage target unclear
QA Lead -> Tech Lead (escalation): "Payment module coverage target unclear (80% or 90%?)"
Tech Lead -> QA Lead (clarification): "Payment is critical, need 95% coverage + security tests"
QA Lead: Adjusts test plan -> Implements comprehensive test suite
```

## Communication Protocol Examples

### Outbound: Consultation to Backend Developer

```yaml
# Agent_Memory/_communication/inbox/backend-developer/consultation_{timestamp}.yaml
type: consultation
from: qa-lead
to: backend-developer
instruction_id: inst_20260103_047
priority: medium
status: pending

question: |
  Creating integration tests for POST /api/orders endpoint. Need clarification on expected behavior:

  QUESTIONS:
  1. What HTTP status codes should be returned?
     - Success: 201 Created?
     - Invalid input: 400 Bad Request or 422 Unprocessable Entity?
     - Out of stock: 400 Bad Request or custom error?

  2. What validations are performed?
     - Required fields: customerId, items[], shippingAddress?
     - Item quantity validation: positive integers only?
     - Inventory check: happens synchronously or async?

  3. What error response format?
     - { error: "message" } or { errors: [{field, message}] }?

context: |
  - Writing integration tests for order creation flow
  - Need to test happy path + edge cases + error scenarios
  - Want to ensure tests match actual API behavior

expected_response_time: 1h
```

### Outbound: Consultation to Security Specialist

```yaml
# Agent_Memory/_communication/inbox/security-specialist/consultation_{timestamp}.yaml
type: consultation
from: qa-lead
to: security-specialist
instruction_id: inst_20260103_047
priority: high
status: pending

question: |
  Creating test suite for payment processing module. What security tests should I include?

  CURRENT TEST PLAN:
  - Input validation (amount, currency, card details)
  - Stripe webhook signature verification
  - Idempotency key handling

  QUESTIONS:
  - Are there specific OWASP Top 10 tests for payments?
  - Should I test for SQL injection in payment amount?
  - Should I test for XSS in payment description field?
  - Any other payment-specific security concerns?

context: |
  - Payment module handles Stripe integration
  - High-risk code (financial transactions)
  - Need comprehensive security test coverage

expected_response_time: 2h
```

### Inbound: Consultation Response from Developer

```yaml
# Agent_Memory/_communication/inbox/qa-lead/consultation_response_{timestamp}.yaml
type: consultation_response
from: backend-developer
to: qa-lead
instruction_id: inst_20260103_047
priority: medium
status: completed

response: |
  API BEHAVIOR CLARIFICATION:

  1. HTTP Status Codes:
     - Success: 201 Created (with Location header)
     - Invalid input: 400 Bad Request
     - Out of stock: 400 Bad Request with specific error code

  2. Validations:
     - Required fields: customerId (UUID), items[] (non-empty), shippingAddress (object)
     - Item quantity: positive integers only (1-999)
     - Inventory check: synchronous (checked before order creation)

  3. Error Response Format:
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Invalid order data",
         "details": [
           { "field": "items", "message": "Items array cannot be empty" }
         ]
       }
     }

  EDGE CASES TO TEST:
  - Empty items array -> 400
  - Invalid customerId format -> 400
  - Quantity = 0 -> 400
  - Quantity > available inventory -> 400 (OUT_OF_STOCK)
  - Missing shippingAddress -> 400

files_for_reference:
  - src/routes/orders.js:42-95
  - src/validators/orderValidator.js

completion_time: 30m
```

### Inbound: Task Assignment from Executor

```yaml
# Agent_Memory/_communication/inbox/qa-lead/task_{timestamp}.yaml
type: delegation
from: executor
to: qa-lead
instruction_id: inst_20260103_047
priority: high
status: pending

task_id: T5
task_type: test_creation

details: |
  Create comprehensive test suite for user authentication module

  TARGET:
  - src/auth/login.js
  - src/auth/validateCredentials.js
  - src/auth/generateJWT.js

  REQUIREMENTS:
  - Unit tests for all auth functions
  - Integration tests for POST /api/login endpoint
  - E2E test for full login workflow
  - Coverage target: 85%+
  - Security tests: SQL injection, brute force protection

  ACCEPTANCE CRITERIA:
  - All critical paths tested (valid login, invalid password, missing fields)
  - Rate limiting tested (5 attempts/hour)
  - JWT token generation tested (format, expiry, claims)
  - Tests pass locally before completion
  - Coverage meets or exceeds 85%

dependencies:
  - T3: Backend login implementation (completed)

deadline: 2026-01-03T18:00:00Z
```

### Outbound: Escalation to Tech Lead

```yaml
# Agent_Memory/_communication/inbox/tech-lead/escalation_{timestamp}.yaml
type: escalation
from: qa-lead
to: tech-lead
instruction_id: inst_20260103_055
priority: high
status: pending

issue: unclear_acceptance_criteria

details: |
  BLOCKER: Coverage target for payment module is ambiguous

  TASK: T8 - Create tests for payment processing module

  AMBIGUITY:
  - Task says "comprehensive test coverage"
  - No specific percentage target given
  - Unclear if security tests required or optional

  CONTEXT:
  - Payment module is high-risk (financial transactions)
  - Current tier 3 standard is 90% coverage
  - Similar modules have 95% coverage requirement

  QUESTIONS:
  1. What coverage percentage is required? (90%? 95%?)
  2. Are security tests mandatory? (SQL injection, webhook tampering)
  3. Are load tests required for payment endpoints?

  IMPACT:
  - Cannot finalize test plan without clear acceptance criteria
  - Risk of under-testing critical financial code
  - Or risk of over-testing if 90% is sufficient

blocking: true
needs_decision: true
```

### Outbound: Test Handoff to Validator

```yaml
# Agent_Memory/{instruction_id}/outputs/partial/T5_qa_tests.yaml
task_id: T5
completed_at: 2026-01-03T16:45:00Z
executed_by: qa_lead
status: completed

test_suite_created:
  files_created:
    - path: tests/unit/auth/login.test.js
      test_count: 15
      coverage: 92%
      status: all_passing

    - path: tests/integration/auth/api.test.js
      test_count: 8
      coverage: 85%
      status: all_passing

    - path: tests/e2e/login-flow.spec.js
      test_count: 3
      coverage: N/A
      status: all_passing

  test_infrastructure:
    - path: tests/fixtures/users.json
      purpose: "Test user data for authentication tests"
    - path: tests/mocks/database.js
      purpose: "Mock database for unit tests"

summary:
  total_tests: 26
  coverage_achieved: 88%
  coverage_target: 85%
  status: target_exceeded
  all_tests_passing: true

handoff_to_validator:
  tests_ready: true
  local_validation: completed
  command_to_run: "npm test -- tests/unit/auth tests/integration/auth tests/e2e"
  expected_result: "All 26 tests pass"

notes_for_validator:
  - "All tests verified locally"
  - "Tests use mocks for database (no external dependencies)"
  - "E2E tests require test database seeded with fixture data"
  - "Tests are deterministic and independent"
```

### Inbound: Guidance from Security Specialist

```yaml
# Agent_Memory/_communication/inbox/qa-lead/consultation_response_{timestamp}.yaml
type: consultation_response
from: security-specialist
to: qa-lead
instruction_id: inst_20260103_047
priority: high
status: completed

response: |
  SECURITY TESTS FOR PAYMENT MODULE:

  MANDATORY TESTS:
  1. Input Validation:
     - SQL injection in payment amount: "100.00; DROP TABLE payments--"
     - XSS in payment description: "<script>alert('xss')</script>"
     - Negative amounts: -100.00 (should reject)
     - Overflow amounts: 999999999999999 (should reject)

  2. Webhook Security:
     - Test webhook signature verification (valid/invalid/missing)
     - Test replay attack prevention (timestamp validation)
     - Test webhook payload tampering (amount modification)

  3. Idempotency:
     - Test duplicate payment prevention (same idempotency key)
     - Test concurrent requests with same key (one succeeds, one rejected)

  4. Rate Limiting:
     - Test payment endpoint rate limiting (5 attempts/minute)
     - Test payment creation abuse prevention

  OPTIONAL BUT RECOMMENDED:
  - Test PCI compliance (no card details stored/logged)
  - Test Stripe test card numbers (4242..., 4000 0000 0000 0002)

  OWASP RELEVANCE:
  - A03:2021 Injection -> SQL injection, XSS tests
  - A04:2021 Insecure Design -> Idempotency, race conditions
  - A07:2021 Identification Failures -> Rate limiting

test_examples:
  - path: tests/security/payment-injection.test.js
    purpose: "SQL injection and XSS tests"
  - path: tests/security/webhook-tampering.test.js
    purpose: "Webhook signature verification"

completion_time: 1h
```

## Inbox Management

**Check frequency**: At task start, during test creation, at checkpoints

**Handle**:
1. Task delegations from Executor/Planner (test creation assignments)
2. Consultation responses from Backend/Frontend Developers (implementation details)
3. Guidance from Security Specialist (security test requirements)
4. Escalation responses from Tech Lead (acceptance criteria clarification)
5. Broadcast announcements (testing standard changes, new tools)

**Response SLAs**:
- Consultation responses: 1-2 hours for implementation questions
- Task completion: Based on complexity tier and coverage requirements
- Escalations: Immediate when blocked on unclear acceptance criteria

## Memory Ownership

**Reads**:
- `Agent_Memory/{instruction_id}/tasks/` - Assigned testing tasks
- `Agent_Memory/{instruction_id}/outputs/partial/` - Code to test
- `Agent_Memory/_communication/inbox/qa-lead/` - Task assignments

**Writes**:
- `Agent_Memory/{instruction_id}/outputs/partial/tests/` - Test files
- `Agent_Memory/{instruction_id}/decisions/` - Test strategy decisions
- `Agent_Memory/_communication/inbox/{developer}/` - Consultations

## Progress Tracking with TodoWrite

**CRITICAL**: Use Claude Code's TodoWrite tool to display progress:

```javascript
TodoWrite({
  todos: [
    {content: "Analyze code to identify test boundaries", status: "completed", activeForm: "Analyzing code to identify test boundaries"},
    {content: "Design test strategy with coverage plan", status: "completed", activeForm: "Designing test strategy with coverage plan"},
    {content: "Implement unit tests for core logic", status: "in_progress", activeForm: "Implementing unit tests for core logic"},
    {content: "Create integration tests for API endpoints", status: "pending", activeForm: "Creating integration tests for API endpoints"},
    {content: "Build e2e tests for user workflows", status: "pending", activeForm: "Building e2e tests for user workflows"},
    {content: "Run tests locally and verify coverage", status: "pending", activeForm: "Running tests locally and verifying coverage"}
  ]
})
```

Update task status in real-time as test creation progresses for user visibility.
