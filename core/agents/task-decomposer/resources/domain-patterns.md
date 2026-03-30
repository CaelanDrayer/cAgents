# Domain-Specific Decomposition Patterns

Patterns for common request types by domain.

## Engineering Decomposition Patterns

### Feature Decomposition

```yaml
feature_decomposition:
  understand:
    - analyze_existing_code
    - identify_affected_systems
    - review_dependencies
    - check_test_coverage
  design:
    - architecture_design
    - api_contract
    - data_model
    - security_review
  build:
    - backend_implementation
    - frontend_implementation
    - database_changes
    - integration_code
  verify:
    - unit_tests
    - integration_tests
    - e2e_tests
    - performance_tests
  document:
    - api_documentation
    - code_comments
    - readme_updates
    - change_log
```

### Bug Decomposition

```yaml
bug_decomposition:
  understand:
    - reproduce_issue
    - identify_root_cause
    - assess_impact
    - check_related_issues
  design:
    - solution_approach
    - regression_prevention
  build:
    - fix_implementation
    - add_regression_test
  verify:
    - verify_fix
    - run_regression_suite
    - security_check
  document:
    - update_known_issues
    - add_code_comments
```

## Creative Decomposition Patterns

### Story Decomposition

```yaml
story_decomposition:
  understand:
    - genre_requirements
    - target_audience
    - length_requirements
    - tone_guidelines
  design:
    - plot_structure
    - character_development
    - world_building
    - chapter_outline
  build:
    - first_draft
    - dialogue_refinement
    - description_enrichment
    - pacing_adjustment
  verify:
    - consistency_check
    - beta_reader_feedback
    - edit_pass
  document:
    - style_guide
    - character_bible
    - world_details
```

### Content Decomposition

```yaml
content_decomposition:
  understand:
    - audience_analysis
    - keyword_research
    - competitor_analysis
  design:
    - content_outline
    - tone_guidelines
    - call_to_action
  build:
    - draft_content
    - add_visuals
    - format_for_platform
  verify:
    - fact_check
    - grammar_check
    - seo_optimization
  document:
    - content_brief
    - style_notes
```

## Growth Domain Patterns

### Campaign Pattern

```yaml
campaign_decomposition:
  understand:
    - define_campaign_goals
    - identify_target_audience
    - research_competitors
    - analyze_channel_options
  design:
    - campaign_strategy
    - messaging_framework
    - channel_mix_selection
    - budget_allocation
  build:
    - content_creation
    - channel_setup
    - tracking_implementation
    - launch_checklist
  verify:
    - pre_launch_review
    - tracking_validation
    - audience_targeting_check
  document:
    - campaign_brief
    - performance_benchmarks
    - channel_playbook
```

### Funnel Pattern

```yaml
funnel_decomposition:
  understand:
    - audience_definition
    - current_conversion_rates
    - drop_off_analysis
    - competitor_funnel_review
  design:
    - funnel_stage_mapping
    - lead_capture_strategy
    - nurture_sequence_design
    - conversion_optimization_plan
  build:
    - landing_pages
    - lead_capture_forms
    - email_nurture_sequences
    - conversion_touchpoints
  verify:
    - funnel_flow_testing
    - conversion_tracking_validation
    - a_b_test_setup
  document:
    - funnel_documentation
    - conversion_benchmarks
    - optimization_log
```

### Channel Pattern

```yaml
channel_decomposition:
  understand:
    - channel_audience_fit
    - channel_competitive_presence
    - resource_requirements
    - roi_benchmarks
  design:
    - channel_content_strategy
    - posting_cadence
    - engagement_playbook
    - analytics_framework
  build:
    - account_setup
    - content_calendar
    - initial_content_batch
    - scheduling_automation
  verify:
    - channel_health_check
    - analytics_configuration
    - brand_consistency_review
  document:
    - channel_style_guide
    - content_templates
    - performance_targets
```

