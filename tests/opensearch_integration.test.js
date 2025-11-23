/**
 * Integration tests for OpenSearch service with ExternalSettingsService
 * Tests the interaction between settings and OpenSearch connection
 */

const fs = require('fs');
const path = require('path');

// Mock global function
global.isDefined = function(value) {
  return value !== null && value !== undefined;
};

// Load the ExternalSettingsService code
const settingsServiceCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/services/external_settings.js'),
  'utf8'
);

// Load the OpenSearchService code
const opensearchServiceCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/services/opensearch.js'),
  'utf8'
);

describe('OpenSearch Integration Tests', () => {
  describe('ExternalSettingsService and OpenSearchService Integration', () => {
    test('OpenSearchService should use getOpenSearchRootPath from ExternalSettingsService', () => {
      // Verify that OpenSearchService code calls getOpenSearchRootPath
      expect(opensearchServiceCode).toContain('getOpenSearchRootPath');
    });

    test('should maintain backward compatibility with getElasticsearchRootPath', () => {
      // The old method should still be available but deprecated
      expect(settingsServiceCode).toContain('getElasticsearchRootPath');
      expect(settingsServiceCode).toContain('getOpenSearchRootPath');
    });

    test('service code should prefer opensearch_root_path setting', () => {
      // Check that the implementation prioritizes the new setting
      expect(settingsServiceCode).toContain('OPENSEARCH_ROOT_PATH');
      expect(settingsServiceCode).toContain('opensearch_root_path');
    });
  });

  describe('Configuration Precedence', () => {
    let settingsService;
    let mockDebugService;

    beforeEach(() => {
      mockDebugService = {
        debug: jest.fn()
      };

      const factoryMatch = settingsServiceCode.match(
        /function\(DebugService\)\s*\{([\s\S]*)\}\]\);/
      );
      const factoryBody = factoryMatch[1];
      // eslint-disable-next-line no-new-func
      const factory = new Function('DebugService', factoryBody + '\nreturn this;');
      settingsService = factory.call({}, mockDebugService);
    });

    test('should prioritize opensearch_root_path in new configurations', () => {
      settingsService.settings = {
        opensearch_root_path: '/opensearch',
        elasticsearch_root_path: '/old'
      };

      const rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBe('/opensearch');
    });

    test('should support legacy elasticsearch_root_path configuration', () => {
      settingsService.settings = {
        elasticsearch_root_path: '/legacy'
      };

      const rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBe('/legacy');
    });

    test('should handle migration scenario gracefully', () => {
      // Scenario: User updates config from old to new
      settingsService.settings = {
        elasticsearch_root_path: '/old'
      };

      let rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBe('/old');

      // User adds new setting
      settingsService.settings.opensearch_root_path = '/new';

      rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBe('/new');
    });
  });

  describe('Docker Environment Compatibility', () => {
    test('Docker configuration should support both old and new env vars', () => {
      const dockerRunScript = fs.readFileSync(
        path.join(__dirname, '../docker/run.sh'),
        'utf8'
      );

      // Should support new KOPF_OPENSEARCH_ROOT_PATH
      expect(dockerRunScript).toContain('KOPF_OPENSEARCH_ROOT_PATH');

      // Should maintain backward compatibility with KOPF_ES_ROOT_PATH
      expect(dockerRunScript).toContain('KOPF_ES_ROOT_PATH');

      // Should generate opensearch_root_path in config
      expect(dockerRunScript).toContain('opensearch_root_path');
    });

    test('Docker script should prefer new environment variable', () => {
      const dockerRunScript = fs.readFileSync(
        path.join(__dirname, '../docker/run.sh'),
        'utf8'
      );

      // Should use fallback pattern: new var -> old var -> default
      expect(dockerRunScript).toMatch(
        /KOPF_OPENSEARCH_ROOT_PATH:-.*KOPF_ES_ROOT_PATH/
      );
    });
  });

  describe('Default Configuration', () => {
    test('default kopf_external_settings.json should use opensearch naming', () => {
      const defaultSettings = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../_site/kopf_external_settings.json'),
          'utf8'
        )
      );

      // Should use new naming
      expect(defaultSettings).toHaveProperty('opensearch_root_path');

      // Should not have old naming in new installations
      expect(defaultSettings).not.toHaveProperty('elasticsearch_root_path');
    });

    test('default settings should have all required fields', () => {
      const defaultSettings = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../_site/kopf_external_settings.json'),
          'utf8'
        )
      );

      expect(defaultSettings).toHaveProperty('opensearch_root_path');
      expect(defaultSettings).toHaveProperty('with_credentials');
      expect(defaultSettings).toHaveProperty('theme');
      expect(defaultSettings).toHaveProperty('refresh_rate');
    });
  });

  describe('Method Deprecation Strategy', () => {
    let settingsService;

    beforeEach(() => {
      const mockDebugService = {
        debug: jest.fn()
      };

      const factoryMatch = settingsServiceCode.match(
        /function\(DebugService\)\s*\{([\s\S]*)\}\]\);/
      );
      const factoryBody = factoryMatch[1];
      // eslint-disable-next-line no-new-func
      const factory = new Function('DebugService', factoryBody + '\nreturn this;');
      settingsService = factory.call({}, mockDebugService);
    });

    test('deprecated getElasticsearchHost should delegate to new method', () => {
      settingsService.settings = {location: 'http://localhost:9200'};

      const newMethod = settingsService.getOpenSearchHost();
      const deprecatedMethod = settingsService.getElasticsearchHost();

      expect(deprecatedMethod).toBe(newMethod);
    });

    test('deprecated getElasticsearchRootPath should delegate to new method', () => {
      settingsService.settings = {opensearch_root_path: '/opensearch'};

      const newMethod = settingsService.getOpenSearchRootPath();
      const deprecatedMethod = settingsService.getElasticsearchRootPath();

      expect(deprecatedMethod).toBe(newMethod);
    });

    test('both old and new methods should be available', () => {
      expect(typeof settingsService.getOpenSearchHost).toBe('function');
      expect(typeof settingsService.getElasticsearchHost).toBe('function');
      expect(typeof settingsService.getOpenSearchRootPath).toBe('function');
      expect(typeof settingsService.getElasticsearchRootPath).toBe('function');
    });
  });

  describe('Code Consistency', () => {
    test('all relevant files should use consistent OpenSearch naming', () => {
      const filesToCheck = [
        '../src/kopf/services/external_settings.js',
        '../src/kopf/services/opensearch.js',
        '../_site/kopf_external_settings.json',
        '../docker/run.sh'
      ];

      filesToCheck.forEach(file => {
        const content = fs.readFileSync(
          path.join(__dirname, file),
          'utf8'
        );

        // All files should mention opensearch in some form
        expect(
          content.toLowerCase().includes('opensearch')
        ).toBe(true);
      });
    });

    test('source code should have proper JSDoc comments', () => {
      // Check for documentation on new methods
      expect(settingsServiceCode).toContain('@returns');
      expect(settingsServiceCode).toContain('OpenSearch');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    let settingsService;

    beforeEach(() => {
      const mockDebugService = {
        debug: jest.fn()
      };

      const factoryMatch = settingsServiceCode.match(
        /function\(DebugService\)\s*\{([\s\S]*)\}\]\);/
      );
      const factoryBody = factoryMatch[1];
      // eslint-disable-next-line no-new-func
      const factory = new Function('DebugService', factoryBody + '\nreturn this;');
      settingsService = factory.call({}, mockDebugService);
    });

    test('Scenario: Fresh installation with OpenSearch 3', () => {
      settingsService.settings = {
        opensearch_root_path: '',
        with_credentials: false,
        theme: 'fess',
        refresh_rate: 5000
      };

      expect(settingsService.getOpenSearchRootPath()).toBe('');
      expect(settingsService.withCredentials()).toBe(false);
      expect(settingsService.getTheme()).toBe('fess');
      expect(settingsService.getRefreshRate()).toBe(5000);
    });

    test('Scenario: Upgrade from old KOPF with Elasticsearch naming', () => {
      settingsService.settings = {
        elasticsearch_root_path: '/es',
        with_credentials: true,
        theme: 'dark',
        refresh_rate: 10000
      };

      // Old config should still work
      expect(settingsService.getOpenSearchRootPath()).toBe('/es');
      expect(settingsService.getElasticsearchRootPath()).toBe('/es');
    });

    test('Scenario: Mixed configuration during migration', () => {
      // User partially migrated config
      settingsService.settings = {
        opensearch_root_path: '/opensearch',
        elasticsearch_root_path: '/old',
        with_credentials: false,
        theme: 'fess',
        refresh_rate: 5000
      };

      // New setting should take precedence
      expect(settingsService.getOpenSearchRootPath()).toBe('/opensearch');

      // Both methods should return the same value
      expect(settingsService.getElasticsearchRootPath()).toBe('/opensearch');
    });

    test('Scenario: Docker deployment with custom root path', () => {
      settingsService.settings = {
        opensearch_root_path: '/custom/path',
        with_credentials: true,
        theme: 'dark',
        refresh_rate: 3000
      };

      expect(settingsService.getOpenSearchRootPath()).toBe('/custom/path');
    });
  });
});
