# cAgents Commands Reference

Comprehensive reference for all cAgents universal commands.

## /designer - Interactive Design Assistant (v6.7)

**Status**: Production-Ready (v6.7)
**Domains**: All (Software, Creative, Business, Marketing, Product, etc.)
**Complexity**: Universal (adapts to any domain)

### Overview

Universal interactive design assistant that helps transform vague ideas into well-defined designs through intelligent chunk-based questioning with context awareness and expertise adaptation.

### What's New in v6.7

- **Smart Chunking**: Groups 3-5 related questions into logical topics with auto-synthesis
- **Context Discovery**: Automatically maps your project structure (for software domains)
- **Answer Synthesis**: Summarizes findings after each chunk completion
- **Intelligent Sequencing**: Adapts questions based on your expertise level
- **30% More Efficient**: Fewer questions needed for same coverage (12-15 vs 20+)

### Usage

```bash
/designer                              # Start interactive design session
/designer [initial idea]               # Start with context (e.g., "Build a todo app")
```

### How It Works

```
1. Universal Opening Question
   └─> "What are you trying to create or achieve?"

2. Domain Detection
   └─> Analyzes your answer to determine domain (software, creative, business, etc.)

3. Context Discovery (Software only)
   └─> Maps your project: language, framework, modules, tech stack

4. Chunk-Based Questioning
   ├─> Chunk 1: Core Problem/Premise (3-5 questions)
   ├─> Synthesis: Summarizes key findings
   ├─> Chunk 2: Architecture/Characters/Future State (3-5 questions)
   ├─> Synthesis: Summarizes key findings
   └─> ... continues until you cancel

5. Design Document Generation (on request)
   └─> Comprehensive design from all Q&A and syntheses
```

### Key Features

#### 1. Smart Chunking

Questions are grouped into logical topics:

**Software Domain Chunks**:
- Core Problem Statement (3 questions)
- Technical Architecture (5 questions)
- User Experience (4 questions)
- Security & Compliance (3 questions)
- Testing & Validation (3 questions)
- Deployment & Operations (4 questions)

**Creative Domain Chunks**:
- Core Premise (3 questions)
- Characters (5 questions)
- World & Setting (4 questions)
- Conflict & Plot (5 questions)
- Themes & Style (3 questions)

**Business Domain Chunks**:
- Current State Analysis (4 questions)
- Desired Future State (4 questions)
- Stakeholders & Impact (3 questions)
- Implementation Plan (4 questions)
- Risk & Mitigation (3 questions)

#### 2. Context Discovery (Software Projects)

When you're designing software features, /designer automatically:
- Detects your programming language and framework
- Finds key modules (auth, checkout, user management, etc.)
- Identifies your tech stack (frontend, backend, database)
- Maps your project architecture (monorepo, microservices, monolith)

**Example**:
```
You: "Build OAuth support for the login system"

Claude: [Discovers context automatically]

        "I searched your codebase and found:

        **Project**: TypeScript Next.js monorepo
        **Key Modules**: Authentication (JWT with Passport.js)
        **Tech Stack**: React + Next.js + PostgreSQL + Vercel

        I see you're using JWT with Passport.js. Should we add OAuth
        providers alongside the existing authentication, or replace it?"
```

This makes questions **80% more specific and relevant**.

#### 3. Answer Synthesis

After each chunk (3-5 questions), /designer automatically synthesizes findings:

```
Based on our discussion about the core problem:

Remote teams (5-50 people) struggle with async task management because
tasks get lost in Slack with unclear ownership and progress tracking.

Key insights:
• Target: Remote teams needing structured task management
• Pain points: Lost tasks, unclear ownership, no progress visibility
• Context: Currently using Slack (insufficient for task management)

Now let's explore the technical architecture...
```

This ensures you're building on solid understanding before diving deeper.

#### 4. Intelligent Expertise Adaptation

/designer detects your expertise level from your answers and adapts questions accordingly:

**Beginner indicators**: Vague language, short answers, uncertainty, questions back
**Expert indicators**: Technical jargon, detailed answers, certainty, trade-off discussions

**Example**:

```
Beginner question: "What programming language would you like to use?"
Expert question: "What's your current tech stack, and are there any constraints?"
```

Adapts within 3-4 answers to match your knowledge level.

#### 5. Progressive Disclosure

Chunks unlock based on:
- **Dependencies**: "Technical Architecture" requires "Core Problem" first
- **Expertise Level**: Beginners skip advanced chunks like "Deployment & Operations"
- **Domain**: Creative domain doesn't need "Security & Compliance"

