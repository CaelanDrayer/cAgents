# OWASP Top 10 Vulnerability Patterns

Reference guide for OWASP Top 10 2021 vulnerability detection and remediation.

## A01: Broken Access Control

**Detection Patterns**:
- Missing authentication on sensitive endpoints
- No authorization checks after authentication
- IDOR (Insecure Direct Object References)
- CORS misconfiguration allowing any origin
- Missing function-level access control

**Code Indicators**:
```javascript
// VULNERABLE: No auth check
app.get('/api/admin/users', (req, res) => { ... })

// VULNERABLE: IDOR
app.get('/api/users/:id', (req, res) => {
  const user = User.findById(req.params.id)  // No ownership check
})

// VULNERABLE: CORS
app.use(cors({ origin: '*' }))
```

**Remediation**:
```javascript
// Authentication middleware
app.use('/api/admin/*', requireAuth, requireRole('admin'))

// IDOR protection
if (user.id !== req.user.id && !req.user.isAdmin) {
  return res.status(403).json({ error: 'Forbidden' })
}

// Restrictive CORS
app.use(cors({ origin: ['https://example.com'] }))
```


## A03: Injection

**Detection Patterns**:
- String concatenation in SQL queries
- Unescaped user input in HTML
- Dynamic command execution
- LDAP/XML injection

**Code Indicators**:
```javascript
// VULNERABLE: SQL injection
const query = `SELECT * FROM users WHERE id = ${userId}`

// VULNERABLE: Command injection
exec(`ping ${userInput}`)

// VULNERABLE: XSS
res.send(`<div>Welcome, ${userName}</div>`)
```

**Remediation**:
```javascript
// Parameterized queries
const query = 'SELECT * FROM users WHERE id = ?'
db.query(query, [userId])

// Avoid exec with user input, or sanitize
const sanitized = userInput.replace(/[^a-zA-Z0-9.-]/g, '')

// Escape output
res.send(`<div>Welcome, ${escapeHtml(userName)}</div>`)
```


## A05: Security Misconfiguration

**Detection Patterns**:
- Default credentials in use
- Verbose error messages in production
- Unnecessary features enabled
- Missing security headers
- Debug mode in production

**Code Indicators**:
```javascript
// VULNERABLE: Stack traces exposed
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack })
})

// VULNERABLE: Debug mode
app.set('env', 'development')

// VULNERABLE: Missing headers
// No helmet, no CSP, no HSTS
```

**Remediation**:
```javascript
// Safe error handling
app.use((err, req, res, next) => {
  console.error(err.stack)  // Log internally
  res.status(500).json({ error: 'Internal Server Error' })
})

// Production mode
app.set('env', 'production')

// Security headers
app.use(helmet())
app.use(helmet.contentSecurityPolicy({ directives: { ... } }))
```


## A07: Identification and Authentication Failures

**Detection Patterns**:
- Weak password requirements
- Credential stuffing vulnerable
- Session fixation
- Predictable session IDs
- Missing MFA on sensitive operations

**Code Indicators**:
```javascript
// VULNERABLE: Weak session
app.use(session({ secret: 'secret' }))

// VULNERABLE: No session regeneration
// After login, same session ID used

// VULNERABLE: Password in URL
app.get('/login?password=secret')
```

**Remediation**:
```javascript
// Strong session
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { secure: true, httpOnly: true, sameSite: 'strict' }
}))

// Regenerate session after login
req.session.regenerate((err) => {
  req.session.userId = user.id
})

// MFA for sensitive operations
if (operation.requiresMFA) {
  await verifyMFA(user, mfaToken)
}
```


## A09: Security Logging and Monitoring Failures

**Detection Patterns**:
- No logging of authentication events
- Sensitive data in logs
- No alerting on suspicious activity
- Logs not protected

**Code Indicators**:
```javascript
// VULNERABLE: Logging sensitive data
console.log(`Login attempt: ${username}:${password}`)

// VULNERABLE: No auth logging
app.post('/login', (req, res) => {
  // No logging of failed attempts
})
```

**Remediation**:
```javascript
// Safe logging
logger.info('Login attempt', { username, ip: req.ip, success: false })
// Never log passwords

// Alert on suspicious patterns
if (failedLogins > 10) {
  alertSecurityTeam({ event: 'brute_force_detected', ip })
}

// Protect log files
// - Restrict access
// - Encrypt sensitive logs
// - Set retention policy
```


## Quick Reference

| Vulnerability | Severity | Detection | Key Fix |
|--------------|----------|-----------|---------|
| A01 Broken Access | Critical | Missing auth/authz | Add middleware |
| A02 Crypto Failures | Critical | Weak hashing | Use bcrypt/argon2 |
| A03 Injection | Critical | String concat | Parameterized queries |
| A04 Insecure Design | High | No rate limit | Add rate limiting |
| A05 Misconfiguration | High | Stack traces | Use helmet, hide errors |
| A06 Outdated | High | npm audit | Update dependencies |
| A07 Auth Failures | High | Weak sessions | Secure session config |
| A08 Integrity | High | No checksums | Verify signatures |
| A09 Logging | Medium | No audit trail | Add security logging |
| A10 SSRF | High | User URLs | Validate/whitelist URLs |
