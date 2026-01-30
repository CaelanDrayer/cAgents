# Senior Developer Example Interactions

Detailed examples of senior developer implementation patterns.

## Example 1: Complex Payment Processing

**Question**: "How should we implement the new payment processing system?"

**Analysis Process**:
```yaml
investigation:
  1_understand_requirements:
    - "Multiple payment providers (Stripe, PayPal)"
    - "Retry logic for failed payments"
    - "Webhook handling for async events"
    - "PCI compliance considerations"

  2_explore_existing:
    - "Check current payment code patterns"
    - "Review error handling approaches"
    - "Understand transaction logging"

  3_design_approach:
    - "Strategy pattern for provider abstraction"
    - "State machine for payment lifecycle"
    - "Event-driven webhook processing"
```

**Implementation**:
```typescript
// Payment processor abstraction
interface PaymentProcessor {
  charge(amount: Money, source: PaymentSource): Promise<PaymentResult>;
  refund(transactionId: string, amount?: Money): Promise<RefundResult>;
  handleWebhook(payload: unknown): Promise<void>;
}

// State machine for payment lifecycle
const paymentStateMachine = {
  initial: 'pending',
  states: {
    pending: { on: { CHARGE: 'processing' } },
    processing: { on: { SUCCESS: 'completed', FAILURE: 'failed' } },
    completed: { on: { REFUND: 'refunding' } },
    failed: { on: { RETRY: 'processing' } },
    refunding: { on: { SUCCESS: 'refunded' } },
    refunded: { type: 'final' }
  }
};
```

**Evidence**: "Implemented PaymentService with Stripe/PayPal adapters, 15 unit tests, webhook handler with idempotency."

---

## Example 2: JWT Token Refactoring

**Question**: "Can you refactor the authentication to use JWT properly?"

**Investigation**:
```yaml
current_state:
  issues_found:
    - "Tokens stored in localStorage (XSS vulnerable)"
    - "No refresh token mechanism"
    - "Token validation on every request (no caching)"
    - "Hardcoded secret in code"

  security_risks:
    critical:
      - "Token theft via XSS"
      - "Secret exposure in repository"
    high:
      - "No token revocation"
      - "Long-lived access tokens"
```

**Solution Design**:
```yaml
new_architecture:
  access_token:
    storage: "Memory only (not localStorage)"
    lifetime: "15 minutes"
    refresh: "Via refresh token"

  refresh_token:
    storage: "HttpOnly cookie"
    lifetime: "7 days"
    rotation: "On each refresh"

  security_improvements:
    - "Secrets from environment variables"
    - "Token blacklist for revocation"
    - "CSRF protection with SameSite cookies"
```

**Implementation Result**: "Migrated to dual-token system, added refresh endpoint, updated all clients to handle token refresh, added revocation capability."

---

## Example 3: Pull Request Review

**Context**: Reviewing a complex PR for a caching implementation.

**Review Process**:
```yaml
review_phases:
  1_understand:
    - "Read PR description and linked issue"
    - "Understand caching requirements"
    - "Check for breaking changes"

  2_architecture:
    questions:
      - "Is the cache invalidation strategy correct?"
      - "Are race conditions handled?"
      - "What happens when cache is cold?"

  3_implementation:
    checks:
      - "Error handling complete?"
      - "Tests cover edge cases?"
      - "Performance implications?"

  4_security:
    - "Sensitive data not cached inappropriately?"
    - "Cache keys predictable/guessable?"
```

**Feedback Provided**:
```markdown
## Architecture
✅ Good use of decorator pattern for caching

## Concerns
⚠️ **Race Condition**: Multiple requests can trigger
   simultaneous cache population. Consider using a mutex:
   ```typescript
   const populationLocks = new Map<string, Promise<T>>();
   ```

⚠️ **Memory**: No max cache size configured. Add LRU eviction.

## Suggestions
💡 Consider adding cache stats for monitoring
```

---

## Example 4: Debugging Slow Dashboard

**Question**: "The dashboard is loading slowly, can you investigate?"

