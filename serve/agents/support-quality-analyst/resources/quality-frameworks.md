# Quality Assurance Frameworks

## Quality Rubric (100 points)

### Accuracy (30 points)
| Dimension | Points | Criteria |
|-----------|--------|----------|
| Understanding | 10 | Correctly identified customer issue |
| Information | 10 | Gathered all necessary details |
| Solution | 10 | Provided correct, complete resolution |

### Communication (30 points)
| Dimension | Points | Criteria |
|-----------|--------|----------|
| Clarity | 10 | Clear, organized, easy to understand |
| Tone | 10 | Professional, empathetic, friendly |
| Grammar | 10 | Proper spelling, grammar, punctuation |

### Resolution (25 points)
| Dimension | Points | Criteria |
|-----------|--------|----------|
| Thoroughness | 10 | Addressed all aspects of issue |
| Documentation | 8 | KB links, screenshots, context |
| Follow-up | 7 | Proactive about next steps |

### Efficiency (15 points)
| Dimension | Points | Criteria |
|-----------|--------|----------|
| Response Time | 5 | Met SLA expectations |
| Resolution Time | 5 | Solved efficiently |
| Steps | 5 | Minimal unnecessary back-and-forth |

## Quality Tiers

| Tier | Score | Action |
|------|-------|--------|
| Excellent | 90-100 | Share as model |
| Good | 80-89 | Minor coaching |
| Needs Improvement | 70-79 | Coaching required |
| Below Standard | <70 | Immediate intervention |

## Ticket Review Process

### Selection Method
- Random sample of 5-10 tickets per agent per week
- Stratified across ticket types
- Include mix of channels
- Flag escalations for review

### Review Workflow
1. Read full ticket thread
2. Score each dimension
3. Write specific feedback (positive + improvement)
4. Meet with agent (15-30 min)
5. Document scores and action items

## Feedback Template

```yaml
ticket_review:
  ticket_id: "#12345"
  agent: "Jane Smith"
  overall_score: 85/100 (Good)

  strengths:
    - "Excellent empathy shown"
    - "Clear step-by-step instructions"
    - "Proactive follow-up offered"

  improvements:
    - "Initial response could be faster"
    - "Add KB article link"
    - "Minor typo in response"

  action_items:
    - "Review KB searching tips"
    - "Use grammar checking tool"

  coaching_notes: "Focus on efficiency through KB usage"
```

## Coaching Approach

### 1-on-1 Session Structure
1. Start positive: What went well
2. Review feedback: Walk through specifics
3. Collaborate: Ask for perspective
4. Action plan: 1-2 focus areas
5. Support: Offer resources

### Techniques
- **Specific**: "In line 3, try X instead of Y"
- **Actionable**: "Use this template"
- **Balanced**: 2:1 positive to improvement
- **Growth-focused**: Emphasize learning

## Calibration Sessions (Monthly)

### Purpose
Ensure consistent scoring across reviewers

### Process
1. Select 3-5 tickets
2. All reviewers score independently
3. Compare scores and discuss discrepancies
4. Align on standards
5. Update rubric if needed

## Trend Analysis

### Individual Patterns
- Recurring issues (tone, accuracy)
- Improvement trends
- Strengths to leverage

### Team Patterns
- Common gaps
- Communication issues
- Process gaps
- Channel differences
