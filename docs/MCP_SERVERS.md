# MCP Servers — Suggested Configurations

cAgents agents declare MCP tool surfaces via `allowed-tools: mcp__<server>__<tool>`
patterns in their SKILL.md frontmatter (see `.claude/rules/core/skill-format.md` §
"MCP Tool Integration"). Configuring the servers themselves is up to the user —
cAgents v11.1.x is a Stage 1 *consumer*, not a provider.

To enable any of the servers below in this project, copy its block into the
top-level `mcpServers` object of `.mcp.json` (replace the `{}` placeholder),
provide any required env vars, and restart Claude Code.

```json
{
  "mcpServers": {
    "<paste a block from below>": { ... }
  }
}
```

## Reference Configurations

### playwright — browser automation

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

No auth required. Used by `developer/quality/playwright-test-engineer`.

### filesystem — local directory access

```json
"filesystem": {
  "command": "npx",
  "args": ["@modelcontextprotocol/server-filesystem@latest", "/path/to/allowed/dir"]
}
```

Replace `/path/to/allowed/dir` with the directory you want to expose.

### github — GitHub API via Copilot MCP

```json
"github": {
  "type": "http",
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": {
    "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

Requires `GITHUB_PERSONAL_ACCESS_TOKEN` env var. Used by
`developer/quality/security-owasp`, `developer/quality/qa-lead`,
`developer/infrastructure/devops-engineer`,
`operator/support/technical-writer`.

### fetch — HTTP fetch

```json
"fetch": {
  "command": "uvx",
  "args": ["mcp-server-fetch"]
}
```

Requires `uv`/`uvx` installed.

### postgres — PostgreSQL queries

```json
"postgres": {
  "command": "npx",
  "args": ["@modelcontextprotocol/server-postgres@latest"],
  "env": {
    "DATABASE_URL": "${DATABASE_URL}"
  }
}
```

Set `DATABASE_URL` to your connection string. Used by
`developer/backend/backend-developer`, `developer/fullstack/data-analyst`.

### slack — Slack workspace access

```json
"slack": {
  "command": "npx",
  "args": ["@modelcontextprotocol/server-slack@latest"],
  "env": {
    "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
    "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
  }
}
```

Requires bot token + team ID.

## Other Suggested Servers

The following servers are referenced by cAgents agents but do not have a
canonical reference config block here yet. Look up their configuration on
[modelcontextprotocol.io](https://modelcontextprotocol.io) or the server
publisher's docs:

- `bigquery` — BigQuery dataset queries (used by `analyst/data-scientist`)
- `redis` — Redis cache inspection (used by `developer/backend/backend-developer`)
- `docker` — Docker container ops (used by `developer/infrastructure/devops-engineer`)
- `jupyter` — Notebook execution (used by `analyst/data-scientist`)
- `plaid` — Financial data (used by `operator/business-ops/finance-manager`)
- `zendesk` / `intercom` — Ticket/conversation ops (used by `operator/support/support-agent`)
- `notion` — Docs and databases (used by `operator/support/technical-writer`)

## Why this lives in a doc file, not `.mcp.json`

Claude Code's `.mcp.json` validator only accepts entries with a real MCP
server config (`command`+`args`, or `type: "http"` + `url`, etc.).
Descriptive `_description` / `_examples` metadata triggers
`mcpServers: Does not adhere to MCP server configuration schema`. v11.1.14
removed the same descriptive shape from `.claude-plugin/plugin.json` for the
same reason; v11.1.15 ships the matching fix for `.mcp.json` and moves the
catalog here so it stays discoverable without breaking the validator.
