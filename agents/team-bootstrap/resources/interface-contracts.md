# Interface Contracts

Reference document for inter-team interface contracts in wave-based execution.

## What Are Contracts?

Contracts define the interfaces between teams. They specify:
- **Provider**: The team that creates the interface
- **Consumer**: The team that depends on it
- **Interface**: What is being shared (schema, API, tokens, etc.)
- **Lifecycle**: When the interface is established and consumed

## Contract Schema

```yaml
contracts:
  - provider: platform       # Team that produces the artifact
    consumer: product        # Team that consumes it
    interface: "Database Schema & Models"
    description: "Platform defines the data layer; Product consumes models"
    established_in: 0        # Wave where provider creates the artifact
    consumed_in: 1           # Wave where consumer uses it
    artifacts:               # Concrete files/paths to verify
      - schema.prisma
      - src/models/
      - src/types/
```

## Contract Lifecycle

```
Wave 0 (bootstrap):
  -> Provider creates artifacts listed in contract
  -> Gate validation checks artifacts exist

Wave 1 (parallel):
  -> Consumer team reads contract artifacts
  -> Builds against established interfaces
  -> Reports any contract violations
```

## Enforcement

### At Gate Validation

When validating a quality gate, check all contracts where `established_in == current_wave`:

```
for each contract where established_in == gate.wave:
  for each artifact in contract.artifacts:
    verify artifact exists or was produced
  log: "Contract '{interface}' between {provider} -> {consumer}: ESTABLISHED"
```

### During Parallel Execution

Consumer teammates should reference contract artifacts in their `/act` instructions:

```
Execute TASK-03: Build user service.
Contract dependency: Database Schema from platform team.
Reference artifacts: schema.prisma, src/models/
```

### At Final Gate

Verify all contracts were both established and consumed:

```
for each contract:
  assert established (artifacts exist from provider)
  assert consumed (consumer built against artifacts)
  log: "Contract '{interface}': FULFILLED"
```

## Contract Communication

When creating teammate tasks, include contract context:

```javascript
TaskCreate({
  subject: "TASK-03: Build user API endpoints",
  description: `Execute via /act: Build user CRUD endpoints.
    Contract: Consumes "Database Schema & Models" from platform team.
    Reference: schema.prisma, src/models/, src/types/
    Acceptance: Endpoints use established models, no schema drift.`,
  activeForm: "Building user API endpoints"  // optional
})
```

## Contract Violations

If a consumer finds the contract artifacts missing or incompatible:

1. **Report** via SendMessage to the team lead
2. **Team lead** escalates to orchestrator
3. **Options**: Re-run provider task, modify contract, or adapt consumer

## Session Tracking

Contracts are tracked in `coordination_log.yaml`:

```yaml
contracts:
  - interface: "Database Schema & Models"
    provider: platform
    consumer: product
    status: fulfilled  # established | consumed | fulfilled | violated
    established_at: "2026-02-08T14:30:00Z"
    consumed_at: "2026-02-08T15:10:00Z"
    artifacts_verified: true
```
