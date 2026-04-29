# Cross-Domain Path Resolution

This document describes how agents resolve file paths when working in a multi-domain cAgents environment.

## Base Path Resolution

### cagents-memory Location

cagents-memory is ALWAYS at the project root:

```bash
# Correct
{project_root}/cagents-memory/

# NOT inside cAgents folder
# WRONG: {project_root}/cAgents/cagents-memory/
```

### Resolution from Domain Plugin

When a domain plugin agent needs to access cagents-memory:

```yaml
# From cAgents/software/agents/router.md running at:
#   /home/user/my-project/cAgents/software/agents/router.md

# cagents-memory is at:
#   /home/user/my-project/cagents-memory/

# NOT at:
#   /home/user/my-project/cAgents/cagents-memory/
```

## Path Patterns

### System Paths

All domain agents can read system paths:

```yaml
paths:
  registry: "cagents-memory/_system/registry.yaml"
  config: "cagents-memory/_system/config.yaml"
  domains: "cagents-memory/_system/domains.yaml"
  agent_status: "cagents-memory/_system/agent_status.yaml"
```

### Instruction Paths

Instruction folders are at cagents-memory root, NOT inside domains:

```yaml
# All instructions (regardless of domain) are at:
instruction_folder: "cagents-memory/{instruction_id}/"

# Example software instruction:
software_instruction: "cagents-memory/inst_20260105_001/"

# Example creative instruction (future):
creative_instruction: "cagents-memory/inst_20260105_002/"
```

### Communication Paths

Agent inboxes are at cagents-memory root:

```yaml
# Core agent inboxes
trigger_inbox: "cagents-memory/_communication/inbox/trigger/"
orchestrator_inbox: "cagents-memory/_communication/inbox/orchestrator/"
hitl_inbox: "cagents-memory/_communication/inbox/hitl/"

# Software domain agent inboxes
router_inbox: "cagents-memory/_communication/inbox/router/"
planner_inbox: "cagents-memory/_communication/inbox/planner/"
executor_inbox: "cagents-memory/_communication/inbox/executor/"

# Creative domain agent inboxes (future)
creative_router_inbox: "cagents-memory/_communication/inbox/creative-router/"
creative_planner_inbox: "cagents-memory/_communication/inbox/creative-planner/"
```

### Knowledge Paths

Knowledge is domain-prefixed but at cagents-memory root:

```yaml
# Semantic knowledge
software_conventions: "cagents-memory/_knowledge/semantic/software_conventions.yaml"
creative_style_guides: "cagents-memory/_knowledge/semantic/creative_style_guides.yaml"

# Procedural knowledge
software_patterns: "cagents-memory/_knowledge/procedural/software_patterns.yaml"
creative_workflows: "cagents-memory/_knowledge/procedural/creative_workflows.yaml"

# Calibration data
software_routing: "cagents-memory/_knowledge/calibration/software_routing.yaml"
creative_routing: "cagents-memory/_knowledge/calibration/creative_routing.yaml"
software_hitl_patterns: "cagents-memory/_knowledge/calibration/software_hitl_patterns.yaml"
```

## Resolution Algorithm

For any agent in any domain, use this algorithm:

```python
def resolve_memory_path(relative_path):
    """
    Resolve a path relative to cagents-memory root.

    Args:
        relative_path: Path starting from cagents-memory/ (e.g., "_system/registry.yaml")

    Returns:
        Absolute path to the file
    """
    # cagents-memory is at PROJECT ROOT, not inside cAgents
    project_root = find_project_root()
    return f"{project_root}/cagents-memory/{relative_path}"

def find_project_root():
    """
    Find the project root by looking for cagents-memory/ or cAgents/ folder.

    Walk up from current directory until found.
    """
    current = os.getcwd()
    while current != "/":
        if os.path.exists(f"{current}/cagents-memory"):
            return current
        if os.path.exists(f"{current}/cAgents"):
            return current
        current = os.path.dirname(current)
    raise RuntimeError("Could not find project root with cagents-memory")
```

## Domain Agent Path Examples

### Software Domain Agent (router.md)

```yaml
# Agent location: cAgents/software/agents/router.md
# Working directory: /home/user/my-project/

# When router needs to read instruction:
read_path: "cagents-memory/inst_20260105_001/instruction.yaml"
# Resolves to: /home/user/my-project/cagents-memory/inst_20260105_001/instruction.yaml

# When router needs to write to inbox:
write_path: "cagents-memory/_communication/inbox/planner/delegation_123.yaml"
# Resolves to: /home/user/my-project/cagents-memory/_communication/inbox/planner/delegation_123.yaml
```

### Creative Domain Agent (creative-router.md) - Future

```yaml
# Agent location: cAgents/writer/creative-router.md
# Working directory: /home/user/my-project/

# When creative-router needs to read instruction:
read_path: "cagents-memory/inst_20260105_002/instruction.yaml"
# Resolves to: /home/user/my-project/cagents-memory/inst_20260105_002/instruction.yaml

# Same cagents-memory, different instruction folder
```

## Cross-Domain Communication

When agents from different domains need to communicate, they use the shared cagents-memory/_communication/ folder:

```yaml
# Software agent sending to Creative agent (future)
# Software architect wants story context from creative team:

message_path: "cagents-memory/_communication/inbox/story-architect/consultation_123.yaml"
# Same cagents-memory, different inbox folder
```

## Key Rules

1. **cagents-memory is at project root** - Never inside cAgents/
2. **All paths are relative to cagents-memory/** - Start paths from there
3. **Domains share the same cagents-memory** - Single source of truth
4. **Knowledge is domain-prefixed** - software_*, creative_*, etc.
5. **Inboxes use agent names** - Not domain prefixes
6. **Instructions are domain-tagged** - domain field in instruction.yaml, not folder location

## Backward Compatibility

For existing agent-design users upgrading to cAgents:

```yaml
old_structure:
  # agent-design v3.x
  cagents-memory/_system/registry.yaml  # Same
  cagents-memory/inst_*/                # Same
  cagents-memory/_communication/        # Same

new_structure:
  # cAgents v4.0
  cagents-memory/_system/registry.yaml  # Same
  cagents-memory/_system/domains.yaml   # NEW: Domain tracking
  cagents-memory/inst_*/                # Same (now has domain field)
  cagents-memory/_communication/        # Same (more agent inboxes)
```

The migration adds new files without changing existing paths.