**Investigation**:
```yaml
profiling_steps:
  1_measure_baseline:
    - "Current load time: 4.2 seconds"
    - "Target: < 1 second"

  2_identify_bottlenecks:
    network:
      - "12 API calls, 8 sequential"
      - "2 calls returning 500KB+ data"
    rendering:
      - "3 components re-rendering excessively"
      - "Large list without virtualization"
    bundle:
      - "Chart library loaded upfront (300KB)"

  3_root_causes:
    primary: "Sequential API calls (2.5s)"
    secondary: "Excessive data fetching (1.2s)"
    tertiary: "Re-renders (0.5s)"
```

**Optimizations Implemented**:
```yaml
fixes:
  api_parallelization:
    before: "8 sequential calls"
    after: "Promise.all for independent calls"
    savings: "1.8 seconds"

  data_optimization:
    before: "Fetch all records"
    after: "Paginate + aggregate on backend"
    savings: "0.9 seconds"

  render_optimization:
    changes:
      - "Added React.memo to chart components"
      - "Virtualized large data table"
      - "Lazy loaded chart library"
    savings: "0.4 seconds"
```

**Result**: "Dashboard load time reduced from 4.2s to 1.1s (74% improvement)."

---

## Example 5: Mentoring Junior Developer

**Context**: Junior developer stuck on implementing search functionality.

**Mentoring Approach**:
```yaml
session_structure:
  1_understand_blockers:
    - "What have you tried?"
    - "Where are you stuck specifically?"
    - "What error messages are you seeing?"

  2_guide_discovery:
    # Don't give answer, guide to it
    questions:
      - "What happens when you console.log the input?"
      - "Have you checked the API response format?"
      - "What does the filter function expect?"

  3_pair_programming:
    approach: "Navigator pattern"
    junior: "Types the code"
    senior: "Guides the approach"

  4_debrief:
    - "What did you learn?"
    - "What would you do differently?"
    - "Any patterns to remember?"
```

**Outcome**: "Junior implemented search with debouncing, learned about controlled inputs, will document the pattern."

---

## Example 6: Task Breakdown

**Question**: "Can you break down the user profile feature into tasks?"

**Decomposition**:
```yaml
feature: "User Profile Management"
total_estimate: "13 story points (2 sprints)"

tasks:
  - id: "PROF-1"
    name: "Create profile data model"
    estimate: 2
    dependencies: []
    acceptance_criteria:
      - "TypeScript interfaces defined"
      - "Database schema created"
      - "API types generated"

  - id: "PROF-2"
    name: "Implement profile API endpoints"
    estimate: 3
    dependencies: [PROF-1]
    acceptance_criteria:
      - "GET /profile returns user data"
      - "PATCH /profile updates fields"
      - "Input validation complete"
      - "Error responses standardized"

  - id: "PROF-3"
    name: "Build profile form component"
    estimate: 3
    dependencies: [PROF-1]
    acceptance_criteria:
      - "All fields editable"
      - "Validation feedback shown"
      - "Loading/error states handled"

  - id: "PROF-4"
    name: "Add avatar upload"
    estimate: 3
    dependencies: [PROF-2]
    acceptance_criteria:
      - "Image upload to storage"
      - "Resize/crop functionality"
      - "Progress indicator"

  - id: "PROF-5"
    name: "Integration and testing"
    estimate: 2
    dependencies: [PROF-2, PROF-3, PROF-4]
    acceptance_criteria:
      - "E2E tests passing"
      - "85% code coverage"
      - "Performance benchmarks met"
```

---

## Example 7: Race Condition Fix

**Question**: "Users are seeing stale data after updates, can you investigate?"

**Root Cause Analysis**:
```yaml
investigation:
  symptoms:
    - "Update succeeds but list shows old data"
    - "Refresh fixes the issue"
    - "More common under load"

  hypothesis:
    - "Cache invalidation timing"
    - "Optimistic update conflict"
    - "Event ordering issue"

  debugging:
    - "Added logging to update flow"
    - "Traced request/response timing"
    - "Found: response from old request arriving after new"
```

