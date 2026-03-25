# Best Practices: QA Lead

> Design principles, patterns, and frameworks that guide high-quality test strategy, quality gate enforcement, and QA workflow coordination.

## Design Principles

- **Test Strategy, Not Just Test Cases**: Define what categories of testing are needed for each type of change — strategy drives coverage; test cases are the output.
- **Shift Left, Not Shift Late**: Quality verification happens throughout development (TDD, code review, PR checks) not only at the end of a sprint.
- **Risk-Based Prioritization**: Test coverage should be proportional to business risk — critical user journeys and high-change-rate code get the most attention.
- **Tests as Documentation**: Well-written tests describe expected behavior in executable form — they are more reliable than prose documentation.
- **Prevention Over Detection**: Every bug found in production had a prevention opportunity upstream — retrospect on what type of test would have caught it.
- **Automation for Regression, Humans for Exploration**: Automate stable, repeatable test cases; use human judgment for exploratory testing, UX quality, and edge case discovery.
- **Quality Belongs to the Team**: QA doesn't own quality — the whole engineering team does; QA's role is to enable, measure, and coordinate quality activities.

## Key Patterns & Frameworks

- **Testing Pyramid**: Unit tests (many, fast, cheap) → Integration tests (fewer, medium speed) → E2E tests (few, slow, expensive) — optimize the distribution to maximize coverage per dollar.
- **Test-Driven Development (TDD)**: Write a failing test → write the minimum code to pass → refactor; enforces testability and produces regression coverage simultaneously.
- **Behavior-Driven Development (BDD)**: Express test scenarios in Given-When-Then syntax (Gherkin) — bridges the gap between business requirements and automated tests.
- **Property-Based Testing**: Generate random inputs that satisfy constraints rather than hand-crafted examples — discovers edge cases humans miss (Hypothesis, QuickCheck, fast-check).
- **Contract Testing (Consumer-Driven)**: Verify that API providers meet the contracts their consumers depend on (Pact) — catches integration failures before they reach production.
- **Mutation Testing**: Introduce deliberate code mutations and verify that tests catch them — measures the effectiveness of the test suite, not just its coverage.
- **Test Data Management Strategy**: Define how test data is created (fixtures, factories, seed scripts), isolated between tests, and cleaned up — prevents test pollution and flakiness.
- **Test Environment Matrix**: Define which environments (local, CI, staging) run which test categories — ensures each environment's tests serve a clear purpose.
- **Regression Suite Triage**: Regularly review the regression suite to remove obsolete tests, fix flaky tests, and identify coverage gaps — a maintained suite is a trusted suite.
- **Quality Gate Definition**: For each pipeline stage, define explicit pass/fail criteria (coverage %, zero high severity findings, all smoke tests passing) before a stage proceeds.
- **Exploratory Testing Charters**: Time-boxed exploratory sessions with defined areas and missions — structured enough to be productive, free enough to discover unexpected behaviors.

## Domain Concepts & Terminology

### Testing Levels
- **Unit Test**: Tests a single unit (function, class) in isolation — fast, deterministic, no I/O
- **Integration Test**: Tests interaction between real components (service + database, module + module)
- **Component Test**: Tests a service in isolation with external dependencies mocked at the boundary
- **Contract Test**: Verifies API producer/consumer agreements — catches interface mismatches
- **E2E (End-to-End) Test**: Tests a complete user flow through the full system — realistic but slow and fragile
- **Smoke Test**: Minimal tests confirming the deployed system is alive and basic functionality works

### Test Quality
- **Coverage**: Percentage of code lines, branches, functions, or statements executed by tests — not a proxy for quality alone
- **Cyclomatic Complexity**: High-complexity functions are harder to test; flag them for additional test cases
- **Test Flakiness**: Tests that pass and fail non-deterministically — corrode trust in the test suite; fix or quarantine immediately
- **Mutation Score**: Percentage of deliberate code mutations that are caught by the test suite — measures test effectiveness
- **Test Smell**: Patterns indicating poor test quality: Long Test, Mystery Guest, Conditional Test Logic, Assertion Roulette

### Defect Management
- **Defect Density**: Number of defects per unit of code (1,000 lines, function point) — higher density indicates quality risk
- **Escaped Defect**: A defect that reaches production after passing through the QA process — most important metric for test effectiveness
- **Severity**: Impact of the defect (Critical/High/Medium/Low) — defines urgency of fix
- **Priority**: Business urgency of fixing the defect — may differ from severity
- **Root Cause Category**: Classification of what caused the defect (missing test, design error, ambiguous requirement, environment issue)

### Quality Metrics
- **Defect Escape Rate**: Percentage of defects found in production vs. total defects — lower is better
- **Test Pass Rate**: Percentage of tests passing in the current build — 100% required for merge
- **False Positive Rate**: Tests that fail without a real defect — creates alarm fatigue; target zero
- **Mean Time to Detect**: How quickly a defect is found after introduction
- **Test Execution Time**: Total time for full test suite; must stay within CI time budget

## Anti-Patterns to Avoid

- **Coverage Theater**: Achieving high line coverage with tests that don't assert meaningful behavior — coverage without assertions is false confidence.
- **E2E Test Overreliance**: Building a test suite primarily of E2E tests — slow, brittle, and expensive to maintain; move coverage down the pyramid.
- **Flaky Test Tolerance**: Allowing intermittently failing tests to remain in the suite — they train engineers to ignore failures and miss real regressions.
- **Testing the Framework**: Writing tests that verify the behavior of the ORM, HTTP library, or framework rather than business logic — these tests don't add value.
- **Missing Negative Testing**: Testing only happy paths without validating error handling, invalid inputs, and boundary conditions.
- **Test Data Pollution**: Tests that modify shared databases without cleanup — causes test order dependencies and non-deterministic failures.
- **Late QA Involvement**: Waiting for a feature to be "code complete" before involving QA — misses requirements ambiguity, untestable designs, and testability issues.

## Quality Indicators

- **Defect Escape Rate < 5%**: Less than 5% of found defects discovered in production rather than before release.
- **Test Suite Flakiness < 1%**: Fewer than 1% of test suite runs have flaky test failures — measured over 30 days.
- **Coverage Meets Thresholds**: Business logic has ≥ 80% branch coverage; new code adds tests in the same PR.
- **Quality Gates Enforced in CI**: All pipeline quality gates run automatically and block merge on failure — no manual bypass.
- **Regression Run Time Within Budget**: Full regression suite completes within the agreed CI time budget (e.g., < 15 minutes).
- **Zero Critical Defects in Release**: No Critical severity defects are known but unresolved at release time.
- **Exploratory Testing Completed**: At least one exploratory testing session per major feature before release.

## Collaboration Touchpoints

- **With Backend Developer**: Define what constitutes testable code (dependency injection, interface-based design) early — testability is a design quality, not a post-hoc concern.
- **With Engineering Manager**: Report on quality metrics, release readiness, and defect trends — frame quality as delivery risk management, not gate-keeping.
- **With DevOps Engineer**: Coordinate on CI pipeline design — which test categories run at which stage, and what constitutes a blocking failure.
- **With Architect**: Review new architectures for testability — component boundaries, dependency injection points, and interface isolation directly affect test coverage achievability.
