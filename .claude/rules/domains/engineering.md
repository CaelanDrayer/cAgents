# Engineering Domain Guidelines

Domain-specific patterns for engineering workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **engineering-manager**: Bug fixes, feature additions, moderate refactoring
- **architect**: System design questions, architectural decisions

**Tier 3** (Complex):
- **Primary**: engineering-manager (day-to-day coordination)
- **Supporting**: architect (design), security-specialist (security review)

**Tier 4** (Expert):
- **Executive**: cto (strategic oversight)
- **Primary**: engineering-manager (coordination)
- **Supporting**: architect, devops-lead, security-specialist, qa-lead

## Typical Questions

Engineering controllers typically ask:

**Implementation Analysis**:
- "What is the current implementation of [feature]?"
- "What are the technical constraints we need to consider?"
- "What dependencies does this change affect?"

**Architecture & Design**:
- "What architectural pattern should we use for [feature]?"
- "How should this integrate with existing systems?"
- "What are the scalability implications?"

**Security & Quality**:
- "What security considerations are relevant?"
- "What testing strategy should we use?"
- "What are the potential failure modes?"

## Execution Agents

Common engineering execution agents:
- **backend-developer**: API endpoints, database, business logic
- **frontend-developer**: UI components, state management, styling
- **devops-lead**: Deployment, infrastructure, CI/CD
- **qa-lead**: Testing strategy, test implementation, quality assurance
- **security-specialist**: Security review, vulnerability assessment
- **architect**: System design, architectural decisions
- **dba**: Database schema, query optimization

## Config Location

`Agent_Memory/_system/domains/engineering/*.yaml`
