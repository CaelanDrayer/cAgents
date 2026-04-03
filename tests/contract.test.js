import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const SCHEMAS_DIR = path.join(__dirname, 'schemas');
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'sessions');

// TODO: 16/21 schemas lack fixture-based validation. Only 5 schemas have fixture data:
// instruction, status, agent-tree, coordination-log, work-items. The remaining 16 schemas
// compile and validate structurally but have no session fixture files to test against.
// To improve coverage, add fixture YAML files for: enriched-context, plan, validation-report,
// execution-summary, delegation-prompts, event, decomposition, strategic-brief, routing-decision,
// domain-analysis, objection, integration-report, team-manifest, gate-validation,
// partial-results, child-controllers.

// Skip all contract tests when AgentPath schemas have not been fetched.
// Run `scripts/ci/fetch-schemas.sh` to populate the schemas directory.
const schemasAvailable = fs.existsSync(SCHEMAS_DIR) &&
  fs.readdirSync(SCHEMAS_DIR).some(f => f.endsWith('.schema.json'));

const SESSION_TYPES = ['run_sample', 'team_sample', 'org_sample', 'designer_sample'];

// Load all schemas
function loadSchema(name) {
  const filePath = path.join(SCHEMAS_DIR, name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Load YAML fixture
function loadFixture(sessionType, ...segments) {
  const filePath = path.join(FIXTURES_DIR, sessionType, ...segments);
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

// Create Ajv instance
const ajv = new Ajv({ allErrors: true });

const describeOrSkip = schemasAvailable ? describe : describe.skip;

describeOrSkip('Contract Tests: Session YAML ↔ JSON Schema', () => {
  const instructionSchema = loadSchema('instruction.schema.json');
  const statusSchema = loadSchema('status.schema.json');
  const workItemsSchema = loadSchema('work-items.schema.json');
  const coordinationLogSchema = loadSchema('coordination-log.schema.json');
  const agentTreeSchema = loadSchema('agent-tree.schema.json');

  const validateInstruction = ajv.compile(instructionSchema);
  const validateStatus = ajv.compile(statusSchema);
  const validateWorkItems = ajv.compile(workItemsSchema);
  const validateCoordinationLog = ajv.compile(coordinationLogSchema);
  const validateAgentTree = ajv.compile(agentTreeSchema);

  describe('instruction.yaml validation', () => {
    for (const session of SESSION_TYPES) {
      it(`${session}/instruction.yaml matches instruction schema`, () => {
        const data = loadFixture(session, 'instruction.yaml');
        const valid = validateInstruction(data);
        if (!valid) {
          console.error(`Validation errors for ${session}/instruction.yaml:`, validateInstruction.errors);
        }
        expect(valid).toBe(true);
      });
    }
  });

  describe('status.yaml validation', () => {
    for (const session of SESSION_TYPES) {
      it(`${session}/status.yaml matches status schema`, () => {
        const data = loadFixture(session, 'status.yaml');
        const valid = validateStatus(data);
        if (!valid) {
          console.error(`Validation errors for ${session}/status.yaml:`, validateStatus.errors);
        }
        expect(valid).toBe(true);
      });
    }
  });

  describe('run_sample workflow artifacts', () => {
    it('workflow/work-items.yaml matches work-items schema', () => {
      const data = loadFixture('run_sample', 'workflow', 'work-items.yaml');
      const valid = validateWorkItems(data);
      if (!valid) {
        console.error('Validation errors for work-items.yaml:', validateWorkItems.errors);
      }
      expect(valid).toBe(true);
    });

    it('workflow/coordination-log.yaml matches coordination-log schema', () => {
      const data = loadFixture('run_sample', 'workflow', 'coordination-log.yaml');
      const valid = validateCoordinationLog(data);
      if (!valid) {
        console.error('Validation errors for coordination-log.yaml:', validateCoordinationLog.errors);
      }
      expect(valid).toBe(true);
    });

    it('workflow/agent-tree.yaml matches agent-tree schema', () => {
      const data = loadFixture('run_sample', 'workflow', 'agent-tree.yaml');
      const valid = validateAgentTree(data);
      if (!valid) {
        console.error('Validation errors for agent-tree.yaml:', validateAgentTree.errors);
      }
      expect(valid).toBe(true);
    });
  });
});
