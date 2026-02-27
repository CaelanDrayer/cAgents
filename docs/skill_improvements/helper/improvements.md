# /helper Improvement Recommendations

## Priority 1: High Impact, Moderate Effort

### 1.1 Add /org to All Reference Content

**Current**: /org is missing from command-details.md, comparison-tables.md, and flag-summaries.md.
**Proposed**: Full /org documentation integrated across all reference files.

**command-details.md addition:**
```
## /org - Corporate Hierarchy Orchestration

### What It Does
/org orchestrates multi-domain tasks through a corporate hierarchy model.
A CEO (inline) engages C-suite agents (CTO, CCO, CRO, CFO, COO, CHRO,
General Counsel) for parallel domain analysis, conducts deliberation with
objection rounds, produces a strategic brief, then delegates to parallel
/team invocations per domain.

### When to Use /org
- Multi-domain initiatives (engineering + marketing + hiring)
- Strategic-level tasks requiring cross-domain coordination
- Product launches, company restructures, major migrations
- When you need a strategic brief with risk register and dependencies

### When NOT to Use /org
- Single-domain tasks -> use /run or /team directly
- Simple bug fixes -> use /run
- Parallel execution within one domain -> use /team
```

**comparison-tables.md addition:** Add /org column to all matrices:
```
| Dimension | /run | /designer | /review | /optimize | /team | /org |
|-----------|------|-----------|---------|-----------|-------|------|
| Purpose   | Execute | Design  | Review  | Improve   | Parallel | Multi-domain hierarchy |
| Interaction | Auto | Q&A    | Auto    | Auto      | Auto  | Auto (with deliberation) |
| Duration  | Varies | 15-45m  | 3-10m   | 5-20m     | 40-60% faster | 25-60m |
```

**flag-summaries.md addition:** Full /org flag table from reference/flags.md.

### 1.2 Dynamic Content Validation

**Current**: Static reference files may become stale when skills change.
**Proposed**: Content validation that detects drift between /helper's reference files and actual SKILL.md files.

```bash
# Validation check (run as part of CI or on /helper startup)
For each skill (run, designer, review, optimize, team, org):
  1. Read skill's SKILL.md and reference/*.md
  2. Extract flags, modes, workflow states
  3. Compare against /helper's reference files
  4. Report discrepancies:
     "/run has flag --brief in SKILL.md but not in flag-summaries.md"
     "/team's wave model not documented in topic-guides.md workflow section"
```

**Implementation**:
- Add a validation script (scripts/validate-helper-content.sh) that cross-references SKILL.md files with /helper reference files
- Run as CI check to flag stale content
- Alternatively, /helper could read SKILL.md files directly at runtime for flag and feature information instead of relying on static reference files

### 1.3 Troubleshooting Mode

**Current**: No troubleshooting capability.
**Proposed**: Add `/helper --troubleshoot [command]` mode with diagnostic flows.

```
/helper --troubleshoot run

Common Issues with /run:

1. "Wrong domain detected"
   Symptom: /run routes to engineering when you wanted marketing
   Fix: Use --domain flag: /run Plan campaign --domain grow
   Prevention: Use domain-specific keywords (campaign, marketing, SEO)

2. "Stuck in coordinating phase"
   Symptom: /run appears to hang after planning
   Likely cause: Controller waiting for execution agent response
   Check: Look at Agent_Memory/sessions/{id}/workflow/coordination_log.yaml
   Fix: Use --resume to restart from last checkpoint

3. "No controller selected"
   Symptom: Error about missing controller
   Likely cause: planner_config.yaml missing controller_catalog entry
   Fix: Check {domain}/config/planner_config.yaml

4. "Validation keeps failing"
   Symptom: FAIL/REVISE loop exceeding 5 cycles
   Likely cause: Acceptance criteria too strict or implementation approach wrong
   Fix: Check validation_report.yaml for specific failures

/helper --troubleshoot team

1. "Teammates not spawning"
   Symptom: Team created but no teammates appear
   Likely cause: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS not set
   Check: .claude/settings.json env section
   Fix: Ensure env variable is set to "1"

2. "Fewer than 3 work items"
   Symptom: /team falls back to /run
   Likely cause: Task too simple for parallel execution
   This is expected: /team requires 3+ independent work items
```

**Implementation**:
- Create new reference file: reference/troubleshooting.md
- Add Mode 9: Troubleshooting (triggered by --troubleshoot flag)
- Pull troubleshooting content from CLAUDE.md troubleshooting section + common patterns from support interactions

### 1.4 Project-Aware Recommendations

**Current**: Recommendations based solely on keyword intent classification.
**Proposed**: Check project context before making recommendations.

```
User: /helper how do I fix the login page

Without project awareness:
  "Use /run Fix the login page" (generic)

With project awareness:
  Detected: Next.js project (package.json: "next": "14.x")
  Login-related files: src/app/login/page.tsx, src/auth/
  Recent changes: 3 commits touching src/auth/ in last week

  Recommended: /run Fix the login page
  Context: This appears to be a Next.js application. Login-related code
  is in src/app/login/page.tsx and src/auth/. Recent commits suggest
  active auth work.

  If the issue is a bug: /run Fix login page bug
  If you want to review security: /review src/auth/ --focus security --framework nextjs
  If you want to redesign: /designer login page redesign
```

**Implementation**:
- /helper reads project root for package.json, tsconfig.json, Makefile, etc.
- Uses Glob to check for files matching the user's mentioned features
- Includes project context in recommendation output
- Does not execute anything -- only provides richer recommendation context

