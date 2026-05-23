# Troubleshooting Guide

Common issues and diagnostic flows for each command. Used by `/helper --troubleshoot <command>`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug` — see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Their troubleshooting now lives under `/improve` (review and optimize) and `/run` (debug mode and `run context` passthroughs)._

## /run Troubleshooting

### 1. Wrong domain detected
- **Symptom**: /run routes to engineering when you wanted marketing
- **Likely cause**: Request keywords overlap across domains (e.g., "improve" matches engineering and grow)
- **Check**: Look at the TodoWrite output for domain classification
- **Fix**: Re-run with `--domain` flag: `/run Plan campaign --domain grow`
- **Prevention**: Use domain-specific keywords (campaign, marketing, SEO for grow)

### 2. Stuck in coordinating phase
- **Symptom**: /run appears to hang after planning, no progress updates
- **Likely cause**: Controller waiting for execution agent response, or agent context exhaustion
- **Check**: Look at `cagents-memory/sessions/{id}/workflow/coordination_log.yaml`
- **Fix**: Use `--resume` to restart from last checkpoint: `/run --resume run_20260207_143022`
- **Prevention**: Use `--stream` for real-time progress updates

### 3. No controller selected
- **Symptom**: Error about missing controller or routing failure
- **Likely cause**: planner_config.yaml missing controller_catalog entry for detected domain
- **Check**: Check `{domain}/config/planner_config.yaml` for controller_catalog section
- **Fix**: Ensure the domain has a valid controller_catalog with appropriate controllers

### 4. Validation keeps failing (FAIL/REVISE loop)
- **Symptom**: Pipeline cycles between COORDINATED and PROMPTS_READY or PLANNED repeatedly
- **Likely cause**: Acceptance criteria too strict, or implementation approach fundamentally wrong
- **Check**: Read `cagents-memory/sessions/{id}/validation/validation_report.yaml` for specific failures
- **Fix**: After 5 cycles, /run escalates to user. Check what criteria are failing and adjust the request

### 5. Agent not found error
- **Symptom**: "Agent cagents:{name} not found" or similar
- **Likely cause**: Agent markdown file missing or has no tier field in frontmatter
- **Check**: Verify agent file exists in `{domain}/agents/{name}.md` with `tier:` in frontmatter
- **Fix**: Check agent naming matches the reference in planner_config.yaml

### 6. Debug mode keeps cycling through hypotheses without resolution
- **Symptom**: `/run --mode debug` runs 5+ hypotheses, none confirmed, no root cause found
- **Likely cause**: Bug is in a dependency, external service, or requires architecture knowledge not accessible
- **Check**: Review the list of falsified hypotheses in the session findings file
- **Fix**: Use `--escalate` to generate an escalation report: `/run --mode debug --escalate "..."`. Then seek domain expert review.
- **Prevention**: Use `--escalate` from the start if the bug has already resisted 3+ attempts

### 7. `/run context` not picked up by subsequent /run
- **Symptom**: /run still makes wrong assumptions about project structure despite `/run context init`
- **Likely cause**: Context file not found at expected path, or project hash mismatch
- **Check**: Run `/run context show` to verify context exists and has the correct project_root
- **Fix**: Run `/run context init` again from the project root directory; if frameworks/dependencies have changed, run `/run context update`

---

## /designer Troubleshooting

### 1. Designer not asking questions
- **Symptom**: Designer outputs text instead of using AskUserQuestion
- **Likely cause**: AskUserQuestion tool not available or session state corruption
- **Check**: Verify `allowed-tools` in designer SKILL.md includes AskUserQuestion
- **Fix**: Restart the session: `/designer --resume {id}` or start fresh

### 2. Design session lost after compaction
- **Symptom**: Designer loses context about previous phases after long sessions
- **Likely cause**: Context compaction cleared phase data from working memory
- **Check**: Look for waypoint files in `cagents-memory/sessions/{id}/waypoints/`
- **Fix**: Use `--resume {id}` which reads from disk, not memory

### 3. Template not loading
- **Symptom**: Template specified but designer starts with generic questions
- **Likely cause**: Template file not found in cagents-memory templates directory
- **Check**: Verify template exists in `cagents-memory/_system/templates/designer/templates/`
- **Fix**: Use a valid template name: product-feature, system-architecture, api-design, ui-ux, business-process, creative-content

---

## /improve Troubleshooting

`/improve` covers both review and optimize work via `--mode review|optimize|full`. The defaults below cover both modes; mode-specific items are tagged.

### 1. Review finding everything but the issue (review mode)
- **Symptom**: Lots of findings but none related to the actual problem
- **Likely cause**: Review scope too broad or wrong focus area
- **Fix**: Use `--focus security|performance|quality` to narrow: `/improve --mode review --focus security`
- **Prevention**: Use `--scope changed` to review only modified files

### 2. Auto-fix broke something (review mode)
- **Symptom**: Code fails after `--auto-fix safe` was applied
- **Likely cause**: Auto-fix had unintended side effects
- **Check**: Review the auto-fix report under `reports/auto_fixes.yaml` in the session directory
- **Fix**: If `--rollback-on-failure` was set, changes auto-revert. Otherwise, `git restore`
- **Prevention**: Start with `--auto-fix safe` and `--run-tests` to catch issues

### 3. Framework not detected (review mode)
- **Symptom**: Review misses framework-specific patterns (e.g., Next.js SSR issues)
- **Likely cause**: Framework detection failed to identify the project type
- **Fix**: Force framework: `/improve --mode review --framework nextjs`
- **Check**: Verify package.json or framework config files exist in the review target

### 4. Quality gate blocking incorrectly (review mode)
- **Symptom**: Strict quality gate fails on acceptable findings
- **Likely cause**: Gate threshold too strict for the project's maturity level
- **Fix**: Use `--quality-gate standard` or `--quality-gate relaxed`

### 5. No optimizations detected (optimize mode)
- **Symptom**: Detection phase finds zero opportunities
- **Likely cause**: Target path is wrong, or optimization type does not match the content
- **Check**: Verify target path exists and contains files of the expected type
- **Fix**: Specify type explicitly: `/improve --mode optimize src/ --type code`

### 6. Optimization made things worse (optimize mode)
- **Symptom**: Metrics regressed after optimization
- **Likely cause**: Interaction effects between multiple optimizations, or incorrect baseline
- **Check**: Read the before/after metrics in `outputs/optimization_report.md`
- **Fix**: Rollback should be automatic if `--rollback automatic` was set. Otherwise, `git restore`
- **Prevention**: Use `--dry-run` first, then `--safety safe` for low-risk changes only

### 7. `--mode full` rejects the run
- **Symptom**: `/improve --mode full` reports "scope is required"
- **Likely cause**: `--mode full` requires `--scope <path>` so review and optimize share the same baseline
- **Fix**: Re-run with `--scope`: `/improve --mode full --scope src/`

### 8. Baseline mismatch between runs
- **Symptom**: Suppressions from a prior run no longer apply
- **Likely cause**: Baseline ID changed because the scope or framework changed between runs
- **Fix**: Re-baseline with `/improve --mode review --baseline <new-id>` and re-suppress with `--suppress <id>`

---

## /team Troubleshooting

### 1. Teammates not spawning
- **Symptom**: Team created but no teammates appear
- **Likely cause**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` not set to "1" in environment
- **Check**: Verify `.claude/settings.json` env section has the variable
- **Fix**: Add `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to settings.json env

### 2. /team falls back to /run
- **Symptom**: Task runs sequentially instead of in parallel
- **Likely cause**: Fewer than 3 independent work items, or all items are sequential
- **Check**: This is expected behavior -- /team requires 3+ parallelizable work items
- **Fix**: If the task truly has parallel components, be more specific in the request

### 3. Teammate context exhaustion
- **Symptom**: Teammate stops mid-task or produces incomplete output
- **Likely cause**: Work item is too complex for a single teammate's context window
- **Check**: Read the teammate's output in the session outputs directory
- **Fix**: Break the work item into smaller sub-items for the next attempt

### 4. GATE validation failing
- **Symptom**: Wave gate fails and blocks subsequent waves
- **Likely cause**: Previous wave's output does not meet quality criteria
- **Check**: Read the lead's gate validation in the session workflow
- **Fix**: Lead will attempt retry or mark as partial. Use `--resume` to continue

---

## /team Strategic Mode Troubleshooting (v12.2.0+; replaces /org troubleshooting)

`/org` was removed in v12.2.0 and absorbed into `/team` strategic mode. The strategic-mode symptoms below are direct successors of the historical `/org` troubleshooting cases.

### 1. Wrong domains detected
- **Symptom**: /team strategic mode engages unnecessary C-suite agents or misses relevant domains
- **Likely cause**: `router.domain_count` keyword matching is ambiguous for the request
- **Fix**: Rephrase the request with explicit domain keywords, or invoke `/team <request> --no-strategic` to force flat parallel execution (replaces pre-v12.2.0 `/org --domains <list>`)
- **Check**: Read `routing_decision.yaml` in the team session directory

### 2. Deliberation deadlock
- **Symptom**: Wave 1/2 C-suite agents keep raising blocking objections that cannot be resolved
- **Likely cause**: Fundamentally conflicting domain requirements
- **Check**: Read objection files in `team_*/workflow/objections/`
- **Fix**: After 2 rounds, the team lead escalates to user. Provide a directive to resolve the conflict (same behavior as pre-v12.2.0 /org)

### 3. Domain execution timeout
- **Symptom**: One per-domain wave takes much longer than others
- **Likely cause**: Complex domain with many work items or teammate failures
- **Check**: Read the wave's task list and team manifest in the session directory
- **Fix**: Use `/team --resume team_{id}` to resume, which will skip completed waves (replaces pre-v12.2.0 `/org --resume org_{id}`)

### 4. Strategic mode unexpectedly off
- **Symptom**: Expected C-suite deliberation but got flat parallel /team
- **Likely cause**: Request only matched one domain's keywords, so `domain_count < 2`
- **Fix**: Add `--strategic` to force-enable strategic mode for a single-domain request, or rephrase to include cross-domain keywords

---

## /helper Troubleshooting

### 1. Outdated information
- **Symptom**: /helper shows flags or features that do not exist or are missing new ones
- **Likely cause**: Reference files in /helper are out of sync with actual SKILL.md files
- **Check**: Compare `/helper --flags run` output against `.claude/skills/run/SKILL.md`
- **Fix**: Reference files need to be updated to match current skill definitions
