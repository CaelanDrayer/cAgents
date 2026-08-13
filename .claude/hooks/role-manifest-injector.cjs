#!/usr/bin/env node
/**
 * Role Manifest Injector Hook - per-role rules pointer + memory-layout stanza
 * cAgents WO-03 surface (d) — session team_load-cut-program_260804_001
 *
 * WHY THIS EXISTS
 * ---------------
 * Surfaces (a)(b)(c) of WO-03 narrow the unconditionally-loaded `.claude/rules/**`
 * context (CLAUDE.md @-imports + `paths:` predicates) so a spawned agent no longer
 * eats every rule file on every spawn. Hooks can only ADD context, never un-load
 * it — so this hook is the RESTORATION half of that cut: on SubagentStart it hands
 * the spawned role a compact POINTER to the rules that matter for that role (an L1
 * index it can `Read` on demand), plus the memory-layout stanza that every role
 * needs in order to write session artifacts at all.
 *
 * STRUCTURAL GUARANTEE (the acceptance criterion)
 * ----------------------------------------------
 * `MEMORY_LAYOUT_STANZA` is defined EXACTLY ONCE and is never copied into a role
 * bundle. `ROLE_POINTERS` values are pointer-only text. `buildRoleBundle()` is the
 * SINGLE place a bundle is assembled, and it unconditionally concatenates the
 * stanza onto whichever pointer was selected (including the fallback). A future
 * contributor who adds a new key to `ROLE_POINTERS` gets the stanza automatically,
 * without knowing it exists — omission is structurally impossible, not merely
 * tested against. The handler NEVER emits a bundle by any other route.
 *
 * FAIL-OPEN
 * ---------
 * This hook is purely additive. `createHook()` already converts a throw into
 * `{"continue": true}`, and the handler additionally wraps its own body so a
 * defect here can never block or fail an agent spawn. SubagentStart cannot block
 * in any case (see .claude/rules/core/hooks.md § Exit Codes).
 *
 * Input (stdin): SubagentStart JSON payload (agent_type / subagent_type /
 *                tool_input.subagent_type / description)
 * Output (stdout): { hookSpecificOutput: { hookEventName: 'SubagentStart',
 *                                          additionalContext: <role bundle> } }
 */

const { createHook } = require('./hook-utils.cjs');

// ---------------------------------------------------------------------------
// The memory-layout stanza. Defined ONCE. Never inlined into a role pointer.
// Source of truth: .claude/rules/memory/agent-memory.md and
// .claude/rules/memory/agent-memory-reference.md — this is a faithful digest of
// those two files, not an invention. No role bundle previously admitted them, so
// after the (a)(b)(c) cut an agent would be asked to write session artifacts into
// cagents-memory/ with no description of the layout. This stanza is that map.
// ---------------------------------------------------------------------------
const MEMORY_LAYOUT_STANZA = `
### cAgents memory layout (write your artifacts here)

Runtime state lives under \`cagents-memory/\` at the project root. It is
git-ignored — nothing you write there enters version control.

\`\`\`
cagents-memory/
  _system/      # configs, commands/, domains/, metrics/, evals/, templates/
  _knowledge/   # semantic/, procedural/, calibration/, analytics/ (cross-session learnings)
  _archive/     # completed sessions
  sessions/     # live sessions: act_*, team_*, designer_* (run_*, org_*, review_*, optimize_* are legacy)
\`\`\`

**Session ID format**: \`{command}_{slug}_{YYMMDD}_{NNN}\`
(e.g. \`act_fix-auth_260317_001\`, \`team_oauth-rollout_260804_002\`).

**Session folder shape** — \`cagents-memory/sessions/{session_id}/\`:

\`\`\`
instruction.yaml          # the user request + metadata
status.yaml               # current phase / pipeline_state + phase history
workflow/
  plan.yaml               # objectives, tier, domain, controller assignment
  work_items.yaml         # CANONICAL work-item definitions: id, title,
                          #   assigned_to, acceptance_criteria, dependencies
  coordination_log.yaml   # controller Q&A, synthesis, implementation_tasks,
                          #   review results, dead_letter_items
  agent_tree.yaml         # spawned-agent hierarchy (written by hooks)
  execution_summary.yaml  # aggregated outputs at session end
  checkpoints/            # state snapshots
outputs/                  # deliverables (per-wave / per-task subdirs)
waypoints/                # resume checkpoints: phase_transition, work_item_complete,
                          #   periodic, pre_compact
tasks/                    # pending/ in_progress/ completed/ blocked/
validation/               # validation_report.yaml (PASS | FAIL | REVISE)
evals/                    # evaluation_report.yaml
\`\`\`

In \`/team\` sessions add \`team/\` (\`task_list.yaml\` — a status-only overlay of
IDs + status + assigned_to, NOT a second source of work-item truth —
\`messages/\`, \`metrics/\`).

**Memory principles**
- **File-based** — all state persists to disk; nothing lives only in context.
- **Session-scoped** — isolated per command invocation; never write into a
  session directory you do not own.
- **Parallel-safe** — multiple sessions run concurrently in one project dir;
  resolve YOUR session from the path given in your prompt, never "the newest one".
- **Pause/resume** — via waypoints; checkpoint before you risk losing context.
- **Git-ignored** — \`cagents-memory/\` is excluded from version control.

Full detail on demand: \`.claude/rules/memory/agent-memory.md\` and
\`.claude/rules/memory/agent-memory-reference.md\`.`;

