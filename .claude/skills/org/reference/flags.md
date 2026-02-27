# /org Flag Reference

## Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | Boolean | `false` | Show routing decision and planned C-suite engagement without executing |
| `--quick` | Boolean | `false` | Skip deliberation round for single-domain instructions (generate brief directly) |
| `--domains <d1,d2,...>` | Value | auto-detect | Force specific domain scope (comma-separated: make_eng, make_cre, grow, operate_fin, operate_ops, people, serve) |
| `--resume <session_id>` | Value | none | Resume an incomplete /org session from last checkpoint. Skips completed domains and only re-executes incomplete/failed ones. |
| `--resume <id> --domain <key>` | Value | none | Resume only a specific failed domain within an /org session. Other completed domains are preserved. |

## Domain Keys

Valid domain keys for `--domains`:

| Key | C-Suite | Super-Domain |
|-----|---------|--------------|
| `make_eng` | CTO | Make (Engineering) |
| `make_cre` | CCO | Make (Creative) |
| `grow` | CRO | Grow |
| `operate_fin` | CFO | Operate (Finance) |
| `operate_ops` | COO | Operate (Operations) |
| `people` | CHRO | People |
| `serve` | General Counsel | Serve |

## Examples

```bash
# Full hierarchy orchestration (auto-detects domains)
/org Launch the new product with marketing campaign and hiring plan

# Dry run to preview routing
/org Migrate to microservices architecture --dry-run

# Quick single-domain (skip deliberation)
/org Fix the authentication bug --quick

# Force specific domains
/org Restructure the engineering team --domains make_eng,people

# Resume interrupted session (skips completed domains)
/org --resume org_20260227_143022

# Resume only a specific failed domain
/org --resume org_20260227_143022 --domain make_eng
```

## Flag Interaction

| Combination | Behavior |
|-------------|----------|
| `--dry-run` + any | Show plan, do not execute |
| `--quick` + single domain | Skip deliberation, generate brief directly |
| `--quick` + multi domain | Ignored (multi-domain always deliberates) |
| `--domains` + auto-detect | `--domains` overrides auto-detection |
| `--resume` + new instruction | `--resume` takes precedence, instruction ignored |
