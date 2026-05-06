# Ambiguity Scoring (V10.18.0)

Track design clarity across 4 dimensions. Each dimension is scored 0-100 based on what has been established through questions and research.

## Dimensions

| Dimension | What It Measures | Initial Score | Improves When |
|-----------|-----------------|---------------|---------------|
| `goal_clarity` | How well the end goal is defined | 10 | User articulates desired outcome, success metrics |
| `constraint_clarity` | How well limitations are understood | 10 | Technical, budget, timeline, compatibility constraints identified |
| `success_criteria_clarity` | How measurable success is | 10 | Specific, verifiable acceptance criteria established |
| `context_clarity` | How well the environment is understood | 10 | Existing systems, users, workflows documented |

## Composite Ambiguity Score

```
ambiguity = 100 - (
    goal_clarity * 0.35 +
    constraint_clarity * 0.20 +
    success_criteria_clarity * 0.30 +
    context_clarity * 0.15
)
```

Weights reflect impact on implementation success: goals and success criteria matter most.

## Readiness Gate

**CRITICAL: Do NOT proceed to Specification phase (Phase 6) until ambiguity drops below 20%.**

```
After each question round:
  1. Recalculate all 4 dimension scores based on user answers
  2. Compute composite ambiguity
  3. If ambiguity >= 20% at Phase 5->6 transition:
     -> BLOCK transition
     -> Identify weakest dimension
     -> Ask targeted questions for that dimension
     -> Repeat until ambiguity < 20%
  4. If ambiguity < 20%: proceed to Specification
```

## Question Targeting

Each question should target the **weakest scoring dimension**:
- If `goal_clarity` is lowest: "What specific outcome would make this project successful?"
- If `constraint_clarity` is lowest: "What technical/budget/timeline limitations should we respect?"
- If `success_criteria_clarity` is lowest: "How would you measure whether this succeeded?"
- If `context_clarity` is lowest: "What existing systems/processes does this interact with?"

## Score Display

Show ambiguity status after each phase transition:
```
Ambiguity: 32% [========--------] NOT READY for specification
  Goal clarity:             75/100 ****
  Constraint clarity:       60/100 ***
  Success criteria clarity: 45/100 ** <-- weakest
  Context clarity:          70/100 ***
Next questions will target: success criteria
```

## Score Persistence

Save scores in `workflow/ambiguity_scores.yaml`:
```yaml
scores:
  - phase: empathize
    goal_clarity: 30
    constraint_clarity: 15
    success_criteria_clarity: 10
    context_clarity: 25
    composite_ambiguity: 80
  - phase: define
    goal_clarity: 60
    constraint_clarity: 45
    success_criteria_clarity: 35
    context_clarity: 50
    composite_ambiguity: 51
```
