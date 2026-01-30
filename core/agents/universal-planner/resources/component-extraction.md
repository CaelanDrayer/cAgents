# Component Extraction

Break request into 5 major component types.

## UNDERSTAND Components

What must we know before proceeding?

```yaml
understand:
  current_state:
    - "What existing code exists?"
    - "What model is in place?"
    - "What routes need changes?"
    - "What framework/stack is used?"

  constraints:
    - "Security requirements?"
    - "Performance requirements?"
    - "Compatibility requirements?"
    - "Timeline constraints?"

  stakeholders:
    - "Who are the users?"
    - "Who approves the design?"
    - "Who maintains this after?"
```

## DESIGN Components

What decisions must be made?

```yaml
design:
  architecture:
    - "What approach should we use?"
    - "What patterns to follow?"
    - "How does it integrate?"

  security:
    - "What protection is needed?"
    - "What validation is required?"
    - "What access controls?"

  integration:
    - "API contracts needed?"
    - "Database schema changes?"
    - "External dependencies?"
```

## BUILD Components

What must be created?

```yaml
build:
  backend:
    - model_updates
    - services
    - middleware
    - endpoints
    - utilities

  frontend:
    - pages
    - components
    - state_management
    - styling

  database:
    - schema_changes
    - migrations
    - indexes

  configuration:
    - env_variables
    - security_config
    - cors_settings
```

## VERIFY Components

How do we know it works?

```yaml
verify:
  unit_tests:
    - service_tests
    - utility_tests
    - component_tests

  integration_tests:
    - flow_tests
    - api_tests
    - e2e_tests

  security_tests:
    - bypass_tests
    - injection_tests
    - vulnerability_scans
```

## DOCUMENT Components

What must be recorded?

```yaml
document:
  api_docs:
    - endpoint_documentation
    - flow_diagrams
    - error_responses

  user_docs:
    - user_guides
    - setup_instructions

  developer_docs:
    - integration_guide
    - security_considerations
    - deployment_notes
```

## Component Discovery Process

Search codebase for relevant context:

```bash
# Find existing related code
Grep(pattern: "auth|login|session|jwt|token", type: "code")
Grep(pattern: "user|User|account|Account", type: "code")

# Understand project structure
Glob(pattern: "**/package.json")
Glob(pattern: "**/requirements.txt")
Glob(pattern: "**/*.config.*")

# Find existing patterns
Grep(pattern: "middleware|interceptor", type: "code")
Grep(pattern: "router|route|endpoint|api", type: "code")
```
