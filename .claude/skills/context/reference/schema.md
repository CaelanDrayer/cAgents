# Context Document Schema Reference

## Full Schema

```yaml
# Required fields
project_name: string        # Human-readable project name
project_root: string        # Absolute path to project root
created_at: string          # ISO 8601 timestamp
updated_at: string          # ISO 8601 timestamp

# Project identity
description: string         # 1-2 sentence description
primary_language: string    # Primary programming language
framework: string           # Framework (Next.js, Django, Rails, etc.)
architecture_style: string  # monolith, microservices, serverless, modular

# Conventions (auto-detected where possible)
conventions:
  naming: string            # camelCase, snake_case, kebab-case, PascalCase
  test_framework: string    # jest, vitest, pytest, rspec, go test
  formatter: string         # prettier, biome, black, gofmt
  linter: string            # eslint, biome, ruff, golangci-lint
  commit_style: string      # conventional, angular, custom

# Key directories (relative to project root)
directories:
  source: string            # src/, lib/, app/
  tests: string             # tests/, __tests__/, spec/
  docs: string              # docs/
  config: string            # config/, .config/

# Domain knowledge (append-only list)
domain_knowledge:
  - string                  # Key facts about the project

# External integrations
integrations:
  - name: string            # Integration name
    type: string            # API, database, service, queue, cache
    notes: string           # Key details

# Build and deploy
build:
  command: string           # npm run build, make, cargo build
  test_command: string      # npm test, pytest, go test ./...
  deploy_target: string     # vercel, aws, gcp, self-hosted
```

## Auto-Detection Sources

| Field | Detection Source |
|-------|-----------------|
| primary_language | package.json, Cargo.toml, go.mod, requirements.txt |
| framework | package.json dependencies, import patterns |
| test_framework | package.json devDependencies, test config files |
| formatter | .prettierrc, biome.json, pyproject.toml |
| linter | .eslintrc, biome.json, .ruff.toml |
| directories | Standard convention + file existence check |

## Project Hash Computation

```javascript
const crypto = require('crypto');
const projectHash = crypto.createHash('sha256')
  .update(projectRoot)
  .digest('hex')
  .slice(0, 8);
// Result: Agent_Memory/_projects/{projectHash}/
```
