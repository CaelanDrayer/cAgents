# Security Reviews

## Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] Input validation comprehensive (whitelist preferred)
- [ ] Output encoding prevents XSS
- [ ] Parameterized queries prevent SQL injection
- [ ] CSRF protection on state-changing operations
- [ ] Authentication logic secure (no bypass)
- [ ] Authorization checks on all protected resources
- [ ] Cryptography correct (modern algorithms, proper key sizes)
- [ ] Sensitive data encrypted (at-rest, in-transit)
- [ ] Error messages don't leak sensitive info

## Penetration Test Checklist

- [ ] OWASP Top 10 tested
- [ ] Authentication bypass attempts (failed)
- [ ] Authorization bypass attempts (failed)
- [ ] Injection attacks (SQL, NoSQL, command, LDAP) blocked
- [ ] XSS attempts blocked
- [ ] CSRF protection working
- [ ] Rate limiting effective
- [ ] No data leakage in errors or logs

## Security Specializations

### Authentication & Authorization
- JWT, OAuth2, session-based authentication
- RBAC, ABAC authorization models
- Multi-factor authentication

### Application Security
- OWASP Top 10 vulnerabilities
- Input validation and sanitization
- Output encoding
- Secure session management

### Cryptography
- Encryption algorithms (AES, RSA)
- Key management
- TLS/SSL configuration
- Password hashing (bcrypt, Argon2)
