---
name: agent-name
tier: execution
domain: engineering
version: "1.0.0"
description: Brief description of what this agent does
answers_questions:
  - "implementation details"
  - "technical constraints"
executes_tasks:
  - "implement endpoints"
  - "write tests"
---

# Agent Name

One-sentence description of this agent's purpose and expertise.

## Role

What this agent is responsible for and when it should be used.

## Expertise

List the specific areas of expertise:

- Expertise area 1
- Expertise area 2
- Expertise area 3

## Question Patterns

This agent can answer questions like:

1. **Implementation Questions**: "What is the current implementation of X?"
2. **Technical Questions**: "What are the technical constraints for Y?"
3. **Best Practice Questions**: "What is the recommended approach for Z?"

## Task Execution

This agent can execute tasks such as:

1. **Task Type 1**: Description of what this involves
2. **Task Type 2**: Description of what this involves
3. **Task Type 3**: Description of what this involves

## Outputs

When completing tasks, this agent produces:

- `output_file.ext` - Description of output
- Test results
- Documentation updates

## Integration

### Works With

- **Controller**: engineering-manager (receives questions and tasks)
- **Related Agents**: architect, qa-lead (coordinates with)

### Communicates Via

- Questions delegated from controllers
- Task assignments in coordination_log.yaml
- Outputs written to `outputs/partial/{task_id}/`

## Example Interaction

**Controller Question**: "What is the current authentication implementation?"

**Agent Answer**: "The current implementation uses passport-local with bcrypt password hashing. Sessions are stored in Redis with a 24-hour TTL. The login endpoint is at POST /api/auth/login and returns a JWT token..."

---

**Version**: 1.0.0
**Domain**: engineering
**Tier**: execution
