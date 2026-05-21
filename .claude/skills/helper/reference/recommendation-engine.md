# Recommendation Engine

Intent classification and command recommendation logic for `/helper` when given natural language input.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug` — see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Review intent now routes to `/improve --mode review`, optimize intent to `/improve --mode optimize`, context intent to `/run context ...`, and debug intent to `/run --mode debug`._

## Weighted Scoring Algorithm

The recommendation engine uses 5 weighted signals to score each candidate command. The command with the highest total score is recommended.

### Signal Types

| Signal | Weight | How to Check |
|--------|--------|--------------|
| Keyword match | 0.30 | Count matching keywords from the intent classification tables below. The command whose keyword set has the most matches gets the full 0.30; others get proportional fractions (e.g., 2 matches out of a leader's 4 = 0.15). |
| Project context | 0.30 | Read project files to infer domain and scope (see project context checks below). |
| Complexity estimate | 0.20 | Estimate scope from the request: single file or narrow fix favors `/run` (full 0.20); multi-component or cross-cutting favors `/team`; multi-domain favors `/team --strategic` (v12.2.0+; pre-v12.2.0 multi-domain favored the now-removed `/org`). |
| Explicit intent | 0.10 | If the user directly references a command name ("use /run", "I want to improve"), give that command the full 0.10. Otherwise 0.00 for all. |
| Request history | 0.10 | If the user recently mentioned planning or design in the same session, boost `/designer` by 0.10. If they mentioned review or audit, boost `/improve --mode review`. Otherwise 0.00. |

### Project Context Checks (0.30 weight)

These checks read project files to infer which commands are most relevant. Distribute the 0.30 weight across matching signals:

1. **package.json exists** -- engineering domain hint -- add +0.06 to `/run` and `/improve`
2. **File count in target path** (if a path is mentioned in the request):
   - More than 20 files mentioned or implied -- add +0.06 to `/team`
   - Fewer than 5 files -- add +0.06 to `/run`
3. **Current git branch name** (run `git branch --show-current`):
   - `feature/*`, `feat/*` branches -- add +0.06 to `/run` (building something)
   - `main`, `master`, `release/*` -- add +0.06 to `/improve --mode review` (diff-aware review hint)
   - `fix/*`, `hotfix/*`, `bugfix/*` -- add +0.06 to `/run` or `/run --mode debug`
4. **CLAUDE.md or .claude/ directory exists** -- cAgents-aware project -- no specific boost (all six skills available)
5. **Recent session context** -- if user previously asked about design or planning, add +0.06 to `/designer`

### Combining Scores

For each candidate command, sum all partial scores from the 5 signals. The maximum possible score is 1.00 (all signals point to the same command).

### Tie-Breaking

If two commands are within 0.05 of each other, the intent is genuinely ambiguous. Present both options with tradeoffs and ask the user to clarify rather than guessing.

### Worked Example

```
Request: "Build a REST API for user management"

Signal 1 - Keyword match (0.30):
  "build" matches Build/Create intent -> /run gets 0.30
  No matches for /improve, /team, /designer (pre-v12.2.0 also /org, now absorbed into /team strategic mode)

Signal 2 - Project context (0.30):
  package.json found -> engineering hint -> /run +0.06, /improve +0.06
  No target path mentioned -> skip file count
  Branch: feature/user-api -> /run +0.06
  .claude/ exists -> no specific boost

Signal 3 - Complexity estimate (0.20):
  "REST API" + "user management" implies multi-file but single-domain
  -> /run gets 0.16 (moderate complexity, not enough for /team)
  -> /team gets 0.04 (possible if 3+ explicit components)

Signal 4 - Explicit intent (0.10):
  No command referenced -> 0.00 for all

Signal 5 - Request history (0.10):
  No prior design or review mentions -> 0.00 for all

Final scores:
  /run     = 0.30 + 0.12 + 0.16 + 0.00 + 0.00 = 0.58
  /team    = 0.00 + 0.00 + 0.04 + 0.00 + 0.00 = 0.04
  /improve = 0.00 + 0.06 + 0.00 + 0.00 + 0.00 = 0.06

Recommendation: /run Build REST API for user management
  (clear winner at 0.58 vs next-best 0.06)
  Note: if the user had said "Build a REST API with auth, billing,
  and notification services" -- 3 explicit components would boost
  /team's complexity signal, potentially making it competitive.
```

## Intent Classification

When the user provides a natural language description of what they want to do, classify the primary intent:

### Build / Create / Implement Intent -> /run

**Signal words**: build, create, add, implement, make, develop, write, generate, deploy, setup, configure, install, migrate, integrate

**Examples**:
- "I want to add user authentication" -> `/run Add user authentication`
- "Build a REST API for user management" -> `/run Build REST API for user management`
- "Write a blog post about AI" -> `/run Write a blog post about AI`
- "Create a Q4 budget" -> `/run Create Q4 budget`
- "Hire a software engineer" -> `/run Hire software engineer`

### Fix / Debug Intent -> /run

**Signal words**: fix, resolve, repair, patch, hotfix, troubleshoot, correct, address, handle

**Examples**:
- "Fix the login bug" -> `/run Fix the login bug`
- "Resolve the CORS error" -> `/run Resolve the CORS error`

**Note**: For bugs with known fixes, use `/run`. For bugs that have resisted 2+ fixes or have unclear root cause, use `/run --mode debug` (the V11 replacement for the removed `/debug` skill).

### Debug / Investigate Intent -> /run --mode debug

**Signal words**: debug, root cause, why does this fail, can't figure out, keeps breaking, intermittent, flaky, it works on my machine, tried everything, resisted fixes, mysterious, unexplained

**Examples**:
- "I've tried 3 fixes, the bug is still there" -> `/run --mode debug {bug description}`
- "Why does this fail intermittently?" -> `/run --mode debug Intermittent failure in {component}`
- "Can't figure out the root cause of this crash" -> `/run --mode debug {error description}`
- "It works locally but fails in CI" -> `/run --mode debug Works locally but fails in CI: {description}`

### Context / Knowledge Intent -> /run context

**Signal words**: context, product context, project knowledge, persist knowledge, remember project, project conventions, project settings, share knowledge between sessions

The `/run context` passthrough provides the same `init|show|update|clear` subcommands the legacy `/context` skill exposed.

**Examples**:
- "Set up project context for this repo" -> `/run context init`
- "Show me the current project context" -> `/run context show`
- "Update the project knowledge" -> `/run context update`
- "Agents keep making wrong assumptions about my project" -> `/run context init` (then `/run context update`)

### Plan / Design / Explore Intent -> /designer

**Signal words**: plan, design, architect, explore, think through, figure out, decide, evaluate, compare options, brainstorm, prototype, spec, blueprint

**Examples**:
- "I need to plan the authentication system" -> `/designer authentication system`
- "Help me design the database schema" -> `/designer database schema`
- "I'm not sure which approach to use for caching" -> `/designer caching strategy`
- "I want to explore microservices vs monolith" -> `/designer microservices vs monolith architecture`

### Check / Review / Audit Intent -> /improve --mode review

**Signal words**: review, check, audit, inspect, analyze quality, verify, validate, scan, assess, evaluate code, test coverage, security check

**Examples**:
- "Check my code for security issues" -> `/improve --mode review --focus security`
- "Review the pull request" -> `/improve --mode review --scope changed`
- "Audit our infrastructure for cost savings" -> `/improve --mode review --type infrastructure`
- "Check if our docs are up to date" -> `/improve --mode review docs/ --type documentation`

> Note: `review` is the default mode for `/improve`, so `/improve <target>` is equivalent to `/improve --mode review <target>`.

### Improve / Optimize / Speed Up Intent -> /improve --mode optimize

**Signal words**: optimize, improve, speed up, make faster, reduce, shrink, compress, streamline, enhance performance, tune, boost, accelerate

**Examples**:
- "Make the app faster" -> `/improve --mode optimize "Make the app faster"`
- "Reduce our bundle size" -> `/improve --mode optimize --type code --focus performance`
- "Improve our SEO rankings" -> `/improve --mode optimize --type content --focus quality`
- "Streamline the onboarding process" -> `/improve --mode optimize --type process`

### Audit + Optimize Together -> /improve --mode full

When the user wants both review and optimization with a single shared baseline:

**Examples**:
- "Audit src/ and apply safe optimizations with one baseline" -> `/improve --mode full --scope src/`
- "Review and tune the auth module" -> `/improve --mode full --scope src/auth/`

### Parallel / Big Task / Team Intent -> /team

**Signal words**: parallel, simultaneously, team, big feature, multiple components, at the same time, fast delivery, break down and parallelize

**Examples**:
- "Build the entire dashboard with all widgets in parallel" -> `/team Build dashboard with all widgets`
- "I need this done fast -- can we parallelize?" -> `/team {task}`
- "Implement all three auth providers simultaneously" -> `/team Implement Google, GitHub, and email auth`

### Cross-Domain / Strategic Intent -> /team strategic mode (v12.2.0+)

**Signal words**: launch, restructure, migrate, company-wide, cross-team, strategic, multi-domain, executive, C-suite

**Examples**:
- "Launch the new product across engineering, marketing, and hiring" -> `/team Launch new product` (strategic mode auto-enables when universal-router detects 2+ domains)
- "Restructure the engineering org" -> `/team Restructure engineering team --strategic` (force-enable for single-domain when an executive frame is desired)

(Pre-v12.2.0 these examples used `/org`; v12.2.0 absorbed /org into /team strategic mode.)

## Multi-Intent Detection

Some requests combine multiple intents. Recommend the primary command and mention the pipeline:

### Design-then-Build
- "Plan and build the payment system" -> Start with `/designer payment system`, it will offer to trigger `/run` when done
- "Think through and implement auth" -> `/designer authentication system` (builds via /run at the end)

### Review-then-Fix
- "Find and fix security vulnerabilities" -> `/improve --mode review --focus security --auto-fix safe` (auto-fixes safe issues, then use `/run` for complex ones)

### Review + Optimize Together
- "Audit and tune the codebase with one baseline" -> `/improve --mode full --scope src/`

### Build-in-Parallel
- "Build the full feature fast" -> `/team Build {feature}` (or `/run Build {feature} --team`)

## Ambiguity Handling

When the intent is genuinely ambiguous, present options:

### "Improve the login page"
Could mean:
- **Optimize performance** -> `/improve --mode optimize src/login/ --type code`
- **Fix bugs** -> `/run Fix login page issues`
- **Redesign it** -> `/designer login page redesign`
- **Review quality** -> `/improve --mode review src/login/`

Present: "What kind of improvement? Performance (`/improve --mode optimize`), bug fixes (`/run`), redesign (`/designer`), or quality review (`/improve --mode review`)?"

### "Work on authentication"
Could mean:
- **Build it** -> `/run Implement authentication`
- **Plan it** -> `/designer authentication system`
- **Review it** -> `/improve --mode review src/auth/`
- **Optimize it** -> `/improve --mode optimize src/auth/`

Present: "What do you want to do with authentication? Build (`/run`), design (`/designer`), review (`/improve --mode review`), or optimize (`/improve --mode optimize`)?"

## Recommendation Output Format

### Clear Recommendation

```
Based on your request: "fix the authentication timeout bug"

  Recommended: /run Fix the authentication timeout bug

  Why: This is a bug fix task. /run will route it to the engineering domain,
  coordinate with a backend-developer and qa-tester, and validate the fix.

  Ready to go? Just type:
    /run Fix the authentication timeout bug
```

### Recommendation with Alternative

```
Based on your request: "improve the dashboard performance"

  Recommended: /improve --mode optimize src/dashboard/ --type code --focus performance

  Why: You want measurable performance improvements. /improve in optimize mode
  will establish baseline metrics, identify bottlenecks, apply optimizations
  atomically, and show you before/after metrics.

  Alternative: /improve --mode review src/dashboard/ --focus performance
  -- if you just want to identify issues without applying changes

  Ready to go? Just type:
    /improve --mode optimize src/dashboard/ --type code --focus performance
```

### Ambiguous Recommendation

```
Based on your request: "work on the payment system"

  Your intent could go a few ways:

  1. /run Implement payment system
     -- if you want to BUILD or FIX the payment system

  2. /designer payment system
     -- if you want to PLAN the payment system first

  3. /improve --mode review src/payments/
     -- if you want to CHECK the existing payment code

  4. /improve --mode optimize src/payments/
     -- if you want to IMPROVE payment system performance

  Which fits best? Or give me more detail about what you need.
```
