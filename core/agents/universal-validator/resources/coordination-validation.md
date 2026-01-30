# Coordination Validation

Validate controller coordination pattern compliance.

## Coordination File Verification

```yaml
# Required fields in coordination_log.yaml
required_fields:
  - instruction_id: must match
  - controller_primary: must exist and match plan
  - questions_asked: array, non-empty for tier 2+
  - synthesized_solution: non-empty, structured
  - implementation_tasks: array, actionable tasks
  - coordination_metadata: timestamps, counts
```

### Structural Validation

- All required fields present
- Questions array has at least 1 question (tier 2-3) or 5+ (tier 4)
- Each question has: id, question_text, delegated_to, answer
- Synthesis is not empty or placeholder text
- Implementation tasks are actionable (not vague)

## Question-Based Delegation Validation

### Question Count

```yaml
questions_asked_count = len(coordination_log.questions_asked)
max_questions = plan.max_questions_per_controller

if questions_asked_count > max_questions:
  issue: "Controller exceeded question limit"
  severity: MAJOR
  action: FIXABLE

if questions_asked_count == 0 and tier >= 2:
  issue: "No questions asked (violation)"
  severity: CRITICAL
  action: BLOCKED
```

### Question Quality

- Questions are specific (not "what should I do?")
- Questions target execution agents (not controllers)
- Questions are distinct (no duplicates)
- Questions address objectives from plan

### Answer Quality

- All questions have answers
- Answers are structured (YAML preferred)
- Answers are specific (not "looks good")
- Answers have evidence (code snippets, references)

### Circular Delegation Detection (CRITICAL)

```yaml
for each question in questions_asked:
  delegated_to_agent = question.delegated_to
  agent_tier = get_agent_tier(delegated_to_agent)

  if agent_tier == "controller":
    issue: "Circular delegation (controller → controller)"
    severity: CRITICAL
    action: BLOCKED (architecture violation)
```

## Delegation Compliance Validation

### Self-Answered Questions

```yaml
self_answered_questions = 0
for each question in questions_asked:
  if question.answered_by == controller_primary:
    self_answered_questions += 1
    issue: "Controller answered own question"
    severity: CRITICAL
    action: BLOCKED

# Maximum allowed: 0
if self_answered_questions > 0:
  classification = BLOCKED
```

### Minimum Subagent Usage

```yaml
minimum_subagents_per_objective = 2

for each objective in plan.objectives:
  subagents_used = count_unique_agents(coordination_log, objective.id)
  if subagents_used < minimum_subagents_per_objective:
    issue: "Insufficient delegation for objective"
    severity: MAJOR
    action: FIXABLE
```

### Direct Work Anti-Patterns

```yaml
anti_patterns:
  - "Let me fix that directly"
  - "I'll implement this"
  - "Here's the code:"
  - "I've made the following changes:"

for each note in coordination_log.notes:
  for each pattern in anti_patterns:
    if note.contains(pattern):
      issue: "Controller did direct work"
      severity: CRITICAL
      action: BLOCKED
```

## Synthesis Quality Validation

### Completeness Check

```yaml
objectives = plan.objectives
synthesis = coordination_log.synthesized_solution

for each objective in objectives:
  if objective not mentioned in synthesis:
    issue: "Synthesis missing objective"
    severity: MAJOR
    action: FIXABLE
```

### Quality Checks

- Not a placeholder ("TBD", "See answers above")
- Coherent (integrates answers)
- Actionable (clear direction)
- Includes key decisions
- Cites evidence from answers
