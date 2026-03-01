# Domain Structure Standard

**Status**: Current Business Domain Standard (V10.1.0)
**Last Updated**: 2026-02-28

## Business Domain Structure

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
| **engineering** | Software engineering | 33 | engineering-manager, architect, tech-lead |
| **creative** | Creative production | 24 | creative-director, game-designer, story-architect |
| **business** | Business operations | 33 | operations-manager, business-analyst, product-owner |
| **growth** | Revenue & acquisition | 36 | marketing-strategist, sales-strategist, campaign-manager |
| **people** | Talent & culture | 19 | chro, hr-manager, talent-acquisition |
| **service** | Support & governance | 33 | customer-success-manager, general-counsel, support-manager |
| **leadership** | C-suite & strategy | 10 | cto, cro, cfo, coo, chro, ceo |
| **shared** | Cross-domain utilities | 4 | compliance-officer, data-scientist |
| **core** | Infrastructure | 15 | orchestrator, trigger, universal-* agents |

**Total**: 207 agents across 9 directories (7 business domains + shared + core)

---

## Domain Details

### Engineering (33 agents)
Software engineering: backend, frontend, DevOps, QA, security

**Includes**:
- Engineering: backend-developer, frontend-developer, architect, etc.
- DevOps: devops-engineer, infrastructure-engineer
- Quality: qa-lead, qa-tester, reviewer
- Security: security-specialist

### Creative (24 agents)
Creative production: storytelling, game development, design

**Includes**:
- Narrative: story-architect, narrative-designer, editor
- Game Dev: game-designer, level-designer, animator
- Visual: ui-designer, ux-designer

### Business (33 agents)
Business operations: product, finance, procurement, operations

**Includes**:
- Product: product-owner, project-manager
- Finance: financial-analyst, risk-manager
- Operations: operations-manager, process-improvement-specialist
- Supply Chain: supply-chain-manager, procurement-specialist

### Growth (36 agents)
Revenue & acquisition: marketing, sales, partnerships

**Includes**:
- Marketing: marketing-strategist, content-marketing-manager, seo-specialist
- Sales: sales-strategist, account-executive, sales-operations-manager
- Growth: growth-marketer, demand-generation-manager

### People (19 agents)
Talent & culture: HR, talent acquisition, learning & development

**Includes**:
- HR: chro, hr-business-partner, hr-operations-manager
- Talent: recruiter, talent-acquisition-manager
- Development: learning-and-development-manager

### Service (33 agents)
Support & governance: customer experience, legal, compliance

**Includes**:
- Support: support-manager, customer-support-rep, technical-support-engineer
- Legal: general-counsel, legal-analyst, contracts-manager
- Compliance: compliance-manager, privacy-officer

### Leadership (10 agents)
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

## Legacy Directories (Archives)

The following directories are preserved as archives from the v9.x era (5 super-domain model).
**Do not delete. Do not modify. Read-only archives.**

| Archive Directory | Former Purpose |
|-------------------|----------------|
| `make/` | Engineering + Creative + Game Dev (111 agents) |
| `grow/` | Marketing + Sales (38 agents) |
| `operate/` | Finance + Operations (13 agents) |
| `serve/` | Support + Legal + Compliance (28 agents) |

The v10.0.0 restructure redistributed these agents into the 8 new business domains.

---

## Creating New Domains

See CLAUDE.md "Creating Domains" section for instructions on:
1. Creating 5 config files (with `_base` references to shared templates)
2. Creating controller_catalog in planner_config.yaml
3. Creating controller and execution agents
4. Creating plugin manifest

---

**Version**: 10.1.0
