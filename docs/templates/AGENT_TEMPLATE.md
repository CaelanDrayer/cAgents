---
name: {agent-name}
tier: {controller|execution|support|infrastructure}
domain: {make|grow|operate|people|serve|core|shared}
coordination_style: {question_based}  # For controllers only
typical_questions: []  # For controllers only
answers_questions: []  # For execution agents only
executes_tasks: []     # For execution agents only
---

# {Agent Name}

## Quick Start

**What**: {One sentence description of what this agent does}

**When to use**:
- {Use case 1}
- {Use case 2}
- {Use case 3}

**How to invoke**:
```bash
/trigger {example usage}
```

**Common patterns**:
- {Pattern 1}: {Brief description}
- {Pattern 2}: {Brief description}
- {Pattern 3}: {Brief description}

---

## Overview

### Purpose

{2-3 paragraphs explaining the agent's role in the cAgents V7.0 system.}

### Capabilities

- **{Capability 1}**: {Description}
- **{Capability 2}**: {Description}
- **{Capability 3}**: {Description}

### Workflow Integration

{How this agent fits into the V7.0 workflow (routing → planning → coordinating → executing → validating)}

---

## Detailed Guide

### Question-Based Delegation (Controllers Only)

**Typical Questions Asked** (8-12 questions):
1. {Question 1}: {Purpose}
2. {Question 2}: {Purpose}
3. {Question 3}: {Purpose}

**Question Patterns**:
- **Implementation Analysis**: "What is the current {X}?"
- **Constraint Discovery**: "What are the constraints for {Y}?"
- **Expert Consultation**: "How should we approach {Z}?"

**Synthesis Process**:
1. Collect all answers
2. Identify patterns and themes
3. Resolve conflicts
4. Generate coherent solution
5. Create implementation tasks

### Execution Patterns (Execution Agents Only)

**Answers to Controllers**:
- {Question type 1}: {How agent answers}
- {Question type 2}: {How agent answers}
- {Question type 3}: {How agent answers}

**Tasks Executed**:
- {Task type 1}: {How agent executes}
- {Task type 2}: {How agent executes}
- {Task type 3}: {How agent executes}

### Configuration

**Config Files**:
- `{super-domain}/config/planner_config.yaml` - Controller catalog entry
- `{super-domain}/config/executor_config.yaml` - Execution monitoring
- `{super-domain}/config/validator_config.yaml` - Quality gates

**Key Settings**:
```yaml
# Example from planner_config.yaml
controller_catalog:
  tier_2:
    - name: {agent-name}
      domain: {domain}
      coordination_style: question_based
      typical_questions: [...]
```

### Advanced Usage

**Multi-Controller Coordination** (Tier 3+):
- {How this agent coordinates with other controllers}

**Parallel Execution**:
- {How this agent handles parallel work}

**Error Recovery**:
- {How this agent handles failures}

---

## Examples

### Example 1: {Common Use Case}

**Scenario**: {Description}

**Workflow**:
```
1. User request: "{example request}"
2. Router classifies: tier {N}, domain {domain}
3. Planner selects: {this agent} as controller
4. {Agent} asks {N} questions:
   - Q1: {question}
   - Q2: {question}
   - ...
5. Synthesizes solution: {outcome}
6. Creates {N} implementation tasks
7. Coordinates execution
8. Validation passes
9. Workflow complete
```

**Results**:
- {Result 1}
- {Result 2}
- {Result 3}

### Example 2: {Advanced Use Case}

**Scenario**: {Description}

**Workflow**:
```
{Step-by-step walkthrough}
```

**Results**:
- {Result 1}
- {Result 2}

### Example 3: {Edge Case}

**Scenario**: {Description}

**How {Agent} Handles**:
- {Handling step 1}
- {Handling step 2}
- {Handling step 3}

---

## Reference

### Frontmatter Fields

```yaml
name: {agent-name}          # Required: kebab-case name
tier: {tier}                # Required: controller, execution, support, infrastructure
domain: {domain}            # Required: super-domain or core/shared
coordination_style: {style} # Controllers: question_based
typical_questions: []       # Controllers: list of question patterns
answers_questions: []       # Execution: list of question types answered
executes_tasks: []          # Execution: list of task types executed
```

### Related Agents

**Works With**:
- **{Agent 1}**: {Relationship}
- **{Agent 2}**: {Relationship}
- **{Agent 3}**: {Relationship}

**Delegates To** (Controllers):
- {Execution agent 1}
- {Execution agent 2}

**Coordinated By** (Execution):
- {Controller 1}
- {Controller 2}

### Configuration Files

- `{domain}/config/planner_config.yaml`
- `{domain}/config/executor_config.yaml`
- `{domain}/config/validator_config.yaml`
- `{domain}/config/self_correct_config.yaml`

### Success Metrics

- **Typical Duration**: {time range}
- **Questions Asked**: {N-M}
- **Tasks Generated**: {N-M}
- **Success Rate**: {percentage}
- **Token Usage**: {range}

---

**Version**: 1.0
**Tier**: {tier}
**Domain**: {domain}
**Part of**: cAgents V7.0
