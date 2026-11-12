// Vitest setup file (v12.78.0, WI-10). Runs before each test file.
//
// A developer can set CAGENTS_BASH_GUARD=off in the Claude Code session env
// (for example in .claude/settings.local.json). Many tests spawn hooks with
// `{ ...process.env }`. Without this step they inherit the opt-out, and the
// bash-guard tests fail because the guard does not block.
//
// Tests that need the variable set it explicitly in the env they pass to the
// spawned hook (see tests/hooks/bash-guard-optout.test.js).
delete process.env.CAGENTS_BASH_GUARD;

// UD-2 (v12.79.0): a developer can also turn the whole guard off with
// CAGENTS_BASH_GUARD_DISABLED=1, in the env or in the "env" object of
// .claude/settings.local.json. The hook reads that file directly. A value of
// "0" keeps the guard on and makes the hook skip the file, so the guard tests
// stay hermetic. Tests that need the switch on set it in the spawned env (see
// tests/hooks/bash-guard-full-off-switch.test.js).
process.env.CAGENTS_BASH_GUARD_DISABLED = '0';
