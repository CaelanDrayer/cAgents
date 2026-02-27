# Phase 1: Discovery (15% of session)

**Goal**: Understand what we're designing, for whom, why, and within what constraints.

## Step 1: Opening & Domain Detection

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

## Step 2: Spawn Discovery Research Agents

**CRITICAL**: After the opening answer, IMMEDIATELY spawn research agents via Task tool to analyze the codebase in depth. Do NOT do shallow inline analysis -- delegate to specialists.

```javascript
// Spawn codebase research agent
Task({
  subagent_type: "cagents:backend-developer",
  description: "Research: Analyze project codebase for Discovery questions",
  prompt: `You are a research agent preparing informed questions for /designer Discovery phase.
TOPIC: ${topic}
SESSION: ${session_dir}

Research the codebase and produce a prepared question list. For each question, include:
- The question text (enriched with your findings from actual files)
- Context: files examined, specific findings, relevant code snippets
- Suggested options based on what actually exists in the codebase
- Priority (high/medium/low) and category

Research areas:
1. Tech stack: Check package.json, requirements.txt, go.mod, Cargo.toml, etc.
2. Architecture: Monorepo vs microservices vs monolith structure
3. Existing features related to "${topic}" (search for relevant code/modules)
4. Recent changes: git log --oneline -20 for relevant patterns
5. Testing setup: test frameworks, coverage, patterns
6. Deployment: Docker, CI/CD, infrastructure files

Write output to: ${session_dir}/question_prep/discovery_codebase.yaml
YAML format with questions array and summary.`
})

// Spawn architecture research agent
Task({
  subagent_type: "cagents:architect",
  description: "Research: Architecture analysis for Discovery questions",
  prompt: `You are a research agent preparing architecture-informed questions for /designer Discovery.
TOPIC: ${topic}
SESSION: ${session_dir}

Analyze the project architecture and produce prepared questions. Focus on:
1. Module boundaries and integration points relevant to "${topic}"
2. Data flow patterns (how data moves through the system)
3. Existing architectural decisions and patterns
4. Technical constraints from the current architecture
5. Scalability characteristics and limitations

Write output to: ${session_dir}/question_prep/discovery_architecture.yaml
YAML format with questions array and summary.`
})
```

**While research agents work**, proceed with Step 1's question (user is answering the opening question). By the time the user responds, research agents should have completed.

## Step 3: Build Question Pool from Research

After research agents complete (question_prep files exist):

1. Read `question_prep/discovery_codebase.yaml` and `question_prep/discovery_architecture.yaml`
2. Merge all questions into a single **question pool**
3. Sort by priority (high first), then by category clustering
4. Also load the domain-specific chunk template as a FALLBACK source for any gaps

```
Question Pool Construction:
  1. Research agent questions (priority source -- enriched with real codebase findings)
  2. Chunk template questions (fill gaps for categories research didn't cover)
  3. Remove duplicates (same topic covered by both research + template)
  4. Sort: high priority first, then cluster by category for conversational flow
```

**Fallback**: If question_prep files don't exist (research agents failed/timed out), fall back entirely to chunk templates + inline Glob/Grep/Read analysis (current behavior).

### Domain-Specific Question Categories

**Software Domain** (reference: `Agent_Memory/_system/templates/designer/software_chunks.yaml`):
- Core problem statement (3 questions)
- Technical architecture (5 questions)
- User experience (4 questions)
- Security & compliance (3 questions)
- Testing & validation (3 questions)
- Deployment & operations (4 questions)

**Business Domain** (reference: `Agent_Memory/_system/templates/designer/business_chunks.yaml`):
- Current state analysis (4 questions)
- Desired future state (4 questions)
- Stakeholders & impact (3 questions)
- Implementation plan (4 questions)
- Risk & mitigation (3 questions)

**Creative Domain** (reference: `Agent_Memory/_system/templates/designer/creative_chunks.yaml`):
- Core premise (3 questions)
- Characters (5 questions)
- World & setting (4 questions)
- Conflict & plot (5 questions)
- Themes & style (3 questions)

## Step 4: Present Questions as Controller

Present questions from the pool using the controller pattern:

**Selection**: Pick the highest-priority, dependency-satisfied question. Present it via AskUserQuestion with the research-enriched context and options.

```javascript
// Example: Research found existing auth, so question is enriched:
AskUserQuestion({
  questions: [{
    question: "Your project uses Next.js with next-auth (v4.24) and Prisma+PostgreSQL. The current auth is credentials-based with session strategy. Should the new design extend this stack or consider alternatives?",
    header: "Stack",
    options: [
      {label: "Extend existing stack", description: "Build within Next.js + next-auth + Prisma (recommended based on existing setup)"},
      {label: "Extend with new tech", description: "Add technologies alongside existing stack"},
      {label: "Different approach", description: "Consider alternative technologies"},
      {label: "Stack doesn't matter", description: "This design isn't technology-specific"}
    ],
    multiSelect: false
  }]
})
```

