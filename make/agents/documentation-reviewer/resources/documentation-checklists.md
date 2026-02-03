# Documentation Review Checklists

Comprehensive checklists for documentation quality validation.

## README Completeness

### Required Sections
- [ ] Project title and description
- [ ] Installation instructions
- [ ] Usage examples
- [ ] Configuration options
- [ ] Contributing guidelines
- [ ] License

### Recommended Sections
- [ ] Features list
- [ ] Requirements/prerequisites
- [ ] API documentation link
- [ ] Troubleshooting
- [ ] FAQ
- [ ] Changelog

### README Template

```markdown
# Project Name

Brief description of what it does

## Installation

```bash
npm install package-name
```

## Usage

```javascript
import { feature } from 'package-name';
feature.doSomething();
```

## Configuration
...

## Contributing
...

## License
MIT
```

## API Documentation

### For Each Public Function/Method
- [ ] Purpose and behavior
- [ ] Parameters (types, defaults, required/optional)
- [ ] Return value (type, meaning)
- [ ] Exceptions/errors thrown
- [ ] Usage examples
- [ ] Related functions

### JSDoc Example

```javascript
/**
 * Fetches user data from the API
 *
 * @param {string} userId - The unique user identifier
 * @param {Object} options - Optional configuration
 * @param {boolean} options.includeDeleted - Include soft-deleted users
 * @returns {Promise<User>} The user object
 * @throws {NotFoundError} If user doesn't exist
 * @throws {ApiError} If API request fails
 *
 * @example
 * const user = await fetchUser('123');
 * console.log(user.name);
 */
async function fetchUser(userId, options = {}) {
  // Implementation
}
```

## Architecture Documentation

### Should Explain
- [ ] System architecture (diagrams helpful)
- [ ] Component relationships
- [ ] Data flow
- [ ] Key design decisions
- [ ] Technology choices and rationale

### Architecture Template

```markdown
# Architecture

## Overview
High-level description of system architecture

## Components

### Frontend
- React application
- Redux for state management
- Communicates with backend via REST API

### Backend
- Node.js/Express API server
- PostgreSQL database
- Redis for caching

## Data Flow

1. User interacts with React app
2. App makes API request to Express
3. Express queries PostgreSQL
4. Results cached in Redis
5. Response returned to frontend
```

## Code Comments

### When to Comment
- Complex algorithms
- Non-obvious business logic
- Workarounds for bugs/limitations
- Performance optimizations
- Public API functions

### When NOT to Comment
- Self-explanatory code
- Stating the obvious
- Outdated/misleading information

### Comment Examples

```javascript
// BAD - Obvious comment
// Increment counter by 1
counter++;

// GOOD - Explains WHY
// Use exponential backoff to avoid overwhelming the API
await sleep(Math.pow(2, retryCount) * 1000);

// GOOD - Explains workaround
// Safari doesn't support lookbehind, use different approach
const pattern = /alternative-pattern/;
```

## Error Message Quality

```javascript
// BAD - Unhelpful
throw new Error('Invalid input');

// GOOD - Clear and actionable
throw new Error(
  `Invalid email format: "${email}". ` +
  `Expected format: user@domain.com`
);

// BETTER - With error codes
throw new ValidationError(
  `Invalid email format: "${email}"`,
  { code: 'INVALID_EMAIL_FORMAT', field: 'email' }
);
```
