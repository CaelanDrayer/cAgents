---
name: {agent-name}
description: "Use when {trigger scenario}. {What this agent does in 1-2 sentences.}"
archetype: {developer|operator|advisor|analyst|creator|writer|strategist|core|leadership}
branch: {valid-branch-for-3-level-archetype}   # REQUIRED only for developer, operator, advisor; OMIT for 2-level archetypes (analyst, creator, writer, strategist) and flat roots (core, leadership)
metadata:
  tier: {controller|execution|support|infrastructure}
  coordination_style: {question_based}  # For controllers only
  typical_questions: []  # For controllers only
  answers_questions: []  # For execution agents only
  executes_tasks: []     # For execution agents only
---

<!--
  Frontmatter notes (v11.1.0+ schema):
  - The top-level `domain:` field was REMOVED in v11.1.0 — validate-agents.sh
    rejects it as an error. Use `archetype:` (+ `branch:` for 3-level archetypes)
    instead.
  - Valid branches per 3-level archetype:
      developer: backend | frontend | fullstack | infrastructure | quality
      operator:  support | business-ops | people-ops | marketing-sales | content
      advisor:   legal | health | education | personal
-->


# {Agent Name}

## Quick Start

**What**: {One sentence description of what this agent does}

**When to use**:
- {Use case 1}
- {Use case 2}
- {Use case 3}

**How to invoke**:
```bash
/run {example usage}
```

**Common patterns**:
- {Pattern 1}: {Brief description}
- {Pattern 2}: {Brief description}
- {Pattern 3}: {Brief description}

---

## Overview

### Purpose

{2-3 paragraphs explaining the agent's role in the cAgents system.}

### Capabilities

- **{Capability 1}**: {Description}
- **{Capability 2}**: {Description}
- **{Capability 3}**: {Description}

### Workflow Integration

{How this agent fits into the workflow (routing → planning → coordinating → executing → validating)}

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
- `{domain}/config/planner_config.yaml` - Controller catalog entry
- `{domain}/config/executor_config.yaml` - Execution monitoring
- `{domain}/config/validator_config.yaml` - Quality gates

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

### Frontmatter Fields (v11.1.0+ schema)

```yaml
name: {agent-name}          # Required: kebab-case name, matches directory name
description: "..."          # Required: 1-2 sentences ("Use when ...")
archetype: {archetype}      # Required: developer|operator|advisor|analyst|creator|writer|strategist|core|leadership
branch: {branch}            # Required only for 3-level archetypes (developer, operator, advisor)
metadata:
  tier: {tier}              # Required: controller, execution, support, infrastructure
  coordination_style: {style} # Controllers: question_based
  typical_questions: []     # Controllers: list of question patterns
  answers_questions: []     # Execution: list of question types answered
  executes_tasks: []        # Execution: list of task types executed
```

Note: Pre-v11.1.0 templates included a top-level `domain:` field. That field was REMOVED in v11.1.0 and `validate-agents.sh` now rejects it as an error.

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
**Part of**: cAgents
