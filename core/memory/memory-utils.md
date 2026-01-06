# Agent_Memory Utilities

This document describes utility patterns for working with the Agent_Memory system across multiple domains.

## Memory Location

Agent_Memory is always at the PROJECT ROOT:
```
{project_root}/Agent_Memory/
```

NOT inside the cAgents folder. This ensures:
- Backward compatibility with existing installations
- Single source of truth across all domains
- Simple path resolution

## Path Patterns

### System Paths
```yaml
system:
  registry: "Agent_Memory/_system/registry.yaml"
  config: "Agent_Memory/_system/config.yaml"
  domains: "Agent_Memory/_system/domains.yaml"
  agent_status: "Agent_Memory/_system/agent_status.yaml"
```

### Knowledge Paths
```yaml
knowledge:
  semantic: "Agent_Memory/_knowledge/semantic/{domain}_{topic}.yaml"
  procedural: "Agent_Memory/_knowledge/procedural/{domain}_{patterns}.yaml"
  calibration: "Agent_Memory/_knowledge/calibration/{domain}_{type}.yaml"
```

### Communication Paths
```yaml
communication:
  inbox: "Agent_Memory/_communication/inbox/{agent}/"
  broadcast: "Agent_Memory/_communication/broadcast/"
```

### Instruction Paths
```yaml
instruction:
  root: "Agent_Memory/{instruction_id}/"
  instruction: "Agent_Memory/{instruction_id}/instruction.yaml"
  status: "Agent_Memory/{instruction_id}/status.yaml"
  workflow:
    plan: "Agent_Memory/{instruction_id}/workflow/plan.yaml"
  tasks:
    pending: "Agent_Memory/{instruction_id}/tasks/pending/"
    in_progress: "Agent_Memory/{instruction_id}/tasks/in_progress/"
    completed: "Agent_Memory/{instruction_id}/tasks/completed/"
    blocked: "Agent_Memory/{instruction_id}/tasks/blocked/"
  outputs:
    partial: "Agent_Memory/{instruction_id}/outputs/partial/"
    final: "Agent_Memory/{instruction_id}/outputs/final/"
  decisions: "Agent_Memory/{instruction_id}/decisions/"
  reviews: "Agent_Memory/{instruction_id}/reviews/"
  episodic: "Agent_Memory/{instruction_id}/episodic/"
```

## Common Operations

### Read Instruction Status
```yaml
# Read current instruction status
file: "Agent_Memory/{instruction_id}/status.yaml"
fields:
  - status: active | paused | completed | archived
  - phase: trigger | routing | planning | executing | validating | complete
  - tier: 0 | 1 | 2 | 3 | 4
  - domain: software | creative | sales | ...
```

### Update Task State
```yaml
# Move task from pending to in_progress
source: "Agent_Memory/{instruction_id}/tasks/pending/{task_id}.yaml"
target: "Agent_Memory/{instruction_id}/tasks/in_progress/{task_id}.yaml"
operation: mv
```

### Send Message to Agent
```yaml
# Write message to agent inbox
file: "Agent_Memory/_communication/inbox/{agent}/msg_{timestamp}_{type}.yaml"
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
file: "Agent_Memory/{instruction_id}/decisions/{timestamp}_{agent}.yaml"
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
