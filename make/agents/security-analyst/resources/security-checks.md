# Security Detection Patterns

## SQL Injection Detection

```regex
- Direct string concatenation in SQL: \$\{.*\}|\+.*\+
- Unparameterized queries: execute\(.*\+.*\)
- Raw SQL with user input: query\(.*req\.(body|query|params)
```

## Secret Detection

```regex
- API keys: (api[_-]?key|apikey).*=.*['\"][a-zA-Z0-9]{20,}
- Passwords: (password|passwd|pwd).*=.*['\"][^'\"]{8,}
- Tokens: (token|auth|secret).*=.*['\"][a-zA-Z0-9]{32,}
- AWS keys: AKIA[0-9A-Z]{16}
```

## XSS Vulnerabilities

```regex
- innerHTML with user data: innerHTML.*=.*(req\.|user\.|input\.)
- dangerouslySetInnerHTML: dangerouslySetInnerHTML
- Unescaped output: \$\{.*user.*\}.*html
```

## Authentication Issues

- Check for missing auth middleware on routes
- Verify JWT validation and secret strength
- Confirm password hashing (bcrypt, argon2)
- Check session token randomness and expiry

## CSRF Protection

- Verify CSRF tokens on POST/PUT/DELETE
- Check SameSite cookie attributes
- Confirm Origin header validation

## Integration with Tools

- **npm audit** - Check for vulnerable dependencies
- **pip-audit** - Python dependency vulnerabilities
- **Snyk** - Multi-language vulnerability scanning
- **git-secrets** - Prevent committing secrets
