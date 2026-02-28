# Database Security Checklist

## Access Control

### Principle of Least Privilege
- [ ] Each application has dedicated service account
- [ ] No shared accounts between applications
- [ ] Read-only users for reporting
- [ ] No application uses admin/root account
- [ ] Regular access review (quarterly)

### Role-Based Access Control (RBAC)
```sql
-- Create roles
CREATE ROLE app_read_only;
CREATE ROLE app_read_write;
CREATE ROLE app_admin;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read_only;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_read_write;
GRANT ALL PRIVILEGES ON DATABASE myapp TO app_admin;

-- Assign to users
GRANT app_read_write TO myapp_service;
GRANT app_read_only TO reporting_service;
```

### Network Security
- [ ] Database not exposed to public internet
- [ ] Firewall rules restrict access to known IPs
- [ ] SSL/TLS required for all connections
- [ ] VPN or private network for admin access

## Data Protection

### Encryption at Rest
- [ ] Database files encrypted (TDE)
- [ ] Backup files encrypted
- [ ] Encryption keys stored securely (HSM or KMS)

### Encryption in Transit
```sql
-- PostgreSQL: Require SSL
ALTER SYSTEM SET ssl = 'on';
-- pg_hba.conf: hostssl all all 0.0.0.0/0 scram-sha-256
```

### Sensitive Data Handling
- [ ] PII identified and documented
- [ ] Column-level encryption for sensitive fields
- [ ] Data masking for non-production environments
- [ ] Tokenization for payment data

```sql
-- Column encryption example (PostgreSQL pgcrypto)
UPDATE users SET ssn = pgp_sym_encrypt(ssn_plain, 'encryption_key');
```

## Authentication

### Password Policy
- [ ] Strong password requirements
- [ ] Password rotation policy (90 days)
- [ ] Failed login attempt lockout
- [ ] No default passwords

### PostgreSQL Authentication
```ini
# pg_hba.conf
# TYPE  DATABASE  USER      ADDRESS        METHOD
hostssl all       all       10.0.0.0/8     scram-sha-256
```

## Audit Logging

### What to Log
- [ ] Login attempts (success and failure)
- [ ] DDL changes (CREATE, ALTER, DROP)
- [ ] Access to sensitive tables
- [ ] Permission changes
- [ ] Data exports

### PostgreSQL Audit
```sql
-- Enable logging
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- Or use pgAudit extension for granular control
CREATE EXTENSION pgaudit;
ALTER SYSTEM SET pgaudit.log = 'write, ddl';
```

### Log Retention
- [ ] Logs stored securely
- [ ] Minimum 90 days retention
- [ ] Logs shipped to SIEM for analysis
- [ ] Tamper-proof log storage

## SQL Injection Prevention

### Parameterized Queries
```python
# GOOD: Parameterized query
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# BAD: String concatenation
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")  # VULNERABLE!
```

### Input Validation
- [ ] Validate all user input
- [ ] Whitelist allowed characters
- [ ] Limit input length
- [ ] Use ORM with parameterization

### Stored Procedures
```sql
-- Use SECURITY DEFINER carefully
CREATE FUNCTION get_user(p_id INT)
RETURNS users
SECURITY DEFINER  -- Runs with function owner's permissions
AS $$
    SELECT * FROM users WHERE id = p_id;
$$ LANGUAGE sql;

-- Prefer SECURITY INVOKER when possible
```

## Compliance Considerations

### GDPR
- [ ] Data inventory documented
- [ ] Right to deletion implemented
- [ ] Data retention policies enforced
- [ ] Consent tracking in place

### HIPAA
- [ ] PHI identified and protected
- [ ] Access logging for PHI
- [ ] Encryption for PHI at rest and in transit
- [ ] BAA with cloud providers

### PCI-DSS
- [ ] Cardholder data minimized
- [ ] Strong encryption (AES-256)
- [ ] Key management procedures
- [ ] Regular security assessments

### SOC 2
- [ ] Access controls documented
- [ ] Change management process
- [ ] Incident response plan
- [ ] Regular access reviews

## Security Monitoring

### Alerts to Configure
| Event | Severity |
|-------|----------|
| Multiple failed logins | Warning |
| Successful admin login | Info |
| DDL statement executed | Info |
| Large data export | Warning |
| New user created | Info |
| Permission escalation | Critical |

### Regular Security Tasks
- [ ] Weekly: Review access logs
- [ ] Monthly: Scan for vulnerabilities
- [ ] Quarterly: Access review and cleanup
- [ ] Annually: Security audit and penetration test
