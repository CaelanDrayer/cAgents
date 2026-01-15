# Scripts Directory Audit

**Date**: 2026-01-13
**Audited By**: Optimization workflow inst_20260113_006
**Status**: Audit complete, recommendations provided

---

## Summary

The `scripts/` directory contains **2 scripts** from previous versions (V3) that are likely obsolete for V7.0.

---

## Scripts Found

### 1. `launch_v3_consolidation.sh`

**Type**: Bash shell script
**Size**: 5,866 bytes
**Permissions**: Executable
**Created**: 2026-01-10

**Purpose** (from code inspection):
- Launches "V3 Consolidation Workflow"
- References `V3_EXECUTABLE_WORKFLOW_PLAN.md` (not found in project)
- Automates V3 consolidation phases

**Status**: ⚠️ **OBSOLETE**

**Rationale**:
- References V3 architecture (we're on V7.0)
- Depends on V3_EXECUTABLE_WORKFLOW_PLAN.md which doesn't exist
- V3 → V7.0 is 4 major versions old
- Consolidation approach changed significantly in V5.0/V7.0

**Recommendation**: **Archive to `archive/scripts/v3/`**

**Risk of Removal**: LOW
- Script won't work (missing V3_EXECUTABLE_WORKFLOW_PLAN.md)
- V3 architecture no longer exists
- Safe to archive

---

### 2. `migrate_to_token_based.py`

**Type**: Python script
**Size**: 5,346 bytes
**Permissions**: Read-only
**Created**: 2026-01-12 (recent!)

**Purpose** (from code inspection):
- Migrates planner configs from time-based to token-based measurements
- Converts `estimated_effort` (hours) to `token_budget` (tokens)
- Processes all domain configs in `Agent_Memory/_system/domains/`
- Time-to-token mapping defined

**Status**: ⚠️ **ONE-TIME MIGRATION** (Likely complete)

**Rationale**:
- Script is for a specific migration (time → tokens)
- Created recently (Jan 12) - migration may have just completed
- If migration is done, script is no longer needed

**Recommendation**: **Verify migration complete, then archive**

**Verification Steps**:
1. Check if any domain configs still use time-based estimates:
   ```bash
   grep -r "estimated_effort.*hours" Agent_Memory/_system/domains/
   ```
2. If none found, migration is complete → archive script
3. If found, migration incomplete → keep script, run it, then archive

**Risk of Removal**: MEDIUM
- If migration incomplete, script may be needed
- Verify first before archiving

---

## Archive Structure

Recommended archive organization:

```
archive/scripts/
├── v3/
│   └── launch_v3_consolidation.sh    # V3 consolidation launcher
└── migrations/
    └── migrate_to_token_based.py      # One-time token migration
```

---

## Cleanup Actions

### Step 1: Verify Token Migration Complete

```bash
# Check for time-based estimates
grep -r "estimated_effort.*hours\|estimated_effort.*minutes" \
  Agent_Memory/_system/domains/ | wc -l

# If result is 0, migration is complete
# If result is >0, migration is incomplete
```

### Step 2: Create Archive Structure

```bash
mkdir -p archive/scripts/{v3,migrations}
```

### Step 3: Move Scripts

```bash
# V3 consolidation (safe to move immediately)
mv scripts/launch_v3_consolidation.sh archive/scripts/v3/

# Token migration (after verification)
mv scripts/migrate_to_token_based.py archive/scripts/migrations/
```

### Step 4: Document Archive

Create `archive/scripts/README.md`:
```markdown
# Archived Scripts

Historical scripts from previous versions.

## V3 Scripts
- launch_v3_consolidation.sh - V3 consolidation launcher (obsolete)

## Migrations
- migrate_to_token_based.py - One-time time→token migration (completed 2026-01-12)
```

### Step 5: Remove Empty Scripts Directory

```bash
# After moving scripts
rmdir scripts/
```

---

## Current Scripts Directory Status

**Active Scripts**: 0
**Obsolete Scripts**: 1 (launch_v3_consolidation.sh)
**One-Time Migrations**: 1 (migrate_to_token_based.py - verify first)

**Recommendation**: Archive both scripts, remove empty `scripts/` directory

---

## Future Scripts Organization

If new automation scripts are needed:

### Option 1: Keep in scripts/
```
scripts/
├── README.md                    # Script purpose and usage
├── validate_configs.py          # Config validation
├── generate_manifests.js        # Plugin manifest generation
└── lint_agent_docs.py           # Agent documentation linter
```

### Option 2: Move to tools/
```
tools/
├── README.md
├── validation/
│   └── validate_configs.py
├── generation/
│   └── generate_manifests.js
└── linting/
    └── lint_agent_docs.py
```

**Recommended**: Option 2 (tools/) for better organization

---

## Validation Checklist

Before archiving scripts:

- [ ] Verified launch_v3_consolidation.sh is obsolete (V3 → V7.0 = 4 versions old)
- [ ] Verified V3_EXECUTABLE_WORKFLOW_PLAN.md doesn't exist
- [ ] Checked for time-based estimates in domain configs
- [ ] Confirmed token migration complete (or run script first)
- [ ] Created archive/scripts/ structure
- [ ] Moved scripts to archive
- [ ] Created archive/scripts/README.md
- [ ] Removed empty scripts/ directory (if all scripts archived)

---

## Risk Assessment

**launch_v3_consolidation.sh**:
- **Risk of Removal**: ✅ LOW (won't work, references missing V3 plan)
- **Safe to Archive**: Yes

**migrate_to_token_based.py**:
- **Risk of Removal**: ⚠️ MEDIUM (may be needed if migration incomplete)
- **Safe to Archive**: After verification only

---

**Audit Status**: ✅ Complete
**Recommendations**: Clear
**Next Action**: Verify token migration, then archive both scripts
