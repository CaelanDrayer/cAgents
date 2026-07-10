# Contributing to cAgents

## Getting Started

**Prerequisites:** You'll need [Node.js](https://nodejs.org/) and [npm](https://docs.npmjs.com/) installed.

```bash
git clone <repo>
cd cAgents
npm install
npm test          # 1418+ Vitest tests across 172+ files
```

Ensure `node` is in your PATH — hooks rely on it.

---

## Adding an Agent

1. **Choose tier and domain** — see [Complexity Tiers](../CLAUDE.md#complexity-tiers) and the domain table below.

2. **Create the SKILL.md**:
   ```
   {domain}/agents/{name}/SKILL.md
   ```
   Required frontmatter (v11.1.0+ schema; the top-level `domain:` field was REMOVED in v11.1.0 — agents now declare `archetype:` instead, with `branch:` for 3-level archetypes):
   ```yaml
   ---
   name: my-agent           # kebab-case, matches directory name
   description: "..."       # 1-2 sentences: what it does, when to use it
   archetype: developer     # one of: developer | operator | advisor | analyst | creator | writer | strategist | core | leadership
   branch: backend          # REQUIRED for 3-level archetypes (developer, operator, advisor); see archetype table for valid branches
   metadata:
     tier: execution        # controller | execution | support | infrastructure
   ---
   ```
   Optional but recommended: `model`, `vibe` (personality one-liner, max 80 chars), `capabilities` (also inside `metadata:`).

3. **Register in plugin.json**:
   Run `bash scripts/sync-agents.sh` to register the agent in `.claude-plugin/plugin.json` automatically.

4. **Validate**:
   ```bash
   bash scripts/ci/validate-agents.sh
   ```
   All agents must pass before a PR is merged. `validate-agents.sh` rejects top-level `domain:` as an error (legacy schema).

### Frontmatter Reference

| Field | Required | Values |
|-------|----------|--------|
| `name` | yes | kebab-case, unique |
| `description` | yes | 1-2 sentences |
| `tier` | yes | `controller` / `execution` / `support` / `infrastructure` |
| `domain` | yes | see domain list above |
| `model` | no | `opus` / `opusplan` / `sonnet` / `haiku` |
| `vibe` | no | personality tagline, max 80 chars |
| `maxTurns` | no | integer (controllers: 40, execution: 30, support: 10) |
| `permissionMode` | no | `"bypassPermissions"` for controllers/infrastructure |

Full spec: `.claude/rules/core/skill-format.md`

---

## Adding a Hook

1. **Create a `.cjs` file** in `.claude/hooks/` using the `createHook()` factory:
   ```javascript
   const { createHook } = require('./hook-utils.cjs');

   createHook('MyHook', async (input) => {
     // Return null for pass-through
     // Return { deny: true, reason: '...' } to block a PreToolUse
     // Return { continue: true, systemMessage: '...' } to inject context
     return null;
   });
   ```

2. **Register in `.claude/settings.json`**:
   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Write|Edit",
           "hooks": [
             {
               "type": "command",
               "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}\"; node \"$R/.claude/hooks/run-hook.cjs\" my-hook'",
               "timeout": 5
             }
           ]
         }
       ]
     }
   }
   ```

3. **Add a unit test** in `tests/hooks/my-hook.test.js`. Hooks without tests will not be merged.

4. **Test manually**:
   ```bash
   echo '{}' | node .claude/hooks/my-hook.cjs
   ```

Full hook reference: `.claude/rules/core/hooks.md`

---

## Running Tests

```bash
npm test                    # All 1418+ Vitest tests across 172+ files (hooks + config + regression)
bash scripts/ci/validate-agents.sh   # Agent SKILL.md validation
```

**CI scripts**:
- `scripts/ci/cagents-ci.sh` — full CI pipeline
- `scripts/ci/validate-agents.sh` — agent validation only

---

## Version Bumps

All 25 version locations must stay in sync. Never edit them manually.

```bash
bash scripts/sync-versions.sh <new-version>
```

**When to bump**:
- `patch` (x.y.Z) — bug fixes
- `minor` (x.Y.0) — new features, new agents
- `major` (X.0.0) — breaking changes to pipeline or schema

Verify after bumping:
```bash
grep -r '"version"' .claude-plugin/ */.claude-plugin/ package.json | grep -v node_modules
```

Registry of all 25 locations: `.claude/rules/core/version-registry.md`

---

## Bug-Driven Testing (Mandatory)

Every bug fix **must** include a regression test written **before** the fix:

1. Write a failing test that reproduces the bug.
2. Fix the bug — the test must now pass.
3. Verify the test runs in CI.

**Commit format for bug fixes**:
```
fix: <description>

Bug: <what broke>
Root cause: <why it broke>
Test added: <test file and what it covers>
Could have caught by: <unit|integration|contract|e2e> test on <module/layer>
```

A bug fix without a regression test is incomplete.

---

## Code Review

All PRs require review. Checklist:

- [ ] `bash scripts/ci/validate-agents.sh` passes
- [ ] `npm test` passes
- [ ] New agents have `name`, `description`, `tier`, `domain` in frontmatter
- [ ] New hooks use `createHook()` factory and have a unit test in `tests/hooks/`
- [ ] Version bumped via `scripts/sync-versions.sh` (features and fixes)
- [ ] Bug fixes include a regression test

---

## Archetype Structure (v11.1.0+ canonical)

| Archetype | Dir | Agents | Scope |
|-----------|-----|-------:|-------|
| **Developer** | `developer/` | 8 | Backend, frontend, fullstack, infrastructure, quality (5 branches) |
| **Operator** | `operator/` | 7 | Support, business-ops, people-ops, marketing-sales, content (5 branches) |
| **Advisor** | `advisor/` | 4 | Legal, health, education, personal (4 branches) |
| **Analyst** | `analyst/` | 5 | Data, BI, research, social-science |
| **Creator** | `creator/` | 2 | Visual, audiovisual |
| **Writer** | `writer/` | 4 | Narrative, editorial |
| **Strategist** | `strategist/` | 3 | Product owners, portfolio, planning |
| **Core** | `core/` | 16 | Pipeline infrastructure agents |
| **Leadership** | `leadership/` | 9 | C-suite (used by `/team` strategic mode, not directly routable) |

Total: 58 agents (post-v12.20.0 catalog consolidation — 42 routable + 16 core; was 141 post-v12.7.0). The legacy 13-domain layout (engineering/, creative/, business/, growth/, people/, service/, science/, health/, education/, personal/, arts/, trades/, shared/) was replaced by these 9 archetypes in v11.1.0. Two legacy dirs (`people/` and `shared/`) survive on disk as routing-config-only overlays (no SKILL.md files); the other 11 were deleted and consolidated into `cagents-memory/_system/config/routing.yaml`. All agents are registered in the centralized root `.claude-plugin/plugin.json`.
