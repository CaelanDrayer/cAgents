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
- **No Bash command hook (removed in v12.80.0)**: v12.80.0 removed the bash guard hook and its evaluator library. No cAgents hook checks Bash commands now. Claude Code asks for permission as usual, and the `permissions.deny` patterns in `.claude/settings.json` block `rm -rf /`, `rm -rf ~`, and `sudo`. On every Write and Edit, `write-edit-dispatch.cjs` still checks for secrets, blocks protected paths, and runs the delegation check. On every Agent call, `agent-dispatch.cjs` still runs the session-presence gate.
- **Protected paths**: Prevents writes to system directories (`/etc/`, `/usr/`, `~/.ssh/`)
- **Opt-outs**: To relax a guard hook, use a switch from [`HOOK_OPT_OUTS.md`](HOOK_OPT_OUTS.md). Do not disable the hook, because `write-edit-dispatch.cjs` also runs secret detection.
- **Session isolation**: Each workflow session is scoped to `cagents-memory/sessions/`

## License

This project is licensed under [MIT](../LICENSE). Security reports are handled independently of the license.
