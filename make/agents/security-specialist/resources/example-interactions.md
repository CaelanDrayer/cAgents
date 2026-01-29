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

---

## Example 2: Assess JWT Token Implementation

**Request**: "Review JWT implementation in authentication service"

**Actions**:
1. Read code: JWT generation and validation
2. Identify issues:
   - Using HS256 with weak secret ("secret123")
   - No token expiration set
   - Accepting both symmetric and asymmetric signatures (algorithm confusion)
3. Classify:
   - CRITICAL: Weak JWT secret (trivially crackable)
   - HIGH: No expiration (tokens valid forever)
   - HIGH: Algorithm confusion vulnerability
4. Provide remediation:
   ```javascript
   // Generate strong secret
   const secret = crypto.randomBytes(64).toString('hex')

   // Set expiration and specify algorithm
   jwt.sign(payload, secret, {
     algorithm: 'HS256',
     expiresIn: '1h'
   })

   // Verify with explicit algorithm
   jwt.verify(token, secret, { algorithms: ['HS256'] })
   ```
5. Document: 3 critical JWT vulnerabilities

**Outcome**: REJECTED - Critical vulnerabilities must be fixed before deployment

---

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

---

## Example 4: Verify Password Hashing

**Request**: "Review password storage implementation"

**Actions**:
1. Read code: Password hashing in user registration
2. Identify issues:
   - Using MD5 (cryptographically broken)
   - No salt used (rainbow table vulnerable)
3. Classify:
   - CRITICAL: MD5 is broken, easily cracked
   - HIGH: No salt allows rainbow table attacks
4. Provide remediation:
   ```javascript
   const bcrypt = require('bcrypt')
   const SALT_ROUNDS = 12

   // Hash password
   const hash = await bcrypt.hash(password, SALT_ROUNDS)

   // Verify password
   const valid = await bcrypt.compare(password, hash)
   ```
5. Document: Password storage is insecure

**Outcome**: REJECTED - Must use bcrypt/argon2 with proper cost factor

---

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

---

## Example 6: Assess File Upload Security

**Request**: "Review file upload handling in profile picture endpoint"

**Actions**:
1. Read code: File upload endpoint implementation
2. Identify issues:
   - No file type validation (can upload .exe, .php)
   - Original filename preserved (path traversal risk)
   - Files stored in web root (direct execution possible)
   - No file size limit (DoS via large files)
3. Classify:
   - CRITICAL: Arbitrary file upload (RCE possible)
   - HIGH: Path traversal risk
   - MEDIUM: DoS via large files
4. Provide remediation:
   ```javascript
   // Validate file type
   const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
   if (!allowedTypes.includes(file.mimetype)) {
     return res.status(400).json({ error: 'Invalid file type' })
   }

   // Generate safe filename
   const filename = `${uuid.v4()}.${allowedExtensions[file.mimetype]}`

   // Store outside web root
   const uploadPath = path.join(__dirname, '../uploads/private/', filename)

   // Limit file size (5MB)
   const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } })
   ```
5. Document: 4 file upload vulnerabilities

**Outcome**: REJECTED - Critical vulnerabilities, rewrite upload handling

---

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

---

## Example 8: Review Session Management

**Request**: "Review session handling in Express.js application"

**Actions**:
1. Read code: Session configuration
2. Identify issues:
   - Using default session secret ("keyboard cat")
   - Session cookie not httpOnly (XSS can steal)
   - Session cookie not secure (sent over HTTP)
   - No session fixation protection
   - Very long session expiry (30 days)
3. Classify:
   - HIGH: Default/weak session secret
   - HIGH: Cookie not httpOnly
   - MEDIUM: Cookie not secure
   - MEDIUM: Session fixation risk
   - LOW: Long session expiry
4. Provide remediation:
   ```javascript
   app.use(session({
     secret: process.env.SESSION_SECRET,  // Strong random secret from env
     resave: false,
     saveUninitialized: false,  // Prevent session fixation
     cookie: {
       secure: true,        // HTTPS only
       httpOnly: true,      // Prevent XSS access
       sameSite: 'strict',  // Prevent CSRF
       maxAge: 86400000     // 24 hour expiry
     }
   }))
   ```
5. Document: 5 session security issues (2 High, 3 Medium)

**Outcome**: APPROVED WITH CHANGES - Fix session configuration, use secure settings

---

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

---

## Example 10: Dependency Security Audit

**Request**: "Audit project dependencies for known vulnerabilities"

**Actions**:
1. Run npm audit: `npm audit --json`
2. Analyze results:
   - CRITICAL: lodash@4.17.15 (Prototype Pollution - CVE-2020-8203)
   - HIGH: express@4.16.0 (Open Redirect - CVE-2022-24999)
   - MEDIUM: moment@2.24.0 (ReDoS - CVE-2022-31129)
3. Check exploitation likelihood:
   - lodash: HIGH (commonly exploited, affects merge/set functions)
   - express: MEDIUM (requires specific redirect configuration)
   - moment: LOW (date parsing edge case)
4. Classify:
   - CRITICAL: 1 vulnerability (lodash prototype pollution)
   - HIGH: 1 vulnerability (express redirect)
   - MEDIUM: 1 vulnerability (moment ReDoS)
5. Provide remediation:
   ```bash
   # FIX: Upgrade affected packages
   npm install lodash@latest  # 4.17.15 → 4.17.21
   npm install express@latest  # 4.16.0 → 4.18.2
   npm install moment@latest   # 2.24.0 → 2.29.4 (or migrate to date-fns)

   # Verify fixes
   npm audit

   # Alternative: Use npm audit fix
   npm audit fix
   ```
6. Document: 3 CVEs found, upgrades available, no breaking changes
7. Recommend: Enable Dependabot/Snyk for continuous monitoring

**Outcome**: APPROVED WITH CHANGES - Upgrade dependencies, enable automated scanning
