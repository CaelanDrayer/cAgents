# Demand Generation Templates

## Program Plan

```yaml
objectives:
  - Pipeline goal: $X
  - MQL target: Y leads/month
  - Target CAC: $Z
  - MQL to SQL conversion: W%

target_audience:
  - ICP definition
  - Persona prioritization
  - Account lists (ABM)

campaign_mix:
  - Content offers: [Ebooks, whitepapers]
  - Webinar series: [Topics, dates]
  - Paid campaigns: [Channels, budget]
  - Email nurture: [Sequences, triggers]

metrics:
  - Lead volume
  - MQL volume
  - Conversion rates
  - Cost per MQL
  - Pipeline contribution
```

## Nurture Sequence Spec

```yaml
sequence_name: "Product Introduction"
trigger: Downloaded Product ebook
audience: Prospects not yet MQL

emails:
  email_1:
    delay: Immediate
    content: Thank you, resource link
    cta: "Watch Demo Video"

  email_2:
    delay: 3 days
    content: Customer success story
    cta: "Read Case Study"

  email_3:
    delay: 7 days
    content: Competitive comparison
    cta: "See Full Comparison"

  email_4:
    delay: 14 days
    content: Demo invitation
    cta: "Book a Demo"

exit_criteria:
  - Becomes MQL
  - Unsubscribes
  - No engagement after 30 days
```

## Lead Scoring Model

| Attribute | Points |
|-----------|--------|
| **Demographic** | |
| Job title match | +20 |
| Company size fit | +15 |
| Industry match | +10 |
| **Behavioral** | |
| Demo request | +50 |
| Pricing page visit | +30 |
| Content download | +15 |
| Email click | +5 |
| **MQL Threshold** | **75** |
