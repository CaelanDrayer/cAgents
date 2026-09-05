# Best Practices: Business Analyst

> Design principles, patterns, and frameworks that guide high-quality requirements analysis, gap analysis, and solution design work.

## Design Principles

- **Requirements Are Hypotheses**: Treat every requirement as an assumption to be validated, not a fact to be implemented — reduce rework by questioning before building.
- **Bridge Business and Technology**: Translate ambiguous business needs into precise specifications without losing the "why" that makes implementation decisions sensible.
- **Outcome Orientation**: Frame requirements in terms of business outcomes and user goals, not feature lists — "users can recover accounts in under 2 minutes" beats "add forgot-password flow."
- **Traceability End-to-End**: Every requirement must trace back to a business objective and forward to an acceptance criterion — gaps signal orphaned work or missing scope.
- **Stakeholder-Specific Communication**: Tailor artifacts to the audience — executive summaries for sponsors, process flows for operations, wireframes for UX, data models for engineering.
- **Structured Elicitation**: Use proven techniques (interviews, workshops, observation) rather than relying on passive requirements-gathering emails.
- **Iterative Refinement**: Requirements evolve; build in formal review cycles and change management rather than treating the initial spec as frozen.

## Key Patterns & Frameworks

- **Use Case Modeling**: Actors and system interactions defined as scenarios (main flow, alternative flows, exceptions). Apply to capture functional requirements and identify edge cases.
- **User Story Mapping**: Two-dimensional backlog built around the user journey — activities on X-axis, story depth on Y-axis. Apply to prioritize MVP scope and visualize release planning.
- **SIPOC Diagram**: Suppliers → Inputs → Process → Outputs → Customers — high-level view identifying scope boundaries and stakeholder handoffs before detailed analysis.
- **Gap Analysis**: Current state vs. future state comparison across people, process, and technology. Documents what must change and why.
- **BPMN (Business Process Model and Notation)**: Standardized notation for process flows with swim lanes, gateways, events, and tasks. Apply when documentation must be shared across departments.
- **Data Flow Diagram (DFD)**: Visual representation of data movement between processes, stores, and external entities. Apply to identify integration points and data ownership.
- **MoSCoW Prioritization**: Must-have / Should-have / Could-have / Won't-have for scope decisions. Apply during refinement to force explicit trade-off conversations.
- **Kano Model**: Classifies features as Basic (expected), Performance (more = better), or Excitement (delighters). Apply to guide product decisions beyond pure backlog priority.
- **Root Cause Analysis (5 Whys / Fishbone)**: Iterative questioning or cause-effect diagramming to identify underlying problems rather than symptoms. Apply before proposing solutions.
- **Decision Table**: Matrix mapping conditions to actions for complex business rules. Apply to eliminate ambiguity in conditional logic before implementation.
- **Traceability Matrix**: Cross-reference linking requirements to business objectives, test cases, and implementation artifacts. Apply to manage change impact and audit completeness.
- **Business Rules Catalog**: Documented inventory of constraints, calculations, and policies governing system behavior. Prevents contradictory implementations across teams.

## Domain Concepts & Terminology

### Requirements Types
- **Functional Requirements**: What the system does — behaviors, features, inputs/outputs
- **Non-Functional Requirements (NFRs)**: How the system performs — latency, availability, security, scalability
- **Business Requirements**: High-level objectives the solution must achieve (outcomes)
- **Stakeholder Requirements**: Needs and constraints of specific groups (users, ops, legal)
- **Transition Requirements**: One-time needs for moving from current to future state (data migration, training)
- **Constraints**: Fixed limits bounding the solution space (budget, timeline, regulation, existing tech)

