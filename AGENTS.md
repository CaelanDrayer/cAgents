# cAgents Multi-Tool Routing Guide

This file documents how non-Claude-Code agentic tools (Cursor, Aider, Windsurf,
Gemini-CLI, OpenCode, etc.) can route to cAgents skills. cAgents is built as a
Claude Code plugin (see CLAUDE.md), but its specialized-agent catalog and skill
workflows are tool-agnostic — this file provides the mapping for other agents
to find and invoke them.

**Authoritative source**: see CLAUDE.md for the canonical plugin architecture.
This file is a discoverability surface, not a behavioral contract.

## Skills → Intent Mapping

| Skill | Intent | When non-CC tools should suggest |
|-------|--------|----------------------------------|
| `/run` | Single-domain task execution via coordinated agents | "build X", "fix Y", "implement Z" |
| `/team` | Parallel multi-agent execution with wave-gated quality | "build X in parallel", "complex multi-part Y" |
| `/org` | Cross-domain C-suite strategic coordination | "strategic Z", "company-wide W" |
| `/designer` | Interactive design exploration via guided Q&A | "design X", "plan this through" |
| `/improve` | Quality improvement (review/optimize/audit) | "review X", "audit Y", "optimize Z" |
| `/helper` | Command guide and skill recommender | "which command", "how do I", "what can cAgents do" |

## Agent Catalog (238 agents across 9 archetypes)

- `developer/` (30) — backend, frontend, fullstack, infrastructure, quality
- `operator/` (74) — support, business-ops, people-ops, marketing-sales, content
- `advisor/` (30) — legal, health, education, personal
- `analyst/` (31) — data, BI, research, social science
- `creator/` (11) — visual artists, designers, audiovisual
- `writer/` (26) — copy, narrative, technical, editorial
- `strategist/` (9) — product owners, portfolio managers, planners
- `core/` (15) — pipeline infrastructure (used by skills, not directly routable)
- `leadership/` (12) — C-suite (used by /org, not directly routable)

## How non-CC tools can use this

1. **Cursor / Aider / Windsurf**: Read this file as project context. When user
   intent matches the Skills table, suggest the corresponding `/skill` to
   invoke (assuming the user has Claude Code installed). If Claude Code is
   not present, point them at the Agent Catalog and explain that cAgents'
   coordination patterns require Claude Code's subagent infrastructure.
2. **Gemini-CLI / OpenCode**: Same as above. cAgents agents are SKILL.md
   files in standard frontmatter format — readable but not natively
   executable without Claude Code's hook + state-machine infrastructure.
3. **For deeper integration**: see `docs/MULTI_TOOL_DEPLOYMENT.md` (planned
   for REC-8) for a roadmap on tool-specific deployment paths.

## Conventions

- All agents live under one of 9 archetype roots (no per-domain agent dirs since v11.1.0).
- Skill discovery: `.claude/skills/<name>/SKILL.md` — these are the 6 user-facing entry points.
- Plugin manifest: `.claude-plugin/plugin.json` — registers all 238 agents + 6 skills + 27 hooks.

## Authoritative References

- `CLAUDE.md` — Project architecture, agent tiers, skill catalog
- `README.md` — User-facing getting-started
- `docs/ARCHITECTURE.md` — Subsystem deep dives
- `.claude/rules/core/skill-format.md` — SKILL.md frontmatter spec