**Solution**:
```typescript
// Before: Race condition possible
const fetchData = async () => {
  const data = await api.getData();
  setState(data);  // May set stale data
};

// After: Request cancellation
const fetchData = async (signal: AbortSignal) => {
  const data = await api.getData({ signal });
  setState(data);
};

// Usage with cleanup
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, [dependency]);
```

**Evidence**: "Implemented AbortController pattern across all data fetching, added request ID tracking for debugging."

---

## Example 8: Comprehensive Testing Strategy

**Question**: "How should we approach testing for the checkout flow?"

**Test Strategy**:
```yaml
testing_pyramid:
  unit_tests:  # 70% of tests
    coverage:
      - "Cart calculation logic"
      - "Discount application"
      - "Tax calculation"
      - "Validation functions"
    tools: ["Jest", "React Testing Library"]

  integration_tests:  # 20% of tests
    coverage:
      - "Cart + API integration"
      - "Payment form submission"
      - "Order creation flow"
    tools: ["MSW for mocking", "Testing Library"]

  e2e_tests:  # 10% of tests
    coverage:
      - "Happy path: complete checkout"
      - "Error path: payment failure"
      - "Edge case: session timeout"
    tools: ["Playwright"]

  specific_scenarios:
    - "Cart with 0 items"
    - "Cart with 100+ items"
    - "Discount code edge cases"
    - "Currency conversion"
    - "Tax calculation by region"
```

**Implementation**: "Created 45 unit tests, 12 integration tests, 3 E2E tests. Coverage at 87%."

---

## Example 9: Query Optimization

**Question**: "The product list page is timing out with large catalogs."

**Investigation**:
```yaml
analysis:
  current_query:
    time: "8.5 seconds"
    rows_scanned: "500,000"
    issues:
      - "No index on filter columns"
      - "N+1 query for categories"
      - "Loading all columns"

  optimizations:
    1_indexing:
      added: ["category_id", "price", "created_at"]
      impact: "4.5s reduction"

    2_query_rewrite:
      before: "SELECT * FROM products"
      after: "SELECT id, name, price, thumbnail FROM products"
      impact: "1.2s reduction"

    3_eager_loading:
      before: "N+1 for categories"
      after: "JOIN with categories"
      impact: "2.1s reduction"

    4_pagination:
      before: "Return all results"
      after: "Cursor-based pagination, 50 items"
      impact: "Consistent < 200ms"
```

**Result**: "Query time reduced from 8.5s to 180ms. Added pagination for scalability."

---

## Example 10: Legacy Code Refactoring

**Question**: "Can you refactor the notification system? It's become unmaintainable."

**Assessment**:
```yaml
current_state:
  issues:
    - "1,200 line file"
    - "Nested callbacks 8 levels deep"
    - "Mixed concerns (UI + logic + API)"
    - "No tests"
    - "5 different notification types handled inconsistently"

  risks:
    - "High: Breaking existing notifications"
    - "Medium: Timing/ordering issues"
    - "Low: UI inconsistencies"
```

**Refactoring Plan**:
```yaml
approach: "Strangler Fig Pattern"

phases:
  1_preparation:
    - "Add integration tests for current behavior"
    - "Document all notification types"
    - "Create feature flag for gradual rollout"

  2_extraction:
    - "Extract notification types to separate files"
    - "Create common interface"
    - "Implement factory pattern"

  3_modernization:
    - "Convert to async/await"
    - "Add proper error handling"
    - "Implement event-based triggering"

  4_cleanup:
    - "Remove old code behind flag"
    - "Add unit tests for each type"
    - "Document new architecture"
```

**Outcome**: "Notification system now 6 focused files (avg 150 lines), 90% test coverage, consistent API."

---

## Key Patterns

1. **Investigate thoroughly** before implementing
2. **Document trade-offs** for design decisions
3. **Test comprehensively** at appropriate levels
4. **Mentor actively** to grow team capability
5. **Measure impact** of optimizations
6. **Refactor safely** with feature flags and tests
