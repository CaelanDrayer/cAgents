# Domain Structure Standard

**Status**: HISTORICAL (V10.1.0 — describes the pre-v11.1.0 13-domain layout)
**Last Updated**: 2026-02-28

> **Outdated as of v11.1.0**: The 13-domain layout this document describes was replaced by the **9 builder-role archetype tree** in v11.1.0 (canonical since). For the current architecture, see:
> - [docs/architecture/domains.md](architecture/domains.md) — 9 archetypes (developer/operator/advisor/analyst/creator/writer/strategist/core/leadership), 144 agents post-v12.4.0 P2 compression
> - [`.claude/rules/core/skill-format.md`](../.claude/rules/core/skill-format.md) — the v11.1.0+ `archetype:` + `branch:` frontmatter schema (the legacy top-level `domain:` field was REMOVED in v11.1.0 and `validate-agents.sh` rejects it as an error)
>
> Two legacy domain dirs (`people/` and `shared/`) survive on disk as routing-config-only overlays; the other 11 were deleted in v12 W4.2 and consolidated into `cagents-memory/_system/config/routing.yaml`. This document is preserved for historical context only.

## Business Domain Structure (V10.1.0 — historical)

All domains follow this structure:

```
{domain}/
├── .claude-plugin/
│   └── plugin.json          # Domain plugin manifest
├── agents/
│   ├── {agent-name}/        # Directory-based agents (SKILL.md + resources/)
│   ├── {agent-name}.md      # Single-file agents
│   └── ...
├── config/                  # Domain-specific configs
│   ├── planner_config.yaml  # Controller catalog + planning templates
│   ├── router_config.yaml   # Routing patterns
│   ├── executor_config.yaml # Execution patterns (inherits shared/config/base_executor_config.yaml)
│   ├── validator_config.yaml # Validation rules (inherits shared/config/base_validator_config.yaml)
│   └── self_correct_config.yaml # Recovery patterns (inherits shared/config/base_self_correct_config.yaml)
└── README.md                # Domain overview (optional)
```

### Required Files

**1. `.claude-plugin/plugin.json`**
- Defines plugin metadata
- Lists all agents in the domain
- Specifies dependencies

**2. `agents/{agent-name}.md` or `agents/{agent-name}/SKILL.md`**
- Agent definition with YAML frontmatter
- **MUST include `tier` field** (controller, execution, or support)
- Tools, model, description
- Directory-based agents use progressive disclosure (SKILL.md + resources/)

**3. `config/*.yaml`**
- Domain-specific planner, router, executor, validator, self-correct configs
- Executor, validator, and self_correct configs inherit shared base templates via `_base` field
- Use YAML anchors for shared patterns (see planner_config optimization)

---

## Business Domains (V10.1.0)

Current official business domains:

| Domain | Purpose | Agents | Key Controllers |
|--------|---------|--------|-----------------|
| **engineering** | Software engineering | 31 | tech-lead, architect, tech-lead |
| **creative** | Creative production | 30 | narrative-director, story-architect, editor |
| **business** | Business operations | 28 | operations-manager, product-owner, strategic-planner |
| **growth** | Revenue & acquisition | 34 | marketing-strategist, sales-strategist, creative-director |
| **people** | Talent & culture | 17 | hr-manager, talent-acquisition-manager |
| **service** | Support & governance | 28 | customer-success-manager, general-counsel, support-director |
| **leadership** | C-suite & strategy | 12 | cto, cro, cfo, coo, chro, ceo, cpo, cmo, cco, cso, clo, vp-engineering |
| **shared** | Cross-domain intelligence | 12 | bi-specialist, data-scientist, market-research-analyst |
| **science** | STEM research | 10 | science-coordinator, physicist, biologist |
| **health** | Medical & wellness | 5 | health-coordinator, medical-advisor |
| **education** | Teaching & tutoring | 5 | education-coordinator, academic-tutor |
| **personal** | Career & life coaching | 5 | personal-coach-lead, career-counselor |
| **arts** | Visual arts & music | 5 | arts-director, music-producer |
| **trades** | Culinary & construction | 5 | trades-coordinator, chef |
| **core** | Infrastructure | 17 | orchestrator, trigger, universal-* agents |

**Total**: 243 agents across 15 directories (13 business domains + shared + core).
Sum: 31+30+28+34+17+28+11+12+10+5+5+5+5+5+17 = 243.

---

## Domain Details

### Engineering (31 agents)
Software engineering: backend, frontend, DevOps, QA, security

**Includes**:
- Engineering: backend-developer, frontend-developer, architect, etc.
- DevOps: devops-engineer, infrastructure-engineer
- Quality: qa-lead, qa-tester, reviewer
- Security: security-specialist

### Creative (30 agents)
Creative production: storytelling, game development, design

**Includes**:
- Narrative: story-architect, narrative-designer, editor
- Game Dev: game-designer, level-designer, animator
- Visual: ui-designer, ux-designer

### Business (28 agents)
Business operations: product, finance, procurement, operations

**Includes**:
- Product: product-owner, project-manager
- Finance: financial-analyst, risk-manager
- Operations: operations-manager, process-improvement-specialist
- Supply Chain: supply-chain-manager, procurement-specialist

### Growth (34 agents)
Revenue & acquisition: marketing, sales, partnerships

**Includes**:
- Marketing: marketing-strategist, content-marketing-manager, seo-specialist
- Sales: sales-strategist, account-executive, revenue-operations-manager
- Growth: growth-marketer, demand-generation-manager

### People (0 agents — config-only)
The legacy `people/` domain is **routing-overlay only** as of v11.1.0 — the directory holds `config/domain_overrides.yaml` (router keywords + controller catalog) but ships zero SKILL.md files. People-domain requests route through this overlay to active agents under the `operator/people-ops/` archetype branch (hr-manager, talent-acquisition-manager, recruiter, compensation-analyst, learning-specialist, etc.). See CLAUDE.md § "Domain overlay (legacy — routing/config only)" for the full overlay model.

### Service (28 agents)
Support & governance: customer experience, legal, compliance

**Includes**:
- Support: support-manager, customer-support-rep, technical-support-engineer
- Legal: general-counsel, legal-analyst, contracts-manager
- Compliance: compliance-manager, privacy-officer

### Leadership (11 agents)
C-suite strategy and executive coordination

**Includes**:
- C-Suite: cto, cro, cfo, coo, chro, ceo
- Strategy: chief-of-staff, strategy-director

---

## Shared Config Inheritance

Domain configs for executor, validator, and self_correct use a base template pattern:

```yaml
# Example: engineering/config/executor_config.yaml
_base: shared/config/base_executor_config.yaml

domain: engineering
description: Execution monitoring for engineering domain

domain_specific_monitoring:
- Code compilation and build success
- Test suite execution results
- Security scan results
```

Base templates live in `shared/config/`:
- `base_executor_config.yaml` — Shared monitoring patterns
- `base_validator_config.yaml` — Shared quality gates
- `base_self_correct_config.yaml` — Shared coordination failure recovery

---

## Legacy Directories (Removed)

The v9.x super-domain directories (`make/`, `grow/`, `operate/`, `serve/`) were removed in v10.6.0. Their agents were redistributed into focused business domains during the v10.0.0 restructure. The platform has since expanded to 15 domains (13 business domains + shared + core).

---

## Creating New Domains

See CLAUDE.md "Creating Domains" section for instructions on:
1. Creating 5 config files (with `_base` references to shared templates)
2. Creating controller_catalog in planner_config.yaml
3. Creating controller and execution agents
4. Creating plugin manifest

---

**Version**: 10.1.0
