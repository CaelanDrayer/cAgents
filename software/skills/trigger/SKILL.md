---
name: Trigger Workflow
description: Start a new workflow by creating an instruction folder and initializing the pipeline
version: 2.2.0
---

# Trigger Skill

This skill is invoked by the `/trigger` command to start a new workflow.

## What It Does

The skill activates the trigger agent behavior directly (via the command), which:

1. Parses the user's request
2. Classifies the intent (fix_bug, add_feature, refactor, etc.)
3. Extracts entities (targets, files, constraints)
4. Generates a unique instruction ID
5. Ensures Agent_Memory structure exists
6. Creates the instruction folder
7. Writes instruction.yaml and status.yaml
8. Updates the system registry
9. Reports the instruction ID to the user

## Command Flow

```
User types: /trigger Fix the login bug

/trigger command executes → Trigger agent behavior activates
                          ↓
                  Parse: "Fix the login bug"
                          ↓
                  Intent: fix_bug
                  Target: login
                          ↓
           Create: Agent_Memory/inst_20260103_001/
                          ↓
              Write: instruction.yaml, status.yaml
                          ↓
            Update: registry.yaml (sequence++)
                          ↓
       Report: "✓ Workflow Initialized - inst_20260103_001"
```

## Key Points

- **No recursion** - The command directly executes trigger agent logic
- **No Task tool needed** - Command contains the full protocol
- **Fast execution** - Uses haiku model for quick parsing
- **Creates folders only** - Doesn't execute the actual task
- **Next step** - User can invoke Router to continue the pipeline

## File Locations

- **Command**: `commands/trigger.md` - Direct trigger agent execution
- **Agent**: `agents/trigger.md` - Full trigger protocol and capabilities
- **Skill**: `skills/trigger/SKILL.md` - This documentation file

## Usage

```bash
# Start a workflow
/trigger Fix the authentication timeout in auth.py

# Check created instruction
/workflow status inst_20260103_001
```

## Integration

The `/trigger` command is the entry point to the full Agent Design workflow pipeline. After creating the instruction, users can manually invoke subsequent agents (Router, Orchestrator, etc.) or the system can auto-progress through the phases.
