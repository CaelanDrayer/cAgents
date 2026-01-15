# Domain Structure Standard (V7.0)

**Status**: V7.0 Standard established
**Last Updated**: 2026-01-13

## V7.0 Standard Domain Structure

All new domains MUST follow this structure:

```
{domain}/
├── .claude-plugin/
│   └── plugin.json          # Domain plugin manifest
├── agents/
│   ├── {agent-name}.md      # Agent definitions (with tier field)
│   └── ...
├── package.json             # Domain metadata (v7.0.1)
└── README.md                # Domain overview (optional)
```

### Required Files

**1. `.claude-plugin/plugin.json`**
- Defines plugin metadata
- Lists all agents in the domain
- Specifies dependencies

**2. `agents/{agent-name}.md`**
- Agent definition with YAML frontmatter
- **MUST include `tier` field** (controller, execution, or support)
- Tools, model, description

**3. `package.json`**
- Domain version (MUST match root: v7.0.1)
- Domain description
- Keywords

### Deprecated Structures

**V2 Domain Structure** (DEPRECATED):
```
{domain}/
├── .claude-plugin/
├── agents/
├── commands/         # ❌ DEPRECATED
├── skills/           # ❌ DEPRECATED
├── package.json
└── README.md
```

**Why Deprecated**:
- commands/ and skills/ are replaced by universal workflow agents
- V7.0 uses agent-only structure with controller-centric coordination
- Old structure adds maintenance overhead

---

## V7.0 Canonical Domains

Current official domains (from `package.json`):

| Domain | Status | Structure | Agents |
|--------|--------|-----------|--------|
| **engineering** | ✅ V7.0 | agents/ only | 45 |
| **revenue** | ✅ V7.0 | agents/ only | 40 |
| **creative** | ✅ V7.0 | agents/ only | 18 |
| **finance-operations** | ✅ V7.0 | agents/ only | 32 |
| **people-culture** | ✅ V7.0 | agents/ only | 19 |
| **customer-experience** | ✅ V7.0 | agents/ only | 18 |
| **legal-compliance** | ✅ V7.0 | agents/ only | 14 |
| **shared** | ✅ V7.0 | agents/ only | 33 |
| **core** | ✅ V7.0 | agents/ only | 11 |

**Total**: 230 agents across 9 domains

---

## Legacy V2 Domains (To Be Migrated)

These domains use old V2 structure and should be gradually migrated:

| Domain | Status | Structure | Replacement |
|--------|--------|-----------|-------------|
| **business** | ⚠️ V2 | commands/skills | revenue? |
| **hr** | ⚠️ V2 | commands/skills | people-culture |
| **legal** | ⚠️ V2 | commands/skills | legal-compliance |
| **marketing** | ⚠️ V2 | commands/skills | revenue |
| **sales** | ⚠️ V2 | commands/skills | revenue |
| **support** | ⚠️ V2 | commands/skills | customer-experience? |
| **planning** | ⚠️ V2 | commands/skills | shared? |
| **software** | ⚠️ V2 | commands/skills | engineering? |

### Migration Strategy

**Phase 1: Analysis** (Complete ✅)
- Identified 8 V2 domains with commands/skills/
- Confirmed V7.0 standard (agents only)

**Phase 2: Audit** (Recommended Next)
1. For each V2 domain:
   - List all agents
   - Check if agents exist in V7.0 replacement domain
   - Identify unique agents that need migration
   - Check for commands/skills references

**Phase 3: Gradual Migration** (Future)
1. **hr → people-culture**
   - Compare agent lists
   - Migrate unique agents
   - Update configs
   - Test routing
   - Deprecate hr/

2. **legal → legal-compliance**
   - Same process

3. **sales + marketing → revenue**
   - Merge agents into revenue
   - Update routing keywords
   - Test multi-domain routing

4. **Others**
   - business, support, planning, software
   - Determine canonical V7.0 replacement
   - Migrate systematically

**Phase 4: Cleanup**
- Move deprecated domains to archive/
- Update all references
- Update documentation

---

## Creating New Domains

Follow V7.0 standard structure:

### Step 1: Create Directory Structure

```bash
mkdir -p {domain}/.claude-plugin
mkdir -p {domain}/agents
```

### Step 2: Create package.json

```json
{
  "name": "@cagents/{domain}",
  "version": "7.0.1",
  "description": "{Domain} agents for cAgents",
  "keywords": ["{domain}", "agents", "v7.0"]
}
```

### Step 3: Create plugin.json

```json
{
  "name": "{domain}",
  "version": "7.0.1",
  "agents": [
    "{domain}:{agent-name}"
  ]
}
```

### Step 4: Create Agents

Each agent file must include:

```markdown
---
name: {agent-name}
tier: controller|execution|support
description: Agent description
tools: Read, Write, Grep, Glob, Edit
model: sonnet|opus|haiku
---

# Agent prompt content
```

### Step 5: Create Domain Configs

Create 5 config files in `Agent_Memory/_system/domains/{domain}/`:
1. `router_config.yaml` - Tier classification
2. `planner_config.yaml` - Objectives + controller_catalog
3. `executor_config.yaml` - Execution monitoring
4. `validator_config.yaml` - Quality gates
5. `self_correct_config.yaml` - Recovery patterns

### Step 6: Register Domain

Update root `package.json`:
```json
"domains": [
  "existing-domain",
  "{new-domain}"
]
```

Update root `.claude-plugin/plugin.json` to include new domain.

---

## Validation Checklist

Before marking domain complete:

- [ ] Directory structure matches V7.0 standard (agents/ only, NO commands/skills/)
- [ ] All agents have `tier` field in frontmatter
- [ ] package.json version is 7.0.1
- [ ] plugin.json lists all agents
- [ ] Domain registered in root package.json
- [ ] 5 domain configs created in Agent_Memory/_system/domains/
- [ ] Domain tested with sample instruction
- [ ] Documentation updated

---

## Current Status

**V7.0 Standard Established**: ✅
- 9 domains follow V7.0 structure
- 230 agents with tier fields
- Agent-only structure (no commands/skills)

**Legacy V2 Domains**: ⚠️
- 8 domains still use V2 structure
- Gradual migration recommended
- No immediate removal (preserve functionality)

**Consolidated**: ✅
- finance + operations → finance-operations (17 + 15 agents)
- Zero duplication in finance-operations

**Next Steps**:
1. Audit V2 domains for unique agents
2. Plan migration for hr → people-culture
3. Plan migration for legal → legal-compliance
4. Determine revenue consolidation strategy (sales + marketing)
5. Archive V2 domains after migration complete

---

**Version**: V7.0.1
**Standard Status**: Official
**Compliance**: 9 of 17 domains (53%)
