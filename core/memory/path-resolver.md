# Cross-Domain Path Resolution

This document describes how agents resolve file paths when working in a multi-domain cAgents environment.

## Base Path Resolution

### Agent_Memory Location

Agent_Memory is ALWAYS at the project root:

```bash
# Correct
{project_root}/Agent_Memory/

# NOT inside cAgents folder
# WRONG: {project_root}/cAgents/Agent_Memory/
```

### Resolution from Domain Plugin

When a domain plugin agent needs to access Agent_Memory:

```yaml
# From cAgents/software/agents/router.md running at:
#   /home/user/my-project/cAgents/software/agents/router.md

# Agent_Memory is at:
#   /home/user/my-project/Agent_Memory/

# NOT at:
#   /home/user/my-project/cAgents/Agent_Memory/
```

## Path Patterns

### System Paths

All domain agents can read system paths:

```yaml
paths:
  registry: "Agent_Memory/_system/registry.yaml"
  config: "Agent_Memory/_system/config.yaml"
  domains: "Agent_Memory/_system/domains.yaml"
  agent_status: "Agent_Memory/_system/agent_status.yaml"
```

### Instruction Paths

Instruction folders are at Agent_Memory root, NOT inside domains:

```yaml
# All instructions (regardless of domain) are at:
instruction_folder: "Agent_Memory/{instruction_id}/"

# Example software instruction:
software_instruction: "Agent_Memory/inst_20260105_001/"

# Example creative instruction (future):
creative_instruction: "Agent_Memory/inst_20260105_002/"
```

### Communication Paths

Agent inboxes are at Agent_Memory root:

```yaml
# Core agent inboxes
trigger_inbox: "Agent_Memory/_communication/inbox/trigger/"
orchestrator_inbox: "Agent_Memory/_communication/inbox/orchestrator/"
hitl_inbox: "Agent_Memory/_communication/inbox/hitl/"

# Software domain agent inboxes
router_inbox: "Agent_Memory/_communication/inbox/router/"
planner_inbox: "Agent_Memory/_communication/inbox/planner/"
executor_inbox: "Agent_Memory/_communication/inbox/executor/"

# Creative domain agent inboxes (future)
creative_router_inbox: "Agent_Memory/_communication/inbox/creative-router/"
creative_planner_inbox: "Agent_Memory/_communication/inbox/creative-planner/"
```

### Knowledge Paths

Knowledge is domain-prefixed but at Agent_Memory root:

```yaml
# Semantic knowledge
software_conventions: "Agent_Memory/_knowledge/semantic/software_conventions.yaml"
creative_style_guides: "Agent_Memory/_knowledge/semantic/creative_style_guides.yaml"

# Procedural knowledge
software_patterns: "Agent_Memory/_knowledge/procedural/software_patterns.yaml"
creative_workflows: "Agent_Memory/_knowledge/procedural/creative_workflows.yaml"

# Calibration data
software_routing: "Agent_Memory/_knowledge/calibration/software_routing.yaml"
creative_routing: "Agent_Memory/_knowledge/calibration/creative_routing.yaml"
software_hitl_patterns: "Agent_Memory/_knowledge/calibration/software_hitl_patterns.yaml"
```

## Resolution Algorithm

For any agent in any domain, use this algorithm:

```python
def resolve_memory_path(relative_path):
    """
    Resolve a path relative to Agent_Memory root.

    Args:
        relative_path: Path starting from Agent_Memory/ (e.g., "_system/registry.yaml")

    Returns:
        Absolute path to the file
    """
    # Agent_Memory is at PROJECT ROOT, not inside cAgents
    project_root = find_project_root()
    return f"{project_root}/Agent_Memory/{relative_path}"

def find_project_root():
    """
    Find the project root by looking for Agent_Memory/ or cAgents/ folder.

    Walk up from current directory until found.
    """
    current = os.getcwd()
    while current != "/":
        if os.path.exists(f"{current}/Agent_Memory"):
            return current
        if os.path.exists(f"{current}/cAgents"):
            return current
        current = os.path.dirname(current)
    raise RuntimeError("Could not find project root with Agent_Memory")
```

## Domain Agent Path Examples

### Software Domain Agent (router.md)

```yaml
# Agent location: cAgents/software/agents/router.md
# Working directory: /home/user/my-project/

# When router needs to read instruction:
read_path: "Agent_Memory/inst_20260105_001/instruction.yaml"
# Resolves to: /home/user/my-project/Agent_Memory/inst_20260105_001/instruction.yaml

# When router needs to write to inbox:
write_path: "Agent_Memory/_communication/inbox/planner/delegation_123.yaml"
# Resolves to: /home/user/my-project/Agent_Memory/_communication/inbox/planner/delegation_123.yaml
```

### Creative Domain Agent (creative-router.md) - Future

```yaml
# Agent location: cAgents/creative/agents/creative-router.md
# Working directory: /home/user/my-project/

# When creative-router needs to read instruction:
read_path: "Agent_Memory/inst_20260105_002/instruction.yaml"
# Resolves to: /home/user/my-project/Agent_Memory/inst_20260105_002/instruction.yaml

# Same Agent_Memory, different instruction folder
```

## Cross-Domain Communication

When agents from different domains need to communicate, they use the shared Agent_Memory/_communication/ folder:

```yaml
# Software agent sending to Creative agent (future)
# Software architect wants story context from creative team:

message_path: "Agent_Memory/_communication/inbox/story-architect/consultation_123.yaml"
# Same Agent_Memory, different inbox folder
```

## Key Rules

1. **Agent_Memory is at project root** - Never inside cAgents/
2. **All paths are relative to Agent_Memory/** - Start paths from there
3. **Domains share the same Agent_Memory** - Single source of truth
4. **Knowledge is domain-prefixed** - software_*, creative_*, etc.
5. **Inboxes use agent names** - Not domain prefixes
6. **Instructions are domain-tagged** - domain field in instruction.yaml, not folder location

## Backward Compatibility

For existing agent-design users upgrading to cAgents:

```yaml
old_structure:
  # agent-design v3.x
  Agent_Memory/_system/registry.yaml  # Same
  Agent_Memory/inst_*/                # Same
  Agent_Memory/_communication/        # Same

new_structure:
  # cAgents v4.0
  Agent_Memory/_system/registry.yaml  # Same
  Agent_Memory/_system/domains.yaml   # NEW: Domain tracking
  Agent_Memory/inst_*/                # Same (now has domain field)
  Agent_Memory/_communication/        # Same (more agent inboxes)
```

The migration adds new files without changing existing paths.
