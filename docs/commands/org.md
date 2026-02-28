# /org - Corporate Hierarchy Orchestration

## Usage
```bash
/org <request>
/org Launch new product with campaign     # Full hierarchy
/org Fix auth bug                         # Single /run with strategic brief
/org Restructure engineering team         # Multi-domain (engineering + people)
/org Migrate to microservices --dry-run   # Preview routing decision
```

## How It Works

1. CEO performs inline strategic analysis
2. C-suite agents analyze in dependency order (Wave 1: independent, Wave 2: dependent)
3. Two-phase deliberation (analysis phase + objection phase)
4. Strategic brief generation
5. Sequential /team execution per affected domain

## 6-State Pipeline
```
INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE
```

## C-Suite Agents (leadership/)
CEO, CTO, CFO, CMO, CRO, COO, CCO, CPO, CHRO, CSO

## Domain Routing
| Domain Key | C-Suite | Keywords |
|-----------|---------|----------|
| engineering | CTO | fix, bug, implement, code, api, deploy |
| creative | CCO | write, story, content, design, narrative |
| business | CPO/CRO/CFO/COO | campaign, marketing, sales, budget, product |
| people | CHRO | hire, recruit, onboard, HR, culture |
| service | General Counsel | support, legal, compliance, customer |

## Context Mode
`context: none` -- runs inline because subagents cannot spawn other subagents.
