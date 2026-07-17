---
name: ex-minimalism-surgical-diff-vs-refactor
description: "Example: a minimal bug-fix diff vs a drive-by refactor that 'improves' unrelated code — the scope-discipline rule that every changed line must trace directly to an acceptance criterion. Load when reviewing a diff for scope creep or fixing a narrowly-scoped bug."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-minimalism-surgical-diff-vs-refactor
  category: minimalism
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  applies_to:
    - cagents:backend-developer
    - cagents:reviewer
    - cagents:qa-lead
  demonstrates: "A minimal bug-fix diff vs a drive-by refactor; every changed line must trace to an acceptance criterion."
  added: "2026-07-10"
---

# Example: Surgical Diff vs Drive-By Refactor

## Context
cAgents' Stage-1 spec-compliance review implicitly checks scope, but nothing
illustrates the specific failure of touching code *beyond* the acceptance criteria.
The work item: "WI-3: fix off-by-one so the last page of results is not dropped."

## Example

Before — the fix, plus unrequested "improvements" (scope creep):

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

**Problems:** the type check, the rename, and `paginate_v2` trace to no acceptance
criterion. They enlarge the blast radius and the review surface for a one-line bug.

After — surgical: only the lines the criterion requires:

```diff
 def paginate(items, page, size):
-    end = page * size
+    end = min((page + 1) * size, len(items))
     return items[page * size:end]
```

Test: **every changed line should trace directly to the user's request.** If a line
doesn't map to an acceptance criterion, it does not belong in this diff — file it as a
separate work item.

## Why it matters
A worked counterexample for a "scope-creep" finding category in Stage-2 review and for
`code-reviewer`/`qa-lead` training: flag diff lines that don't trace to a criterion.
Distilled from multica-ai/andrej-karpathy-skills `EXAMPLES.md` (Drive-by Refactoring /
Style Drift).
