---
name: fixture-status-hook
archetype: developer
---

# Status Transitions

**MANDATORY**: Update status.yaml after EVERY state transition. The verify-completion.cjs hook (and post-compact-restore.cjs after compaction) reads pipeline_state from status.yaml. Skipping this update breaks hook-based session detection.

Every state transition must be durable before the next one begins.
