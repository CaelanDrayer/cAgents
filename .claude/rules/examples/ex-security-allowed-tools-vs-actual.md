---
name: ex-security-allowed-tools-vs-actual
description: "Example: SkillSpector's LP1-4 least-privilege check — build a capability inventory from what an agent's body/code actually uses and diff it against the declared allowed-tools, flagging undeclared use, wildcard grants, no declaration, and over-declaration. Load when auditing an agent's allowed-tools or writing a capability-vs-declaration CI check."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-security-allowed-tools-vs-actual
  category: security
  source_repo: NVIDIA/SkillSpector
  source_url: "https://github.com/NVIDIA/SkillSpector"
  applies_to:
    - cagents:security-engineer
    - cagents:reviewer
  demonstrates: "Diff declared allowed-tools against capabilities the body/code actually uses (LP1-4: undeclared use, wildcard, no-decl, over-decl)."
  added: "2026-07-10"
---

# Example: Allowed-Tools vs Actual Capability Use

## Context
cAgents' agent validation is 100% structural — it checks that `allowed-tools` is
*present* and that description length is in range, but never checks whether the
declaration *matches* what the agent's SKILL.md body (or a hook's `.cjs`) actually
does. An agent that says "read-only research" but declares `Write Edit Bash` sails
through CI today.

## Example

Build a capability inventory from the *content*, then diff it against the *declaration*
(the LP1-4 rule family):

| Rule | Condition | Severity |
|------|-----------|----------|
| **LP1** | body/code uses a capability NOT in `allowed-tools` | HIGH |
| **LP2** | wildcard grant (`tools: *` / `allowed-tools: All tools`) | MEDIUM |
| **LP3** | a detectable capability but NO tool declaration at all | MEDIUM |
| **LP4** | declared but never used (over-declaration) | LOW |

Capability signals to grep for (map prose/code -> capability):

```
Bash / shell        : "run", "execute", `child_process`, `os.system`, backtick cmds
network             : `fetch`, `curl`, `WebFetch`, `requests.get`
file_write          : `fs.writeFile`, "create the file", Write/Edit prose
credential/env read : `process.env`, `os.environ`, "read the API key"
```

Worked LP1 finding:

```
Agent: research-helper
Declared allowed-tools: Read Grep Glob
Body line 22: "then run `npm run migrate` to apply the change"   -> uses Bash (undeclared)
Finding: LP1 (HIGH) — body instructs a shell command but Bash is not declared.
Fix: add Bash to allowed-tools, OR rewrite to delegate the migration to an execution agent.
```

## Why it matters
The single most mechanically-portable security idea for cAgents' validator: a
declared-vs-used check extends `validate-agents.sh` to catch agents whose stated scope
contradicts their granted tools (and pairs with the Standalone Contract's existing
`mcp__*` grep). Distilled from NVIDIA/SkillSpector `mcp_least_privilege.py` (LP1-4).
