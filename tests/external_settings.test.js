/**
 * Tests for ExternalSettingsService
 * Tests OpenSearch configuration and backward compatibility
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
      // Check that the code contains the new constant
      expect(serviceCode).toContain('opensearch_root_path');
    });

    test('should maintain backward compatibility with ES_ROOT_PATH', () => {
      // Check that the code still contains the old constant
      expect(serviceCode).toContain('elasticsearch_root_path');
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

  describe('getElasticsearchHost() [deprecated]', () => {
    test('should delegate to getOpenSearchHost()', () => {
      service.settings = {location: 'http://localhost:9200'};
      expect(service.getElasticsearchHost()).toBe('http://localhost:9200');
    });

    test('should return same value as getOpenSearchHost()', () => {
      service.settings = {location: 'https://test.com:9200'};
      const opensearchHost = service.getOpenSearchHost();
      const elasticsearchHost = service.getElasticsearchHost();
      expect(elasticsearchHost).toBe(opensearchHost);
    });
  });

  describe('getOpenSearchRootPath()', () => {
    test('should prefer opensearch_root_path when both are set', () => {
      service.settings = {
        opensearch_root_path: '/opensearch',
        elasticsearch_root_path: '/elasticsearch'
      };
      expect(service.getOpenSearchRootPath()).toBe('/opensearch');
    });

    test('should fall back to elasticsearch_root_path when opensearch_root_path is not set', () => {
      service.settings = {
        elasticsearch_root_path: '/elasticsearch'
      };
      expect(service.getOpenSearchRootPath()).toBe('/elasticsearch');
    });

    test('should return undefined when neither is set', () => {
      service.settings = {};
      expect(service.getOpenSearchRootPath()).toBeUndefined();
    });

    test('should handle empty string values', () => {
      service.settings = {
        opensearch_root_path: ''
      };
      expect(service.getOpenSearchRootPath()).toBe('');
    });

    test('should handle null elasticsearch_root_path with undefined opensearch_root_path', () => {
      service.settings = {
        elasticsearch_root_path: null
      };
      expect(service.getOpenSearchRootPath()).toBeNull();
    });

    test('should handle various path formats', () => {
      const paths = [
        '/opensearch',
        '/es',
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

  describe('getElasticsearchRootPath() [deprecated]', () => {
    test('should delegate to getOpenSearchRootPath()', () => {
      service.settings = {
        opensearch_root_path: '/opensearch'
      };
      expect(service.getElasticsearchRootPath()).toBe('/opensearch');
    });

    test('should return same value as getOpenSearchRootPath()', () => {
      service.settings = {
        opensearch_root_path: '/test',
        elasticsearch_root_path: '/old'
      };
      const opensearchPath = service.getOpenSearchRootPath();
      const elasticsearchPath = service.getElasticsearchRootPath();
      expect(elasticsearchPath).toBe(opensearchPath);
    });

    test('should maintain backward compatibility', () => {
      service.settings = {
        elasticsearch_root_path: '/legacy'
      };
      // Should still work with old setting name
      expect(service.getElasticsearchRootPath()).toBe('/legacy');
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

  describe('Backward Compatibility', () => {
    test('should work with old elasticsearch_root_path configuration', () => {
      service.settings = {
        elasticsearch_root_path: '/es',
        with_credentials: false,
        theme: 'dark',
        refresh_rate: 5000
      };

      expect(service.getOpenSearchRootPath()).toBe('/es');
      expect(service.getElasticsearchRootPath()).toBe('/es');
    });

    test('should prefer new opensearch_root_path over old setting', () => {
      service.settings = {
        opensearch_root_path: '/new',
        elasticsearch_root_path: '/old'
      };

      expect(service.getOpenSearchRootPath()).toBe('/new');
    });

    test('deprecated methods should work identically to new methods', () => {
      service.settings = {
        location: 'http://localhost:9200',
        opensearch_root_path: '/opensearch'
      };

      expect(service.getElasticsearchHost()).toBe(service.getOpenSearchHost());
      expect(service.getElasticsearchRootPath()).toBe(service.getOpenSearchRootPath());
    });
  });

  describe('Migration Scenarios', () => {
    test('should handle migration from elasticsearch to opensearch naming', () => {
      // Start with old config
      service.settings = {
        elasticsearch_root_path: '/es'
      };
      expect(service.getOpenSearchRootPath()).toBe('/es');

      // Update to new config
      service.settings.opensearch_root_path = '/opensearch';
      expect(service.getOpenSearchRootPath()).toBe('/opensearch');
    });

    test('should handle incomplete migration', () => {
      // Only new setting is set
      service.settings = {
        opensearch_root_path: '/opensearch'
      };
      expect(service.getOpenSearchRootPath()).toBe('/opensearch');
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
