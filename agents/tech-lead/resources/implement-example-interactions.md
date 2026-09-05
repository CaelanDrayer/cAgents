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


## Key Patterns

1. **Investigate thoroughly** before implementing
2. **Document trade-offs** for design decisions
3. **Test comprehensively** at appropriate levels
4. **Mentor actively** to grow team capability
5. **Measure impact** of optimizations
6. **Refactor safely** with feature flags and tests