// ---------------------------------------------------------------------------
// Role pointers. POINTER TEXT ONLY — never include the memory stanza here.
// Each value names the rules files most relevant to that role and where they
// live, so the agent can Read what it needs on demand. Keep these compact: this
// is an index, not the content.
// ---------------------------------------------------------------------------
const ROLE_POINTERS = {
  controller: `You are running as a **controller** (tier-2 coordinator). You coordinate; you do not implement.

Rules index — \`Read\` on demand:
- \`.claude/rules/core/delegation.md\` — the aggressive-delegation contract + Rationalization Kill List. Controllers never Write/Edit \`src/\` \`lib/\` \`components/\` \`app/\` \`services/\` \`middleware/\` (hook-enforced deny).
- \`.claude/rules/playbooks/pat-controller-coordination-protocol.md\` — the 8-step coordination protocol (objectives -> questions -> delegate -> synthesize -> coordination_log.yaml).
- \`.claude/rules/core/controllers.md\` — reviewer loop, guard commands, dead-letter promotion, agent-id tracking, read-before-decide. Detail in \`core/controller-reference.md\`.
- \`.claude/rules/core/resources/controller-validation-checklist.md\` — pre-execution Checks 0-6, mid-execution checkpoints.
- \`.claude/rules/playbooks/pat-two-stage-review.md\` — spec compliance before code quality; fresh reviewer per REVISE round.
- \`.claude/rules/playbooks/pat-gate-taxonomy.md\` — pre-flight / revision / escalation / abort, plus the stall rule.
- \`.claude/rules/playbooks/pat-subagent-status-protocol.md\` — how to route DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
- \`.claude/rules/core/teams.md\` — wave model, gate sentinels (only if you are a \`/team\` wave lead).

Spawn every execution agent synchronously (\`run_in_background: false\`) and collect its result before yielding — a backgrounded child plus a yielded parent is the hours-long stall.`,

  execution: `You are running as an **execution agent**. You do the work and report evidence.

Rules index — \`Read\` on demand:
- \`.claude/rules/core/execution.md\` — execution-agent patterns, commit-before-verify, minimal-solution ladder entry point.
- \`.claude/rules/core/resources/execution-self-validation.md\` — the 5-check self-validation you run before reporting DONE (evidence freshness, file existence, guard exit codes, git state, file:line accuracy).
- \`.claude/rules/playbooks/pat-subagent-status-protocol.md\` — the four statuses and what each obliges you to report.
- \`.claude/rules/playbooks/pat-evidence-first-execution.md\` — cite \`file:line\`, real command output, measured numbers. "Looks correct" is not evidence.
- \`.claude/rules/playbooks/pat-minimal-solution-ladder.md\` — YAGNI -> stdlib -> native -> existing dep -> one-liner -> minimum viable change, before you write new code.
- \`.claude/rules/playbooks/pat-feedback-loop-first-debugging.md\` — for bug work: build the repro loop and show it RED before theorising.
- \`.claude/rules/quality/completion.md\` — the completion protocol; \`quality/anti-slop.md\` for any prose you produce.`,

  review: `You are running as a **reviewer / validator** (a quality gate). Your verdict is the product.

Rules index — \`Read\` on demand:
- \`.claude/rules/playbooks/pat-two-stage-review.md\` — Stage 1 spec compliance (binary, on acceptance criteria) BEFORE Stage 2 code quality (severity-tagged). Distrust the executor's self-report; check it against the diff.
- \`.claude/rules/playbooks/pat-evidence-first-execution.md\` — what counts as verifiable evidence; the mechanical claim-verification pass that re-runs cited methods.
- \`.claude/rules/quality/validation-framework.md\` + \`.claude/rules/quality/resources/validation-checklist-active.md\` — end-to-end traceability and the 5 hook-enforced checks (everything else is advisory — do not claim otherwise).
- \`.claude/rules/quality/completion.md\` — 100%-completion protocol and red-flag phrasing.
- \`.claude/rules/core/resources/execution-self-validation.md\` — the self-validation block you are auditing.
- \`.claude/rules/playbooks/pat-gate-taxonomy.md\` — which gate you are, and what failure means for the caller.`,

  pipeline: `You are running as a **core pipeline agent** (infrastructure tier). You enrich, route, or gate the pipeline.

Rules index — \`Read\` on demand:
- \`.claude/rules/core/orchestration.md\` — the 5-state machine (INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED), revision routing, auto-proceed. Schemas in \`core/orchestration-reference.md\`.
- \`.claude/rules/core/delegation.md\` — pipeline stages delegate; they never self-handle.
- \`.claude/rules/core/controllers.md\` — what you are handing to (or reading back from) a controller.
- \`.claude/rules/core/resources/controller-validation-checklist.md\` — Check 0 is the schema contract your \`plan.yaml\` / \`work_items.yaml\` output must satisfy.
- \`.claude/rules/quality/implicit-discovery.md\` — unpacking abstract requests into work items.
- \`.claude/rules/core/skill-format.md\` — agent frontmatter, archetype/branch, tiers (when selecting or validating agents).
- \`.claude/rules/core/teams.md\` — wave model and gates for \`/team\` sessions.`,

  leadership: `You are running as a **leadership / C-suite agent** (\`/team\` strategic mode, Wave 0/1). You produce strategic analysis, not implementation.

Rules index — \`Read\` on demand:
- \`.claude/rules/core/teams.md\` — strategic mode: C-suite analysis waves, brief synthesis, then per-domain dispatch.
- \`.claude/rules/core/delegation.md\` — you analyse and decide; execution goes to domain agents.
- \`.claude/rules/domains/\` — \`engineering.md\`, \`grow.md\`, \`operate.md\`, \`people.md\`, \`serve.md\` for the domain you are speaking to.
- \`.claude/rules/playbooks/pat-gate-taxonomy.md\` — escalation vs. abort when a decision needs a human.
- \`.claude/rules/quality/completion.md\` — evidence standards apply to strategic claims too.`,

  // Fallback for an unrecognized, absent, or non-cAgents agent type.
  default: `Role not recognized — here is the general cAgents rules index. \`Read\` what your task needs:

- \`.claude/rules/core/delegation.md\` — the aggressive-delegation contract (who may implement, who must delegate).
- \`.claude/rules/core/execution.md\` — execution-agent patterns and self-validation entry point.
- \`.claude/rules/core/controllers.md\` — controller coordination, if you are coordinating.
- \`.claude/rules/quality/completion.md\` — the completion protocol: evidence, not assertions.
- \`.claude/rules/playbooks/pat-subagent-status-protocol.md\` — how to report DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
- \`.claude/rules/core/skill-format.md\` — SKILL.md format, if you are authoring or editing an agent.
- \`.claude/rules/README.md\` — the full rules index (43 files across core / domains / infrastructure / memory / playbooks / quality).`,
};

