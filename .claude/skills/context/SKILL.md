---
name: context
description: "Create and manage shared product context for consistent agent enrichment. Use to persist project knowledge across sessions. TRIGGER: context, product context, project knowledge. NOT for: running tasks or reviewing work."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "10.26.0"
  argument-hint: "[--show] [--reset] [--edit]"
  user-invocable: "true"
  context: "none"
  agent: "false"
allowed-tools: Read, Grep, Glob, Write, Bash, TodoWrite, AskUserQuestion
---

# /context - Shared Product Context Manager

**Current timestamp**: !`date -u +%Y-%m-%dT%H:%M:%SZ`

Manage persistent product context documents that enrich all cAgents workflows with project-specific knowledge.

## Purpose

Product context documents provide shared understanding of the project to all pipeline agents. Instead of re-discovering project conventions in every session, `/context` creates and maintains a persistent context file that the orchestrator reads during enrichment.

## Usage

```bash
/context init               # Initialize product context for current project
/context update              # Update existing context interactively
/context show                # Display current context
/context clear               # Remove product context
```

## Context Document Location

```
Agent_Memory/_projects/{project_hash}/product_context.yaml
```

Where `{project_hash}` is the first 8 characters of the SHA-256 hash of the project root path.

## Context Document Schema

```yaml
project_name: "{name}"
project_root: "{absolute_path}"
created_at: "{ISO_TIMESTAMP}"
updated_at: "{ISO_TIMESTAMP}"

# Core project identity
description: "{1-2 sentence description}"
primary_language: "{language}"
framework: "{framework if applicable}"
architecture_style: "{monolith|microservices|serverless|etc}"

# Conventions
conventions:
  naming: "{camelCase|snake_case|kebab-case|etc}"
  test_framework: "{jest|vitest|pytest|etc}"
  formatter: "{prettier|biome|black|etc}"
  linter: "{eslint|biome|ruff|etc}"

# Key directories
directories:
  source: "{src/|lib/|app/}"
  tests: "{tests/|__tests__/|spec/}"
  docs: "{docs/}"
  config: "{config/|.config/}"

# Domain knowledge
domain_knowledge:
  - "{key fact 1 about the project}"
  - "{key fact 2}"

# Integration points
integrations:
  - name: "{integration_name}"
    type: "{API|database|service|etc}"
    notes: "{key details}"
```

## How It Works

### /context init

1. Compute project hash from `pwd`
2. Scan project structure (package.json, config files, directory layout)
3. Auto-detect: language, framework, test runner, formatter, linter
4. Create `Agent_Memory/_projects/{hash}/product_context.yaml`
5. Display detected context for user review

### /context update

1. Read existing context document
2. Present current values
3. Ask user what to update
4. Merge updates (append-only for domain_knowledge)
5. Update `updated_at` timestamp

### /context show

1. Compute project hash
2. Read and display `product_context.yaml`
3. Show when it was last updated

### /context clear

1. Remove `product_context.yaml` (keep _projects/ directory for DECISIONS.md)

## Integration with Pipeline

The orchestrator reads product context during the INIT state:

```
orchestrator -> check _projects/{hash}/product_context.yaml
  if exists: include in enriched_context.yaml as project_summary
  if not: proceed without (suggest /context init)
```

This replaces per-session project discovery with persistent knowledge.

See @reference/schema.md for the full context document schema.
