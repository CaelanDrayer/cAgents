# Best Practices: Continuity Checker

> Design principles, patterns, and frameworks that guide high-quality narrative consistency verification, timeline management, and continuity error detection work.

## Design Principles

- **Build the Bible First**: Before checking continuity, build a comprehensive character/world/timeline bible from the existing text. Checking against a partial mental model produces missed errors; checking against a documented canon produces systematic results.
- **Distinguish Error Types**: Continuity errors range from narrative-breaking plot contradictions to minor physical description mismatches to timeline impossibilities. Report with severity classification so authors prioritize the right fixes.
- **Trust the Text Over Memory**: Always verify claims against the actual text, not memory of the text. Scene-by-scene reference is more reliable than impression-based recall.
- **Track Establishment Carefully**: The first time a detail appears in the narrative is the canonical version. All subsequent appearances are checked against that first establishment, not against general knowledge or assumptions.
- **Timeline Is the Spine**: Temporal consistency errors undermine reader immersion more than most other continuity problems. Build and maintain an explicit timeline document as the foundation of all continuity work.
- **Character Consistency Is Behavioral**: Physical description errors are easy to spot; behavioral inconsistencies — a character acting contrary to their established psychology — are more significant and harder to detect.
- **Systemic Search Beats Intuition**: Do not rely on "noticing" errors while reading. Build systematic cross-reference queries (every mention of character X's appearance; every reference to event Y's date) for comprehensive coverage.

## Key Patterns & Frameworks

- **Story Bible Construction Protocol**: Step-by-step process for building a canonical reference document — character profiles, world rules, timeline, relationship maps, object tracking — before continuity analysis begins.
- **Continuity Error Taxonomy**: Five-category classification — (1) Physical description contradictions, (2) Temporal/timeline impossibilities, (3) Knowledge/information errors (character knows something they couldn't), (4) Behavioral inconsistencies, (5) World-rule violations. Each category has different severity defaults and different fix approaches.
- **Timeline Matrix Method**: Build a scene-by-scene timeline matrix with columns for date/time, location, characters present, events, established details, and cross-references. Timeline impossibilities become visible when the matrix is complete.
- **Character Bible Format**: Standardized character profile template — physical description inventory, introduced-in-scene reference, established relationships, known information inventory, established speech patterns, noted inconsistency flags.
- **Object Tracking System**: Log significant objects (keys, weapons, documents, magical items) with their location at each scene they appear. Objects that teleport or multiply are classic continuity errors.
- **Knowledge Map Analysis**: Track what each character knows and when they learn it. Scenes where characters act on information they haven't yet received are a specific and common continuity error type.
- **World-Rule Registry**: Document established rules of the story's world — magic systems, physical laws, social rules, institutional behavior — and check plot events against these rules.
- **Cross-Reference Passage Linking**: For each established canonical detail, link all subsequent passages that reference it for quick verification and error location.

## Domain Concepts & Terminology

### Continuity Categories
- **Physical Continuity**: Consistency of characters' physical descriptions, clothing, injuries, and possessions across scenes
- **Temporal Continuity**: Logical consistency of the timeline — events happen in plausible sequence, durations are realistic, dates don't contradict
- **Informational Continuity**: Characters act only on information they legitimately possess at that point in the story
- **Behavioral Continuity**: Character behavior remains consistent with established psychology, unless the arc explicitly changes it
- **World-Rule Continuity**: Plot events comply with the established rules of the story's physical, social, or magical world

### Reference Documents
- **Story Bible**: Canonical reference document compiling all established narrative facts — the authoritative source for continuity checking
- **Timeline Document**: Chronological record of all narrative events with dates, durations, and scene references
- **Character Bible**: Per-character profile of physical description, known information, relationships, and behavioral patterns
- **World-Rule Registry**: Documented list of the story world's physical, social, magical, or technical rules
- **Object Inventory**: Log tracking significant objects across their appearances in the narrative

### Error Classification
- **Continuity Error**: Any inconsistency between two or more narrative moments that cannot be reconciled by narrative logic
- **Canon Violation**: Event or detail that contradicts established world rules or previously established facts
- **Retroactive Continuity (Retcon)**: Intentional revision of established canon, as opposed to accidental continuity error; requires documentation in story bible
- **Temporal Paradox**: Timeline arrangement where events are causally impossible — effect preceding cause, character in two places simultaneously
- **Knowledge Leak**: Character demonstrating awareness of information they have not yet received within the narrative timeline

### Severity Levels
- **Critical**: Errors that break the narrative logic, make the plot impossible, or directly contradict a load-bearing story element
- **Significant**: Errors that would be noticed by attentive readers and undermine immersion, but don't break the plot
- **Minor**: Small physical description mismatches or trivial inconsistencies that most readers would not notice
- **Flagged for Author Decision**: Apparent inconsistencies that may be intentional (deliberate unreliable narrator, style choice) requiring author clarification

## Anti-Patterns to Avoid

- **Memory-Based Checking**: Checking continuity from memory rather than against the text; human memory is reconstructive and unreliable for the precision continuity checking requires.
- **Severity Undifferentiation**: Reporting a character's eye color changing and a timeline impossibility with equal urgency; severity classification helps authors allocate revision effort correctly.
- **Prescriptive Rather Than Descriptive**: Telling authors how to fix errors rather than identifying the error and its location; the author decides the fix.
- **Demanding World Explanation**: Flagging every unexplained coincidence or unusual event as a continuity error; some mysteries are intentional and the continuity checker is not the story arbiter.
- **Style Confusion**: Flagging deliberate stylistic choices (unreliable narrator inconsistencies, time-loop ambiguities) as errors; distinguish between style and mistake.
- **Incomplete Bible**: Beginning continuity checking before building a comprehensive canonical reference document; incomplete bibles produce incomplete error reports.
- **Isolated Scene Analysis**: Checking individual scenes in isolation without building the cross-scene matrix; errors that span multiple scenes require the full picture to detect.

## Quality Indicators

- **Story Bible Completeness**: The pre-analysis story bible covers all main characters, the full timeline, and all established world rules mentioned in the text
- **Error Taxonomy Compliance**: Every reported error is classified by category (physical, temporal, informational, behavioral, world-rule) and severity
- **Scene and Page Citation**: Every reported error is cited with specific scene/chapter/page references for both the establishment and the contradiction
- **False Positive Rate**: Review of flagged errors shows high proportion are genuine continuity problems rather than intentional stylistic choices
- **Zero-Miss Critical Errors**: Post-publication/post-review verification finds no critical continuity errors that the checker missed
- **Actionability**: Each reported error includes enough information for the author to locate and understand the problem without re-reading the entire work
- **Knowledge Map Coverage**: Analysis explicitly tracks character knowledge states, not just physical descriptions and timeline

## Collaboration Touchpoints

- **With Character Psychologist**: Character psychologist defines the psychological profiles that behavioral continuity is checked against; behavioral inconsistencies that are not psychology-explainable are genuine continuity errors
- **With Lore Keeper**: In franchise or extended-universe work, lore keeper manages the canonical record that continuity checker validates against; lore keeper's canon is the authoritative reference
- **With Editor**: Editor uses continuity checker's error report as a priority document for developmental revision passes; the most severe continuity errors should trigger structural editing conversations, not just local fixes
- **With Worldbuilder**: Worldbuilder establishes the world rules that world-rule continuity is checked against; apparent rule violations may indicate undocumented rules that need to be added to the world bible
