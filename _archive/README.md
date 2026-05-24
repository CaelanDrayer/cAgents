# _archive/

Repo-root archive landing zone for items moved out of the active surface but preserved for recovery. Created in session `run_cleanup-folder_260523_002` (2026-05-23) by `cagents:tech-lead`.

**Move-only contract**: Nothing in this directory was deleted. Every item here can be restored to its original location with `git mv` (or `mv` for untracked items).

## Structure

```
_archive/
├── _deprecated_pre_v12.6/    # Aged-out _deprecated/ agents from 6 archetypes
│   ├── developer/            # 6 agents
│   ├── advisor/              # 18 agents
│   ├── analyst/              # 13 agents
│   ├── writer/               # 18 agents
│   ├── creator/              # 6 agents
│   └── strategist/           # 1 agent
└── repo_root_scratch/        # Untracked scratch artifacts moved off repo root
    ├── example/              # 76 vendor SDK example dirs (UNTRACKED)
    ├── vendor_repos/         # 26 vendored repo dirs (UNTRACKED)
    └── cagents-skills.zip    # 234 KB zip (UNTRACKED)
```

## Why these were archived

### `_deprecated_pre_v12.6/`

Per cAgents `_deprecated/` lifecycle (CLAUDE.md, `.claude/rules/core/skill-format.md` § "Deprecation: `_deprecated/` Bucket Pattern"), agents moved to `_deprecated/` are excluded from `.claude-plugin/plugin.json` by `scripts/sync-agents.sh` and are eligible for physical removal "after at least one minor-bump release cycle in `_deprecated/`".

All 62 entries had git-add dates predating the v12.6.0 commit `247fad7f` (2026-05-22) — they had served their minor-bump cycle. Archiving (rather than deleting) preserves the alias-resolution path in `scripts/migration/v12-aliases.yaml` while removing the dirs from the active archetype tree.

### `repo_root_scratch/`

`example/`, `vendor_repos/`, and `cagents-skills.zip` were untracked artifacts at the repo root cluttering the active surface. None are referenced by skills, agents, hooks, or CI.

## Recovery instructions

### Restore an archived agent

```bash
# Restore a deprecated agent to its archetype:
git mv _archive/_deprecated_pre_v12.6/<archetype>/<agent>/ <archetype>/_deprecated/<agent>/
# Or, to fully reactivate it, restore to its original active path
# (look up the prior path in git log) and run sync-agents to register it:
git mv _archive/_deprecated_pre_v12.6/<archetype>/<agent>/ <archetype>/<branch?>/<agent>/
bash scripts/sync-agents.sh
```

### Restore repo-root scratch

```bash
# Restore the example dir, vendor_repos dir, or cagents-skills.zip:
mv _archive/repo_root_scratch/example .
mv _archive/repo_root_scratch/vendor_repos .
mv _archive/repo_root_scratch/cagents-skills.zip .
```

## What was NOT touched

- `.claude-plugin/plugin.json` — the 62 archived agents were already excluded from the registry (they lived under `_deprecated/`), so the active 141-agent count is unchanged.
- `cagents-memory/` — out of scope per session constraint.
- `agentpath/` — sibling project, out of scope.
- `people/` and `shared/` — legacy routing-config-only overlays per CLAUDE.md; NOT deprecated, NOT orphans.
- `archive/` (lowercase, legacy archive dir) — already-organized, left in place per planner.
- `Agent_Memory/` — gitignored but possibly reusable; left in place.
- All git-tracked root files (AGENTS.md, BUG_controller_subagent_spawn_unavailable.md, CHANGELOG.md, CLAUDE.md, LICENSE, README.md, package.json, package-lock.json, .gitignore, .npmignore).
- Version registry — no version bump performed (this is a file-organization cleanup, not a release).

## Session reference

See `cagents-memory/sessions/run_cleanup-folder_260523_002/` for the full audit, work item inventory, coordination log, and cleanup report.
