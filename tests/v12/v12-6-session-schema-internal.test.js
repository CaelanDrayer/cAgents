// Regression test for v12.6.0 Pillar 4 (AC-4.3)
// Asserts that .claude/skills/run/reference/session-schema.md is internal-only:
//   - zero AgentPath/agentpath references
//   - contains internal-only framing ("Internal contract" or "NOT a public API")
//   - none of the documented fields are in the removed list

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCHEMA_DOC = path.join(REPO_ROOT, '.claude/skills/run/reference/session-schema.md');

describe('v12.6.0 AC-4.3: session-schema.md is internal-only', () => {
  it('session-schema.md exists', () => {
    expect(existsSync(SCHEMA_DOC)).toBe(true);
  });

  it('contains zero AgentPath/agentpath references', () => {
    const content = readFileSync(SCHEMA_DOC, 'utf8');
    const matches = content.match(/AgentPath|agentpath/gi);
    expect(
      matches,
      `Expected zero AgentPath/agentpath refs, found: ${matches ? matches.join(', ') : 'none'}`
    ).toBeNull();
  });

  it('contains internal-only framing', () => {
    const content = readFileSync(SCHEMA_DOC, 'utf8');
    const hasInternalFraming =
      /internal contract/i.test(content) || /not a public api/i.test(content);
    expect(hasInternalFraming, 'session-schema.md must contain "Internal contract" or "NOT a public API" framing').toBe(true);
  });

  it('does not document removed fields as required emitter outputs', () => {
    const content = readFileSync(SCHEMA_DOC, 'utf8');
    // These fields/files are removed in v12.6.0 — they MUST NOT be documented
    // as required schema fields in the "Schema" section (active prose).
    // Historical/removal notes are allowed (they will mention the field by name
    // with surrounding "removed"/"no longer"/etc. context).
    const REMOVED_FIELDS = [
      'wave_structure.yaml',
      'domain_status.yaml',
      'partial_results.yaml',
      'delegation_prompts.yaml',
    ];
    for (const field of REMOVED_FIELDS) {
      // The schema doc should NOT list these as session files anymore.
      // We scan for active "REQUIRED:" annotations naming the field.
      const requiredPattern = new RegExp(`-\\s+\`${field.replace('.', '\\.')}\`.*REQUIRED`, 'i');
      expect(
        requiredPattern.test(content),
        `'${field}' must NOT appear as a REQUIRED schema field in session-schema.md`
      ).toBe(false);
    }
  });

  it('does not document duration_ms / revision_round / validation_cycles / followup_round as required status.yaml fields', () => {
    const content = readFileSync(SCHEMA_DOC, 'utf8');
    const REMOVED_STATUS_FIELDS = [
      'duration_ms',
      'revision_round',
      'validation_cycles',
      'followup_round',
    ];
    for (const field of REMOVED_STATUS_FIELDS) {
      // Forbid the pattern "REQUIRED" appearing on the same line as the field name.
      const lines = content.split('\n');
      const activeLines = lines.filter(line => {
        return line.includes(field) && /REQUIRED/i.test(line);
      });
      expect(
        activeLines,
        `'${field}' must NOT appear with REQUIRED annotation. Found:\n${activeLines.join('\n')}`
      ).toEqual([]);
    }
  });
});
