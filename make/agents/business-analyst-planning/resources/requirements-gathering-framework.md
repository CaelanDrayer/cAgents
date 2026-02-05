# Requirements Gathering Framework

Structured approach to eliciting, documenting, and validating business requirements.

## Elicitation Techniques

### Stakeholder Interviews

Conduct structured interviews to extract requirements from key stakeholders.

**Preparation Checklist**:
- Identify all relevant stakeholders and their roles
- Research existing documentation and prior decisions
- Prepare open-ended questions organized by topic area
- Schedule adequate time (45-60 minutes per session)
- Establish note-taking or recording plan

**Interview Structure**:
1. Context setting (5 min) - explain purpose, scope, confidentiality
2. Current state exploration (15 min) - how things work today
3. Pain points and gaps (10 min) - what is broken or missing
4. Future state vision (10 min) - what ideal looks like
5. Constraints and priorities (10 min) - what limits the solution
6. Open discussion (10 min) - anything not covered

**Question Categories**:
- Process questions: "Walk me through how you currently handle X"
- Problem questions: "What are the biggest challenges with the current approach?"
- Priority questions: "If you could change one thing, what would it be?"
- Constraint questions: "What limitations must the solution work within?"
- Success questions: "How will you know the solution is working?"

### Document Analysis

Review existing artifacts to extract implicit requirements.

**Document Sources**:
- Existing system documentation and user manuals
- Support tickets and bug reports (patterns reveal gaps)
- Business process documentation and workflow diagrams
- Regulatory and compliance documents
- Competitive analysis and market research
- Previous project documentation and post-mortems

**Analysis Method**:
1. Catalog all available documents
2. Extract stated requirements and assumptions
3. Identify conflicts between documents
4. Note gaps where documentation is silent
5. Cross-reference with stakeholder input

### Workshop Facilitation

Run collaborative sessions for complex or cross-functional requirements.

**Workshop Types**:
- **Discovery workshop**: Explore problem space with diverse stakeholders
- **Prioritization workshop**: Rank requirements using MoSCoW or weighted scoring
- **Validation workshop**: Review drafted requirements for completeness
- **Conflict resolution workshop**: Resolve competing stakeholder needs

**Facilitation Guidelines**:
- Limit to 6-8 participants for productive discussion
- Use visual aids (whiteboards, sticky notes, diagrams)
- Assign a dedicated note-taker separate from the facilitator
- Time-box discussions to prevent scope drift
- Capture action items with owners and deadlines

## Requirements Documentation

### Requirement Structure

Each requirement should include:

| Field | Description | Example |
|-------|-------------|---------|
| ID | Unique identifier | REQ-AUTH-001 |
| Title | Brief descriptive name | User password reset |
| Description | Detailed requirement statement | Users must be able to reset their password via email verification |
| Rationale | Why this requirement exists | Reduces support ticket volume by 40% |
| Priority | MoSCoW classification | Must Have |
| Source | Who requested or where discovered | Stakeholder interview - IT Director |
| Acceptance Criteria | Measurable conditions for completion | See acceptance criteria section |
| Dependencies | Other requirements this depends on | REQ-AUTH-000 (base auth system) |

### Acceptance Criteria Format

Write acceptance criteria using the Given-When-Then pattern:

```
Given [precondition or context]
When [action or trigger]
Then [expected outcome]
```

**Examples**:
- Given a registered user on the login page, when they click "Forgot Password" and enter their email, then they receive a password reset link within 2 minutes
- Given a reset link that is more than 24 hours old, when the user clicks the link, then they see an expiration message and option to request a new link

### Quality Checklist for Requirements

Each requirement must be:
- **Complete**: All necessary information is present
- **Consistent**: Does not conflict with other requirements
- **Feasible**: Can be implemented within known constraints
- **Measurable**: Acceptance criteria are quantifiable
- **Traceable**: Links to business objective or stakeholder need
- **Unambiguous**: Only one reasonable interpretation exists
- **Testable**: Can be verified through testing or inspection

## Prioritization Methods

### MoSCoW Method

| Category | Definition | Guidance |
|----------|-----------|----------|
| Must Have | Non-negotiable, system fails without it | Core functionality, compliance, safety |
| Should Have | Important but system works without it | Significant value, workarounds exist |
| Could Have | Desirable, included if time/budget allows | Nice-to-have improvements |
| Won't Have | Explicitly excluded from this scope | Deferred to future phases |

### Weighted Scoring

Score each requirement on multiple dimensions (1-5 scale):
- Business value (weight: 3x)
- User impact (weight: 2x)
- Technical feasibility (weight: 2x)
- Regulatory necessity (weight: 3x)
- Strategic alignment (weight: 1x)

Calculate weighted total and rank accordingly.

## Traceability Matrix

Maintain a traceability matrix linking:

```
Business Objective -> Requirement -> Design Element -> Test Case -> Validation Evidence
```

This ensures every requirement traces back to a business need and forward to verification.

## Common Pitfalls

- Capturing solutions instead of requirements (describe the need, not the implementation)
- Missing non-functional requirements (performance, security, accessibility)
- Stakeholder bias toward their own department's needs
- Assuming requirements are static (plan for change management)
- Insufficient detail in acceptance criteria
- Ignoring edge cases and error scenarios
- Not validating requirements with end users (not just managers)
