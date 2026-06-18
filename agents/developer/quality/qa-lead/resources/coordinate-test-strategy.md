# Test Strategy Design

Guide for creating comprehensive test strategies.

## Analysis Process

1. **Read code to be tested**
2. **Identify test boundaries**:
   - Unit test scope (functions, classes)
   - Integration test scope (API endpoints, modules)
   - E2E test scope (user flows)
3. **Map edge cases**:
   - Happy path
   - Error conditions
   - Boundary values
   - Invalid inputs
4. **Assess risk areas**:
   - Security-sensitive code
   - Complex business logic
   - External dependencies

## Test Type Selection

| Test Type | When to Use | Tools | Target |
|-----------|-------------|-------|--------|
| Unit | Individual functions | Jest, pytest | 90%+ |
| Integration | Modules together | Supertest | 80%+ |
| E2E | Complete workflows | Playwright | Critical paths |
| Contract | API contracts | Pact | - |

## Test Plan Template

```yaml
test_plan:
  target: "Feature name"
  strategy: "Bottom-up (unit -> integration -> e2e)"

  unit_tests:
    - name: "Test function X"
      cases:
        - happy_path
        - invalid_input
        - edge_cases

  integration_tests:
    - name: "Test API endpoint"
      cases:
        - success_response
        - validation_error
        - auth_failure

  e2e_tests:
    - name: "User login flow"
      steps:
        - navigate to login
        - enter credentials
        - verify redirect

  coverage_target: 85%
```

## Good Tests Checklist

- [ ] Tests are independent (no shared state)
- [ ] Tests are deterministic (same output every time)
- [ ] Tests have clear names
- [ ] Tests use AAA pattern (Arrange, Act, Assert)
- [ ] Tests cover happy path + edge cases
- [ ] Tests run fast (< 1s for unit)
- [ ] Tests clean up after themselves
- [ ] Tests use mocks for external services

## Bug Investigation Process

1. **Reproduce**: Follow steps, confirm bug exists
2. **Isolate**: Narrow down to specific component
3. **Analyze**: Review code, check recent changes
4. **Document**: Write failing test
5. **Handoff**: Provide to developer with reproduction test
