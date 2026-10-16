/**
 * WI-21 round 4 MF-R3-2: the cagents-memory Write allow rule is anchored.
 *
 * Claude Code (2.1.299, rule resolver Ol()/Voe()/rOt()) resolves a permission
 * path rule by its prefix:
 *   //path  absolute from the filesystem root
 *   ~/path  relative to the home directory
 *   /path   relative to the settings source root (the project root for
 *           projectSettings / localSettings)
 *   path or ./path  root null, so it follows the CURRENT cwd
 * The unanchored `Write(cagents-memory/**)` therefore matched
 * <any cwd>/cagents-memory/**, e.g. <root>/docs/cagents-memory/x/package.json,
 * which let a planted runner config be written without a prompt.
 * `/cagents-memory/**` matches only <project root>/cagents-memory/**.
 *
 * WI-21 round 5 F-R4-S1: Claude Code 2.1.299 never applies a Write(path) rule in
 * file permission checks ("only Edit(path) rules are"); an Edit(path) rule
 * covers the Write tool too. So the allow rule is Edit(/cagents-memory/**), and
 * the deny rules are Edit(//etc/**) (filesystem /etc; a single / would anchor at
 * the project root) and Edit(~/.ssh/**). No Write(path) rule may remain.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const FILES = ['.claude/settings.json', '.claude/settings.full.json'];
const permsOf = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8')).permissions || {};
const allowOf = (rel) => permsOf(rel).allow || [];
const denyOf = (rel) => permsOf(rel).deny || [];

describe('WI-21 MF-R3-2 / F-R4-S1: cagents-memory Edit rule is project-root anchored', () => {
  it.each(FILES)('%s allows Edit(/cagents-memory/**)', (f) => {
    expect(allowOf(f)).toContain('Edit(/cagents-memory/**)');
  });

  it.each(FILES)('%s denies Edit(//etc/**) and Edit(~/.ssh/**)', (f) => {
    expect(denyOf(f)).toContain('Edit(//etc/**)');
    expect(denyOf(f)).toContain('Edit(~/.ssh/**)');
  });

  it.each(FILES)('%s has no inert Write(path) rule in allow, deny or ask', (f) => {
    const p = permsOf(f);
    const all = [...(p.allow || []), ...(p.deny || []), ...(p.ask || [])];
    expect(all.filter((r) => /^Write\(/.test(r))).toEqual([]);
  });

  it.each(FILES)('%s has no cwd-relative cagents-memory Write/Edit rule', (f) => {
    const bad = allowOf(f).filter((r) => /^(Write|Edit|MultiEdit)\((\.\/)?cagents-memory/.test(r));
    expect(bad).toEqual([]);
  });

  it.each(FILES)('%s has no absolute (//) or home (~/) cagents-memory rule', (f) => {
    const bad = allowOf(f).filter((r) => /^(Write|Edit|MultiEdit)\((\/\/|~\/).*cagents-memory/.test(r));
    expect(bad).toEqual([]);
  });
});
