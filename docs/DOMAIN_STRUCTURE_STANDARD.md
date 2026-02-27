# Domain Structure Standard

**Status**: Current Super-Domain Standard
**Last Updated**: 2026-02-05

## Super-Domain Structure

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

## Super-Domains

Current official super-domains:

| Super-Domain | Purpose | Agents | Key Controllers |
|--------------|---------|--------|-----------------|
| **make** | Creation | 111 | engineering-manager, architect, creative-director, game-designer |
| **grow** | Acquisition | 38 | marketing-strategist, sales-strategist, campaign-manager |
| **operate** | Operations | 13 | operations-manager, business-analyst, change-manager |
| **people** | Talent | 20 | chro, hr-manager, talent-acquisition |
| **serve** | Support & Governance | 28 | customer-success-manager, general-counsel, support-manager |
| **shared** | Cross-domain | 14 | compliance-officer, data-scientist, quality-manager |
| **core** | Infrastructure | 14 | orchestrator, trigger, universal-* agents |

**Total**: 238 agents across 7 directories (5 super-domains + shared + core)

---

## Super-Domain Details

### Make (111 agents)
Combines: Engineering + Creative + Product + DevOps + QA + Game Development

**Includes**:
- Engineering: backend-developer, frontend-developer, architect, etc.
- Creative: story-architect, narrative-designer, editor, etc.
- Product: product-owner, project-manager, etc.
- Game Dev: game-designer, level-designer, animator, etc.

### Grow (38 agents)
Combines: Marketing + Sales + Partnerships

**Includes**:
- Marketing: marketing-strategist, content-marketing-manager, seo-specialist
- Sales: sales-strategist, account-executive, sales-operations-manager
- Growth: growth-marketer, demand-generation-manager

### Operate (13 agents)
Combines: Finance + Operations + Procurement

**Includes**:
- Operations: operations-manager, process-improvement-specialist
- Finance: business-analyst, risk-manager
- Supply Chain: supply-chain-manager, procurement-specialist

### People (20 agents)
Combines: HR + Culture + Talent Acquisition

**Includes**:
- HR: chro, hr-business-partner, hr-operations-manager
- Talent: recruiter, talent-acquisition-manager
- Development: learning-and-development-manager

### Serve (28 agents)
Combines: Customer Experience + Legal + Compliance + Support

**Includes**:
- Support: support-manager, customer-support-rep, technical-support-engineer
- Legal: general-counsel, legal-analyst, contracts-manager
- Compliance: compliance-manager, privacy-officer

---

## Shared Config Inheritance

Domain configs for executor, validator, and self_correct use a base template pattern:

```yaml
# Example: make/config/executor_config.yaml
_base: shared/config/base_executor_config.yaml

super_domain: make
description: Execution monitoring for MAKE super-domain

domain_specific_monitoring:
- Code compilation and build success
- Test suite execution results
- Creative deliverable quality review
```

Base templates live in `shared/config/`:
- `base_executor_config.yaml` — Shared monitoring patterns
- `base_validator_config.yaml` — Shared quality gates
- `base_self_correct_config.yaml` — Shared coordination failure recovery

---

## Historical Note

**Legacy Domain Names** (Deprecated):
The following domain names were used historically and have been consolidated into super-domains:
- engineering → make
- revenue → grow
- creative → make
- finance-operations → operate
- people-culture → people
- customer-experience → serve
- legal-compliance → serve

---

## Creating New Domains

See CLAUDE.md "Creating Domains" section for instructions on:
1. Creating 5 config files (with `_base` references to shared templates)
2. Creating controller_catalog in planner_config.yaml
3. Creating controller and execution agents
4. Creating plugin manifest

---

**Version**: 8.5.2
