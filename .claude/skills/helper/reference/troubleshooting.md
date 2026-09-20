# Troubleshooting Guide

Common issues and diagnostic flows for each command. Used by `/helper --troubleshoot <command>`.

> _V11.0 removed `/review`, `/optimize`, `/context`, and `/debug`. v12.1.2 then folded `/improve` into `/act` with the keyword router. See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). The troubleshooting for all of them now lives under `/act`. The keyword router covers the review, audit, optimize, and improve modes. The `--mode debug` flag and the `run context` passthrough cover the rest._

## /act Troubleshooting

### 1. Wrong domain detected
- **Symptom**: /act routes to engineering when you wanted marketing
- **Likely cause**: The keywords of the request overlap across domains. For example, the word "improve" matches both engineering and grow
- **Check**: Look at the TodoWrite output for the domain classification
- **Fix**: Run the request again with the `--domain` flag: `/act Plan campaign --domain grow`
- **Prevention**: Use a domain-specific keyword. The words campaign, marketing, and SEO all select grow

### 2. Stuck in coordinating phase
- **Symptom**: /act seems to hang after the planning phase, and it shows no progress updates
- **Likely cause**: The controller waits for an execution agent to answer. Or the agent used all of its context
- **Check**: Look at `cagents-memory/sessions/{id}/workflow/coordination_log.yaml`
- **Fix**: Use `--resume` to restart from the last checkpoint: `/act --resume act_20260207_143022`
- **Prevention**: Use `--stream` to get progress updates in real time

### 3. No controller selected
- **Symptom**: An error tells you that the controller is missing, or that the routing failed
- **Likely cause**: planner_config.yaml has no controller_catalog entry for the domain that was detected
- **Check**: Look in `{domain}/config/planner_config.yaml` for the controller_catalog section
- **Fix**: Make sure that the domain has a valid controller_catalog with the correct controllers

### 4. Validation keeps failing (FAIL/REVISE loop)
- **Symptom**: The pipeline cycles between COORDINATED and PLANNED again and again
- **Likely cause**: The acceptance criteria are too strict. Or the implementation approach is wrong
- **Check**: Read `cagents-memory/sessions/{id}/validation/validation_report.yaml` for the specific failures
- **Fix**: After 3 cycles, /act escalates to the user. Look at which criteria fail, then adjust the request

### 5. Agent not found error
- **Symptom**: "Agent cagents:{name} not found" or a similar message
- **Likely cause**: The agent markdown file is missing. Or it has no tier field in its frontmatter
- **Check**: Make sure that the agent file is at `{domain}/agents/{name}.md` and holds `tier:` in its frontmatter
- **Fix**: Make sure that the agent name matches the reference in planner_config.yaml

### 6. Debug mode keeps cycling through hypotheses without resolution
- **Symptom**: `/act --mode debug` runs 5 or more hypotheses, confirms none of them, and finds no root cause
- **Likely cause**: The bug is in a dependency or in an external service. Or it needs architecture knowledge that the agent cannot reach
- **Check**: Read the list of falsified hypotheses in the findings file of the session
- **Fix**: Use `--escalate` to build an escalation report: `/act --mode debug --escalate "..."`. Then ask a domain expert to review it
- **Prevention**: Use `--escalate` from the start if the bug already resisted 3 or more attempts

### 7. `/act context` not picked up by subsequent /act
- **Symptom**: /act still makes wrong assumptions about the project structure after `/act context init`
- **Likely cause**: The context file is not at the expected path. Or the project hash does not match
- **Check**: Run `/act context show` to make sure that the context exists and holds the correct project_root
- **Fix**: Run `/act context init` again from the root directory of the project. If a framework or a dependency changed, run `/act context update`

---

## /designer Troubleshooting

### 1. Designer not asking questions
- **Symptom**: Designer writes text instead of a call to AskUserQuestion
- **Likely cause**: The AskUserQuestion tool is not available. Or the session state is corrupt
- **Check**: Make sure that `allowed-tools` in the designer SKILL.md holds AskUserQuestion
- **Fix**: Start the session again: `/designer --resume {id}`, or start a fresh session

