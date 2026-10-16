---
name: ex-security-allowed-tools-vs-actual
description: "Example: SkillSpector's LP1-4 least-privilege check. Build a capability inventory from what an agent or skill body uses, and compare it with the declared allowed-tools. Flag undeclared use, wildcard grants, no declaration, and over-declaration. Map scoped grants by tool name, and never fix a finding by adding a grant. Load when you audit allowed-tools or write a capability-vs-declaration CI check."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-security-allowed-tools-vs-actual
  category: security
  source_repo: NVIDIA/SkillSpector
  source_url: "https://github.com/NVIDIA/SkillSpector"
  source_commit: 4c52fbb83bbca0dd13f2685453c9b661d8c95bf8
  applies_to:
    - cagents:security-engineer
    - cagents:reviewer
  demonstrates: "Compare declared allowed-tools with the capabilities that the body or code uses (LP1-4), with scoped-grant mapping and fail-safe remediation."
  added: "2026-07-10"
  reviewed: "2026-10-15"
---

# Example: Allowed-Tools vs Actual Capability Use

## Context
The agent validation in cAgents is structural. It checks that a declaration is
present and that the description length is in range. It does not check if the
declaration matches what the body of a SKILL.md, or the `.cjs` code of a hook,
does. A "read-only research" skill that declares `Write Edit Bash`
passes CI today.

**Scope note for cAgents**: Claude Code does not read `allowed-tools` in agent
frontmatter. For files under `agents/`, this check is therefore advisory. For a
skill `SKILL.md`, the harness reads `allowed-tools` as a pre-approval, so the
check protects a real permission there.

## Example

Build a capability inventory from the *content*. Then compare it with the
*declaration*. This is the LP1-4 rule family:

| Rule | Condition | Severity |
|------|-----------|----------|
| **LP1** | the body or code uses a capability that is not in `allowed-tools` | HIGH |
| **LP2** | wildcard grant, such as `tools: *` or `allowed-tools: All tools` | MEDIUM |
| **LP3** | the content has a detectable capability, but no tool declaration exists | MEDIUM |
| **LP4** | a tool is declared but never used, which is over-declaration | LOW |

Capability signals to search for:

```
Bash and shell      : "run", "execute", `child_process`, `os.system`, backtick commands
network             : `fetch`, `curl`, `WebFetch`, `requests.get`
file_write          : `fs.writeFile`, "create the file", Write or Edit prose
credential env read : `process.env`, `os.environ`, "read the API key"
```

**Scoped grants**: map a grant by the tool name before the first `(`. Thus
`Bash(git:*)` counts as a Bash grant for LP1. If you look up the whole string, a
scoped grant maps to nothing. The narrow grant then gets a false LP1 HIGH, while
a broad bare `Bash` grant passes.

Worked LP1 finding:

```
Skill: research-helper
Declared allowed-tools: Read Grep Glob
Body line 22: "then run `npm run migrate` to apply the change"   -> uses Bash (undeclared)
Finding: LP1 (HIGH). The body tells the agent to run a shell command, but Bash is not declared.
Fix: Confirm that this skill needs the shell capability.
     If it does not, remove the instruction or delegate the migration to an execution agent.
     If it does, add the narrowest scoped grant, such as Bash(npm run migrate:*), and record why.
```

**Fail-safe remediation rule**: do not write "add the tool to allowed-tools" as
the default fix. That text broadens a pre-approval only to silence the check.
Lead with "review if the capability is required". A grant is the last option,
and it must be the narrowest scoped form.

## Why it matters
A declared-vs-used check can extend `validate-agents.sh`. It catches a skill or an
agent whose stated scope contradicts its granted tools. It also pairs with the
tool check of the Standalone Contract. The scoped-grant rule and the fail-safe
rule keep the check free of false positives from day one.

Distilled from NVIDIA/SkillSpector
`src/skillspector/nodes/analyzers/mcp_least_privilege.py` (LP1-4).
Upstream license: Apache-2.0. The text is a paraphrase, and it copies no upstream code.
