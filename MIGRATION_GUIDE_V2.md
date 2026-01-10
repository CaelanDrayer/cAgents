# Migration Guide: V1 to V2

This guide helps you migrate from cAgents V1 (domain-specific workflow agents) to V2 (universal workflow architecture).

## What Changed in V2?

### Before V2 (Domain-Specific Workflow Agents)

Each domain had its own workflow agents:
- `software/agents/router.md`
- `software/agents/planner.md`
- `software/agents/executor.md`
- `software/agents/validator.md`
- `software/agents/self-correct.md`
- `business/agents/router.md`
- ... (55 total workflow agents across 11 domains)

**Problems with V1**:
- Code duplication across 55 workflow agents
- Inconsistent workflow logic between domains
- Adding new domains required writing 5 new agent files
- Difficult to maintain consistency

### After V2 (Universal Workflow Architecture)

5 universal agents handle ALL domains via configuration:
- `core/agents/universal-router.md`
- `core/agents/universal-planner.md`
- `core/agents/universal-executor.md`
- `core/agents/universal-validator.md`
- `core/agents/universal-self-correct.md`

Domain behavior defined in YAML configuration files:
- `Agent_Memory/_system/domains/software/router_config.yaml`
- `Agent_Memory/_system/domains/software/planner_config.yaml`
- `Agent_Memory/_system/domains/software/executor_config.yaml`
- `Agent_Memory/_system/domains/software/validator_config.yaml`
- `Agent_Memory/_system/domains/software/self_correct_config.yaml`
- ... (55 total config files across 11 domains)

**Benefits of V2**:
- Single codebase for workflow logic
- Consistent workflow across all domains
- Adding new domains only requires 5 config files
- Configuration-driven behavior
- Supports recursive workflows

## Key Changes

### 1. Universal Workflow Agents

**V1**: Orchestrator invoked domain-specific workflow agents
```markdown
Orchestrator → Task(router) → software/agents/router.md
```

**V2**: Orchestrator invokes universal workflow agents with domain context
```markdown
Orchestrator → Task(universal-router, domain="software") → core/agents/universal-router.md
                                                                     ↓
                                                  Loads: Agent_Memory/_system/domains/software/router_config.yaml
```

### 2. Configuration Files

**New in V2**: Domain behavior defined in YAML configs

```yaml
# Agent_Memory/_system/domains/software/router_config.yaml
domain: software
version: 1.0

tier_classification:
  tier_0_indicators:
    - "What is"
    - "Explain"
    - "Documentation lookup"

  tier_2_indicators:
    - "Fix bug"
    - "Add unit test"
    required_agents: 2-3
    estimated_complexity: "moderate"

templates:
  bug_fix:
    description: "Fix a bug in existing code"
    typical_agents: ["backend-developer", "qa-lead"]
    validation_requirements: ["tests_pass", "no_regressions"]
```

### 3. Recursive Workflows

**New in V2**: Workflows can spawn child workflows

```markdown
Parent Instruction (Novel Writing)
  ↓
  Child Instruction 1 (Chapter 1)
    ↓
    Grandchild Instruction 1a (Scene 1)
  Child Instruction 2 (Chapter 2)
```

**Safety limits**:
- Maximum depth: 5 levels
- Maximum children per parent: 20
- Circular reference prevention

### 4. Orchestrator Updates

**V1**: Orchestrator signaled domain-specific agents
```yaml
# Agent_Memory/_communication/inbox/planner/{instruction_id}.yaml
to: planner  # software/agents/planner.md
```

**V2**: Orchestrator invokes universal agents via Task tool
```markdown
Use Task tool with:
- subagent_type: "universal-planner"
- prompt: |
    Plan execution for instruction:
    Instruction ID: inst_20260110_001
    Domain: software
    Load planner config from: Agent_Memory/_system/domains/software/planner_config.yaml
```

## Migration Steps

### For End Users (Using cAgents)

**No action required!** V2 is backward compatible.

- Old workflows continue to work
- Domain-specific workflow agents still exist (deprecated)
- New workflows automatically use universal agents
- Agent_Memory structure unchanged

### For Domain Plugin Developers

If you've created custom domains, follow these steps:

#### Step 1: Create Domain Configuration Files

```bash
# Create domain config directory
mkdir -p Agent_Memory/_system/domains/your-domain

# Copy templates
cp Agent_Memory/_system/domains/_template/router_config.yaml.template \
   Agent_Memory/_system/domains/your-domain/router_config.yaml

cp Agent_Memory/_system/domains/_template/planner_config.yaml.template \
   Agent_Memory/_system/domains/your-domain/planner_config.yaml

cp Agent_Memory/_system/domains/_template/executor_config.yaml.template \
   Agent_Memory/_system/domains/your-domain/executor_config.yaml

cp Agent_Memory/_system/domains/_template/validator_config.yaml.template \
   Agent_Memory/_system/domains/your-domain/validator_config.yaml

cp Agent_Memory/_system/domains/_template/self_correct_config.yaml.template \
   Agent_Memory/_system/domains/your-domain/self_correct_config.yaml
```

