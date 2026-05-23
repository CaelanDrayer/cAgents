#!/usr/bin/env node
/**
 * scripts/ci/validate-planner-output.cjs
 *
 * Pre-Execution Check 0: validate the planner-emitted YAML files (`plan.yaml`
 * and `work_items.yaml`) BEFORE the controller spawns any execution agent.
 *
 * This is the first gate in the controller's pre-execution checklist
 * (see `.claude/rules/core/resources/controller-validation-checklist.md`).
 * If the planner output is malformed, every downstream check is operating
 * on garbage — so we fail fast here and surface a structured error.
 *
 * Usage:
 *   node scripts/ci/validate-planner-output.cjs \
 *     --plan <path/to/plan.yaml> \
 *     --work-items <path/to/work_items.yaml>
 *
 * Exit codes:
 *   0   PASS — both files parse and satisfy the minimum schema.
 *   1   FAIL — at least one schema violation (details on stderr).
 *   2   USAGE — missing or unreadable input files.
 *
 * Contract (intentionally minimal — broader checks live in the validator pipeline):
 *   plan.yaml MUST contain:
 *     - plan_id (non-empty string)
 *     - tier (integer 2, 3, or 4)
 *     - domain (non-empty string)
 *     - mission (non-empty string)
 *     - objectives (non-empty list; every entry has `id` + `description`)
 *     - controller_assignment.primary (non-empty string)
 *     - success_criteria (non-empty list of strings) at plan root OR on every objective
 *
 *   work_items.yaml MUST contain:
 *     - work_items OR items (non-empty list)
 *     - every list entry has:
 *         - id (non-empty string)
 *         - title (non-empty string)
 *         - assigned_to (non-empty string)
 *         - acceptance_criteria (non-empty list; each entry either a string
 *           or an object with a `criterion` string)
 */
'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

function parseArgs(argv) {
  const args = { plan: null, workItems: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--plan' && i + 1 < argv.length) {
      args.plan = argv[++i];
    } else if (arg === '--work-items' && i + 1 < argv.length) {
      args.workItems = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function usage() {
  process.stderr.write(
    'Usage: validate-planner-output.cjs --plan <plan.yaml> --work-items <work_items.yaml>\n'
  );
}

function loadYaml(file, kind, errors) {
  if (!file) {
    errors.push(`Missing --${kind} argument`);
    return null;
  }
  if (!fs.existsSync(file)) {
    errors.push(`${kind} file does not exist: ${file}`);
    return null;
  }
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    errors.push(`Cannot read ${kind} file ${file}: ${err.message}`);
    return null;
  }
  try {
    return yaml.load(raw);
  } catch (err) {
    errors.push(`${kind} YAML parse error in ${file}: ${err.message}`);
    return null;
  }
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function validatePlan(plan, errors) {
  if (!plan || typeof plan !== 'object') {
    errors.push('plan.yaml: root must be an object');
    return;
  }
  if (!nonEmptyString(plan.plan_id)) {
    errors.push('plan.yaml: missing or empty `plan_id`');
  }
  // tier may be a number or numeric string; require it to coerce to 2/3/4
  const tierNum = Number(plan.tier);
  if (!Number.isInteger(tierNum) || ![2, 3, 4].includes(tierNum)) {
    errors.push('plan.yaml: `tier` must be one of 2, 3, 4');
  }
  if (!nonEmptyString(plan.domain)) {
    errors.push('plan.yaml: missing or empty `domain`');
  }
  if (!nonEmptyString(plan.mission)) {
    errors.push('plan.yaml: missing or empty `mission`');
  }
  if (!nonEmptyArray(plan.objectives)) {
    errors.push('plan.yaml: `objectives` must be a non-empty list');
  } else {
    plan.objectives.forEach((obj, idx) => {
      if (!obj || typeof obj !== 'object') {
        errors.push(`plan.yaml: objectives[${idx}] must be an object`);
        return;
      }
      if (!nonEmptyString(obj.id)) {
        errors.push(`plan.yaml: objectives[${idx}].id missing or empty`);
      }
      if (!nonEmptyString(obj.description)) {
        errors.push(`plan.yaml: objectives[${idx}].description missing or empty`);
      }
    });
  }
  if (!plan.controller_assignment || typeof plan.controller_assignment !== 'object') {
    errors.push('plan.yaml: missing `controller_assignment` block');
  } else if (!nonEmptyString(plan.controller_assignment.primary)) {
    errors.push('plan.yaml: missing or empty `controller_assignment.primary`');
  }
  // success_criteria may live at plan root OR per-objective. Accept either:
  // - root-level non-empty list, OR
  // - every objective declares its own non-empty success_criteria list.
  const hasRootCriteria = nonEmptyArray(plan.success_criteria);
  const objectives = Array.isArray(plan.objectives) ? plan.objectives : [];
  const allObjsHaveCriteria =
    objectives.length > 0 &&
    objectives.every((o) => o && typeof o === 'object' && nonEmptyArray(o.success_criteria));
  if (!hasRootCriteria && !allObjsHaveCriteria) {
    errors.push(
      'plan.yaml: `success_criteria` must be present either at plan root or on every objective'
    );
  }
}

function validateWorkItems(doc, errors) {
  if (!doc || typeof doc !== 'object') {
    errors.push('work_items.yaml: root must be an object');
    return;
  }
  // Accept both `work_items:` (canonical) and `items:` (overlay/team variant)
  const list = doc.work_items || doc.items;
  if (!nonEmptyArray(list)) {
    errors.push('work_items.yaml: `work_items` (or `items`) must be a non-empty list');
    return;
  }
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`work_items.yaml: item[${idx}] must be an object`);
      return;
    }
    if (!nonEmptyString(item.id)) {
      errors.push(`work_items.yaml: item[${idx}].id missing or empty`);
    }
    if (!nonEmptyString(item.title)) {
      errors.push(`work_items.yaml: item[${idx}].title missing or empty`);
    }
    if (!nonEmptyString(item.assigned_to)) {
      errors.push(`work_items.yaml: item[${idx}].assigned_to missing or empty`);
    }
    if (!nonEmptyArray(item.acceptance_criteria)) {
      errors.push(
        `work_items.yaml: item[${idx}] (${item.id || 'unknown'}) missing or empty acceptance_criteria`
      );
    } else {
      item.acceptance_criteria.forEach((c, ci) => {
        if (typeof c === 'string') {
          if (!nonEmptyString(c)) {
            errors.push(
              `work_items.yaml: item[${idx}].acceptance_criteria[${ci}] is empty`
            );
          }
        } else if (c && typeof c === 'object') {
          if (!nonEmptyString(c.criterion)) {
            errors.push(
              `work_items.yaml: item[${idx}].acceptance_criteria[${ci}].criterion missing or empty`
            );
          }
        } else {
          errors.push(
            `work_items.yaml: item[${idx}].acceptance_criteria[${ci}] must be a string or {criterion: string}`
          );
        }
      });
    }
  });
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (!args.plan || !args.workItems) {
    usage();
    process.exit(2);
  }

  const errors = [];
  const plan = loadYaml(args.plan, 'plan', errors);
  const work = loadYaml(args.workItems, 'work-items', errors);

  if (plan) validatePlan(plan, errors);
  if (work) validateWorkItems(work, errors);

  if (errors.length > 0) {
    process.stderr.write('[Check 0] Planner output schema validation FAILED:\n');
    for (const err of errors) {
      process.stderr.write(`  - ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('[Check 0] Planner output schema OK\n');
  process.exit(0);
}

main();