### 2. Design session lost after compaction
- **Symptom**: Designer loses the context of the earlier phases after a long session
- **Likely cause**: A context compaction removed the phase data from the working memory
- **Check**: Look for waypoint files in `cagents-memory/sessions/{id}/waypoints/`
- **Fix**: Use `--resume {id}`, because it reads from disk and not from memory

### 3. Template not loading
- **Symptom**: You named a template, but designer starts with generic questions
- **Likely cause**: The template file is not in the cagents-memory templates directory
- **Check**: Make sure that the template is in `cagents-memory/_system/templates/designer/templates/`
- **Fix**: Use a valid template name: product-feature, system-architecture, api-design, ui-ux, business-process, or creative-content

---

## /act review|optimize|audit|improve Troubleshooting (Keyword Router Modes)

The keyword router of `/act` covers both review work and optimize work. It reads the first token of the request. The tokens `review` and `audit` select review mode. The token `optimize` selects optimize mode. The token `improve` selects full mode. The defaults below apply to both modes, and each mode-specific item carries a tag.

### 1. Review finding everything but the issue (review mode)
- **Symptom**: The review returns many findings, and none of them relate to the real problem
- **Likely cause**: The review scope is too broad. Or the focus area is wrong
- **Fix**: Use `--focus security|performance|quality` to narrow the scope: `/act review --focus security`
- **Prevention**: Use `--scope changed` to review only the files that changed

### 2. Auto-fix broke something (review mode)
- **Symptom**: The code fails after `--auto-fix safe` ran
- **Likely cause**: The auto-fix had side effects that nobody intended
- **Check**: Read the auto-fix report at `reports/auto_fixes.yaml` in the session directory
- **Fix**: If `--rollback-on-failure` was set, the changes revert on their own. If it was not set, run `git restore`
- **Prevention**: Start with `--auto-fix safe` and `--run-tests` to catch the problems early

### 3. Framework not detected (review mode)
- **Symptom**: The review misses framework-specific patterns, such as a Next.js SSR issue
- **Likely cause**: The framework detection could not identify the project type
- **Fix**: Name the framework yourself: `/act review --framework nextjs`
- **Check**: Make sure that package.json or a framework config file is in the review target

### 4. Quality gate blocking incorrectly (review mode)
- **Symptom**: The strict quality gate fails on findings that you accept
- **Likely cause**: The gate threshold is too strict for the maturity level of the project
- **Fix**: Use `--quality-gate standard` or `--quality-gate relaxed`

### 5. No optimizations detected (optimize mode)
- **Symptom**: The detection phase finds zero opportunities
- **Likely cause**: The target path is wrong. Or the optimization type does not match the content
- **Check**: Make sure that the target path exists and holds files of the expected type
- **Fix**: Name the type yourself: `/act optimize src/ --type code`

### 6. Optimization made things worse (optimize mode)
- **Symptom**: The metrics got worse after the optimization ran
- **Likely cause**: Two or more optimizations interact. Or the baseline is wrong
- **Check**: Read the before metrics and the after metrics in `outputs/optimization_report.md`
- **Fix**: The rollback is automatic if `--rollback automatic` was set. If it was not set, run `git restore`
- **Prevention**: Use `--dry-run` first. Then use `--safety safe` for low-risk changes only

### 7. `/act improve` rejects the run
- **Symptom**: `/act improve` reports "scope is required", because the controller contract makes `--scope` mandatory
- **Likely cause**: The full mode needs a scope, which is a positional path or an explicit `--scope`. The scope makes review and optimize share one baseline
- **Fix**: Pass the path as a positional argument: `/act improve src/`. The keyword router then treats the request as the scope. You can also use the explicit flag: `/act improve --scope src/`

