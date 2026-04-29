#!/usr/bin/env bash
# cAgents v11.1.0 — full migration execution
# Reads cagents-memory-staging/file-move-table.tsv and applies all changes.
# Safety: stages in git, does NOT commit. Run npm test after, commit when verified.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TABLE="cagents-memory-staging/file-move-table.tsv"
[ -f "$TABLE" ] || { echo "Run scripts/migrate-v11.1.0.sh first to generate $TABLE"; exit 1; }

echo "=========================================="
echo "Stage A: Moving 243 agent directories"
echo "=========================================="

# Use git mv to preserve history. Move the agent directory (parent of SKILL.md)
# so resources/ subdir comes along automatically.
moved=0
while IFS=$'\t' read -r old new archetype branch; do
  old_dir="$(dirname "$old")"
  new_dir="$(dirname "$new")"
  parent_new="$(dirname "$new_dir")"

  mkdir -p "$parent_new"

  if [ -d "$old_dir" ]; then
    git mv "$old_dir" "$new_dir" 2>/dev/null || {
      # Fallback: non-git or already-moved. Try plain mv.
      mv "$old_dir" "$new_dir" 2>/dev/null || echo "  WARN: could not move $old_dir → $new_dir"
    }
    moved=$((moved + 1))
  else
    echo "  WARN: source missing: $old_dir"
  fi
done < "$TABLE"
echo "Moved $moved agent directories."

echo ""
echo "=========================================="
echo "Stage B: Updating SKILL.md frontmatter"
echo "=========================================="
# Replace 'domain: <x>' with 'archetype: <archetype>' and add 'branch: <branch>' for 3-level archetypes.
updated=0
while IFS=$'\t' read -r old new archetype branch; do
  if [ -f "$new" ]; then
    if [ -n "$branch" ]; then
      # 3-level: replace domain line, then add branch line right after
      python3 -c "
import re, sys
p = '$new'
arch = '$archetype'
br = '$branch'
content = open(p).read()
# Try to replace existing domain field
new_content, n = re.subn(r'^domain:\s*\S+\s*\$', f'archetype: {arch}\nbranch: {br}', content, count=1, flags=re.M)
if n == 0:
    # No domain field — insert archetype/branch after first frontmatter line (after name:)
    new_content = re.sub(r'(^---\n(?:.*?\n)*?name:.*?\n)', rf'\1archetype: {arch}\nbranch: {br}\n', content, count=1, flags=re.M)
open(p, 'w').write(new_content)
"
    else
      # 2-level / flat: replace domain with archetype only
      python3 -c "
import re, sys
p = '$new'
arch = '$archetype'
content = open(p).read()
new_content, n = re.subn(r'^domain:\s*\S+\s*\$', f'archetype: {arch}', content, count=1, flags=re.M)
if n == 0:
    new_content = re.sub(r'(^---\n(?:.*?\n)*?name:.*?\n)', rf'\1archetype: {arch}\n', content, count=1, flags=re.M)
open(p, 'w').write(new_content)
"
    fi
    updated=$((updated + 1))
  fi
done < "$TABLE"
echo "Updated frontmatter in $updated SKILL.md files."

echo ""
echo "=========================================="
echo "Stage C: Rewriting plugin.json"
echo "=========================================="
python3 << 'PYEOF'
import json, csv

# Load move table
moves = {}
with open('cagents-memory-staging/file-move-table.tsv') as f:
    for line in f:
        parts = line.rstrip('\n').split('\t')
        if len(parts) >= 2:
            old, new = parts[0], parts[1]
            moves['./' + old] = './' + new

# Rewrite plugin.json
with open('.claude-plugin/plugin.json') as f:
    plugin = json.load(f)

new_agents = []
unmapped = []
for path in plugin['agents']:
    if path in moves:
        new_agents.append(moves[path])
    else:
        unmapped.append(path)
        new_agents.append(path)

plugin['agents'] = sorted(new_agents)

with open('.claude-plugin/plugin.json', 'w') as f:
    json.dump(plugin, f, indent=2)
    f.write('\n')

print(f"Rewrote {len(new_agents)} agent paths in plugin.json.")
if unmapped:
    print(f"  WARN: {len(unmapped)} paths had no move-table entry:")
    for p in unmapped[:10]:
        print(f"    {p}")
PYEOF

echo ""
echo "=========================================="
echo "Stage D: Rewriting planner_config.yaml controller_catalogs"
echo "=========================================="
# These files contain hardcoded agent paths in controller_catalog sections.
# Sweep all old domain paths to new tree paths.
python3 << 'PYEOF'
import re, os, glob

# Build path-substitution map from move table
subs = {}
with open('cagents-memory-staging/file-move-table.tsv') as f:
    for line in f:
        parts = line.rstrip('\n').split('\t')
        if len(parts) >= 2:
            subs[parts[0]] = parts[1]
            # Also map without /SKILL.md suffix
            old_dir = os.path.dirname(parts[0])
            new_dir = os.path.dirname(parts[1])
            subs[old_dir] = new_dir

# Find all yaml configs to sweep
config_files = []
for pattern in ['*/config/*.yaml', 'shared/config/*.yaml', 'cagents-memory/_system/**/*.yaml', 'cagents-memory/_system/**/*.yaml']:
    config_files.extend(glob.glob(pattern, recursive=True))

# Filter to existing files
config_files = [f for f in config_files if os.path.isfile(f)]

print(f"Sweeping {len(config_files)} config files...")
total_replacements = 0
for fpath in config_files:
    with open(fpath) as f:
        content = f.read()
    original = content
    # Sort by length desc to do longer paths first (avoid prefix conflicts)
    for old_path in sorted(subs.keys(), key=len, reverse=True):
        new_path = subs[old_path]
        if old_path in content:
            content = content.replace(old_path, new_path)
    if content != original:
        with open(fpath, 'w') as f:
            f.write(content)
        replacements = sum(1 for o in subs if o in original) - sum(1 for o in subs if o in content)
        total_replacements += replacements
        print(f"  Updated: {fpath}")

print(f"Total config files updated.")
PYEOF

echo ""
echo "=========================================="
echo "Stage E: Cleanup empty old domain dirs"
echo "=========================================="
# After git mv, the old {domain}/agents/ dirs should be empty (or only have config/).
# Remove empty agents/ subdirs but keep config/.
for d in arts business creative core education engineering growth health leadership people personal science service shared trades; do
  if [ -d "$d/agents" ]; then
    if [ -z "$(ls -A "$d/agents" 2>/dev/null)" ]; then
      rmdir "$d/agents"
      echo "  Removed empty: $d/agents/"
    else
      echo "  WARN: $d/agents/ not empty — contents:"
      ls "$d/agents" | head -5 | sed 's/^/    /'
    fi
  fi
done

# Also remove empty domain dirs if they have NOTHING left
for d in arts education health personal trades science shared; do
  # These domains had no config/ dir or just leftover dirs; check
  if [ -d "$d" ] && [ -z "$(ls -A "$d" 2>/dev/null)" ]; then
    rmdir "$d"
    echo "  Removed empty domain dir: $d/"
  fi
done

echo ""
echo "=========================================="
echo "Stage A-E complete. Verify with:"
echo "  find developer operator advisor analyst creator writer strategist core leadership -name SKILL.md | wc -l"
echo "  npm test"
echo ""
echo "Stage F (cagents-memory rename) is in scripts/migrate-v11.1.0-rename.sh"
echo "Run that AFTER verifying Stage A-E."
echo "=========================================="
