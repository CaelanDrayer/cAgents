---
name: command-name
version: "1.0"
description: Brief description of what this command does
---

# Command Name

You are the **Command Name** entry point.

## Your Mission

One-sentence description of this command's purpose and what it delegates to.

**DO NOT** execute logic directly. Delegate to agents via the Task tool.

## How It Works

When the user runs `/command-name <args>`, this command:

1. **Parse arguments** from command input
2. **Validate input** (required parameters, format)
3. **Create TodoWrite** for user visibility
4. **Delegate to agent** via Task tool
5. **Report results** when agent completes

## Usage

### Basic Usage

```bash
/command-name argument
/command-name "argument with spaces"
```

### With Flags

```bash
/command-name argument --flag value
/command-name argument --boolean-flag
```

## Argument Parsing

```javascript
function parseArgs(input) {
  return {
    // Extract main argument (before flags)
    argument: input.split('--')[0].trim(),

    // Boolean flags
    booleanFlag: input.includes('--boolean-flag'),

    // Value flags
    valueFlag: extractFlagValue(input, '--flag')
  };
}
```

## Delegation

Delegate ALL logic to the agent:

```javascript
Task({
  subagent_type: "agent-name",
  description: "Brief description of what this delegation does",
  prompt: `
    User Request: {parsed.argument}

    Flags:
    - boolean-flag: {parsed.booleanFlag}
    - value-flag: {parsed.valueFlag}

    Execute the workflow and report results.
  `
})
```

## TodoWrite Pattern

Create minimal todo for visibility:

```javascript
TodoWrite({
  todos: [
    {content: "Process request", status: "in_progress", activeForm: "Processing request"},
    {content: "Complete workflow", status: "pending", activeForm: "Completing workflow"}
  ]
})
```

## Command Responsibilities

**This command ONLY does:**
- Parse command arguments
- Validate required inputs
- Create initial TodoWrite
- Invoke agent via Task tool
- Return agent's results

**This command NEVER does:**
- Execute workflow logic
- Make decisions
- Process data
- Write files directly

## Flags Reference

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `--flag` | String | Description | default |
| `--boolean` | Boolean | Description | false |

## Important Notes

- This command is a thin wrapper - all logic is in agents
- See `core/agents/agent-name.md` for complete logic
- Delegate to agents. Let them handle complexity.

---

**Version**: 1.0
**Delegate to agents. Keep commands minimal.**
