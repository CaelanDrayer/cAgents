# Recommendation Engine

Intent classification and command recommendation logic for `/helper` when given natural language input.

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

**Signal words**: fix, debug, resolve, repair, patch, hotfix, troubleshoot, correct, address, handle

**Examples**:
- "Fix the login bug" -> `/run Fix the login bug`
- "Debug the payment timeout" -> `/run Debug the payment timeout`
- "Resolve the CORS error" -> `/run Resolve the CORS error`

### Plan / Design / Explore Intent -> /designer

**Signal words**: plan, design, architect, explore, think through, figure out, decide, evaluate, compare options, brainstorm, prototype, spec, blueprint

**Examples**:
- "I need to plan the authentication system" -> `/designer authentication system`
- "Help me design the database schema" -> `/designer database schema`
- "I'm not sure which approach to use for caching" -> `/designer caching strategy`
- "I want to explore microservices vs monolith" -> `/designer microservices vs monolith architecture`

### Check / Review / Audit Intent -> /review

**Signal words**: review, check, audit, inspect, analyze quality, verify, validate, scan, assess, evaluate code, test coverage, security check

**Examples**:
- "Check my code for security issues" -> `/review --focus security`
- "Review the pull request" -> `/review --scope changed`
- "Audit our infrastructure for cost savings" -> `/review --type infrastructure`
- "Check if our docs are up to date" -> `/review docs/ --type documentation`

### Improve / Optimize / Speed Up Intent -> /optimize

**Signal words**: optimize, improve, speed up, make faster, reduce, shrink, compress, streamline, enhance performance, tune, boost, accelerate

**Examples**:
- "Make the app faster" -> `/optimize "Make the app faster"`
- "Reduce our bundle size" -> `/optimize --type code --focus performance`
- "Improve our SEO rankings" -> `/optimize --type content --focus quality`
- "Streamline the onboarding process" -> `/optimize --type process`

### Parallel / Big Task / Team Intent -> /team

**Signal words**: parallel, simultaneously, team, big feature, multiple components, at the same time, fast delivery, break down and parallelize

**Examples**:
- "Build the entire dashboard with all widgets in parallel" -> `/team Build dashboard with all widgets`
- "I need this done fast -- can we parallelize?" -> `/team {task}`
- "Implement all three auth providers simultaneously" -> `/team Implement Google, GitHub, and email auth`

## Multi-Intent Detection

Some requests combine multiple intents. Recommend the primary command and mention the pipeline:

### Design-then-Build
- "Plan and build the payment system" -> Start with `/designer payment system`, it will offer to trigger `/run` when done
- "Think through and implement auth" -> `/designer authentication system` (builds via /run at the end)

### Review-then-Fix
- "Find and fix security vulnerabilities" -> `/review --focus security --auto-fix safe` (auto-fixes safe issues, then use `/run` for complex ones)

### Optimize-then-Verify
- "Optimize the codebase and verify nothing broke" -> `/optimize --review-after --require-tests-pass`

### Build-in-Parallel
- "Build the full feature fast" -> `/team Build {feature}` (or `/run Build {feature} --team`)

## Ambiguity Handling

When the intent is genuinely ambiguous, present options:

### "Improve the login page"
Could mean:
- **Optimize performance** -> `/optimize src/login/ --type code`
- **Fix bugs** -> `/run Fix login page issues`
- **Redesign it** -> `/designer login page redesign`
- **Review quality** -> `/review src/login/`

Present: "What kind of improvement? Performance (optimize), bug fixes (run), redesign (designer), or quality check (review)?"

### "Work on authentication"
Could mean:
- **Build it** -> `/run Implement authentication`
- **Plan it** -> `/designer authentication system`
- **Review it** -> `/review src/auth/`
- **Optimize it** -> `/optimize src/auth/`

Present: "What do you want to do with authentication? Build (run), design (designer), review (review), or optimize (optimize)?"

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

  Recommended: /optimize src/dashboard/ --type code --focus performance

  Why: You want measurable performance improvements. /optimize will establish
  baseline metrics, identify bottlenecks, apply optimizations atomically,
  and show you before/after metrics.

  Alternative: /review src/dashboard/ --focus performance
  -- if you just want to identify issues without applying changes

  Ready to go? Just type:
    /optimize src/dashboard/ --type code --focus performance
```

### Ambiguous Recommendation

```
Based on your request: "work on the payment system"

  Your intent could go a few ways:

  1. /run Implement payment system
     -- if you want to BUILD or FIX the payment system

  2. /designer payment system
     -- if you want to PLAN the payment system first

  3. /review src/payments/
     -- if you want to CHECK the existing payment code

  4. /optimize src/payments/
     -- if you want to IMPROVE payment system performance

  Which fits best? Or give me more detail about what you need.
```
