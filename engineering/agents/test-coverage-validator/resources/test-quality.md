# Test Quality Assessment

## Good Tests

```javascript
// Clear arrangement, action, assertion
it('should calculate discount correctly', () => {
  // Arrange
  const cart = { items: [{ price: 100 }], discount: 0.1 };

  // Act
  const total = calculateTotal(cart);

  // Assert
  expect(total).toBe(90);
});
```

## Poor Tests

```javascript
// Too broad, unclear what's being tested
it('should work', () => {
  expect(doEverything()).toBeDefined();
});

// No assertions
it('should process order', () => {
  processOrder(order);  // No expectation!
});
```

## Quality Checklist

- [ ] No tests that always pass (no assertions)
- [ ] Tests are independent (no shared state)
- [ ] Fast unit tests (<1s per file)
- [ ] Clear test names describing what's tested
- [ ] Arrange-Act-Assert pattern used
- [ ] Mocks used appropriately (not over-mocked)

## Test Pyramid Validation

**Imbalanced pyramids (anti-patterns)**:
- **Ice cream cone**: Too many E2E, few unit tests
- **Hourglass**: Heavy on E2E and unit, light on integration
