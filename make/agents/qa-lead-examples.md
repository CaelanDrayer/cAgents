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

---

## Example 2: Design Test Strategy for Payment Processing

**Request**: "Design a test strategy for the payment processing feature with 90% coverage"

**QA Lead Actions**:
1. Understand target: Stripe integration, checkout flow, webhook handling
2. Assess risk: High risk (financial transactions), need security tests
3. Consult security specialist: "Need specific security tests for payments?"
4. Design strategy:
   - Unit: Payment validation, amount calculation, currency conversion
   - Integration: Stripe API calls (with mocks), webhook signature verification
   - E2E: Full checkout flow with test credit cards
   - Security: SQL injection in amount, XSS in description, webhook tampering
5. Create test plan:
   ```yaml
   test_plan:
     unit_tests:
       - validate_payment_amount (positive, zero, negative, overflow)
       - calculate_tax (various rates, edge cases)
       - format_currency (USD, EUR, JPY)
     integration_tests:
       - POST /api/payments/checkout (success, failure, timeout)
       - POST /webhooks/stripe (valid signature, invalid signature)
     e2e_tests:
       - complete_purchase_flow (add item -> checkout -> payment -> confirmation)
       - declined_card_handling (4000 0000 0000 0002)
   ```
6. Implement tests: 45 tests total (30 unit, 10 integration, 5 e2e)
7. Run locally: All tests pass, 93% coverage
8. Document: Test data (test cards), mock Stripe responses, security test cases

**Outcome**: Comprehensive payment test strategy, 93% coverage, security tests included

---

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

---

## Example 4: Implement E2E Tests for Checkout Flow

**Request**: "Implement e2e tests for the checkout flow from cart to confirmation"

**QA Lead Actions**:
1. Map user flow: Add to cart -> View cart -> Enter shipping -> Payment -> Confirmation
2. Identify test scenarios:
   - Happy path: Complete purchase with valid card
   - Declined card: Handle payment failure gracefully
   - Empty cart: Prevent checkout with no items
3. Set up Playwright: Install, configure test environment
4. Implement happy path test:
   ```javascript
   test('complete checkout flow', async ({ page }) => {
     await page.goto('/products')
     await page.click('button[data-product="1"]')  // Add to cart
     await page.click('a[href="/cart"]')
     await page.click('button:has-text("Checkout")')
     await page.fill('#email', 'test@example.com')
     await page.fill('#card', '4242424242424242')
     await page.click('button:has-text("Pay")')
     await expect(page.locator('.confirmation')).toBeVisible()
   })
   ```
5. Add error scenarios: Declined card (4000 0000 0000 0002), empty cart
6. Run tests: All 3 e2e tests pass, 5-10s execution time
7. Document: Test data (cards), environment setup, screenshot on failure

**Outcome**: 3 e2e tests for checkout flow, all critical paths covered

---

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

---

## Example 6: Add Accessibility Tests for WCAG AA Compliance

**Request**: "Add accessibility tests to ensure WCAG AA compliance for the registration form"

**QA Lead Actions**:
1. Review form: Email input, password input, submit button, error messages
2. Plan accessibility tests:
   - Semantic HTML: Form labels, ARIA attributes
   - Keyboard navigation: Tab order, Enter to submit
   - Screen reader: Announce errors, label associations
   - Color contrast: Text meets WCAG AA (4.5:1 ratio)
3. Install axe-core: Accessibility testing library
4. Implement tests:
   ```javascript
   test('registration form has no accessibility violations', async () => {
     const html = render(<RegistrationForm />)
     const results = await axe(html.container)
     expect(results.violations).toHaveLength(0)
   })

   test('form is keyboard navigable', async ({ page }) => {
     await page.goto('/register')
     await page.keyboard.press('Tab')  // Focus email
     await page.keyboard.type('test@example.com')
     await page.keyboard.press('Tab')  // Focus password
     await page.keyboard.type('password123')
     await page.keyboard.press('Enter')  // Submit
     await expect(page.locator('.success')).toBeVisible()
   })
   ```
5. Run tests: Found 2 violations (missing label, low contrast)
6. Document issues: Report to frontend dev for fixes
7. Re-run after fixes: All accessibility tests pass

**Outcome**: WCAG AA compliance verified, 2 accessibility issues fixed

---

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

---

## Example 8: Write Contract Tests for GraphQL API

**Request**: "Write contract tests for the GraphQL API to prevent breaking changes"

**QA Lead Actions**:
1. Understand contract testing: Verify API responses match expected schema
2. Read GraphQL schema: Query { products, orders }, Mutation { createOrder }
3. Plan contract tests: Test query responses match schema, mutations work as expected
4. Implement with graphql-schema-linter:
   ```javascript
   test('products query matches schema', async () => {
     const query = `{ products { id, name, price } }`
     const result = await graphql(schema, query)

     expect(result.data.products).toEqual(
       expect.arrayContaining([
         expect.objectContaining({
           id: expect.any(String),
           name: expect.any(String),
           price: expect.any(Number),
         })
       ])
     )
   })

   test('createOrder mutation returns expected fields', async () => {
     const mutation = `mutation { createOrder(input: {...}) { id, total, status } }`
     const result = await graphql(schema, mutation)

     expect(result.data.createOrder).toHaveProperty('id')
     expect(result.data.createOrder).toHaveProperty('total')
     expect(result.data.createOrder).toHaveProperty('status')
   })
   ```
5. Add snapshot tests: Capture response shape, detect breaking changes
6. Run tests: All contract tests pass, schema validated
7. Document: Contract test coverage, snapshot update process

**Outcome**: Contract tests prevent breaking API changes, schema validated

---

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

---

## Example 10: Create Test Data Management Strategy

**Request**: "Design a test data management strategy for the order processing system"

**QA Lead Actions**:
1. Understand scope: Orders system needs customers, products, inventory, payments
2. Assess current state: Tests using hardcoded data, brittle and hard to maintain
3. Design strategy:
   - Fixtures: JSON files for seed data (customers, products)
   - Factories: Dynamic test data generation with faker.js
   - Builders: Fluent API for complex test objects
4. Implement fixtures:
   ```javascript
   // tests/fixtures/customers.json
   [
     { id: 1, email: 'test@example.com', name: 'Test User' },
     { id: 2, email: 'admin@example.com', name: 'Admin User' }
   ]
   ```
5. Create factories:
   ```javascript
   // tests/factories/orderFactory.js
   import { faker } from '@faker-js/faker'

   export function createOrder(overrides = {}) {
     return {
       id: faker.datatype.uuid(),
       customerId: faker.datatype.number(),
       total: faker.commerce.price(),
       status: 'pending',
       ...overrides
     }
   }
   ```
6. Build builders:
   ```javascript
   class OrderBuilder {
     constructor() { this.order = createOrder() }
     withCustomer(id) { this.order.customerId = id; return this }
     withTotal(amount) { this.order.total = amount; return this }
     build() { return this.order }
   }
   ```
7. Document usage: Examples of fixtures, factories, builders
8. Refactor existing tests: Use new data management approach

**Outcome**: Maintainable test data strategy, reduced test brittleness
