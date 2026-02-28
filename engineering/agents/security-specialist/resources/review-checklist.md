# Security Review Checklist

Comprehensive checklist for security reviews.

## Pre-Review Setup

- [ ] Identify files/endpoints to review
- [ ] Check for recent security-related changes
- [ ] Review any existing security documentation
- [ ] Note sensitive data types involved (PII, credentials, financial)


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

