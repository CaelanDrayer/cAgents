# Critical Paths

## Must Be Tested

### Authentication
- User login (valid credentials)
- User login (invalid credentials)
- Session management
- Token refresh
- Logout

### Authorization
- Role-based access control
- Permission checks
- Unauthorized access attempts

### Data Operations
- CRUD operations
- Data validation
- Error handling
- Transaction rollback

### Business Logic
- Core workflows
- Calculations and algorithms
- State transitions
- Business rule enforcement

## Edge Case Coverage

Check for tests of:
- Empty inputs
- Null/undefined values
- Boundary values (min/max)
- Invalid data types
- Concurrent operations
- Network failures
- Database errors
- Rate limit scenarios

## Integration Test Requirements

- API endpoint tests (request/response)
- Database integration tests
- External service integration tests
- Multi-component workflow tests
- End-to-end user scenarios
