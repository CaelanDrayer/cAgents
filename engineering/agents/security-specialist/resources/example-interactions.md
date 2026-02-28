# Security Specialist Example Interactions

Detailed workflow examples for common security review tasks.

## Example 1: Review Authentication Endpoint

**Request**: "Review POST /api/login endpoint for security vulnerabilities"

**Actions**:
1. Read code: POST /api/login endpoint implementation
2. Identify issues:
   - Password compared with ==, not timing-safe comparison
   - No rate limiting (allows brute force)
   - User-controlled redirect after login (open redirect)
3. Classify:
   - HIGH: No rate limiting (brute force risk)
   - MEDIUM: Timing attack on password comparison
   - MEDIUM: Open redirect vulnerability
4. Provide remediation:
   ```javascript
   // Rate limiting middleware
   const loginLimiter = rateLimit({ windowMs: 900000, max: 5 })

   // Timing-safe comparison
   const crypto = require('crypto')
   const match = crypto.timingSafeEqual(
     Buffer.from(inputHash), Buffer.from(storedHash)
   )

   // Validate redirect URL
   const allowedRedirects = ['/', '/dashboard', '/profile']
   const redirect = allowedRedirects.includes(req.body.redirect)
     ? req.body.redirect : '/'
   ```
5. Document: 3 vulnerabilities (1 HIGH, 2 MEDIUM)

**Outcome**: APPROVED WITH CHANGES - Implement rate limiting, fix timing attack, validate redirects


## Example 3: Check Input Validation for SQL Injection

**Request**: "Review database queries in user search functionality"

**Actions**:
1. Read code: User search query construction
2. Identify vulnerability:
   ```javascript
   // VULNERABLE: String concatenation
   const query = `SELECT * FROM users WHERE name = '${userInput}'`
   ```
3. Classify: CRITICAL - SQL injection allows full database access
4. Provide remediation:
   ```javascript
   // SECURE: Parameterized query
   const query = 'SELECT * FROM users WHERE name = ?'
   db.query(query, [userInput])

   // Or with ORM
   User.findAll({ where: { name: userInput } })
   ```
5. Test exploitation: `userInput = "'; DROP TABLE users--"` would work
6. Document: Critical SQL injection vulnerability

**Outcome**: REJECTED - Block deployment until parameterized queries implemented


## Example 5: Review API Endpoint Access Control

**Request**: "Review access control on /api/admin/users endpoint"

**Actions**:
1. Read code: Admin endpoint implementation
2. Identify issues:
   - No authentication check (anyone can access)
   - No authorization check (any authenticated user can access admin)
   - User IDs predictable (IDOR vulnerability)
3. Classify:
   - CRITICAL: No authentication on admin endpoint
   - HIGH: No role-based authorization
   - MEDIUM: Insecure direct object reference
4. Provide remediation:
   ```javascript
   // Authentication middleware
   app.use('/api/admin/*', requireAuth)

   // Authorization middleware
   app.use('/api/admin/*', requireRole('admin'))

   // IDOR protection - verify ownership
   const user = await User.findById(req.params.id)
   if (!req.user.isAdmin && user.id !== req.user.id) {
     return res.status(403).json({ error: 'Forbidden' })
   }
   ```
5. Document: 3 access control vulnerabilities

**Outcome**: REJECTED - Critical access control missing, block deployment


## Example 7: Check for Secrets Exposure

**Request**: "Audit codebase for hardcoded secrets and credentials"

**Actions**:
1. Search codebase: Grep for common secret patterns
2. Identify issues:
   - AWS keys hardcoded: `AWS_SECRET_ACCESS_KEY = "wJalr..."`
   - Database password in config: `password: "admin123"`
   - API key in frontend: `const STRIPE_KEY = "sk_live_..."`
3. Classify:
   - CRITICAL: AWS credentials in code (account compromise)
   - CRITICAL: Live Stripe key in frontend (financial fraud)
   - HIGH: Database password in config (data breach)
4. Provide remediation:
   ```javascript
   // Use environment variables
   const aws = require('aws-sdk')
   aws.config.update({
     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
   })

   // Use .env file (gitignored)
   DB_PASSWORD=<secure_password>

   // Frontend: Use publishable key only
   const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
   ```
5. Check git history for previously committed secrets
6. Document: 3 critical secret exposures

**Outcome**: REJECTED - Rotate all compromised credentials immediately


## Example 9: Security Review for Third-Party Integration

**Request**: "Review security of Stripe webhook integration"

**Actions**:
1. Read code: Webhook endpoint POST /webhooks/stripe
2. Check signature verification:
   ```javascript
   // GOOD: Signature verification implemented
   const sig = req.headers['stripe-signature']
   const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
   ```
3. Identify issues:
   - Signature verification present (good)
   - No replay attack prevention (timestamp check missing)
   - Webhook processing not idempotent (duplicate events processed twice)
   - No rate limiting on webhook endpoint
4. Classify:
   - MEDIUM: No replay attack prevention
   - MEDIUM: No idempotency (duplicate processing risk)
   - LOW: No rate limiting (minor DoS risk)
5. Provide remediation:
   ```javascript
   // FIX 1: Add timestamp validation (prevent replay attacks)
   const tolerance = 300  // 5 minutes
   const timestamp = Number(req.headers['stripe-signature'].split(',')[0].split('=')[1])
   if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) {
     return res.status(400).json({ error: 'Webhook timestamp too old' })
   }

   // FIX 2: Add idempotency check
   const eventId = event.id
   const processed = await redis.get(`webhook:${eventId}`)
   if (processed) {
     return res.status(200).json({ received: true })  // Already processed
   }
   // Process event...
   await redis.setex(`webhook:${eventId}`, 86400, '1')  // Mark processed
   ```
6. Document: Secure implementation with minor improvements needed

**Outcome**: APPROVED WITH CHANGES - Add replay prevention and idempotency

