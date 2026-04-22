# /improve --mode review Agent Groups

Parallel execution groups for each review type. Canonical reference for
`/improve --mode review` DETECTING (and the review half of `--mode full`).
Each type has 3+ groups with explicit dependencies.

---

## Code Review Agent Groups

**When**: `.js`, `.ts`, `.py`, `.go`, `.rs`, `.java`, `.rb` files; `src/`, `lib/`, `app/` directories
**Focus areas**: Architecture, security, performance, standards, test coverage, accessibility

### Group 1: Structural Analysis (independent, run in parallel)
- **cagents:architecture-reviewer** -- Evaluates system design patterns, coupling/cohesion, separation of concerns, module boundaries, and dependency direction violations
- **cagents:code-standards-auditor** -- Validates naming conventions, style consistency, linting compliance, anti-pattern detection, and language-specific forbidden patterns
- **cagents:technical-writer** -- Reviews inline documentation, JSDoc/docstring completeness, README accuracy, and API contract descriptions

### Group 2: Security & Performance Analysis (after Group 1, uses architecture context)
- **cagents:security-engineer** -- Scans for injection vectors (SQL, XSS, CSRF), auth bypass, secret exposure, insecure deserialization, and LLM output trust boundaries
- **cagents:performance-analyzer** -- Identifies hot paths, N+1 queries, unnecessary re-renders, memory leaks, algorithmic complexity issues, and bundle size regressions
- **cagents:test-coverage-validator** -- Validates test completeness for new code paths, error path coverage, edge case tests, and mutation testing gaps
Dependencies: Uses architecture context (module boundaries, data flow paths) from Group 1 to scope analysis

### Group 3: Specialized Analysis (after Group 2, conditional)
- **cagents:senior-developer** -- Cross-cutting review of error handling chains, logging adequacy for failure paths, and overall code quality synthesis
- **cagents:accessibility-checker** -- Validates WCAG compliance, ARIA attributes, keyboard navigation, screen reader compatibility (if UI components detected)
- **cagents:compliance-specialist** -- Checks regulatory compliance patterns, data retention, PII handling, audit trail requirements (if regulated data detected)
Dependencies: Uses security findings and architecture context from Groups 1-2 to focus on integration-level concerns

### Agent Prompt Templates

#### cagents:architecture-reviewer
```
Review architecture of ${targetPath} as a senior architect. Focus on:
1. Module boundaries — are responsibilities cleanly separated? Any god classes or god modules?
2. Dependency direction — do dependencies flow inward (clean architecture)? Any circular dependencies?
3. Coupling analysis — identify tight coupling between modules that should be independent
4. Pattern consistency — are design patterns applied consistently or mixed arbitrarily?
5. Extensibility — can new features be added without modifying existing code?
Report findings with: file:line location, severity (critical/high/medium/low), architectural impact, and refactoring suggestion.
```

#### cagents:code-standards-auditor
```
Audit code standards for ${targetPath} as a standards enforcement specialist. Focus on:
1. Naming conventions — variables, functions, classes, files follow project conventions
2. Anti-patterns — detect language-specific forbidden patterns (eval, any-casts, raw SQL strings)
3. Dead code — unused imports, unreachable branches, commented-out code blocks
4. Consistency — similar operations handled the same way across the codebase
5. Complexity — functions exceeding cyclomatic complexity thresholds, deeply nested logic
Report findings with: file:line location, severity (critical/high/medium/low), impact, and fix suggestion.
```

#### cagents:technical-writer
```
Review documentation quality in ${targetPath} as a technical documentation specialist. Focus on:
1. API documentation — are all public functions/methods documented with params, returns, and examples?
2. Inline comments — do complex algorithms have explanatory comments? Are comments accurate (not stale)?
3. README accuracy — does the README reflect the current state of the code?
4. Error documentation — are error codes, exception types, and failure modes documented?
Report findings with: file:line location, severity (critical/high/medium/low), impact, and fix suggestion.
```

#### cagents:security-engineer
```
Perform security audit of ${targetPath} as a security specialist. Focus on:
1. Injection vectors — SQL injection, XSS, command injection, LDAP injection, template injection
2. Authentication/authorization — auth bypass, privilege escalation, session management flaws
3. Secret exposure — hardcoded credentials, API keys, tokens in source code
4. Trust boundaries — untrusted input flows (user input, LLM output, external API responses) without validation
5. Cryptographic issues — weak algorithms, insufficient key lengths, insecure random generation
Report findings with: file:line location, severity (critical/high/medium/low), exploit scenario, and specific fix.
```

#### cagents:performance-analyzer
```
Analyze performance of ${targetPath} as a performance specialist. Focus on:
1. N+1 queries — database access patterns inside loops, missing eager loading
2. Algorithmic complexity — O(n^2) or worse in hot paths, unnecessary iterations
3. Memory leaks — unclosed resources, growing caches without eviction, event listener accumulation
4. Bundle size — large imports that could be tree-shaken or lazy-loaded
5. Render performance — unnecessary re-renders, missing memoization, layout thrashing (if UI)
Report findings with: file:line location, severity (critical/high/medium/low), measured or estimated impact, and fix suggestion.
```

