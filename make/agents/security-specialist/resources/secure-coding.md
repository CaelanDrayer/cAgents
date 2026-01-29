# Secure Coding Patterns

Best practices and secure implementation patterns for common security scenarios.

## Authentication Patterns

### Password Hashing

```javascript
// RECOMMENDED: bcrypt with cost 12+
const bcrypt = require('bcrypt')
const COST = 12

async function hashPassword(password) {
  return bcrypt.hash(password, COST)
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// ALTERNATIVE: Argon2 (memory-hard)
const argon2 = require('argon2')

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,
    parallelism: 4
  })
}
```

### JWT Implementation

```javascript
const jwt = require('jsonwebtoken')

// Generate token
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'your-app',
      audience: 'your-app-users'
    }
  )
}

// Verify token (explicit algorithm)
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],  // Prevent algorithm confusion
    issuer: 'your-app',
    audience: 'your-app-users'
  })
}
```

### Session Management

```javascript
const session = require('express-session')
const RedisStore = require('connect-redis')(session)

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  name: 'sessionId',  // Don't use default 'connect.sid'
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}))

// Regenerate session after login
app.post('/login', async (req, res) => {
  // ... authenticate user ...
  req.session.regenerate((err) => {
    req.session.userId = user.id
    res.json({ success: true })
  })
})
```

---

## Input Validation Patterns

### Schema Validation (Joi)

```javascript
const Joi = require('joi')

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(12).max(128).required(),
  username: Joi.string().alphanum().min(3).max(30).required()
})

app.post('/register', async (req, res) => {
  const { error, value } = userSchema.validate(req.body)
  if (error) {
    return res.status(400).json({ error: error.details[0].message })
  }
  // Use validated 'value', not raw req.body
})
```

### SQL Injection Prevention

```javascript
// SECURE: Parameterized queries
const mysql = require('mysql2/promise')

async function getUser(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  )
  return rows[0]
}

// SECURE: ORM (Sequelize)
const user = await User.findOne({
  where: { id: userId }
})

// SECURE: Query builder (Knex)
const user = await knex('users')
  .where('id', userId)
  .first()
```

### XSS Prevention

```javascript
const escape = require('escape-html')

// Escape output
res.send(`<div>Welcome, ${escape(username)}</div>`)

// React (auto-escapes by default)
return <div>Welcome, {username}</div>

// DANGEROUS: dangerouslySetInnerHTML
// Only use with sanitized content
import DOMPurify from 'dompurify'
return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"]
  }
}))
```

---

## Access Control Patterns

### Role-Based Access Control

```javascript
// Middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// Usage
app.get('/api/admin/users', requireRole('admin'), getUsers)
app.get('/api/reports', requireRole('admin', 'manager'), getReports)
```

### Resource Ownership

```javascript
// IDOR protection
app.get('/api/documents/:id', async (req, res) => {
  const document = await Document.findById(req.params.id)

  if (!document) {
    return res.status(404).json({ error: 'Not found' })
  }

  // Check ownership
  if (document.ownerId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json(document)
})
```

---

## Secrets Management

### Environment Variables

```javascript
// .env (development)
DATABASE_URL=postgres://localhost/mydb
JWT_SECRET=your-256-bit-secret
STRIPE_SECRET_KEY=sk_test_...

// .env.production (production, managed externally)
// Use secrets manager for production

// Load with dotenv
require('dotenv').config()

// Access
const dbUrl = process.env.DATABASE_URL
```

### AWS Secrets Manager

```javascript
const { SecretsManager } = require('@aws-sdk/client-secrets-manager')

const client = new SecretsManager({ region: 'us-east-1' })

async function getSecret(secretName) {
  const response = await client.getSecretValue({ SecretId: secretName })
  return JSON.parse(response.SecretString)
}

// Usage
const dbCreds = await getSecret('prod/database')
```

### Never Log Secrets

```javascript
// BAD
console.log(`Connecting with password: ${password}`)

// GOOD
console.log(`Connecting to database: ${hostname}`)

// Redact in error handling
function safeLog(obj) {
  const redacted = { ...obj }
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'authorization']
  sensitiveKeys.forEach(key => {
    if (redacted[key]) redacted[key] = '[REDACTED]'
  })
  return redacted
}
```

---

## File Upload Security

```javascript
const multer = require('multer')
const path = require('path')
const { v4: uuid } = require('uuid')

// Allowed types
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif'
}

// Configure multer
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../uploads/private'),
    filename: (req, file, cb) => {
      const ext = ALLOWED_TYPES[file.mimetype]
      if (!ext) {
        return cb(new Error('Invalid file type'))
      }
      cb(null, `${uuid()}.${ext}`)
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024  // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Invalid file type'), false)
    }
    cb(null, true)
  }
})

// Serve files through controller (not static)
app.get('/files/:filename', requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename)  // Prevent traversal
  const filepath = path.join(__dirname, '../uploads/private', filename)
  res.sendFile(filepath)
})
```

---

## Rate Limiting

```javascript
const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
})

// Strict login rate limit
const loginLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts' }
})

// Apply
app.use('/api/', apiLimiter)
app.post('/api/login', loginLimiter, login)
```

---

## Security Headers

```javascript
const helmet = require('helmet')

app.use(helmet())

// Or configure individually
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.example.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"]
  }
}))

app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}))

app.use(helmet.noSniff())
app.use(helmet.frameguard({ action: 'deny' }))
app.use(helmet.xssFilter())
```

---

## Error Handling

```javascript
// Production error handler (no stack traces)
app.use((err, req, res, next) => {
  // Log full error internally
  console.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  })

  // Return safe error to client
  const statusCode = err.statusCode || 500
  const message = statusCode === 500
    ? 'Internal Server Error'
    : err.message

  res.status(statusCode).json({ error: message })
})

// Custom error classes
class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message)
    this.statusCode = 401
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message)
    this.statusCode = 403
  }
}
```

---

## HTTPS/TLS

```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

// HSTS (via helmet or manually)
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  next()
})
```

---

## Database Security

```javascript
// Connection with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('rds-ca-cert.pem')
  }
})

// Principle of least privilege
// Use read-only connection for queries
const readPool = new Pool({ /* read-only user */ })
const writePool = new Pool({ /* write user */ })

// Timeout to prevent slow query DoS
const pool = new Pool({
  statement_timeout: 30000,  // 30 seconds
  query_timeout: 30000
})
```

---

## Logging Security Events

```javascript
const winston = require('winston')

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
})

// Log security events
function logSecurityEvent(event, details) {
  securityLogger.info({
    timestamp: new Date().toISOString(),
    event,
    ...details
  })
}

// Usage
logSecurityEvent('login_failed', {
  username: req.body.username,
  ip: req.ip,
  userAgent: req.get('User-Agent')
})

logSecurityEvent('permission_denied', {
  userId: req.user.id,
  resource: req.path,
  action: req.method
})
```