## Priority 2: Medium Impact, Lower Effort

### 2.1 Interactive Tutorial Mode

**Current**: No guided walkthroughs.
**Proposed**: Add `/helper --tutorial [command]` with annotated sample sessions.

```
/helper --tutorial designer

Tutorial: How /designer Works (5 minute read)

/designer guides you through 4 phases with questions:

--- Phase 1: Discovery ---
Designer asks: "What are you building?"
You answer: "A user authentication system"
Designer asks: "Who will use it?"
You answer: "End users of our SPA application"
  [Designer searches your codebase for auth-related files]
  [Designer identifies: src/auth/ exists with session-based auth]
Designer summarizes: "You want to add OAuth2 to your existing session-based auth..."

--- Phase 2: Ideation ---
Designer presents:
  Option A: OAuth2 with passport.js (popular, well-documented)
  Option B: Custom OAuth2 with jose library (lightweight, full control)
  Option C: Auth0 managed service (fastest, external dependency)
You choose: Option A

--- Phase 3: Refinement ---
  [Detailed architecture, data model, sequence diagrams...]

--- Phase 4: Specification ---
  [Design document generated with user stories and diagrams]

Designer offers: "Build it now (/run) or Build with team (/team)?"

Ready to try? Type: /designer
```

### 2.2 Usage Analytics for Recommendation Improvement

**Current**: No tracking of recommendation outcomes.
**Proposed**: Lightweight tracking to improve recommendations over time.

```yaml
# Agent_Memory/_knowledge/helper/recommendation_analytics.yaml
analytics:
  total_recommendations: 142
  by_mode:
    natural_language: 85
    command_help: 32
    comparison: 15
    quick: 10
  by_recommended_command:
    run: 60%
    designer: 15%
    review: 10%
    optimize: 8%
    team: 5%
    org: 2%
  ambiguous_rate: 0.18  # 18% of requests were ambiguous
  most_common_ambiguity: "improve" (could be /optimize, /run, or /review)
```

**Implementation**:
- After each recommendation, append a line to recommendation_log.yaml
- Periodically analyze for patterns:
  - Which intent keywords map to which commands most often
  - Which ambiguous requests could be clarified with project context
  - Which modes are most/least used
- Use analytics to refine recommendation-engine.md signal words

### 2.3 Topic Guide Equalization

**Current**: Uneven depth across topic guides.
**Proposed**: Ensure all topic guides reach consistent depth and coverage.

Specific gaps to fill:
- **workflow topic**: Add /team wave model, /org hierarchy pipeline, /designer phase transitions
- **agents topic**: Add "how to find which agent handles your request" section, explain controller vs. execution agent selection
- **teams topic**: Add /org's multi-domain team orchestration, explain when /team vs /org
- **sessions topic**: Add /org session structure (domain subdirectories, deliberation files)
- New topic: **pipelines** -- dedicated topic for command integration (currently partial in "integration" topic)
- New topic: **troubleshooting** -- common issues and fixes per command

### 2.4 Contextual Quick Mode

**Current**: --quick shows a static one-screen reference.
**Proposed**: Adapt quick reference based on project type.

```
/helper --quick (in a Node.js project)

cAgents Quick Reference (Node.js Project):

  /run <task>              Build, fix, write, analyze anything
  /designer [topic]        Interactive design before building
  /review [path]           Review code -- auto-detects Next.js/React/Express
  /optimize [target]       Improve performance, bundle size, query time
  /team <task>             Parallel execution for big tasks

  Common for your project:
    /run Fix <bug>                        Simple bug fix
    /review src/ --focus security         Security audit
    /optimize src/ --type code --focus performance  Performance tuning
    /review --scope changed --auto-fix safe         Pre-commit review

  Flags: --dry-run (preview), --interactive (ask first), --quiet (silent)
  Help: /helper <command> for details, /helper --compare for comparison
```

## Priority 3: Nice-to-Have Enhancements

### 3.1 Command Cheat Sheet Generator

Generate a project-specific cheat sheet based on project type and common workflows:

```bash
/helper --cheatsheet

# Generates a markdown file with most-relevant commands for this project:
cAgents Cheat Sheet for: cAgents (Node.js + Multi-Domain Agent System)

## Daily Commands
/run Fix <bug description>
/review --scope changed --auto-fix safe
/optimize src/ --type code --safety safe

## Feature Development
/designer <feature name>
/run Implement <feature> --interactive
/team Build <large feature>

## Quality Assurance
/review --quality-gate strict --run-tests
/optimize --type code --cross-file --require-tests-pass
```

### 3.2 Recommendation Feedback Loop

After recommending a command, offer a lightweight feedback mechanism:

```
Recommended: /run Fix the auth timeout bug

Was this recommendation helpful?
  - If you used a different command, tell me next time:
    /helper feedback "I used /review instead of /run for auth timeout"
```

### 3.3 Multi-Language Support

Allow /helper to present content in the user's preferred language:

```bash
/helper --lang es run     # /run help in Spanish
/helper --lang ja         # Full guide in Japanese
```

### 3.4 Skill Discovery for New Skills

Automatically detect and document new skills added to .claude/skills/:

```
/helper detects new skill: /custom-deploy
  - Reads .claude/skills/custom-deploy/SKILL.md
  - Extracts: description, flags, examples
  - Integrates into command overview table
  - Adds to comparison view
```
