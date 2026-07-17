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
| `/run` | Single-domain task execution via coordinated agents | "build X", "fix Y", "implement Z". Cross-domain strategic work routes here through `/team` strategic mode; quality review/optimize/audit through `/run review\|optimize\|audit ...` |
| `/team` | Parallel multi-agent execution with wave-gated quality; auto-enables strategic mode for cross-domain requests | "build X in parallel", "complex multi-part Y", "strategic Z", "company-wide W" |
| `/designer` | Interactive design exploration via guided Q&A | "design X", "plan this through" |
| `/helper` | Command guide and skill recommender | "which command", "how do I", "what can cAgents do" |

## Agent Catalog (58 agents across 9 archetypes)

- `developer/` (8) — backend, frontend, fullstack, infrastructure, quality
- `operator/` (7) — support, business-ops, people-ops, marketing-sales, content
- `advisor/` (4) — legal, health, education, personal
- `analyst/` (5) — data, BI, research, social science
- `creator/` (2) — visual artists, audiovisual
- `writer/` (4) — copy, narrative, technical, editorial
- `strategist/` (3) — product owners, portfolio managers, planners
- `core/` (16) — pipeline infrastructure (used by skills, not directly routable)
- `leadership/` (9) — C-suite (used by /team strategic mode, not directly routable)

## How non-CC tools can use this

1. **Cursor / Aider / Windsurf**: Read this file as project context. When user
   intent matches the Skills table, suggest the corresponding `/skill` to
   invoke (assuming the user has Claude Code installed). If Claude Code is
   not present, point them at the Agent Catalog and explain that cAgents'
   coordination patterns require Claude Code's subagent infrastructure.
2. **Gemini-CLI / OpenCode**: Same as above. cAgents agents are SKILL.md
   files in standard frontmatter format — readable but not natively
   executable without Claude Code's hook + state-machine infrastructure.
3. **For deeper integration**: see `docs/MULTI_TOOL_DEPLOYMENT.md` for a
   roadmap on tool-specific deployment paths.

## Conventions

- All agents live under one of 9 archetype roots (no per-domain agent dirs since v11.1.0).
- Skill discovery: `.claude/skills/<name>/SKILL.md` — these are the 4 user-facing entry points.
- Plugin manifest: `.claude-plugin/plugin.json` — registers 58 agents + 4 skills + 24 registered hooks (32 .cjs files total).

## Authoritative References

- `CLAUDE.md` — Project architecture, agent tiers, skill catalog
- `README.md` — User-facing getting-started
- `docs/ARCHITECTURE.md` — Subsystem deep dives
- `.claude/rules/core/skill-format.md` — SKILL.md frontmatter spec
