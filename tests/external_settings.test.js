/**
 * Tests for ExternalSettingsService
 * Tests OpenSearch configuration
 */

const fs = require('fs');
const path = require('path');

// Mock global functions used by the service
global.isDefined = function(value) {
  return value !== null && value !== undefined;
};

// Load the service code
const serviceCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/services/external_settings.js'),
  'utf8'
);

describe('ExternalSettingsService', () => {
  let service;
  let mockDebugService;

  beforeEach(() => {
    // Create a mock DebugService
    mockDebugService = {
      debug: jest.fn()
    };

    // Create the service by executing the factory function
    // Extract the factory function from the service code
    const factoryMatch = serviceCode.match(/function\(DebugService\)\s*\{([\s\S]*)\}\]\);/);
    if (!factoryMatch) {
      throw new Error('Could not extract factory function');
    }

    const factoryBody = factoryMatch[1];
    // eslint-disable-next-line no-new-func
    const factory = new Function('DebugService', factoryBody + '\nreturn this;');
    service = factory.call({}, mockDebugService);
  });

  describe('Configuration Variables', () => {
    test('should define OPENSEARCH_ROOT_PATH constant', () => {
      // Check that the code contains the constant
      expect(serviceCode).toContain('opensearch_root_path');
    });

    test('should not contain Elasticsearch legacy naming', () => {
      // Verify ES legacy support has been removed
      expect(serviceCode).not.toContain('getElasticsearchHost');
      expect(serviceCode).not.toContain('getElasticsearchRootPath');
    });
  });

  describe('getOpenSearchHost()', () => {
    test('should return host from settings', () => {
      service.settings = {location: 'http://localhost:9200'};
      expect(service.getOpenSearchHost()).toBe('http://localhost:9200');
    });

    test('should return undefined when location is not set', () => {
      service.settings = {};
      expect(service.getOpenSearchHost()).toBeUndefined();
    });

    test('should handle different host formats', () => {
      const hosts = [
        'http://localhost:9200',
        'https://opensearch.example.com:9200',
        'http://192.168.1.100:9200'
      ];

      hosts.forEach(host => {
        service.settings = {location: host};
        expect(service.getOpenSearchHost()).toBe(host);
      });
    });
  });

  describe('getOpenSearchRootPath()', () => {
    test('should return opensearch_root_path from settings', () => {
      service.settings = {
        opensearch_root_path: '/opensearch'
      };
      expect(service.getOpenSearchRootPath()).toBe('/opensearch');
    });

    test('should return undefined when opensearch_root_path is not set', () => {
      service.settings = {};
      expect(service.getOpenSearchRootPath()).toBeUndefined();
    });

    test('should handle empty string values', () => {
      service.settings = {
        opensearch_root_path: ''
      };
      expect(service.getOpenSearchRootPath()).toBe('');
    });

    test('should handle various path formats', () => {
      const paths = [
        '/opensearch',
        '/cluster/opensearch',
        '',
        '/'
      ];

      paths.forEach(testPath => {
        service.settings = {opensearch_root_path: testPath};
        expect(service.getOpenSearchRootPath()).toBe(testPath);
      });
    });
  });

  describe('withCredentials()', () => {
    test('should return true when with_credentials is true', () => {
      service.settings = {with_credentials: true};
      expect(service.withCredentials()).toBe(true);
    });

    test('should return false when with_credentials is false', () => {
      service.settings = {with_credentials: false};
      expect(service.withCredentials()).toBe(false);
    });
  });

  describe('Refresh Rate', () => {
    test('getRefreshRate should return configured rate', () => {
      service.settings = {refresh_rate: 5000};
      expect(service.getRefreshRate()).toBe(5000);
    });

    test('setRefreshRate should update the rate', () => {
      service.settings = {refresh_rate: 5000};
      const mockSaveSettings = jest.fn();
      service.saveSettings = mockSaveSettings;

      service.setRefreshRate(10000);
      expect(service.settings.refresh_rate).toBe(10000);
      expect(mockSaveSettings).toHaveBeenCalled();
    });
  });

  describe('Theme', () => {
    test('getTheme should return configured theme', () => {
      service.settings = {theme: 'fess'};
      expect(service.getTheme()).toBe('fess');
    });

    test('setTheme should update the theme', () => {
      service.settings = {theme: 'light'};
      const mockSaveSettings = jest.fn();
      service.saveSettings = mockSaveSettings;

      service.setTheme('dark');
      expect(service.settings.theme).toBe('dark');
      expect(mockSaveSettings).toHaveBeenCalled();
    });

    test('should support all theme options', () => {
      const themes = ['fess', 'light', 'dark'];
      themes.forEach(theme => {
        service.settings = {theme: theme};
        expect(service.getTheme()).toBe(theme);
      });
    });
  });

  describe('Real-world Usage Scenarios', () => {
    test('Scenario: Fresh installation with OpenSearch 3', () => {
      service.settings = {
        opensearch_root_path: '',
        with_credentials: false,
        theme: 'fess',
        refresh_rate: 5000
      };

      expect(service.getOpenSearchRootPath()).toBe('');
      expect(service.withCredentials()).toBe(false);
      expect(service.getTheme()).toBe('fess');
      expect(service.getRefreshRate()).toBe(5000);
    });

    test('Scenario: Docker deployment with custom root path', () => {
      service.settings = {
        opensearch_root_path: '/custom/path',
        with_credentials: true,
        theme: 'dark',
        refresh_rate: 3000
      };

      expect(service.getOpenSearchRootPath()).toBe('/custom/path');
    });

    test('Scenario: Default configuration', () => {
      service.settings = {
        opensearch_root_path: '',
        with_credentials: false,
        theme: 'fess',
        refresh_rate: 5000
      };

      expect(service.getOpenSearchRootPath()).toBe('');
      expect(service.getOpenSearchHost()).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle settings being null', () => {
      service.settings = null;
      expect(() => service.getOpenSearchHost()).toThrow();
    });

    test('should handle empty settings object', () => {
      service.settings = {};
      expect(service.getOpenSearchHost()).toBeUndefined();
      expect(service.getOpenSearchRootPath()).toBeUndefined();
    });

    test('should handle numeric values in path (edge case)', () => {
      service.settings = {
        opensearch_root_path: 123  // Wrong type but should still return it
      };
      expect(service.getOpenSearchRootPath()).toBe(123);
    });
  });
});
