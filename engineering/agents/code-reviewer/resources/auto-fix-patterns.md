# Auto-Fix Pattern Generation

Generate actionable code fixes for identified issues.

## Fix Safety Levels

### SAFE (Auto-Apply)
Low risk, well-tested patterns:
- Remove unused imports
- Fix inconsistent formatting
- Add missing TypeScript types
- Replace deprecated API calls
- Add missing null checks

### MEDIUM (Apply with Validation)
Require testing after application:
- Algorithm optimizations
- Refactoring for performance
- Query optimizations

### RISKY (Require Review)
Significant changes needing human oversight:
- Security vulnerability fixes
- Architectural changes
- Breaking API changes

## Auto-Fix Format

```yaml
findings:
  - severity: critical
    issue: "JWT secret hardcoded in source code"
    file: "src/auth/jwt.ts:12"
    recommendation: "Move JWT secret to environment variable"

    auto_fix:
      type: "code_replacement"
      original_code: |
        const JWT_SECRET = "my-super-secret-key-12345";

      fixed_code: |
        const JWT_SECRET = process.env.JWT_SECRET ||
          throwError('JWT_SECRET not configured');

      additional_steps:
        - "Add JWT_SECRET to .env file"
        - "Add JWT_SECRET to .env.example"
        - "Update deployment docs"

      safe_to_auto_apply: false  # Requires user review
```

## Common Fix Templates

### Hardcoded Secret
```diff
- const SECRET = "hardcoded-value";
+ const SECRET = process.env.SECRET || throwError('SECRET not configured');
```

### SQL Injection
```diff
- const query = `SELECT * FROM users WHERE email = '${email}'`;
+ const query = `SELECT * FROM users WHERE email = ?`;
+ const results = await db.query(query, [email]);
```

### Missing Error Boundary
```diff
  export function Dashboard() {
+   return (
+     <ErrorBoundary fallback={<ErrorFallback />}>
        <DashboardContent />
+     </ErrorBoundary>
+   );
  }
```

### Unused Import
```diff
- import { useState, useEffect, useCallback } from 'react';
+ import { useState, useEffect } from 'react';
```

### Missing Null Check
```diff
- const name = user.name.toUpperCase();
+ const name = user?.name?.toUpperCase() ?? '';
```

## Application Workflow

```javascript
// Categorize by safety
const safeFixes = findings.filter(f =>
  f.auto_fix?.safe_to_auto_apply &&
  f.severity in ['medium', 'low']
);

// Auto-apply safe fixes
for (const fix of safeFixes) {
  applyFix(fix);
  console.log(`✓ Auto-applied: ${fix.issue}`);
}

// Queue risky fixes for review
const riskyFixes = findings.filter(f =>
  f.auto_fix && !f.auto_fix.safe_to_auto_apply
);
```
