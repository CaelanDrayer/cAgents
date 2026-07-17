# OWASP corpus fixture (vendored)

`owasp-security-corpus-source.md` is a byte-for-byte vendored copy (21,586 bytes)
of the upstream `agamm/claude-code-owasp` `owasp-security` SKILL.md that
`security-engineer`'s `owasp-audit` mode was absorbed from during Phase 8
(v11.1.x).

## Why it lives here (REC-18, v12.52.0)

The original source previously lived only inside the 4.2GB git-ignored research
corpus at `_archive/repo_root_scratch/example/external-skills/agamm__claude-code-owasp/…`.
`tests/regressions/phase8-owasp-absorbed.test.js` hard-depended on that path
(`existsSync(corpusPath) === true`), which pinned the entire 4.2GB corpus alive
solely to satisfy one 21,586-byte assertion. New contributors had to keep the
corpus on disk for CI to pass.

Vendoring the single file here (tracked, well under the 252KB largest-tracked
file) decouples CI from the corpus. The corpus can now be pruned from any working
tree without breaking the test. The test asserts the vendored copy is byte-stable
and still carries the untouched upstream `name: owasp-security` header — the same
"read-only source contract" the original assertion enforced.

## Provenance

- Upstream repo: `agamm/claude-code-owasp`
- Upstream path: `.claude/skills/owasp-security/SKILL.md`
- Byte size: 21,586 (immutable — the test asserts this exact size)
- Do not edit: this is a pinned immutable copy of the absorption source.