## People Domain Patterns

### Hiring Pattern

```yaml
hiring_decomposition:
  understand:
    - role_requirements
    - team_gap_analysis
    - compensation_benchmarks
    - sourcing_channel_options
  design:
    - job_description
    - interview_process_design
    - evaluation_rubric
    - offer_structure
  build:
    - job_postings
    - sourcing_outreach
    - screening_criteria
    - interview_guide
  verify:
    - candidate_pipeline_review
    - bias_check_in_process
    - legal_compliance_review
  document:
    - role_definition
    - interview_scorecard
    - hiring_decision_record
```

### Policy Pattern

```yaml
policy_decomposition:
  understand:
    - needs_assessment
    - regulatory_requirements
    - stakeholder_input
    - existing_policy_gaps
  design:
    - policy_framework
    - scope_and_applicability
    - enforcement_mechanisms
    - exception_handling
  build:
    - policy_draft
    - review_and_revision
    - approval_workflow
    - rollout_plan
  verify:
    - legal_review
    - stakeholder_sign_off
    - compliance_validation
  document:
    - final_policy_document
    - training_materials
    - acknowledgment_tracking
```

### Onboarding Pattern

```yaml
onboarding_decomposition:
  understand:
    - role_onboarding_requirements
    - team_context_and_culture
    - systems_access_needed
    - 90_day_success_criteria
  design:
    - pre_boarding_checklist
    - day_one_schedule
    - week_one_plan
    - 30_60_90_day_milestones
  build:
    - welcome_package
    - systems_access_setup
    - buddy_assignment
    - training_schedule
  verify:
    - day_one_readiness_check
    - access_verification
    - milestone_tracking_setup
  document:
    - onboarding_guide
    - role_expectations_doc
    - feedback_checkpoints
```

## Service Domain Patterns

### Support Workflow Pattern

```yaml
support_decomposition:
  understand:
    - issue_triage
    - customer_impact_assessment
    - reproduction_steps
    - escalation_criteria
  design:
    - resolution_approach
    - workaround_options
    - communication_plan
    - escalation_path
  build:
    - investigation
    - resolution_implementation
    - customer_communication
    - internal_handoff
  verify:
    - resolution_validation
    - customer_confirmation
    - regression_check
  document:
    - case_documentation
    - knowledge_base_update
    - root_cause_summary
```

### Compliance Pattern

```yaml
compliance_decomposition:
  understand:
    - regulatory_requirements
    - current_state_assessment
    - gap_identification
    - risk_prioritization
  design:
    - remediation_roadmap
    - control_framework
    - audit_preparation_plan
    - evidence_collection_strategy
  build:
    - control_implementation
    - policy_updates
    - evidence_collection
    - audit_trail_setup
  verify:
    - control_testing
    - evidence_completeness_review
    - third_party_audit
  document:
    - compliance_report
    - control_documentation
    - audit_evidence_package
```

### Legal Pattern

```yaml
legal_decomposition:
  understand:
    - issue_identification
    - jurisdiction_and_scope
    - precedent_research
    - stakeholder_interests
  design:
    - legal_strategy
    - risk_assessment
    - options_analysis
    - recommendation_framework
  build:
    - legal_analysis
    - document_drafting
    - negotiation_or_filing
    - implementation_support
  verify:
    - legal_review
    - compliance_confirmation
    - risk_sign_off
  document:
    - legal_memo
    - contract_or_filing
    - monitoring_plan
```

## Business Domain Patterns

### Strategy Pattern

```yaml
strategy_decomposition:
  understand:
    - situation_analysis
    - market_context
    - stakeholder_goals
    - constraint_mapping
  design:
    - options_generation
    - evaluation_criteria
    - scenario_modeling
    - recommendation_framework
  build:
    - strategy_document
    - execution_plan
    - resource_requirements
    - communication_materials
  verify:
    - stakeholder_review
    - feasibility_assessment
    - risk_review
  document:
    - strategy_brief
    - decision_rationale
    - execution_roadmap
```

