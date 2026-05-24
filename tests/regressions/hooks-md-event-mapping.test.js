import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.7 (Q-002 / F-hooks-001 + dedup F-hooks-002).
 *
 * Bug: skill-size-monitor.cjs returns { deny: true } at the 900-line block
 *      threshold, but was registered under PostToolUse in .claude/settings.json.
 *      PostToolUse is documented in hooks.md as "Cannot block" — so the block
 *      threshold was a silent no-op. hooks.md prose correctly documented the
 *      hook as PreToolUse[Write|Edit], but settings.json registered it as
 *      PostToolUse[Write|Edit] — registration/documentation drift.
 * Root cause: no regression test enforced consistency between settings.json
 *      hook registrations and hooks.md subsection headings.
 * Test added: this file. Parses settings.json and hooks.md, asserts
 *      bidirectional consistency on (event, matcher, hook_name) tuples.
 *      Catches any future registration/documentation drift.
 *
 * Failing-before evidence: at HEAD (v11.2.6), this test FAILS because
 *      settings.json registers skill-size-monitor under PostToolUse[Write|Edit]
 *      but hooks.md documents it under PreToolUse[Write|Edit].
 * Passing-after evidence: after moving the settings.json registration to
 *      PreToolUse[Write|Edit], every registered hook has a matching heading
 *      and vice versa.
 */

const ROOT = process.cwd();
const SETTINGS_PATH = join(ROOT, '.claude', 'settings.json');
// v12.7.0 moved per-hook detail out of hooks.md into resources/hook-catalog.md.
// The per-hook "### Event[Matcher]: name.cjs" headings now live in the catalog,
// so the bidirectional registration/documentation consistency check parses it.
const HOOKS_MD_PATH = join(ROOT, '.claude', 'rules', 'core', 'resources', 'hook-catalog.md');

// Heading patterns inside the "CLI Tool (Not a registered hook)" subsection are
// documented for tooling but not registered hooks. We must skip them.
const CLI_TOOL_SECTION = '## CLI Tool (Not a registered hook)';

/**
 * Parse .claude/settings.json and return an array of
 *   { event, matcher, hook_name }
 * tuples for every registered hook. `matcher` is null when the event has no
 * matcher block.
 */
function parseSettingsTuples(settingsJson) {
  const parsed = JSON.parse(settingsJson);
  const hooksBlock = parsed.hooks || {};
  const tuples = [];
  for (const event of Object.keys(hooksBlock)) {
    const entries = hooksBlock[event];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const matcher = typeof entry.matcher === 'string' ? entry.matcher : null;
      const inner = Array.isArray(entry.hooks) ? entry.hooks : [];
      for (const hk of inner) {
        if (hk.type !== 'command' || typeof hk.command !== 'string') continue;
        // Command pattern: ... run-hook.cjs <hook-name>'
        // Extract the trailing token after run-hook.cjs.
        const m = hk.command.match(/run-hook\.cjs"\s+([a-z0-9-]+)/);
        if (!m) continue;
        tuples.push({ event, matcher, hook_name: m[1] });
      }
    }
  }
  return tuples;
}

/**
 * Parse hooks.md and return an array of
 *   { event, matcher, hook_name }
 * tuples for every "#### {Event}[{Matcher}]: {name}.cjs" or
 * "#### {Event}: {name}.cjs" subsection heading in the Active Hooks section.
 * Multi-hook headings ("X.cjs + Y.cjs") yield one tuple per name.
 * Headings inside the "CLI Tool (Not a registered hook)" subsection are
 * excluded.
 */
