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

    test('should not contain Elasticsearch legacy methods', () => {
      // Verify ES legacy support has been removed
      expect(settingsServiceCode).not.toContain('getElasticsearchRootPath');
      expect(settingsServiceCode).not.toContain('getElasticsearchHost');
    });

    test('service code should use opensearch_root_path setting', () => {
      // Check that the implementation uses the OpenSearch setting
      expect(settingsServiceCode).toContain('OPENSEARCH_ROOT_PATH');
      expect(settingsServiceCode).toContain('opensearch_root_path');
    });
  });

  describe('Configuration', () => {
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

    test('should use opensearch_root_path from settings', () => {
      settingsService.settings = {
        opensearch_root_path: '/opensearch'
      };

      const rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBe('/opensearch');
    });

    test('should return undefined when opensearch_root_path is not set', () => {
      settingsService.settings = {};

      const rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBeUndefined();
    });

    test('should handle empty string path', () => {
      settingsService.settings = {
        opensearch_root_path: ''
      };

      const rootPath = settingsService.getOpenSearchRootPath();
      expect(rootPath).toBe('');
    });
  });

  describe('Docker Environment', () => {
    test('Docker configuration should support KOPF_OPENSEARCH_ROOT_PATH', () => {
      const dockerRunScript = fs.readFileSync(
        path.join(__dirname, '../docker/run.sh'),
        'utf8'
      );

      // Should support KOPF_OPENSEARCH_ROOT_PATH
      expect(dockerRunScript).toContain('KOPF_OPENSEARCH_ROOT_PATH');

      // Should generate opensearch_root_path in config
      expect(dockerRunScript).toContain('opensearch_root_path');
    });

    test('Docker script should not contain Elasticsearch legacy variables', () => {
      const dockerRunScript = fs.readFileSync(
        path.join(__dirname, '../docker/run.sh'),
        'utf8'
      );

      // Should not support old KOPF_ES_ROOT_PATH
      expect(dockerRunScript).not.toContain('KOPF_ES_ROOT_PATH');
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

      // Should use OpenSearch naming
      expect(defaultSettings).toHaveProperty('opensearch_root_path');

      // Should not have Elasticsearch naming
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
      // Check for documentation on methods
      expect(settingsServiceCode).toContain('@returns');
      expect(settingsServiceCode).toContain('OpenSearch');
    });

    test('should not contain Elasticsearch legacy code', () => {
      // Verify no Elasticsearch legacy methods exist
      expect(settingsServiceCode).not.toContain('function getElasticsearchHost');
      expect(settingsServiceCode).not.toContain('function getElasticsearchRootPath');
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

    test('Scenario: Docker deployment with custom root path', () => {
      settingsService.settings = {
        opensearch_root_path: '/custom/path',
        with_credentials: true,
        theme: 'dark',
        refresh_rate: 3000
      };

      expect(settingsService.getOpenSearchRootPath()).toBe('/custom/path');
    });

    test('Scenario: Production environment with standard configuration', () => {
      settingsService.settings = {
        opensearch_root_path: '',
        with_credentials: true,
        theme: 'dark',
        refresh_rate: 5000
      };

      expect(settingsService.getOpenSearchRootPath()).toBe('');
      expect(settingsService.withCredentials()).toBe(true);
    });
  });
});
