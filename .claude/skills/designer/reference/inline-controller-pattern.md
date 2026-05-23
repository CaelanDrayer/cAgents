# Inline Controller Pattern

The designer acts as a **controller** over pre-prepared question lists. Instead of generating questions from scratch, it selects from a pool of research-enriched questions (when research is enabled for that phase).

## Controller Behaviors

1. **Select**: Pick the highest-priority, dependency-satisfied question from the pool
2. **Reorder**: When user reveals domain expertise or topic emphasis, promote related questions
3. **Skip**: When user's answer makes a question redundant (information already provided), skip it with brief notification
4. **Adapt**: Enrich upcoming questions with context from user's latest answer (merge user context with research context)
5. **Dispatch**: When user reveals unexpected information not in research, spawn a follow-up research agent
6. **Defer**: When user selects "Research this for me", dispatch a subagent to investigate and re-ask later

## Selection Priority

1. High-priority questions first
2. Dependency-aware (question B depends on answer to A)
3. Category-clustered (group related questions for conversational flow)
4. Phase-gate-aware (promote questions that cover uncovered gate criteria)

## Skip Detection

- User already answered the question in a previous response
- Research context already provides the answer (inform user of finding)
- Phase gate criterion already satisfied

## Defer-to-Subagent Option ("Research this for me")

**Every AskUserQuestion call MUST include a "Research this for me" option** (or equivalent phrasing like "Let me think about this - research it first"). This allows the user to defer any question to a subagent for investigation.

### How It Works

1. User selects "Research this for me" on a question
2. Designer dispatches a research subagent via Agent tool to investigate the topic
3. Designer moves the question to a "deferred" queue
4. Designer continues with the next non-deferred question
5. When the research agent returns, designer re-presents the question with enriched context from research findings
6. If all remaining questions are deferred, wait for research agents to return

### Implementation Pattern

Every AskUserQuestion call should include the defer option on each question. Batch related questions together — here two auth-related questions are asked in a single call since they belong to the same design concern:

```javascript
// Batch related questions together in one call — both are auth concerns
AskUserQuestion({
  questions: [
    {
      question: "Should the auth system use JWT or session-based tokens?",
      header: "Auth approach",
      options: [
        { label: "JWT tokens", description: "Stateless, scalable" },
        { label: "Session-based", description: "Simpler, server-side state" },
        { label: "Research this for me", description: "Dispatch a subagent to analyze your codebase and recommend an approach" }
      ],
      multiSelect: false
    },
    {
      question: "How long should auth tokens remain valid?",
      header: "Token expiry",
      options: [
        { label: "15 minutes", description: "Short-lived, high security, requires refresh tokens" },
        { label: "1 hour", description: "Balanced security and UX" },
        { label: "24 hours", description: "Long-lived, simpler UX, lower security" },
        { label: "Research this for me", description: "Dispatch a subagent to review security best practices for your use case" }
      ],
      multiSelect: false
    }
  ]
})
```

### Non-software example blocks (v12.7.x — "design ANYTHING")

The auth/JWT example above remains a valid Software-domain illustration.
The patterns generalize to non-software domains. Two illustrations:

#### Education / Curriculum domain — Refinement phase

```javascript
// Batch related questions together in one call — both are curriculum
// pedagogy concerns (assessment + scaffolding)
AskUserQuestion({
  questions: [
    {
      question: "How will you assess the 'apply' Bloom's outcome — formative check during the lesson or summative at the end?",
      header: "Assessment",
      options: [
        { label: "Formative", description: "Mid-lesson exit ticket: quick check the instructor reads in real time" },
        { label: "Summative", description: "End-of-unit assessment: rubric-scored product the learner submits" },
        { label: "Both", description: "Formative during, summative at end — fastest feedback loop but more workload" },
        { label: "Research this for me", description: "Dispatch a subagent to look up assessment patterns for this outcome type" }
      ],
      multiSelect: false
    },
    {
      question: "What scaffolding supports struggling learners on this lesson without holding back advanced ones?",
      header: "Scaffolding",
      options: [
        { label: "Worked examples", description: "Show a fully-solved example before asking for one" },
        { label: "Sentence stems", description: "Provide partial scaffolds the learner completes" },
        { label: "Tiered tasks", description: "Three difficulty levels — learners pick or are assigned" },
        { label: "Research this for me", description: "Dispatch a subagent to surface scaffolding patterns for this lesson type" }
      ],
      multiSelect: false
    }
  ]
})
```

