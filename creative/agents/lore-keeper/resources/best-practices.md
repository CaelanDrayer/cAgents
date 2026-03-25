# Best Practices: Lore Keeper

> Design principles, patterns, and frameworks that guide high-quality world canon management, lore database maintenance, continuity enforcement, and franchise consistency work.

## Design Principles

- **Canon Is the Contract**: Established lore is the promise to audiences who have invested time and emotional capital in a world. Contradicting canon without deliberate retcon process is a betrayal of that investment.
- **Documentation Prevents Disputes**: Undocumented canon is effectively non-existent for production purposes. If it's not in the lore bible, contributors will contradict it without knowing. Write it down.
- **Consistency Is the Immersion Engine**: Audiences don't consciously notice consistent world details, but they deeply feel inconsistency. Lore consistency is invisible when it works and damaging when it fails.
- **Distinguish Canon Levels**: Not all lore is equally canonical. Primary canon (official releases), secondary canon (licensed material), tertiary canon (supplemental material), and non-canon (explicitly excluded) have different authority levels. Track all of them.
- **Retcon With Care and Process**: Intentional lore revision is sometimes necessary. It must be explicit, justified, and systematically propagated through all relevant canon documents. Accidental retcons are always worse than deliberate ones.
- **The Living Bible**: The lore bible is never finished. It grows with each production, is corrected when errors are found, and is updated when official retcon decisions are made. Treat it as a living document, not a finalized artifact.
- **Context Before Ruling**: When evaluating apparent lore contradictions, investigate whether the contradiction is genuine or whether it can be reconciled by context, timeline, or unreliable narrator explanations.

## Key Patterns & Frameworks

- **Canon Hierarchy Documentation**: Formal structure defining which source types take precedence over others when conflicts arise — primary production, official supplemental, licensed tie-in, promotional, non-canon. Hierarchy must be explicit and agreed upon by IP owners.
- **Lore Bible Architecture**: Master reference document organized by category — History/Timeline, Geography/Cosmology, Factions/Organizations, Characters, Magic/Technology Systems, Cultural Practices, Glossary. Each category maintained as a searchable module.
- **Retcon Process Protocol**: Formal procedure for deliberate lore revision — (1) Identify the lore to be retconned and reason, (2) Check downstream effects on all dependent lore, (3) Document the retcon explicitly in the bible with rationale, (4) Update all affected entries, (5) Communicate change to all production teams.
- **Lore Query System**: Standardized process for production teams to submit lore questions and receive authoritative answers. Answers become addenda to the lore bible — undocumented verbal answers are ephemeral.
- **Contradiction Investigation Protocol**: When apparent canon conflict is flagged — (1) Locate all relevant canon sources, (2) Determine which source takes precedence by hierarchy, (3) Determine whether the contradiction can be reconciled without retcon, (4) If retcon is required, invoke Retcon Process Protocol.
- **New Lore Integration Checklist**: When a production introduces new lore — (1) Verify it doesn't contradict existing canon, (2) If it expands on canon, document the expansion, (3) Check for downstream effects on related lore, (4) Update all relevant bible entries, (5) Broadcast change to production teams.
- **Franchise Onboarding Package**: Condensed, searchable lore reference for new contributors who cannot reasonably read the entire lore bible; covers essential world facts, major characters, critical rules, and known sensitive areas.

## Domain Concepts & Terminology

### Canon Management
- **Canon**: Content officially established as part of the world's real history and therefore binding on future productions
- **Retcon (Retroactive Continuity)**: Deliberate revision of previously established canon; always explicit, always documented, always propagated
- **Contradictory Canon**: Situation where two canonical sources make incompatible claims; resolved by hierarchy, reconciliation, or retcon
- **Fanon**: Widely believed fan interpretations or community theories not officially established as canon; must not be confused with actual canon
- **Canon Level / Canon Tier**: Authority ranking of source types for conflict resolution purposes

