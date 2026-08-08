# /team - N-Wave Parallel Team Execution

## Usage
```bash
/team <request>
/team Implement OAuth2 authentication     # 5-7 waves
/team Build user dashboard --dry-run      # Preview wave structure
/team Build feature --waves 8             # Force minimum 8 waves
/act Build feature --team                 # Team mode via /act flag
```

## How It Works

1. Lead performs enrichment (Wave 0)
2. Decomposes work into parallel waves
3. Per wave: spawns fresh teammates, validates GATE on completion
4. Lead integrates results (final wave)

## Wave Structure
```
Wave 0 (Lead): Enrichment + bootstrap
Wave 1..N-1 (Teammates): Per-wave spawn, parallel within wave
Wave N (Lead): Integration + final validation
```

## Wave Counts by Tier
| Tier | Minimum | Typical |
|------|---------|---------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

## Domain Keywords
| Domain | Keywords |
|--------|----------|
| Engineering | fix, implement, code, api, database, deploy, devops |
| Creative | write, story, narrative, design, game art, audio |
| Business | campaign, marketing, sales, budget, operations, product |
| People | hire, recruit, onboard, HR, culture, talent |
| Service | support, legal, compliance, customer, SLA |

## Fallback
Unsuitable requests (<3 work items or all sequential) auto-delegate to `/act`.

## Context Mode
`context: fork` -- runs in a forked context with agent teams.
