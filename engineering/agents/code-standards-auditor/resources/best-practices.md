# Best Practices: Code Standards Auditor

> Design principles, patterns, and frameworks that guide high-quality coding standards enforcement and compliance auditing.

## Design Principles

- **Standards Serve the Team**: Coding standards exist to reduce cognitive load, enable safe refactoring, and make code reviews faster — never enforce a standard that doesn't serve these goals.
- **Automated Enforcement Beats Manual Review**: Every standard that can be expressed as a lint rule should be — reserve human audits for standards that require semantic understanding.
- **Consistency Over Perfection**: An enforced imperfect standard is better than an unenforced perfect one — choose standards the team will actually follow.
- **Explain the Why**: Every standard entry in the style guide should state why it exists; rules without rationale get ignored or circumvented.
- **Compliance Debt is Technical Debt**: Drifting from standards is a form of technical debt that compounds — track violations and schedule remediation.
- **Exceptions Require Justification**: Allow suppression annotations (e.g., `// eslint-disable`) only with inline justification; blanket disables are audit violations.
- **Language Idioms First**: Prefer established language idioms and community-standard tooling over invented conventions.

## Key Patterns & Frameworks

- **Linting Pipeline Integration**: Integrate linters (ESLint, Pylint, RuboCop, golangci-lint, Checkstyle) into CI so standards failures block merge — not just developer machines.
- **Style Guide as Code**: Store the style guide in the repository alongside linter configuration; the config IS the enforceable standard.
- **Automated Formatting**: Use opinionated formatters (Prettier, Black, gofmt, rustfmt) to eliminate formatting debates entirely — let machines handle style, let humans handle substance.
- **Complexity Thresholds**: Set cyclomatic complexity and cognitive complexity limits in linter config; flag functions exceeding thresholds for refactoring.
- **Dead Code Detection**: Run dead code scanners (knip, ts-prune, vulture) to identify unused exports, variables, and imports.
- **Naming Convention Audit**: Verify that module, class, function, and variable naming follows team conventions (camelCase, PascalCase, snake_case as appropriate per context).
- **Import Order Enforcement**: Define and enforce import grouping (stdlib → third-party → internal) and ordering within groups.
- **Comment Quality Standards**: Flag TODO/FIXME comments without associated ticket references; enforce JSDoc/docstring presence on public APIs.
- **Coverage Threshold Enforcement**: Report and gate on minimum test coverage percentages per module as a standards compliance metric.
- **Baseline Suppression Tracking**: Track `eslint-disable`, `# noqa`, `@SuppressWarnings` annotations; audit for unjustified suppression proliferation.

## Domain Concepts & Terminology

### Linting & Analysis Tools
- **ESLint**: JavaScript/TypeScript linter with extensive rule ecosystem; configurable via `.eslintrc`
- **Pylint / Flake8 / Ruff**: Python linters; Ruff is the modern high-speed alternative
- **golangci-lint**: Meta-linter for Go that runs multiple linters in parallel
- **RuboCop**: Ruby linter and formatter
- **Checkstyle / SpotBugs**: Java code quality tools
- **SonarQube / SonarCloud**: Multi-language static analysis platform with quality gates
- **PMD**: Source code analyzer for Java, Apex, and other languages

### Code Quality Concepts
- **Static Analysis**: Examining code without executing it to find bugs, style violations, and security issues
- **Cyclomatic Complexity**: Count of linearly independent paths through a function — threshold typically 10
- **Cognitive Complexity**: Measure of how hard code is to understand (SonarSource metric)
- **Code Smell**: Indicator of a deeper problem — not a bug, but a structure that suggests one exists
- **Technical Debt Ratio**: Estimated remediation time / development time — SonarQube reports this per project
- **Duplication Rate**: Percentage of code that appears in more than one location — target < 3%

### Style Guide Concepts
- **Convention**: An agreed-upon way to do something that isn't inherently right or wrong (naming case, bracket placement)
- **Best Practice**: An approach that evidence or experience suggests is superior to alternatives
- **Idiom**: The natural, conventional way to express something in a specific language
- **Anti-Pattern**: A common but ineffective or counterproductive solution
- **Suppression Annotation**: A directive telling a linter to ignore a specific rule at a specific location (`// eslint-disable-next-line`, `# noqa: E501`)

### Compliance Reporting
- **Compliance Score**: Percentage of files/functions meeting all standards — tracked over time
- **Violation Count by Severity**: Error (blocking), Warning (reporting), Info (informational)
- **Trend Analysis**: Whether compliance is improving or degrading over time
- **Hotspot Files**: Files with the most violations — often candidates for focused refactoring

## Anti-Patterns to Avoid

- **Standards Without Tooling**: Documenting a coding standard in a wiki page without enforcing it via linting — inevitably drifts to non-compliance.
- **Overly Prescriptive Rules**: Standards so detailed and rigid that engineers spend more time satisfying the linter than writing good code.
- **Blanket Disable Comments**: Suppressing entire rule categories with file-level disables rather than fixing violations — hides real issues.
- **Audit Without Remediation Plan**: Generating a compliance report showing hundreds of violations without a plan to address them — reports without action are noise.
- **Inconsistent Standards Across Services**: Different services in the same organization using different naming conventions, error patterns, and structure — makes cross-service work expensive.
- **Retroactive Standards on Legacy Code**: Applying new standards to unchanged legacy code generates massive noise and disguises new violations — use baseline suppression for legacy files.
- **Enforcing Style Over Substance**: Blocking PRs for bracket placement while ignoring missing error handling — standards enforcement must prioritize safety over aesthetics.

## Quality Indicators

- **CI Lint Pass Rate**: Percentage of CI runs where linting passes on the first try — target > 95%.
- **Zero Unjustified Suppressions**: Every suppression annotation includes a ticket reference or inline justification.
- **Duplication Rate < 3%**: Measured by SonarQube or similar; high duplication indicates missed abstraction opportunities.
- **Complexity Threshold Violations Decreasing**: Fewer functions above cyclomatic complexity threshold each sprint.
- **Style Guide Coverage**: Every convention enforced by the style guide has a corresponding lint rule — no "honor system" standards.
- **Compliance Score Trend Positive**: Monthly compliance score is stable or improving, not degrading.
- **New Code Has Zero Violations**: Violations in new code (not legacy baseline) are caught and fixed before merge.

## Collaboration Touchpoints

- **With Code Reviewer**: Automated standards checks reduce the manual burden of reviewers — surface compliance reports in PR comments so reviewers can focus on logic.
- **With Backend Developer / Frontend Developer**: When introducing a new standard, provide refactoring examples and an automated codemod if possible — don't just announce the change.
- **With QA Lead**: Coordinate on test coverage standards — coverage thresholds should be part of the standards compliance report, not a separate gate.
- **With Tech Lead**: Escalate standards drift trends (rising suppression counts, falling compliance scores) to the tech lead for architectural remediation decisions.
