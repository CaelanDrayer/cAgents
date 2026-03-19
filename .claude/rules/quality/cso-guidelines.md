# Claude Search Optimization (CSO) Guidelines

Best practices for writing agent and skill descriptions that maximize AI discoverability in cAgents. Inspired by the superpowers framework's approach to skill description design.

## Why CSO Matters

When Claude Code routes requests to agents, it matches the user's natural language against agent descriptions. Poorly written descriptions cause:
- Wrong agent selected (user says "my tests keep failing" but gets `qa-tester` instead of the debugging methodology)
- Agent not found (user describes a symptom but the description only mentions the solution)
- Ambiguous routing (multiple agents match because descriptions are too generic)

## The Five CSO Rules

### 1. Start with "Use when..."

Descriptions MUST begin by describing the trigger situation, not the agent's capabilities.

| Bad | Good |
|-----|------|
| "Manages engineering teams and coordinates work" | "Use when work requires coordination across multiple engineers or when a task needs decomposition into parallel subtasks" |
| "Reviews code for quality issues" | "Use when code changes need quality review before merge, or when hunting for security vulnerabilities, performance issues, or style violations" |
| "Handles database operations" | "Use when designing schemas, writing migrations, optimizing queries, or troubleshooting database performance" |

### 2. Describe the Problem/Trigger, Not the Workflow

Users describe problems. Agents should match on problem descriptions.

| Bad (workflow-focused) | Good (problem-focused) |
|------------------------|------------------------|
| "Orchestrates a 4-phase planning process with decomposition and validation" | "Use when a complex task needs structured planning before implementation" |
| "Runs parallel agents with wave-based quality gates" | "Use when 3+ tasks can run simultaneously for faster completion" |
| "Executes security scanning pipeline with vulnerability triage" | "Use when checking for security vulnerabilities, exposed secrets, or unsafe dependencies" |

### 3. Include Concrete Symptoms, Error Messages, and Situations

The more specific the triggers, the better the match quality.

**Include**:
- Common error messages users might paste: "ECONNREFUSED", "404 not found", "type X is not assignable"
- Symptom descriptions: "tests keep failing", "page loads slowly", "deploy keeps breaking"
- Scenario triggers: "before merge", "after refactor", "new feature", "bug fix"

**Example**:
```
"Use when a bug resists quick fixes, when 2+ fix attempts have failed,
or when root cause is unclear. Handles: intermittent failures,
'works on my machine' issues, flaky tests, performance regressions
with unknown source."
```

### 4. Keep Under 500 Characters

Long descriptions dilute signal. Every word must earn its place.

- Lead with the highest-value trigger phrases
- Cut workflow descriptions ("orchestrates", "coordinates", "manages")
- Cut capability lists that repeat the agent name ("the code reviewer reviews code")
- Use comma-separated trigger lists, not full sentences

### 5. Never Summarize Process in Description

The description is for ROUTING, not documentation. Process details belong in the SKILL.md body.

| Bad (process summary) | Good (routing signal) |
|----------------------|----------------------|
| "4-phase methodology: investigation, analysis, testing, implementation with escalation rules" | "Use when bugs resist quick fixes or root cause is unclear. Systematic debugging with escalation after 3 failed attempts." |
| "Creates tasks, spawns teammates, validates gates, integrates results" | "Use when 3+ work items can run in parallel for 40-60% faster completion." |

## Applying CSO to Existing Agents

When updating agent descriptions:

1. Read the agent's SKILL.md to understand its actual trigger scenarios
2. Identify the top 3-5 situations where a user would need this agent
3. Write the description starting with "Use when..."
4. Include at least 2 concrete symptom/trigger phrases
5. Verify the description is under 500 characters
6. Test mentally: "If a user said [common request], would this description match?"

## CSO Checklist for New Agents

- [ ] Description starts with "Use when..." or "Use for..."
- [ ] Describes the problem/situation, not the agent's internal workflow
- [ ] Includes at least 2 concrete trigger phrases (symptoms, scenarios, error patterns)
- [ ] Under 500 characters
- [ ] No process summaries ("orchestrates", "coordinates", "manages" without context)
- [ ] TRIGGER line in frontmatter lists 3-5 keyword triggers
- [ ] NOT for line clarifies routing boundaries with other agents

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| "A powerful tool for X" | Marketing language, no routing signal | Describe WHEN to use, not how powerful |
| "Handles all aspects of X" | Too vague to route accurately | List specific trigger scenarios |
| "{Role title} agent" | Duplicates the agent name | Describe the problem it solves |
| Listing 10+ capabilities | Dilutes routing signal | Focus on top 3-5 triggers |
| "Works with {other agent}" | Internal architecture, not user-facing | Describe what the user gets |

---

**Part of**: cAgents Quality Framework
