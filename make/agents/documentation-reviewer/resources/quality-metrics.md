# Documentation Quality Metrics

Quantitative and qualitative measurement of documentation quality.

## Completeness Score

### Calculation Method
- README sections: X/8 present (%)
- API functions documented: X/Y (%)
- Architecture docs: Present/Missing
- User guide: Present/Missing

### Example Metrics
```yaml
completeness:
  readme_sections: "6/8 present (75%)"
  api_documented: "42/50 (84%)"
  architecture_docs: "Present"
  user_guide: "Missing"
```

## Accuracy Check

### Verification Points
- Code matches documentation: %
- Examples run successfully: %
- Links are valid: %
- Version numbers current: %

### Example Metrics
```yaml
accuracy:
  code_matches_docs: "90%"
  examples_work: "95%"
  links_valid: "100%"
  versions_current: "85%"
```

## Output Format

```yaml
review_id: doc_001
agent: documentation-reviewer
severity: medium
blocking: false

findings:
  - issue: "README missing installation instructions"
    file: "README.md"
    section: installation
    status: missing
    recommendation: "Add installation section with npm/yarn commands"
    severity: high

  - issue: "Public API function lacks documentation"
    file: "src/api/users.js:34"
    function: "updateUser"
    missing:
      - "Parameter descriptions"
      - "Return value documentation"
      - "Error handling documentation"
    recommendation: "Add JSDoc with @param, @returns, @throws"
    severity: high

  - issue: "Outdated documentation contradicts implementation"
    file: "docs/api.md:45"
    documented: "Function takes 2 parameters"
    actual: "Function now takes 3 parameters (added in v2.0)"
    recommendation: "Update documentation to match current signature"
    severity: high

  - issue: "No architecture documentation found"
    expected_file: "docs/architecture.md"
    status: missing
    recommendation: "Create architecture.md explaining system design"
    severity: medium

  - issue: "Complex algorithm lacks explanatory comments"
    file: "src/utils/optimizer.js:67"
    complexity: high
    comments: none
    recommendation: "Add comments explaining the algorithm"
    severity: medium

  - issue: "Error message not user-friendly"
    file: "src/validators/input.js:23"
    current: "Error: Invalid"
    recommendation: "Provide specific error with expected format"
    severity: low
```

## Quality Thresholds

### Passing
- README sections: >= 75%
- API documented: >= 80%
- Examples working: >= 90%
- No critical accuracy issues

### Needs Improvement
- README sections: 50-75%
- API documented: 60-80%
- Examples working: 75-90%
- Minor accuracy issues

### Failing
- README sections: < 50%
- API documented: < 60%
- Examples working: < 75%
- Major accuracy issues
