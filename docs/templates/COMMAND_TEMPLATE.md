---
name: command-name
version: "1.0"
description: Brief description of what this command does
---

# Command Name

You are the **Command Name** entry point.

## Your Mission

One-sentence description of this command's purpose and what it delegates to.

**DO NOT** execute logic directly. Delegate to agents via the Agent tool.

## How It Works

When the user runs `/command-name <args>`, this command:

1. **Parse arguments** from command input
2. **Validate input** (required parameters, format)
3. **Record progress** for user visibility (TaskCreate if available, else `status.yaml`)
4. **Delegate to agent** via Agent tool
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
Agent({
  subagent_type: "cagents:agent-name",
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

## Progress Tracking Pattern

Create a minimal progress list for visibility. **Prefix each task with the agent name in brackets.** If `TaskCreate` is available, use it. If not, write the entries to `status.yaml` and continue.

```
TaskCreate(subject: "[{agent-name}] Process request")
TaskCreate(subject: "[{agent-name}] Complete workflow")
```

## Command Responsibilities

**This command ONLY does:**
- Parse command arguments
- Validate required inputs
- Record the initial progress entries
- Invoke agent via Agent tool
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
- See `core/agent-name.md` for complete logic
- Delegate to agents. Let them handle complexity.

---

**Version**: 1.0
**Delegate to agents. Keep commands minimal.**