### Product Pattern

```yaml
product_decomposition:
  understand:
    - user_needs_research
    - market_opportunity
    - technical_feasibility
    - success_metrics
  design:
    - product_vision
    - feature_prioritization
    - ux_design
    - technical_architecture
  build:
    - mvp_implementation
    - iteration_cycles
    - go_to_market_prep
    - launch_readiness
  verify:
    - user_testing
    - acceptance_criteria_review
    - launch_checklist
  document:
    - product_requirements
    - launch_brief
    - post_launch_review
```

### Operations Pattern

```yaml
operations_decomposition:
  understand:
    - process_mapping
    - bottleneck_identification
    - cost_and_time_analysis
    - stakeholder_input
  design:
    - optimization_approach
    - process_redesign
    - tooling_selection
    - change_management_plan
  build:
    - process_implementation
    - tooling_configuration
    - training_delivery
    - rollout_execution
  verify:
    - process_validation
    - efficiency_measurement
    - stakeholder_acceptance
  document:
    - process_documentation
    - training_materials
    - performance_baseline
```

## Shared Domain Patterns

### Data Analysis Pattern

```yaml
data_analysis_decomposition:
  understand:
    - question_definition
    - data_source_identification
    - stakeholder_needs
    - success_criteria
  design:
    - analysis_methodology
    - data_collection_plan
    - visualization_approach
    - insight_framework
  build:
    - data_collection
    - data_cleaning
    - analysis_execution
    - visualization_creation
  verify:
    - data_quality_check
    - methodology_review
    - insight_validation
  document:
    - analysis_report
    - data_dictionary
    - methodology_notes
```

### ML Pattern

```yaml
ml_decomposition:
  understand:
    - problem_framing
    - data_availability_assessment
    - baseline_performance
    - success_metrics
  design:
    - feature_engineering_plan
    - model_selection
    - training_strategy
    - evaluation_framework
  build:
    - data_preparation
    - feature_engineering
    - model_training
    - evaluation_and_iteration
  verify:
    - model_performance_validation
    - bias_and_fairness_check
    - production_readiness_review
  document:
    - model_card
    - training_documentation
    - deployment_runbook
```

### BI Pattern

```yaml
bi_decomposition:
  understand:
    - reporting_requirements
    - data_source_mapping
    - stakeholder_needs
    - kpi_definition
  design:
    - dashboard_layout
    - data_model_design
    - etl_architecture
    - access_and_permissions
  build:
    - etl_pipeline
    - data_model_implementation
    - dashboard_development
    - testing_and_qa
  verify:
    - data_accuracy_validation
    - stakeholder_uat
    - performance_testing
  document:
    - dashboard_documentation
    - data_lineage
    - user_guide
```

## Leadership Domain Patterns

### Strategic Decision Pattern

```yaml
strategic_decision_decomposition:
  understand:
    - context_gathering
    - stakeholder_identification
    - constraint_mapping
    - decision_scope
  design:
    - options_development
    - evaluation_criteria
    - risk_assessment
    - stakeholder_input_process
  build:
    - options_analysis
    - recommendation_development
    - communication_plan
    - execution_framework
  verify:
    - peer_review
    - risk_sign_off
    - stakeholder_alignment
  document:
    - decision_brief
    - rationale_documentation
    - execution_tracking
```

### Cross-Domain Coordination Pattern

```yaml
cross_domain_decomposition:
  understand:
    - domain_assessment
    - dependency_mapping
    - resource_constraints
    - success_criteria
  design:
    - priority_alignment
    - sequencing_plan
    - interface_contracts
    - escalation_paths
  build:
    - execution_sequencing
    - cross_domain_handoffs
    - integration_checkpoints
    - progress_tracking
  verify:
    - dependency_satisfaction
    - integration_validation
    - stakeholder_acceptance
  document:
    - coordination_plan
    - dependency_register
    - integration_summary
```

