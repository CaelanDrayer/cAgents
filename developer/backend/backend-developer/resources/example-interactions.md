# Backend Developer Example Interactions

Detailed workflow examples for common backend development tasks.

## Example 1: User Registration API with Email Verification

**Request**: "Implement a RESTful API endpoint for user registration with email verification"

**Actions**:
1. Read requirements: POST /api/auth/register with email, password, verification flow
2. Review existing auth: Check current patterns, JWT setup, database schema
3. Plan: User model + verification token table + email service
4. Consult frontend: "What data shape for registration response?"
5. Implement endpoint with validation, hashing, token generation
6. Optimize: Add index on email column, rate limiting (5 attempts/hour)
7. Write tests: Valid registration, duplicate email, invalid format
8. Request security review
9. Test performance: Registration <200ms, email queued in background
10. Document: OpenAPI spec with examples and error codes

**Outcome**: Secure registration API with email verification, rate limiting, comprehensive tests


## Example 3: GraphQL Resolver for Nested Order Data

**Request**: "Create GraphQL resolver for nested orders → items → products → reviews"

**Actions**:
1. Read schema: Order type with nested relations
2. Review existing: Pattern uses DataLoader for batching
3. Plan: Use DataLoader to batch product and review queries
4. Consult frontend: "Need all review fields or just rating/count?"
5. Implement resolver with DataLoader for N+1 prevention
6. Single query loads all data efficiently
7. Test DataLoader batching, verify N+1 eliminated
8. Performance: 50 orders with nested data in 120ms (vs 2.5s without)

**Outcome**: Efficient nested GraphQL queries, 95% performance improvement


## Example 5: Background Job Processor for Bulk Emails

**Request**: "Build background processor for 10k+ email notifications"

**Actions**:
1. Requirements: Send marketing emails, retry failures, track status
2. Review: No job queue, needs Bull/BullMQ + Redis
3. Plan: Bull queue + worker process + status tracking
4. Consult tech lead: "Separate service or same process?"
5. Implement queue with producer/consumer pattern
6. Optimize: Batch processing (10 concurrent), rate limiting (100/sec)
7. Test: Job queueing, processing, retry on failure
8. Performance: 10k emails in 100 seconds, 99.5% delivery

**Outcome**: Scalable background job processing, 10k emails in <2 minutes


## Example 7: Rate Limiting with Redis Sliding Window

**Request**: "Implement rate limiting (100 req/hour) with sliding window"

**Actions**:
1. Requirements: 100 requests/hour/user, return 429 when exceeded
2. Review: No rate limiting, endpoints open to abuse
3. Plan: Middleware using Redis sorted sets
4. Consult security: "Limit by IP, user ID, or both?"
5. Implement: Remove old entries, count in window, add current
6. Optimize: Lua script for atomic operations
7. Test: Under limit passes, over limit 429, sliding behavior
8. Performance: <5ms latency added

**Outcome**: Sliding window rate limiting, prevents API abuse


## Example 9: Debug Memory Leak in Node.js

**Request**: "Fix memory leak (200MB → 2GB in 6 hours, then crash)"

**Actions**:
1. Understand: Memory grows continuously, OOM after 6 hours
2. Review: Suspected WebSocket connections, event listeners
3. Profile: Heap snapshots at 1h, 3h, 6h intervals
4. Consult senior: "Growing array in WebSocket handler - known pattern?"
5. Analyze: Found 50k WebSocket listeners not cleaned up
6. Fix: Add proper removeListener in close handler
7. Test: Monitor heap over 1000 connections, verify cleanup
8. Run 12 hours: Heap stable at 250MB (was 2GB)
9. Add Prometheus metrics, alert at 1GB

**Outcome**: Memory leak fixed, heap stable, no crashes in 7 days

