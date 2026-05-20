import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const DOMAINS = ['engineering', 'creative', 'business', 'growth', 'people', 'service', 'leadership', 'shared'];

function loadOverrides(domain) {
  const filePath = join(PROJECT_ROOT, domain, 'config', 'domain_overrides.yaml');
  return readFileSync(filePath, 'utf8');
}

describe('domain_overrides.yaml files', () => {
  describe('all 8 domains have override configs', () => {
    for (const domain of DOMAINS) {
      it(`should have ${domain}/config/domain_overrides.yaml`, () => {
        const filePath = join(PROJECT_ROOT, domain, 'config', 'domain_overrides.yaml');
        expect(existsSync(filePath)).toBe(true);
      });
    }
  });

  describe('each config has required structure', () => {
    for (const domain of DOMAINS) {
      it(`${domain} should declare its domain name`, () => {
        const content = loadOverrides(domain);
        expect(content).toMatch(new RegExp(`^domain:\\s*${domain}`, 'm'));
      });

      it(`${domain} should have a description`, () => {
        const content = loadOverrides(domain);
        expect(content).toContain('description:');
      });
    }
  });

  describe('routable domains have keywords', () => {
    const routableDomains = ['engineering', 'creative', 'business', 'growth', 'people', 'service'];

    for (const domain of routableDomains) {
      it(`${domain} should have router keywords`, () => {
        const content = loadOverrides(domain);
        expect(content).toContain('keywords:');
        // Should have at least 5 keywords
        const keywordLines = content.split('\n').filter(l => /^\s+-\s+/.test(l));
        expect(keywordLines.length).toBeGreaterThanOrEqual(5);
      });
    }
  });

  describe('non-routable domains have empty keywords', () => {
    it('leadership should have empty keywords', () => {
      const content = loadOverrides('leadership');
      expect(content).toContain('keywords: []');
    });
  });

  describe('shared domain is directly routable', () => {
    it('shared should have router keywords', () => {
      const content = loadOverrides('shared');
      expect(content).toContain('keywords:');
      const keywordLines = content.split('\n').filter(l => /^\s+-\s+/.test(l));
      expect(keywordLines.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('controller catalogs', () => {
    it('engineering should have tier_2 through tier_4 controllers', () => {
      const content = loadOverrides('engineering');
      expect(content).toContain('tier_2:');
      expect(content).toContain('tier_3:');
      expect(content).toContain('tier_4:');
      expect(content).toContain('tech-lead');
    });

    it('creative should have narrative-director as tier_2 controller', () => {
      const content = loadOverrides('creative');
      expect(content).toContain('tier_2:');
      expect(content).toContain('narrative-director');
    });

    it('business should have operations-manager and product-owner', () => {
      const content = loadOverrides('business');
      expect(content).toContain('operations-manager');
      expect(content).toContain('product-owner');
    });

    it('business tier_4 should include cpo', () => {
      const content = loadOverrides('business');
      expect(content).toMatch(/tier_4:.*cpo/s);
    });

    it('people should have hr-manager as tier_2 controller', () => {
      const content = loadOverrides('people');
      expect(content).toContain('hr-manager');
    });

    it('service should have customer-success-manager and general-counsel', () => {
      const content = loadOverrides('service');
      expect(content).toContain('customer-success-manager');
      expect(content).toContain('general-counsel');
    });

    it('leadership should only have tier_4 (C-suite)', () => {
      const content = loadOverrides('leadership');
      expect(content).toContain('tier_4:');
      expect(content).not.toMatch(/tier_2:/);
      expect(content).not.toMatch(/tier_3:/);
      expect(content).toContain('ceo');
      expect(content).toContain('cto');
      expect(content).toContain('cfo');
    });

    it('shared should have controller_catalog with tier_2 and tier_3', () => {
      const content = loadOverrides('shared');
      expect(content).toContain('controller_catalog:');
      expect(content).toContain('tier_2:');
      expect(content).toContain('tier_3:');
      expect(content).toContain('bi-specialist');
      expect(content).toContain('data-scientist');
    });

    it('growth should have campaign-manager as tier_2 controller', () => {
      const content = loadOverrides('growth');
      expect(content).toContain('tier_2:');
      expect(content).toContain('campaign-manager');
    });
  });
});