## Request Type Classification

| Type | Indicators | Strategy |
|------|------------|----------|
| Feature | "add", "implement", "create" | Full feature breakdown |
| Fix | "fix", "bug", "broken" | Root cause → solution tree |
| Improvement | "improve", "optimize" | Current → target → delta |
| Migration | "migrate", "move", "upgrade" | Source → target → transition |
| Question | "how", "what", "why" | Minimal decomposition (tier 2, expert answer) |
| Abstract | "make better", "fix it" | Discover → then apply above |
| Campaign | "campaign", "launch", "promotion", "audience", "channel strategy" | Audience → message → channels → measure |
| Policy | "policy", "guideline", "procedure", "compliance requirement", "regulation" | Scope → draft → review → approve → communicate |
| Process | "workflow", "process", "streamline", "automate", "SOP", "procedure" | Current state → gaps → redesign → validate → rollout |
| Analysis | "analyze", "research", "investigate", "report", "assess", "evaluate", "audit" | Questions → data sources → collect → synthesize → present |
| Plan | "plan", "strategy", "roadmap", "forecast", "proposal", "initiative" | Goals → constraints → options → decision → document |
| Review | "review", "audit", "assess", "evaluate", "critique", "feedback" | Scope → criteria → examine → findings → recommend |
| Content | "write", "draft", "compose", "story", "article", "copy", "script" | Brief → outline → draft → edit → finalize |
| Support | "ticket", "escalation", "resolution", "SLA", "customer issue" | Reproduce → diagnose → resolve → verify → close |

## Cross-Domain Decomposition Patterns

### Campaign Decomposition

```yaml
campaign_decomposition:
  understand:
    - define_campaign_goals
    - identify_target_audience
    - analyze_competitor_campaigns
    - review_brand_guidelines
  design:
    - channel_strategy
    - messaging_framework
    - creative_brief
    - budget_allocation
  build:
    - create_campaign_assets
    - set_up_channels
    - configure_tracking
    - prepare_launch_checklist
  verify:
    - review_assets_for_brand_compliance
    - test_tracking_setup
    - stakeholder_approval
  document:
    - campaign_brief
    - channel_playbook
    - performance_targets
```

### Policy Decomposition

```yaml
policy_decomposition:
  understand:
    - identify_regulatory_requirements
    - review_existing_policies
    - assess_stakeholder_needs
    - benchmark_industry_standards
  design:
    - define_policy_scope
    - draft_policy_structure
    - identify_review_stakeholders
  build:
    - draft_policy_document
    - create_supporting_procedures
    - develop_training_materials
  verify:
    - legal_review
    - compliance_check
    - stakeholder_feedback
    - final_approval
  document:
    - publish_policy
    - update_policy_register
    - communication_plan
```

### Process Decomposition

```yaml
process_decomposition:
  understand:
    - map_current_state
    - identify_pain_points
    - measure_current_performance
    - gather_stakeholder_input
  design:
    - design_future_state
    - identify_automation_opportunities
    - define_roles_and_responsibilities
    - change_impact_assessment
  build:
    - implement_process_changes
    - configure_tooling
    - create_SOPs
    - train_stakeholders
  verify:
    - pilot_test
    - measure_improvement
    - stakeholder_sign_off
  document:
    - process_maps
    - SOP_documentation
    - training_guides
```

### Analysis Decomposition

```yaml
analysis_decomposition:
  understand:
    - define_research_questions
    - identify_data_sources
    - scope_analysis_boundaries
    - identify_stakeholders
  design:
    - analysis_methodology
    - data_collection_plan
    - success_metrics
  build:
    - collect_data
    - clean_and_prepare_data
    - run_analysis
    - generate_insights
  verify:
    - validate_findings
    - peer_review
    - check_statistical_significance
  document:
    - executive_summary
    - detailed_findings_report
    - recommendations
    - data_appendix
```