### Analysis Artifacts
- **BRD (Business Requirements Document)**: Formal document capturing business context, objectives, scope, and high-level requirements
- **FRS (Functional Requirements Specification)**: Detailed technical requirements derived from the BRD
- **User Stories**: "As a [role], I want [goal] so that [benefit]" with acceptance criteria
- **Acceptance Criteria**: Specific, testable conditions defining when a requirement is satisfied (Given/When/Then)
- **Process Map / Swimlane Diagram**: Visual workflow showing who does what, when, and in what order
- **Entity-Relationship Diagram (ERD)**: Data model showing entities, attributes, and relationships

### Elicitation Techniques
- **Structured Interview**: Planned questions with a single stakeholder to capture expertise and surface implicit requirements
- **JAD (Joint Application Development)**: Facilitated workshop with business and IT to define requirements collaboratively
- **Ethnographic Study / Shadowing**: Observing users in their environment to discover tacit knowledge and pain points
- **Prototyping**: Low-fidelity mockups used to elicit feedback before committing to implementation
- **Survey / Questionnaire**: Quantitative or qualitative data collection from large stakeholder groups

### Change & Governance
- **Change Request (CR)**: Formal record of a proposed requirement change including justification, impact, and approval
- **Scope Creep**: Unauthorized expansion of project scope without corresponding adjustment to budget or timeline
- **Baseline**: Approved version of a requirements artifact used as a change management reference point

## Anti-Patterns to Avoid

- **Gold Plating**: Adding features beyond what stakeholders requested, assuming they'll appreciate extras. Fix: deliver exactly what was agreed, then gather feedback before expanding.
- **Analysis Paralysis**: Over-documenting requirements to the point where development is delayed indefinitely. Fix: apply "just enough" analysis — get to validated user stories with acceptance criteria, then build.
- **Missing Acceptance Criteria**: Requirements approved without specifying how "done" is verified, leaving implementation open to interpretation. Fix: every requirement must have at least one testable acceptance criterion before work begins.
- **Single-Stakeholder Syndrome**: Requirements gathered from one executive or vocal user, ignoring the diversity of actual users and operators. Fix: use stakeholder mapping to identify all affected groups and elicit from each.
- **Passive Requirements Gathering**: Waiting for stakeholders to send requirements rather than actively eliciting. Fix: schedule structured sessions with prepared questions and artifacts to review.
- **Technology-First Requirements**: Specifications written in terms of implementation ("use Redis") instead of behavior ("return results in <200ms"). Fix: keep requirements technology-agnostic.
- **Undocumented Assumptions**: Team proceeds based on implicit shared understanding that breaks down when stakeholders change. Fix: surface and document all assumptions; validate them before design decisions.

## Quality Indicators

- **Requirements Completeness**: % of scope areas with fully documented, reviewed, and approved requirements (target: 100% before dev start).
- **Defect Origin Rate**: % of defects traced back to requirements ambiguity or omission — leading indicator of elicitation quality.
- **Rework from Scope Creep**: Story points attributed to unplanned scope additions — signals requirements process didn't surface all needs upfront.
- **Stakeholder Sign-Off Cycle Time**: Days from requirements draft to approval — long cycles signal unclear artifacts or insufficient engagement.
- **Acceptance Criteria Pass Rate**: % of user stories passing QA on first attempt — high rate indicates acceptance criteria were specific and unambiguous.
- **Traceability Coverage**: % of requirements with bidirectional links to business objectives and test cases (target: >95%).
- **Requirements Volatility**: Number of approved requirements changed post-baseline per sprint — high volatility signals poor upfront elicitation.

## Collaboration Touchpoints

- **With Product Owner**: Quality looks like user stories with clear acceptance criteria, prioritization rationale documented, and scope boundaries agreed before sprint start.
- **With Engineering Team**: Quality looks like requirements specifying behavior and constraints without prescribing implementation, and BA available within 4 hours for clarifying questions.
- **With QA / Test Lead**: Quality looks like acceptance criteria formatted as testable Given/When/Then statements, edge cases documented, and test scenarios derived directly from requirements.
- **With Business Stakeholders**: Quality looks like regular requirements reviews with visual artifacts (process maps, wireframes), documented decisions with rationale, and a clear change request process.
