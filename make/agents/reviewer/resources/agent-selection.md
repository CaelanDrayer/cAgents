# Intelligent Agent Selection

Dynamic agent selection based on review context.

## Selection Logic

```yaml
agent_selection:
  architecture-reviewer: true    # Always for code reviews
  performance-analyzer: ${hasPerformanceConcerns}
  code-standards-auditor: true   # Always for code reviews
  documentation-reviewer: ${hasPublicAPI}
  security-analyst: ${hasSecuritySurface}
  qa-compliance-officer: ${hasRegulatedData}
  dependency-auditor: ${hasDependencyChanges}
  accessibility-checker: ${hasUI}
  test-coverage-validator: ${hasTestableLogic}
```

## Context Detection

```javascript
const context = {
  hasPerformanceConcerns: files.some(f =>
    /for|while|map|filter|reduce/.test(content)),

  hasPublicAPI: files.some(f =>
    /export (function|class|const)/.test(content)),

  hasSecuritySurface: files.some(f =>
    /auth|password|token|session|cookie/.test(content)),

  hasRegulatedData: files.some(f =>
    /email|ssn|credit.*card|health|medical/.test(content)),

  hasDependencyChanges: changedFiles.includes('package.json') ||
    changedFiles.includes('requirements.txt'),

  hasUI: files.some(f =>
    /\.tsx?$|\.vue$/.test(f) && /component|render|useState/.test(content)),

  hasTestableLogic: files.some(f =>
    /business.*logic|service|util|helper/.test(f))
};
```

## File Priority Calculation

```javascript
const priority =
  (changeFrequency * 0.3) +    // Git commit count
  (complexity * 0.2) +         // McCabe complexity, LOC
  (isPublicAPI ? 50 : 0) +     // Public API gets high priority
  (hasSecuritySurface ? 100 : 0); // Security critical = highest
```

## Selection Benefits

- **30-50% faster**: Only run relevant agents
- **Higher accuracy**: Agents focused on their specialty
- **Better context**: Related files analyzed together

## Example Selection Report

```
✅ architecture-reviewer (always)
✅ performance-analyzer (detected: loops, large arrays)
✅ security-analyst (detected: auth code, user input)
✅ accessibility-checker (detected: React components)

⊘ documentation-reviewer (skipped: no public API additions)
⊘ qa-compliance-officer (skipped: no regulated data)
```