#### cagents:test-coverage-validator
```
Validate test coverage for ${targetPath} as a QA specialist. Focus on:
1. New code paths — does every new function/method have at least one test?
2. Error paths — are error conditions, edge cases, and boundary values tested?
3. Integration points — are API boundaries, database interactions, and external calls tested?
4. Regression coverage — do tests protect against previously fixed bugs recurring?
Report findings with: file:line location, severity (critical/high/medium/low), missing test description, and suggested test case.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Structural (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:architecture-reviewer", prompt: `Review architecture of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:code-standards-auditor", prompt: `Audit code standards for ${targetPath}...` }),
  Agent({ subagent_type: "cagents:technical-writer", prompt: `Review documentation in ${targetPath}...` }),
]);

// Group 2 - Security & Performance (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:security-engineer", prompt: `Security audit ${targetPath}. Architecture context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:performance-analyzer", prompt: `Analyze performance of ${targetPath}. Architecture context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:test-coverage-validator", prompt: `Validate test coverage for ${targetPath}.` }),
]);

// Group 3 - Specialized (conditional, uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:senior-developer", prompt: `Cross-cutting review of ${targetPath}. Prior findings: ${group1and2Results}` }),
  hasUIComponents ? Agent({ subagent_type: "cagents:accessibility-checker", prompt: `WCAG audit of ${targetPath}...` }) : null,
  hasRegulatedData ? Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Compliance review of ${targetPath}...` }) : null,
].filter(Boolean));
```

---

## Documentation Review Agent Groups

**When**: `.md`, `.txt`, `.rst`, `.adoc` files; `docs/`, `wiki/`, `README` files
**Focus areas**: Clarity, accuracy, completeness, structure, accessibility

### Group 1: Content Quality Analysis (independent, run in parallel)
- **cagents:technical-writer** -- Evaluates technical accuracy, completeness of instructions, correct code examples, and proper formatting
- **cagents:copy-editor** -- Reviews grammar, spelling, punctuation, sentence structure, readability score, and consistent terminology
- **cagents:editor** -- Assesses overall document structure, logical flow, heading hierarchy, cross-reference integrity, and narrative coherence

### Group 2: Technical Accuracy & Standards (after Group 1, uses content quality context)
- **cagents:architecture-reviewer** -- Verifies architecture diagrams match actual code, API docs reflect current endpoints, and system descriptions are accurate
- **cagents:code-standards-auditor** -- Validates code examples compile/run, import paths are correct, version numbers are current, and CLI commands are accurate
- **cagents:compliance-specialist** -- Checks for required legal notices, license headers, privacy policy references, and regulatory disclaimers
Dependencies: Uses content quality findings from Group 1 to focus on accuracy issues rather than style

### Group 3: Accessibility & Discoverability (after Group 2, specialized)
- **cagents:accessibility-checker** -- Validates alt text on images, heading structure for screen readers, link text clarity, color contrast in embedded diagrams
- **cagents:ux-designer** -- Evaluates information architecture, navigation paths, search discoverability, and user task completion paths
Dependencies: Uses accuracy and structure findings from Groups 1-2 to assess user experience holistically

### Agent Prompt Templates

#### cagents:technical-writer
```
Review documentation in ${targetPath} as a senior technical writer. Focus on:
1. Technical accuracy — do instructions match actual behavior? Are code examples correct and runnable?
2. Completeness — are prerequisites listed? Are all steps included? Are edge cases documented?
3. Formatting — proper use of headings, code blocks, tables, and callouts?
4. Audience fit — is the language appropriate for the stated audience (beginner/intermediate/expert)?
Report findings with: file:line location, severity (critical/high/medium/low), impact on reader comprehension, and fix suggestion.
```

#### cagents:copy-editor
```
Edit ${targetPath} for language quality as a professional copy editor. Focus on:
1. Grammar and spelling — correct usage, subject-verb agreement, punctuation
2. Readability — sentence length, passive voice overuse, jargon without definition
3. Terminology consistency — same concept uses same term throughout (no synonym drift)
4. Tone consistency — professional, technical, casual — is it consistent throughout?
Report findings with: file:line location, severity (critical/high/medium/low), impact, and corrected text.
```

#### cagents:editor
```
Review document structure of ${targetPath} as a managing editor. Focus on:
1. Logical flow — does the document follow a natural progression? Are sections in the right order?
2. Heading hierarchy — proper nesting (H1 > H2 > H3), no skipped levels?
3. Cross-references — do internal links resolve? Are referenced sections present?
4. Completeness — is there an introduction, body, and conclusion/next-steps section?
Report findings with: file:line location, severity (critical/high/medium/low), impact, and restructuring suggestion.
```