// ---------------------------------------------------------------------------
// Agent name -> role key. Grouped, not enumerated per-agent where avoidable.
// Precedence: leadership > review > pipeline > controller > execution (default).
// Names are derived from the on-disk catalog tiers; an unlisted cagents:* name
// falls through to `execution`, and a non-cagents / absent type to `default`.
// ---------------------------------------------------------------------------
const LEADERSHIP = new Set([
  'ceo', 'cto', 'cfo', 'cmo', 'coo', 'chro', 'cco', 'cro', 'cpo',
]);

const REVIEW = new Set([
  'reviewer', 'validator', 'wave-reviewer',
]);

const PIPELINE = new Set([
  'orchestrator', 'planner', 'router', 'trigger', 'execution-monitor',
  'self-correct', 'task-state', 'hitl', 'optimizer', 'coord-log-writer',
  'team-bootstrap', 'team-lead',
]);

const CONTROLLER = new Set([
  'architect', 'tech-lead', 'coordinator', 'qa-lead', 'security-engineer',
  'data-lead', 'editor', 'product-owner', 'strategic-planner',
  'narrative-director', 'marketing-strategist', 'sales-strategist',
  'operations-manager', 'support-director', 'customer-success-manager',
  'general-counsel', 'hr-manager',
]);

/**
 * Extract the cAgents agent base name from a SubagentStart payload.
 * Returns '' when no cagents:{name} can be determined.
 */
