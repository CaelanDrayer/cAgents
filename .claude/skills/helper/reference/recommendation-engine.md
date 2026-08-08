# Recommendation Engine

Intent classification and command recommendation logic for `/helper` when given natural language input.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug`; v12.1.2 folded `/improve` into `/act` via the keyword router. See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Review/audit intent now routes to `/act review` (or `/act audit`), optimize intent to `/act optimize`, review+optimize to `/act improve`. Context and debug intents continue to route to `/act context ...` and `/act --mode debug` (unchanged)._

## Keyword Router Discovery (v12.1.2+)

`/helper` uses the `/act` keyword router as a primary discovery mechanism
for review and optimization intent. In v12.1.2, the standalone `/improve`
skill was folded into `/act`. When `/act`'s first request token is one of
`improve`, `review`, `audit`, or `optimize`, `/act` strips the keyword,
sets an internal mode, and proceeds through the standard 5-state pipeline.

This means: every "review my code" / "optimize this function" / "audit
the infrastructure" recommendation `/helper` produces becomes a `/act X`
invocation where X is the appropriate keyword. There is no separate
`/improve` skill to invoke.

### The 4 Keywords (case-insensitive first-token match)

| Keyword | Inferred mode | Example invocation |
|---------|---------------|--------------------|
| `improve` | `full` (review-then-optimize, shared baseline) | `/act improve src/auth/` |
| `review` | `review` (3-group parallel specialist review) | `/act review src/api/ --focus security` |
| `audit` | `review` (alias for review) | `/act audit infrastructure --type infrastructure` |
| `optimize` | `optimize` (opportunity scan + ROI rank + atomic apply) | `/act optimize "Reduce bundle size"` |

### Why This Matters for Discovery

1. **Intent → keyword**: When the recommendation engine classifies user
   intent (see Intent Classification below), the inferred keyword **is**
   the recommended invocation. The user types `/act <keyword> <request>`
   directly.
2. **Override rules**: An explicit `--mode <value>` flag overrides the
   inferred mode. Use this in /helper recommendations only when the user
   has already typed a keyword but wants a different mode.
3. **Non-first-word safety**: Keywords matched only on the first token.
   `/act check the audit logs` does NOT trigger review mode — `check` is
   the first token. /helper recommendations should always lead with the
   keyword.
4. **Pre-v12.1.2 surfaces**: Any `/improve --mode <X>` invocation seen
   in user history or old docs maps to `/act <X>`. /helper should
   translate when surfacing examples.

### Canonical Reference

`@.claude/skills/act/reference/improve-mode.md` — full keyword-router
contract, override rules, stripping examples, and mode-specific
controller behavior. /helper should defer to it on any contract question.

## Weighted Scoring Algorithm

The recommendation engine uses 5 weighted signals to score each candidate command. The command with the highest total score is recommended.

### Signal Types

| Signal | Weight | How to Check |
|--------|--------|--------------|
| Keyword match | 0.30 | Count matching keywords from the intent classification tables below. The command whose keyword set has the most matches gets the full 0.30; others get proportional fractions (e.g., 2 matches out of a leader's 4 = 0.15). |
| Project context | 0.30 | Read project files to infer domain and scope (see project context checks below). |
| Complexity estimate | 0.20 | Estimate scope from the request: single file or narrow fix favors `/act` (full 0.20); multi-component or cross-cutting favors `/team`; multi-domain favors `/team --strategic` (v12.2.0+; pre-v12.2.0 multi-domain favored the now-removed `/org`). |
| Explicit intent | 0.10 | If the user directly references a command name ("use /act", "I want to improve"), give that command the full 0.10. Otherwise 0.00 for all. |
| Request history | 0.10 | If the user recently mentioned planning or design in the same session, boost `/designer` by 0.10. If they mentioned review or audit, boost `/act` (via the `review` or `audit` keyword router). Otherwise 0.00 for all. |

### Project Context Checks (0.30 weight)

These checks read project files to infer which commands are most relevant. Distribute the 0.30 weight across matching signals:

1. **package.json exists** -- engineering domain hint -- add +0.06 to `/act` (covers `/act review` / `/act optimize` via keyword router)
2. **File count in target path** (if a path is mentioned in the request):
   - More than 20 files mentioned or implied -- add +0.06 to `/team`
   - Fewer than 5 files -- add +0.06 to `/act`
3. **Current git branch name** (run `git branch --show-current`):
   - `feature/*`, `feat/*` branches -- add +0.06 to `/act` (building something)
   - `main`, `master`, `release/*` -- add +0.06 to `/act review` (diff-aware review hint via keyword router)
   - `fix/*`, `hotfix/*`, `bugfix/*` -- add +0.06 to `/act` or `/act --mode debug`
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
  "build" matches Build/Create intent -> /act gets 0.30
  No matches for /team, /designer (/act keyword router not engaged
  because no review/optimize/audit/improve first-token match;
  pre-v12.2.0 also /org, now absorbed into /team strategic mode)

Signal 2 - Project context (0.30):
  package.json found -> engineering hint -> /act +0.06
  No target path mentioned -> skip file count
  Branch: feature/user-api -> /act +0.06
  .claude/ exists -> no specific boost

Signal 3 - Complexity estimate (0.20):
  "REST API" + "user management" implies multi-file but single-domain
  -> /act gets 0.16 (moderate complexity, not enough for /team)
  -> /team gets 0.04 (possible if 3+ explicit components)

Signal 4 - Explicit intent (0.10):
  No command referenced -> 0.00 for all

Signal 5 - Request history (0.10):
  No prior design or review mentions -> 0.00 for all

Final scores:
  /act     = 0.30 + 0.12 + 0.16 + 0.00 + 0.00 = 0.58
  /team    = 0.00 + 0.00 + 0.04 + 0.00 + 0.00 = 0.04
  /designer= 0.00 + 0.00 + 0.00 + 0.00 + 0.00 = 0.00

Recommendation: /act Build REST API for user management
  (clear winner at 0.58 vs next-best 0.04)
  Note: if the user had said "Build a REST API with auth, billing,
  and notification services" -- 3 explicit components would boost
  /team's complexity signal, potentially making it competitive.
  Note: if the user had said "Review my REST API" -- "review" as
  first token would trigger /act's keyword router (mode=review),
  not produce a separate /improve candidate.
```

## Intent Classification

When the user provides a natural language description of what they want to do, classify the primary intent:

### Build / Create / Implement Intent -> /act

**Signal words**: build, create, add, implement, make, develop, write, generate, deploy, setup, configure, install, migrate, integrate

**Examples**:
- "I want to add user authentication" -> `/act Add user authentication`
- "Build a REST API for user management" -> `/act Build REST API for user management`
- "Write a blog post about AI" -> `/act Write a blog post about AI`
- "Create a Q4 budget" -> `/act Create Q4 budget`
- "Hire a software engineer" -> `/act Hire software engineer`

### Fix / Debug Intent -> /act

**Signal words**: fix, resolve, repair, patch, hotfix, troubleshoot, correct, address, handle

**Examples**:
- "Fix the login bug" -> `/act Fix the login bug`
- "Resolve the CORS error" -> `/act Resolve the CORS error`

**Note**: For bugs with known fixes, use `/act`. For bugs that have resisted 2+ fixes or have unclear root cause, use `/act --mode debug` (the V11 replacement for the removed `/debug` skill).

### Debug / Investigate Intent -> /act --mode debug

**Signal words**: debug, root cause, why does this fail, can't figure out, keeps breaking, intermittent, flaky, it works on my machine, tried everything, resisted fixes, mysterious, unexplained

**Examples**:
- "I've tried 3 fixes, the bug is still there" -> `/act --mode debug {bug description}`
- "Why does this fail intermittently?" -> `/act --mode debug Intermittent failure in {component}`
- "Can't figure out the root cause of this crash" -> `/act --mode debug {error description}`
- "It works locally but fails in CI" -> `/act --mode debug Works locally but fails in CI: {description}`

### Context / Knowledge Intent -> /act context

**Signal words**: context, product context, project knowledge, persist knowledge, remember project, project conventions, project settings, share knowledge between sessions

The `/act context` passthrough provides the same `init|show|update|clear` subcommands the legacy `/context` skill exposed.

**Examples**:
- "Set up project context for this repo" -> `/act context init`
- "Show me the current project context" -> `/act context show`
- "Update the project knowledge" -> `/act context update`
- "Agents keep making wrong assumptions about my project" -> `/act context init` (then `/act context update`)

### Plan / Design / Explore Intent -> /designer

**Signal words**: plan, design, architect, explore, think through, figure out, decide, evaluate, compare options, brainstorm, prototype, spec, blueprint

**Examples**:
- "I need to plan the authentication system" -> `/designer authentication system`
- "Help me design the database schema" -> `/designer database schema`
- "I'm not sure which approach to use for caching" -> `/designer caching strategy`
- "I want to explore microservices vs monolith" -> `/designer microservices vs monolith architecture`

### Check / Review / Audit Intent -> /act review (or /act audit)

**Signal words**: review, check, audit, inspect, analyze quality, verify, validate, scan, assess, evaluate code, test coverage, security check

**Examples**:
- "Check my code for security issues" -> `/act review --focus security`
- "Review the pull request" -> `/act review --scope changed`
- "Audit our infrastructure for cost savings" -> `/act audit --type infrastructure`
- "Check if our docs are up to date" -> `/act review docs/ --type documentation`

> Note: `audit` is an alias for `review` in the keyword router. `/act audit <target>` and `/act review <target>` produce identical pipelines.

### Improve / Optimize / Speed Up Intent -> /act optimize

**Signal words**: optimize, improve, speed up, make faster, reduce, shrink, compress, streamline, enhance performance, tune, boost, accelerate

**Examples**:
- "Make the app faster" -> `/act optimize "Make the app faster"`
- "Reduce our bundle size" -> `/act optimize --type code --focus performance`
- "Improve our SEO rankings" -> `/act optimize --type content --focus quality`
- "Streamline the onboarding process" -> `/act optimize --type process`

### Audit + Optimize Together -> /act improve

When the user wants both review and optimization with a single shared baseline:

**Examples**:
- "Audit src/ and apply safe optimizations with one baseline" -> `/act improve src/`
- "Review and tune the auth module" -> `/act improve src/auth/`

### Parallel / Big Task / Team Intent -> /team

**Signal words**: parallel, simultaneously, team, big feature, multiple components, at the same time, fast delivery, break down and parallelize

**Examples**:
- "Build the entire dashboard with all widgets in parallel" -> `/team Build dashboard with all widgets`
- "I need this done fast -- can we parallelize?" -> `/team {task}`
- "Implement all three auth providers simultaneously" -> `/team Implement Google, GitHub, and email auth`

### Cross-Domain / Strategic Intent -> /team strategic mode (v12.2.0+)

**Signal words**: launch, restructure, migrate, company-wide, cross-team, strategic, multi-domain, executive, C-suite

**Examples**:
- "Launch the new product across engineering, marketing, and hiring" -> `/team Launch new product` (strategic mode auto-enables when router detects 2+ domains)
- "Restructure the engineering org" -> `/team Restructure engineering team --strategic` (force-enable for single-domain when an executive frame is desired)

(Pre-v12.2.0 these examples used `/org`; v12.2.0 absorbed /org into /team strategic mode.)

## Multi-Intent Detection

Some requests combine multiple intents. Recommend the primary command and mention the pipeline:

### Design-then-Build
- "Plan and build the payment system" -> Start with `/designer payment system`, it will offer to trigger `/act` when done
- "Think through and implement auth" -> `/designer authentication system` (builds via /act at the end)

### Review-then-Fix
- "Find and fix security vulnerabilities" -> `/act review --focus security --auto-fix safe` (auto-fixes safe issues, then use `/act` for complex ones)

### Review + Optimize Together
- "Audit and tune the codebase with one baseline" -> `/act improve src/`

### Build-in-Parallel
- "Build the full feature fast" -> `/team Build {feature}` (or `/act Build {feature} --team`)

## Ambiguity Handling

When the intent is genuinely ambiguous, present options:

### "Improve the login page"
Could mean:
- **Optimize performance** -> `/act optimize src/login/ --type code`
- **Fix bugs** -> `/act Fix login page issues`
- **Redesign it** -> `/designer login page redesign`
- **Review quality** -> `/act review src/login/`

Present: "What kind of improvement? Performance (`/act optimize`), bug fixes (`/act`), redesign (`/designer`), or quality review (`/act review`)?"

### "Work on authentication"
Could mean:
- **Build it** -> `/act Implement authentication`
- **Plan it** -> `/designer authentication system`
- **Review it** -> `/act review src/auth/`
- **Optimize it** -> `/act optimize src/auth/`

Present: "What do you want to do with authentication? Build (`/act`), design (`/designer`), review (`/act review`), or optimize (`/act optimize`)?"

## Recommendation Output Format

### Clear Recommendation

```
Based on your request: "fix the authentication timeout bug"

  Recommended: /act Fix the authentication timeout bug

  Why: This is a bug fix task. /act will route it to the engineering domain,
  coordinate with a backend-developer and qa-tester, and validate the fix.

  Ready to go? Just type:
    /act Fix the authentication timeout bug
```

### Recommendation with Alternative

```
Based on your request: "improve the dashboard performance"

  Recommended: /act optimize src/dashboard/ --type code --focus performance

  Why: You want measurable performance improvements. /act optimize
  will establish baseline metrics, identify bottlenecks, apply optimizations
  atomically, and show you before/after metrics.

  Alternative: /act review src/dashboard/ --focus performance
  -- if you just want to identify issues without applying changes

  Ready to go? Just type:
    /act optimize src/dashboard/ --type code --focus performance
```

### Ambiguous Recommendation

```
Based on your request: "work on the payment system"

  Your intent could go a few ways:

  1. /act Implement payment system
     -- if you want to BUILD or FIX the payment system

  2. /designer payment system
     -- if you want to PLAN the payment system first

  3. /act review src/payments/
     -- if you want to CHECK the existing payment code

  4. /act optimize src/payments/
     -- if you want to IMPROVE payment system performance

  Which fits best? Or give me more detail about what you need.
```
