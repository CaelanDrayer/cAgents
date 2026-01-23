# Domain Structure Standard (V7.5.1)

**Status**: V7.5.1 Super-Domain Standard
**Last Updated**: 2026-01-22

## V7.5.1 Super-Domain Structure

All domains follow this structure:

```
{domain}/
├── .claude-plugin/
│   └── plugin.json          # Domain plugin manifest
├── agents/
│   ├── {agent-name}.md      # Agent definitions (with tier field)
│   └── ...
├── config/                  # Domain-specific configs (V7.5.1+)
│   ├── planner_config.yaml  # Controller catalog + planning templates
│   ├── router_config.yaml   # Routing patterns
│   ├── executor_config.yaml # Execution patterns
│   ├── validator_config.yaml # Validation rules
│   └── self_correct_config.yaml # Recovery patterns
└── README.md                # Domain overview (optional)
```

### Required Files

**1. `.claude-plugin/plugin.json`**
- Defines plugin metadata
- Lists all agents in the domain
- Specifies dependencies

**2. `agents/{agent-name}.md`**
- Agent definition with YAML frontmatter
- **MUST include `tier` field** (controller, execution, or infrastructure)
- Tools, model, description

**3. `config/*.yaml` (V7.5.1)**
- Domain-specific planner, router, executor, validator, self-correct configs
- Use YAML anchors for shared patterns (see planner_config optimization)

---

## V7.5.1 Super-Domains

Current official super-domains:

| Super-Domain | Purpose | Agents | Key Controllers |
|--------------|---------|--------|-----------------|
| **make** | Creation | 108 | engineering-manager, architect, creative-director, game-designer |
| **grow** | Acquisition | 37 | marketing-strategist, sales-strategist, campaign-manager |
| **operate** | Operations | 13 | operations-manager, business-analyst, change-manager |
| **people** | Talent | 19 | chro, hr-manager, talent-acquisition |
| **serve** | Support & Governance | 28 | customer-success-manager, general-counsel, support-manager |
| **shared** | Cross-domain | 14 | compliance-officer, data-scientist, quality-manager |
| **core** | Infrastructure | 12 | orchestrator, trigger, universal-* agents |

**Total**: 231 agents across 7 directories (5 super-domains + shared + core)

---

## Super-Domain Details

### Make (108 agents)
Combines: Engineering + Creative + Product + DevOps + QA + Game Development

**Includes**:
- Engineering: backend-developer, frontend-developer, architect, etc.
- Creative: story-architect, narrative-designer, editor, etc.
- Product: product-owner, project-manager, etc.
- Game Dev: game-designer, level-designer, animator, etc.

### Grow (37 agents)
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

### People (19 agents)
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

## Historical Note

**V7.0 Domain Names** (Deprecated):
The following domain names were used in V7.0 and have been consolidated into super-domains:
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
1. Creating 5 config files
2. Creating controller_catalog in planner_config.yaml
3. Creating controller and execution agents
4. Creating plugin manifest

---

**Version**: V7.5.1
**Previous**: V7.0.1 (deprecated domain names)
