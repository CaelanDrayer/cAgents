# Requirements Gathering & Validation Techniques

Comprehensive methods for eliciting, documenting, and validating business requirements.

## Discovery Questions

Essential questions for understanding business needs:

- **Problem**: What business problem are we solving?
- **Stakeholders**: Who are the stakeholders affected?
- **Success**: What does success look like from their perspective?
- **Priority**: What are the must-haves vs. nice-to-haves?
- **Constraints**: What business constraints or regulations apply?
- **Usage**: How will stakeholders use this solution?

## Requirements Gathering Techniques

### Interviews
- One-on-one stakeholder interviews
- Focus on business pain points and goals
- Probe for unstated assumptions
- Document business context and workflows

### Workshops
- Group facilitation sessions
- Collaborative requirement definition
- Prioritization exercises
- Consensus building on must-haves

### Surveys
- Broad stakeholder input collection
- Quantitative priority data
- Feature preference gathering
- User experience feedback

### Observation
- Shadow stakeholders in their workflow
- Identify implicit requirements from actual use
- Discover edge cases and exceptions
- Understand real-world context

## Validation Techniques

### User Scenario Walkthroughs
- Step through complete user journeys
- Validate requirements cover all scenarios
- Identify gaps in requirements
- Test edge cases and exceptions

### Prototype/Mockup Reviews
- Visual validation with stakeholders
- Early feedback on approach
- Catch misunderstandings early
- Refine user experience expectations

### Business Process Flow Validation
- Map requirements to business workflows
- Ensure solution fits into processes
- Identify process improvements needed
- Validate integration points

### Impact Analysis
- Assess effect on existing workflows
- Identify training or change management needs
- Document dependencies on other systems
- Plan for transition and adoption

## Acceptance Criteria Definition

### Clear, Testable Format

**Structure**:
- **Given** (context/precondition)
- **When** (action/event)
- **Then** (expected outcome)

**Example**:
- **Given** user is logged in as admin
- **When** user uploads a document
- **Then** document appears in pending review queue

**Focus**: Business outcomes, not technical implementation

### Quality Criteria

Good acceptance criteria are:
- **Specific**: Clear, unambiguous expected outcome
- **Testable**: Can verify pass/fail objectively
- **Valuable**: Delivers business value
- **Independent**: Not dependent on other criteria
- **Negotiable**: Can discuss implementation approach
- **Small**: Focused on single aspect of functionality

## Requirements Documentation Standards

### User Story Template

```
As a [type of user]
I want [goal/desire]
So that [benefit/value]

Acceptance Criteria:
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]
```

### Business Rules Documentation

- **Rule ID**: Unique identifier
- **Description**: Clear statement of rule
- **Rationale**: Why this rule exists
- **Source**: Where rule came from (regulation, policy, etc.)
- **Examples**: Concrete examples of rule application
- **Exceptions**: Special cases or conditions

### Requirements Traceability

Maintain links between:
- Business need → Requirement
- Requirement → User story
- User story → Implementation
- Implementation → Test case
- Test case → Acceptance criteria

## Common Pitfalls to Avoid

### Vague Requirements
❌ "System should be fast"
✅ "System should respond to user actions within 2 seconds"

### Solution-Focused Instead of Problem-Focused
❌ "Add a dropdown menu here"
✅ "Allow user to select from multiple options"

### Missing Context
❌ "Support file uploads"
✅ "Support document uploads (PDF, DOCX, max 10MB) for compliance review workflow"

### Implied Requirements
❌ Assuming stakeholders want feature X
✅ Explicitly confirming feature X is needed and why

## Knowledge Base

### Methodologies
- Business Analysis Body of Knowledge (BABOK)
- Agile user story practices
- Business Model Canvas
- Requirements elicitation frameworks

### Best Practices
- Involve stakeholders early and often
- Document decisions and rationale
- Keep requirements focused on business value
- Validate understanding frequently
- Maintain clear traceability
- Update requirements based on feedback

### Tools & Templates
- User story templates
- Acceptance criteria checklists
- Requirements traceability matrix
- Business process modeling notation (BPMN)
- Use case templates
