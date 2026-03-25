# Best Practices: Roadmap Planner

> Design principles, patterns, and frameworks that guide high-quality product and technology roadmap creation, feature prioritization, dependency mapping, and strategic alignment work.

## Design Principles

- **Roadmaps Communicate Strategy, Not Just Plans**: A roadmap's primary purpose is to communicate strategic direction and priorities — not to be a project Gantt chart in disguise.
- **Outcomes Over Features**: Frame roadmap items as outcomes to achieve (improve time-to-value by 40%) rather than features to build (add onboarding wizard) — outcomes age better and invite better solutions.
- **Roadmaps Are Living Documents**: A roadmap that cannot change is a lie — plan with conviction while maintaining honesty about uncertainty, especially in distant time horizons.
- **Now / Next / Later Horizons**: Commit to specifics in the near horizon; describe direction in the medium horizon; hold loose themes for the far horizon — precision should match confidence.
- **Alignment Is the Primary Output**: A roadmap that the product, engineering, sales, and leadership teams all understand and can communicate consistently is more valuable than the most perfect prioritization.
- **Say What's Not on the Roadmap**: Communicating deliberate de-prioritization is as important as communicating what's in — it gives stakeholders the explicit "no" they need to stop lobbying.
- **Dependencies Determine Feasibility**: A roadmap is only achievable if its dependencies are known and managed — dependency visibility is non-negotiable.

## Key Patterns & Frameworks

- **Now / Next / Later Roadmap**: Three-horizon structure: Now (committed, specific), Next (directional, sequenced), Later (thematic, exploratory). Apply to communicate appropriate confidence at each horizon without false precision.
- **Opportunity Solution Tree**: Outcomes → Opportunities (customer pain/gain) → Solutions → Experiments. Apply to build roadmaps grounded in customer problems rather than internally-generated feature requests.
- **MoSCoW Prioritization**: Must-have / Should-have / Could-have / Won't-have — apply to force explicit prioritization before finalizing roadmap commitments.
- **WSJF (Weighted Shortest Job First)**: (Business value + Time criticality + Risk reduction) ÷ Duration. Apply to rank roadmap items by economic value per unit of time.
- **Dependency Map**: Visual representation of roadmap items and their dependencies (internal technical, cross-team, external). Apply before finalizing sequencing — dependency conflicts make schedules impossible.
- **Roadmap by Theme**: Organize roadmap around strategic themes (e.g., "Reduce Time-to-Value," "Enterprise Readiness") rather than features — communicates strategic intent, not just a feature list.
- **OKR-Roadmap Alignment Matrix**: Cross-reference showing which roadmap items contribute to which OKRs. Apply to confirm roadmap produces the outcomes the OKRs target, and nothing on the roadmap is disconnected from strategy.
- **Release Planning**: Breaking the roadmap into specific releases with content and target dates — bridges the gap between the roadmap's directional view and the team's sprint-level planning.
- **Kill Criteria**: Pre-defined conditions under which a roadmap item would be removed or deferred (e.g., validation data disproves assumption). Apply to enable responsive roadmap management without appearing capricious.

## Domain Concepts & Terminology

### Roadmap Structure
- **Roadmap**: Strategic planning artifact showing the planned sequence of product or technology development over time
- **Horizon**: Time-based planning zone with defined confidence level (Now: committed; Next: directional; Later: exploratory)
- **Theme**: Strategic organizing principle grouping related roadmap items (e.g., "Platform Stability," "Mobile Experience")
- **Initiative**: A significant roadmap investment spanning multiple features or work streams
- **Feature**: Specific product capability delivered as a unit of value to users
- **Milestone**: Significant roadmap event representing completion of a theme, release, or strategic objective

### Prioritization Concepts
- **Strategic Value**: Assessment of how much a roadmap item advances strategic objectives relative to alternatives
- **User Value**: Measure of the importance of a roadmap item to target users (derived from research, not assumption)
- **Time Criticality**: Cost of delaying a roadmap item — seasonality, competitive window, regulatory deadline
- **Cost of Delay**: Revenue or value lost per unit of time that delivery is postponed — fundamental prioritization input
- **Opportunity Cost**: Value foregone by choosing one roadmap item over another — explicit in good roadmapping, invisible in bad