#### cagents:architecture-reviewer
```
Verify technical accuracy of documentation in ${targetPath} as an architect. Focus on:
1. Architecture diagrams — do they reflect the actual system topology and data flows?
2. API documentation — do endpoints, parameters, and responses match the running code?
3. Configuration docs — are all environment variables, config keys, and defaults accurate?
Report findings with: file:line location, severity (critical/high/medium/low), what is inaccurate, and correct information.
```

#### cagents:accessibility-checker
```
Audit documentation accessibility in ${targetPath}. Focus on:
1. Image alt text — do all images have descriptive alt text?
2. Heading structure — is the heading hierarchy navigable by screen readers?
3. Link text — are links descriptive (not "click here") and distinguishable?
4. Color usage — do diagrams rely solely on color to convey meaning?
Report findings with: file:line location, severity (critical/high/medium/low), WCAG criterion violated, and fix suggestion.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Content Quality (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:technical-writer", prompt: `Review documentation in ${targetPath}...` }),
  Agent({ subagent_type: "cagents:copy-editor", prompt: `Edit ${targetPath} for language quality...` }),
  Agent({ subagent_type: "cagents:editor", prompt: `Review document structure of ${targetPath}...` }),
]);

// Group 2 - Technical Accuracy (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:architecture-reviewer", prompt: `Verify technical accuracy of ${targetPath}. Content issues: ${group1Results}` }),
  Agent({ subagent_type: "cagents:code-standards-auditor", prompt: `Validate code examples in ${targetPath}. Known issues: ${group1Results}` }),
  Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Check required legal/compliance notices in ${targetPath}.` }),
]);

