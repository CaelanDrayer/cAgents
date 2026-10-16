---
name: ex-verification-completed-is-not-done
description: "Example: treat a child agent's 'completed' status as a claim, not as proof. Before you close a wave or a round, make sure that each output exists and was written in this run, that each branch has 0 unmerged commits, and that one shared brief steers all children. Load when you run a /team wave gate, merge worktree branches, or track delivery of parallel work."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-completed-is-not-done
  category: verification
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  source_commit: ca069e12239a2c8d13887ac9f983557d00bdcfd2
  applies_to:
    - cagents:team-lead
    - cagents:execution-monitor
    - cagents:operations-manager
  demonstrates: "A child's completed status is a claim: verify that the outputs exist and are fresh, and that every branch has 0 unmerged commits, before you close a wave."
  added: "2026-10-15"
  reviewed: "2026-10-15"
---

# Example: "Completed" Is Not "Done"

## Context
A `/team` wave closes when each child reports that it is complete. A status field
or a summary is the child's own account. A child can report `completed` after it
wrote nothing, after it wrote to the wrong path, or while it still has commits
that nobody merged. The same fault occurs in any delivery tracker. A task marked
"done" with no deliverable is not done.

## Example

Before you close a wave or an integration round, do these checks. Do not read the
summary of a child for its content. Read the files.

| Check | Pass condition |
|-------|----------------|
| Output exists | each output path in the brief is on disk |
| Output is fresh | the file was written after the wave started, not left from an earlier run |
| Work is committed | a child that edits a branch has 1 or more commits on that branch |
| Nothing is left behind | `git rev-list --count <integration>..<branch>` is 0 for every branch |
| Full check on the merged result | the guard runs once on the integrated tree, not only per branch |

If a child reports `completed` but its output is missing, or its branch has 0
commits, it has not finished. Look for its work on another path or branch. If you
cannot find it, dispatch the work again.

Run the `rev-list` check after the last merge, not before it. A child can commit
again after you merged its tip. Without this check, those commits stay on the
branch and nobody sees them.

**One shared brief**: write one brief file that every child reads, plus one task
file for each child. If the children drift, correct the brief once. Each child
that you dispatch again then gets the correction. This is the role of
`spawn_brief.md` in a cAgents `/team` session.

**One test runner**: run one guard process at a time, behind a lock. If a test
fails, run it again on a clean checkout of the base branch. If it fails there
too, the fault was there before the change.

Worked gate record:

```yaml
wave: 3
children: 4
checks:
  - child: WI-101
    status_reported: completed
    outputs_exist: true
    fresh: true
  - child: WI-102
    status_reported: completed
    outputs_exist: false     # summary named a file that is not on disk
    action: redispatch
  - child: WI-103
    status_reported: completed
    branch: wi-103
    unmerged_commits: 3      # committed after the merge
    action: merge again, then check again
verdict: REVISE   # 2 of 4 children reported completed but were not done
```

For a project outside code, use the same table with other evidence. A launch task
is done when the asset is live at the stated link. A hiring task is done
when the signed offer is in the record system. The status field is not the
evidence.

## Why it matters
cAgents wave gates and the execution-monitor read status fields and summaries
from children. This pattern makes the gate check the artifacts and the branch
state. A child that reports early, or a commit after the merge, then cannot pass
the gate.

Distilled from NousResearch/hermes-agent
`optional-skills/autonomous-ai-agents/dynamic-workflow/SKILL.md`, in the section
on the campaign shape and its verification list. The text is a paraphrase.
