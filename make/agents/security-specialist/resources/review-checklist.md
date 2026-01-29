# Security Review Checklist

Comprehensive checklist for security reviews.

## Pre-Review Setup

- [ ] Identify files/endpoints to review
- [ ] Check for recent security-related changes
- [ ] Review any existing security documentation
- [ ] Note sensitive data types involved (PII, credentials, financial)

---

## Authentication Review

### Password Security
- [ ] Passwords hashed with bcrypt/argon2 (not MD5/SHA1)
- [ ] Cost factor >= 12 for bcrypt
- [ ] No password length limits that truncate
- [ ] Password complexity requirements enforced

### Token Security
- [ ] JWT uses strong algorithm (HS256+ or RS256)
- [ ] JWT secret is strong and from environment
- [ ] Token expiration set appropriately (1h-24h typical)
- [ ] Algorithm specified in verification (prevent confusion)
- [ ] Refresh token rotation implemented

### Session Security
- [ ] Session secret is strong and from environment
- [ ] Session cookie has `httpOnly` flag
- [ ] Session cookie has `secure` flag (production)
- [ ] Session cookie has `sameSite: strict`
- [ ] Session regenerated after login
- [ ] Session destroyed on logout

### Multi-Factor Authentication
- [ ] MFA available for sensitive operations
- [ ] MFA backup codes generated securely
- [ ] Rate limiting on MFA attempts

---

## Authorization Review

### Access Control
- [ ] Authentication required on protected endpoints
- [ ] Authorization checked after authentication
- [ ] Role-based access control implemented
- [ ] Principle of least privilege followed

### Resource Access
- [ ] IDOR protection (ownership verification)
- [ ] Admin functions protected
- [ ] API keys have limited scope
- [ ] No horizontal privilege escalation

### CORS
- [ ] CORS not set to `*` in production
- [ ] Allowed origins explicitly listed
- [ ] Credentials handling configured correctly

---

## Input Validation Review

### SQL Injection
- [ ] All queries parameterized
- [ ] No string concatenation in queries
- [ ] ORM used correctly (no raw queries with user input)
- [ ] Stored procedures use parameters

### XSS Prevention
- [ ] User input escaped before output
- [ ] Content Security Policy configured
- [ ] `dangerouslySetInnerHTML` uses sanitization
- [ ] HTTP-only cookies prevent token theft

### Command Injection
- [ ] No `exec`/`eval` with user input
- [ ] Shell commands avoid user input
- [ ] If needed, strict whitelist validation

### File Upload
- [ ] File type validated (MIME + extension)
- [ ] Filename sanitized (no path traversal)
- [ ] Files stored outside web root
- [ ] File size limited
- [ ] No execution permissions on upload directory

### Other Injection
- [ ] LDAP injection prevented
- [ ] XML injection prevented (disable external entities)
- [ ] Template injection prevented
- [ ] Header injection prevented

---

## Data Protection Review

### Encryption
- [ ] TLS 1.2+ required for all connections
- [ ] Sensitive data encrypted at rest
- [ ] Encryption keys stored securely
- [ ] No sensitive data in URLs

### Secrets Management
- [ ] No hardcoded credentials
- [ ] Secrets in environment variables
- [ ] `.env` files in `.gitignore`
- [ ] Production uses secrets manager
- [ ] API keys rotated regularly

### Logging
- [ ] Passwords never logged
- [ ] Tokens never logged
- [ ] PII minimized in logs
- [ ] Security events logged (login, access denied)

### Data Exposure
- [ ] API responses don't leak sensitive fields
- [ ] Error messages don't expose internals
- [ ] Stack traces hidden in production
- [ ] Debug mode disabled in production

---

## API Security Review

### Rate Limiting
- [ ] Rate limiting on authentication endpoints
- [ ] Rate limiting on API endpoints
- [ ] Account lockout after failed attempts
- [ ] Rate limit headers returned

### Request Validation
- [ ] Request size limits set
- [ ] Content-Type validated
- [ ] JSON parsing has depth limit
- [ ] Schema validation on input

### Response Security
- [ ] Security headers set (via helmet)
- [ ] No sensitive data in response headers
- [ ] Proper status codes returned
- [ ] HSTS enabled

---

## Dependency Review

### Vulnerability Scanning
- [ ] `npm audit` run (or equivalent)
- [ ] No critical vulnerabilities
- [ ] High vulnerabilities addressed
- [ ] Automated scanning configured (Dependabot/Snyk)

### Dependency Hygiene
- [ ] Dependencies up to date
- [ ] Unused dependencies removed
- [ ] Lock file committed
- [ ] No dependencies from untrusted sources

---

## Infrastructure Review

### Configuration
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Proper error handling configured

### Network
- [ ] Firewall rules restrictive
- [ ] Internal services not exposed
- [ ] HTTPS enforced
- [ ] No SSRF vulnerabilities

---

## Severity Classification

### Critical (Block Deployment)
- SQL injection
- Authentication bypass
- Remote code execution
- Hardcoded production credentials
- Missing authentication on sensitive endpoints

### High (Fix Before Production)
- XSS vulnerabilities
- CSRF vulnerabilities
- Insecure secrets storage
- Missing authorization
- Weak cryptography

### Medium (Fix with Tracking)
- Missing rate limiting
- Verbose error messages
- Missing security headers
- Session misconfiguration

### Low (Suggest Improvement)
- Missing cookie flags
- Outdated dependencies (no known exploits)
- Minor header improvements

---

## Review Output Template

```yaml
review_id: SR-{timestamp}
reviewer: security-specialist
date: {date}
scope: {files/endpoints reviewed}

result: approved | approved_with_changes | rejected

summary:
  critical: 0
  high: 0
  medium: 0
  low: 0

findings:
  - id: F-001
    severity: high
    category: authentication
    issue: "No rate limiting on login endpoint"
    location: "src/auth/login.js:15"
    description: "Login endpoint allows unlimited attempts, enabling brute force attacks"
    recommendation: "Add rate limiting middleware (5 attempts per 15 minutes)"
    code_fix: |
      const loginLimiter = rateLimit({ windowMs: 900000, max: 5 })
      router.post('/login', loginLimiter, login)

required_changes:
  - "Add rate limiting to login endpoint"

optional_suggestions:
  - "Consider adding CAPTCHA after 3 failed attempts"

approval_conditions:
  - "All required changes implemented"
  - "Re-review before production deployment"
```

---

## Collaboration Protocols

### Inbound Review Request
```yaml
type: review
from: {developer}
to: security-specialist
priority: {critical|high|medium|low}
review_type: security_review
scope: {endpoint/file description}
files_changed: [...]
```

### Outbound Review Response
```yaml
type: review_response
from: security-specialist
to: {developer}
review_result: approved | approved_with_changes | rejected
vulnerabilities_found: [...]
required_changes: [...]
sla: {based on severity}
```

### Escalation (Critical)
```yaml
type: escalation
from: security-specialist
to: tech-lead
priority: critical
issue: critical_vulnerability
blocking: true
deployment_blocked: true
details: {vulnerability description}
```

---

## Response SLAs

| Severity | Response Time | Resolution |
|----------|--------------|------------|
| Critical | 4 hours | Block deployment |
| High | 24 hours | Block until fixed |
| Medium | 72 hours | Track for fix |
| Low | 2 weeks | Suggest improvement |
