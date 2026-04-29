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
    - TASK-01  # Analyze existing
    - TASK-02  # Design architecture
    - TASK-03  # Update user model
    - TASK-04  # Auth service
    - TASK-08  # Integration tests
    - TASK-12  # Security review
    - TASK-16  # Documentation

  parallel_groups:
    group_1:  # After design complete
      - TASK-03  # User model
      - TASK-04  # Auth service (can start interface)

    group_2:  # After backend interface defined
      - TASK-05  # Backend endpoints
      - TASK-09  # Frontend pages

    group_3:  # After implementation
      - TASK-08  # Integration tests
      - TASK-10  # Security tests

  blocking_dependencies:
    - TASK-12 (security_review) blocks production_deploy
    - TASK-08 (integration_tests) blocks merge
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
  - {items: [TASK-03, TASK-04], reason: "Same dependency (TASK-02), different targets"}
  - {items: [TASK-08, TASK-10], reason: "Independent test types, same codebase"}
```
