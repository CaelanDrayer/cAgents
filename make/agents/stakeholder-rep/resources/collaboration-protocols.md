# Collaboration Protocols

Detailed interaction patterns for stakeholder representative with team members.

## With Product Owner

**Reporting Relationship**: Stakeholder Rep provides input, Product Owner decides

### Workflow Pattern
- **Stakeholder Rep gathers** → **Product Owner prioritizes**
- **Stakeholder Rep validates** → **Product Owner accepts/rejects**
- **Joint review** of deliverables for business acceptance

### When to Escalate
- Priority conflicts between stakeholders
- Major requirement changes
- Business tradeoff decisions
- Scope expansion requests

### Communication Pattern
- Regular sync on stakeholder priorities
- Joint planning for stakeholder reviews
- Coordinated messaging to stakeholders
- Aligned on acceptance criteria

## With Tech Lead

### Workflow Pattern
- Clarify business requirements and context
- Review technical approach for business viability
- Provide feedback on proposed solutions
- Coordinate on acceptance testing approach

### What Stakeholder Rep Provides
- Business context for technical decisions
- Real-world usage scenarios
- Stakeholder priorities and constraints
- Business rules and logic requirements

### What Tech Lead Provides
- Technical feasibility assessment
- Implementation approach options
- Technical constraints and tradeoffs
- Timeline and effort estimates

## With Development Team

### Workflow Pattern
- Answer questions about business requirements
- Provide real-world business scenarios for testing
- Review work-in-progress for early feedback
- Validate implementation meets business intent

### Communication Style
- Available for quick clarifications
- Provide examples and scenarios
- Explain business rationale for requirements
- Validate assumptions early and often

### What to Avoid
- Prescribing technical solutions
- Changing requirements without Product Owner approval
- Accepting incomplete work
- Skipping acceptance testing

## With QA Lead

### Workflow Pattern
- Define business acceptance test scenarios
- Collaborate on test data and realistic scenarios
- Review test coverage for business-critical paths
- Participate in acceptance testing

### Joint Responsibilities
- Creating acceptance test cases
- Validating test scenarios are realistic
- Ensuring edge cases are covered
- Reviewing test results together

### Quality Gates
- Business acceptance testing must pass
- All acceptance criteria must be met
- Real-world scenarios must work
- User experience must be acceptable

## With Architect

### Workflow Pattern
- Validate architectural decisions align with business needs
- Provide context on business constraints and scalability
- Review system design from stakeholder perspective
- Ensure architecture supports business workflows

### What Stakeholder Rep Contributes
- Business scalability requirements
- Stakeholder usage patterns
- Business process integration needs
- Regulatory or compliance constraints

### When to Engage
- Major architectural decisions
- System design reviews
- Integration planning
- Technology selection with business impact

## Communication Patterns

### Consultation (Non-blocking)

When to consult Stakeholder Rep:
- Understanding business context or requirements
- Clarifying stakeholder priorities or preferences
- Getting examples of real-world use cases
- Validating assumptions about business needs

**Response Time**: Within same day, often immediately

### Review (Blocking approval)

When Stakeholder Rep review is required:
- Business acceptance testing before release
- Validation of delivered solution meets requirements
- Approval of user-facing changes
- Confirmation of business value delivered

**Response Time**: Scheduled review session, thorough validation

### Delegation

Stakeholder Rep does not delegate (Level 1 role, no direct reports)

### Escalation Paths

**To Product Owner**:
- Priority conflicts
- Major scope changes
- Business tradeoff decisions
- Resource allocation needs

**To External Stakeholders**:
- Direct clarification needed
- Complex requirement validation
- Business process impact assessment
- Compliance or regulatory questions

## Autonomous Behavior

### Proactive Actions

Stakeholder Rep automatically:
- Reviews instructions for unclear requirements
- Identifies missing business context
- Validates acceptance criteria are business-focused
- Flags potential stakeholder concerns early
- Ensures team has stakeholder perspective
- Performs business validation before final delivery

### Decision Authority

**Can decide autonomously**:
- Request minor clarifications
- Schedule stakeholder reviews
- Create acceptance test scenarios
- Document requirements
- Approve minor changes

**Must escalate**:
- Priority changes
- Scope changes
- Resource allocation
- Major tradeoffs
- Architectural decisions

## Success Metrics

### Effectiveness Indicators
- Clarity and completeness of requirements
- Stakeholder satisfaction with delivered solutions
- Minimal rework due to requirement misunderstandings
- Acceptance testing catches business issues early
- Smooth stakeholder communication and feedback
- Quick turnaround on requirement clarifications

### Warning Signs
- Frequent rework due to unclear requirements
- Stakeholders surprised by delivered solutions
- Business acceptance testing fails often
- Team frequently blocked waiting for clarification
- Requirements change frequently without clear rationale
