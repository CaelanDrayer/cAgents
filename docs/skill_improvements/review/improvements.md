# /review Improvement Recommendations

## Priority 1: High Impact, Moderate Effort

### 1.1 Review Memory and Finding Suppression

**Current**: Every review starts fresh; repeat findings shown every time.
**Proposed**: Maintain a review baseline file that tracks acknowledged findings.

```yaml
# Agent_Memory/_system/commands/review/baseline.yaml
baselines:
  "src/auth/jwt.ts":
    - finding_id: F-001
      description: "JWT expiry not configurable"
      status: acknowledged  # acknowledged | suppressed | deferred
      acknowledged_at: "2026-02-20"
      review_session: review_20260220_143022
```

**Flags**:
```bash
/review --baseline          # Compare against saved baseline, show only new findings
/review --reset-baseline    # Clear baseline, review everything fresh
/review --suppress F-001    # Mark finding as suppressed (won't appear in future reviews)
```

**Impact**: Eliminates finding fatigue. Users focus on new issues only.

### 1.2 Adaptive Agent Selection

**Current**: Fixed 3-group structure with all agents.
**Proposed**: Dynamically select agents based on target analysis.

```
Target: src/api/ (Python, FastAPI, no frontend)
  -> Skip: accessibility-checker, frontend-focused code-standards
  -> Add: async-pattern analyzer (FastAPI-specific)
  -> Group 1: architecture-reviewer, code-standards-auditor (Python-specific)
  -> Group 2: performance-analyzer (async), security-analyst (API)
  -> Group 3: dependency-auditor, test-coverage-validator
```

**Implementation**:
- During Phase 1 (Initialize), analyze file types and frameworks
- Build agent roster dynamically from available agents
- Skip irrelevant agents (e.g., no UI = no accessibility-checker)
- Add framework-specific specialist agents when detected

### 1.3 Review Profiles

**Current**: Flags must be specified every time.
**Proposed**: Named review profiles saved in config.

```yaml
# .claude/review-profiles.yaml (or Agent_Memory config)
profiles:
  pre-merge:
    scope: changed
    quality_gate: strict
    auto_fix: safe
    apply_safe_fixes: true
    run_tests: true
    rollback_on_failure: true
  security-audit:
    focus: security
    confidence: 0.6
    quality_gate: strict
    output: detailed
    save_report: ./security-audit.md
  quick:
    scope: changed
    parallel: true
    confidence: 0.7
    output: summary
```

**Usage**:
```bash
/review --profile pre-merge
/review --profile security-audit
```

### 1.4 Quality Trend Tracking

**Current**: No historical comparison.
**Proposed**: Track findings over time in review history.

```yaml
# Agent_Memory/_system/commands/review/history.yaml
reviews:
  - session: review_20260215_143022
    date: "2026-02-15"
    target: src/
    findings: {critical: 5, high: 12, medium: 20, low: 8}
    score: 72
  - session: review_20260220_143022
    date: "2026-02-20"
    target: src/
    findings: {critical: 3, high: 8, medium: 18, low: 6}
    score: 81
```

**Output**: Include trend section in reports:
```
Quality Trend (last 5 reviews):
  Critical: 5 -> 3 (40% reduction)
  Overall Score: 72 -> 81 (12.5% improvement)
  Trend: Improving
```

## Priority 2: Medium Impact, Lower Effort

### 2.1 PR Integration

**Current**: No direct PR workflow.
**Proposed**: Add `--pr <number>` flag for GitHub PR reviews.

```bash
/review --pr 123                    # Review PR #123
/review --pr 123 --post-comments    # Post findings as PR review comments
```

**Implementation**:
- Use `gh pr diff 123` to get changed files
- Run review on changed files with PR context
- Optionally post findings as inline PR comments via `gh api`
- Include PR description context for richer analysis

### 2.2 Custom Rule Engine

**Current**: Built-in framework patterns only.
**Proposed**: User-defined review rules in project config.

```yaml
# .claude/review-rules.yaml
rules:
  - id: custom-001
    name: "API endpoints must have rate limiting"
    pattern: "@(Get|Post|Put|Delete)\\("
    check: "Must have @RateLimit decorator"
    severity: high
    paths: ["src/api/**/*.ts"]

  - id: custom-002
    name: "No console.log in production code"
    pattern: "console\\.log\\("
    check: "Replace with structured logger"
    severity: medium
    exclude: ["**/*.test.*", "**/*.spec.*"]
```

### 2.3 Interactive Post-Review Triage

**Current**: Review generates report, user reads it.
**Proposed**: After report, offer interactive triage mode.

```
Review complete: 3 critical, 7 high, 12 medium findings.

Would you like to:
1. [Triage findings] - Walk through each finding, mark as fix/suppress/defer
2. [Auto-fix safe]   - Apply safe fixes automatically
3. [Fix via /run]    - Send critical findings to /run for fixing
4. [Save report]     - Save report and exit
```

### 2.4 Multi-File Auto-Fix

**Current**: Auto-fixes are single-file only.
**Proposed**: Support coordinated multi-file fixes.

For findings that span multiple files (e.g., "inconsistent error handling across 5 API routes"), generate coordinated fix plans:
- Identify all affected files
- Generate consistent fix across all files
- Apply atomically (all or none)
- Test the full fix set together

## Priority 3: Nice-to-Have Enhancements

### 3.1 Review Comparison

Compare two review sessions to show progress:
```bash
/review --compare review_20260215 review_20260220
```

### 3.2 Non-Code Review Enrichment

Add more specialized agents for non-code review types:
- Documentation: technical-accuracy-checker, link-validator, terminology-consistency
- Infrastructure: cost-estimator, compliance-mapper, disaster-recovery-checker
- Data: schema-evolution-analyzer, PII-detector, data-lineage-tracker

### 3.3 Real-Time Review Streaming

Show findings as they are discovered (within each parallel group), not just after each group completes. Use progressive rendering for large reviews.

### 3.4 Security Severity Database

Maintain a database of known vulnerability patterns with CVE references, CVSS scores, and remediation guidance. Auto-link findings to relevant CVEs.
