# @cagents/creative - Creative Writing Domain

**Version**: 4.1.0
**Status**: ✅ **FULLY FUNCTIONAL**
**Total Agents**: 23 (5 workflow + 1 executive + 17 creative team)

## Overview

The **Creative Domain** provides autonomous creative writing capabilities through specialized agents that collaborate to produce novels, stories, characters, worlds, and other creative content. From concept to polished manuscript, the creative domain handles the complete creative writing workflow.

## Agent Categories

### Workflow Agents (5)
Core workflow orchestration for creative projects:

- **router** - Complexity classification for creative requests (tiers 0-4)
- **planner** - Task decomposition for creative projects (chapters, arcs, characters)
- **executor** - Creative team coordination and deliverable aggregation
- **validator** - Quality gate (narrative coherence, character consistency, genre conventions)
- **self-correct** - Adaptive recovery for creative deliverables

### Executive Leadership (1)
Creative vision and strategic direction:

- **cco** - Chief Creative Officer: creative vision, narrative strategy, artistic direction

### Creative Team Agents (17)
Specialized creative professionals:

**Story & Structure** (3):
- **story-architect** - Plot structure, narrative design, story arcs
- **narrative-designer** - Narrative flow, story progression, transitions
- **plot-developer** - Plot refinement, twists, complications, subplot weaving

**Character Development** (2):
- **character-designer** - Character profiles, backstories, motivations, arcs
- **character-psychologist** - Deep psychological profiles, mental states, emotional depth

**World Building** (3):
- **worldbuilder** - World design, magic systems, cultures, geography
- **lore-keeper** - World history, timelines, continuity tracking
- **setting-designer** - Specific locations, environments, scene settings

**Writing & Style** (2):
- **prose-stylist** - Chapter/scene writing, prose composition, description
- **dialogue-specialist** - Character dialogue, conversation flow, voice

**Editing & Quality** (4):
- **editor** - Structural editing, prose polish, pacing improvements
- **copy-editor** - Grammar, spelling, punctuation, technical polish
- **continuity-checker** - Plot holes, character consistency, timeline verification
- **sensitivity-reader** - Cultural sensitivity, respectful representation

**Specialized Support** (3):
- **research-specialist** - Historical accuracy, scientific plausibility, fact-checking
- **fantasy-specialist** - Fantasy genre conventions and tropes
- **scifi-specialist** - Science fiction genre conventions and technology

## Creative Complexity Tiers

| Tier | Type | Example | Workflow |
|------|------|---------|----------|
| 0 | Trivial | "What is the hero's journey?" | Direct answer |
| 1 | Simple | "Create character sketch" | Execute → Validate |
| 2 | Moderate | "Write 5k word story" | Plan → Execute → Validate |
| 3 | Complex | "Write 30k word novella" | Parallel team execution with checkpoints |
| 4 | Expert | "Write 70k word novel" | Full team orchestration + CCO oversight |

## Creative Project Types

### Supported Creative Work

**Fiction Writing**:
- Novels (50k+ words)
- Novellas (10k-50k words)
- Short stories (< 10k words)
- Flash fiction (< 1k words)

**Development & Design**:
- Character development and profiles
- World building and lore creation
- Plot outlines and story structures
- Series planning and multi-book arcs

**Editing & Revision**:
- Structural editing
- Prose polish and refinement
- Copyediting and technical corrections
- Continuity and consistency checking

**Genre Specialization**:
- Fantasy (magic systems, epic quests)
- Science Fiction (technology, alien cultures)
- Mystery (clues, red herrings, resolution)
- Literary Fiction (theme, character depth)
- And more genres through genre-specialist agents

## Workflow Example: Write a Novel

### Tier 4: Full Novel (70,000 words)

**Phase 1: Foundation (Planning)**
1. Router classifies as tier 4 (expert - novel length)
2. Planner creates structure:
   - Character development tasks (protagonist, antagonist, supporting)
   - World building tasks (magic system, geography, cultures)
   - Plot outline (three-act structure with 23 chapters)
   - Research tasks (historical accuracy, cultural authenticity)

**Phase 2: Execution (Writing)**
1. Executor coordinates creative team:
   - **character-designer** creates protagonist, antagonist, supporting characters
   - **worldbuilder** designs magic system and world bible
   - **story-architect** structures three-act plot with key beats
   - **prose-stylist** writes chapters 1-23 (3k words each)
   - **dialogue-specialist** refines character conversations
2. Parallel execution where possible (independent chapters, world elements)
3. Checkpoints at act boundaries (CCO review)

**Phase 3: Revision (Editing)**
1. **editor** performs structural edit (plot coherence, character arcs)
2. **editor** performs prose edit (clarity, style, rhythm)
3. **copy-editor** performs technical polish (grammar, spelling)
4. **continuity-checker** verifies consistency
5. **sensitivity-reader** reviews representation

**Phase 4: Validation**
1. Validator checks all acceptance criteria
2. Verifies narrative coherence, character consistency, world logic
3. Confirms genre conventions followed
4. Classifies as PASS/FIXABLE/BLOCKED

**Phase 5: Finalization**
- If PASS: Archive and deliver manuscript
- If FIXABLE: Self-correct applies fixes and retries validation
- If BLOCKED: HITL escalation for creative decisions

