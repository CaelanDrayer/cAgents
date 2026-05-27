# Best Practices: Universal Router

> Design principles, patterns, and frameworks that guide high-quality complexity classification, domain routing, and controller requirement determination.

## Design Principles

- **Minimum Tier 2, No Exceptions**: Every request — even a single-word typo fix — is tier 2 or higher; multi-agent specialist coverage benefits every request type
- **Always Requires Controller**: `requires_controller: true` is not conditional — it is always set; the routing decision format enforces this structurally
- **Confidence-Declared Decisions**: Every routing decision includes a confidence score (0.0-1.0) — routing agents that express false certainty produce worse downstream decisions than routing agents that honestly quantify uncertainty
- **Scope Adjustments Are Additive**: Tier upgrades compound based on multiple scope factors — multiple components, external dependencies, and high criticality each add weight independently
- **Deprecated Tiers Auto-Upgrade**: Tier 0 and tier 1 requests are automatically routed as tier 2 — no special handling, no special cases
- **Template Matching Accelerates Planning**: When a request matches a known workflow template, the router surfaces this match — downstream planners benefit from template-derived decomposition starting points
- **Reasoning is Mandatory**: Every routing_decision.yaml must include a `reasoning` block explaining template matching, initial tier, any tier upgrade, and scope adjustments — routing without reasoning is untraceable

## Key Patterns & Frameworks

- **Tier Classification Rubric**: Tier 2 (moderate: bug fix, single question, typo, isolated change) → Tier 3 (complex: multi-component feature, external dependencies, team coordination needed) → Tier 4 (expert: architectural change, company-wide impact, executive approval required)
- **Scope Adjustment Signals (+1 to Tier 3)**: Request touches multiple systems or components; involves external API integrations; is on the critical path; requires team coordination across multiple specialists
- **Scope Adjustment Signals (+2 to Tier 4)**: Strategic or architectural decisions; company-wide impact; requires executive or legal approval; involves irreversible changes at scale
- **Template Matching**: Compare the parsed request intent against the workflow template catalog — high-confidence template matches provide the planner with a decomposition head-start and known controller assignments
- **Domain Config Loading**: Read `{domain}/config/domain_overrides.yaml` to load the controller catalog and routing keywords — domain-specific routing beats generic keyword matching
- **Routing Decision Format**: A structured YAML output with routing_id, domain, tier, requires_controller, template, confidence, reasoning (template_matched, initial_tier, tier_upgrade, scope_adjustment, final_tier, controller_logic), and workflow_configuration
- **Workflow Configuration Block**: Records requires_planning, requires_validation, requires_hitl_approval (true for tier 4), and coordination_approach (always question_based) — downstream agents consume this to configure their behavior

## Domain Concepts & Terminology

### Tier Definitions
- **Tier 2 (Moderate)**: Requires one primary controller — handles bug fixes, isolated improvements, questions, minor changes; scope is bounded; few external dependencies
- **Tier 3 (Complex)**: Requires one primary + 1-2 supporting controllers — handles feature additions, multi-service changes, external integrations; scope is broad; some external dependencies
- **Tier 4 (Expert)**: Requires one executive + one primary + 2-4 supporting controllers + HITL gate — handles architectural migrations, company-wide changes, irreversible decisions; scope is unbounded; multiple external dependencies and stakeholders

### Routing Decision Fields
- **routing_id**: Unique identifier linking this routing decision to the instruction and session — enables traceability
- **domain**: Detected business domain (engineering, creative, business, growth, people, service, shared) — drives controller catalog lookup
- **tier**: Final tier (2, 3, or 4) after classification and scope adjustments — the most consequential routing output
- **requires_controller**: Always `true` — the routing enforces this invariant structurally
- **template**: The matched workflow template name, or "custom" if no template matches — informs planner decomposition
- **confidence**: 0.0-1.0 certainty in the routing decision — downstream agents calibrate their trust accordingly
- **reasoning**: The full classification rationale — traces the decision from initial tier through any upgrades

### Scope Factors
- **Multi-Component Scope**: The request touches multiple codebases, services, or system boundaries — each additional component adds coordination complexity
- **External Dependency Scope**: The request requires third-party APIs, external services, or out-of-repo resources — external dependencies are risk amplifiers
- **Criticality Scope**: The request affects payment processing, authentication, data storage, or other high-stakes paths — higher stakes justify higher tier
- **Coordination Scope**: The request requires multiple specialist domains to collaborate — implies higher coordination overhead than a single domain request

### Deprecated Tiers
- **Tier 0**: Single agent, no delegation — deprecated; auto-upgraded to tier 2
- **Tier 1**: Minimal coordination — deprecated; auto-upgraded to tier 2
- **Auto-Upgrade**: Any request initially classified below tier 2 is silently upgraded — the upgrade is recorded in the routing decision's reasoning block

## Anti-Patterns to Avoid

- **Tier 1 Routing**: Classifying any request as tier 1 or below — these tiers are deprecated and produce under-coordinated, lower-quality output
- **requires_controller: false**: Setting this field to false for any request — controller coordination is always required; the field exists to be always true
- **Confidence-Free Routing**: Writing a routing decision without a confidence score — downstream agents cannot calibrate their trust in the domain and tier assignments
- **Reasoning-Free Routing**: Omitting the reasoning block — routing decisions must be traceable; "I just decided tier 3" is not auditable
- **Missing Scope Adjustments**: Classifying a multi-service architectural change as tier 2 because the individual components seem simple — scope adjustments exist for this exact case
- **Ignoring Domain Config**: Routing based only on keyword matching in the request text without reading `domain_overrides.yaml` — domain configs have refined keywords that reduce false matches
- **Template Overmatching**: Forcing a template match with < 0.6 confidence — a low-confidence template provides incorrect structure to the planner; use "custom" below threshold

## Quality Indicators

- **Tier Distribution**: Breakdown of tier 2/3/4 classifications across all routed requests — should reflect the actual complexity distribution of incoming requests
- **Template Match Rate**: Percentage of requests that match a workflow template above 0.6 confidence — higher rates indicate a well-curated template catalog
- **Tier Upgrade Rate**: Percentage of requests that required a scope adjustment (initial tier < final tier) — measures how often requests are underestimated in initial classification
- **Routing Confidence Distribution**: Distribution of confidence scores — healthy distribution peaks above 0.7; too many low-confidence routings indicate detection ambiguity
- **Domain Accuracy**: Percentage of routings where the detected domain matches what the downstream controller confirms — measured via controller domain field in coordination_log
- **Deprecated Tier Detection**: Count of requests that initially classified as tier 0 or 1 (before auto-upgrade) — decreasing trend indicates improving classification accuracy

## Collaboration Touchpoints

- **With orchestrator**: The router is the first agent the orchestrator spawns — orchestrator receives the routing_decision.yaml and uses tier and domain to configure subsequent planning and controller selection
- **With planner**: Planner reads routing_decision.yaml to confirm domain, tier, and template match before building plan.yaml — router's tier classification directly determines how many controllers the planner assigns
- **With trigger**: Trigger performs initial domain detection before routing; the router performs a more structured tier classification using domain configs — the two detections should converge; significant disagreement indicates one detected incorrectly
- **With hitl**: Tier 4 routing triggers `requires_hitl_approval: true` in the workflow configuration — the orchestrator ensures HITL gates are inserted before final execution for tier 4 workflows
