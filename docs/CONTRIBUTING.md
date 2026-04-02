# Contributing to cAgents

## Getting Started

**Prerequisites:** You'll need [Node.js](https://nodejs.org/) and [npm](https://docs.npmjs.com/) installed.

```bash
git clone <repo>
cd cAgents
npm install
npm test          # 351 Vitest tests
```

Ensure `node` is in your PATH — hooks rely on it.

---

## Adding an Agent

1. **Choose tier and domain** — see [Complexity Tiers](CLAUDE.md#complexity-tiers) and the domain table below.

2. **Create the SKILL.md**:
   ```
   {domain}/agents/{name}/SKILL.md
   ```
   Required frontmatter:
   ```yaml
   ---
   name: my-agent           # kebab-case, matches directory name
   description: "..."       # 1-2 sentences: what it does, when to use it
   tier: execution          # controller | execution | support | infrastructure
   domain: engineering      # engineering | creative | business | growth | people | service | leadership | shared | core
   ---
   ```
   Optional but recommended: `model`, `vibe` (personality one-liner, max 80 chars), `capabilities`.

3. **Register in plugin.json**:
   Add the SKILL.md path to the `agents` array in `.claude-plugin/plugin.json` (and the domain's `{domain}/.claude-plugin/plugin.json`).

4. **Validate**:
   ```bash
   bash scripts/ci/validate-agents.sh
   ```
   All agents must pass before a PR is merged.

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
npm test                    # All 351 Vitest tests (hooks + config)
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

## Domain Structure

| Domain | Dir | Agents | Scope |
|--------|-----|--------|-------|
| **Engineering** | `engineering/` | 32 | Software dev, infra, security, QA |
| **Creative** | `creative/` | 30 | Writing, narrative, game art, audio |
| **Business** | `business/` | 31 | Strategy, product, ops, finance |
| **Growth** | `growth/` | 39 | Marketing, sales, revenue ops |
| **People** | `people/` | 19 | HR, talent, culture |
| **Service** | `service/` | 32 | Support, CX, legal, compliance |
| **Leadership** | `leadership/` | 11 | C-suite (used by `/org`, not directly routable) |
| **Core** | `core/` | 16 | Pipeline infrastructure agents |
| **Shared** | `shared/` | 4 | Cross-domain (BI, data science) |

Each domain has `{domain}/config/domain_overrides.yaml` (controller catalog, router keywords) and `{domain}/.claude-plugin/plugin.json` (domain sub-plugin manifest).
