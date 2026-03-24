#!/usr/bin/env node
/**
 * Delegation Enforcer Hook - Hard delegation mandate for skill invocations
 * cAgents V10.22.6 - UserPromptSubmit hook
 *
 * Fires BEFORE SKILL.md loads when /run, /team, or /org is invoked.
 * Injects a hard system message: the full delegation pipeline MUST execute.
 * Self-handling is a critical violation with no exceptions for task type or simplicity.
 *
 * The injected additionalContext explicitly lists and invalidates all known
 * rationalization phrases the model uses to justify self-handling.
 *
 * Layer 1 of the 4-layer delegation enforcement system.
 * Layers 2-4: SKILL.md Rationalization Kill List, attention-injection.cjs, verify-completion.cjs
 */

const { createHook } = require('./hook-utils.cjs');

// Skills that require full pipeline delegation enforcement
const ENFORCED_SKILLS = ['/run', '/team', '/org'];

// Detect whether the user prompt is invoking an enforced skill.
// Matches: "/run ...", "/team ...", "/org ..." at the start of the prompt
// (possibly after whitespace) or as a standalone invocation mid-prompt.
function detectSkillInvocation(prompt) {
  if (!prompt) return null;
  const trimmed = prompt.trim();
  for (const skill of ENFORCED_SKILLS) {
    // Match at start of prompt (most common) or as a word boundary
    if (
      trimmed.startsWith(skill + ' ') ||
      trimmed === skill ||
      trimmed.startsWith(skill + '\n') ||
      new RegExp(`(?:^|\\s)${skill.replace('/', '\\/')}(?:\\s|$)`).test(trimmed)
    ) {
      return skill;
    }
  }
  return null;
}

function buildDelegationMandate(skill) {
  return `DELEGATION ENFORCEMENT ACTIVE — PIPELINE MANDATORY

You are executing ${skill}. The full delegation pipeline MUST run. No exceptions.

ABSOLUTE PROHIBITION: You may NOT handle any part of this request directly.
ALL work goes to subagents via the Task tool. This is non-negotiable.

RATIONALIZATION KILL LIST — these phrases indicate a critical violation:

1. "This is a documentation task"
   NO. Documentation tasks use the full pipeline. The doc-writer agent handles docs.

2. "This is a planning task"
   NO. Planning IS a pipeline stage executed by the planner agent, not a bypass.

3. "I'll handle this directly"
   NO. Direct handling is a critical violation of the delegation protocol.

4. "The task is too simple for a full pipeline"
   NO. Simplicity never bypasses delegation. Even single-line fixes use the pipeline.

5. "Rather than spinning up agents"
   NO. Spinning up agents is the ONLY execution mode for ${skill}.

6. "I can do this more efficiently myself"
   NO. Efficiency is irrelevant. Delegation is mandatory regardless of efficiency claims.

7. "This doesn't need agent coordination"
   NO. Every ${skill} invocation requires the full agent coordination pipeline.

8. "I'll build/create/fix/write/implement this myself"
   NO. ALL implementation goes to execution agents (backend-developer, frontend-developer, etc.) via Task tool.

9. "Let me just make this change directly"
   NO. "Just" is a rationalization word. No direct changes. Task tool only.

10. "This is a simple fix that doesn't warrant spawning agents"
    NO. There is no complexity threshold below which delegation is optional.

11. "I'll do this inline since it's a small edit"
    NO. Size does not determine delegation requirements. All edits go to execution agents.

12. "Rather than going through the full pipeline for this"
    NO. The full pipeline runs for every ${skill} invocation without exception.

VIOLATION CONSEQUENCE: Self-handling is a critical protocol failure, not a minor deviation.
The user invoked ${skill} specifically to use the agent pipeline. Bypassing it defeats the
entire purpose of the plugin and violates the explicit architecture contract.

REQUIRED ACTIONS:
1. Create session directory and write status.yaml FIRST (before any other action)
2. Progress through the pipeline states in order
3. Spawn agents via Task tool for ALL work items
4. Never write implementation files directly — always delegate`.trim();
}

createHook('DelegationEnforcer', async (input) => {
  const prompt = (input.user_prompt || input.prompt || '').trim();

  if (!prompt) return null;

  const skill = detectSkillInvocation(prompt);
  if (!skill) return null;

  // Inject hard delegation mandate with skill name substituted
  const mandate = buildDelegationMandate(skill);

  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: mandate
    }
  };
});
