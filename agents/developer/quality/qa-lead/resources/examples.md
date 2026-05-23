# QA Lead - Detailed Examples

This file contains 10 detailed examples of QA Lead interactions, extracted from the main qa-lead.md for modularity.

## Example 1: Create Comprehensive Test Suite for Authentication

**Request**: "Create a comprehensive test suite for the user authentication module"

**QA Lead Actions**:
1. Read authentication code: src/auth/login.js, validateCredentials(), generateJWT()
2. Design test strategy: Unit tests (90%+), integration tests (API endpoints), e2e (login flow)
3. Create test plan:
   - Unit: validateCredentials (valid/invalid/SQL injection), generateJWT (format/expiry)
   - Integration: POST /api/login (200/401/429), rate limiting
   - E2E: Full login flow (navigate -> enter -> submit -> redirect)
4. Implement unit tests (15 tests):
   ```javascript
   describe('validateCredentials', () => {
     test('returns true for valid credentials', () => {...})
     test('returns false for invalid password', () => {...})
     test('handles SQL injection attempts', () => {...})
     // ... 12 more tests
   })
   ```
5. Build integration tests (8 tests): Supertest for API endpoints, mock database
6. Create e2e tests (3 tests): Playwright for full user flow
7. Run tests locally: npm test -> all 26 tests pass
8. Check coverage: 92% unit, 85% integration (exceeds 80% target)
9. Document gaps: "Concurrent login attempts not tested (low priority)"
10. Mark complete: Tests ready for Validator to run

**Outcome**: 26 tests created, 88% coverage achieved, all tests pass locally


## Example 3: Write Integration Tests for REST API Endpoints

**Request**: "Write integration tests for the REST API endpoints in the orders service"

**QA Lead Actions**:
1. Read API code: src/routes/orders.js (GET, POST, PUT, DELETE endpoints)
2. Review API contracts: OpenAPI spec shows 8 endpoints with request/response schemas
3. Plan integration tests:
   - GET /api/orders -> 200 with orders array, pagination
   - POST /api/orders -> 201 created, 400 validation errors
   - GET /api/orders/:id -> 200 found, 404 not found
   - PUT /api/orders/:id -> 200 updated, 404 not found
   - DELETE /api/orders/:id -> 204 deleted, 404 not found
4. Implement with Supertest:
   ```javascript
   describe('GET /api/orders', () => {
     test('returns orders array with pagination', async () => {
       const res = await request(app).get('/api/orders').query({ limit: 20 })
       expect(res.status).toBe(200)
       expect(res.body.data).toBeInstanceOf(Array)
       expect(res.body.pagination.hasMore).toBeDefined()
     })
   })
   ```
5. Add test fixtures: Sample orders data in tests/fixtures/orders.json
6. Mock database: Use test database, seed before each test, clean after
7. Run tests: 18 integration tests pass, 87% coverage
8. Document: API test structure, fixture usage, database setup

**Outcome**: 18 integration tests for orders API, 87% coverage, all passing


## Example 5: Investigate and Reproduce Login Bug

**Request**: "Investigate and create a reproduction test for the reported login bug (users can't login after password reset)"

**QA Lead Actions**:
1. Reproduce manually: Reset password -> Try login -> Fails with "Invalid credentials"
2. Confirm bug exists: Reproduced in dev environment
3. Isolate: Password reset sets password correctly, but login validation fails
4. Analyze code: Found issue - password reset uses bcrypt cost 12, login expects cost 10
5. Write failing test:
   ```javascript
   test('login works after password reset', async () => {
     // Reset password
     await resetPassword('user@example.com', 'newPassword123')

     // Attempt login (currently fails)
     const result = await validateCredentials('user@example.com', 'newPassword123')
     expect(result).toBe(true)  // FAILS - bcrypt cost mismatch
   })
   ```
6. Document findings:
   ```yaml
   bug_report:
     issue: "Login fails after password reset"
     root_cause: "bcrypt cost mismatch (reset=12, login=10)"
     reproduction_test: tests/unit/auth/password-reset-bug.test.js
     expected: "validateCredentials returns true"
     actual: "validateCredentials returns false"
     suggested_fix: "Standardize bcrypt cost to 12 everywhere"
   ```
7. Handoff to backend dev: Test + analysis -> Developer fixes -> Test passes

**Outcome**: Bug reproduced with failing test, root cause identified, ready for fix


## Example 7: Create Load Tests for API Performance

**Request**: "Create load tests to verify the API can handle 1000 requests per second"

**QA Lead Actions**:
1. Understand requirement: API must handle 1000 req/s without errors
2. Select tool: k6 for load testing (easy scripting, good reporting)
3. Design load test:
   ```javascript
   // load-test.js
   import http from 'k6/http'
   import { check, sleep } from 'k6'

   export const options = {
     stages: [
       { duration: '1m', target: 100 },   // Ramp to 100 users
       { duration: '3m', target: 1000 },  // Ramp to 1000 users
       { duration: '2m', target: 1000 },  // Stay at 1000
       { duration: '1m', target: 0 },     // Ramp down
     ],
     thresholds: {
       http_req_duration: ['p(95)<500'],  // 95% under 500ms
       http_req_failed: ['rate<0.01'],    // Error rate < 1%
     }
   }

   export default function() {
     const res = http.get('https://api.example.com/products')
     check(res, { 'status is 200': (r) => r.status === 200 })
   }
   ```
4. Run load test: k6 run load-test.js
5. Analyze results:
   - Peak throughput: 987 req/s (98.7% of target)
   - P95 latency: 420ms (meets <500ms threshold)
   - Error rate: 0.3% (meets <1% threshold)
6. Document findings: API can handle 987 req/s with 0.3% errors
7. Recommend: Add caching to reach 1000 req/s with 0% errors

**Outcome**: Load test shows API handles 987 req/s (near target), actionable recommendations


## Example 9: Implement Regression Tests After Bug Fix

**Request**: "After fixing the race condition in inventory updates, add regression tests to prevent recurrence"

**QA Lead Actions**:
1. Understand bug: Two users buying last item caused negative inventory
2. Read fix: Backend added SELECT FOR UPDATE (database row locking)
3. Design regression test: Simulate concurrent purchases
4. Implement test:
   ```javascript
   test('prevents race condition in inventory updates', async () => {
     // Set inventory to 1
     await db.query('UPDATE products SET inventory = 1 WHERE id = ?', [productId])

     // Simulate 2 concurrent purchase attempts
     const [purchase1, purchase2] = await Promise.all([
       request(app).post('/api/orders').send({ productId, quantity: 1 }),
       request(app).post('/api/orders').send({ productId, quantity: 1 })
     ])

     // One should succeed (201), one should fail (400 out of stock)
     const statuses = [purchase1.status, purchase2.status].sort()
     expect(statuses).toEqual([201, 400])

     // Verify inventory is not negative
     const inventory = await db.query('SELECT inventory FROM products WHERE id = ?', [productId])
     expect(inventory[0].inventory).toBeGreaterThanOrEqual(0)
   })
   ```
5. Run test: Passes with fix (row locking works)
6. Add to regression suite: Mark as critical, run on every commit
7. Document: Explanation of race condition, how test prevents regression

**Outcome**: Regression test ensures race condition won't return

