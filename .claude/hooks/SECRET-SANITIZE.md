# SECRET-SANITIZE Protocol (v12.0.4+)

Sanitize mode is an opt-in alternative to the default block-on-secrets behavior.
The model can see a sanitized file and reason about its structure. The model
never loads the secret value.

## Activation

```bash
export CAGENTS_SECRET_MODE=sanitize
```

The default mode is `block`. Block mode keeps the pure-deny semantics.

## Lifecycle

1. **PreToolUse[Write|Edit]**: `secret-detection.cjs` finds a secret pattern.
   It uses the same regex set as block mode.
2. **Build the full file**: for a Write, the full file is the `content` field.
   For an Edit, the hook applies the edit to the current file. See
   § Edit semantics.
3. **Sanitize**: the hook replaces each secret in the full file with a
   `BLOCK_<8-char-hex>` placeholder. The hex is the start of the SHA256 hash of
   the secret.
4. **Back up**: the hook writes the backups to
   `cagents-memory/_system/secret-backups/{session_id}/`. See § Backup content.
5. **Write and deny**: the hook writes the sanitized full file to the target.
   It then denies the original tool call, so the secret payload does not reach
   the disk.
6. **Session continues**: the model sees the `BLOCK_<hex>` placeholders. It can
   reason about the file structure without the secret values.
7. **Stop hook (`secret-restore.cjs`)**: at the end of the session, the hook
   restores each backed-up file to the full file with the real secrets. It then
   deletes the manifest and the `.orig` files.

## Edit semantics

The Edit tool sends a fragment, not the full file. The hook applies that
fragment the way Claude Code applies it.

- The hook reads the current target file.
- The hook replaces `old_string` with `new_string`. The match is exact.
- If `replace_all` is `true`, the hook replaces each occurrence.
- If `replace_all` is not `true`, `old_string` must occur exactly one time.
- If the input has an `edits[]` array (MultiEdit), the hook applies each edit
  in order. Each edit applies to the result of the edit before it.
- If `old_string` is not in the file, the hook denies and writes nothing.
- If `old_string` occurs more than one time without `replace_all`, the hook
  denies and writes nothing.
- If the target file does not exist, the hook denies. The one exception is an
  empty `old_string`, which creates the file with `new_string`.

The hook then scans the full edited file and sanitizes it. A secret that was
in the file before the edit is also replaced with a placeholder. The restore
puts it back.

## Backup content

| File | Content | Written for |
|---|---|---|
| `<hash>.orig` | The full file after the edit, with the real secrets | Write and Edit |
| `<hash>.pre-edit.orig` | A byte copy of the file before the edit | Edit, when the file existed |
| `manifest.yaml` | The placeholder, the hash, the line, and the `.orig` name of each secret | Write and Edit |

`<hash>` is the first 16 hex characters of the SHA256 hash of the full file
after the edit. `secret-restore.cjs` restores from `<hash>.orig`. It deletes
`<hash>.pre-edit.orig` with the other `.orig` files at cleanup. To undo the
edit itself before the Stop hook runs, copy `<hash>.pre-edit.orig` back by
hand.

## Deny list

Sanitize mode never writes to these targets. If a secret is in a write to one
of them, the hook denies and writes nothing:

- `.claude/settings*.json`
- `.claude/hooks/**`
- `.git/hooks/**`
- A shell rc file: `.bashrc`, `.bash_profile`, `.bash_login`, `.zshrc`,
  `.zprofile`, `.zshenv`, and `.profile`

A write to one of these targets can change the hook config or run code at the
next shell start. The hook checks the resolved path and the real path, so a
symlink to a deny-list file is also denied.

The hook resolves each target path with `path.resolve` before the
protected-path check. A path such as `/tmp/x/../../etc/passwd` therefore
matches `/etc/` and is denied in each mode.

## Hard guarantees

- The backup dir is under `cagents-memory/`, which `.gitignore` excludes.
- Each backup file has 0600 perms, so only the owner can read it.
- The manifest stores hashes. It does not store secret values.
- The restore is idempotent. A second run on a clean session does nothing.
- A crashed session has no Stop hook run. After recovery, delete
  `cagents-memory/_system/secret-backups/{session_id}/` by hand.

## When to use

- **Use sanitize** when the model must reason about the structure of a file
  that holds secrets. An example is a review of a config file with API keys.
  The model can audit the schema without the keys.
- **Use block (the default)** when a file with secrets must never reach the
  context of the model. Block is the safer default. It keeps the v11.2.0
  standalone contract.

## Anti-patterns

- Do not enable sanitize mode for production CI runs. A backup file that
  nobody cleans up is a liability.
- Do not commit `cagents-memory/_system/secret-backups/` to git. The dir is
  in `.gitignore` by default. Verify it with `git check-ignore -v`.
