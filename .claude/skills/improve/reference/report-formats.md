# Review Report Formats

## Code Review Report

```
Code Review Complete

Review ID:   review_20260105_143022
Type:        Code
Target:      src/
Files:       42
Duration:    ~3 minutes

Summary:
  Critical: 2
  High:     5
  Medium:   12
  Low:      8

Critical Issues Require Immediate Action:
1. [CRITICAL] JWT secret hardcoded in src/auth/jwt.ts:12
2. [CRITICAL] SQL injection in src/api/users.ts:78
...

Full report: Agent_Memory/sessions/review_20260105_143022/reports/final_report.md
```

## Documentation Review Report

```
Documentation Review Complete

Review ID:   review_20260105_143055
Type:        Documentation
Target:      docs/
Documents:   15
Duration:    ~2 minutes

Summary:
  Critical Gaps:     3
  Major Issues:      7
  Minor Issues:      12
  Suggestions:       18

Critical Documentation Gaps:
1. [CRITICAL] API authentication not documented
2. [CRITICAL] Installation prerequisites missing
3. [CRITICAL] Error handling section incomplete
...

Full report: Agent_Memory/sessions/review_20260105_143055/reports/final_report.md
```

## Content Review Report

```
Content Review Complete

Review ID:   review_20260105_144012
Type:        Content
Target:      marketing/blog-post-launch.md
Word Count:  1,847
Duration:    ~1 minute

Summary:
  Tone:              Professional, engaging
  Target Audience:   Developers
  Readability:       Grade 10 (Good)
  SEO Score:         78/100
  Grammar Issues:    3
  Messaging Issues:  2

Recommendations:
1. Add more specific examples in section 3
2. Strengthen call-to-action in conclusion
3. Fix passive voice in paragraphs 5, 8, 12
...

Full report: Agent_Memory/sessions/review_20260105_144012/reports/final_report.md
```

## Design Review Report

```
Design Review Complete

Review ID:   review_20260105_144130
Type:        Design
Target:      designs/checkout-flow.fig
Screens:     8
Duration:    ~2 minutes

Summary:
  UX Issues:            5
  Accessibility Issues: 12
  Brand Consistency:    Good
  Implementation:       Feasible

Critical Issues:
1. [CRITICAL] Button contrast ratio fails WCAG AA (1.8:1, needs 4.5:1)
2. [HIGH] No error states shown for payment form
3. [HIGH] Mobile layout breaks on screens <360px
...

Full report: Agent_Memory/sessions/review_20260105_144130/reports/final_report.md
```

## Business Process Review Report

```
Process Review Complete

Review ID:     review_20260105_144245
Type:          Business Process
Target:        processes/customer-onboarding.md
Steps:         12
Stakeholders:  5 teams
Duration:      ~3 minutes

Summary:
  Efficiency:     Medium (3 bottlenecks identified)
  Risk Level:     High (2 critical risks)
  Compliance:     Partial (missing GDPR consent)
  Clarity:        Good

Critical Issues:
1. [CRITICAL] No data retention policy defined (GDPR violation)
2. [HIGH] Manual approval step creates 2-day delay
3. [HIGH] No rollback procedure if onboarding fails
...

Full report: Agent_Memory/sessions/review_20260105_144245/reports/final_report.md
```

## Enhanced Report Elements

The full markdown report includes:
- Executive summary with confidence-weighted counts
- Framework detected and patterns used
- Parallel execution statistics (time saved, agents run)
- Critical issues (detailed + confidence + auto-fix)
- High priority issues (detailed + confidence + auto-fix)
- Medium/Low issues (summarized)
- Auto-fix summary (applied, pending, rejected)
- Quality gate results
- Pattern effectiveness statistics
- Review coverage matrix
- Performance metrics (time, throughput, efficiency)

## Session Structure

```
Agent_Memory/sessions/review_{slug}_{YYMMDD}_{NNN}/
+-- instruction.yaml
+-- status.yaml
+-- scope_analysis.yaml
+-- execution_strategy.yaml
+-- reports/
    +-- aggregate.yaml
    +-- auto_fixes.yaml
    +-- quality_gates.yaml
    +-- final_report.md
```
