# Litigation Management Frameworks

## Litigation Assessment Template

```markdown
# Litigation Assessment Memo

**Case**: [Name]
**Court**: [Venue]
**Date**: [Date]

## Executive Summary
- Claims summary
- Likelihood of success
- Potential damages
- Recommended strategy

## Background
- Parties
- Facts
- Claims

## Legal Analysis
- For each claim: theory, defense, assessment, risk

## Damages Analysis
- Claimed damages
- Likely recoverable

## Discovery Status
- Completed
- Pending
- Key evidence (favorable/unfavorable)

## Litigation Costs
- To date
- Estimated to trial
- Total projected

## Settlement Analysis
- Expected value calculation
- Settlement range
- Strategy

## Recommendations
1. [Action item]
```

## Litigation Hold Notice

```markdown
# Litigation Hold Notice

**To**: [Recipients]
**From**: Legal Department
**Date**: [Date]
**Re**: Litigation Hold - [Case]

## Purpose
Preserve all documents related to [subject] due to pending litigation.

## Scope
[Specific topics, parties, timeframe]

## What to Preserve
- Electronic data
- Paper documents
- Other media

## What NOT to Do
- Do NOT delete
- Do NOT alter
- Do NOT use auto-delete

## Duration
Until written notice from legal.
```

## E-Discovery Workflow

1. **Identification**: Custodians and data sources
2. **Preservation**: Litigation hold, suspend deletion
3. **Collection**: Gather from custodians, servers
4. **Processing**: De-dupe, filter, convert
5. **Review**: Relevance, privilege, responsiveness
6. **Production**: Bates number, privilege log

## Settlement Value Calculation

```yaml
expected_value:
  formula: (Prob_Win × Damages_Win) - (Prob_Loss × Damages_Loss) - Trial_Costs

settlement_range:
  lower: Expected value - risk premium (certainty value)
  upper: Expected value + distraction costs

decision: Settle if offer < expected_value
```

## Escalation Criteria

**To General Counsel**:
- Value >$1M
- Settlement authority >$500K
- Novel legal issues
- Media attention

**To Board**:
- Material litigation
- Bet-the-company cases
- Major settlements
