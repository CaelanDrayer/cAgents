# cagents-memory Utilities

This document describes utility patterns for working with the cagents-memory system across multiple domains.

## Memory Location

cagents-memory is always at the PROJECT ROOT:
```
{project_root}/cagents-memory/
```

NOT inside the cAgents folder. This ensures:
- Backward compatibility with existing installations
- Single source of truth across all domains
- Simple path resolution

## Path Patterns

### System Paths
```yaml
system:
  registry: "cagents-memory/_system/registry.yaml"
  config: "cagents-memory/_system/config.yaml"
  domains: "cagents-memory/_system/domains.yaml"
  agent_status: "cagents-memory/_system/agent_status.yaml"
```

### Knowledge Paths
```yaml
knowledge:
  semantic: "cagents-memory/_knowledge/semantic/{domain}_{topic}.yaml"
  procedural: "cagents-memory/_knowledge/procedural/{domain}_{patterns}.yaml"
  calibration: "cagents-memory/_knowledge/calibration/{domain}_{type}.yaml"
```

### Communication Paths
```yaml
communication:
  inbox: "cagents-memory/_communication/inbox/{agent}/"
  broadcast: "cagents-memory/_communication/broadcast/"
```

### Instruction Paths
```yaml
instruction:
  root: "cagents-memory/{instruction_id}/"
  instruction: "cagents-memory/{instruction_id}/instruction.yaml"
  status: "cagents-memory/{instruction_id}/status.yaml"
  workflow:
    plan: "cagents-memory/{instruction_id}/workflow/plan.yaml"
  tasks:
    pending: "cagents-memory/{instruction_id}/tasks/pending/"
    in_progress: "cagents-memory/{instruction_id}/tasks/in_progress/"
    completed: "cagents-memory/{instruction_id}/tasks/completed/"
    blocked: "cagents-memory/{instruction_id}/tasks/blocked/"
  outputs:
    partial: "cagents-memory/{instruction_id}/outputs/partial/"
    final: "cagents-memory/{instruction_id}/outputs/final/"
  decisions: "cagents-memory/{instruction_id}/decisions/"
  reviews: "cagents-memory/{instruction_id}/reviews/"
  episodic: "cagents-memory/{instruction_id}/episodic/"
```

## Common Operations

### Read Instruction Status
```yaml
# Read current instruction status
file: "cagents-memory/{instruction_id}/status.yaml"
fields:
  - status: active | paused | completed | archived
  - phase: trigger | routing | planning | executing | validating | complete
  - tier: 0 | 1 | 2 | 3 | 4
  - domain: software | creative | sales | ...
```

### Update Task State
```yaml
# Move task from pending to in_progress
source: "cagents-memory/{instruction_id}/tasks/pending/{task_id}.yaml"
target: "cagents-memory/{instruction_id}/tasks/in_progress/{task_id}.yaml"
operation: mv
```

### Send Message to Agent
```yaml
# Write message to agent inbox
file: "cagents-memory/_communication/inbox/{agent}/msg_{timestamp}_{type}.yaml"
content:
  id: "msg_{timestamp}_{type}"
  from: {sender_agent}
  to: {recipient_agent}
  type: consultation | delegation | review | escalation
  timestamp: {ISO8601}
  instruction_id: {instruction_id}
  content: {...}
```

### Log Decision
```yaml
# Write decision to instruction folder
file: "cagents-memory/{instruction_id}/decisions/{timestamp}_{agent}.yaml"
content:
  layer: {layer}
  type: {decision_type}
  timestamp: {ISO8601}
  context: {...}
  options: [...]
  chosen: {option_id}
  rationale: "..."
  confidence: 0.85
```

## Domain-Specific Extensions

Domains can add their own folders within instruction folders:

### Creative Domain
```yaml
# Creative domain adds narrative-focused organization
{instruction_id}/narrative/:
  acts/
  scenes/
  chapters/
  characters/
  locations/
  systems/
  timeline/
```

### Finance Domain
```yaml
# Finance domain adds financial document types
{instruction_id}/financial/:
  budgets/
  forecasts/
  reports/
```

## Access Control

### Read Access
- All agents can read _system/, _archive/, _knowledge/
- Agents can only check their own inbox
- All assigned agents can read instruction folders

### Write Access
- Core owns _system/ initialization
- Each agent updates their own status
- Domains write knowledge prefixed by their name
- Task transitions follow workflow rules
- Messages go to recipient's inbox only

## Multi-Domain Coordination

When multiple domains collaborate on an instruction:

```yaml
instruction.yaml:
  domain: software  # Primary domain
  collaborating_domains:
    - creative  # Co-leading or supporting

status.yaml:
  domain_status:
    software:
      phase: executing
      progress: 0.6
    creative:
      phase: executing
      progress: 0.4
```

Cross-domain communication uses _communication/ only:
- No direct file access between domains
- Messages via inbox system
- Broadcast for announcements