### Lore Bible Components
- **In-Universe Timeline**: Chronological record of the world's history with dating system and key events
- **World Geography**: Maps, locations, spatial relationships, and environmental details
- **Magic/Technology System**: Rules, limitations, costs, and consistencies of the world's supernatural or advanced technological elements
- **Faction Encyclopedia**: Organizations, their histories, memberships, goals, and relationships to other factions
- **Character Registry**: Key characters with physical descriptions, relationships, significant events, and status

### Consistency Management
- **Lore Consistency Audit**: Systematic review of new content against existing canon before publication or release
- **Downstream Effect**: The impact a lore addition or change has on other established lore that depends on or references the changed element
- **Lore Gap**: An aspect of the world that has never been canonically established; a gap is preferable to a retcon and allows future creative freedom
- **Established vs. Implied Canon**: Established = explicitly stated in canon source; Implied = reasonably inferable from established canon but never stated

### Franchise Terminology
- **IP (Intellectual Property)**: The broader legal entity that encompasses all canonical and licensed creative works in a franchise
- **Canon Authority**: The person or body with ultimate authority over what is canonical; typically the IP owner or their designated representative
- **Tie-In Media**: Licensed content (novels, comics, games) produced parallel to primary media; canonical status varies by franchise
- **Expanded Universe**: Supplemental content that expands the world beyond the primary media; canonical status defined by IP owner

## Anti-Patterns to Avoid

- **Verbal-Only Canon Decisions**: Making canon rulings verbally without documenting them in the lore bible; undocumented decisions are invisible to contributors who weren't in the room.
- **Canon by Proximity**: Treating content as canon just because it was produced by the same creative team, without formal canonical designation; all content needs explicit canon classification.
- **Retroactive Silence**: Treating a lore gap as if it implies something specific; "we never said dragons can't fly to the moon" is not implied canon.
- **Hierarchyless Conflict Resolution**: Resolving canon conflicts by recency ("the newer source must be right") or authority ("the creator said so in an interview") without a formal hierarchy documented in advance.
- **Lore Bible Staleness**: Allowing the lore bible to fall behind production; stale reference documents produce the contradictions they're supposed to prevent.
- **Overly Rigid Canon Application**: Treating every minor background detail as equally binding as load-bearing world rules; not all lore has the same weight, and excessive rigidity blocks creative evolution.
- **Access Restriction**: Keeping the lore bible unavailable to production contributors who need it; accessibility is essential to the document's function.

## Quality Indicators

- **Documentation Latency**: New canon decisions are documented in the lore bible within one production cycle of being established
- **Contradiction Resolution Rate**: Apparent canon conflicts have documented resolutions (hierarchy ruling, reconciliation, or retcon) rather than unresolved disputes
- **Query Response Time**: Production teams receive authoritative lore query responses within the defined SLA, with answers documented in the bible
- **Retcon Documentation**: Every deliberate retcon has a documented entry in the lore bible with rationale, affected entries, and propagation record
- **Onboarding Effectiveness**: New contributors using the franchise onboarding package can produce lore-consistent content without producing major canon violations
- **Bible Currency**: The lore bible reflects all canon through the most recent production release
- **Canon Level Clarity**: Every lore entry specifies its canon level source, enabling appropriate conflict resolution

## Collaboration Touchpoints

- **With Continuity Checker**: Continuity checker handles scene-level and manuscript-level consistency; lore keeper handles franchise-level canonical consistency; both reference the lore bible but at different levels of specificity
- **With Worldbuilder**: Worldbuilder creates and expands the world's systems and history; lore keeper canonizes those expansions, integrates them with existing canon, and ensures they don't contradict prior established lore
- **With Narrative Director**: Director makes creative decisions that may affect canon; lore keeper advises on canonical implications of creative choices and manages the formal retcon process when directors decide to change established lore
- **With Game Writer**: Game writing that takes place in an established fictional universe requires extensive lore consultation; lore keeper provides the authoritative reference and reviews game content for canon compliance before release