#### Step 2: Customize Configuration Files

Edit each config file to define your domain's behavior:

1. **router_config.yaml**: Define tier classification indicators and templates
2. **planner_config.yaml**: Define task patterns and agent assignments
3. **executor_config.yaml**: Define coordination strategies and workflows
4. **validator_config.yaml**: Define quality gates and pass criteria
5. **self_correct_config.yaml**: Define correction strategies

See existing domain configs (software, business, creative) for examples.

#### Step 3: Mark Old Workflow Agents as Deprecated

Add deprecation notice to your domain-specific workflow agents:

```markdown
---
name: router
description: DEPRECATED - Use universal-router with domain configs instead
deprecated: true
---

**DEPRECATED**: This agent is deprecated in V2. The universal-router agent now handles routing for all domains via configuration files.

Please use the universal workflow architecture instead.
```

#### Step 4: Test Your Domain

```bash
# Test your domain configuration
/trigger <task in your domain>

# Verify universal agents load your domain configs
# Check Agent_Memory/{instruction_id}/workflow/ for routing, plan, etc.
```

### For Core Contributors

If you're working on cAgents core:

#### Updating Agents to Use Universal Workflow

**Old pattern** (invoking domain-specific workflow agents):
```markdown
Signal software-planner via communication file:
Write to: Agent_Memory/_communication/inbox/planner/{instruction_id}.yaml
```

**New pattern** (invoking universal workflow agents):
```markdown
Use Task tool with:
- subagent_type: "universal-planner"
- description: "Create task decomposition plan"
- prompt: |
    Plan execution for instruction:
    Instruction ID: {instruction_id}
    Domain: {domain}
    Load config from: Agent_Memory/_system/domains/{domain}/planner_config.yaml
```

## Backward Compatibility

### What Still Works

- **Old workflows**: Existing Agent_Memory folders work with V2
- **Domain-specific workflow agents**: Still present (marked deprecated)
- **Agent_Memory structure**: Unchanged
- **Team agents**: No changes required
- **Slash commands**: `/trigger`, `/designer`, `/reviewer` work identically

### What's Deprecated

- **Domain-specific workflow agents**: `{domain}/agents/router.md`, `planner.md`, `executor.md`, `validator.md`, `self-correct.md`
- **Direct agent signaling**: Communication files to workflow agents
- **Domain-specific workflow logic**: Now in configs

These will be removed in V3.0.0 (6-12 months from now).

## Breaking Changes

### None for End Users

V2 is fully backward compatible for end users. All existing workflows continue to work.

### For Domain Plugin Developers

**Breaking in future V3.0.0**:
- Domain-specific workflow agents will be removed
- Direct communication to workflow agents will stop working
- Must migrate to universal workflow architecture

**Action required before V3.0.0**:
- Create domain configuration files (5 configs)
- Update plugin manifests to remove deprecated workflow agents
- Update any code that directly signals workflow agents

## Common Migration Issues

### Issue 1: "Domain config not found"

**Error**: `Could not load Agent_Memory/_system/domains/my-domain/router_config.yaml`

**Solution**: Create domain configuration files using templates from `Agent_Memory/_system/domains/_template/`

### Issue 2: "Agent not found in domain config"

**Error**: `Agent 'my-custom-agent' not found in available_agents list`

**Solution**: Add your agent to the `available_agents` list in the relevant config file (planner_config.yaml or executor_config.yaml)

### Issue 3: "Workflow stuck at routing phase"

**Error**: Orchestrator doesn't progress past routing phase

**Solution**: Check that `router_config.yaml` exists and has valid tier classification indicators. Check orchestrator logs in `Agent_Memory/{instruction_id}/episodic/`

### Issue 4: "Circular reference detected in recursive workflow"

**Error**: `Circular reference: intent 'write_chapter' already in ancestor chain`

**Solution**: This is a safety mechanism. Review your recursive workflow structure to ensure child workflows don't create cycles.

## Getting Help

- **Documentation**: See `README.md` and `CLAUDE.md` for V2 architecture details
- **Examples**: Check `Agent_Memory/_system/domains/software/` for reference configs
- **Templates**: Use `Agent_Memory/_system/domains/_template/` as starting point
- **Issues**: Report problems at https://github.com/CaelanDrayer/cAgents/issues

## Timeline

- **v5.0.0** (2025-12): Orchestration V2 planning
- **v6.0.0** (2026-01): V2 Universal Workflow Architecture released
- **v6.x.x** (2026): Stability and refinement
- **v7.0.0** (2026-06 est.): Remove deprecated domain-specific workflow agents

## Summary

**For end users**: No action needed. V2 is backward compatible and will improve your experience automatically.

**For domain developers**: Create 5 config files for your domain. Mark old workflow agents as deprecated.

**For core contributors**: Use Task tool to invoke universal workflow agents instead of signaling domain-specific agents.

Welcome to V2! Configuration-driven workflows across all domains.
