# SECRET-SANITIZE Protocol (v12.0.4+)

Opt-in alternative to cAgents' default block-on-secrets behavior. Allows models
to SEE sanitized-content files (and reason about structure) while never loading
the secret value.

## Activation

```bash
export CAGENTS_SECRET_MODE=sanitize
```

Default: `block` (unchanged — pure-deny semantics).

## Lifecycle

1. **PreToolUse[Write|Edit]**: secret-detection.cjs detects a secret pattern
   (same regex set as block mode). Computes SHA256 hash of the secret value.
2. **Sanitize**: replaces the secret with `BLOCK_<8-char-hex>` placeholder.
   Writes the SANITIZED content to the file. The original (pre-sanitize)
   content is backed up to `cagents-memory/_system/secret-backups/{session_id}/`.
3. **Session continues**: model sees `BLOCK_<hex>` placeholders. Can reason about
   file structure without ever loading secret values.
4. **Stop hook (secret-restore.cjs)**: at session end, restores all backed-up
   files to their pre-sanitize state. Deletes the backup manifest + .orig files.

## Hard guarantees

- Backup dir lives under `cagents-memory/` (gitignored — `.gitignore:cagents-memory/`)
- Backup file perms: 0600 (owner-readable only)
- Manifest stores hashes, NOT secret values
- Restore is idempotent: re-running on a clean session is a no-op
- On crashed session (no Stop hook fired): operator must manually delete
  `cagents-memory/_system/secret-backups/{session_id}/` after recovery

## When to use

- **Use sanitize** when you need the model to reason about file STRUCTURE
  containing secrets (e.g., reviewing a config file with API keys — the
  model can audit the schema without loading the keys).
- **Use block (default)** when secret-bearing files should never reach the
  model's context — safer default, preserves the v11.2.0 standalone contract.

## Anti-patterns

- Do NOT enable sanitize for production CI runs — the backup files are a
  liability if not cleaned up.
- Do NOT commit `cagents-memory/_system/secret-backups/` to git (gitignored
  by default; verify with `git check-ignore -v`).
