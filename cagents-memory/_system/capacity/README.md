# Capacity Management System

## Overview

Track IC capacity per domain to prevent oversubscription and enable intelligent assignment.

## Structure

```
capacity/
├── backend/team.yaml
├── frontend/team.yaml
├── qa/team.yaml
├── devops/team.yaml
├── data/team.yaml
├── security/team.yaml
└── system_wide.yaml
```

## Team Capacity File Format

```yaml
domain: backend
last_updated: 2026-01-10T15:00:00Z

team_members:
  backend-developer:
    availability: 8h_per_day
    current_allocation:
      - task: TT2.1
        estimated_remaining: 4h
      - task: TT2.2
        estimated_remaining: 8h
    total_committed: 12h
    capacity_used: 75%
    available_from: 2026-01-12
  
  senior-developer:
    availability: 8h_per_day
    current_allocation:
      - task: TT2.4
        estimated_remaining: 6h
    total_committed: 6h
    capacity_used: 37.5%
    available_from: 2026-01-11

domain_capacity:
  total: 16h_per_day
  utilized: 12h_per_day
  utilization: 75%
  
  forecast_next_3_days:
    2026-01-11: 75%
    2026-01-12: 50%
    2026-01-13: 25%
```

## Utilization Thresholds

- **< 75%**: Healthy, accept new work
- **75-85%**: Moderate, accept with caution
- **85-95%**: High, warn Domain Lead
- **> 95%**: Critical, escalate to Tech Lead for rebalancing

## Capacity Forecasting

3-day lookahead helps Domain Leads predict when capacity frees up.

## Update Frequency

Domain Leads update capacity:
- Daily (during active instructions)
- When tasks completed
- When new tasks assigned
- When priorities change

## System-Wide Capacity

```yaml
# capacity/system_wide.yaml
total_capacity: 64h_per_day  # All domains combined
current_utilization: 75%
available_capacity: 16h_per_day

per_domain:
  backend: 75%
  frontend: 60%
  qa: 50%
  devops: 40%
  data: 30%
  security: 20%

alerts:
  - domain: backend
    utilization: 95%
    action: "Consider rebalancing or deferring new work"
```