// Group 3 - Accessibility (uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:accessibility-checker", prompt: `Audit documentation accessibility in ${targetPath}. Structure context: ${group1and2Results}` }),
  Agent({ subagent_type: "cagents:ux-designer", prompt: `Evaluate information architecture of ${targetPath}. Context: ${group1and2Results}` }),
]);
```

---

## Content Review Agent Groups

**When**: Blog posts, marketing copy, email campaigns, social media content, landing pages
**Focus areas**: Tone, grammar, messaging clarity, audience fit, brand consistency, SEO

### Group 1: Writing Quality Analysis (independent, run in parallel)
- **cagents:copy-editor** -- Reviews grammar, spelling, punctuation, sentence structure, readability level, and word choice precision
- **cagents:prose-stylist** -- Evaluates voice, tone, rhythm, emotional resonance, narrative hooks, and stylistic consistency
- **cagents:editor** -- Assesses overall structure, argument flow, headline effectiveness, call-to-action placement, and conclusion strength

### Group 2: Audience & Brand Alignment (after Group 1, uses writing quality context)
- **cagents:content-marketing-manager** -- Validates messaging alignment with brand guidelines, target audience persona fit, competitive differentiation, and campaign consistency
- **cagents:copywriter** -- Evaluates persuasion effectiveness, headline/subheadline hierarchy, benefit-vs-feature balance, and urgency/scarcity techniques
- **cagents:compliance-specialist** -- Checks marketing claims for accuracy, required disclaimers, FTC compliance, accessibility of promotional materials
Dependencies: Uses writing quality findings from Group 1 to focus on strategic alignment rather than grammar

### Group 3: Distribution & Effectiveness (after Group 2, specialized)
- **cagents:content-marketing-manager** -- Evaluates SEO optimization, keyword density, meta description quality, internal linking strategy, and content distribution readiness
- **cagents:ux-designer** -- Reviews content layout, visual hierarchy, mobile responsiveness of content structure, and reading pattern alignment (F-pattern, Z-pattern)
Dependencies: Uses brand alignment and writing quality from Groups 1-2 to assess end-to-end content effectiveness

### Agent Prompt Templates

#### cagents:copy-editor
```
Edit content in ${targetPath} as a professional copy editor. Focus on:
1. Grammar and mechanics — correct usage, punctuation, subject-verb agreement
2. Readability — Flesch-Kincaid score appropriate for target audience, sentence variety
3. Word choice — precision, avoiding cliches, eliminating filler words
4. Consistency — terminology, formatting, voice maintained throughout
Report findings with: location, severity (critical/high/medium/low), impact on reader experience, and corrected text.
```

#### cagents:prose-stylist
```
Evaluate writing style of ${targetPath} as a literary stylist. Focus on:
1. Voice and tone — is the voice consistent? Does the tone match the content purpose (inform/persuade/entertain)?
2. Rhythm and pacing — sentence length variation, paragraph transitions, reading momentum
3. Emotional resonance — does the content connect with the reader? Are hooks effective?
4. Stylistic consistency — same voice throughout, no jarring register shifts
Report findings with: location, severity (critical/high/medium/low), impact, and rewrite suggestion.
```

#### cagents:content-marketing-manager
```
Review content strategy alignment of ${targetPath} as a content marketing director. Focus on:
1. Target audience — does the content speak to the defined persona? Is the complexity level appropriate?
2. Brand voice — does it match brand guidelines? Is competitive differentiation clear?
3. SEO fundamentals — keyword presence, meta description quality, heading structure for search
4. Campaign alignment — does this piece support the broader content strategy?
Report findings with: location, severity (critical/high/medium/low), strategic impact, and recommendation.
```

#### cagents:copywriter
```
Review persuasive effectiveness of ${targetPath} as a senior copywriter. Focus on:
1. Headline strength — does the headline promise a clear benefit and create curiosity?
2. Value proposition — are benefits prioritized over features? Is the core promise clear?
3. Call-to-action — is the CTA clear, compelling, and appropriately urgent?
4. Objection handling — does the content preemptively address likely reader objections?
Report findings with: location, severity (critical/high/medium/low), impact on conversion, and rewrite suggestion.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Writing Quality (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:copy-editor", prompt: `Edit content in ${targetPath}...` }),
  Agent({ subagent_type: "cagents:prose-stylist", prompt: `Evaluate writing style of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:editor", prompt: `Review content structure of ${targetPath}...` }),
]);

// Group 2 - Audience & Brand (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:content-marketing-manager", prompt: `Review content strategy of ${targetPath}. Writing quality: ${group1Results}` }),
  Agent({ subagent_type: "cagents:copywriter", prompt: `Review persuasive effectiveness of ${targetPath}. Style context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Check marketing compliance in ${targetPath}.` }),
]);

// Group 3 - Distribution & Effectiveness (uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:content-marketing-manager", prompt: `Evaluate SEO and distribution readiness of ${targetPath}. Context: ${group1and2Results}` }),
  Agent({ subagent_type: "cagents:ux-designer", prompt: `Review content layout and visual hierarchy of ${targetPath}. Context: ${group1and2Results}` }),
]);
```

---

## Design Review Agent Groups

**When**: `.fig`, `.sketch`, `.xd`, `.psd` files; wireframes, mockups, prototypes, design system components
**Focus areas**: UX, accessibility, visual consistency, brand alignment, implementation feasibility

### Group 1: Visual & UX Analysis (independent, run in parallel)
- **cagents:ux-designer** -- Evaluates user flow logic, interaction patterns, affordances, error state design, empty state handling, and cognitive load
- **cagents:frontend-developer** -- Assesses implementation feasibility, responsive behavior, component reusability, CSS complexity, and animation performance
- **cagents:accessibility-checker** -- Validates color contrast ratios, touch target sizes, focus indicators, text scaling, motion sensitivity, and WCAG 2.1 AA compliance

### Group 2: Consistency & Brand Alignment (after Group 1, uses visual analysis context)
- **cagents:prose-stylist** -- Reviews microcopy (button labels, error messages, tooltips), tone consistency, and copy-design alignment
- **cagents:content-marketing-manager** -- Validates brand guideline adherence, visual identity consistency, and marketing message alignment in design
- **cagents:compliance-specialist** -- Checks privacy notice placement, cookie consent design, accessibility legal requirements, and age-gating patterns
Dependencies: Uses UX and accessibility findings from Group 1 to assess brand compliance with full interaction context

### Group 3: Technical Integration & Polish (after Group 2, specialized)
- **cagents:architecture-reviewer** -- Evaluates design system architecture, component hierarchy, token structure, and cross-platform consistency strategy
- **cagents:frontend-developer** -- Reviews design-to-code handoff clarity, asset export specifications, responsive breakpoint definitions, and interaction specifications
Dependencies: Uses UX, accessibility, and brand findings from Groups 1-2 for holistic design-engineering alignment

### Agent Prompt Templates

#### cagents:ux-designer
```
Review UX design of ${targetPath} as a senior UX designer. Focus on:
1. User flow — is the happy path intuitive? Are alternative flows handled (back, cancel, error)?
2. Interaction design — are affordances clear? Do interactive elements look interactive?
3. Error states — is every error state designed? Are error messages helpful and actionable?
4. Empty states — are zero-data states designed with guidance on how to populate?
5. Cognitive load — is information grouped logically? Are choices manageable (Hick's Law)?
Report findings with: screen/component location, severity (critical/high/medium/low), UX impact, and redesign suggestion.
```

#### cagents:frontend-developer
```
Assess design implementation feasibility of ${targetPath} as a senior frontend developer. Focus on:
1. Responsive behavior — are breakpoints defined? Does the design scale gracefully?
2. Component reusability — can elements be built as reusable components?
3. Animation feasibility — are transitions achievable at 60fps? Any GPU-intensive effects?
4. CSS complexity — will the layout require complex CSS (grid within flex within grid)?
5. Asset specifications — are exports, sizes, formats, and density variants specified?
Report findings with: component/screen location, severity (critical/high/medium/low), implementation risk, and feasibility suggestion.
```

#### cagents:accessibility-checker
```
Audit design accessibility of ${targetPath}. Focus on:
1. Color contrast — do all text/background combinations meet WCAG 2.1 AA (4.5:1 normal, 3:1 large)?
2. Touch targets — are all interactive elements at least 44x44px?
3. Focus indicators — are focus states designed for keyboard navigation?
4. Motion — is there a reduced-motion alternative for animations?
5. Text scaling — does the design accommodate 200% text zoom without loss of content?
Report findings with: component location, severity (critical/high/medium/low), WCAG criterion, and fix suggestion.
```

#### cagents:architecture-reviewer
```
Review design system architecture of ${targetPath} as a design systems architect. Focus on:
1. Component hierarchy — are atoms, molecules, organisms properly layered?
2. Token structure — are design tokens (color, spacing, typography) systematic and consistent?
3. Cross-platform — does the system support needed platforms (web, mobile, desktop)?
Report findings with: component location, severity (critical/high/medium/low), architectural impact, and suggestion.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Visual & UX (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:ux-designer", prompt: `Review UX design of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:frontend-developer", prompt: `Assess implementation feasibility of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:accessibility-checker", prompt: `Audit design accessibility of ${targetPath}...` }),
]);

