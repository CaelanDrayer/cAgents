# Review Agent Groups

## Code Review Parallel Execution Groups

### Group 1: Independent Structural Analysis (run in parallel)
- **architecture-reviewer** - Check system design and patterns
- **code-standards-auditor** - Validate style and conventions
- **documentation-reviewer** - Review API docs and comments

### Group 2: Context-Dependent Analysis (run in parallel, after Group 1)
- **performance-analyzer** - Check performance issues
- **security-analyst** - Scan for vulnerabilities (uses architecture context)
- **test-coverage-validator** - Validate test completeness

### Group 3: Specialized Analysis (run in parallel, after Group 2)
- **dependency-auditor** - Check dependency vulnerabilities
- **accessibility-checker** - Validate accessibility (if UI components)
- **qa-compliance-officer** - Check regulatory compliance (if regulated data)

## Parallel Execution Pattern

```javascript
// Group 1 - Independent
const group1 = await Promise.all([
  invokeAgent('architecture-reviewer', { files, framework, patterns }),
  invokeAgent('code-standards-auditor', { files, framework }),
  invokeAgent('documentation-reviewer', { files })
]);

// Stream results immediately
group1.forEach(result => streamFindings(result));

// Group 2 uses context from Group 1
const architectureContext = group1[0];
const group2 = await Promise.all([
  invokeAgent('performance-analyzer', { files, framework, architectureContext }),
  invokeAgent('security-analyst', { files, framework, architectureContext }),
  invokeAgent('test-coverage-validator', { files })
]);

// Group 3 - Specialized
const group3 = await Promise.all([
  invokeAgent('dependency-auditor', { files }),
  shouldCheckUI ? invokeAgent('accessibility-checker', { files, framework }) : null,
  hasRegulatedData ? invokeAgent('qa-compliance-officer', { files }) : null
].filter(Boolean));
```

## Non-Code Review Agent Groups

### Documentation Reviews
- Parallel: documentation-reviewer, scribe, accessibility-checker

### Content Reviews
- Parallel: scribe, stakeholder-rep, ux-designer

### Design Reviews
- Parallel: ux-designer, accessibility-checker, architect, frontend-developer

### Business Process Reviews
- Parallel: coo, compliance, risk-assessment

### Data Reviews
- Parallel: dba, data-analyst, security-analyst

### Infrastructure Reviews
- Parallel: sysadmin, devops, security-analyst, cfo
