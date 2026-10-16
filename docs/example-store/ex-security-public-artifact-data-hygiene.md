---
name: ex-security-public-artifact-data-hygiene
description: "Example: three rules for any deliverable that leaves the user's boundary. Inspect with a deny-list, keep secrets and real PII out of every output, and leave publish or auth actions to the user. Load when a work item produces a public post, a shared doc, a demo, or any artifact other people will see."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-security-public-artifact-data-hygiene
  category: security
  source_repo: latent-spaces/brag
  source_url: "https://github.com/latent-spaces/brag"
  source_commit: "069432cac935ed1895859df201c31436c07fb74e"
  reviewed: "2026-10-15"
  applies_to:
    - cagents:security-engineer
    - cagents:hitl
    - cagents:general-counsel
  demonstrates: "Public-artifact data hygiene: deny-list inspection, no secrets or real PII in any output (fictional stand-ins disclosed), and no hard-to-reverse outward action in the run; apply the same rules to every mode variant."
  added: "2026-10-15"
allowed-tools: Read Grep Glob
---

# Example: Public-Artifact Data Hygiene

## Context
Some work items produce an artifact that leaves the user's boundary. Examples
are a launch post, a demo video script, a shared report, a case study, and a
public README. The store has security exemplars for the tools that an agent
declares and for trigger abuse. They do not cover data that leaks out
through the deliverable itself. Use this pattern when the planner marks a
work item as public-facing, or when a reviewer finds an outward-bound artifact.

## Example

Apply three rules. Each rule covers a different stage of the work.

**Rule A: inspect with a deny-list.** Before the agent reads the source
material, it skips these paths. It does not read them and then filter.

```
Never read during inspection:
  .env, .env.*                      env and secret files
  *.pem, *.key, id_rsa*             key material
  secrets/, credentials/            credential directories
  service-account JSON, token config files
  files that .gitignore excludes because they hold secrets
```

A file that the agent does not read cannot leak into a later step.

**Rule B: nothing private reaches any output.** Keep secrets, API keys, tokens,
internal hostnames, internal URLs, real customer names, email addresses, and other
personal data out of every output. That covers the plan, the draft, the final
artifact, and the share text. If the real material shows such data (for example, a screenshot of a
live dashboard), the agent uses fictional stand-ins that look real. The agent then
states the substitution in the plan, so the user knows what changed.

```yaml
data_hygiene:
  public_facing: true
  substitutions:
    - original: "customer names in the orders table"
      stand_in: "fictional names (Ada Park, Leo Ruiz)"
      disclosed_in: outputs/plan.md
  secrets_found_in_output: 0
```

**Rule C: leave the outward action to the user.** The run builds the artifact
locally. It does not publish, post, send, upload, or log in to an external
service. Those actions are hard to reverse and act in the user's name. The final
report names the next step and leaves it to the user.

```
Done: outputs/launch-post.md (local draft, not posted).
Next step for you: review the draft, then post it from your own account.
```

Rule C maps to the cAgents "ASK USER" boundary. An outward action needs an
explicit request from the user. If there is no such request, stop and ask the
user. The action never runs as an auto-proceed step.

**Parity across variants.** When an agent or skill has more than one mode or
variant, each variant must carry all three rules. The upstream repo shows the
failure case. It added the secrets rule to its full variant first. Its slim
variant lacked the same rule for about three weeks. A reviewer checks every
variant, not only the one that the change touched.

## Why it matters
cAgents serves marketing, sales, HR, legal, and creative work. In those domains
other people see most deliverables. Rule A and Rule B give
the security engineer and general counsel a concrete check for data that leaks
through a deliverable. Rule C gives the HITL agent a clear line between local
work and acts in the user's name. Distilled from latent-spaces/brag
`skills/brag/references/step-1-inspect.md` (rule "nothing secret leaves this
step"), `skills/brag-slim/SKILL.md`, and `step-3-compose.md` (keep rendering
local) (MIT).
