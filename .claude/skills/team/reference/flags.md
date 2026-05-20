# /team Command Flags Reference

## Flag Parsing Logic

```javascript
function parseTeamFlags(commandString) {
  const flags = {
    request: commandString.split('--')[0].trim(),
    parallel: commandString.includes('--parallel'),
    dryRun: commandString.includes('--dry-run'),
    display: commandString.includes('--display'),
    quiet: commandString.includes('--quiet') || commandString.includes('-q'),
    noTemplate: commandString.includes('--no-template'),
    teammateMode: extractFlagValue(commandString, '--teammate-mode'),
    lead: extractFlagValue(commandString, '--lead'),
    members: parseInt(extractFlagValue(commandString, '--members') || '8', 10),
    domain: extractFlagValue(commandString, '--domain'),
    tier: extractFlagValue(commandString, '--tier'),
    template: extractFlagValue(commandString, '--template'),
    waves: extractFlagValue(commandString, '--waves') ? parseInt(extractFlagValue(commandString, '--waves'), 10) : null
  };
  return flags;
}
```

## Complete Flag Table

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `--parallel` | Boolean | Force parallel execution | auto |
| `--dry-run` | Boolean | Preview team composition without executing | false |
| `--lead <agent>` | String | Specify team lead controller | auto-detect |
| `--members <N>` | Number | Maximum team members | 8 |
| `--display` | Boolean | Show team communication in output | false |
| `--domain <domain>` | String | Override domain detection | auto |
| `--tier <N>` | Number | Override tier classification | auto |
| `--quiet`, `-q` | Boolean | Suppress team progress output | false |
| `--teammate-mode <mode>` | String | Display mode: auto, tmux, in-process | auto |
| `--template <name>` | String | Force specific team template (e.g., fullstack-app, api-service) | auto-detect |
| `--waves <N>` | Number | Set minimum number of delivery waves (system maximizes by default) | auto-maximize |
| `--no-template` | Boolean | Force flat execution without template structure | false |

## Usage Examples

### Basic
```bash
/team Implement OAuth2 authentication
/team Build user profile feature
/team Add payment gateway integration
```

### With Flags
```bash
/team Fix auth + add tests + update docs --parallel     # Force parallel
/team Implement search feature --dry-run                 # Preview team
/team Build dashboard --lead tech-lead         # Specify lead
/team Create campaign --members 4                        # Limit team size
/team Add API endpoints --display                        # Show communication
/team Implement feature --teammate-mode tmux             # Force tmux split panes
/team Build system --teammate-mode in-process            # Force in-process mode
```

### With Templates and Waves
```bash
/team Build a full-stack app                            # Auto-selects template, maximizes waves (5-7)
/team Build REST API --template api-service             # Force API service template
/team Create React dashboard --template frontend-app    # Force frontend template
/team Build game mechanics --template game-project      # Force game template (6+ waves)
/team Fix auth bug --no-template                        # Force flat (no wave gating)
/team Build feature --waves 8                           # Force minimum 8 waves
/team Implement search --waves 5                        # Force minimum 5 waves
```

## Display Mode (teammateMode)

The `--teammate-mode` flag controls how teammates are displayed:

| Mode | Description |
|------|-------------|
| `auto` (default) | tmux split panes if inside tmux, otherwise in-process |
| `tmux` | Force tmux split pane display -- each teammate in own pane |
| `in-process` | All teammates in main terminal (Shift+Up/Down to navigate) |

This maps to Claude Code's built-in `teammateMode` setting. The flag overrides the settings.json value for the current session.

## Controller as Team Lead

| Workflow Type | Team Lead Controller |
|--------------|---------------------|
| Engineering | `tech-lead` |
| Creative | `creative-director` |
| Marketing | `marketing-strategist` |
| Operations | `operations-manager` |
| HR | `hr-manager` |
| Support | `customer-success-manager` |