// Group 2 - Consistency & Brand (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:prose-stylist", prompt: `Review microcopy in ${targetPath}. UX context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:content-marketing-manager", prompt: `Validate brand alignment in ${targetPath}. Context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Check design compliance in ${targetPath}. Accessibility: ${group1Results}` }),
]);

// Group 3 - Technical Integration (uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:architecture-reviewer", prompt: `Review design system architecture of ${targetPath}. Context: ${group1and2Results}` }),
  Agent({ subagent_type: "cagents:frontend-developer", prompt: `Review design-to-code handoff for ${targetPath}. Context: ${group1and2Results}` }),
]);
```

---

## Process Review Agent Groups

**When**: Workflow definitions, SOPs, runbooks, decision trees, BPMN diagrams, process documentation
**Focus areas**: Efficiency, clarity, risk mitigation, compliance, automation potential

### Group 1: Process Quality Analysis (independent, run in parallel)
- **cagents:operations-manager** -- Evaluates process efficiency, bottleneck identification, handoff clarity, SLA feasibility, and resource allocation
- **cagents:process-improvement-specialist** -- Identifies waste (Lean), variation (Six Sigma), automation opportunities, and continuous improvement hooks
- **cagents:risk-manager** -- Assesses risk points in the process, single points of failure, escalation paths, and disaster recovery steps

### Group 2: Compliance & Governance (after Group 1, uses process quality context)
- **cagents:compliance-officer** -- Validates regulatory compliance (SOX, GDPR, HIPAA), audit trail requirements, approval workflows, and retention policies
- **cagents:compliance-specialist** -- Checks for required checkpoints, segregation of duties, conflict of interest safeguards, and documentation requirements
- **cagents:risk-assessment** -- Evaluates risk mitigation effectiveness, residual risk levels, control adequacy, and risk acceptance criteria
Dependencies: Uses efficiency and risk findings from Group 1 to focus compliance review on high-risk process steps

### Group 3: Implementation & Adoption (after Group 2, specialized)
- **cagents:technical-writer** -- Reviews process documentation clarity, step-by-step instruction quality, role definitions, and decision criteria specificity
- **cagents:ux-designer** -- Evaluates process from the user perspective: are steps intuitive? Is the process learnable? Where will people get confused?
Dependencies: Uses compliance requirements and risk findings from Groups 1-2 to ensure documentation covers all regulated steps

### Agent Prompt Templates

#### cagents:operations-manager
```
Review process efficiency of ${targetPath} as an operations director. Focus on:
1. Bottlenecks — where does work queue up? What are the capacity constraints?
2. Handoffs — are handoff points clearly defined? Is information lost in transitions?
3. SLA feasibility — can the process meet stated SLAs consistently?
4. Resource utilization — are the right roles assigned to the right steps?
5. Parallel opportunities — which sequential steps could run in parallel?
Report findings with: process step location, severity (critical/high/medium/low), efficiency impact, and improvement suggestion.
```

#### cagents:process-improvement-specialist
```
Analyze process for improvement opportunities in ${targetPath} as a Lean/Six Sigma specialist. Focus on:
1. Waste identification — waiting, overprocessing, defects, unnecessary motion, inventory
2. Variation sources — where does the process produce inconsistent results?
3. Automation candidates — which manual steps could be automated?
4. Measurement gaps — which steps lack metrics for monitoring?
5. Continuous improvement — are feedback loops built into the process?
Report findings with: process step, severity (critical/high/medium/low), improvement category (Lean/Six Sigma), and recommendation.
```

#### cagents:risk-manager
```
Assess process risks in ${targetPath} as a risk management specialist. Focus on:
1. Single points of failure — what happens if a key person or system is unavailable?
2. Escalation paths — are escalation triggers and paths clearly defined?
3. Disaster recovery — can the process recover from interruptions at each step?
4. Dependencies — what external dependencies could block the process?
Report findings with: process step, severity (critical/high/medium/low), risk likelihood/impact, and mitigation suggestion.
```

#### cagents:compliance-officer
```
Audit process compliance of ${targetPath} as a compliance officer. Focus on:
1. Regulatory requirements — does the process meet applicable regulations (SOX, GDPR, HIPAA)?
2. Audit trail — are all decisions and actions traceable and logged?
3. Approval workflows — are required approvals in place with proper authority levels?
4. Segregation of duties — are conflicting responsibilities properly separated?
Report findings with: process step, severity (critical/high/medium/low), regulation violated, and remediation suggestion.
```

#### cagents:technical-writer
```
Review process documentation quality of ${targetPath} as a documentation specialist. Focus on:
1. Step clarity — is each step unambiguous? Could someone new follow them without help?
2. Role definitions — is it clear WHO performs each step?
3. Decision criteria — at decision points, are the criteria specific and measurable?
4. Exception handling — are exception paths documented, not just the happy path?
Report findings with: step location, severity (critical/high/medium/low), clarity impact, and rewrite suggestion.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Process Quality (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:operations-manager", prompt: `Review process efficiency of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:process-improvement-specialist", prompt: `Analyze improvement opportunities in ${targetPath}...` }),
  Agent({ subagent_type: "cagents:risk-manager", prompt: `Assess process risks in ${targetPath}...` }),
]);

