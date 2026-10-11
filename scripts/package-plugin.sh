#!/usr/bin/env bash
# scripts/package-plugin.sh
#
# Build an uploadable cAgents plugin archive and self-verify it.
#
# Exists because the obvious command is wrong: `zip -r out.zip *` silently drops
# every dot-entry (the shell's `*` does not expand to them), so `.claude-plugin/`
# and `.claude/` never make it in and the upload is rejected with
# "the archive must contain a .claude-plugin/plugin.json manifest".
#
# `git archive` is used instead: it includes dotfiles by design, emits no wrapper
# directory, and ships only tracked files (no node_modules/, .git/, .venv/,
# runtime cagents-memory/ session state).
#
# The file list is DERIVED from package.json `files` — the single source of truth
# for what ships (see .npmignore). Do not hardcode paths here.
#
# Usage:
#   bash scripts/package-plugin.sh                    # -> dist/cagents-plugin-<version>.zip
#   bash scripts/package-plugin.sh -o /tmp/cagents.zip
#   bash scripts/package-plugin.sh --ref v12.68.1     # package a tag instead of HEAD
#
# Exits 0 only if the built archive passes every verification check; on failure
# the bad archive is deleted so it cannot be uploaded by mistake.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REF="HEAD"
OUT=""

while [ $# -gt 0 ]; do
    case "$1" in
        -o|--output) OUT="${2:-}"; shift 2 ;;
        -r|--ref)    REF="${2:-}"; shift 2 ;;
        -h|--help)   sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "ERROR: unknown argument '$1' (try --help)" >&2; exit 2 ;;
    esac
done

for tool in git node python3; do
    command -v "$tool" >/dev/null 2>&1 || { echo "ERROR: '$tool' is required but not on PATH" >&2; exit 2; }
done

VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
[ -n "$VERSION" ] || { echo "ERROR: could not read version from package.json" >&2; exit 2; }

git rev-parse --verify --quiet "$REF" >/dev/null || { echo "ERROR: '$REF' is not a valid git ref" >&2; exit 2; }

[ -n "$OUT" ] || OUT="dist/cagents-plugin-${VERSION}.zip"
mkdir -p "$(dirname "$OUT")"

if [ "$REF" = "HEAD" ] && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "WARN  working tree is dirty — packaging committed HEAD, not your local edits"
fi

# ---- File list ---------------------------------------------------------------
# Derived from package.json `files`. A pathspec matching nothing tracked would
# make git archive abort, so drop empties loudly rather than failing opaquely.
PATHSPECS=()
while IFS= read -r p; do
    [ -n "$p" ] || continue
    if [ -z "$(git ls-tree -r --name-only "$REF" -- "$p" 2>/dev/null | head -1)" ]; then
        echo "WARN  package.json files entry matches no tracked file at $REF: $p"
        continue
    fi
    PATHSPECS+=("$p")
done < <(node -p "require('./package.json').files.join('\n')")

[ ${#PATHSPECS[@]} -gt 0 ] || { echo "ERROR: no shippable paths resolved from package.json files" >&2; exit 1; }

# ---- Build -------------------------------------------------------------------
rm -f "$OUT"
if ! git archive --format=zip -9 -o "$OUT" "$REF" -- "${PATHSPECS[@]}"; then
    echo "ERROR: git archive failed" >&2
    rm -f "$OUT"
    exit 1
fi

# ---- Verify ------------------------------------------------------------------
# Counts come from the packaged ref, not the working tree, so --ref stays honest.
EXPECT_AGENTS=$(git ls-tree -r --name-only "$REF" -- agents/ 2>/dev/null | grep -c '^agents/[^/]*\.md$')
EXPECT_HOOKS=$(git ls-tree -r --name-only "$REF" -- .claude/hooks/ 2>/dev/null | grep -c '\.cjs$')

if ! python3 - "$OUT" "$VERSION" "$EXPECT_AGENTS" "$EXPECT_HOOKS" <<'PYEOF'
import json, sys, zipfile

zip_path, version, expect_agents, expect_hooks = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
errors = []

with zipfile.ZipFile(zip_path) as z:
    names = z.namelist()
    files = [n for n in names if not n.endswith("/")]

    # 1. The manifest must sit at the archive ROOT. This is the check that would
    #    have caught the `zip -r out.zip *` bug, and the one uploads enforce.
    manifest_label = ".claude-plugin/plugin.json (root)"
    if ".claude-plugin/plugin.json" not in files:
        nested = [n for n in files if n.endswith(".claude-plugin/plugin.json")]
        if nested:
            manifest_label = "%s (NESTED)" % nested[0]
            errors.append("manifest is nested at %s — it must be at the archive root" % nested[0])
        else:
            manifest_label = "MISSING"
            errors.append("no .claude-plugin/plugin.json anywhere in the archive")

    # 2. No single wrapper directory swallowing the tree.
    roots = {n.split("/")[0] for n in files}
    if len(roots) == 1:
        errors.append("archive is wrapped in a single '%s/' directory" % roots.pop())

    # 3. Manifest parses and its identity matches package.json.
    if ".claude-plugin/plugin.json" in files:
        try:
            manifest = json.loads(z.read(".claude-plugin/plugin.json"))
            manifest_label += " v%s" % manifest.get("version")
            if manifest.get("name") != "cagents":
                errors.append("manifest name is %r, expected 'cagents'" % manifest.get("name"))
            if manifest.get("version") != version:
                errors.append(
                    "manifest version %r != package.json %r" % (manifest.get("version"), version)
                )
        except (json.JSONDecodeError, KeyError) as e:
            errors.append("manifest is not valid JSON: %s" % e)

    # 4. Payload is actually present. Agent files must be FLAT under agents/.
    #    The plugin.json "agents" array lists flat agents/<name>.md files. Claude
    #    Code's default scan is recursive, so nested files must not be agents.
    agents = [n for n in files if n.startswith("agents/") and n.count("/") == 1 and n.endswith(".md")]
    if len(agents) != expect_agents:
        errors.append("%d flat agents/*.md in archive, expected %d" % (len(agents), expect_agents))

    skills = sorted(n for n in files if n.startswith(".claude/skills/") and n.endswith("/SKILL.md"))
    missing = [s for s in ("act", "designer", "helper", "team")
               if ".claude/skills/%s/SKILL.md" % s not in skills]
    if missing:
        errors.append("missing skills: %s" % ", ".join(missing))

    hooks = [n for n in files if n.startswith(".claude/hooks/") and n.endswith(".cjs")]
    if len(hooks) != expect_hooks:
        errors.append("%d hooks in archive, expected %d" % (len(hooks), expect_hooks))

    # 5. Nothing that must never ship.
    for junk in ("node_modules/", ".git/", ".venv/", "tests/", "docs/"):
        if any(n.startswith(junk) for n in files):
            errors.append("archive contains %s" % junk)

    print("  entries      %d (%d files)" % (len(names), len(files)))
    print("  manifest     %s" % manifest_label)
    print("  agents       %d flat .md" % len(agents))
    print("  skills       %d" % len(skills))
    print("  hooks        %d .cjs" % len(hooks))

if errors:
    print("")
    for e in errors:
        print("FAIL  %s" % e)
    sys.exit(1)
PYEOF
then
    echo ""
    echo "ERROR: archive failed verification — deleting $OUT" >&2
    rm -f "$OUT"
    exit 1
fi

SIZE=$(du -h "$OUT" | cut -f1)
echo ""
echo "OK    $OUT ($SIZE, ref $REF)"