#### Personal / Life domain — Refinement phase (solo design, no stakeholders)

```javascript
// Batch related questions together in one call — both target the same
// habit / routine design concern (anchor + derailment)
AskUserQuestion({
  questions: [
    {
      question: "Where, when, and immediately after what existing behavior does the new morning routine start?",
      header: "Anchor",
      options: [
        { label: "After alarm", description: "Phone goes on the desk across the room; routine starts when alarm stops" },
        { label: "After coffee", description: "Routine starts the moment the coffee mug is set down" },
        { label: "After kids' bus", description: "Routine starts at 8:05 once kids are out the door" },
        { label: "Research this for me", description: "Dispatch a subagent to review habit-anchor patterns relevant to your daily structure" }
      ],
      multiSelect: false
    },
    {
      question: "What is the if-then rule for the most common derailment (travel, illness, social event)?",
      header: "Derailment",
      options: [
        { label: "Shrink to 2-min", description: "If traveling, do the two-minute version — counts as success" },
        { label: "Skip, no guilt", description: "If sick, skip cleanly; no make-up the next day" },
        { label: "Reschedule to evening", description: "If morning is impossible, the same routine runs at 9pm" },
        { label: "Research this for me", description: "Dispatch a subagent to surface relapse-resistant patterns from past attempts" }
      ],
      multiSelect: false
    }
  ]
})
```

Both blocks above use the same controller behaviors (select / reorder /
skip / adapt / dispatch / defer) and the same mandatory "Research this
for me" defer option as the Software example. The mechanics generalize;
the topic does not have to be software. Future domain reference files
in `@reference/domains/` add similar domain-flavored examples without
changing the pattern.

### Defer Dispatch Pattern

```javascript
// When user selects "Research this for me":
Agent({
  subagent_type: "cagents:architect",  // or appropriate specialist
  description: "Deferred research: ${question_topic}",
  prompt: `A user deferred this design question for research:
QUESTION: "${original_question}"
TOPIC: ${topic}
SESSION: ${session_dir}
Investigate the codebase and relevant patterns. Write findings + recommendation to:
${session_dir}/question_prep/deferred_${phase}_${question_id}.yaml
Include: analysis, recommendation, rationale, trade-offs.`
})
```

### Deferred Queue Management

Track deferred questions in session state:
```yaml
# session.yaml
deferred_questions:
  - id: DQ-003
    question: "Should auth use JWT or sessions?"
    phase: define
    deferred_at: "2026-03-02T15:00:00Z"
    research_agent: cagents:architect
    status: pending  # pending | completed | re-presented
```

## AskUserQuestion Tool Constraints

**CRITICAL**: Violating these constraints causes silent failures — questions never reach the user.

| Parameter | Constraint | Consequence of Violation |
|-----------|-----------|--------------------------|
| `questions` array | **2-4 items per call** (default, max 4) | Use 1 ONLY for standalone gate decisions (opening topic detection, binary go/no-go confirmations) |
| `options` per question | **2-4 items** (hard limit) | Tool call rejected or silently fails |
| `label` per option | **1-5 words** (concise) | UI truncation or rendering issues |
| `header` per question | **Max 12 characters** | Truncated in UI |
| `description` per option | Short sentence | Keep concise for readability |
| `multiSelect` | Required boolean | Defaults to false if omitted |

**Best Practices:**
- **Default is 2-4 questions per call** — batch related questions for conversational efficiency
- **Use 1 question ONLY for standalone gate decisions** — true binary forks (opening topic detection, go/no-go synthesis confirmations)
- **Batch by topic area** — questions about users + pain points go together; questions about constraints + success criteria go together
- **Keep labels to 2-3 words** — e.g., "Use JWT", "Extend existing", "Research this"
- **Put detail in `description`, not `label`** — labels are for scanning, descriptions for context
- **If you need 5+ options, split into 2 sequential AskUserQuestion calls** — present primary options first, then "more options" as a follow-up
