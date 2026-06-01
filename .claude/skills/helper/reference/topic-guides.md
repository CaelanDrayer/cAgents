# Topic Deep Dive Guides

Content for `/helper --topic <topic>` deep dives.

## Topic: flags

### How Flags Work Across All Commands

Flags are optional modifiers that customize command behavior. They follow the command and request text.

**Syntax**: `/command <request> --flag-name [value]`

**Common patterns across all commands:**

| Pattern | Commands | What It Does |
|---------|----------|-------------|
| `--dry-run` | /run (incl. review/optimize/improve keyword-router modes), /team (incl. strategic mode, v12.2.0+; pre-v12.2.0 also /org) | Preview without executing |
| `--interactive` | /run (incl. keyword-router modes) | Ask user preferences before starting |
| `--quiet` / `-q` | /run, /team | Suppress output/plan display |
| `--domain <name>` | /run, /team | Override automatic domain detection |
| `--tier <N>` | /run, /team | Override complexity tier (2-4) |
| `--focus <area>` | /designer, /run (review and optimize keyword-router modes) | Focus on specific area |
| `--mode review\|optimize\|full` | /run (implicit via keyword router; first-token `review`/`audit`/`optimize`/`improve` infers the mode) | Select pipeline branch (v12.1.2) |

**Flag parsing rules:**
- Flags start with `--` (or `-` for short versions like `-q`)
- The request text is everything BEFORE the first `--` flag
- Value flags take the next word: `--members 4`, `--domain engineering`
- Boolean flags are present or absent: `--dry-run`, `--parallel`

**Example**: `/run Fix the auth bug --interactive --tier 3`
- Request: "Fix the auth bug"
- Flags: interactive=true, tier=3

For complete flag references, see `/helper --flags run`, `/helper --flags review`, etc.

---

## Topic: integration

### How Commands Work Together (Pipelines)

Commands are designed to compose into workflows. The most common pipelines:

#### Design-Build Pipeline (most common)

```
/designer <topic>
  |
  Structured Q&A (15-45 min)
  |
  Design document + artifacts generated
  |
  User selects "Build it now"
  |
  /run implement design from {session_id}   <-- auto-triggered
```

This is the recommended workflow for features that need planning before implementation.

#### Design-Team-Build Pipeline (big features)

```
/designer <topic>
  |
  Design document generated
  |
  User selects "Build with team"
  |
  /team implement design from {session_id}  <-- auto-triggered
```

Use when the design decomposes into 3+ parallel work items.

#### Review-Fix Pipeline

```
/run review src/ --focus security
  |
  Finds: 3 critical, 7 high issues
  |
  User decides to fix
  |
  /run Fix critical security issues from improve session {id}
```

#### Review + Optimize in One Run

```
/run improve src/
  |
  Single shared baseline measured
  |
  Review findings AND optimizations applied with before/after metrics
  |
  Unified improve_report.md
```

**Key integration flags:**
- `/run improve <path>` (keyword router — infers mode=full) -- review + optimize with one shared baseline
- `--team` (on /run) -- activates /team mode
- `--mode debug` (on /run) -- systematic 4-phase debugging
- Build offer (on /designer) -- auto-triggers /run or /team

---

## Topic: domains

### The 15 Domains

cAgents organizes 243 agents across 15 domains. When you use `/run` or `/team`, the system automatically detects which domain to route to.

#### Engineering (31 agents)

Software engineering, infrastructure, security, QA:
- Backend, frontend, DevOps, architecture, security, game programming

**Example requests**: "Fix the auth bug", "Add payment gateway", "Deploy to production"

#### Creative (30 agents)

Creative writing, narrative design, game art, audio:
- Story architecture, narrative design, literary criticism, game development

**Example requests**: "Write a novel", "Design game mechanics", "Create character backstory"

#### Business (28 agents)

Strategy, product, operations, finance:
- Product management, operations, finance, procurement

**Example requests**: "Plan product roadmap", "Create Q4 budget", "Plan marketing campaign"

#### Growth (34 agents)

Revenue and customer acquisition:
- Marketing campaigns, SEO, sales strategy, demand generation

**Example requests**: "Plan Q4 campaign", "Create sales forecast", "Improve conversions"

#### People (17 agents)

HR, talent acquisition, culture:
- Recruiting, onboarding, compensation, team building, change management

**Example requests**: "Hire software engineer", "Design onboarding workflow", "Plan team event"

#### Service (28 agents)