**Output**: 70,000 word polished fantasy novel ready for publication

## Key Features

### Narrative Quality
- Plot coherence and causality
- Character arc development and completion
- World logic consistency
- Genre convention adherence
- Thematic resonance

### Creative Consistency
- Character voice maintained across chapters
- World rules followed throughout
- Continuity tracking (names, dates, facts)
- Tone and style uniformity

### Genre Expertise
- Fantasy conventions (magic, quests, chosen one)
- Sci-fi conventions (technology, aliens, exploration)
- Mystery conventions (clues, red herrings, fair play)
- Literary conventions (theme, depth, character)

### Quality Standards
- **Tier 2**: Draft to polished (readable, complete)
- **Tier 3**: Polished (strong prose, good pacing)
- **Tier 4**: Publication-ready (professional quality)

## Memory Structure

Creative projects use the standard Agent_Memory structure:

```
Agent_Memory/{instruction_id}/
├── instruction.yaml          # Creative project requirements
├── status.yaml               # Current workflow phase
├── workflow/
│   ├── plan.yaml             # Creative project plan (chapters, characters, etc.)
│   ├── progress.yaml         # Word count, milestones, completion
│   └── validation_report.yaml
├── tasks/
│   ├── pending/              # Upcoming creative tasks
│   ├── in_progress/          # Currently being written
│   └── completed/            # Finished creative work
├── outputs/
│   ├── partial/              # Individual chapters, character profiles
│   │   ├── chapter_01.md
│   │   ├── chapter_02.md
│   │   ├── char_protagonist.md
│   │   └── world_bible.md
│   └── final/                # Complete manuscript
│       └── manuscript.md
└── decisions/                # Creative decisions log
```

## Usage Examples

### Write a Short Story
```bash
/trigger Write a 5,000 word mystery short story about a detective solving a locked room murder
```
- Router: Tier 2 (moderate)
- Planner: Story outline, character sketch, plot beats
- Executor: story-architect + prose-stylist + editor
- Output: 5,000 word mystery story

### Create a Character
```bash
/trigger Create a complex protagonist character for a fantasy novel - a reluctant hero with a dark past
```
- Router: Tier 1 (simple)
- Executor: character-designer + character-psychologist
- Output: Full character profile with backstory, motivation, arc

### Build a Fantasy World
```bash
/trigger Design a comprehensive fantasy world with unique magic system, three major cultures, and detailed geography
```
- Router: Tier 3 (complex)
- Planner: World elements breakdown
- Executor: worldbuilder + lore-keeper + setting-designer
- Output: World bible with magic system, cultures, geography, history

### Write a Novel
```bash
/trigger Write a 70,000 word space opera novel with three POV characters and political intrigue
```
- Router: Tier 4 (expert - consults CCO)
- Planner: 23 chapters, character arcs, world building
- Executor: Full creative team (CCO oversight)
- Output: 70,000 word polished novel manuscript

## Installation

```bash
# Install creative domain plugin
claude /plugin install @cagents/creative

# Or install full cAgents system (includes creative)
claude /plugin install cagents
```

## Dependencies

**Requires**:
- `@cagents/core@^4.1.0` (trigger, orchestrator, hitl)

**Domain**: Creative writing (independent from software/business domains)

## Template Matching

The creative router matches requests to templates:

| Keywords | Template | Tier | Output |
|----------|----------|------|--------|
| novel, book | `write_novel` | 4 | 50k+ word novel |
| novella | `write_novella` | 3 | 10k-50k word novella |
| story, short story | `write_story` | 2 | < 10k word story |
| character | `character_dev` | 1-2 | Character profile |
| world, worldbuild | `worldbuild` | 2-3 | World bible |
| plot, outline | `plot_dev` | 1-2 | Plot structure |
| edit, revise | `edit_work` | 1-3 | Edited manuscript |
| series, trilogy | `series_plan` | 4 | Multi-book plan |

## Quality Assurance

### Validation Checks
- **Narrative coherence**: Plot logic, causality, pacing
- **Character consistency**: Voice, motivation, arc completion
- **World logic**: Rules followed, no contradictions
- **Genre conventions**: Reader expectations met
- **Prose quality**: Clarity, style, grammar

### Self-Correction
- Prose errors (typos, grammar)
- Continuity issues (name consistency, timeline)
- Character voice drift
- World logic contradictions
- Genre convention fixes

## Creative Team Coordination

### Major Projects (Tier 4)
- **CCO** provides creative vision and strategic guidance
- **story-architect** designs narrative structure
- **character-designer** develops all characters
- **worldbuilder** creates comprehensive world
- **prose-stylist** writes chapters
- **editor** revises and polishes
- **continuity-checker** ensures consistency
- All agents coordinate through Agent_Memory

### Parallel Execution
- Independent chapters can be written simultaneously
- Character development and world building in parallel
- Multi-POV storylines progress concurrently
- Coordination at convergence points

## Future Enhancements

- Additional genre specialists (romance, thriller, horror, mystery)
- Screenplay and scriptwriting agents
- Poetry and verse specialists
- Non-fiction writing support
- Translation and adaptation agents

---

**Version**: 4.1.0
**Status**: ✅ Fully Functional
**Agents**: 23
**Domain**: Creative Writing
**License**: MIT
