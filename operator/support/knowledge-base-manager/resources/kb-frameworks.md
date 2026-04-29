# Knowledge Base Frameworks

## KB Architecture

```yaml
taxonomy:
  getting_started:
    - Quick start guides
    - Onboarding tutorials
    - First-time walkthroughs

  features_how_to:
    by_feature:
      - Overview, tutorials, advanced use, troubleshooting

  troubleshooting:
    by_symptom:
      - Login issues, data sync, performance, errors

  integrations:
    by_tool:
      - Integration guides, API docs, webhooks

  account_billing:
    - Account management, subscriptions, security

  faq:
    - General questions, pricing, best practices
```

## Article Templates

### How-To Guide
```markdown
# How to [Complete Task]

[Brief description]

## Before You Begin
- Prerequisite 1
- Prerequisite 2

## Step-by-Step
1. [Step with screenshot]
2. [Step]
3. [Step]

## What's Next?
[Related tasks]

## Related Articles
- [Link 1]
- [Link 2]
```

### Troubleshooting Guide
```markdown
# Troubleshooting: [Problem]

## Symptoms
- [Symptom 1]
- [Symptom 2]

## Common Causes
- [Cause 1]
- [Cause 2]

## Solutions
### Solution 1: [Most Common Fix]
[Steps]

### Solution 2: [Alternative]
[Steps]

## Still Need Help?
[Escalation path]
```

## Prioritization Matrix

```yaml
priority_score: (frequency × deflection_potential) + impact

example:
  topic: "Password Reset"
  frequency: 9/10 (100+ tickets/month)
  deflection_potential: 10/10 (highly self-serviceable)
  impact: 7/10 (moderate frustration)
  score: (9 × 10) + 7 = 97 (HIGH PRIORITY)
```

## SEO Best Practices

**Titles** (<60 chars):
- Start with action: "How to", "What is", "Troubleshooting"
- Include keywords
- Be specific

**Descriptions** (150-160 chars):
- Summarize content
- Include secondary keywords

**Content**:
- Use headers (H2, H3)
- Include keywords naturally
- Bullet points and lists
- Alt text for images

## Performance Metrics

```yaml
article_analytics:
  views: Total pageviews
  helpfulness_rating: % positive
  contact_support_rate: % who contacted after
  deflection_score: (views × helpfulness) - support_clicks

kb_metrics:
  deflection_rate: 40% target
  avg_helpfulness: 78%
  self_service_ratio: KB-resolved / tickets
```

## Content Review Cycle

- **Monthly**: Review top ticket categories, update high-traffic articles
- **Quarterly**: Audit all articles for accuracy, archive obsolete
- **On Release**: Update for product changes, create new feature docs
