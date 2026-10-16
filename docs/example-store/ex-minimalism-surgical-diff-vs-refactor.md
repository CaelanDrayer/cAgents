---
name: ex-minimalism-surgical-diff-vs-refactor
description: "Example: a minimal bug-fix diff vs a drive-by refactor that 'improves' unrelated code. The scope rule: every changed line must trace directly to an acceptance criterion. Load when you review a diff for scope creep or fix a narrow bug."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-minimalism-surgical-diff-vs-refactor
  category: minimalism
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  source_commit: 2c606141936f1eeef17fa3043a72095b4765b9c2
  reviewed: "2026-10-15"
  applies_to:
    - cagents:backend-developer
    - cagents:reviewer
    - cagents:qa-lead
  demonstrates: "A minimal bug-fix diff vs a drive-by refactor; every changed line must trace to an acceptance criterion."
  added: "2026-07-10"
---

# Example: Surgical Diff vs Drive-By Refactor

## Context
cAgents' Stage-1 spec-compliance review checks scope implicitly. No example
shows the failure where an agent changes code beyond the acceptance criteria.
The work item: "WI-3: fix off-by-one so the last page of results is not dropped."

## Example

Before. The fix, plus "improvements" that nobody asked for (scope creep):

```diff
 def paginate(items, page, size):
-    end = page * size
+    end = min((page + 1) * size, len(items))   # the actual fix
-    return items[page * size:end]
+    # refactor: rename for clarity + add validation while we're here
+    start_index = page * size
+    if not isinstance(page, int):               # unrelated
+        raise TypeError("page must be int")      # unrelated
+    return items[start_index:end]
+
+def paginate_v2(items, page, size):              # unrelated speculative helper
+    """Improved paginator with docstring."""
+    ...
```

**Problems:** the type check, the rename, and `paginate_v2` trace to no
acceptance criterion. They make the blast radius and the review surface larger
for a one-line bug.

After. Surgical: only the lines that the criterion needs.

```diff
 def paginate(items, page, size):
-    end = page * size
+    end = min((page + 1) * size, len(items))
     return items[page * size:end]
```

Test: **every changed line must trace directly to the request.** If a line does
not map to an acceptance criterion, it does not belong in this diff. Put it in a
separate work item.

## Why it matters
This is a worked counterexample for a "scope creep" finding category in Stage-2
review, and for `reviewer` and `qa-lead` training. Flag each diff line that does
not trace to a criterion. Distilled from multica-ai/andrej-karpathy-skills
`EXAMPLES.md` (section 3, Drive-by Refactoring and Style Drift). The trace test
comes from `CLAUDE.md` section 3.
