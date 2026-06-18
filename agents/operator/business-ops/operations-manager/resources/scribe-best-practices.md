> Sub-resource for mode `scribe` — relocated verbatim from `agents/operator/business-ops/scribe/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Scribe

> Design principles, patterns, and frameworks that guide high-quality meeting documentation, decision capture, knowledge management, and structured summary work.

## Design Principles

- **Capture Decisions, Not Just Discussion**: The primary value of documentation is preserving what was decided and why — not producing a transcript of what was said. One decision documented is worth more than ten opinions recorded.
- **Documentation Is Immediately Perishable**: The moment a meeting ends, memory begins to fade and participants diverge on what was decided. Time from meeting end to documentation delivery is the primary quality driver.
- **Clarity Over Completeness**: A concise, well-organized document that answers "what was decided and what happens next?" is more valuable than a comprehensive transcript nobody reads.
- **Serve Future Readers**: Write for the reader who was not in the room — provide enough context that the document is self-explanatory without prior knowledge of the meeting or project.
- **Decisions Require Owners**: Every documented decision must include who made it; every action item must include who owns it and by when — documentation without accountability is decoration.
- **Structure Enables Retrieval**: Documents that can't be found are documents that don't exist. Consistent naming, tagging, and filing conventions are part of the documentation job, not optional.
- **Confirm Accuracy Quickly**: Get key decisions validated by participants within 24 hours while memory is still reliable — catching errors early is far cheaper than correcting them after they've influenced actions.

## Key Patterns & Frameworks

- **DACI Decision Log**: Driver (who made the decision), Approver (who must sign off), Contributor (who provided input), Informed (who must know) — captures role clarity alongside the decision itself.
- **Meeting Minutes Template**: Attendees → Objectives → Decisions Made (with rationale) → Action Items (owner, deadline) → Next Meeting / Next Steps. Apply as the standard output format for every formal meeting.
- **Action Item Tracker**: Running log of all actions assigned across meetings with owner, deadline, source meeting, and status. Apply to prevent action items from disappearing between meetings.
- **Pyramid Principle (Documentation)**: Lead with the conclusion/recommendation, then provide supporting arguments, then underlying evidence. Apply to executive summaries and decision documents — busy readers need the bottom line first.
- **ADR (Architecture Decision Record)**: Structured format capturing technical decisions: context, decision, status, consequences. Apply when documenting technical or architectural decisions where future readers need to understand the "why."
- **Knowledge Base Taxonomy**: Hierarchical classification system for organizational knowledge (by topic, project, team, date) enabling consistent filing and retrieval. Apply when building or maintaining a knowledge management system.
- **Document Lifecycle Management**: Creation → Review → Approval → Publication → Maintenance → Archive → Disposal. Apply to ensure documents remain accurate and trusted over time.
- **After-Action Review (AAR) Format**: What was planned? What actually happened? Why was there a difference? What do we do differently? Apply for post-event or post-project learning documentation.
- **Decision Brief**: One-page document presenting a decision that must be made: context, options considered, recommendation, rationale, and approval required. Apply to convert discussion to action in asynchronous or remote environments.

## Domain Concepts & Terminology

### Documentation Types
- **Meeting Minutes**: Structured summary of meeting outcomes including decisions, actions, and next steps
- **Decision Log**: Persistent record of organizational decisions with rationale, alternatives considered, and outcomes
- **Action Item Log**: Tracking system for all outstanding commitments with owner, deadline, and status
- **Knowledge Base Article**: Reference document capturing organizational knowledge for ongoing use by team members
- **Executive Summary**: Condensed, audience-tailored overview of a longer document or project — written for decision-makers with limited reading time
- **Project Status Report**: Periodic structured update on project health, progress, risks, and decisions needed

### Knowledge Management
- **Knowledge Repository**: Organized storage system (wiki, sharepoint, confluence) for organizational knowledge artifacts
- **Taxonomy**: Hierarchical classification scheme organizing knowledge by category, topic, and sub-topic
- **Tagging**: Non-hierarchical labeling system enabling cross-cutting retrieval across taxonomy categories
- **Knowledge Gap**: Important organizational knowledge that exists only in individuals' heads and has not been captured
- **Version History**: Record of changes to a document over time — enables auditing and recovery of previous states
- **Document Owner**: Named individual responsible for maintaining a document's accuracy and relevance

### Quality Standards
- **SMART Action Items**: Specific, Measurable, Assigned, Realistic, Time-bound — criteria for action items that will actually be executed
- **Accuracy**: Faithfulness of documentation to what was actually said, decided, or agreed
- **Completeness**: All decisions and actions captured; no significant gap between meeting outcomes and documented record
- **Timeliness**: Speed from event to documentation delivery — target: within 24 hours for most meetings
- **Retrievability**: Ability to find a document when needed — determined by naming, filing, tagging, and search configuration

### Communication
- **Asynchronous Communication**: Information sharing that does not require simultaneous participation — documentation is the primary enabler
- **Single Source of Truth**: The one authoritative place where current information on a topic is found — prevents conflicting versions
- **Information Architecture**: Structure governing how knowledge is organized and navigated in a knowledge system

## Anti-Patterns to Avoid

- **Transcript Documentation**: Capturing everything said in a meeting rather than synthesizing into decisions, actions, and key insights. Fix: document outcomes, not proceedings — readers need the bottom line, not a full account.
- **Delayed Distribution**: Sending meeting notes days after the meeting when memory has faded and actions have been forgotten. Fix: distribute within 24 hours; critical decisions within 2 hours if they require immediate action.
- **Actionless Actions**: Documenting action items without an owner, deadline, or sufficient description to know what "done" means. Fix: every action item must have: what, who, by when — anything less is documentation theater.
- **Passive Voice Decisions**: "It was discussed that..." or "The team felt..." without attributing who decided what. Fix: name the decision-maker and use active voice — "[Person] decided that..."
- **Filing Anarchy**: Documents saved to personal drives or email without consistent taxonomy, making retrieval impossible 6 months later. Fix: apply consistent naming conventions and taxonomy immediately upon creation; treat filing as part of the documentation job.
- **Never Reviewed Documentation**: Documents created but never reviewed for accuracy by meeting participants, embedding errors into the organizational record. Fix: send summary for quick review within 24 hours; specific corrections welcomed within 48 hours, then considered final.
- **Stale Knowledge Base**: Knowledge base articles that were accurate when written but haven't been updated as circumstances changed. Fix: assign document owners with responsibility for maintenance; include "last reviewed" date; flag articles older than 12 months for review.

## Quality Indicators

- **Documentation Timeliness**: % of meeting notes distributed within 24 hours of meeting end (target: >95%).
- **Action Item Closure Rate**: % of documented action items completed by their stated deadline (target: >75%) — measures whether documentation produces action.
- **Decision Retrieval Success**: Can a specific decision be found in under 2 minutes using the knowledge system? — informal test of information architecture effectiveness.
- **Accuracy Correction Rate**: Number of factual corrections received on meeting notes per 10 notes — high rate signals listening or synthesis quality issues.
- **Knowledge Base Coverage**: % of defined organizational knowledge domains with at least one current, accurate article.
- **Document Freshness**: % of knowledge base articles reviewed or confirmed accurate within the last 12 months — stale articles erode trust in the knowledge system.
- **Action Item Orphan Rate**: % of actions with no named owner — target: 0%; any orphaned action is unmanaged.

## Collaboration Touchpoints

- **With Planning Facilitator**: Quality looks like live notes captured during workshops enabling real-time course correction, decisions synthesized clearly at session close, and action registry distributed within 24 hours of workshop end.
- **With Project Manager**: Quality looks like project decisions documented in accessible repository, action items from project meetings tracked consistently, and project status reports formatted for their stated audiences.
- **With Strategic Planner**: Quality looks like strategic decisions documented with full rationale and alternatives considered, strategy session outputs organized for future reference during implementation, and assumption log maintained alongside strategic documents.
- **With Operations Manager**: Quality looks like operational decisions accessible to all team members, SOPs maintained in the knowledge base with version history, and meeting notes from operational reviews circulated to relevant stakeholders promptly.
