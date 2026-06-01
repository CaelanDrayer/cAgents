# /helper Scoring Engine

Detailed weighted multi-signal scoring logic for natural-language recommendation (Mode 3).

## Weighted Multi-Signal Scoring

Instead of pure keyword matching, use 5 weighted signals to score each candidate command. Recommend the command with the highest total score.

| Signal | Weight | How to Check |
|--------|--------|--------------|
| Keyword match | 0.30 | Count matching keywords from the intent classification table. The command whose keyword set has the most matches gets the full 0.30; others get proportional fractions. |
| Project context | 0.30 | Read project files to infer domain and scope (see checks below). |
| Complexity estimate | 0.20 | Estimate scope from the request: single file or narrow fix favors `/run`; multi-component or cross-cutting favors `/team`; multi-domain favors `/team --strategic` (v12.2.0+; pre-v12.2.0 multi-domain favored the now-removed `/org`). |
| Explicit intent | 0.10 | If the user directly references a command ("use /run", "I want to review"), give that command the full 0.10. |
| Request history | 0.10 | If the user recently mentioned planning or design in the same session, boost `/designer`. If they mentioned review or audit, boost `/run` (via the `review` or `audit` keyword router). |

## Project Context Checks (for the 0.30 project signal)

1. `package.json` exists -- engineering domain hint -- boost `/run` (covers review/optimize/improve via the keyword router on the first request token)
2. File count in target path (if a path is mentioned) -- if >20 files mentioned or implied, boost `/team`; if <5, boost `/run`
3. Current git branch name (run `git branch --show-current`):
   - `feature/*`, `feat/*` branches -- boost `/run` (building something)
   - `main`, `master`, `release/*` -- boost `/run review` (diff-aware review hint via keyword router)
   - `fix/*`, `hotfix/*`, `bugfix/*` -- boost `/run Fix...` or `/run --mode debug`
4. `CLAUDE.md` or `.claude/` directory exists -- cAgents-aware project -- all commands available
5. Recent session context -- if user previously asked about design or planning, boost `/designer`

## Applying the Scoring

For each candidate command, walk through the 5 signals and assign a partial score (0.0 to the signal's max weight). Sum the partial scores. The command with the highest total wins. If two commands are within 0.05 of each other, the intent is genuinely ambiguous -- present both options and ask the user to clarify.

Always check for multi-command workflows (e.g., "plan then build" suggests `/designer` then `/run`). When a pipeline is detected, recommend the first command and mention the follow-up.
