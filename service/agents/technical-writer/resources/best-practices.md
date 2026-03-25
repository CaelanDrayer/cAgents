# Best Practices: Technical Writer

> Design principles, patterns, and frameworks that guide high-quality technical documentation, API reference, and user guide work.

## Design Principles

- **Clarity Over Completeness**: A shorter, clearer document that gets used is more valuable than an exhaustive document that gets skimmed; optimize for the reader finding what they need quickly
- **Task-Centered Structure**: Organize content around what users are trying to accomplish, not around how the product is built; user goals are better navigation anchors than product architecture
- **Minimalism**: Every word, sentence, and section has a cost in reader attention; include only what is necessary to achieve the documentation's purpose; if in doubt, cut it
- **Show Don't Just Tell**: Code examples, screenshots, and step-by-step procedures teach more than explanations; pair every concept with a concrete demonstration
- **Readers Are Scanning**: Users rarely read documentation linearly; they scan for the specific information they need; structure every page to support scanning with clear headers, short paragraphs, and visible key terms
- **Accuracy Is Sacred**: A technical error in documentation is worse than no documentation; it produces incorrect user behavior and erodes trust in all documentation
- **Docs as a Product**: Documentation has users, user journeys, and success metrics just like a software product; apply the same design thinking to documentation structure and user experience

## Key Patterns & Frameworks

- **Topic-Based Writing**: Separate information into three types — concept (what is it?), task (how do I do it?), and reference (what are all the values/options?); mix as few types as possible per article for maximum scannability
- **DITA (Darwin Information Typing Architecture)**: Structured authoring framework with formal topic types (task, concept, reference, glossary); enables content reuse, conditional publishing, and single-source documentation
- **Docs-as-Code**: Treat documentation like software — store in version control, use pull request review, deploy with CI/CD, lint for style, and automate publishing; improves consistency and enables developer contributions
- **Minimalism Principle**: Documentation that does the minimum necessary to help users succeed; complete task coverage without padding, explanation without over-explanation
- **API Documentation Structure**: Authentication → Quick Start → Endpoints (grouped by resource) → Request/Response examples → Error codes → Rate limits → SDK samples → Changelog; standard structure reduces cognitive load for API consumers
- **Progressive Disclosure**: Present the simplest, most common path first; advanced options, edge cases, and detailed explanations come later in the document or in linked reference material
- **Style Guide Enforcement**: Every documentation product needs a style guide covering voice and tone, terminology, capitalization, code formatting, and structural patterns; consistency reduces cognitive load
- **SME Interview Protocol**: Prepare specific questions before interviewing subject matter experts; ask for examples and exceptions, not just descriptions; test documented procedures in the actual product before publishing

## Domain Concepts & Terminology

### Writing Standards
- **Plain Language**: Writing standard emphasizing short sentences, active voice, common words, and clear structure; targets 8th-grade reading level for general documentation
- **Active Voice**: Sentence construction where the subject performs the action ("Click Submit") rather than passive ("Submit should be clicked"); more direct and easier to follow
- **Imperative Mood**: Using command form for procedural steps ("Navigate to Settings," "Enter your API key"); the natural form for instructions
- **Second Person (You)**: Addressing readers as "you" rather than "the user" or "one"; creates more direct, approachable tone
- **Sentence-Case Headings**: Headings written in sentence case rather than title case; current convention in most modern documentation

### Documentation Types
- **User Guide**: Step-by-step instructions for product features organized by use case
- **API Reference**: Complete technical reference for all API endpoints with parameters, request/response schemas, and examples
- **Quick Start Guide**: Abbreviated path to first value — gets a user from zero to working in 15-30 minutes
- **Troubleshooting Guide**: Symptom-driven content identifying causes and solutions for common errors
- **Release Notes**: Documentation of product changes in each release — new features, improvements, bug fixes, breaking changes
- **Conceptual Documentation**: Explanation of how something works without step-by-step instructions; provides the mental model before procedural detail

### Technical Documentation
- **OpenAPI Specification (Swagger)**: Machine-readable API description standard; enables auto-generated API reference documentation
- **Code Sample**: Working code example demonstrating how to accomplish a specific task; should be copy-paste functional
- **Screenshot**: Annotated image of the product UI supporting a procedural step; must be kept current with product changes
- **Admonition**: Callout box highlighting warnings, notes, tips, or important information; use sparingly or their urgency loses meaning
- **Cross-Reference**: Link from one document to another providing additional context or prerequisite information

### Process
- **Content Review**: Technical review (accuracy) + editorial review (clarity and style) + accessibility review before publication
- **Docs Feedback**: Mechanism for readers to report errors or gaps in documentation; "Was this helpful?" rating is the minimum viable feedback mechanism
- **Content Versioning**: Maintaining documentation versions aligned with product versions; critical for products with multiple supported versions
- **Changelog**: Chronological record of documentation changes; enables readers to understand what has changed

## Anti-Patterns to Avoid

- **Feature-Centric Organization**: Structuring documentation around product features rather than user tasks; readers think in terms of what they're trying to do, not which feature does it
- **Walls of Prose**: Writing documentation as long unstructured paragraphs without headers, lists, or code blocks; makes scanning nearly impossible
- **Undocumented Code Examples**: Including code samples without explanations of what each section does; readers need to understand examples to apply them correctly
- **Version Neglect**: Allowing documentation to drift from current product behavior after releases; outdated documentation produces incorrect user behavior and support tickets about the documentation itself
- **Jargon Without Definition**: Using product-specific or technical terms without defining them for readers who may encounter the term for the first time
- **Screenshots as Primary Instructions**: Relying on screenshots to show UI interaction without text descriptions; screenshots become outdated with every UI change and aren't accessible to screen readers
- **Perfectionism Over Shipping**: Waiting for perfect documentation before publishing anything; imperfect, current documentation serves users better than perfect documentation that arrives after the feature has been in production for months

## Quality Indicators

- **Documentation Coverage**: All product features documented with at least a task-level article
- **Content Freshness**: All articles reviewed and updated within 30 days of a relevant product release
- **Helpfulness Rating >80%**: Readers find articles useful through post-read feedback
- **Style Guide Compliance**: All published articles reviewed against style guide before publication
- **Broken Link Rate**: Zero or near-zero broken internal and external links in published documentation
- **API Reference Completeness**: All API endpoints documented with at least one request/response example
- **SME Review Completion**: All technical content reviewed by a subject matter expert before publication

## Collaboration Touchpoints

- **With Knowledge Base Manager**: Coordinate on content strategy and article ownership boundaries; Technical Writer handles complex, product-deep documentation while KB Manager handles support-focused how-to content
- **With Support Operations Manager**: Receive priority guidance based on support ticket volume; tickets about missing or incorrect documentation reveal documentation gaps
- **With Product**: Receive advance access to features and release notes before launch; documentation can't be written without product access and accurate specifications
- **With Engineering**: Coordinate on API reference documentation, code examples, and technical accuracy review; engineers are the authoritative source for technical correctness but need documentation assistance for clarity and structure
