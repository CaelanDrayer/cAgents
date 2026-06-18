## Plan Output Format

```yaml
# plan.yaml
plan_id: plan_inst_20260121_001
tier: 3
archetype: core
decomposition:
  total_work_items: 33
  by_type: {understand: 5, design: 4, build: 12, verify: 8, document: 4}
  implicit_requirements_discovered: 15
  dependencies_mapped: 28

objectives:
  - "Implement complete user authentication system"
  - "Ensure security best practices"

controller_assignment:
  primary: cagents:tech-lead
  supporting: [cagents:architect, cagents:security-engineer]

temporal_analysis:
  hour_1_foundations: "Auth library selection, DB schema for users/sessions"
  hour_2_3_core: "Token refresh edge cases, session invalidation on password change"
  hour_4_5_integration: "Middleware ordering conflicts with existing CORS setup"
  hour_6_plus_polish: "Rate limiting tuning, logging PII scrubbing"

not_in_scope:
  - item: "OAuth2 social login"
    rationale: "Phase 2 feature, requires external provider setup"
    future_consideration: "After core auth is stable, Q2 roadmap"
  - item: "Multi-factor authentication"
    rationale: "Depends on notification service not yet built"
    future_consideration: "After notification service ships"

existing_code:
  - path: "src/middleware/session.ts"
    relevance: "Basic session middleware already handles cookie parsing"
    action: "extend"
  - path: "src/models/user.ts"
    relevance: "User model exists but lacks password_hash field"
    action: "extend"

diagrams: |
  [Client] -> [Auth Middleware] -> [Route Handler]
                    |
              [Session Store] <-> [Redis]
                    |
              [User Model] <-> [PostgreSQL]

work_breakdown_file: workflow/decomposition.yaml
```
