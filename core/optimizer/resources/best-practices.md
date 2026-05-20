# Best Practices: Optimizer

> Design principles, patterns, and frameworks that guide high-quality performance tuning, token reduction, and execution path optimization work.

## Design Principles

- **Measure Before and After**: Every optimization begins with a baseline metric and ends with a re-measured result — without deltas, improvement is unverifiable
- **Atomic Rollback**: Every optimization is applied as a git-snapshotted atomic unit — if validation fails, rollback is one command, not a manual unwind
- **Risk-Proportional Approval**: Low-risk changes auto-apply; medium-risk require comprehensive validation; high-risk escalate to human review before proceeding
- **Coordinate, Don't Implement**: The optimizer orchestrates specialists — it never writes code, content, or configs directly; it delegates to the correct domain agent
- **Parallel Grouping**: Independent optimizations execute in parallel batches to maximize throughput while keeping rollback granularity clean
- **Never Break Functionality**: Quality gates verify existing tests still pass after every optimization — performance gains that break correctness are rejected
- **Auto-Proceed Between Phases**: Optimizer transitions between Detection, Analysis, Planning, Execution, and Validation phases automatically — no permission requests

## Key Patterns & Frameworks

- **5-Phase Optimization Loop**: Detection → Analysis → Planning → Execution → Validation — each phase produces a named artifact (detection_report.yaml, opportunities.yaml, plan.yaml, execution_summary.yaml, validation_report.yaml)
- **ROI-Based Prioritization**: Opportunities are ranked by return on investment: (expected_gain / estimated_effort) × risk_factor — highest ROI items execute first
- **Risk Classification Matrix**: Assigns a 0-100 risk score to each opportunity; SAFE (0-20) auto-applies, LOW (21-40) applies with standard validation, MEDIUM (41-60) with comprehensive validation, HIGH (61-80) requires user input, CRITICAL (81-100) handed to /run
- **Git Snapshot Pattern**: Before applying any optimization, create a named git commit — rollback becomes `git reset HEAD~1` with zero data loss
- **Parallel Execution Grouping**: Optimizations with no shared file dependencies are grouped into parallel batches — reduces total wall-clock time by 40-60%
- **Cross-File Analysis**: Detects optimization opportunities that span multiple files (e.g., duplicate logic, shared inefficiencies, redundant imports) — single-file tools miss these
- **Framework-Specific Patterns**: Each tech stack has known anti-patterns (N+1 queries in ORMs, layout thrashing in React, GIL contention in Python) — pattern catalog drives detection
- **Opportunity Scanning**: Automated scan of the target scope using configurable patterns from scan_patterns.yaml — produces a ranked list of candidates before any human decisions
- **Validation Gate**: After execution, re-measure all baseline metrics and run the full test suite — any regression triggers immediate rollback regardless of other gains

## Domain Concepts & Terminology

### Optimization Types
- **Code Optimization**: Performance, readability, or complexity improvements to source code — delegates to backend-developer, frontend-developer, or architect
- **Content Optimization**: Clarity, length, or SEO improvements to written content — delegates to copywriter or seo-specialist
- **Process Optimization**: Workflow efficiency improvements — delegates to operations-manager
- **Infrastructure Optimization**: Deployment, scaling, or resource efficiency — delegates to infrastructure-lead
- **Data Optimization**: Query performance, schema efficiency, or indexing — delegates to dba or backend-developer
- **Campaign Optimization**: Marketing performance improvements — delegates to marketing-strategist
- **Creative Optimization**: Narrative pacing, structural improvements — delegates to creative-director
- **Sales Optimization**: Pipeline or conversion rate improvements — delegates to revenue-operations-manager

### Measurement Concepts
- **Baseline Metrics**: The pre-optimization measurements against which gains are compared — must be captured before any changes
- **Delta**: The difference between baseline and post-optimization measurement — the primary success indicator
- **Regression**: Any metric that worsens after optimization — triggers rollback
- **Quality Gate**: A defined threshold that must be met for an optimization to be accepted (e.g., test pass rate >= 100%, latency reduction >= 20%)

### Risk Concepts
- **Blast Radius**: How much code, data, or behavior is affected by an optimization — larger blast radius requires higher-level approval
- **Reversibility**: Whether an optimization can be cleanly undone — irreversible changes require higher risk thresholds
- **Rollback Trigger**: The condition under which the git snapshot is restored — typically a failing quality gate

## Anti-Patterns to Avoid

- **Optimizing Without Baseline**: Making changes without first measuring current performance — there is no way to prove improvement or detect regression
- **CRITICAL-Risk Auto-Apply**: Applying high-risk optimizations without human approval — risk score exists precisely to gate dangerous changes
- **Skipping the Snapshot**: Applying changes without a git commit first — rollback becomes expensive or impossible
- **Implementing Directly**: The optimizer writing code or content itself instead of delegating to domain specialists — loses specialist expertise and breaks delegation architecture
- **Grouping Conflicting Files**: Including two optimizations that touch the same file in the same parallel batch — causes merge conflicts and corrupts rollback granularity
- **Ignoring Test Results**: Accepting an optimization despite test failures — performance gains never justify correctness regressions
- **Phase-Skipping**: Jumping from Detection directly to Execution without Analysis or Planning — produces unranked, unapproved changes with no ROI justification

## Quality Indicators

- **Baseline Coverage**: Percentage of optimizations that have a measured baseline before execution — target 100%
- **Rollback Rate**: Frequency of post-execution rollbacks — high rate signals over-aggressive risk classification or poor opportunity selection
- **Parallel Utilization**: Percentage of optimizations executed in parallel vs. sequentially — target >60% for large optimization sets
- **Quality Gate Pass Rate**: Percentage of optimizations that pass validation on first attempt — target >80%
- **ROI Accuracy**: Correlation between predicted and actual gain for each optimization — improves over time with pattern learning
- **Risk Classification Accuracy**: Frequency of SAFE/LOW classifications that required rollback — should approach 0%

## Collaboration Touchpoints

- **With domain controllers (tech-lead, infrastructure-lead, etc.)**: Delegates execution of each optimization to the appropriate controller who spawns specialists — optimizer plans and coordinates, controller implements
- **With universal-validator**: After execution phase, validator re-runs quality gates and produces PASS/FAIL/REVISE; optimizer handles rollback on FAIL
- **With universal-self-correct**: When an optimization execution fails (tool error, test regression), self-correct is invoked to attempt recovery before rollback is triggered
- **With hitl**: High-risk (61-80) and critical (81-100) optimizations escalate to HITL for human approval before execution begins