function extractAgentName(input) {
  const toolInput = (input && input.tool_input) || {};
  const candidates = [
    input && input.agent_type,
    input && input.subagent_type,
    toolInput.subagent_type,
  ];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const m = c.match(/^cagents:([a-z][a-z0-9-]*)$/i);
      if (m) return m[1].toLowerCase();
    }
  }
  // Last resort: a cagents: reference inside the description or prompt.
  const text = `${toolInput.description || (input && input.description) || ''} ${toolInput.prompt || ''}`;
  const m = text.match(/cagents:([a-z][a-z0-9-]*)/i);
  return m ? m[1].toLowerCase() : '';
}

/**
 * Map an agent base name to a ROLE_POINTERS key.
 * Any name that is not recognized as leadership/review/pipeline/controller is an
 * execution agent; an empty/unknown name gets the `default` fallback.
 */
function resolveRole(agentName) {
  const name = (agentName || '').toLowerCase();
  if (!name) return 'default';
  if (LEADERSHIP.has(name)) return 'leadership';
  if (REVIEW.has(name)) return 'review';
  if (PIPELINE.has(name)) return 'pipeline';
  if (CONTROLLER.has(name)) return 'controller';
  return 'execution';
}

/**
 * THE SINGLE ASSEMBLY POINT.
 *
 * Selects a role pointer (falling back to `default` for any key not present in
 * ROLE_POINTERS) and unconditionally concatenates MEMORY_LAYOUT_STANZA onto it.
 * There is deliberately no other code path that produces a bundle, so a new role
 * added to ROLE_POINTERS inherits the stanza with no action by its author.
 */
function buildRoleBundle(roleKey) {
  const key = Object.prototype.hasOwnProperty.call(ROLE_POINTERS, roleKey)
    ? roleKey
    : 'default';
  const pointer = ROLE_POINTERS[key];
  return `## cAgents role manifest (${key})\n\n${pointer}\n${MEMORY_LAYOUT_STANZA}\n`;
}

const handler = async (input) => {
  // Fail-open belt: createHook() already catches, but this hook is additive and
  // must NEVER be the reason a spawn fails. Any defect degrades to no injection.
  try {
    const agentName = extractAgentName(input);
    const roleKey = resolveRole(agentName);
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: buildRoleBundle(roleKey),
      },
    };
  } catch (err) {
    console.error(`[RoleManifestInjector] non-fatal: ${err && err.message}`);
    return null; // -> { continue: true }; the spawn proceeds unaffected.
  }
};

// Registered at top level for both `node role-manifest-injector.cjs` and the
// `run-hook.cjs role-manifest-injector` invocation paths. Suppressed only when a
// future dispatcher require()s this module purely to import `handler`.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('RoleManifestInjector', handler);
}

module.exports = {
  handler,
  buildRoleBundle,
  resolveRole,
  extractAgentName,
  ROLE_POINTERS,
  MEMORY_LAYOUT_STANZA,
};
