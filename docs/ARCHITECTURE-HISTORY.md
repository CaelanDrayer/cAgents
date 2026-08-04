# cAgents Architecture — History, Provenance & Extended Narrative

Content moved out of `CLAUDE.md` in v12.58.0 (REC-33) to keep the always-loaded
project-memory file lean (<400 lines). `CLAUDE.md` keeps the load-bearing
contracts and disk-derived counts inline and points here for the historical /
provenance / extended-narrative material below.

## Table of Contents
- [Standalone Contract — user guidance + history](#standalone-contract--user-guidance--history)
- [Performance Benchmarks (measured vs estimate)](#performance-benchmarks-measured-vs-estimate)
- [Plugin Architecture — features & manifest detail](#plugin-architecture--features--manifest-detail)

---

## Standalone Contract — user guidance + history

The **rules** of the Standalone Contract (the load-bearing part) stay in
`CLAUDE.md § Standalone Contract`. This section carries the user-facing guidance
and the historical record.

### What this means for users

Users CAN configure their own MCP servers in their personal `~/.claude/settings.json`
or project `.mcp.json` — Claude Code supports MCP independently of cAgents. cAgents
agents simply won't have those tools in their declared `allowed-tools`, so they won't
call MCP tools. If a user wants MCP-aware agents, they fork the plugin or override
specific agents in their own setup. cAgents the upstream plugin stays standalone.

### History

V11.1.12 introduced an "MCP consumer pattern (Stage 1)" that violated this contract by
adding `mcp__*` declarations to 10 agents and an `mcpServers` catalog to `plugin.json`.
V11.1.14 removed the catalog after Claude Code's plugin validator rejected the
descriptive shape (`mcpServers: Invalid input`). V11.1.15 fixed the same issue in
`.mcp.json`. V11.2.0 reverts the consumer-pattern entirely and codifies this contract,
because the standalone promise is more valuable than the optional integration was.

---

## Performance Benchmarks (measured vs estimate)

There are TWO classes of figures here, and they must never be conflated. `CLAUDE.md`
keeps only a 3-line pointer to this section; the full tables + provenance live here.

- **MEASURED (reproducible artifact)** — produced by the perf-corpus runner at
  `cagents-memory/_system/evals/perf/perf-corpus-runner.cjs`, which emits a
  machine-readable artifact (`perf-corpus-results.json`) with full provenance
  (node version, OS, ISO timestamp) and a reproduce command per number. The
  hook-perf BEFORE baseline is committed-on-disk at
  `cagents-memory/_system/evals/perf/hook-perf-before.json` (WI-3 microbench,
  `scripts/benchmarks/hook-perf-microbench.cjs`). See
  `cagents-memory/_system/evals/perf/README.md` for the manifest. (Note:
  `cagents-memory/` is git-ignored runtime state, but the runner regenerates
  these artifacts deterministically on demand, so the paths are reproducible.)
- **ESTIMATE (no benchmark artifact)** — design-target aspirations with no
  artifact, methodology, or measurement-date provenance. Treat as targets, NOT
  validated engineering data. Do NOT cite them as measured.

### Measured (reproducible artifact)

| Metric | Measured value | Artifact + reproduce |
|--------|----------------|----------------------|
| **Hook overhead per Write\|Edit** (BEFORE / un-consolidated) | ≈ 6406 ms median across 3 cold-start hooks; `cold_starts_per_write_edit = 3` (secret-detection ≈131 ms, controller-delegation-validator ≈3137 ms, skill-size-monitor ≈3138 ms; the 2 slow hooks linger on an un-unref'd 3 s timer) | `cagents-memory/_system/evals/perf/hook-perf-before.json` · `node scripts/benchmarks/hook-perf-microbench.cjs --scenario before` |
| **Secret-scan time vs file size** (`scanForSecrets`, 30 iters, in-process `hrtime`) | 10KB ≈0.15 ms · 100KB ≈1.45 ms · 600KB ≈2.06 ms (600KB > 512KB cap ⇒ windowed head+tail scan) | `cagents-memory/_system/evals/perf/perf-corpus-results.json` · `node cagents-memory/_system/evals/perf/perf-corpus-runner.cjs` |

> These two rows are MEASURED with the reproducible artifacts above. The exact
> ms figures are machine-dependent (the committed baseline: node v20.19.2, linux,
> 16-core Xeon E5-2643 v4) — re-run the commands to reproduce on your hardware.

### Estimate (no benchmark artifact — aspirational targets, NOT measured)

| Feature | Target (estimate — no benchmark artifact) |
|---------|-------------------------------------------|
| **Aggressive Decomposition** | 30+ work items from simple request — estimate, unmeasured |
| **Controller Pattern** | 30-40% simpler planning, 20-30% fewer tokens — estimate, unmeasured |
| **Parallel Execution** | 50x speedup (swarm), 80%+ efficiency — estimate, unmeasured |
| **Task Inventory** | 60-80% context savings for 20+ task workflows — estimate, unmeasured |
| **Team Mode** | 40-60% execution time reduction for tier 3+ — estimate, unmeasured |

> **Caveat (estimate rows only)**: The five figures above are design-target
> ESTIMATES with NO benchmark artifact, methodology, or provenance — NOT validated
> engineering data, and must NOT be presented as measured.

See `docs/OPTIMIZATION_PROGRESS.md` for detailed tracking and
`cagents-memory/_system/evals/perf/README.md` for the measured-artifact manifest.

---

## Plugin Architecture — features & manifest detail

cAgents is distributed as a Claude Code plugin. `CLAUDE.md` keeps the one-line
manifest pointer; the extended feature list lives here.

**Plugin Structure**:
```
.claude-plugin/
├── plugin.json          # Root manifest (agents, skills, hooks, version)
└── marketplace.json     # Marketplace listing metadata
```

**Key Manifest Fields**:
- `agents`: Array of SKILL.md paths (60 agents registered)
- `skills`: Path to skills directory (`.claude/skills/`)
- `hooks`: Path to settings.json for hook registration
- `settings.json`: Default settings applied when plugin loads (under `agent` key for subagent defaults)

**Plugin Features** (Claude Code):
- **LSP Servers**: Plugins can provide language servers via `.lsp.json` for IDE-like features
- **Default Settings**: `settings.json` in plugin root applies defaults; `agent` key configures subagent behavior
- **Hook Registration**: Hooks declared in `hooks/hooks.json` or referenced via `hooks` field in plugin.json
- **Marketplace**: Submit via `marketplace.json` with `$schema`, owner, category, and version fields
- **Multi-Plugin**: Multiple plugins loaded via `--plugin-dir` flags; settings merge with project settings
- **Worktree Sparse Checkout**: `.claude/settings.json` declares `worktree.sparsePaths` (7 entries — `.claude/`, `.claude-plugin/`, `cagents-memory/_system/`, `agents/`, `scripts/`, `tests/`, `docs/`). `core/` and all 9 archetype roots live under `agents/`, so a single `agents/` entry covers them. When `/team` teammates spawn with `isolation: "worktree"`, only these paths populate the worktree, dramatically reducing checkout time and preventing teammates from modifying out-of-scope files. `.claude-plugin/` was added in v12.62.2 — hooks running inside a worktree-isolated subagent (e.g. `session-init-gate.cjs`) read `.claude-plugin/plugin.json` as their agent-registry source of truth, and its prior absence from the sparse checkout made every `cagents:*` spawn misread as "not a registered agent."
