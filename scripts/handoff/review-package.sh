#!/usr/bin/env bash
#
# review-package.sh — bundle a git diff (optionally scoped to PATHs and/or refs)
# into a uniquely-named file that a reviewer sub-agent can read in one call.
#
# Part of the cAgents file-handoff helpers. Backs the "delegation prompt under
# 300 tokens" rule (see .claude/rules/core/controllers.md): hand the reviewer a
# path to the diff instead of pasting the whole diff into the prompt.
#
# Convenience helper — not load-bearing pipeline code. Deps: bash, git,
# coreutils (date/mkdir/printf). No jq/yq/python.
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: review-package.sh [options] [--] [PATH ...]

Bundle a git diff into a uniquely-named file a reviewer sub-agent can read in
one call. A short header (repo, refs, paths, --stat summary) precedes the diff.

Options:
  --range A..B     Diff between two refs/commits (git diff A..B).
  --ref REF        Diff REF against the working tree (git diff REF).
  --staged         Diff the staged changes (git diff --staged). Alias: --cached.
  --out-dir DIR    Directory to write the package into. Default: the repo root,
                   falling back to ${TMPDIR:-/tmp} if that is not writable.
  --stdout         Print the package to stdout instead of a file.
  -h, --help       Show this help and exit 0.

With no --range/--ref/--staged, diffs the working tree against HEAD
(git diff HEAD). Trailing PATH arguments scope the diff and are safest after a
`--` separator.

Output:
  Writes <out-dir>/review-package-<timestamp>-<pid>.diff and prints the file
  path on stdout (unless --stdout is given). Exit 0 on success (including an
  empty diff); exit 1 on usage errors or when not inside a git work tree.

Examples:
  review-package.sh -- src/auth
  review-package.sh --range main..HEAD -- src/ lib/
  review-package.sh --ref HEAD~3 -- packages/api
  review-package.sh --staged --stdout
EOF
}

# ---- Parse arguments --------------------------------------------------------
mode="head"       # head | range | ref | staged
range=""
ref=""
out_dir=""
to_stdout=0
paths=()

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --range)
      [ $# -ge 2 ] || { echo "review-package.sh: --range requires A..B" >&2; exit 1; }
      range="$2"; mode="range"; shift 2 ;;
    --ref)
      [ $# -ge 2 ] || { echo "review-package.sh: --ref requires a ref" >&2; exit 1; }
      ref="$2"; mode="ref"; shift 2 ;;
    --staged|--cached) mode="staged"; shift ;;
    --out-dir)
      [ $# -ge 2 ] || { echo "review-package.sh: --out-dir requires a value" >&2; exit 1; }
      out_dir="$2"; shift 2 ;;
    --stdout) to_stdout=1; shift ;;
    --) shift; while [ $# -gt 0 ]; do paths+=("$1"); shift; done ;;
    -*) echo "review-package.sh: unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) paths+=("$1"); shift ;;
  esac
done

# ---- Must be inside a git work tree ----------------------------------------
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "review-package.sh: not inside a git work tree" >&2
  exit 1
fi

# ---- Build the git diff argument list --------------------------------------
diff_args=()
case "$mode" in
  head)   diff_args=(HEAD) ;;
  staged) diff_args=(--staged) ;;
  range)  diff_args=("$range") ;;
  ref)    diff_args=("$ref") ;;
esac

# Empty-array-safe expansion under `set -u`.
pathspec=(${paths[@]+"${paths[@]}"})

stat="$(git diff "${diff_args[@]}" --stat -- ${pathspec[@]+"${pathspec[@]}"} 2>/dev/null || true)"
diff_body="$(git diff "${diff_args[@]}" -- ${pathspec[@]+"${pathspec[@]}"} 2>/dev/null || true)"

cmd_display="git diff ${diff_args[*]} --"
if [ "${#pathspec[@]}" -gt 0 ]; then
  cmd_display="$cmd_display ${pathspec[*]}"
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# ---- Assemble the package ---------------------------------------------------
package="$(
  printf '# review package\n'
  printf '# repo: %s\n' "$repo_root"
  printf '# generated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '# diff: %s\n' "$cmd_display"
  printf '#\n'
  printf '# --- summary (git diff --stat) ---\n'
  if [ -n "$stat" ]; then printf '%s\n' "$stat"; else printf '(no changes)\n'; fi
  printf '#\n'
  printf '# --- full diff ---\n'
  printf '%s\n' "$diff_body"
)"

# ---- Emit -------------------------------------------------------------------
if [ "$to_stdout" -eq 1 ]; then
  printf '%s\n' "$package"
  exit 0
fi

if [ -z "$out_dir" ]; then
  out_dir="$repo_root"
  if [ ! -w "$out_dir" ]; then
    out_dir="${TMPDIR:-/tmp}"
  fi
else
  mkdir -p "$out_dir"
fi

ts="$(date +%Y%m%d-%H%M%S)"
out_file="${out_dir%/}/review-package-${ts}-$$.diff"

printf '%s\n' "$package" > "$out_file"
printf '%s\n' "$out_file"
