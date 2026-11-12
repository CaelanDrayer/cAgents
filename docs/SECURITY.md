# Security Policy

Thank you for helping keep cAgents and its users secure.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 10.x    | Yes       |
| 9.x     | Security fixes only |
| < 9.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in cAgents, please report it responsibly.

**Email**: [caelan@caelandrayer.ca](mailto:caelan@caelandrayer.ca)

**Subject line**: `[SECURITY] <brief description>`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## What Qualifies

- Hook bypass or privilege escalation (e.g., circumventing `secret-detection.cjs` or `write-edit-dispatch.cjs`)
- Secret leakage through agent outputs or session files
- Path traversal allowing reads/writes outside the project directory
- Agent prompt injection that causes unintended system modifications
- Exposure of sensitive data in `cagents-memory/` or session artifacts

## What Does Not Qualify

- Issues in upstream Claude Code itself (report to [Anthropic](https://hackerone.com/anthropic-vdp))
- Vulnerabilities in third-party dependencies (report to the respective maintainer)
- Theoretical attacks requiring physical access to the host machine
- Social engineering of users

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Fix or mitigation**: Best effort within 30 days, depending on severity

## Responsible Disclosure

We ask that you:
- Allow reasonable time to investigate and address the issue before public disclosure
- Avoid accessing or modifying other users' data
- Act in good faith to avoid disruption to the project and its users

## Security Architecture

cAgents includes several built-in security mechanisms:

- **Secret detection** (`secret-detection.cjs`): Blocks writes containing API keys, tokens, and credentials
- **Narrow Bash guard** (`bash-validator.cjs`, v12.81.0): a PreToolUse[Bash] hook with two rule families and nothing more.
  - `secret-literal`: it denies a command when the shared secret scanner finds a critical or a high secret in the command text, heredoc bodies included. A finding that holds a shell expansion is dropped. A loopback database URL and a read of a secret file pass.
  - `protected-path-write`: it denies a write, a delete, a move, or a change of mode or owner on the shared protected-path list. The Write path uses the same list. A read or a mention passes.
  - It fails open. A command over 256 KB skips both rules. An internal error skips the rest of the checks. A command that does not parse, such as one with an unbalanced quote, skips the path rule. Each such event and each deny writes one line to `cagents-memory/_system/logs/bash_guard.log`. Set `CAGENTS_BASH_NARROW_GUARD=off` to turn it off. The old `CAGENTS_BASH_GUARD` and `CAGENTS_BASH_GUARD_DISABLED` keys are inert.
  - The path rule expands `~` and `$HOME` and parses `bash -c` and `sh -c` strings at one level. It does not check script file contents, other variables, command substitution, `eval`, other interpreter code, `find -delete`, or hook-config paths. The secret rule still scans the whole command text, including the text inside `eval`, `python -c`, `node -e`, and `$(...)`. It is a tripwire for agent mistakes and plain injections, not a sandbox.
- **Permission deny list**: the `permissions.deny` block in `.claude/settings.json` blocks `rm -rf /`, `rm -rf ~`, `sudo`, and edits to `/etc/` and `~/.ssh/`. This block ships in the source repo only. A plugin install has no such block, so Claude Code asks for permission as usual.
- **Write and Agent gates**: on every Write and Edit, `write-edit-dispatch.cjs` checks for secrets, blocks protected paths, and runs the delegation check. On every Agent call, `agent-dispatch.cjs` runs the session-presence gate.
- **Protected paths**: Prevents writes to system directories (`/etc/`, `/usr/`, `~/.ssh/`)
- **Opt-outs**: To relax a guard hook, use a switch from [`HOOK_OPT_OUTS.md`](HOOK_OPT_OUTS.md). Do not disable the hook, because `write-edit-dispatch.cjs` also runs secret detection.
- **Session isolation**: Each workflow session is scoped to `cagents-memory/sessions/`

## License

This project is licensed under [MIT](../LICENSE). Security reports are handled independently of the license.