// Group 2 - Compliance & Governance (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:compliance-officer", prompt: `Audit process compliance of ${targetPath}. Risk context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Check governance requirements in ${targetPath}. Context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:risk-assessment", prompt: `Evaluate risk mitigation in ${targetPath}. Risk findings: ${group1Results}` }),
]);

// Group 3 - Implementation & Adoption (uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:technical-writer", prompt: `Review process documentation clarity of ${targetPath}. Compliance requirements: ${group2Results}` }),
  Agent({ subagent_type: "cagents:ux-designer", prompt: `Evaluate process usability of ${targetPath}. Context: ${group1and2Results}` }),
]);
```

---

## Data Review Agent Groups

**When**: `.csv`, `.json`, `.parquet`, `.sql` files; database schemas, data pipelines, ETL configurations, data models
**Focus areas**: Quality, completeness, consistency, schema design, security, performance

### Group 1: Schema & Quality Analysis (independent, run in parallel)
- **cagents:dba** -- Evaluates schema design, normalization level, index strategy, constraint completeness, migration safety, and query performance patterns
- **cagents:data-analyst** -- Assesses data quality patterns: null rates, duplicate detection, outlier identification, consistency checks, and referential integrity
- **cagents:data-scientist** -- Reviews statistical properties, distribution assumptions, feature engineering validity, bias indicators, and data leakage risks

### Group 2: Security & Compliance (after Group 1, uses schema context)
- **cagents:security-engineer** -- Scans for PII exposure, encryption at rest/in transit, access control patterns, SQL injection in dynamic queries, and data masking adequacy
- **cagents:compliance-specialist** -- Checks GDPR/CCPA compliance, data retention policies, consent tracking, right-to-deletion implementation, and cross-border transfer rules
- **cagents:bi-specialist** -- Validates data lineage documentation, transformation accuracy, aggregation correctness, and reporting consistency
Dependencies: Uses schema and quality context from Group 1 to focus security review on sensitive data flows

### Group 3: Performance & Integration (after Group 2, specialized)
- **cagents:performance-analyzer** -- Evaluates query performance, partition strategy, data volume scalability, caching patterns, and ETL throughput bottlenecks
- **cagents:dba** -- Reviews migration rollback safety, backward compatibility of schema changes, and integration point contracts
Dependencies: Uses security findings and schema context from Groups 1-2 to assess performance with full constraint awareness

### Agent Prompt Templates

#### cagents:dba
```
Review database schema and data design in ${targetPath} as a senior DBA. Focus on:
1. Schema design — normalization level appropriate? Are constraints (FK, unique, check) complete?
2. Index strategy — are queries covered by indexes? Any missing or redundant indexes?
3. Migration safety — can this migration be rolled back? Are there destructive operations?
4. Naming conventions — consistent table/column naming? Reserved word conflicts?
5. Data types — are types appropriate for the data? Any precision loss risks?
Report findings with: table/column location, severity (critical/high/medium/low), impact, and fix suggestion.
```

#### cagents:data-analyst
```
Assess data quality patterns in ${targetPath} as a data quality specialist. Focus on:
1. Null handling — which columns allow nulls that shouldn't? Default value appropriateness?
2. Duplicates — are unique constraints sufficient to prevent duplicate records?
3. Referential integrity — are all foreign key relationships enforced?
4. Consistency — are similar fields (dates, currencies, units) formatted consistently?
5. Completeness — are required fields enforced at the schema level?
Report findings with: table/column location, severity (critical/high/medium/low), data quality impact, and fix suggestion.
```

#### cagents:data-scientist
```
Review data properties of ${targetPath} as a data science specialist. Focus on:
1. Distribution assumptions — do schema constraints match expected data distributions?
2. Feature validity — if used for ML, are feature definitions sound? Any leakage risks?
3. Bias indicators — could the schema design introduce systematic bias?
4. Temporal integrity — are time-series patterns properly constrained?
Report findings with: location, severity (critical/high/medium/low), statistical impact, and recommendation.
```

#### cagents:security-engineer
```
Audit data security in ${targetPath} as a data security specialist. Focus on:
1. PII exposure — are personally identifiable fields encrypted or masked?
2. Access control — are permissions granular enough? Any overly permissive roles?
3. Injection vectors — any dynamic SQL or string interpolation in queries?
4. Encryption — is sensitive data encrypted at rest and in transit?
5. Audit logging — are data access and modifications logged?
Report findings with: table/column location, severity (critical/high/medium/low), exploit scenario, and fix suggestion.
```

#### cagents:compliance-specialist
```
Check data compliance in ${targetPath} as a data compliance specialist. Focus on:
1. GDPR/CCPA — is there a mechanism for data deletion requests? Consent tracking?
2. Data retention — are retention periods defined and enforced?
3. Cross-border — does data transfer comply with regional regulations?
4. Classification — is data classified by sensitivity level?
Report findings with: location, severity (critical/high/medium/low), regulation, and remediation suggestion.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Schema & Quality (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:dba", prompt: `Review database schema in ${targetPath}...` }),
  Agent({ subagent_type: "cagents:data-analyst", prompt: `Assess data quality patterns in ${targetPath}...` }),
  Agent({ subagent_type: "cagents:data-scientist", prompt: `Review data properties of ${targetPath}...` }),
]);