Customer support, legal, compliance:
- Customer experience, support, legal, contracts, compliance, governance

**Example requests**: "Handle customer complaint", "Review contract", "Create privacy policy"

#### Leadership (11 agents)

C-suite executives (used by /team strategic mode in v12.2.0+; not directly routable):
- CTO, CRO, CFO, COO, CHRO, CEO, chief-of-staff, strategy-director

#### Core (17 agents)

Infrastructure agents (trigger, orchestrator, planner, reviewer, validator, coordinator, etc.).

#### Shared (12 agents)

Cross-domain intelligence utilities:
- BI specialist, data scientist, market research, competitive intelligence

#### Science, Health, Education, Personal, Arts, Trades (10 + 5 + 5 + 5 + 5 + 5 agents)

Smaller domains served by `coordinator` from `core/`. STEM research, medical/wellness, teaching, career/life coaching, visual arts/music/film, and culinary/construction/automotive/agriculture work routes here.

#### Domain Detection

The system uses keyword matching and context analysis to detect the right domain automatically. You can override detection with `--domain <name>`.

---

## Topic: workflow

### How Agent Orchestration Works Under the Hood

When you use `/run`, here is what happens step by step:

```
Step 1: TRIGGER (domain detection)
  - Analyzes your request text
  - Detects domain (Engineering, Creative, Business, Growth, People, Service)
  - Classifies intent (bug fix, feature, question, etc.)
  - Validates feasibility

Step 2: ORCHESTRATOR (phase conductor)
  - Creates session in cagents-memory/sessions/
  - Proceeds through 5 phases automatically

Step 3: ROUTING PHASE
  - Universal Router classifies tier (2-4)
  - Sets requires_controller flag (always true)
  - Validates domain selection

Step 4: PLANNING PHASE
  - Universal Planner creates objectives
  - Selects controller(s) for coordination
  - Aggressive decomposition: turns "add auth" into 30+ work items
  - Writes plan.yaml and decomposition.yaml

Step 5: COORDINATING PHASE
  - Controller (e.g., tech-lead) takes over
  - Asks specialist questions via execution agents:
    "What is the current auth implementation?" -> backend-developer
    "What security risks exist?" -> security-specialist
    "What testing strategy?" -> qa-lead
  - Synthesizes answers into coherent solution
  - Creates implementation task list
  - Writes coordination_log.yaml

Step 6: EXECUTING PHASE
  - Universal Executor monitors controller progress
  - Execution agents implement work items
  - Evidence captured for each completion criterion

Step 7: VALIDATING PHASE
  - Universal Validator checks quality gates
  - Verifies all acceptance criteria met
  - Checks evidence chain exists
  - PASS -> Complete, FIXABLE -> Self-Correct, BLOCKED -> HITL
```

All phase transitions are **automatic** -- no user permission needed (except for tier 4 HITL gates).

---

## Topic: tiers

### Complexity Tiers Explained

Every request is classified into a complexity tier, which determines how many agents and controllers are involved.

#### Tier 2 -- Moderate (minimum tier)

- **1 primary controller** coordinates the work
- Used for: bug fixes, simple features, questions, quick changes
- Examples: "Fix the login bug", "What is the best caching strategy?", "Fix typo on about page"
- Pattern: Controller asks 3-5 questions -> synthesizes -> coordinates implementation

#### Tier 3 -- Complex

- **1 primary + 1-2 supporting controllers** coordinate
- Used for: new features, system additions, multi-part work
- Examples: "Add OAuth2 authentication", "Build user dashboard", "Create marketing campaign"
- Pattern: Primary controller leads, supporting controllers handle specialized aspects (security, architecture)

#### Tier 4 -- Expert

- **1 executive + 1 primary + 2-4 supporting controllers + HITL approval**
- Used for: major refactors, architecture migrations, strategic initiatives
- Examples: "Migrate from monolith to microservices", "Major database migration", "Company-wide rebranding"
- Pattern: Executive oversight (CTO, CFO, etc.) + full coordination team + human approval gates

**Important notes:**
- There is no tier 0 or 1 anymore. All requests get minimum tier 2.
- Even "simple" questions get comprehensive expert answers via controller coordination.
- Use `--tier <N>` to override the automatic classification.

---

## Topic: agents

### The 243 Agents and How They Are Organized

cAgents has 243 specialized agents organized in a 4-tier hierarchy:

#### Tier 1: Core Infrastructure (17 agents)

