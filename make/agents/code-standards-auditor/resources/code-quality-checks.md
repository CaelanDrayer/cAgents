# Code Quality Checks & Metrics

Quality thresholds and automated checking integration.

## Function Quality Limits

| Metric | Recommended | Maximum | Rationale |
|--------|-------------|---------|-----------|
| Function length | 30 lines | 50 lines | Readability, single responsibility |
| Cyclomatic complexity | 5 | 10 | Testability, maintainability |
| Parameters | 3 | 4 | Cognitive load, API clarity |
| Nesting depth | 3 | 4 | Readability, error handling |

### Examples

```javascript
// BAD - Too long, complex
function processUser(data) {
  // 150 lines of nested logic
}

// GOOD - Broken into smaller functions
function processUser(data) {
  const validated = validateUser(data);
  const normalized = normalizeData(validated);
  return saveUser(normalized);
}
```

## DRY Principle

### Detecting Duplication

```javascript
// BAD - Duplicated logic
function formatUserName(user) {
  return user.firstName + ' ' + user.lastName;
}

function displayUserName(user) {
  return user.firstName + ' ' + user.lastName;  // Duplicate!
}

// GOOD - Extracted helper
function getFullName(user) {
  return `${user.firstName} ${user.lastName}`;
}

function formatUserName(user) {
  return getFullName(user);
}
```

## Magic Numbers

```javascript
// BAD - Magic numbers
if (user.age > 18) {}
setTimeout(callback, 3600000);

// GOOD - Named constants
const MINIMUM_AGE = 18;
const ONE_HOUR_MS = 60 * 60 * 1000;

if (user.age > MINIMUM_AGE) {}
setTimeout(callback, ONE_HOUR_MS);
```

## Linter Integration

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'max-len': ['warn', { code: 100 }],
    'max-lines-per-function': ['warn', { max: 50 }],
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-params': ['warn', 4],
    'no-magic-numbers': 'warn',
    'require-jsdoc': 'warn'
  }
};
```

### Supported Linters

| Language | Linter | Purpose |
|----------|--------|---------|
| JavaScript/TypeScript | ESLint | Linting |
| JavaScript/TypeScript | Prettier | Formatting |
| Python | Black | Formatting |
| Python | Pylint | Linting |
| Ruby | RuboCop | Style |
| Go | golangci-lint | Linting |

## Quality Checklist

### Naming
- [ ] Classes use PascalCase
- [ ] Functions use camelCase (JS) or snake_case (Python)
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Boolean variables have is/has/should prefix
- [ ] Names are descriptive and meaningful

### Function Quality
- [ ] Functions <= 50 lines
- [ ] Cyclomatic complexity <= 10
- [ ] <= 4 parameters per function
- [ ] Nesting depth <= 4 levels
- [ ] Single responsibility principle

### Code Quality
- [ ] No code duplication (DRY)
- [ ] No magic numbers or strings
- [ ] Consistent formatting throughout
- [ ] Public APIs documented
- [ ] Error handling present
- [ ] No commented-out code
- [ ] Imports organized consistently

### Project Structure
- [ ] Logical folder structure
- [ ] Related files grouped together
- [ ] Test files colocated or mirrored
- [ ] Configuration files in root
- [ ] Clear separation of concerns