### Session Files

When you run /designer, it creates a session with this structure:

```
Agent_Memory/designer_sessions/session_20260113_143022/
├── session.yaml              # Session metadata (v6.7 format)
├── qa_log.yaml               # All Q&A pairs organized by chunk
├── chunks.yaml               # Chunk progress tracking
├── context_map.yaml          # Discovered project context (software only)
├── chunk_syntheses/          # Syntheses for each completed chunk
│   ├── chunk_001_synthesis.md
│   ├── chunk_002_synthesis.md
│   └── chunk_003_synthesis.md
└── design_document.md        # Generated on request
```

Sessions are automatically saved and can be resumed later.

### When to Use /designer

**Perfect for**:
- Fleshing out vague ideas before implementation
- Understanding requirements through guided questions
- Exploring problem space before committing to solution
- Capturing design decisions with reasoning
- Creating comprehensive design documents

**Not ideal for**:
- Quick questions (just ask directly)
- Implementation (use /trigger after designing)
- Simple tasks that don't need design phase

### After Designing

When you cancel /designer, you get options:

1. **Generate Design Document**: Comprehensive doc with all Q&A and syntheses
2. **Start Implementation with /trigger**: Automatically formats session context into implementation request
3. **Continue Later**: Session is saved, resume anytime

### Design Document Generation

Request a design document after your session:

```
User: "Generate a design document"

Claude: [Creates comprehensive document from session]
```

**Software Design Document** includes:
- Problem & Purpose (from chunk 1)
- Technical Architecture (from chunk 2)
- User Experience (from chunk 3)
- Security & Compliance (from chunk 4)
- Testing & Validation (from chunk 5)
- Deployment & Operations (from chunk 6)
- Complete Q&A log with syntheses

**Creative Writing Document** includes:
- Premise (from chunk 1)
- Characters (from chunk 2)
- World & Setting (from chunk 3)
- Conflict & Plot (from chunk 4)
- Themes & Style (from chunk 5)
- Complete story blueprint

**Business Process Document** includes:
- Current State (from chunk 1)
- Desired Future State (from chunk 2)
- Stakeholders & Impact (from chunk 3)
- Implementation Plan (from chunk 4)
- Risk & Mitigation (from chunk 5)

### Integration with /trigger

Seamlessly transition from design to implementation:

```
User: "Start implementation with /trigger"

Claude: "I'll create an implementation workflow using all context from
        your design session. This includes:

        • Problem statement and requirements
        • Technical architecture decisions
        • Success criteria and constraints
        • Complete design reference

        Ready to proceed?"

User: "Yes"

Claude: [Automatically invokes /trigger with comprehensive context]
```

The /trigger workflow receives:
- All session context (Q&A + syntheses)
- Discovered project context (if software)
- Design decisions with reasoning
- Success criteria
- Constraints and requirements

### Backward Compatibility

v6.7 fully supports old designer sessions (v6.6 and earlier):
- Automatically detects legacy format
- Migrates on first read
- No data loss
- All old sessions continue to work

### Example Session Flow

```
User: /designer

Claude: "What are you trying to create or achieve?"

User: "A todo app with team collaboration features"

Claude: [Domain detected: software]
        [Loads software chunks]
        [Runs context discovery]

        "I searched your codebase and found:

        **Project**: TypeScript Next.js app
        **Key Modules**: Authentication (JWT), User profiles
        **Tech Stack**: React + Next.js + PostgreSQL

        Now let me understand what you want to build..."

        [Chunk 1: Core Problem Statement]

        "Who will use this todo app with team features?"

User: "Remote teams of 5-50 people who need async task management"

Claude: [Expertise score: 0.5 (intermediate)]
        [Question 2 of 3 in chunk]

        "What makes task management difficult for these remote teams currently?"

User: "Tasks get lost in Slack, no clear ownership, hard to track progress"

Claude: [Chunk 1 complete]
        [Generating synthesis...]

        "Based on our discussion about the core problem:

        Remote teams (5-50 people) struggle with async task management
        because tasks get lost in Slack with unclear ownership and
        progress tracking.

        Key insights:
        • Target: Remote teams needing structured task management
        • Pain points: Lost tasks, unclear ownership, no progress visibility
        • Context: Currently using Slack (insufficient)

        Now let's explore the technical architecture..."

        [Transitions to Chunk 2]

        "I see you're using Next.js with PostgreSQL. Should the todo app
        integrate with your existing auth, or be a separate system?"

[Session continues...]
```

