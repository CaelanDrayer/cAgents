# Phase 1: Empathize (10% of session)

**Goal**: Understand the users, their needs, pain points, and the context in which they operate.

## Step 1: Opening & Topic Detection

If no topic provided:

```javascript
AskUserQuestion({
  questions: [{
    question: "What are you trying to create, solve, or design?",
    header: "Goal",
    options: [
      {label: "Build a feature", description: "Add new functionality to existing system"},
      {label: "Design a system", description: "Architecture or full system from scratch"},
      {label: "Solve a problem", description: "Fix or improve something specific"},
      {label: "Create content", description: "Story, campaign, document, or creative work"}
    ],
    multiSelect: false
  }]
})
```

If topic provided, ask about intent:

```javascript
AskUserQuestion({
  questions: [{
    question: `You want to work on "${topic}". What's the main goal?`,
    header: "Intent",
    options: [
      {label: "Design it thoroughly", description: "Full design before building"},
      {label: "Quick architecture", description: "High-level design, skip details"},
      {label: "Explore options", description: "Compare approaches before committing"},
      {label: "Refine existing", description: "Improve something already designed"}
    ],
    multiSelect: false
  }]
})
```

## Step 2: Research (--deep only)

If `--deep` flag is set, spawn research agents to analyze user-facing code and stakeholder landscape:

```javascript
Agent({
  subagent_type: "cagents:ux-designer",
  description: "Research: UX patterns and user context for Empathize",
  prompt: `Research agent for /designer Empathize phase.
TOPIC: ${topic}
SESSION: ${session_dir}
Analyze existing UX patterns, user-facing interfaces, and accessibility features.
Identify: user types, interaction patterns, pain points visible in code/config.
Write to: ${session_dir}/question_prep/empathize_ux.yaml`
})

Agent({
  subagent_type: "cagents:business-analyst",
  description: "Research: Stakeholder landscape for Empathize",
  prompt: `Research agent for /designer Empathize phase.
TOPIC: ${topic}
SESSION: ${session_dir}
Analyze project structure for stakeholder clues: README, docs, config, user roles.
Identify: user personas, business stakeholders, operational users.
Write to: ${session_dir}/question_prep/empathize_stakeholders.yaml`
})
```

Without `--deep`, use inline analysis (Glob/Grep/Read) to gather basic context.

## Steps 3 & 4: User Understanding + Pain Points

Ask who the users/stakeholders are and what problems they face in a single batched call — these two questions are closely related (same empathy concern: who is affected and how). Always include the defer option on each question.

```javascript
// Batch users + pain points together — same empathy phase concern, reduces round-trips
AskUserQuestion({
  questions: [
    {
      question: "Who are the primary users or stakeholders for this design?",
      header: "Users",
      options: [
        {label: "End users", description: "People who interact with the product directly"},
        {label: "Internal team", description: "Developers, ops, or internal staff"},
        {label: "Both", description: "Internal and external users"},
        {label: "Research this for me", description: "Dispatch a subagent to analyze your codebase for user types"}
      ],
      multiSelect: false
    },
    {
      question: "What's the biggest pain point or frustration this design should address?",
      header: "Pain point",
      options: [
        {label: "Slow/inefficient", description: "Current process is too slow or manual"},
        {label: "Missing capability", description: "Something needed doesn't exist yet"},
        {label: "Poor experience", description: "It works but users struggle with it"},
        {label: "Research this for me", description: "Dispatch a subagent to investigate existing issues"}
      ],
      multiSelect: false
    }
  ]
})
```

## Empathize Phase Gate

Before advancing to Define, verify:
- [ ] At least 1 user/stakeholder identified
- [ ] At least 1 pain point or need documented
- [ ] Context for the design understood (environment, existing tools)

If any are missing, ask targeted questions to fill gaps. Do NOT advance with gaps.

## Empathize Synthesis

After 3-5 empathy questions, confirm understanding:

```javascript
AskUserQuestion({
  questions: [{
    question: `Here's what I understand about the users and context:

**Users**: ${users_identified}
**Pain Points**: ${pain_points}
**Context**: ${environmental_context}

Does this capture the situation?`,
    header: "Confirm",
    options: [
      {label: "Yes, define the problem", description: "Move to problem definition"},
      {label: "Mostly right", description: "Small corrections, then continue"},
      {label: "Missing something", description: "Important context I haven't shared"},
      {label: "Research this for me", description: "Dispatch a subagent to validate these findings"}
    ],
    multiSelect: false
  }]
})
```
