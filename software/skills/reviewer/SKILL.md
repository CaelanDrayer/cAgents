---
name: Code Review Orchestrator
description: Comprehensive code review with 9 QA agents, todo tracking, and detailed reporting
version: 1.0.0
---

# Reviewer Skill

This skill is invoked by the `/reviewer` command to execute comprehensive code reviews with full todo orchestration.

## What It Does

The skill implements an equal partnership with the reviewer agent:

**Skill Responsibilities**:
1. Parse command arguments (target path, scope flags, format options)
2. Determine invocation context (standalone vs integrated with /trigger)
3. Create context-aware instruction folder
4. Analyze codebase scope (file count, types, complexity)
5. Hand off to reviewer agent with parsed context

**Agent Responsibilities** (after handoff):
6. Initialize review with 4 setup todos
7. Determine execution strategy (sequential/parallel)
8. Orchestrate 5-phase workflow with TodoWrite
9. Coordinate 9 QA agents in 3 review groups
10. Aggregate and classify findings
11. Generate final comprehensive report

## Command Arguments

```bash
/reviewer [target_path] [options]

Arguments:
  target_path          Path to review (default: current directory)

Options:
  --scope <value>      Scope filter (all|changed|staged)
  --format <fmt>       Report format (md|yaml|json) (default: md)
  --threshold <n>      File count threshold for verbosity (default: 50)
```

## Workflow Phases

### Phase 1: Initialize (Skill)
```
[in_progress] Creating review instruction folder
[pending] Analyzing codebase (estimating scope)
[pending] Parsing command arguments
[pending] Determining execution strategy
```

### Phase 2-5: Review, Aggregate, Classify, Report (Agent)
See `agents/reviewer.md` for detailed phase descriptions.

## Context-Aware Folder Creation

The skill detects invocation context and creates appropriate folder structure:

**Standalone Invocation**:
```
Agent_Memory/review_{id}/
├── instruction.yaml
├── status.yaml
├── workflow/
│   ├── scope_analysis.yaml
│   └── execution_strategy.yaml
├── findings/{design,code,security}/
├── reports/
└── episodic/
```

**Integrated with /trigger Workflow**:
```
Agent_Memory/inst_{id}/reviews/review_{timestamp}/
└── [same structure as standalone]
```

Detection logic:
1. Check `Agent_Memory/_system/registry.yaml` for active instructions
2. If active instruction in `executing` or `validating` phase → integrated mode
3. Otherwise → standalone mode

## Scope Analysis

The skill analyzes the codebase and writes `scope_analysis.yaml`:

```yaml
scope_id: scope_20260104_103800
target_path: /path/to/code
timestamp: 2026-01-04T10:38:00Z

metrics:
  total_files: 127
  total_lines: 15432
  file_types:
    javascript: 45
    typescript: 38
    python: 22
    markdown: 12
    json: 10

  complexity:
    simple: 89    # Files <200 lines
    moderate: 28  # Files 200-500 lines
    complex: 10   # Files >500 lines

verbosity_mode: summary  # "detailed" if <50 files, "summary" if >=50
```

## Handoff to Reviewer Agent

After scope analysis, the skill:

1. Writes `instruction.yaml` with parsed context
2. Invokes reviewer agent via Task tool
3. Passes control for orchestration

```javascript
Task({
  subagent_type: "agent-design:reviewer",
  description: "Execute code review workflow",
  prompt: `Execute comprehensive code review for ${targetPath}.

  Review folder: ${reviewFolder}
  Scope analysis: ${reviewFolder}/workflow/scope_analysis.yaml

  Use TodoWrite to show progress through all 5 phases.`
})
```

## Example Invocations

```bash
# Review current directory with defaults
/reviewer

# Review specific path
/reviewer src/components

# Review only changed files
/reviewer --scope changed

# Custom verbosity threshold
/reviewer --threshold 100

# JSON report format
/reviewer --format json
```

## Integration Patterns

### Standalone Review
```
User: /reviewer src/
  ↓
Skill: Creates Agent_Memory/review_20260104_001/
  ↓
Agent: Executes 5-phase review with todos
  ↓
Output: Agent_Memory/review_20260104_001/reports/final_report.md
```

### Integrated with /trigger
```
User: /trigger Add authentication
  ↓
... trigger workflow executes ...
  ↓
User: /reviewer  (or auto-invoked by validator)
  ↓
Skill: Creates Agent_Memory/inst_20260104_006/reviews/review_20260104_103800/
  ↓
Agent: Executes review, integrates with parent workflow
  ↓
Output: Review results fed back to validator
```

## File Locations

- **Command**: `commands/reviewer.md` - Command definition and prompts
- **Skill**: `skills/reviewer/SKILL.md` - This file (skill interface)
- **Agent**: `agents/reviewer.md` - Orchestration logic and phase management

## Success Criteria

The skill succeeds when:
- Instruction folder created in correct location (context-aware)
- Scope analysis completed and written
- Command arguments parsed correctly
- Reviewer agent invoked successfully
- Initial todos set up for agent to continue

---

**Version**: 1.0.0
**Partnership**: Equal collaboration with reviewer agent
**Design**: Based on session_20260104_102749
