# Controller Coordination Guidelines

Question-based delegation patterns for controllers with v10 agent chaining support.

## v10 Agent Chaining: Topological Execution

Controllers execute work items in dependency order, passing context between agents via files:

```
Controller receives work_items.yaml with agent assignments + dependency graph
  1. Topological sort by dependencies -> execution order
  2. For each work item in order:
     a. Gather output files from completed dependencies
     b. Spawn assigned agent via Task tool with context from dependencies
     c. Spawn reviewer to check against acceptance criteria
     d. If REVISE: re-spawn agent with feedback (max 3 rounds)
  3. Independent work items execute in parallel
  4. After all work items complete: write coordination_log.yaml
```

## CRITICAL: Controllers NEVER Do Direct Work

**Controllers are COORDINATORS, not IMPLEMENTERS.** They MUST use Task tool for all work.

- **Allowed**: Ask questions, synthesize answers, create task lists, write coordination_log.yaml
- **Prohibited**: Write code, create content, answer own questions, use Edit on implementation files

For EVERY question: formulate -> spawn execution agent via Task -> record answer -> synthesize after all answered.

### Context-Efficient Question Delegation

Question prompts should be **under 300 tokens**. Include only: the question, where to look, what to report. Do NOT include plan/decomposition/instruction contents.

## Question-Based Delegation Pattern

```
1. Controller receives objectives from plan.yaml
2. Breaks into specific questions
3. Identifies execution agents to delegate to
4. Calls TodoWrite to show execution agents (MANDATORY)
5. Delegates questions to execution agents
6. Synthesizes answers into solution
7. Creates implementation tasks
8. Coordinates execution
9. Writes coordination_log.yaml
```

## MANDATORY: TodoWrite for Execution Agent Visibility

Every controller MUST call TodoWrite after identifying execution agents. Format: `[{agent-name}] {verb phrase}`. Never use state machine names (INIT, ORCHESTRATED, etc.). Replace placeholders with actual agent names as soon as known.

See `controller-reference.md` for good/bad TodoWrite examples.

## Controller Selection by Tier

| Tier | Controllers | Example |
|------|------------|---------|
| **2** (Moderate) | 1 primary | engineering-manager for bug fixes |
| **3** (Complex) | 1 primary + 1-2 supporting | engineering-manager + architect + security |
| **4** (Expert) | 1 executive + 1 primary + 2-4 supporting + HITL | cto + engineering-manager + architect |

## Key Guidelines

- **Ask, don't assign**: "What is current auth?" not "Analyze auth"
- **Synthesis drives implementation**: Combine answers coherently
- **Adaptive coordination**: Follow-up questions based on answers

## Reviewer Loop

Controllers include an internal reviewer loop (max 3 rounds). After each executor completes, spawn a reviewer to evaluate against acceptance criteria. PASS accepts, REVISE sends feedback back. After round 3, mark as dead_letter and continue.

**Tier 2**: Single reviewer. **Tier 3+**: Blind review with 2-3 independent reviewers + Devil's Advocate on unanimous PASS.

See `controller-reference.md` for reviewer spawning patterns, blind review protocol, dead-letter queue, and confidence tiers.

## Confidence Tiers

Every completed work item MUST include `confidence` (0.0-1.0) and `confidence_rationale`. Items < 0.7 trigger additional scrutiny.

## Read-Before-Decide Pattern

Controllers MUST re-read plan objectives before major decisions to combat attention drift.

> Before synthesis and before spawning execution agents, re-read plan.yaml objectives to refresh goals in the attention window.

**When to re-read**: Before synthesizing answers, before spawning executors, after 5+ delegated questions, before writing coordination_log.

## Decision Log Protocol (V10.6.0)

Controllers MUST maintain append-only DECISIONS.md and CORRECTIONS.md logs during coordination. Entries include timestamp, context, rationale, and confidence. These persist in `Agent_Memory/_projects/{hash}/` and survive context compaction.

See `controller-reference.md` for examples and file location details.

## CRITICAL: Do Not Ask Permission

After completing coordination:
- Write coordination_log.yaml, handoff document, and completion event
- Signal completion (coordination_log.yaml with complete status)
- DO NOT ask user to review or approve — /run auto-proceeds to validation

---

## See Also

- **controller-reference.md** - Detailed schemas, examples, and protocols (path-conditional)
- **orchestration.md** - Workflow phases and automatic transitions
- **execution.md** - Execution agent patterns (tier 3)
- **completion.md** - Task completion protocol and evidence requirements
