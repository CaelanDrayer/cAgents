# Capacity Planning Frameworks

## Capacity Assessment Template

```markdown
# Capacity Assessment: [System/Resource]

## Current State
- Current capacity: [X units]
- Current utilization: [X%]
- Peak utilization: [X%]
- Capacity headroom: [X%]

## Demand Forecast
| Period | Forecast | Growth | Confidence |
|--------|----------|--------|------------|
| Q1 | X | +X% | High |
| Q2 | X | +X% | Medium |
| H2 | X | +X% | Low |

## Capacity Gaps
| Gap | Impact | Timeline |
|-----|--------|----------|
| [Gap] | [Impact] | [When] |

## Recommendations
| Action | Capacity Added | Cost | Timeline |
|--------|---------------|------|----------|
| [Action] | +X | $X | [Date] |
```

## Forecasting Methods

### Top-Down
1. Start with business growth projections
2. Translate to capacity requirements
3. Validate against historical ratios

### Bottom-Up
1. Analyze historical usage patterns
2. Apply growth factors
3. Aggregate to total demand

### Hybrid
1. Both top-down and bottom-up
2. Reconcile differences
3. Use for validation

## Capacity Modeling

### Input Variables
- Historical usage data
- Growth projections
- Seasonality patterns
- One-time events (launches, campaigns)

### Buffer Calculation
```yaml
buffer_formula:
  base_buffer: 20%  # Standard headroom
  variability_buffer: Based on demand variability
  safety_buffer: Risk tolerance factor

  total_buffer: base + variability + safety
```

### Scenario Planning
| Scenario | Growth | Capacity Need |
|----------|--------|---------------|
| Conservative | +10% | X |
| Base | +20% | X |
| Aggressive | +40% | X |

## Lead Time Considerations

| Resource Type | Lead Time |
|---------------|-----------|
| Cloud compute | Hours-Days |
| Physical servers | Weeks-Months |
| Facilities | Months-Years |
| Team hiring | Months |

## Utilization Targets

| Type | Target | Max |
|------|--------|-----|
| Compute | 60-70% | 80% |
| Storage | 70-80% | 90% |
| Network | 40-50% | 70% |
| Team | 70-80% | 90% |

## Continuous Monitoring

### Key Metrics
- Utilization (current, trend)
- Queue depth / wait time
- Resource saturation
- Cost efficiency

### Alert Thresholds
- Warning: 70% utilization
- Critical: 85% utilization
- Emergency: 95% utilization