function parseHooksMdTuples(hooksMdContent) {
  const lines = hooksMdContent.split('\n');
  const tuples = [];
  // Skip the table-of-contents intro; we only look at "####" subsections.
  // Track when we enter/exit the CLI Tool subsection so we can skip it.
  let inCliToolSection = false;
  // The CLI Tool subsection is followed (in document order) only by a single
  // subsection (#### eval-runner.cjs). It's terminated by the next ## or # heading.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === CLI_TOOL_SECTION) {
      inCliToolSection = true;
      continue;
    }
    // Exit CLI Tool section on the next ## section heading (catalog uses ##
    // for sections and ### for per-hook entries). Keep skipping ### entries
    // (e.g. ### eval-runner.cjs) until the next ## section.
    if (inCliToolSection && /^##\s/.test(line) && line.trim() !== CLI_TOOL_SECTION) {
      inCliToolSection = false;
    }
    if (inCliToolSection) continue;
    // Match per-hook heading patterns in resources/hook-catalog.md:
    //   ### Event[Matcher]: hook-name.cjs
    //   ### Event[Matcher]: hook-a.cjs + hook-b.cjs
    //   ### Event: hook-name.cjs
    //   ### Event: hook-a.cjs + hook-b.cjs
    const heading = line.match(/^###\s+([A-Za-z]+)(?:\[([^\]]+)\])?:\s+(.+)\s*$/);
    if (!heading) continue;
    const event = heading[1];
    const matcher = heading[2] || null;
    const namesPart = heading[3];
    // Extract every "*.cjs" token from the names part.
    const cjsNames = (namesPart.match(/([a-z0-9-]+)\.cjs/g) || []).map((s) =>
      s.replace(/\.cjs$/, '')
    );
    for (const hookName of cjsNames) {
      tuples.push({ event, matcher, hook_name: hookName });
    }
  }
  return tuples;
}

function tupleKey(t) {
  return `${t.event}|${t.matcher || ''}|${t.hook_name}`;
}

describe('hooks-md-event-mapping: bidirectional registration/documentation consistency', () => {
  it('settings.json exists and parses', () => {
    expect(existsSync(SETTINGS_PATH)).toBe(true);
    const content = readFileSync(SETTINGS_PATH, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('hooks.md exists', () => {
    expect(existsSync(HOOKS_MD_PATH)).toBe(true);
  });

  it('parseSettingsTuples extracts at least 20 registered hook tuples', () => {
    const content = readFileSync(SETTINGS_PATH, 'utf8');
    const tuples = parseSettingsTuples(content);
    expect(tuples.length).toBeGreaterThan(20);
  });

  it('parseHooksMdTuples extracts at least 20 documented hook tuples', () => {
    const content = readFileSync(HOOKS_MD_PATH, 'utf8');
    const tuples = parseHooksMdTuples(content);
    expect(tuples.length).toBeGreaterThan(20);
  });

  it('every settings.json registration has a matching hooks.md heading (event + matcher + hook_name)', () => {
    const settingsContent = readFileSync(SETTINGS_PATH, 'utf8');
    const mdContent = readFileSync(HOOKS_MD_PATH, 'utf8');
    const settingsTuples = parseSettingsTuples(settingsContent);
    const mdTuples = parseHooksMdTuples(mdContent);
    const mdKeys = new Set(mdTuples.map(tupleKey));

    const missing = [];
    for (const t of settingsTuples) {
      if (!mdKeys.has(tupleKey(t))) {
        missing.push(`${t.event}[${t.matcher || ''}]: ${t.hook_name}.cjs`);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Registered in settings.json but missing/mismatched in hooks.md (${missing.length}):\n  ` +
          missing.join('\n  ')
      );
    }
    expect(missing).toEqual([]);
  });

  it('every hooks.md heading has a matching settings.json registration (event + matcher + hook_name)', () => {
    const settingsContent = readFileSync(SETTINGS_PATH, 'utf8');
    const mdContent = readFileSync(HOOKS_MD_PATH, 'utf8');
    const settingsTuples = parseSettingsTuples(settingsContent);
    const mdTuples = parseHooksMdTuples(mdContent);
    const settingsKeys = new Set(settingsTuples.map(tupleKey));

    const missing = [];
    for (const t of mdTuples) {
      if (!settingsKeys.has(tupleKey(t))) {
        missing.push(`${t.event}[${t.matcher || ''}]: ${t.hook_name}.cjs`);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Documented in hooks.md but missing/mismatched in settings.json (${missing.length}):\n  ` +
          missing.join('\n  ')
      );
    }
    expect(missing).toEqual([]);
  });
});
