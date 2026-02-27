# Topic Deep Dive Guides

Content for `/helper --topic <topic>` deep dives.

## Topic: flags

### How Flags Work Across All Commands

Flags are optional modifiers that customize command behavior. They follow the command and request text.

**Syntax**: `/command <request> --flag-name [value]`

**Common patterns across all commands:**

| Pattern | Commands | What It Does |
|---------|----------|-------------|
| `--dry-run` | /run, /review, /optimize, /team | Preview without executing |
| `--interactive` | /run, /review, /optimize | Ask user preferences before starting |
| `--quiet` / `-q` | /run, /team | Suppress output/plan display |
| `--domain <name>` | /run, /team | Override automatic domain detection |
| `--tier <N>` | /run, /team | Override complexity tier (2-4) |
| `--focus <area>` | /designer, /review, /optimize | Focus on specific area |

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
/review src/ --focus security
  |
  Finds: 3 critical, 7 high issues
  |
  User decides to fix
  |
  /run Fix critical security issues from review session {id}
```

#### Optimize-Verify Pipeline

```
/optimize src/ --review-after
  |
  Optimizations applied with before/after metrics
  |
  /review auto-triggered to verify quality  <-- auto-triggered via flag
```

#### Explore-Optimize Pipeline

```
/optimize --explore-first
  |
  /designer triggered to explore approach  <-- auto-triggered via flag
  |
  Design complete
  |
  /optimize applies the designed approach
```

#### Plan-Implement Pipeline

```
/optimize --plan-only
  |
  Optimization plan generated
  |
  /run auto-triggered for implementation  <-- auto-triggered via flag
```

**Key integration flags:**
- `--review-after` (on /optimize) -- triggers /review after optimization
- `--plan-only` (on /optimize) -- generates plan, hands off to /run
- `--explore-first` (on /optimize) -- starts with /designer
- `--team` (on /run) -- activates /team mode
- Build offer (on /designer) -- auto-triggers /run or /team

---

## Topic: domains

### The 5 Super-Domains

cAgents organizes 238 agents into 5 super-domains. When you use `/run` or `/team`, the system automatically detects which domain to route to.

#### Make (111 agents) -- Creation

Everything related to building and creating:
- **Engineering**: Bug fixes, features, APIs, databases, DevOps
- **Creative**: Stories, content, design, game development
- **Product**: Product management, UX design

**Example requests**: "Fix the auth bug", "Write a novel", "Add payment gateway", "Design game mechanics"

#### Grow (38 agents) -- Acquisition

Everything related to marketing and sales:
- **Marketing**: Campaigns, SEO, content marketing, social media
- **Sales**: Sales strategy, pipeline, outreach, forecasting

**Example requests**: "Plan Q4 campaign", "Create sales forecast", "Write ad copy"

#### Operate (13 agents) -- Operations

Everything related to finance and operations:
- **Finance**: Budgets, FP&A, accounting, procurement
- **Operations**: Process optimization, logistics

**Example requests**: "Create Q4 budget", "Streamline invoice approval", "Analyze expenses"

#### People (20 agents) -- Talent

Everything related to HR and culture:
- **HR**: Recruiting, onboarding, compensation, benefits
- **Culture**: Team building, engagement, change management

**Example requests**: "Hire software engineer", "Design onboarding workflow", "Plan team event"

#### Serve (28 agents) -- Support & Governance

Everything related to customer experience and legal:
- **Customer Experience**: Support, success management, feedback
- **Legal & Compliance**: Contracts, policies, GDPR, regulations

**Example requests**: "Handle customer complaint", "Review contract", "Create privacy policy"

#### Domain Detection

The system uses 3 methods to detect the right domain:
1. **Keyword matching**: "Fix bug" -> Engineering, "Create budget" -> Finance
2. **Context analysis**: Project structure, git history, file types
3. **Framework detection**: package.json -> JavaScript/TypeScript engineering

You can override detection with `--domain <name>`.

---

## Topic: workflow

### How Agent Orchestration Works Under the Hood

When you use `/run`, here is what happens step by step:

```
Step 1: TRIGGER (domain detection)
  - Analyzes your request text
  - Detects domain (Make, Grow, Operate, People, Serve)
  - Classifies intent (bug fix, feature, question, etc.)
  - Validates feasibility

Step 2: ORCHESTRATOR (phase conductor)
  - Creates session in Agent_Memory/sessions/
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
  - Controller (e.g., engineering-manager) takes over
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

### The 238 Agents and How They Are Organized

cAgents has 238 specialized agents organized in a 4-tier hierarchy:

#### Tier 1: Core Infrastructure (14 agents)

These are the backbone -- they manage workflows, not tasks:
- **trigger** -- Entry point, domain detection
- **orchestrator** -- Phase conductor
- **universal-router/planner/executor/validator/self-correct** -- Universal workflow agents
- **task-decomposer/consolidator/inventory** -- Task management
- **team-trigger/team-lead-adapter** -- Team coordination
- **hitl** -- Human escalation
- **optimizer** -- Universal optimization

#### Tier 2: Controllers (~53 agents)

Controllers coordinate work through question-based delegation:
- **engineering-manager** -- Engineering work
- **architect** -- System design
- **creative-director** -- Creative work
- **campaign-manager** -- Marketing campaigns
- **operations-manager** -- Operations
- **hr-manager** -- HR tasks
- **customer-success-manager** -- Customer support
- And many more specialized controllers...

#### Tier 3: Execution Agents (~147 agents)

These are the specialists that do the actual work:
- **backend-developer**, **frontend-developer** -- Code
- **copywriter**, **content-marketing-manager** -- Content
- **qa-lead**, **security-specialist** -- Quality
- **game-designer**, **game-programmer** -- Game development
- **financial-analyst**, **accountant** -- Finance
- And many more...

#### Tier 4: Support Agents (~19 agents)

Foundational services:
- **scribe** -- Documentation
- **data-extractor** -- Data handling

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

Every command creates a session directory in `Agent_Memory/sessions/`.

#### Session Naming

| Command | Session ID Format | Example |
|---------|-------------------|---------|
| `/run` | `run_YYYYMMDD_HHMMSS` | `run_20260207_143022` |
| `/designer` | `designer_YYYYMMDD_HHMMSS` | `designer_20260207_143022` |
| `/review` | `review_YYYYMMDD_HHMMSS` | `review_20260207_143022` |
| `/optimize` | `optimize_YYYYMMDD_HHMMSS` | `optimize_20260207_143022` |
| `/team` | `team_YYYYMMDD_HHMMSS` | `team_20260207_143022` |

#### Key Session Files

```
Agent_Memory/sessions/{session_id}/
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
