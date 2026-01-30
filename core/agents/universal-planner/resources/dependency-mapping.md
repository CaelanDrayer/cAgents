# Dependency Mapping

Map what depends on what for execution planning.

## Dependency Types

### Prerequisite
Must be done before the dependent item.

```yaml
prerequisite:
  - user_model -> auth_service
  - auth_service -> auth_endpoints
  - auth_service -> auth_middleware
  - design_complete -> implementation_start
```

### Parallel
Can be done simultaneously.

```yaml
parallel:
  - [backend_auth, frontend_auth]  # With contract agreement
  - [unit_tests, integration_tests]
  - [api_docs, user_docs]
```

### Sequential
Must be done in order.

```yaml
sequential:
  - understand -> design -> build -> verify -> document
  - database_schema -> backend_service -> api_endpoints
```

### Blocking
Cannot proceed without.

```yaml
blocking:
  - security_review -> production_deploy
  - all_tests_pass -> merge_to_main
```

## Dependency Graph Visualization

```
understand_current_state
         ↓
    design_auth_flow
         ↓
    ┌────┴────┐
    ↓         ↓
user_model  frontend_design
    ↓         ↓
auth_service  login_pages
    ↓         ↓
auth_endpoints  auth_context
    ↓         ↓
    └────┬────┘
         ↓
  integration_tests
         ↓
   security_review
         ↓
    documentation
```

## Dependency Graph Output

```yaml
dependency_graph:
  critical_path:
    - WI-001  # Analyze existing
    - WI-002  # Design architecture
    - WI-003  # Update user model
    - WI-004  # Auth service
    - WI-008  # Integration tests
    - WI-012  # Security review
    - WI-016  # Documentation

  parallel_groups:
    group_1:  # After design complete
      - WI-003  # User model
      - WI-004  # Auth service (can start interface)

    group_2:  # After backend interface defined
      - WI-005  # Backend endpoints
      - WI-009  # Frontend pages

    group_3:  # After implementation
      - WI-008  # Integration tests
      - WI-010  # Security tests

  blocking_dependencies:
    - WI-012 (security_review) blocks production_deploy
    - WI-008 (integration_tests) blocks merge
```

## Critical Path Analysis

The critical path is the longest sequence that determines minimum completion time:

1. Identify all paths through dependency graph
2. Calculate total effort for each path
3. The longest path is the critical path
4. Optimizations should focus on critical path items

## Parallel Opportunity Detection

Look for items that:
- Have same dependencies (can start together)
- Don't depend on each other (can run simultaneously)
- Have sufficient resources to parallel execute

```yaml
parallel_opportunities:
  - {items: [WI-003, WI-004], reason: "Same dependency (WI-002), different targets"}
  - {items: [WI-008, WI-010], reason: "Independent test types, same codebase"}
```