### Plan Decomposition

```yaml
plan_decomposition:
  understand:
    - define_goals_and_objectives
    - assess_current_state
    - identify_constraints
    - stakeholder_alignment
  design:
    - evaluate_strategic_options
    - risk_assessment
    - resource_planning
    - timeline_definition
  build:
    - draft_plan_document
    - create_roadmap
    - define_milestones
    - develop_contingencies
  verify:
    - review_feasibility
    - stakeholder_review
    - risk_validation
  document:
    - strategic_plan
    - roadmap_artifact
    - communication_deck
```

### Review Decomposition

```yaml
review_decomposition:
  understand:
    - define_review_scope
    - establish_review_criteria
    - identify_reviewers
    - gather_artifacts
  design:
    - review_methodology
    - scoring_framework
    - finding_categories
  build:
    - conduct_review
    - document_findings
    - prioritize_issues
  verify:
    - validate_findings_with_owner
    - check_completeness
  document:
    - review_report
    - recommendations
    - action_items
```

### Content Decomposition

```yaml
content_decomposition:
  understand:
    - audience_analysis
    - content_goals
    - tone_and_style_guidelines
    - platform_requirements
  design:
    - content_outline
    - key_messages
    - call_to_action
  build:
    - first_draft
    - revise_and_refine
    - add_visual_elements
  verify:
    - editorial_review
    - fact_check
    - brand_compliance
  document:
    - content_brief
    - style_notes
    - publication_checklist
```

### Support Decomposition

```yaml
support_decomposition:
  understand:
    - reproduce_issue
    - assess_customer_impact
    - check_known_issues
    - gather_customer_context
  design:
    - resolution_approach
    - escalation_decision
    - workaround_options
  build:
    - implement_resolution
    - communicate_to_customer
    - update_internal_notes
  verify:
    - confirm_resolution_with_customer
    - verify_no_regression
  document:
    - update_knowledge_base
    - close_ticket
    - post_mortem_if_needed
```

## Context Gathering Commands

```bash
# Find existing related code
Grep(pattern: "auth|login|session|jwt|token", type: "code")

# Find user model
Grep(pattern: "user|User|USER", glob: "*.{ts,js,py}")

# Find route definitions
Grep(pattern: "router|route|endpoint|api", type: "code")

# Find existing middleware
Grep(pattern: "middleware|interceptor", type: "code")

# Find configuration
Glob(pattern: "**/config/**/*")

# Find tests
Glob(pattern: "**/*.{test,spec}.*")

# Growth: Find campaign assets and channel configs
Glob(pattern: "**/campaigns/**/*")
Glob(pattern: "**/marketing/**/*")
Grep(pattern: "utm_|conversion|funnel|cta", type: "text")

# People: Find HR documents and policies
Glob(pattern: "**/hr/**/*")
Glob(pattern: "**/*policy*|**/*handbook*")
Grep(pattern: "employee|onboarding|compensation", type: "text")

# Service: Find support configs and compliance docs
Glob(pattern: "**/support/**/*")
Glob(pattern: "**/compliance/**/*")
Grep(pattern: "sla|escalation|ticket|case", type: "text")

# Business: Find strategy docs and product specs
Glob(pattern: "**/strategy/**/*")
Glob(pattern: "**/product/**/*|**/specs/**/*")
Grep(pattern: "okr|kpi|roadmap|milestone", type: "text")

# Shared/Data: Find data pipelines and ML artifacts
Glob(pattern: "**/data/**/*|**/models/**/*")
Glob(pattern: "**/*.ipynb|**/notebooks/**/*")
Grep(pattern: "pipeline|schema|dataset|feature", type: "text")

# Leadership: Find org docs and strategic plans
Glob(pattern: "**/docs/**/*strategy*|**/docs/**/*vision*")
Grep(pattern: "objective|initiative|priority|stakeholder", type: "text")
```
