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

## Request Type Classification

| Type | Indicators | Strategy |
|------|------------|----------|
| Feature | "add", "implement", "create" | Full feature breakdown |
| Fix | "fix", "bug", "broken" | Root cause → solution tree |
| Improvement | "improve", "optimize" | Current → target → delta |
| Migration | "migrate", "move", "upgrade" | Source → target → transition |
| Question | "how", "what", "why" | No decomposition (tier 0) |
| Abstract | "make better", "fix it" | Discover → then apply above |

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
```