// Group 2 - Security & Compliance (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:security-engineer", prompt: `Audit data security in ${targetPath}. Schema context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Check data compliance in ${targetPath}. Context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:bi-specialist", prompt: `Validate data lineage in ${targetPath}. Context: ${group1Results}` }),
]);

// Group 3 - Performance & Integration (uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:performance-analyzer", prompt: `Evaluate query performance in ${targetPath}. Schema + security: ${group1and2Results}` }),
  Agent({ subagent_type: "cagents:dba", prompt: `Review migration safety and integration in ${targetPath}. Context: ${group1and2Results}` }),
]);
```

---

## Infrastructure Review Agent Groups

**When**: `Dockerfile`, `docker-compose.yml`, `*.tf`, `*.yaml` (k8s manifests), `ansible/`, `helm/`, CI/CD configs
**Focus areas**: Security, scalability, reliability, cost efficiency, operational readiness

### Group 1: Security & Configuration Analysis (independent, run in parallel)
- **cagents:security-engineer** -- Scans for container vulnerabilities (root user, exposed ports, secrets in environment), network policy gaps, RBAC misconfiguration, and supply chain risks
- **cagents:devops-engineer** -- Evaluates configuration correctness, resource limits, health checks, readiness probes, graceful shutdown handling, and deployment strategy
- **cagents:sysadmin** -- Reviews system-level concerns: file permissions, log rotation, disk management, cron scheduling, and system service configuration

### Group 2: Reliability & Scalability (after Group 1, uses security context)
- **cagents:devops-lead** -- Assesses high-availability design, failover mechanisms, disaster recovery readiness, backup strategies, and multi-region considerations
- **cagents:performance-analyzer** -- Evaluates resource allocation efficiency, auto-scaling triggers, cache configuration, connection pooling, and throughput bottlenecks
- **cagents:architecture-reviewer** -- Reviews infrastructure architecture: service mesh design, load balancing strategy, database topology, and network segmentation
Dependencies: Uses security findings from Group 1 to assess reliability with full threat awareness

### Group 3: Cost & Compliance (after Group 2, specialized)
- **cagents:compliance-specialist** -- Checks infrastructure compliance: encryption requirements, access logging, data residency, patch management policies, and audit trail completeness
- **cagents:risk-manager** -- Evaluates operational risk: blast radius of failures, change management safety, rollback capabilities, and SLA alignment
Dependencies: Uses reliability and security context from Groups 1-2 to assess cost-risk tradeoffs holistically

### Agent Prompt Templates

#### cagents:security-engineer
```
Audit infrastructure security of ${targetPath} as an infrastructure security specialist. Focus on:
1. Container security — running as root? Unnecessary capabilities? Secrets in env vars or build args?
2. Network security — exposed ports, network policy gaps, ingress/egress rules
3. RBAC — are permissions least-privilege? Any cluster-admin bindings?
4. Supply chain — base image provenance, pinned versions, vulnerability scanning
5. Secrets management — are secrets in Vault/KMS or hardcoded? Are they rotated?
Report findings with: file:line location, severity (critical/high/medium/low), exploit scenario, and fix suggestion.
```

#### cagents:devops-engineer
```
Review infrastructure configuration of ${targetPath} as a senior DevOps engineer. Focus on:
1. Resource limits — are CPU/memory requests and limits set? Are they right-sized?
2. Health checks — are liveness, readiness, and startup probes configured correctly?
3. Deployment strategy — rolling update, blue-green, canary? Is rollback tested?
4. Graceful shutdown — does the app handle SIGTERM? Is there a pre-stop hook?
5. Configuration management — are configs externalized? Environment-specific overrides?
Report findings with: file:line location, severity (critical/high/medium/low), operational impact, and fix suggestion.
```

#### cagents:sysadmin
```
Review system configuration of ${targetPath} as a senior systems administrator. Focus on:
1. File permissions — are sensitive files properly restricted? Any world-writable configs?
2. Logging — are logs configured with rotation, retention, and centralized collection?
3. Disk management — are volume mounts sized appropriately? Ephemeral vs persistent?
4. Service management — are restart policies, dependencies, and startup order defined?
Report findings with: file:line location, severity (critical/high/medium/low), operational impact, and fix suggestion.
```

#### cagents:devops-lead
```
Assess infrastructure reliability of ${targetPath} as a DevOps director. Focus on:
1. High availability — is there redundancy at every layer? What is the blast radius of a single failure?
2. Disaster recovery — are backups automated, tested, and geographically distributed?
3. Failover — is failover automated? What is the RTO/RPO?
4. Multi-region — if applicable, is data replication and traffic routing designed?
Report findings with: component location, severity (critical/high/medium/low), reliability impact, and architecture suggestion.
```

#### cagents:performance-analyzer
```
Evaluate infrastructure performance of ${targetPath} as a performance engineer. Focus on:
1. Resource efficiency — are resources right-sized? Any over- or under-provisioned components?
2. Auto-scaling — are scaling triggers appropriate? Cooldown periods? Scale-in protection?
3. Caching — are cache layers configured with appropriate TTLs and eviction policies?
4. Connection pooling — are database and HTTP connection pools sized correctly?
Report findings with: component location, severity (critical/high/medium/low), performance impact, and optimization suggestion.
```

#### cagents:compliance-specialist
```
Check infrastructure compliance of ${targetPath} as a compliance specialist. Focus on:
1. Encryption — is data encrypted at rest and in transit? TLS version and cipher suites?
2. Access logging — are all access events logged to an immutable audit trail?
3. Data residency — does the deployment respect data residency requirements?
4. Patch management — are base images and dependencies on a patching schedule?
Report findings with: component location, severity (critical/high/medium/low), regulation/standard, and remediation suggestion.
```

### Parallel Execution Pattern

```javascript
// Group 1 - Security & Configuration (independent)
const group1 = await Promise.all([
  Agent({ subagent_type: "cagents:security-engineer", prompt: `Audit infrastructure security of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:devops-engineer", prompt: `Review infrastructure configuration of ${targetPath}...` }),
  Agent({ subagent_type: "cagents:sysadmin", prompt: `Review system configuration of ${targetPath}...` }),
]);

// Group 2 - Reliability & Scalability (uses Group 1 context)
const group2 = await Promise.all([
  Agent({ subagent_type: "cagents:devops-lead", prompt: `Assess infrastructure reliability of ${targetPath}. Security context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:performance-analyzer", prompt: `Evaluate infrastructure performance of ${targetPath}. Context: ${group1Results}` }),
  Agent({ subagent_type: "cagents:architecture-reviewer", prompt: `Review infrastructure architecture of ${targetPath}. Context: ${group1Results}` }),
]);

// Group 3 - Cost & Compliance (uses Groups 1-2)
const group3 = await Promise.all([
  Agent({ subagent_type: "cagents:compliance-specialist", prompt: `Check infrastructure compliance of ${targetPath}. Context: ${group1and2Results}` }),
  Agent({ subagent_type: "cagents:risk-manager", prompt: `Evaluate operational risk of ${targetPath}. Context: ${group1and2Results}` }),
]);
```

---

## Agent Group Summary

| Review Type | Group 1 Agents | Group 2 Agents | Group 3 Agents | Total Agents |
|-------------|----------------|----------------|----------------|--------------|
| **Code** | architecture-reviewer, code-standards-auditor, technical-writer | security-engineer, performance-analyzer, test-coverage-validator | senior-developer, accessibility-checker*, compliance-specialist* | 6-9 |
| **Documentation** | technical-writer, copy-editor, editor | architecture-reviewer, code-standards-auditor, compliance-specialist | accessibility-checker, ux-designer | 8 |
| **Content** | copy-editor, prose-stylist, editor | content-marketing-manager, copywriter, compliance-specialist | content-marketing-manager, ux-designer | 8 |
| **Design** | ux-designer, frontend-developer, accessibility-checker | prose-stylist, content-marketing-manager, compliance-specialist | architecture-reviewer, frontend-developer | 8 |
| **Process** | operations-manager, process-improvement-specialist, risk-manager | compliance-officer, compliance-specialist, risk-assessment | technical-writer, ux-designer | 8 |
| **Data** | dba, data-analyst, data-scientist | security-engineer, compliance-specialist, bi-specialist | performance-analyzer, dba | 8 |
| **Infrastructure** | security-engineer, devops-engineer, sysadmin | devops-lead, performance-analyzer, architecture-reviewer | compliance-specialist, risk-manager | 8 |

*Conditional agents (starred) are only spawned when relevant (UI components, regulated data).
