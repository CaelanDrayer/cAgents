# Education / Curriculum Domain

Designing a course, curriculum, lesson, or learning experience — the unit
of work is a learner's transformation across measurable outcomes, NOT a
software system.

## When to pick this domain

Pick this domain when the user is designing instruction or a learning
experience:

- "design a 6-week curriculum on prompt engineering for managers"
- "design a single lesson on photosynthesis for 9th graders"
- "design an onboarding curriculum for new hires"
- "design a workshop on conflict resolution"
- "design an assessment rubric for a writing portfolio"

Do NOT pick this domain for: the LMS platform that hosts the course
(Software), the marketing for the course (Business), the documentary
about education (Creative).

## Phase 1-3 framing

**Empathize**. Learners are not "users". They are: novices, intermediates,
or experts; with prior knowledge, motivation, and constraints (time
available, environment, accessibility needs). The Empathize phase asks
the designer to identify learner personas and their starting state
before any content design begins.

**Define**. The problem statement is a *transformation goal* — what the
learner can do after the experience that they couldn't do before.
Constraints include: hours of seat time, group size, available
materials, instructor expertise, technology access, and required
accreditation outcomes. Success criteria are framed as Bloom's-taxonomy
levels (remember, understand, apply, analyze, evaluate, create) tied to
assessable behaviors.

**Conceptualize**. Offer the user 2-4 pedagogical framings:
- *Direct instruction* (instructor-led, expository — efficient for novices)
- *Inquiry / discovery* (learner-led exploration — builds metacognition)
- *Mastery / competency-based* (progress when you demonstrate, not on a clock)
- *Project / problem-based* (authentic task drives the learning)

The framing cascades into Phase 5: direct instruction needs lesson
sequencing; project-based needs scaffolding and assessment-on-product.

## Phase 5 questions

Refinement for this domain centers on alignment: outcomes → activities →
assessment. The designer selects from these question templates (full set
in `../../templates/education_chunks.yaml`):

- "What specific learning outcomes should every learner demonstrate by
  the end (start each with an action verb at a Bloom's level)?"
- "What does the learner already know coming in (prior knowledge
  assumed)?"
- "How will you assess each outcome — formative (during) and summative
  (end)?"
- "What is the activity sequence inside one lesson (engage → explain →
  explore → elaborate → evaluate, or your preferred model)?"
- "What scaffolding supports struggling learners without holding back
  advanced ones?"
- "How does accessibility figure in — vision, hearing, motor,
  language-learners, neurodivergence?"
- "What materials does the learner consume, and what do they produce?"
- "How long is each session, and what is the total dose (hours-by-weeks)?"
- "How does each lesson connect to the next (spiral, linear, modular)?"
- "What feedback loops let the instructor adapt mid-course?"

## Phase 6 artifacts

For Education, Phase 6 emits:

| Artifact | Purpose |
|----------|---------|
| `syllabus.md` | Top-level overview: outcomes, schedule, policies, materials list |
| `lesson_plan.md` (one per lesson) | Activity sequence, timing, materials, formative checks |
| `assessment_rubric.md` | Criteria, levels (1-4 or novice-expert), descriptors per cell |
| `materials_list.md` | All learner-facing artifacts (readings, slides, handouts, kits) |
| `accessibility_plan.md` | Accommodations and Universal Design for Learning specifics |
| `feedback_protocol.md` | When/how the instructor gives feedback; when learners self-assess |

Phase 6 emits a `lesson_plan.md` per lesson — NOT user stories, NOT an
API spec, NOT a technical architecture.

**Follow-up dispatch agent**: `cagents:technical-writer` for clear
writeups, or `cagents:academic-advisor` for pedagogy and curriculum
design. Fall back to `cagents:editor` (mode=copy) for learner-facing materials
review. NEVER `cagents:backend-developer` — pedagogy questions are not
software questions.
