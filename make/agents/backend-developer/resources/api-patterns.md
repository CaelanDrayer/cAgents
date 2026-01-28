# API Design Patterns

Reference for backend API implementation.

## RESTful API Conventions

### HTTP Methods
- `GET`: Retrieve resources (idempotent)
- `POST`: Create resources
- `PUT`: Full update (idempotent)
- `PATCH`: Partial update
- `DELETE`: Remove resources (idempotent)

### Status Codes
- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid auth
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Duplicate resource
- `422 Unprocessable`: Validation failed
- `429 Too Many Requests`: Rate limited
- `500 Internal Error`: Server error

### URL Patterns
```
GET    /api/v1/users           # List users
POST   /api/v1/users           # Create user
GET    /api/v1/users/:id       # Get user
PUT    /api/v1/users/:id       # Update user
DELETE /api/v1/users/:id       # Delete user
GET    /api/v1/users/:id/orders  # Nested resource
```

## Pagination Patterns

### Cursor-Based (Recommended)
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIzfQ==",
    "hasMore": true
  }
}
```

### Offset-Based
```json
{
  "data": [...],
  "pagination": {
    "total": 1000,
    "page": 2,
    "pageSize": 20
  }
}
```

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {"field": "email", "message": "Must be valid email"}
    ]
  }
}
```

## Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
Retry-After: 60
```

## API Versioning

### URL Versioning (Recommended)
```
/api/v1/users
/api/v2/users
```

### Header Versioning
```
Accept: application/vnd.api+json;version=2
```

## Authentication Patterns

### Bearer Token
```
Authorization: Bearer <jwt_token>
```

### API Key
```
X-API-Key: <api_key>
```

## Request Validation

Use schema validation (Joi, Zod, Pydantic):

```javascript
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().max(100)
});
```
