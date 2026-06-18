# cAgents — Multi-Tool Deployment Design Note

**Status**: Design note, NOT implementation. No code in this PR. Captures architectural decision rationale BEFORE any `scripts/convert.sh` is built.

**Scope**: Should cAgents extend beyond Claude Code into Cursor, Windsurf, Aider, Gemini-CLI, OpenCode, and other agentic tools?

**Decision (recommended)**: DEFER. See § Recommendation below.

---

## Why this question now

Three out of six newly-cloned external-skill repos in May 2026 (msitarzewski/agency-agents, Imbad0202/academic-research-skills, mattpocock/skills) ship multi-tool deployment. The pattern is no longer experimental — it's becoming an expectation for community-distributed agent collections. cAgents must take an explicit position before user-pressure forces a reactive decision.

---

## What a hypothetical `scripts/convert.sh` would emit

Reference: `example/external-skills/msitarzewski__agency-agents/scripts/convert.sh` produces 11 tool-specific outputs from one source.

For cAgents' 141 agents + 4 skills (post-v12.7.0 LP-12 + LP-13 consolidation; post-v12.2.0 `/org` removal), a hypothetical converter would produce:

| Target Tool | Output Format | Round-Trip Quality |
|-------------|---------------|---------------------|
| Cursor | `.cursor/rules/{agent}.mdc` (per-agent) | HIGH for execution agents, LOW for controllers (no subagent spawning) |
| Windsurf | `.windsurfrules` (single concatenated file) | MEDIUM — flat rules, no agent composition |
| Aider | `CONVENTIONS.md` (single file, per-language sections) | LOW — Aider's prompt-based agent model differs sharply |
| Gemini-CLI | `gemini-extensions.json` + per-skill TS files | MEDIUM — extension mechanism is rich but lacks hooks |
| OpenCode | per-agent system prompts in `~/.opencode/agents/` | HIGH for execution agents |
| Continue.dev | `config.json` slash-command definitions | LOW — Continue's model is command-as-prompt, not agent-as-state-machine |

---

## Which cAgents agents round-trip cleanly

### Round-trip cleanly (~95 of 144 agents)

- **Execution agents (tier 3)**: tier-3 specialists like `backend-developer`, `copywriter`, `qa-tester` have well-bounded scopes and prompt-like behaviors that translate naturally to most target tools.
- **Most operator agents**: support/content/business-ops agents — single-task focus translates.
- **Most writer + creator agents**: copywriter, technical-writer, narrative-director — pure prompt translation.

### Lose semantics in translation (~49 of 144 agents)

- **Controllers (tier 2)** — `tech-lead`, `architect`, `marketing-strategist`, `narrative-director`: their value is question-based delegation + synthesis across multiple specialists. Target tools without subagent-spawning collapse them into single-pass prompts that lose the coordination value.
- **Core pipeline (15)** — `orchestrator`, `planner`, `validator`: tightly coupled to cAgents' 5-state machine + hook system. Untranslatable without a state-machine substrate in the target tool.
- **Leadership (12)** — C-suite agents used by `/team` strategic mode (auto-enabled when `router.domain_count >= 2`; v12.2.0+, replaces the removed `/org` skill): same coordination dependency as controllers.

---

## Maintenance cost estimate

Per supported tool, ongoing cost:

- **Initial converter build**: ~3-5 days (one-time)
- **Per-release maintenance**: ~30 min × (cAgents minor bumps per year)
- **Per-target-tool spec drift**: ~1-2 hours/quarter (tools evolve their rule formats)
- **User support**: ~1 hour/week per target tool once published (issue triage, version mismatches)

For 5 target tools, baseline overhead is ~10-15 hours/week steady-state. cAgents' current maintenance is dominated by Claude Code platform evolution; adding 5 target tools roughly doubles the maintenance surface.

---

## Strategic alternatives

1. **Build it now**: Ship `scripts/convert.sh` covering 3-5 tools. Pro: discoverability + market positioning. Con: doubles maintenance burden; collapses controller semantics in most targets.

2. **Defer + observe**: Document the position (this doc + `AGENTS.md`). Track user requests for specific target tools. Build a converter when a single tool's demand justifies dedicated maintenance investment. **Recommended.**

3. **Delegate to community fork**: Let a third party build the converter on top of cAgents' stable archetype schema. cAgents stays Claude-Code-first; the fork serves multi-tool users. Pro: zero maintenance burden. Con: fork quality is out of cAgents' control; users may blame cAgents for fork issues.

4. **Tool-specific sister repos**: Ship `cAgents-Cursor`, `cAgents-Aider` as standalone repos with curated subsets of agents that round-trip cleanly. Pro: explicit per-tool scope. Con: 5x repo maintenance surface; duplicates documentation.

---

## Recommendation: DEFER (Option 2)

- **AGENTS.md** (shipped v12.0.1) already gives non-CC users a discoverability surface — they can read the catalog and route via their tool's existing mechanisms.
- **No specific user demand has surfaced** (as of 2026-05-20) for any specific target-tool converter.
- **Maintenance cost is the binding constraint**: cAgents' competitive advantage is depth (141 agents + state-machine pipeline + reviewer loops), not breadth across tools.
- **Reversible decision**: if a specific tool's demand emerges (5+ user requests, 100+ stars on a community fork, a partner integration request), revisit. The converter is ~3-5 days to build.

## Trigger conditions to revisit this decision

Revisit this decision if ANY of the following occurs:

1. A user community fork ships a >50% complete converter for any single target tool.
2. ≥5 explicit user requests for the same target tool within a 90-day window.
3. A platform-level shift (e.g., Anthropic publishes a multi-tool agent-skills spec) makes converters trivial.
4. cAgents' Claude Code dependency becomes a deployment friction point for a paying user.

---

## See also

- `AGENTS.md` — current multi-tool discoverability surface
- `docs/12-FACTOR-COMPLIANCE.md` — Factor 11 "Trigger from Anywhere" position
- `CLAUDE.md` — canonical project architecture
- Upstream patterns: `example/external-skills/msitarzewski__agency-agents/scripts/convert.sh`
