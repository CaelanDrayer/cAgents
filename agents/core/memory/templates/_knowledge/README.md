# Agent Knowledge Base

This folder contains persistent knowledge that improves over time across all instructions and domains.

## Structure

### semantic/
Facts about the project and domains:
- **conventions.yaml** - Coding conventions, naming patterns, style guides
- **entities.yaml** - Known project entities, components, systems
- **domain.yaml** - Domain-specific knowledge

Files are prefixed by domain to enable isolation:
- `software_conventions.yaml`
- `creative_style_guides.yaml`

### procedural/
How-to patterns and strategies:
- **patterns.yaml** - Design and implementation patterns
- **strategies.yaml** - Recovery and optimization strategies
- **tool_recipes.yaml** - Tool usage examples and workflows

Files are prefixed by domain:
- `software_patterns.yaml`
- `creative_workflows.yaml`

### calibration/
Learning data that improves routing and recovery:
- **routing.yaml** - Router classification accuracy over time
- **strategies.yaml** - Which recovery strategies work best

Files are prefixed by domain to prevent cross-contamination:
- `software_routing.yaml`
- `creative_routing.yaml`

## Domain Isolation

Each domain has its own knowledge files to prevent cross-domain contamination.
For example, a "rate limiting" decision learned in the Software domain should
not automatically apply to the Creative domain.

## Cross-Domain Knowledge

Some knowledge is shared across all domains:
- Project-wide conventions (if any)
- Cross-domain communication patterns
- HITL escalation patterns

These are stored in unprefixed files.
