# Workspace Skill Awareness

`/act` must reuse skills that already exist in the workspace instead of
reinventing the work they do. When a user has a dedicated skill — e.g. a
`pr` skill that knows their SOW/budget templates, a `deep-research` skill, a
`changelog` skill — the pipeline should route the matching work item to that
skill, not rebuild a worse version with generic agents. This is the
minimal-solution ladder (`@.claude/rules/playbooks/pat-minimal-solution-ladder.md`)
applied at planning time: **reuse before rebuild.**

## Why a session file is needed

`/act` runs as the main-loop agent, so the harness injects the list of
available skills directly into its context. But the planner and controllers
are **subagents** — they do NOT see the main loop's skill list. So `/act`
must capture the workspace skills once, at level 0, and persist them to
`workflow/available_skills.yaml` for the rest of the pipeline to read.

## Discovery procedure (run by `/act` at level 0)

Run this AFTER session init and domain/tier routing, BEFORE spawning the
planner. It is cheap (one optional Bash enumeration + reading the skill list
already in context).

1. **Enumerate candidate skills** from two sources, unioned by `name`:
   - The skills already listed as available in your own context (the
     harness-injected "available skills for the Skill tool" list). You can
     see these without any tool call.
   - On-disk project/user skills: `.claude/skills/*/SKILL.md` and
     `~/.claude/skills/*/SKILL.md` (a single `Bash`/`Glob` enumeration; read
     each one's frontmatter `name` + `description`). Skip if neither dir
     exists.
2. **Exclude** these — they are NOT reusable work skills for the pipeline:
   - cAgents' own pipeline skills: `act`, `team`, `designer`, `helper`
     (and their `cagents:`-prefixed aliases). Routing a work item back into
     `/act` recursively is a defect.
   - Pure built-in harness/config skills with no domain output (e.g.
     `init`, `update-config`, `keybindings-help`, `statusline-setup`) — and
     Claude Code's built-in **`run`** skill, which launches and drives the
     project's app so a human can watch a change work. The built-in `run` is
     NOT the cAgents pipeline. cAgents' own entry point was renamed
     `/run` -> `/act` precisely because the harness now ships a skill under
     that name, so `run` appears in the workspace listing of every project;
     a planner that sees it can mistake it for the old cAgents entry point
     (or read the bare verb "run" as a generic do-the-work skill) and route a
     work item into it. Never select `run` as a work item's `assigned_skill`.
     This exclusion is unconditional — it is not subject to the when-in-doubt
     rule below.
   - Anything whose description marks it non-user-invocable infrastructure.
   - When in doubt, KEEP it — an extra candidate the planner ignores is
     cheaper than a missing one that forces a reinvention.
3. **Write `workflow/available_skills.yaml`** (schema below). If there are no
   reusable skills, write an explicit empty list — do NOT error or skip the
   file; downstream agents check for it.

## `available_skills.yaml` schema

```yaml
schema_version: "1"
discovered_at: "{ISO_TIMESTAMP}"
skills:
  - name: pr
    source: project            # project | user | plugin | builtin
    invocation: "Skill({ skill: \"pr\", args: \"...\" })"
    description: "Generate a Dyrand statement-of-work / budget PR from a ticket using the SOW templates and ConnectWise client data."
    triggers: [sow, statement of work, quote, budget, proposal]   # optional keyword hints
  - name: deep-research
    source: plugin
    invocation: "Skill({ skill: \"deep-research\", args: \"<question>\" })"
    description: "Multi-source, fact-checked research report."
    triggers: [research, investigate, sources, cited report]
# Empty case:
# skills: []
```

`triggers` is optional — derive 3-6 keyword hints from the description when the
skill does not advertise its own, to help the planner match work items.

## Planner contract

The planner reads `workflow/available_skills.yaml` during decomposition. For
each work item, before assigning a cAgents execution agent, it checks whether
an available skill's `description`/`triggers` clearly covers the work item's
purpose. If one does, it assigns the **skill** instead of (or alongside) an
agent:

```yaml
work_items:
  - id: WI-3
    title: "Produce the data-migration SOW + price quote"
    assigned_skill: pr            # reuse the workspace skill...
    skill_args: "data migration Dropbox->SharePoint, 60-80h, ticket #1123223"
    assigned_to: null             # ...instead of a generic agent
    acceptance_criteria:
      - "SOW follows the workspace pr-skill template"
      - "Detailed assumptions list included (non-managed client)"
  - id: WI-4
    title: "Implement the auth fix"
    assigned_to: cagents:backend-developer   # no matching skill -> normal agent
    acceptance_criteria: [...]
```

Rules:
- Prefer an existing skill ONLY when the match is clear. A vague or partial
  match routes to a normal agent — do not force-fit.
- A work item has EITHER `assigned_skill` OR `assigned_to`, never both
  populated (set the unused one to `null`).
- Record WHY in the work item's note when a skill was chosen over an agent
  (e.g. "reuse: workspace pr skill owns SOW templates").
- Tier-2 fast path: skill matching still applies — it is cheap and high-value.

## Controller invocation contract

When a controller processes a work item with `assigned_skill`, it invokes the
workspace skill via the **Skill tool** rather than spawning an execution
agent:

```
Skill({ skill: "{assigned_skill}", args: "{skill_args}" })
```

Then it treats the skill's output as the work item's deliverable and runs the
normal reviewer loop against the acceptance criteria.

**Graceful fallback** (mirrors `@.claude/rules/playbooks/pat-graceful-degradation-depth1.md`):
if the `Skill` tool is verifiably absent from the controller's surface (e.g.
at the nesting ceiling, or a regressed harness), the controller does NOT fail
the work item — it spawns the closest-matching cAgents execution agent
instead and records `skill_fallback: "{reason}"` in `coordination_log.yaml`.
Verify the tool is actually absent before falling back; do not assume.

## What this does NOT do

- It does not auto-run every workspace skill. Discovery only catalogs them;
  the planner decides per work item whether a skill is the right tool.
- It does not recurse into cAgents' own skills (act/team/designer/helper),
  and it never routes a work item to Claude Code's built-in `run` skill.
- It does not require the user to register skills anywhere — discovery is
  automatic from the workspace.

## See also

- `.claude/rules/playbooks/pat-minimal-solution-ladder.md` — reuse-before-rebuild
- `.claude/rules/core/controllers.md` § Invoking Workspace Skills
- `agents/core/planner/SKILL.md` § Workspace Skill Reuse
