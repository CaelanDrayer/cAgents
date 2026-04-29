---
paths:
  - "developer/**/SKILL.md"
  - "operator/**/SKILL.md"
  - "advisor/**/SKILL.md"
  - "analyst/**/SKILL.md"
  - "creator/**/SKILL.md"
  - "writer/**/SKILL.md"
  - "strategist/**/SKILL.md"
  - "core/**/SKILL.md"
  - "leadership/**/SKILL.md"
  - ".claude/skills/**"
---

# SKILL.md Agent and Skill Format Specification

V11.1.0 agent/skill format based on official Claude Code SKILL.md, subagent specification, and the [Agent Skills spec](https://agentskills.io). The v11.1.0 builder-role archetype tree replaced the per-domain `{domain}/agents/` layout — agents now live under one of 9 archetype roots, with a `branch:` segment for the three 3-level archetypes.

## Frontmatter Schema

```yaml
---
name: agent-name                    # Required: Unique identifier (kebab-case)
description: "Brief description"    # Required: 1-2 sentence purpose statement
archetype: developer|operator|advisor|analyst|creator|writer|strategist|core|leadership  # Required: builder-role archetype (top-level)
branch: <branch-name>               # Required ONLY for 3-level archetypes (developer, operator, advisor)
vibe: "One-liner personality hook"  # Optional: Agent essence/tagline (max 80 chars)
tier: controller|execution|support  # Required: Agent tier classification
model: opus|opusplan|sonnet|haiku  # Optional: Preferred model (see model_routing.yaml)
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
- Must match filename (e.g., `engineering-manager.md` -> `name: engineering-manager`)
- Used for agent routing and references

### description
- Brief, actionable description (1-2 sentences)
- Starts with role/purpose
- Explains when to use this agent
- Example: "Coordinates engineering work via question-based delegation. Use for tier 2+ engineering tasks."

### tier
- `controller`: Tier 2 agents that coordinate work through questions
- `execution`: Tier 3 agents that implement work and answer questions
- `support`: Tier 4 agents providing foundational services
- `infrastructure`: Core pipeline agents (orchestrator, planner, decomposer, validator, etc.) that form the execution backbone. Used by the 16 agents in `core/`.

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
The top-level `domain:` field was replaced by `archetype:` (and `branch:` for 3-level archetypes) in the v11.1.0 builder-role-tree migration. See [CHANGELOG entry for 11.1.0](../../../CHANGELOG.md). New agents MUST NOT include a top-level `domain:` field — `validate-agents.sh` rejects it as an error. Legacy `domain:` inside the `metadata:` block is tolerated for now (still present in many agent files) but is not load-bearing and should be considered deprecated.

## Optional Fields

### vibe
- One-liner personality hook capturing the agent's essence (max 80 chars)
- Should convey the agent's working philosophy, not just restate the description
- Examples: "Ships clean APIs that survive production traffic at 3 AM", "Finds the bugs before your users do"
- Added to ~20 representative agents in V10.17.0, pattern documented for remaining agents

### model
- Preferred model alias: `opus`, `opusplan`, `sonnet`, or `haiku`
- These aliases map to the latest Claude generation: `opus` -> Claude Opus 4.6, `sonnet` -> Claude Sonnet 4.6, `haiku` -> Claude Haiku 4.5
- `opusplan`: Claude Opus 4.6 reasoning + Claude Sonnet 4.6 execution (ideal for controllers)
- Overridden by model_routing.yaml scenario detection and environment variables
- If omitted, uses model_routing.yaml defaults
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
- Keep it concise (under 200 tokens) — it runs on every spawn
- Example: `"Read workflow/plan.yaml and summarize the current phase and objectives"`

### coordination_style (Controllers only)
- `question_based`: Uses question delegation pattern
- Controllers MUST have this field

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
developer/fullstack/engineering-manager/
├── SKILL.md                    # Tier 1 + 2: Frontmatter + Instructions
└── resources/
    ├── typical-questions.md    # Tier 3: Full question catalog
    ├── coordination-examples.md # Tier 3: Example workflows
    └── anti-patterns.md        # Tier 3: What NOT to do
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

In SKILL.md body, reference tier 3 resources:

```markdown
## Detailed Questions

See @resources/typical-questions.md for the full question catalog.

## Coordination Examples

Reference @resources/coordination-examples.md for workflow examples.
```

The `@path` syntax triggers on-demand loading when the resource is needed.

## Migration Path

### Pre-v11.1.0 Single-File Agent (legacy — REMOVED)

For historical reference only. The legacy schema used a top-level `domain:` field instead of `archetype:`/`branch:`. New agents MUST use the v11.1.0 schema below (validate-agents.sh rejects top-level `domain:` as an error).

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

For a 2-level archetype (e.g. `analyst`), the path is `analyst/{agent-name}/SKILL.md` and only `archetype:` is required (no `branch:`):

```
analyst/data-scientist/
└── SKILL.md
    ---
    name: data-scientist
    archetype: analyst
    description: "..."
    ---
```

## Conversion Checklist

When creating a new agent in the v11.1.0 archetype tree:

- [ ] Pick the archetype root (`developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`, `strategist`, `core`, `leadership`)
- [ ] If 3-level archetype, pick the branch (see valid branches above)
- [ ] Create `{archetype}/{branch?}/{agent-name}/SKILL.md`
- [ ] Frontmatter: `name`, `archetype`, `branch` (3-level only), `description` at top level; `tier` in `metadata:`
- [ ] Extract detailed content to `resources/`
- [ ] Add `@path` references in SKILL.md body
- [ ] Run `bash scripts/sync-agents.sh` to register the agent in `.claude-plugin/plugin.json`
- [ ] Run `bash scripts/lint-agents.sh` and `bash scripts/ci/validate-agents.sh` to verify
- [ ] Test agent loading
- [ ] Measure token savings

## Token Savings Target

| Agent Type | Before (tokens) | After (tokens) | Savings |
|------------|-----------------|----------------|---------|
| Controller | ~800 | ~300 | 62% |
| Execution | ~600 | ~250 | 58% |
| Support | ~400 | ~150 | 62% |

**Target: 40-60% token savings across agent catalog**

## Skill Frontmatter (Claude Code Skills)

Skills in `.claude/skills/` follow the [Agent Skills spec](https://agentskills.io) for frontmatter. The spec allows exactly 6 top-level frontmatter fields. Claude Code-specific extensions (argument-hint, user-invocable, context, agent) are stored inside the `metadata` map.

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

**Spec-allowed top-level fields (6 only)**: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. Any other field at the top level triggers a validation error with `skills-ref validate`.

**Claude Code extensions in metadata**: Fields like `argument-hint`, `user-invocable`, `context`, and `agent` are Claude Code-specific. They are stored as string key-value pairs inside `metadata`. Claude Code reads metadata keys for these values.

### Legacy Schema (pre-V10.22.5)

The following top-level fields were used before Agent Skills spec alignment and are now stored in `metadata`:

```yaml
# DEPRECATED top-level fields — move to metadata:
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

The `ExitWorktree` tool (CC 2.1.72) is available within worktree-isolated subagents to explicitly exit the worktree and return to the parent context. Use it when the subagent has finished its isolated work and needs to signal completion cleanly.

### Skill Location Precedence

| Location | Scope | Priority |
|----------|-------|----------|
| Enterprise managed | All users in org | Highest |
| `~/.claude/skills/` | All your projects | High |
| `.claude/skills/` | This project only | Medium |
| Plugin `skills/` | Where plugin enabled | Lowest |

Skills from `--add-dir` directories are also loaded and support live change detection.

### Skill Chaining (V10.18.0)

> **Status: ASPIRATIONAL** -- The `output_contract` and `input_from` frontmatter fields described below are designed but not yet implemented in any skill. No skill currently declares an `output_contract` or `input_from` field. The `--from-review` and `--from-designer` flags are not yet functional. This section documents the intended design for future implementation.

Skills can declare output contracts and consume other skills' outputs, enabling pipelines like `/review -> /run --from-review -> /team`.

**Output Contract** (in skill frontmatter):
```yaml
---
name: review
output_contract:
  format: yaml
  file: "workflow/review_report.yaml"
  schema:
    findings: "array of {file, line, severity, message, fix}"
    summary: "string"
    quality_score: "number 0-100"
---
```

**Input From** (consuming another skill's output):
```yaml
---
name: run
input_from:
  review:
    file: "workflow/review_report.yaml"
    flag: "--from-review"
    inject_as: "review_findings"
  designer:
    file: "workflow/design_document.yaml"
    flag: "--from-designer"
    inject_as: "design_spec"
---
```

**Chaining Flags**:
| Flag | Source Skill | What It Does |
|------|-------------|-------------|
| `--from-review` | `/review` | Reads review findings, auto-creates fix work items |
| `--from-designer` | `/designer` | Reads design doc, uses as implementation spec |

**How chaining works**:
1. Source skill writes output to its declared `output_contract.file`
2. Consumer skill checks for the file when invoked with the chaining flag
3. If file exists, its content is injected into the enrichment context as `inject_as`
4. The planner/decomposer uses the injected context to inform work items

**Example pipeline**:
```bash
/review src/auth/          # Produces review_report.yaml with 5 findings
/run Fix review findings --from-review  # Reads findings, creates fix work items
```

## Example: Full Controller SKILL.md (v11.1.0+)

Lives at `developer/fullstack/engineering-manager/SKILL.md`:

```yaml
---
name: engineering-manager
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
allowed-tools: Read Grep Glob Write Edit Bash Agent TodoWrite
initialPrompt: "Read cagents-memory/sessions/*/workflow/plan.yaml if it exists and note the current phase."
---

# Engineering Manager

Strategic leader for engineering coordination.

## Core Responsibilities

1. Risk assessment for tier 3-4 plans
2. Multi-instruction priority arbitration
3. Go/no-go decisions

See @resources/risk-framework.md for detailed assessment criteria.
See @resources/coordination-examples.md for delegation patterns.
```
