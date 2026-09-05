/**
 * Shared helpers for the flat agent catalog (v12.68.0).
 *
 * Claude Code discovers plugin agents with a NON-RECURSIVE scan of the
 * plugin's agents/ directory, so agent definitions live at agents/<name>.md
 * and the directory listing IS the catalog. Archetype and branch — which used
 * to be encoded as directory levels — are frontmatter fields.
 *
 * Per-agent resources live at agents/<name>/resources/, referenced from the
 * agent body as `@<name>/resources/<file>.md` (agent-file-relative).
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AGENTS_DIR = join(REPO_ROOT, 'agents');

export const ARCHETYPES = [
  'developer',
  'operator',
  'advisor',
  'analyst',
  'creator',
  'writer',
  'strategist',
  'core',
  'leadership',
];

/** Absolute paths of every active agent definition (agents/<name>.md). */
export function agentFiles() {
  if (!existsSync(AGENTS_DIR)) return [];
  return readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => join(AGENTS_DIR, e.name))
    .sort();
}

/** Agent names (file basenames without the .md extension). */
export function agentNames() {
  return agentFiles().map((f) => f.slice(f.lastIndexOf('/') + 1, -'.md'.length));
}

/** Absolute path of a named agent's definition file. */
export function agentPath(name) {
  return join(AGENTS_DIR, `${name}.md`);
}

/** Raw frontmatter block of an agent file (text between the first two ---). */
export function frontmatterText(file) {
  const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

/** Value of a top-level frontmatter scalar field, or null. */
export function frontmatterField(file, field) {
  const m = frontmatterText(file).match(
    new RegExp(`^${field}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, 'm')
  );
  return m ? m[1].trim() : null;
}

/** {archetype: count} derived from each agent file's frontmatter. */
export function archetypeCounts() {
  const counts = Object.fromEntries(ARCHETYPES.map((a) => [a, 0]));
  for (const file of agentFiles()) {
    const arch = frontmatterField(file, 'archetype');
    if (arch && arch in counts) counts[arch] += 1;
  }
  return counts;
}
