---
paths:
  - ".claude/rules/core/skill-format.md"
  - ".claude/rules/core/progressive-disclosure.md"
  - "agents/*.md"
  - ".claude/skills/**/SKILL.md"
  - ".claude/rules/playbooks/README.md"
  - "scripts/scaffold-agent.sh"
  - "scripts/ci/validate-agents.sh"
  - "scripts/lint-agents.sh"
  - "scripts/ci/validate-agents.sh"
  - "tests/skills/skill-structure.test.js"
  - "tests/agents/**"
  - "tests/agent_linting/**"
---

# SKILL.md Agent and Skill Format Specification

Agent/skill format based on official Claude Code SKILL.md, subagent specification, and the [Agent Skills spec](https://agentskills.io).

**Layout (v12.68.0)**: agent definitions are flat, at `agents/<agent-name>.md`.
They are flat because Claude Code discovers a plugin agent with a non-recursive
scan of the `agents/` directory of the plugin. A definition parked in a
subdirectory is never registered. The symptom is `claude plugin details`, which
then reports `Agents (0)`. The 9 builder-role archetypes and their branches
survive as the `archetype:` and `branch:` frontmatter fields. The v11.1.0 tree
encoded those two fields as directory levels. The tier-3 resources of each agent
live at `agents/<agent-name>/resources/`.

## Frontmatter Schema

```yaml
---
name: agent-name                    # Required: Unique identifier (kebab-case)
description: "Brief description"    # Required: purpose + when to use; <=300 chars (<=400 if modes declared)
archetype: developer|operator|advisor|analyst|creator|writer|strategist|core|leadership  # Required: builder-role archetype (top-level)
branch: <branch-name>               # Required ONLY for 3-level archetypes (developer, operator, advisor)
vibe: "One-liner personality hook"  # Optional: Agent essence/tagline (max 80 chars)
tier: controller|execution|support  # Required: Agent tier classification
model: opus|opusplan|sonnet|haiku|fable  # Optional: Preferred model (see model_routing.yaml)
coordination_style: question_based  # Optional: For controllers only
typical_questions: [...]           # Optional: For controllers only
capabilities: [...]                # Optional: List of capabilities
tools: ["Read", "Write", "Bash"]   # V9.0: JSON array format (not comma-separated)
color: bright_blue                 # Optional: Display color
maxTurns: 40                       # V9.0: Maximum agentic turns
permissionMode: "bypassPermissions" # V9.0: For infrastructure + controllers
memory: {"project": true}          # V9.0: Persistent memory for learning agents
disallowedTools: ["Task"]          # V9.0: For support agents (prevent delegation)
initialPrompt: "Load session state and summarize active work items before starting"  # Optional: Prompt run automatically on agent spawn
---
```

## Required Fields

### name
- Unique identifier in kebab-case format
- Must match filename (e.g., `tech-lead.md` -> `name: tech-lead`)
- Used for agent routing and references

### description
- **Budget: 300 characters**. This is a hard per-agent cap on the
  `description:` value.
- **Carve-out: +100 characters** when the description declares modes (`Modes:`,
  `metadata.mode`, or `mode=<value>`), for an effective cap of **400**. The mode
  roster and the `NOT for:` redirect are routing tokens, not prose: they reach 230
  characters on the heaviest agents, and a flat cap would price them out.
- Enforced by `scripts/ci/validate-agents.sh`, warn-only until the description
  rewrite lands and hard afterwards. The separate 10-1024 length check is retained
  alongside it; on its own it catches nothing.
- Baseline when the budget was set: 60 agents, mean 309, max 562 (`support-director`),
  min 119, 33 over 300. At 300/+100, 36 of 60 already comply and the implied max
  drops from 562 to 400.
- **Shortening must preserve every mode name and every `NOT for:` redirect
  target.**
  Cut role prose, never a routing token. If an agent cannot fit without dropping one,
  the token wins and the agent gets a named, commented exception in the checker.
- Starts with role/purpose, then states when to use this agent.
- Example: "Coordinates engineering work via question-based delegation. Use for tier 2+ engineering tasks."
- Prose style: @.claude/rules/quality/ste100-technical-writing.md

### tier
- `controller`: Tier 2 agents that coordinate work through questions
- `execution`: Tier 3 agents that implement work and answer questions
- `support`: Tier 4 agents providing foundational services
- `infrastructure`: Core pipeline agents that form the execution backbone.
  Examples are orchestrator, planner, decomposer, and validator. The 15 agents in
  `core/` use it.

### archetype
- One of 9 builder-role archetype roots (top-level required field, since v11.1.0):
  `developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`, `strategist`,
  `core`, `leadership`
- Must match the directory immediately under the project root. Validated by
  `scripts/ci/validate-agents.sh` and `scripts/lint-agents.sh`.

### branch
- Required ONLY for 3-level archetypes (`developer`, `operator`, `advisor`).
- Must match the directory immediately above the agent's leaf directory.
- Valid branches per 3-level archetype:
  - `developer`: `backend`, `frontend`, `fullstack`, `infrastructure`, `quality`
  - `operator`: `support`, `business-ops`, `people-ops`, `marketing-sales`, `content`
  - `advisor`: `legal`, `health`, `education`, `personal`
- Omitted for 2-level archetypes (`analyst`, `creator`, `writer`, `strategist`) and flat archetype roots (`core`, `leadership`).

### domain (REMOVED in v11.1.0)
The v11.1.0 builder-role-tree migration replaced the top-level `domain:` field
with `archetype:`, and with `branch:` for a 3-level archetype. See the
[CHANGELOG entry for 11.1.0](../../../CHANGELOG.md). A new agent must not include
a top-level `domain:` field. `validate-agents.sh` rejects it as an error. A
legacy `domain:` inside the `metadata:` block is tolerated for now, and many
agent files still hold one. It is not load-bearing, and it is deprecated.

## Optional Fields

### vibe
- One-liner personality hook capturing the agent's essence (max 80 chars)
- Should convey the working philosophy of the agent. It should not restate the
  description
- Examples: "Ships clean APIs that survive production traffic at 3 AM", "Finds the bugs before your users do"
- Added to ~20 representative agents in V10.17.0, pattern documented for remaining agents

### model
- Preferred model alias: `opus`, `opusplan`, `sonnet`, `haiku`, or `fable`
- These aliases map to the latest Claude generation: `opus` -> Claude Opus 4.8,
  `sonnet` -> Claude Sonnet 4.6, and `haiku` -> Claude Haiku 4.5
- `opusplan`: Claude Opus 4.8 reasoning + Claude Sonnet 4.6 execution (ideal for controllers)
- `fable`: a documented Claude Code frontmatter alias. The frontmatter alias set
  is the same set the Agent tool accepts as its spawn-time `model` parameter. It
  is legal per the Claude Code sub-agent docs, and **not** per CI:
  `validate-agents.sh` checks only that `model` is *present*, and it constrains
  no value. A negative control of `model: totally-not-a-real-model-xyz` also
  passes with exit 0. An unrecognized value falls back to the inherited model
  silently at runtime.
- Overridden by model_routing.yaml scenario detection and environment variables
- If omitted, uses model_routing.yaml defaults
- **Field placement is unresolved.** Claude Code documents a top-level `model:`; 59 of 60 cAgents
  agents declare `metadata.model` instead (only `translator.md` uses top-level). `has_fm_field`
  accepts both, so CI hides the divergence. New agents follow the `metadata.model` majority;
  reconciling the two is filed as follow-up and deliberately out of scope here.
- See @.claude/rules/infrastructure/model-routing.md for model routing configuration and aliases.

### maxTurns (V9.0)
- Maximum number of agentic turns (API round-trips)
- Infrastructure: 15-50, Controllers: 40, Execution: 30, Support: 10
- Prevents runaway agent loops

### permissionMode (V9.0)
- `"bypassPermissions"` for infrastructure and controller agents
- Execution agents omit this (need user approval for writes)
- Support agents omit this

### memory (V9.0)
- `{"project": true}` for learning agents (controllers, qa-lead, optimizer, architect)
- Enables persistent memory across sessions

### disallowedTools (V9.0)
- `["Task"]` for support agents to prevent unauthorized delegation
- Enforces tier boundaries

### initialPrompt
- String prompt that runs automatically when the agent is spawned
- Use cases: loading session state, bootstrapping context, running pre-checks, summarizing prior work before main task
- The prompt executes before any user/controller input is processed
- Keep it short. It must stay under 200 tokens, because it runs on every spawn
- Example: `"Read workflow/plan.yaml and summarize the current phase and objectives"`

### paths (V11.1.12+)

Declares a list of glob patterns. The patterns show which file types or which
directories the agent works on most of the time. The field lives inside the
`metadata:` block, and not at the top level, as the 6-field Agent Skills spec
requires.

The `metadata.paths` field is a v1 declarative schema. An agent publishes its
natural file scope as a hint. The hint serves a human reviewer, and it will serve
a later planner routing-boost integration. Routing-boost ingestion is **deferred
to v2**. In v1 the paths are declarative only, and back-compat holds: an agent
without `paths:` routes exactly as before.

```yaml
metadata:
  paths:
    - "**/*.tsx"
    - "**/*.jsx"
    - "src/components/**"
    - "**/*.css"
```

Sub-field semantics:
- **Type**: array of strings (glob patterns, minimatch-compatible)
- **Required**: NO; agents without `paths:` route as today (back-compat preserved)
- **Glob syntax**: minimatch-compatible (same as `.gitignore`). `**` matches any depth;
  `*` matches one path segment; bracket expressions `[abc]` and brace expansion `{a,b}` are supported
- **Validation**: every entry must be a non-empty string. An empty array is
  valid. It signals "no specific file scope", which is the same as an omitted
  field
- **v1 and v2**: v1 is declarative only, and SKILL.md frontmatter surfaces it. v2
  is deferred. It will introduce the planner routing-boost. When the user request
  mentions a file that matches the `paths` of an agent, that agent gets a
  routing-priority boost. An agent that does not match drops in priority. It is
  not excluded, because back-compat holds for an agent without `paths:`.

**Pilot agents (≥10 from V11.1.12)**: `developer/frontend/frontend-developer`,
`developer/backend/backend-developer`, `developer/quality/qa-lead`,
`developer/quality/playwright-test-engineer`, `developer/quality/security-owasp`,
`developer/infrastructure/devops-engineer`, `operator/content/copywriter`,
`operator/support/technical-writer`, `creator/concept-artist`,
`analyst/data-scientist`. See `tests/skills/paths-conditional-activation.test.js` for
the regression test enforcing the ≥10 floor.

### coordination_style (Controllers only)
- `question_based`: Uses question delegation pattern
- A controller must have this field

### typical_questions (Controllers only)
- List of typical questions this controller asks
- Helps execution agents prepare for delegation

### capabilities
- List of capabilities for agent discovery
- Used by router for intelligent agent selection

### tools (DEPRECATED)
- **Deprecated in V10.22.5.** Use `allowed-tools` instead.
- Legacy JSON array format for tool declarations
- The `allowed-tools` field (space-separated string) is the single authoritative tool declaration per the Agent Skills spec
- Agents should have `allowed-tools` only; the `tools` field will be removed in a future version

### color
- Terminal display color for agent output
- Options: bright_white, bright_blue, bright_green, bright_yellow, bright_red, bright_cyan, bright_magenta

## Three-Tier Progressive Disclosure

### Directory Structure (High-Value Agents)

```
agents/
├── tech-lead.md                     # Tier 1 + 2: Frontmatter + Instructions
└── tech-lead/
    └── resources/
        ├── typical-questions.md     # Tier 3: Full question catalog
        ├── coordination-examples.md # Tier 3: Example workflows
        └── anti-patterns.md         # Tier 3: What NOT to do
```

### Loading Strategy

```yaml
loading_tiers:
  tier_1:  # Always loaded (~50 tokens)
    - frontmatter metadata
    - name, description, tier, archetype, (branch if 3-level)

  tier_2:  # When agent activated (~200-500 tokens)
    - SKILL.md body content
    - core instructions
    - behavioral guidelines

  tier_3:  # On demand via @path (~500-2000 tokens)
    - resources/*.md files
    - detailed examples
    - comprehensive question lists
    - edge case handling
```

### @path Reference Syntax

In an agent body, reference tier 3 resources. Paths are agent-file-relative,
so they carry the agent's own name:

```markdown
## Detailed Questions

See @tech-lead/resources/typical-questions.md for the full question catalog.

## Coordination Examples

Reference @tech-lead/resources/coordination-examples.md for workflow examples.
```

The `@path` syntax triggers on-demand loading when the resource is needed.

## Migration Path

### Pre-v11.1.0 Single-File Agent (legacy, removed)

For historical reference only. The legacy schema used a top-level `domain:` field
in place of `archetype:` and `branch:`. A new agent must use the v11.1.0 schema
below. `validate-agents.sh` rejects a top-level `domain:` as an error.

### Post-v11.1.0 Directory Agent (current)

```
developer/backend/backend-developer/
├── SKILL.md (~200 tokens)
│   ---
│   name: backend-developer
│   archetype: developer
│   branch: backend
│   description: "Implements backend services..."
│   metadata:
│     tier: execution
│     model: sonnet
│   ---
│   # Backend Developer
│   Core instructions here.
│   See @resources/api-patterns.md for details.
│
└── resources/
    ├── api-patterns.md        # Detailed API patterns
    ├── database-examples.md   # Database interaction examples
    └── testing-guide.md       # Testing best practices
```

For a 2-level archetype (e.g. `analyst`) only `archetype:` is required (no
`branch:`). The file path is the same flat shape either way:

```
agents/data-scientist.md
    ---
    name: data-scientist
    archetype: analyst
    description: "..."
    ---
```

## Conversion Checklist

When creating a new agent:

- [ ] Pick the archetype (`developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`, `strategist`, `core`, `leadership`)
- [ ] If 3-level archetype, pick the branch (see valid branches above)
- [ ] Create `agents/{agent-name}.md`. The file basename must equal `name:`
- [ ] Frontmatter: `name`, `archetype`, `branch` (3-level only), `description` at top level; `tier` in `metadata:`
- [ ] Extract detailed content to `agents/{agent-name}/resources/`
- [ ] Add `@{agent-name}/resources/<file>.md` references in the body
- [ ] No registration step. The flat `agents/` scan is the registry
- [ ] Run `bash scripts/ci/validate-agents.sh` to verify
- [ ] Test agent loading
- [ ] Measure token savings

## Deprecation: `_deprecated/` Bucket Pattern (v12.0.5+)

Agents slated for removal should be moved to the `_deprecated/` bucket
(e.g., `agents/_deprecated/old-agent/SKILL.md`). Agents under `_deprecated/`:

- **Are kept on disk**. `scripts/migration/v12-aliases.yaml` can still resolve an
  old user reference to the deprecated agent.
- **Are structurally unregistered**. The `agents/` scan is non-recursive, so
  discovery cannot see anything in a subdirectory. The planner and the router
  will not select it for new work.
- **Should not appear in CLAUDE.md catalog counts**. The catalog shows only the
  active agents.

### Promotion path

To restore an agent in `_deprecated/`, move its definition back up to
`agents/<name>.md`. Move its playbooks to `agents/<name>/resources/`. Claude Code
discovers it on the next session load. There is nothing to re-register.

### Eventual removal

After at least one minor-bump release cycle in `_deprecated/`, an agent
may be physically removed. Its alias entry in `v12-aliases.yaml` remains
so user references resolve gracefully even after disk deletion.

### Why not delete

Pre-v12.0.5, deleted agents became silent 404s in user prompts that
referenced them by name. The bucket pattern adds a graceful warn-then-remove
path: deprecation period for visibility, then removal once references quiet.

## Token Savings Target

| Agent Type | Before (tokens) | After (tokens) | Savings |
|------------|-----------------|----------------|---------|
| Controller | ~800 | ~300 | 62% |
| Execution | ~600 | ~250 | 58% |
| Support | ~400 | ~150 | 62% |

**Target: 40-60% token savings across agent catalog**

## Skill Frontmatter (Claude Code Skills)

Skills in `.claude/skills/` follow the
[Agent Skills spec](https://agentskills.io) for frontmatter. The spec allows
exactly 6 top-level frontmatter fields. The `metadata` map holds the Claude
Code-specific extensions, which are argument-hint, user-invocable, context, and
agent.

### Agent Skills Spec-Compliant Schema

```yaml
---
name: my-skill                     # Required: Must match directory name (kebab-case, 1-64 chars)
description: "What this skill does" # Required: When to use it (1-1024 chars)
license: MIT                       # Optional: License name or reference
metadata:                          # Optional: Key-value map for extensions
  author: org-name
  version: "1.0"
  argument-hint: "<request> [flags]"  # Claude Code extension: autocomplete hint
  user-invocable: "true"              # Claude Code extension: show in / menu
  context: "none"                     # Claude Code extension: fork|none
  agent: "false"                      # Claude Code extension: subagent type
allowed-tools: Read, Grep, Bash    # Optional: Space-delimited pre-approved tools
compatibility: "Claude Code"       # Optional: Environment requirements (1-500 chars)
---
```

**Spec-allowed top-level fields (6 only)**: `name`, `description`, `license`,
`compatibility`, `metadata`, and `allowed-tools`. Any other field at the top
level triggers a validation error in `skills-ref validate`.

**Claude Code extensions in metadata**: `argument-hint`, `user-invocable`,
`context`, and `agent` are Claude Code-specific fields. They are stored as string
key-value pairs inside `metadata`. Claude Code reads the metadata keys for these
values.

### Legacy Schema (pre-V10.22.5)

The following top-level fields were used before Agent Skills spec alignment and are now stored in `metadata`:

```yaml
# DEPRECATED top-level fields, move to metadata:
argument-hint: "<request> [flags]" # -> metadata.argument-hint
user-invocable: false              # -> metadata.user-invocable
context: fork                      # -> metadata.context
agent: Explore                     # -> metadata.agent
```

### Skill Invocation Control

| Frontmatter | User can invoke | Claude can invoke | Context behavior |
|-------------|----------------|-------------------|------------------|
| (default) | Yes | Yes | Description in context, full loads on invoke |
| `disable-model-invocation: true` | Yes | No | Not in context, loads when user invokes |
| `user-invocable: false` | No | Yes | Description in context, loads when Claude invokes |

### String Substitutions in Skills

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Access specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`) |
| `${CLAUDE_SESSION_ID}` | Current session ID |

### Dynamic Context Injection

The `` !`command` `` syntax runs shell commands before skill content is sent to Claude:

```yaml
---
name: pr-summary
context: fork
agent: Explore
---
## PR Context
- PR diff: !`gh pr diff`
- Comments: !`gh pr view --comments`
```

Commands execute immediately and output replaces the placeholder.

### Running Skills in Subagents (context: fork)

When `context: fork` is set:
1. A new isolated context is created
2. The subagent receives skill content as its prompt
3. The `agent` field determines execution environment (model, tools, permissions)
4. Results summarized and returned to main conversation

Available agent types: `Explore` (read-only, haiku), `Plan` (read-only), `general-purpose` (all tools), or any custom subagent name.

The `ExitWorktree` tool (CC 2.1.72) is available inside a worktree-isolated
subagent. It exits the worktree and returns to the parent context. Use it when
the subagent finished its isolated work and needs to signal completion cleanly.

### Skill Location Precedence

| Location | Scope | Priority |
|----------|-------|----------|
| Enterprise managed | All users in org | Highest |
| `~/.claude/skills/` | All your projects | High |
| `.claude/skills/` | This project only | Medium |
| Plugin `skills/` | Where plugin enabled | Lowest |

Skills from `--add-dir` directories are also loaded and support live change detection.

### Skill Chaining (removed in v11.2.10)

V10.18.0 prototyped the `output_contract` and `input_from` skill-chaining
pattern, but nobody ever implemented it. This section described it before, with
example YAML and a table of chaining flags. No skill ever declared an
`output_contract` block or an `input_from` block, and the matching /act flags
no-op'd silently at runtime. Version 11.2.10 removed the flag advertisements and
the design prose, in Q-005 of the v11.2.x improvement pass. The `--brief` flag
was the one skill-chain mechanism that shipped through V11.2.x. `/org` consumed
it, and v12.2.0 removed `/org` and absorbed cross-domain coordination into
`/team` strategic mode. See
`cagents-memory/sessions/team_v11-2-improvement-pass_260507_001/outputs/wave-1/`
for the design-vs-implementation gap analysis that triggered the removal.

## Example: Full Controller SKILL.md (v11.1.0+)

Lives at `developer/fullstack/tech-lead/SKILL.md`:

```yaml
---
name: tech-lead
archetype: developer
branch: fullstack
description: "Coordinates engineering work via question-based delegation. Use for tier 2+ engineering tasks requiring multi-specialist coordination."
metadata:
  tier: controller
  model: opus
  coordination_style: question_based
  typical_questions:
    - "What is the current implementation?"
    - "What are the technical constraints?"
    - "What are the key risks?"
  color: bright_white
  capabilities:
    - strategic_oversight
    - risk_assessment
    - team_coordination
allowed-tools: Read Grep Glob Write Edit Bash Agent TaskCreate TaskUpdate TaskList TaskGet
initialPrompt: "Read cagents-memory/sessions/*/workflow/plan.yaml if it exists and note the current phase."
---

# Engineering Manager

<!--
  Note on task-tracking tools (V11.1.7+): Interactive Claude Code sessions MUST use
  TaskCreate/TaskUpdate/TaskList/TaskGet for progress visibility. TodoWrite is the
  Agent SDK / non-interactive equivalent (per docs.claude.com/docs/en/tools.md) and
  remains valid only when the SDK is the runtime. Agents should declare TaskCreate
  TaskUpdate TaskList TaskGet in `allowed-tools` for interactive runtimes.
-->


Strategic leader for engineering coordination.

## Core Responsibilities

1. Risk assessment for tier 3-4 plans
2. Multi-instruction priority arbitration
3. Go/no-go decisions

See @resources/risk-framework.md for detailed assessment criteria.
See @resources/coordination-examples.md for delegation patterns.
```
