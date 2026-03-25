# Best Practices: Test Coverage Validator

> Design principles, patterns, and frameworks that guide high-quality test coverage analysis, gap identification, and coverage quality assessment.

## Design Principles

- **Coverage is Evidence, Not Proof**: High line coverage doesn't mean the code is correct — coverage tells you what was executed, not whether the assertions are meaningful.
- **Branch Coverage Over Line Coverage**: A line with an `if` statement has two branches; line coverage counts it as 1; branch coverage requires both paths — prefer branch coverage as the primary metric.
- **Critical Path Coverage First**: Focus coverage analysis on the highest-risk code — authentication, payment processing, and data mutation paths need higher coverage than utility formatting functions.
- **Untested Code is Unknown Code**: Code without tests hasn't been verified against its specification; treat untested code as a risk, not a complete feature.
- **Coverage Gaps Are Hypotheses**: A gap in coverage is a hypothesis about what might fail — each gap should be investigated to determine whether a test is genuinely needed.
- **Mutation Score Over Coverage Percentage**: A test suite that achieves 90% mutation score is more valuable than one with 90% line coverage — mutations reveal whether tests actually verify behavior.
- **Thresholds Gate Regressions, Not Quality**: Coverage thresholds in CI prevent regressions; they don't establish quality — teams must also assess test relevance and assertion quality.

## Key Patterns & Frameworks

- **Coverage Pyramid Analysis**: Evaluate how coverage is distributed across unit, integration, and E2E tests — heavy E2E coverage with light unit coverage is an inverted pyramid that's slow and brittle.
- **Differential Coverage Analysis**: Focus coverage reporting on changed files rather than overall project — a PR that reduces coverage in modified files is a regression; overall project coverage is a lagging indicator.
- **Critical Path Mapping**: Identify the code paths that handle the most important business flows; verify these paths have specific, named test scenarios, not just incidental coverage from other tests.
- **Branch Coverage Analysis**: For every conditional (`if`, `switch`, `||`, `&&`), verify that both true and false paths are covered — branch coverage catches missing error handling and edge cases.
- **Exception Path Coverage**: Verify that error handling paths, catch blocks, and error return codes are covered — these are often the paths that fail in production.
- **Mutation Testing Integration**: Run mutation testing (Stryker, PItest, Mutmut) on high-risk modules to verify that tests actually detect changes to behavior.
- **Dead Code Detection**: Identify code with zero coverage that is never executed — may indicate dead code that should be removed or paths that need tests.
- **Coverage Trend Analysis**: Track coverage percentage over time; a downward trend signals that new code is being added without tests — catch regressions early.
- **Boundary Value Analysis**: Verify that tests cover boundary conditions (empty collections, zero, max int, null, empty string) — these are common failure points.
- **Coverage by Complexity**: Prioritize coverage analysis on high-complexity functions (cyclomatic complexity > 5) — these have the most paths and the highest bug probability.

## Domain Concepts & Terminology

### Coverage Types
- **Line Coverage (Statement Coverage)**: Percentage of executable lines executed by tests — the weakest coverage metric
- **Branch Coverage (Decision Coverage)**: Percentage of branches (if/else paths) executed by tests — stronger than line coverage
- **Path Coverage**: Percentage of all possible execution paths covered — impractical for complex functions; exponential explosion
- **Function Coverage**: Percentage of functions/methods called by tests — useful as a coarse filter
- **Condition Coverage**: Each boolean sub-expression evaluated to both true and false — more granular than branch coverage
- **MC/DC (Modified Condition/Decision Coverage)**: Aerospace standard — each condition independently affects the decision outcome

### Coverage Tools
- **Istanbul/c8 (JavaScript)**: Line/branch/function coverage for JavaScript/TypeScript — integrates with Jest, Mocha, Vitest
- **Coverage.py (Python)**: Standard Python coverage tool; branch coverage supported with `--branch` flag
- **JaCoCo (Java)**: Bytecode instrumentation coverage for JVM; integrates with Maven, Gradle, and CI systems
- **Covertura / cobertura**: XML-based coverage report format supported by many CI systems
- **LCOV**: Line-by-line coverage data format — used by gcov (C/C++) and commonly displayed in HTML reports

### Mutation Testing
- **Mutant**: A copy of the code with a single deliberate change (negate a condition, change a constant, remove a statement)
- **Killed Mutant**: A mutant that causes at least one test to fail — indicates the test suite catches this type of change
- **Survived Mutant**: A mutant where all tests still pass — indicates a coverage gap where the change wasn't verified
- **Mutation Score**: Killed mutants / Total mutants — measures how effectively the test suite detects behavioral changes
- **Equivalent Mutant**: A mutant that doesn't change program behavior despite modifying code — false positive in mutation score

### Coverage Metrics
- **Coverage Threshold**: Minimum acceptable coverage percentage enforced in CI — below this blocks merge
- **Coverage Delta**: Change in coverage between two builds — negative delta in changed files is a warning sign
- **Uncovered Lines**: Specific lines not executed by any test — reported for targeted test writing
- **Hotspot Files**: Files with low coverage and high change frequency — highest priority for coverage improvement
- **Test-to-Code Ratio**: Lines of test code per line of production code — low ratios indicate under-testing

## Anti-Patterns to Avoid

- **Coverage Theater**: Adding tests that execute code without asserting anything meaningful — achieves coverage numbers without adding protection.
- **Testing Implementation, Not Behavior**: Writing tests that verify internal implementation details rather than observable behavior — these tests break on refactoring even when behavior is unchanged.
- **Threshold as Target**: Setting a coverage threshold (e.g., 80%) and treating it as the goal — coverage threshold prevents regression; quality tests prevent bugs.
- **Ignoring Branch Coverage**: Reporting only line coverage while missing uncovered branches — many bugs live in the else path that was never tested.
- **Excluding Too Much**: Adding coverage exclusions liberally (`istanbul ignore`, `#pragma: no cover`) to hit threshold — exclusions should be rare and justified.
- **Global Coverage Only**: Measuring overall project coverage while ignoring that a high-risk new module has 0% coverage — project-level metrics hide critical gaps.
- **Coverage Without Mutation Score**: High coverage with low mutation score — the tests execute the code but don't verify its behavior.

## Quality Indicators

- **Branch Coverage ≥ 80% for Business Logic**: Core domain and service layer have branch coverage at or above the team's threshold.
- **No Zero-Coverage High-Risk Files**: Authentication, payment, and data mutation modules have non-zero coverage — ideally with named test scenarios.
- **Coverage Delta Neutral or Positive**: PRs do not reduce coverage in the files they modify — enforced by CI differential coverage gate.
- **Mutation Score > 70% on Critical Modules**: High-risk modules pass mutation testing at a meaningful threshold.
- **Exception Paths Covered**: All `catch` blocks and error return paths have at least one test scenario.
- **Boundary Conditions Tested**: Tests explicitly cover empty, null, zero, negative, and maximum value inputs for all critical functions.
- **Coverage Report Generated per PR**: Differential coverage report is available in PR comments without manual intervention.

## Collaboration Touchpoints

- **With QA Lead**: Coverage analysis informs QA's risk assessment — modules with low coverage should receive additional exploratory testing attention.
- **With Backend Developer / Frontend Developer**: Provide specific file-level coverage reports alongside coverage gap analysis — make it actionable by pointing to exact uncovered lines.
- **With Code Reviewer**: Coverage validation is a code review concern — PRs that add logic without tests should be flagged during review, not only in CI.
- **With Tech Lead**: Report coverage trends and threshold compliance in sprint reviews — declining coverage in high-risk modules is a delivery risk that needs visibility.