These are the backbone -- they manage workflows, not tasks:
- **trigger** -- Entry point, domain detection
- **orchestrator** -- Phase conductor
- **router/planner/executor/validator/self-correct** -- Universal workflow agents (planner absorbed `task-decomposer` and `prompt-engineer` in v12.0.0)
- **task-merger/task-state** -- Task management (`task-decomposer` was absorbed into `planner` in v12.0.0)
- **team** -- Team coordination (replaces the standalone `team-trigger` and `team-lead-adapter` agents removed in v12.0.0 — `/team` skill loop now does this work inline)
- **hitl** -- Human escalation
- **optimizer** -- Universal optimization

#### Tier 2: Controllers

Controllers coordinate work through question-based delegation:
- **tech-lead**, **architect** -- Engineering
- **narrative-director** -- Creative
- **operations-manager**, **marketing-strategist** -- Business
- **hr-manager** -- People
- **customer-success-manager**, **general-counsel** -- Service
- And many more specialized controllers...

#### Tier 3: Execution Agents

These are the specialists that do the actual work:
- **backend-developer**, **frontend-developer** -- Code
- **copywriter**, **content-marketing-manager** -- Content
- **qa-lead**, **security-lead** -- Quality
- **game-designer** -- Game development
- **financial-analyst** -- Finance
- And many more...

#### Tier 4: Support Agents

Foundational services and cross-domain utilities.

**Agent selection is automatic** -- controllers choose the right execution agents based on the questions they need answered.

---

## Topic: teams

### How Team Mode Works

Team mode uses Claude Code's built-in agent teams for parallel execution.

#### The Basic Idea

Instead of running work items one after another (sequential), team mode runs them simultaneously in separate Claude Code instances (parallel). Each teammate executes their work item via `/run`, getting full orchestration quality per item.

#### Display Modes

| Mode | How It Looks | Requirements |
|------|-------------|--------------|
| **tmux** | Each teammate in a visible split pane. All panes visible at once in a tiled layout. | tmux installed |
| **in-process** | All teammates in the main terminal. Navigate with Shift+Up/Down. | None |
| **auto** (default) | tmux if inside a tmux session, otherwise in-process. | None |

#### When It Helps

- 3+ independent work items (items that do not depend on each other)
- Complex tasks (tier 3+)
- 40-60% time reduction compared to sequential /run

#### When It Does NOT Help

- Sequential tasks (each depends on the previous)
- Fewer than 3 work items
- Simple tier 2 tasks

#### Communication

- Team lead coordinates via **SendMessage** (direct messages and broadcasts)
- Shared **TaskList** tracks work item status
- Teammates can check **TaskList** to claim unblocked items
- Dependencies are respected (blocked items wait for their dependencies)

---

## Topic: sessions

### Session Management, Resume, and Recovery

Every command creates a session directory in `cagents-memory/sessions/`.

#### Session Naming

| Command | Session ID Format | Example |
|---------|-------------------|---------|
| `/run` | `run_{slug}_{YYMMDD}_{NNN}` | `run_fix-auth-module_260207_001` |
| `/designer` | `designer_{slug}_{YYMMDD}_{NNN}` | `designer_redo-session-names_260207_001` |
| `/team` | `team_{slug}_{YYMMDD}_{NNN}` | `team_implement-oauth2_260207_001` |
| `/org` (pre-v12.2.0; removed) | `org_{slug}_{YYMMDD}_{NNN}` | `org_launch-product_260207_001` (legacy sessions on disk still recognized; new strategic-mode work uses `team_*` session IDs) |

#### Key Session Files

```
cagents-memory/sessions/{session_id}/
+-- instruction.yaml        # What the user asked
+-- status.yaml              # Current phase and progress
+-- task_plan.md             # Work item breakdown
+-- findings.md              # Discoveries and decisions
+-- progress.md              # Status and resume instructions
+-- workflow/                # Detailed workflow state
+-- waypoints/               # Checkpoint snapshots
+-- outputs/                 # Final deliverables
```

#### Resuming Sessions

- **Designer**: Use `/designer --resume {session_id}` to continue where you left off
- **Other commands**: Session catchup hook detects incomplete sessions at startup and offers to resume
- **Waypoints**: Snapshots created at phase transitions, enabling recovery from any point
- **Three-file pattern**: task_plan.md + findings.md + progress.md provide 60-80% context savings vs loading full logs

#### Context Compaction

When the context window fills up, Claude Code compacts the conversation. The **PreCompact hook** saves critical state to waypoint files before this happens, ensuring workflow state survives context compaction.
