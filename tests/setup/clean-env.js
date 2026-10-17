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
