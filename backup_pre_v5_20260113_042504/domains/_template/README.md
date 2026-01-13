# Domain Configuration Templates

This directory contains templates for creating new domain configurations in the cAgents V2.0 Universal Workflow Architecture.

## Overview

Each domain requires 5 configuration files that define how the universal workflow agents behave for that domain:

1. **router_config.yaml** - Complexity tier classification rules
2. **planner_config.yaml** - Task decomposition patterns
3. **executor_config.yaml** - Execution and agent coordination rules
4. **validator_config.yaml** - Quality gates and validation criteria
5. **self_correct_config.yaml** - Automated correction strategies

## Creating a New Domain

### Step 1: Create Domain Folder

```bash
mkdir -p Agent_Memory/_system/domains/{domain_name}
```

### Step 2: Copy Templates

```bash
cd Agent_Memory/_system/domains/_template
for file in *.template; do
  cp "$file" "../{domain_name}/${file%.template}"
done
```

### Step 3: Customize Each Config

Edit each config file and replace all `{DOMAIN_NAME}` placeholders with your actual domain name.

**Required customizations**:

#### router_config.yaml
- Update tier classification keywords for your domain
- Add domain-specific templates
- Update examples to match your domain's use cases
- Define scope adjustment rules

#### planner_config.yaml
- List all available agents in your domain
- Define task patterns for common workflows
- Specify acceptance criteria templates
- Set planning strategies per tier

#### executor_config.yaml
- Define agent capabilities and specializations
- Configure execution strategies (direct vs delegation)
- Set up output aggregation rules
- Configure cross-domain invocation if needed

#### validator_config.yaml
- Define quality gates specific to your domain
- Create validation rules for your artifact types
- Set up classification logic (PASS/FIXABLE/BLOCKED)
- Add domain-specific checks

#### self_correct_config.yaml
- Define correction strategies for common issues
- Configure fixability criteria
- Set up agent invocation patterns for fixes
- Define retry limits

### Step 4: Test the Domain

After creating the configs, test your domain end-to-end:

```bash
/trigger {test_request_for_your_domain}
```

The universal workflow agents will automatically load your domain configs and execute the workflow.

## Template Placeholders

All templates use these placeholders:

- `{DOMAIN_NAME}` - Your domain name (software, business, creative, etc.)
- `{example}` - Replace with domain-specific examples
- `{concept}` - Replace with domain concepts
- `{artifact}` - Replace with domain artifacts/deliverables
- `{target}` - Replace with domain targets

## Domain Examples

### Software Domain
- **Keywords**: code, bug, feature, api, test, deploy
- **Artifacts**: code files, tests, documentation
- **Agents**: architect, developer, qa-lead

### Business Domain
- **Keywords**: forecast, analysis, strategy, budget
- **Artifacts**: reports, forecasts, strategic plans
- **Agents**: cso, market-analyst, business-analyst

### Creative Domain
- **Keywords**: story, novel, character, plot, scene
- **Artifacts**: chapters, character profiles, outlines
- **Agents**: story-architect, prose-stylist, editor

## Configuration Best Practices

1. **Start Simple**: Begin with basic tier classification and expand
2. **Reuse Patterns**: Copy proven patterns from existing domains
3. **Test Incrementally**: Test each config file as you create it
4. **Document Examples**: Include plenty of examples in your configs
5. **Version Control**: Track config changes in git
6. **Validate YAML**: Ensure all config files are valid YAML
7. **Calibrate Over Time**: Update configs based on actual usage data

## File Structure

```
Agent_Memory/_system/domains/
├── _template/              # Templates (this directory)
│   ├── README.md
│   ├── router_config.yaml.template
│   ├── planner_config.yaml.template
│   ├── executor_config.yaml.template
│   ├── validator_config.yaml.template
│   └── self_correct_config.yaml.template
│
├── software/               # Example: Software domain
│   ├── router_config.yaml
│   ├── planner_config.yaml
│   ├── executor_config.yaml
│   ├── validator_config.yaml
│   └── self_correct_config.yaml
│
└── {your_domain}/          # Your new domain
    ├── router_config.yaml
    ├── planner_config.yaml
    ├── executor_config.yaml
    ├── validator_config.yaml
    └── self_correct_config.yaml
```

## Troubleshooting

### Config File Not Loading
- Verify file naming: Must match `{agent}_config.yaml` exactly
- Check YAML syntax: Use a YAML validator
- Ensure folder named correctly: `Agent_Memory/_system/domains/{domain_name}/`

### Domain Not Detected
- Update domain detection keywords in trigger agent
- Check instruction.yaml has correct domain field
- Verify domain name is lowercase and uses hyphens, not underscores

### Agent Invocation Fails
- Verify agent names in planner_config match actual agent files
- Check agent registry for correct domain:agent mappings
- Ensure agents are properly registered in plugin.json

## Support

For questions or issues with domain configuration:
1. Review existing domain configs (software, business) as examples
2. Check CLAUDE.md for architecture documentation
3. Refer to RECURSIVE_ARCHITECTURE_V2.md for detailed design
4. Open an issue on GitHub

---

**Version**: 2.0
**Last Updated**: 2026-01-10