**After each answer, apply controller logic:**
1. **Reorder**: If user shows expertise, promote technical questions. If user emphasizes a topic, promote related questions.
2. **Skip**: If answer already covers an upcoming question's topic, skip it with brief notification: "Skipping database question -- you confirmed PostgreSQL with Prisma."
3. **Enrich**: Add user's answer context to upcoming questions (e.g., if user said "we need mobile support", enrich remaining questions with this constraint).
4. **Dispatch follow-up**: If user reveals something not in research (e.g., "we also have a mobile app"), spawn a follow-up research agent:

```javascript
Task({
  subagent_type: "cagents:backend-developer",
  description: "Follow-up research: mobile app integration",
  prompt: `Follow-up research for /designer Discovery.
TOPIC: ${topic}
NEW INFO FROM USER: "We also have a mobile app that needs integration"
Investigate: mobile app codebase location, shared APIs, authentication pattern for mobile.
Write to: ${session_dir}/question_prep/followup_discovery_mobile.yaml`
})
```

**Adapt question complexity to user expertise level**:
- Technical answers with jargon -> expert-level questions
- Simple answers -> beginner-friendly questions
- Detect and adapt within the first 2-3 exchanges

## Step 5: Template Offer

If the design matches a known template pattern, offer it:

```javascript
AskUserQuestion({
  questions: [{
    question: "This looks like a system architecture design. Want to use a proven template?",
    header: "Template",
    options: [
      {label: "Use template (Recommended)", description: "System Architecture template with pre-structured questions"},
      {label: "Custom approach", description: "I'll guide the exploration without a template"},
      {label: "See all templates", description: "Show me available templates first"}
    ],
    multiSelect: false
  }]
})
```

**Available Templates** (reference: `Agent_Memory/_system/templates/designer/templates/`):
1. `product_feature_template` - Product features with user stories
2. `uiux_design_template` - UI/UX with wireframes and flows
3. `system_architecture_template` - Full system architecture
4. `api_design_template` - REST/GraphQL API design
5. `business_process_template` - Business workflows and processes
6. `creative_content_template` - Stories, novels, screenplays

## Discovery Phase Gate + Phase-Overlap

Before advancing to Ideation, verify:
- [ ] Problem statement is clear and specific (>20 characters)
- [ ] At least 1 stakeholder/user group identified
- [ ] At least 1 constraint documented
- [ ] Success criteria defined (measurable if possible)

If any are missing, ask targeted questions to fill gaps. Do NOT skip to Ideation with gaps.

**Phase-Overlap**: When the synthesis/confirmation question is being asked (Step 7), spawn Ideation research agents in parallel:

```javascript
// Spawn during Discovery synthesis (user is reviewing summary):
Task({
  subagent_type: "cagents:architect",
  description: "Research: Design patterns for Ideation questions",
  prompt: `Research agent for Ideation phase questions.
TOPIC: ${topic}
SESSION: ${session_dir}
Read ${session_dir}/phases/01_discovery.md for Discovery findings.
Research: 2-4 design alternatives fitting discovered constraints, relevant patterns,
trade-off dimensions, feasibility indicators.
Write to: ${session_dir}/question_prep/ideation_patterns.yaml`
})

Task({
  subagent_type: "cagents:backend-developer",
  description: "Research: Feasibility analysis for Ideation questions",
  prompt: `Research agent for Ideation feasibility assessment.
TOPIC: ${topic}
SESSION: ${session_dir}
Read ${session_dir}/phases/01_discovery.md for constraints.
Assess: feasibility of likely approaches given tech stack, effort estimates, risk factors.
Write to: ${session_dir}/question_prep/ideation_feasibility.yaml`
})
```

This ensures Ideation research is ready when Phase 2 begins.

## Discovery Synthesis

After 5-7 discovery questions, confirm understanding:

```javascript
AskUserQuestion({
  questions: [{
    question: `Here's what I understand so far:

**Problem**: ${problem_statement}
**Users**: ${stakeholders}
**Constraints**: ${constraints}
**Success looks like**: ${success_criteria}

Does this capture the situation?`,
    header: "Confirm",
    options: [
      {label: "Yes, move to solutions", description: "Start exploring solution approaches"},
      {label: "Mostly right", description: "Small corrections, then continue"},
      {label: "Missing something", description: "Important context I haven't shared"},
      {label: "Let me re-explain", description: "The understanding needs significant adjustment"}
    ],
    multiSelect: false
  }]
})
```
