# Best Practices: Security Engineer

> Design principles, patterns, and frameworks that guide high-quality security implementation, vulnerability assessment, and secure coding.

## Design Principles

- **Defense in Depth**: Layer multiple independent security controls so that a failure in one layer doesn't result in a breach — no single control is sufficient.
- **Least Privilege**: Every user, service, and process should have exactly the access they need and no more — privilege escalation is the most common attack path.
- **Zero Trust**: Never trust implicit network position; verify every request with authentication and authorization regardless of where it originates.
- **Security by Design**: Security requirements are architectural inputs, not a post-implementation audit — retroactively securing a design is expensive and incomplete.
- **Fail Secure**: When a security control fails, the system should default to denying access, not granting it.
- **Assume Breach**: Design systems assuming the perimeter has already been compromised — minimize blast radius, segment networks, and detect lateral movement.
- **Validate All Input**: Every piece of data crossing a trust boundary is hostile until proven otherwise — validate type, length, format, and range.

## Key Patterns & Frameworks

- **OWASP Top 10**: The canonical list of most critical web application security risks — address all ten in every application security review (Injection, Broken Auth, Sensitive Data Exposure, XXE, Broken Access Control, Security Misconfiguration, XSS, Insecure Deserialization, Vulnerable Components, Insufficient Logging).
- **STRIDE Threat Model**: Systematically analyze threats by category — Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege.
- **DREAD Risk Rating**: Score threats by Damage, Reproducibility, Exploitability, Affected users, Discoverability — enables prioritized remediation.
- **Security Code Review**: Targeted review of authentication, authorization, input handling, cryptography, secrets management, and data exposure in every code review.
- **Input Validation and Output Encoding**: Validate all input at the boundary (whitelist preferred over blacklist); encode all output for the correct context (HTML encode for HTML, SQL parameterize for SQL, JSON encode for JSON).
- **Parameterized Queries**: Prevent SQL injection by separating query structure from data — never concatenate user input into SQL strings.
- **Secrets Management**: Store secrets in a dedicated secrets manager (Vault, AWS Secrets Manager, Azure Key Vault); never hardcode in source code or environment variables in CI.
- **JWT Best Practices**: Verify signature, expiry, issuer, and audience on every request; use short expiry times; never accept `alg: none`; use RS256 or ES256 for asymmetric verification.
- **mTLS for Service-to-Service**: Mutual TLS authenticates both client and server — prevents impersonation within the service mesh.
- **Security Headers**: Enforce CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy on every HTTP response.
- **Cryptographic Standards**: Use AES-256-GCM for symmetric encryption, RSA-4096 or ECDSA P-256 for asymmetric, bcrypt/Argon2 for password hashing — never MD5, SHA1, or DES.

## Domain Concepts & Terminology

### OWASP Top 10 (2021)
- **A01 Broken Access Control**: Missing authorization checks allowing users to access other users' data
- **A02 Cryptographic Failures**: Weak or missing encryption for sensitive data in transit or at rest
- **A03 Injection**: SQL, OS command, LDAP injection via unsanitized user input
- **A04 Insecure Design**: Missing threat modeling, missing security requirements, insecure design patterns
- **A05 Security Misconfiguration**: Default credentials, unnecessary features enabled, verbose error messages
- **A06 Vulnerable Components**: Outdated dependencies with known CVEs
- **A07 Identification and Authentication Failures**: Broken login flows, missing MFA, session fixation
- **A08 Software and Data Integrity Failures**: Unsigned updates, insecure deserialization, CI/CD pipeline attacks
- **A09 Security Logging and Monitoring Failures**: Missing audit logs, no alerting on suspicious patterns
- **A10 SSRF (Server-Side Request Forgery)**: Server making requests to internal resources via user-controlled URLs

### Authentication & Authorization
- **IDOR (Insecure Direct Object Reference)**: Missing authorization check before accessing a resource by ID — always verify the requester owns or has rights to the resource
- **Session Fixation**: Attacker sets the session ID before login, then hijacks the session — regenerate session ID after authentication
- **JWT Algorithm Confusion**: Accepting HS256 when the server uses RS256 — validate the algorithm explicitly
- **Privilege Escalation**: Gaining higher permissions than initially granted — horizontal (other user's data) or vertical (higher role)
- **OAuth 2.0 State Parameter**: CSRF protection in OAuth flows — validate the state parameter on the callback

### Cryptography
- **TLS 1.3**: Current standard; TLS 1.0/1.1 are deprecated and insecure
- **Certificate Pinning**: Hardcoding expected TLS certificate or public key — prevents MITM with legitimate but unexpected certificates
- **bcrypt/Argon2**: Password hashing algorithms with configurable work factor — slow by design to resist brute force
- **Key Derivation Function (KDF)**: Derives a cryptographic key from a password (PBKDF2, Argon2, scrypt)
- **HMAC**: Hash-based Message Authentication Code — verifies integrity and authenticity without encryption

### Penetration Testing
- **Reconnaissance**: Information gathering phase (subdomain enumeration, port scanning, OSINT)
- **Exploitation**: Confirming a vulnerability is exploitable — proof of concept, not damage
- **Privilege Escalation**: Gaining higher access after initial foothold
- **Lateral Movement**: Moving from one compromised system to adjacent systems
- **CVSS Score**: Standardized vulnerability severity score 0-10

## Anti-Patterns to Avoid

- **Security by Obscurity**: Relying on attackers not knowing about a system's vulnerabilities rather than fixing them — always assume attackers know your code.
- **Blacklist-Only Input Validation**: Blocking known bad values without validating that values match the expected format — attackers encode, encode, encode to bypass blacklists.
- **Rolling Your Own Crypto**: Implementing custom cryptographic algorithms — use audited libraries; cryptography is nearly impossible to implement correctly without specialized expertise.
- **Logging Sensitive Data**: Writing passwords, session tokens, PII, or credit card numbers to logs — logs are widely accessible and rarely encrypted.
- **Trusting Client-Side Validation Only**: Relying on JavaScript validation without server-side validation — client-side controls are trivially bypassed.
- **Wildcard CORS Origins**: `Access-Control-Allow-Origin: *` on endpoints that return sensitive data or accept credentials.
- **Insecure Direct Object Reference**: Exposing database IDs in URLs without verifying the requester has rights to that specific record.

## Quality Indicators

- **OWASP Top 10 Addressed**: All ten categories have documented mitigations in the application's security architecture.
- **Zero Critical CVEs in Production**: No known Critical CVSS vulnerabilities in production dependencies or infrastructure.
- **Secrets Scanner Passes in CI**: No secrets detected in source code, configuration files, or CI artifacts.
- **Penetration Test Findings Remediated**: All High/Critical findings from the most recent pen test are resolved.
- **MFA Enabled on All Admin Accounts**: All privileged accounts require multi-factor authentication.
- **Security Headers Score A**: securityheaders.com or equivalent returns an A grade for all public-facing endpoints.
- **Incident Response Plan Tested**: Security incident response plan has been exercised within the past 12 months.

## Collaboration Touchpoints

- **With Backend Developer**: Review authentication, authorization, and input handling code before merge — pair on security-sensitive implementations rather than just auditing after.
- **With Security Lead**: Report all High/Critical findings immediately; security lead makes the decision on compensating controls vs. patch urgency.
- **With DevOps Engineer**: Integrate SAST, DAST, and container scanning into CI pipelines — security checks should be automated, not manual.
- **With DBA**: Review database access controls, field-level encryption for PII, and audit log configuration — data security is a shared responsibility.
