> Sub-resource for mode `operations` — relocated verbatim from `agents/operator/business-ops/operations-manager/resources/ops-frameworks.md` (zero-loss consolidation).

# Operations Frameworks & Templates

## Operations Dashboard Template

```yaml
Daily Operations Dashboard:
  Production:
    - Units produced: [actual vs target]
    - Quality rate: [defect %]
    - Downtime: [hours and causes]
  
  Resources:
    - Headcount: [actual vs plan]
    - Equipment utilization: [%]
    - Materials consumption: [vs plan]
  
  Service:
    - Orders processed: [actual vs target]
    - Customer wait time: [avg minutes]
    - Backlog: [items pending]
  
  Financials:
    - Daily cost: [vs budget]
    - Revenue generated: [vs target]
    - Variance: [favorable/unfavorable]
```

## Lean 8 Wastes (DOWNTIME)

| Waste | Description | Example | Countermeasure |
|-------|-------------|---------|----------------|
| **D**efects | Errors requiring rework | Software bugs | Quality at source, testing |
| **O**verproduction | Making more than needed | Excess inventory | Pull systems, JIT |
| **W**aiting | Idle time between steps | Approval delays | Workflow automation |
| **N**on-utilized talent | Underusing skills | Admin doing analysis | Skill mapping, delegation |
| **T**ransportation | Unnecessary movement | Multiple handoffs | Process consolidation |
| **I**nventory | Excess materials/WIP | Stockpiles | Kanban, reorder points |
| **M**otion | Unnecessary movement | System navigation | UX design, shortcuts |
| **E**xtra processing | More work than needed | Over-engineering | Requirements clarity |

## Process Improvement ROI

```
ROI = (Benefit - Cost) / Cost × 100

Benefit Calculation:
- Time saved (hours) × hourly rate
- Error reduction × cost per error
- Capacity freed × utilization rate

Example:
- Process improvement saves 2 hrs/day × $50/hr = $100/day = $36,500/year
- Implementation cost: $10,000
- ROI = ($36,500 - $10,000) / $10,000 = 265%
- Payback period: 3.4 months
```

## Capacity Planning Formula

```
Required Capacity = (Demand × Cycle Time) / (Availability × OEE)

Where:
- Demand = Units per period
- Cycle Time = Time per unit
- Availability = % of time available (shifts, hours)
- OEE = Overall Equipment Effectiveness

OEE = Availability × Performance × Quality
     = (Uptime/Planned time) × (Actual rate/Ideal rate) × (Good units/Total units)
```