### Success Metrics (v6.7)

- **Question Efficiency**: 12-15 questions vs 20+ (30% reduction)
- **Context Awareness**: 80%+ software questions use discovered context
- **Synthesis Quality**: 90%+ key insights captured per chunk
- **Expertise Detection**: Adapts within 3-4 answers
- **Backward Compatibility**: 100% legacy session support

### Tips for Best Results

1. **Be specific in first answer**: Helps with domain detection and context discovery
2. **Don't rush**: /designer helps you think through edge cases and trade-offs
3. **Ask follow-ups**: If a question isn't clear, ask for clarification
4. **Use synthesis**: Review syntheses to ensure shared understanding
5. **Cancel when ready**: No fixed endpoint, you control when to stop
6. **Generate document**: Great for sharing with team or referencing later
7. **Use with /trigger**: Design → Implement workflow is powerful

---

## /trigger - Universal Entry Point

**Status**: Production-Ready (v5.0)
**Domains**: All
**Complexity**: Tier 0-4 (auto-detected)

### Overview

Universal entry point that automatically routes requests to appropriate domain, creates objectives-based plan, coordinates controller-based execution, and validates results.

### Usage

```bash
/trigger [your request]                # Any task in any domain
/trigger Fix auth bug                  # → Engineering domain (tier 2)
/trigger Write fantasy story           # → Creative domain (tier 2)
/trigger Plan Q4 campaign              # → Revenue domain (tier 3)
/trigger Create budget                 # → Finance-Operations (tier 4)
```

### Workflow Phases

1. **Routing**: Classify complexity tier (0-4), detect domain, set requirements
2. **Planning**: Create objectives (not detailed tasks), select controller
3. **Coordinating**: Controller uses question-based delegation to specialists
4. **Executing**: Execute implementation with controller coordination
5. **Validating**: Ensure all success criteria met

See CLAUDE.md for complete /trigger documentation.

---

## /reviewer - Enhanced Review System (v2.0)

**Status**: Production-Ready (v2.0)
**Domains**: Software, Docs, Content, Design, Process, Data, Infrastructure
**Complexity**: Tier 1-2

### Overview

Universal review system with intelligent agent selection, severity-based reporting, auto-fix suggestions, and pattern learning.

### Usage

```bash
/reviewer                         # Review current directory
/reviewer src/                    # Review specific path
/reviewer --focus security        # Security-focused review
```

### Key Features

- **30-50% faster** than v1.0 (intelligent agent selection)
- **81% faster** to critical issues (severity-based early reporting)
- **98% more actionable** (auto-fix suggestions included)
- **78% pattern detection** (learns from previous reviews)

See CLAUDE.md for complete /reviewer documentation.

---

## /optimize - Universal Optimizer

**Status**: Production-Ready
**Optimization Types**: 8 types (code, content, process, data, infrastructure, campaign, creative, sales)
**Complexity**: Tier 1-3

### Overview

Universal optimizer across 8 optimization types with baseline measurement, optimization execution, and validation.

### Usage

```bash
/optimize                              # Auto-detect and optimize
/optimize src/ --type code            # Code optimization
/optimize --type content blog/        # Content optimization
/optimize --focus performance         # Performance focus
```

### Key Features

- **20-50% faster** execution
- **30-60% smaller** bundles (code optimization)
- **15-40% less** memory usage
- Auto-detection of optimization opportunities
- Baseline measurement → optimization → validation workflow

See CLAUDE.md for complete /optimize documentation.

---

## Command Comparison

| Command | Purpose | Duration | Interaction | Output |
|---------|---------|----------|-------------|--------|
| **/designer** | Design & exploration | 10-30 min | Continuous Q&A | Design document + session |
| **/trigger** | Implementation | Varies | Autonomous | Working implementation |
| **/reviewer** | Quality review | 3-10 min | Autonomous | Issue report + fixes |
| **/optimize** | Performance improvement | 5-15 min | Autonomous | Optimized code/content |

---

## Getting Help

- **Full Architecture**: See `CLAUDE.md` for complete system documentation
- **V5.0 Workflows**: See `docs/V5_WORKFLOW_EXAMPLES.md` for tier 2, 3, 4 examples
- **V5.0 Migration**: See `docs/V5_MIGRATION_GUIDE.md` for upgrade guide

---

**Version**: 6.7.0 (/designer), 5.0.0 (other commands)
**Last Updated**: 2026-01-13