### Dependencies
- **Technical Dependency**: Roadmap item requiring another item's technical output as a prerequisite
- **Cross-Team Dependency**: Roadmap item requiring work from another team that must be coordinated
- **External Dependency**: Roadmap item dependent on a third-party decision, API, or platform release outside organizational control
- **Blocking Dependency**: Dependency that prevents start or completion of a roadmap item until resolved
- **Interface Contract**: Formal agreement between teams on what will be delivered, by when, and in what format

### Stakeholder Communication
- **Product Brief**: Short document describing a roadmap initiative's purpose, target user, outcome, and success metrics — shared with stakeholders to build shared understanding
- **Roadmap Review**: Regular meeting where the roadmap is shared with stakeholders, updated based on strategic input, and used to surface concerns or conflicts
- **Executive Roadmap**: Simplified, theme-level roadmap view designed for senior leadership — avoids feature-level detail that obscures strategic narrative
- **Stakeholder Roadmap**: Tailored roadmap view for specific stakeholder groups emphasizing features and timelines relevant to their needs

## Anti-Patterns to Avoid

- **Roadmap as Gantt Chart**: Presenting the roadmap with specific start/end dates for every item, giving false precision and creating commitment anxiety. Fix: use Now/Next/Later or quarterly buckets; commit to specific dates only for current-horizon items.
- **Feature-First Roadmap**: Building the roadmap from a list of requested features without linking to outcomes or user problems. Fix: start from the outcome or opportunity; features are solutions, not starting points.
- **Stakeholder-Driven Prioritization**: Roadmap ordered by whoever advocated most recently or most loudly. Fix: establish and publish explicit prioritization criteria; apply consistently to all requests regardless of requester seniority.
- **Roadmap Without Dependencies**: Roadmap items sequenced without checking cross-team or technical dependencies, producing a plan that's immediately invalidated when dependency conflicts are discovered. Fix: conduct dependency mapping before publishing; update when new dependencies are identified.
- **Static Roadmap**: Roadmap published and never updated despite changing strategy, customer feedback, or market conditions. Fix: establish quarterly roadmap review cadence; communicate changes with rationale.
- **Infinite Backlog Commitment**: Roadmap extending 24+ months with specific feature commitments, creating false certainty and political commitments that constrain future decisions. Fix: limit specific commitments to current horizon; be directional for medium horizon; thematic for far horizon.
- **Hidden Deferrals**: Quietly removing items from the roadmap without communicating the change and rationale to stakeholders who were expecting them. Fix: communicate deferrals explicitly with rationale; stakeholders who discover surprise removals lose trust.

## Quality Indicators

- **Strategic Alignment Rate**: % of roadmap items explicitly linked to a current OKR or strategic objective (target: >90%).
- **Dependency Documentation**: % of roadmap items with dependencies fully identified and acknowledged by dependency owners (target: 100% for committed horizon).
- **Roadmap Freshness**: Days since last roadmap update — roadmaps older than 6 weeks without update in an active product are likely stale.
- **Stakeholder Understanding Rate**: % of key stakeholders who can accurately describe the current roadmap themes and top priorities without prompting — measures communication effectiveness.
- **Delivery Predictability**: % of roadmap items in the "Now" horizon delivered within the committed timeframe (target: >80%).
- **Kill Criteria Activation Rate**: % of planned roadmap items removed or significantly changed based on learning or market change — healthy product management requires visible adaptation, not just execution.
- **Feature Adoption Rate**: % of shipped roadmap items achieving their stated user adoption target — connects roadmap execution to outcome delivery.

## Collaboration Touchpoints

- **With Product Owner**: Quality looks like roadmap themes decomposed into sprint-ready epics and user stories, acceptance criteria for roadmap items defined before they enter the near horizon, and sprint priorities consistently aligned to roadmap sequence.
- **With Strategic Planner**: Quality looks like roadmap themes derived from strategic priorities, long-range product direction consistent with company strategic roadmap, and roadmap reviews timed to feed strategic planning cycles.
- **With Engineering Lead**: Quality looks like technical feasibility assessed before roadmap items are publicly committed, technical dependencies visible in the roadmap, and technical debt investment appearing explicitly in the roadmap.
- **With Sales / Customer Success**: Quality looks like roadmap (at appropriate detail level) shared with customer-facing teams to inform customer conversations, roadmap commitments made to customers documented and reflected in the product plan.