### 8. Baseline mismatch between runs
- **Symptom**: The suppressions from an earlier run no longer apply
- **Likely cause**: The baseline ID changed, because the scope or the framework changed between the runs
- **Fix**: Build a new baseline with `/act review --baseline <new-id>`. Then suppress again with `--suppress <id>`

---

## /team Troubleshooting

### 1. Named teammates not spawning (experimental named-teammate path only)
- **Symptom**: The team exists, but no named teammate appears. This does not affect the default concurrent-Agent subagent waves, because those waves need no env var
- **Likely cause**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is not set to "1" in the environment
- **Check**: Make sure that the env section of `.claude/settings.json` holds the variable
- **Fix**: Add `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to the env section of settings.json

### 2. /team falls back to /act
- **Symptom**: The task runs one step at a time instead of in parallel
- **Likely cause**: The task has fewer than 3 independent work items. Or every item is sequential
- **Check**: This is the expected behavior. /team needs 3 or more parallelizable work items
- **Fix**: If the task truly has parallel parts, describe those parts in the request

### 3. Subagent context exhaustion
- **Symptom**: A subagent stops in the middle of its task, or it returns incomplete output
- **Likely cause**: The work item is too complex for the context window of one subagent
- **Check**: Read the output of the subagent in the outputs directory of the session
- **Fix**: Break the work item into smaller sub-items for the next attempt

### 4. GATE validation failing
- **Symptom**: A wave gate fails, and it blocks the waves that come after it
- **Likely cause**: The output of the earlier wave does not meet the quality criteria
- **Check**: Read the gate validation of the lead in the workflow directory of the session
- **Fix**: The lead retries the wave, or it marks the wave as partial. Use `--resume` to continue

---

## /team Strategic Mode Troubleshooting (v12.2.0+; replaces /org troubleshooting)

v12.2.0 removed `/org` and absorbed it into `/team` strategic mode. Each strategic-mode symptom below is the direct successor of a historical `/org` troubleshooting case.

### 1. Wrong domains detected
- **Symptom**: /team strategic mode engages C-suite agents that you do not need, or it misses the domains that matter
- **Likely cause**: The keyword matching of `router.domain_count` is ambiguous for this request
- **Fix**: Write the request again with explicit domain keywords. You can also run `/team <request> --no-strategic` to force flat parallel execution. That flag replaces the pre-v12.2.0 form `/org --domains <list>`
- **Check**: Read `routing_decision.yaml` in the directory of the team session

### 2. Deliberation deadlock
- **Symptom**: The C-suite agents in Wave 1 and Wave 2 keep raising blocking objections that nobody can resolve
- **Likely cause**: Two domain requirements conflict at a basic level
- **Check**: Read the objection files in `team_*/workflow/objections/`
- **Fix**: After 2 rounds, the team lead escalates to the user. Give a directive to resolve the conflict. This matches the pre-v12.2.0 behavior of /org

### 3. Domain execution timeout
- **Symptom**: One per-domain wave takes much longer than the other waves
- **Likely cause**: The domain is complex and holds many work items. Or a subagent failed
- **Check**: Read the task list of the wave and the team manifest in the session directory
- **Fix**: Use `/team --resume team_{id}` to resume. The resume skips every wave that already finished. This replaces the pre-v12.2.0 form `/org --resume org_{id}`

### 4. Strategic mode unexpectedly off
- **Symptom**: You expected a C-suite deliberation, and you got a flat parallel /team run
- **Likely cause**: The request matched the keywords of one domain only, so `domain_count < 2`
- **Fix**: Add `--strategic` to force strategic mode on for a single-domain request. You can also write the request again with cross-domain keywords

---

## /helper Troubleshooting

### 1. Outdated information
- **Symptom**: /helper shows flags or features that do not exist, or it misses new ones
- **Likely cause**: The reference files of /helper are out of sync with the real SKILL.md files
- **Check**: Compare the output of `/helper --flags act` against `.claude/skills/act/SKILL.md`
- **Fix**: Update the reference files so that they match the current skill definitions
