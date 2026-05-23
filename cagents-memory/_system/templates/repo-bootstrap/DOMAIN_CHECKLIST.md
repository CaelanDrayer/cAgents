# New Domain Creation Checklist

Use this checklist when creating a new business domain in cAgents. Complete phases in order — each phase depends on the previous.

Replace `DOMAIN_NAME` with your domain (kebab-case, e.g., `legal`, `research`, `education`).

---

## Phase 1: Planning & Scope Definition

- [ ] Define domain scope: what problem space does this domain own?
- [ ] Identify overlaps with existing domains (engineering, creative, business, growth, people, service, shared, leadership)
- [ ] List 5–10 representative user tasks this domain would handle
- [ ] Identify 3–8 specialist agents needed (execution tier)
- [ ] Identify 1–2 controller agents needed (controller tier)
- [ ] Confirm at least 20 unique routing keywords exist for reliable detection
- [ ] Confirm C-suite sponsorship if tier 4 workflows are expected (which executive owns this domain?)

---

## Phase 2: Directory Structure

- [ ] Create `DOMAIN_NAME/` directory at project root
- [ ] Create `DOMAIN_NAME/agents/` subdirectory
- [ ] Create `DOMAIN_NAME/config/` subdirectory
- [ ] Create `DOMAIN_NAME/manifest.yaml` (domain manifest)

### manifest.yaml structure
```yaml
domain: DOMAIN_NAME
version: "1.0.0"
description: "..."
agent_count: N
controller: DOMAIN_NAME-coordinator
```

---

## Phase 3: Config Files

- [ ] Copy `domain-overrides.yaml` → `DOMAIN_NAME/config/domain_overrides.yaml`
- [ ] Fill in `domain:`, `description:`, `controller_catalog` (tier 2/3/4)
- [ ] Fill in `specialist_routing` with keyword arrays (≥ 5 keywords per area)
- [ ] Fill in `router_keywords` flat list (≥ 20 unique keywords)
- [ ] Add `cross_domain` escalation rules where applicable
- [ ] Validate YAML parses: `node -e "require('yaml').parse(require('fs').readFileSync('DOMAIN_NAME/config/domain_overrides.yaml','utf8'))"`

---

## Phase 4: Agent Files

For each agent in the domain:

- [ ] Create agent directory: `DOMAIN_NAME/agents/AGENT_NAME/`
- [ ] Copy appropriate template:
  - Execution agent → `agent-execution.md` → `SKILL.md`
  - Controller agent → `agent-controller.md` → `SKILL.md`
  - Infrastructure agent → `agent-infrastructure.md` → `SKILL.md`
  - Shared/cross-domain agent → `agent-shared.md` → `SKILL.md`
- [ ] Fill in all UPPERCASE placeholders (name, description, vibe, capabilities, etc.)
- [ ] Set correct `domain: DOMAIN_NAME` in metadata
- [ ] Set correct `tier:` (execution / controller / infrastructure)
- [ ] Set `model:` (sonnet for execution, opusplan for controllers, opus for infrastructure)
- [ ] Verify `allowed-tools:` is space-separated string (not YAML list)
- [ ] Add 2–3 concrete `<example>` blocks

Repeat for each agent (minimum: 1 controller + 2 execution agents).

---

## Phase 5: Root Manifest Registration

- [ ] Open `.claude-plugin/plugin.json`
- [ ] Add each new agent's SKILL.md path to `"agents"` array
- [ ] Increment `agent_count` if tracked
- [ ] Validate JSON: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'))"`

---

## Phase 6: Validation

- [ ] Run agent validation: `bash scripts/ci/validate-agents.sh`
- [ ] Confirm all new agents pass schema validation (name, description, tier, domain, allowed-tools)
- [ ] Run routing smoke test: `bash scripts/routing-test.sh DOMAIN_NAME` (if script exists)
- [ ] Manually test at least one routing keyword triggers the correct controller
- [ ] Verify no duplicate agent names with existing domains

---

## Phase 7: Documentation & Version Bump

- [ ] Add domain to `CLAUDE.md` domain table (Business Domains section)
- [ ] Add domain to `README.md` if present
- [ ] Update agent count in Quick Reference section of `CLAUDE.md`
- [ ] Run `scripts/sync-versions.sh <new-version>` (minor version bump for new domain)
- [ ] Add entry to `docs/RELEASE_NOTES.md` describing the new domain

---

## Completion Sign-off

| Item | Status |
|------|--------|
| Directory structure created | ☐ |
| Config files complete and valid | ☐ |
| All agents have SKILL.md with no placeholders | ☐ |
| Root manifest updated | ☐ |
| Validation passes | ☐ |
| Docs and version bumped | ☐ |

**Domain is ready for use when all items above are checked.**
