# Best Practices: Code Reviewer

> Design principles, patterns, and frameworks that guide high-quality code review and pre-merge quality assurance.

## Design Principles

- **Review as Teaching**: Every comment is an opportunity to share knowledge — explain why a pattern is problematic, not just that it is.
- **Separate Blocking from Non-Blocking**: Distinguish must-fix issues (correctness, security, spec compliance) from suggestions (style, preference) — never hold a PR for non-blocking comments.
- **Author-First Approach**: Assume the author made reasonable choices given their context; ask questions before asserting problems.
- **Diff-Aware Focus**: Review the changed lines and their immediate context, not the entire file — avoid scope creep into pre-existing issues the PR didn't introduce.
- **Objective Criteria**: Ground feedback in established principles (SOLID, OWASP, language idioms) and team standards, not personal style preferences.
- **Fast Turnaround**: Code review is a collaboration bottleneck — prioritize review velocity alongside thoroughness.
- **Consistent Standards**: Apply the same standards to all authors; inconsistent enforcement erodes trust and team culture.

## Key Patterns & Frameworks

- **Two-Stage Review Protocol**: First verify spec compliance (does the code meet the requirements?), then assess code quality (is it well-written?) — never conflate the two.
- **Severity Taxonomy**: Classify findings as CRITICAL (must fix, blocks merge), HIGH (should fix, blocks merge for most cases), LOW (nice to have, doesn't block) — every comment must have a severity.
- **Five-Dimension Quality Check**: Correctness, maintainability, security, performance, and convention compliance — review each dimension separately.
- **SOLID Enforcement**: Check Single Responsibility (does each class/function do one thing?), Open/Closed (is new behavior added without modifying existing code?), Liskov (are subtypes safely substitutable?), Interface Segregation (are interfaces minimal?), Dependency Inversion (do high-level modules depend on abstractions?).
- **Security Hot-Spot Pattern**: Always scrutinize: SQL queries (injection), HTML rendering (XSS), authentication checks (bypass), authorization decisions (privilege escalation), and secrets handling.
- **Test Coverage Review**: Check that new code is accompanied by tests that cover happy path, edge cases, and error conditions.
- **Naming and Readability Pass**: Variable, function, and class names should reveal intent — if you must read the body to understand the name, the name needs improvement.
- **Cyclomatic Complexity Check**: Functions with cyclomatic complexity > 10 are likely to be hard to test and maintain — flag for refactoring.
- **Dead Code Detection**: Identify unreachable code, unused imports, and zombie variables — these add noise and confusion.
- **Pattern Learning**: Track recurring issues across PRs; elevate frequently found issues to team-wide standards or automated lint rules.

## Domain Concepts & Terminology

### Code Quality Metrics
- **Cyclomatic Complexity**: Number of linearly independent paths through a function — lower is more testable
- **Cognitive Complexity**: How hard a function is to understand (nested conditions compound the score more than Cyclomatic)
- **Lines of Code (LOC)**: Functions > 50 lines often signal a refactoring opportunity
- **Code Churn**: Files that change frequently are higher risk — prioritize review effort there
- **Technical Debt Ratio**: Ratio of remediation cost to development cost; high ratio signals systematic quality issues

### SOLID Violations to Catch
- **Single Responsibility Violation**: A class/function that handles both data fetching and business logic
- **Open/Closed Violation**: Adding a new type by modifying a switch statement rather than extending via polymorphism
- **Liskov Substitution Violation**: A subclass that throws exceptions the parent doesn't, or ignores parent contract
- **Interface Segregation Violation**: A large interface where clients only use a subset of methods
- **Dependency Inversion Violation**: Business logic directly instantiating infrastructure classes (database, HTTP client)

### Security Review Focus Areas
- **SQL Injection**: Unsanitized user input in SQL queries — look for string concatenation in queries
- **XSS (Cross-Site Scripting)**: Unsanitized user input rendered as HTML — look for `innerHTML`, `dangerouslySetInnerHTML`
- **CSRF (Cross-Site Request Forgery)**: State-changing endpoints without CSRF token validation
- **IDOR (Insecure Direct Object Reference)**: Authorization checks missing before accessing resources by ID
- **Hardcoded Secrets**: API keys, passwords, or tokens in source code
- **Path Traversal**: User-controlled file paths without sanitization

### Review Comment Types
- **Nitpick (nit:)**: Style preference — non-blocking, take it or leave it
- **Question (?:)**: Seeking understanding before raising an issue
- **Suggestion (sug:)**: Better approach, non-blocking
- **Issue (issue:)**: Bug or correctness problem — blocking
- **Security (sec:)**: Security concern — always blocking

## Anti-Patterns to Avoid

- **Bikeshedding**: Spending disproportionate review time on trivial stylistic issues while ignoring substantive correctness problems.
- **Drive-By Approvals**: Approving without reading the code — "LGTM" without evidence of review undermines the entire review gate.
- **Scope Creep**: Blocking a PR on pre-existing issues that the PR didn't introduce — create follow-up tickets for those.
- **Vague Feedback**: "This could be better" without explaining what better looks like — every comment must be actionable.
- **Style-Only Enforcement**: Only flagging formatting issues while missing logic bugs — prioritize correctness over style.
- **Review Hoarding**: Holding all comments until the full review is written, then releasing them at once — post comments progressively so the author can start thinking about fixes.
- **Approval Gate Inconsistency**: Letting urgent PRs bypass review standards — consistently applied standards build trust and prevent regression.

## Quality Indicators

- **Zero Unclassified Comments**: Every review comment has an explicit severity (CRITICAL/HIGH/LOW or nit:/issue:/sec:).
- **Review Turnaround ≤ 24 Hours**: First review response within the agreed SLA — measured via PR analytics.
- **CRITICAL Findings Are Zero at Merge**: No CRITICAL-severity findings are left unresolved when a PR merges.
- **Security Findings Are Tracked**: Every security finding, even if resolved in the PR, is logged for pattern analysis.
- **Test Accompanies Every Logic Change**: Any PR that adds or changes business logic includes corresponding new or updated tests.
- **Recurring Issues Become Lint Rules**: Issues found in ≥3 separate PRs are escalated to automated enforcement rather than manual review.
- **Author Satisfaction**: Authors feel reviewed code is better, not just slower — measured by team retrospective sentiment.

## Collaboration Touchpoints

- **With Backend Developer / Frontend Developer**: Frame feedback as improvement, not criticism; offer to pair on complex refactors rather than just flagging them.
- **With Architecture Reviewer**: Escalate structural violations (wrong layer dependencies, service boundary violations) to architecture review rather than resolving in a code review comment.
- **With Security Engineer**: Escalate any security finding rated HIGH or above to a security engineer for deeper analysis before merging.
- **With QA Lead**: Coordinate on what test coverage constitutes "sufficient" so review comments on test gaps are consistent with QA standards.
