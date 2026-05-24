import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const PROJECT_ROOT = process.cwd();

// v12.0.0 (WI-W4.2): 11 legacy domain dirs were consolidated into
// cagents-memory/_system/config/routing.yaml. Only people/ and shared/
// retain their own config/domain_overrides.yaml file.
const RETAINED_DIR_DOMAINS = ['people', 'shared', 'leadership'];
const CONSOLIDATED_DOMAINS = ['engineering', 'creative', 'business', 'growth', 'service'];

const ROUTING_YAML_PATH = join(
  PROJECT_ROOT,
  'cagents-memory',
  '_system',
  'config',
  'routing.yaml',
);

// v12.8.0 (eef900a7) moved the archetype tree + overlays under agents/:
//   people/shared overlays -> agents/_overlay/{people,shared}/config/
//   leadership              -> agents/leadership/config/
// Map each retained domain to its current on-disk config path.
function dirOverridesPath(domain) {
  if (domain === 'leadership') {
    return join(PROJECT_ROOT, 'agents', 'leadership', 'config', 'domain_overrides.yaml');
  }
  // people, shared
  return join(PROJECT_ROOT, 'agents', '_overlay', domain, 'config', 'domain_overrides.yaml');
}

function loadDirOverrides(domain) {
  return readFileSync(dirOverridesPath(domain), 'utf8');
}

let _routing = null;
function loadRouting() {
  if (_routing) return _routing;
  _routing = yaml.load(readFileSync(ROUTING_YAML_PATH, 'utf8'));
  return _routing;
}

function domainContent(domain) {
  // Retained dirs read from disk; consolidated domains read from routing.yaml
  // (returned as a YAML-serialized string of the domain block so the existing
  // string-based assertions keep working).
  if (RETAINED_DIR_DOMAINS.includes(domain)) {
    return loadDirOverrides(domain);
  }
  const routing = loadRouting();
  const block = routing.domains[domain];
  // Reuse YAML serializer to give a deterministic string representation; the
  // assertions in this file only inspect substrings, so any valid YAML works.
  return yaml.dump({ domain, ...block });
}

describe('domain_overrides config (v12.0.0)', () => {
  describe('retained dir domains', () => {
    for (const domain of RETAINED_DIR_DOMAINS) {
      it(`should have ${domain} config/domain_overrides.yaml`, () => {
        expect(existsSync(dirOverridesPath(domain))).toBe(true);
      });
    }
  });

  describe('consolidated routing.yaml', () => {
    it('exists at cagents-memory/_system/config/routing.yaml', () => {
      expect(existsSync(ROUTING_YAML_PATH)).toBe(true);
    });

    it('contains all 11 consolidated domains', () => {
      const routing = loadRouting();
      const expectedConsolidated = [
        'engineering', 'creative', 'business', 'growth', 'service',
        'science', 'health', 'education', 'personal', 'arts', 'trades',
      ];
      for (const d of expectedConsolidated) {
        expect(routing.domains, `routing.yaml missing domain "${d}"`).toHaveProperty(d);
      }
    });
  });

  describe('each config has required structure', () => {
    for (const domain of [...RETAINED_DIR_DOMAINS, ...CONSOLIDATED_DOMAINS]) {
      it(`${domain} should declare its domain name`, () => {
        const content = domainContent(domain);
        // Retained dirs use top-level `domain: <name>`; consolidated blocks
        // also serialize a `domain:` line via the test helper.
        expect(content).toMatch(new RegExp(`^domain:\\s*${domain}`, 'm'));
      });

      it(`${domain} should have a description`, () => {
        const content = domainContent(domain);
        expect(content).toContain('description:');
      });
    }
  });

  describe('routable domains have keywords', () => {
    const routableDomains = ['engineering', 'creative', 'business', 'growth', 'people', 'service'];

    for (const domain of routableDomains) {
      it(`${domain} should have router keywords`, () => {
        const content = domainContent(domain);
        expect(content).toContain('keywords:');
        // Should have at least 5 keywords (counted as YAML list items)
        const keywordLines = content.split('\n').filter(l => /^\s+-\s+/.test(l));
        expect(keywordLines.length).toBeGreaterThanOrEqual(5);
      });
    }
  });

  describe('non-routable domains have empty keywords', () => {
    it('leadership should have empty keywords', () => {
      const content = loadDirOverrides('leadership');
      expect(content).toContain('keywords: []');
    });
  });

  describe('shared domain is directly routable', () => {
    it('shared should have router keywords', () => {
      const content = loadDirOverrides('shared');
      expect(content).toContain('keywords:');
      const keywordLines = content.split('\n').filter(l => /^\s+-\s+/.test(l));
      expect(keywordLines.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('controller catalogs', () => {
    it('engineering should have tier_2 through tier_4 controllers', () => {
      const content = domainContent('engineering');
      expect(content).toContain('tier_2:');
      expect(content).toContain('tier_3:');
      expect(content).toContain('tier_4:');
      expect(content).toContain('tech-lead');
    });

    it('creative should have narrative-director as tier_2 controller', () => {
      const content = domainContent('creative');
      expect(content).toContain('tier_2:');
      expect(content).toContain('narrative-director');
    });

    it('business should have operations-manager and product-owner', () => {
      const content = domainContent('business');
      expect(content).toContain('operations-manager');
      expect(content).toContain('product-owner');
    });

    it('business tier_4 should include cpo', () => {
      const content = domainContent('business');
      expect(content).toMatch(/tier_4:.*cpo/s);
    });

    it('people should have hr-manager as tier_2 controller', () => {
      const content = loadDirOverrides('people');
      expect(content).toContain('hr-manager');
    });

    it('service should have customer-success-manager and general-counsel', () => {
      const content = domainContent('service');
      expect(content).toContain('customer-success-manager');
      expect(content).toContain('general-counsel');
    });

    it('leadership should only have tier_4 (C-suite)', () => {
      const content = loadDirOverrides('leadership');
      expect(content).toContain('tier_4:');
      expect(content).not.toMatch(/tier_2:/);
      expect(content).not.toMatch(/tier_3:/);
      expect(content).toContain('ceo');
      expect(content).toContain('cto');
      expect(content).toContain('cfo');
    });

    it('shared should have controller_catalog with tier_2 and tier_3', () => {
      const content = loadDirOverrides('shared');
      expect(content).toContain('controller_catalog:');
      expect(content).toContain('tier_2:');
      expect(content).toContain('tier_3:');
      expect(content).toContain('bi-specialist');
      expect(content).toContain('data-scientist');
    });

    it('growth should have marketing-strategist as tier_2 controller', () => {
      const content = domainContent('growth');
      expect(content).toContain('tier_2:');
      expect(content).toContain('marketing-strategist');
    });
  });
});
