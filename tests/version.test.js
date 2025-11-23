/**
 * Tests for Version class
 * Tests OpenSearch 2.x/3.x version detection and comparison
 */

// Load the Version class
const fs = require('fs');
const path = require('path');
const versionCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/opensearch/version.js'),
  'utf8'
);

// Execute the code to define Version class
eval(versionCode);

describe('Version', () => {
  describe('Version parsing', () => {
    test('should parse valid version numbers', () => {
      const version = new Version('2.11.1');
      expect(version.isValid()).toBe(true);
      expect(version.getMajor()).toBe(2);
      expect(version.getMinor()).toBe(11);
      expect(version.getPatch()).toBe(1);
      expect(version.getValue()).toBe('2.11.1');
    });

    test('should parse OpenSearch 3.x version', () => {
      const version = new Version('3.0.0');
      expect(version.isValid()).toBe(true);
      expect(version.getMajor()).toBe(3);
      expect(version.getMinor()).toBe(0);
      expect(version.getPatch()).toBe(0);
    });

    test('should handle invalid version', () => {
      const version = new Version('invalid');
      expect(version.isValid()).toBe(false);
    });

    test('should parse version with build metadata', () => {
      const version = new Version('2.11.1-SNAPSHOT');
      expect(version.isValid()).toBe(true);
      expect(version.getMajor()).toBe(2);
      expect(version.getMinor()).toBe(11);
      expect(version.getPatch()).toBe(1);
    });
  });

  describe('OpenSearch version checks', () => {
    test('should detect OpenSearch 2.x or later', () => {
      const version2 = new Version('2.0.0');
      expect(version2.isOpenSearch2OrLater()).toBe(true);

      const version211 = new Version('2.11.1');
      expect(version211.isOpenSearch2OrLater()).toBe(true);

      const version1 = new Version('1.3.0');
      expect(version1.isOpenSearch2OrLater()).toBe(false);
    });

    test('should detect OpenSearch 3.x or later', () => {
      const version3 = new Version('3.0.0');
      expect(version3.isOpenSearch3OrLater()).toBe(true);

      const version4 = new Version('4.0.0');
      expect(version4.isOpenSearch3OrLater()).toBe(true);

      const version2 = new Version('2.11.1');
      expect(version2.isOpenSearch3OrLater()).toBe(false);
    });
  });

  describe('Version comparison', () => {
    test('should compare major versions correctly', () => {
      const version3 = new Version('3.0.0');
      const version2 = new Version('2.11.1');
      expect(version3.isGreater(version2)).toBe(true);
      expect(version2.isGreater(version3)).toBe(false);
    });

    test('should compare minor versions correctly', () => {
      const version211 = new Version('2.11.0');
      const version210 = new Version('2.10.0');
      expect(version211.isGreater(version210)).toBe(true);
      expect(version210.isGreater(version211)).toBe(false);
    });

    test('should compare patch versions correctly', () => {
      const version212 = new Version('2.11.2');
      const version211 = new Version('2.11.1');
      expect(version212.isGreater(version211)).toBe(true);
      expect(version211.isGreater(version212)).toBe(false);
    });

    test('should handle equal versions', () => {
      const version1 = new Version('2.11.1');
      const version2 = new Version('2.11.1');
      expect(version1.isGreater(version2)).toBe(true); // >= comparison
    });
  });

  describe('Real-world scenarios', () => {
    test('Fess 15 with OpenSearch 2.11.1', () => {
      const version = new Version('2.11.1');
      expect(version.isValid()).toBe(true);
      expect(version.isOpenSearch2OrLater()).toBe(true);
      expect(version.getMajor()).toBe(2);
    });

    test('Fess 15 with OpenSearch 3.0.0', () => {
      const version = new Version('3.0.0');
      expect(version.isValid()).toBe(true);
      expect(version.isOpenSearch2OrLater()).toBe(true);
      expect(version.isOpenSearch3OrLater()).toBe(true);
      expect(version.getMajor()).toBe(3);
    });

    test('OpenSearch 2.17.0 compatibility', () => {
      const version = new Version('2.17.0');
      expect(version.isValid()).toBe(true);
      expect(version.isOpenSearch2OrLater()).toBe(true);
      expect(version.isOpenSearch3OrLater()).toBe(false);
      expect(version.getMajor()).toBe(2);
      expect(version.getMinor()).toBe(17);
    });
  });

  describe('OpenSearch 3 specific features', () => {
    test('should correctly identify OpenSearch 3.0.0', () => {
      const version = new Version('3.0.0');
      expect(version.isOpenSearch3OrLater()).toBe(true);
      expect(version.isOpenSearch2OrLater()).toBe(true);
    });

    test('should correctly identify OpenSearch 3.1.0', () => {
      const version = new Version('3.1.0');
      expect(version.isOpenSearch3OrLater()).toBe(true);
      expect(version.getMajor()).toBe(3);
      expect(version.getMinor()).toBe(1);
    });

    test('should handle OpenSearch 3.x.x range', () => {
      const versions = [
        '3.0.0',
        '3.1.0',
        '3.5.2',
        '3.10.15',
        '3.99.99'
      ];

      versions.forEach(versionStr => {
        const version = new Version(versionStr);
        expect(version.isOpenSearch3OrLater()).toBe(true);
        expect(version.getMajor()).toBe(3);
      });
    });

    test('should distinguish between OpenSearch 2 and 3', () => {
      const v2 = new Version('2.99.99');
      const v3 = new Version('3.0.0');

      expect(v2.isOpenSearch2OrLater()).toBe(true);
      expect(v2.isOpenSearch3OrLater()).toBe(false);

      expect(v3.isOpenSearch2OrLater()).toBe(true);
      expect(v3.isOpenSearch3OrLater()).toBe(true);
    });

    test('should compare OpenSearch 3 versions correctly', () => {
      const v30 = new Version('3.0.0');
      const v31 = new Version('3.1.0');
      const v35 = new Version('3.5.2');

      expect(v31.isGreater(v30)).toBe(true);
      expect(v35.isGreater(v31)).toBe(true);
      expect(v30.isGreater(v35)).toBe(false);
    });
  });

  describe('Distribution parameter', () => {
    test('should accept distribution parameter', () => {
      const version = new Version('3.0.0', 'opensearch');
      expect(version.isValid()).toBe(true);
      expect(version.getMajor()).toBe(3);
    });

    test('should default to opensearch distribution', () => {
      const version1 = new Version('3.0.0');
      const version2 = new Version('3.0.0', 'opensearch');

      expect(version1.isValid()).toBe(version2.isValid());
      expect(version1.getMajor()).toBe(version2.getMajor());
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle versions with extra segments', () => {
      const version = new Version('3.0.0.1');
      expect(version.isValid()).toBe(true);
      expect(version.getMajor()).toBe(3);
      expect(version.getMinor()).toBe(0);
      expect(version.getPatch()).toBe(0);
    });

    test('should handle versions with pre-release identifiers', () => {
      const versions = [
        '3.0.0-alpha',
        '3.0.0-beta.1',
        '3.0.0-rc.1',
        '3.1.0-SNAPSHOT'
      ];

      versions.forEach(versionStr => {
        const version = new Version(versionStr);
        expect(version.isValid()).toBe(true);
        expect(version.isOpenSearch3OrLater()).toBe(true);
      });
    });

    test('should handle empty version string', () => {
      const version = new Version('');
      expect(version.isValid()).toBe(false);
    });

    test('should handle null version', () => {
      const version = new Version(null);
      expect(version.isValid()).toBe(false);
    });

    test('should handle undefined version', () => {
      const version = new Version(undefined);
      expect(version.isValid()).toBe(false);
    });

    test('should handle version with only major number', () => {
      const version = new Version('3');
      expect(version.isValid()).toBe(false);
    });

    test('should handle version with only major.minor', () => {
      const version = new Version('3.0');
      expect(version.isValid()).toBe(false);
    });
  });

  describe('Version comparison edge cases', () => {
    test('should handle comparison with invalid version', () => {
      const validVersion = new Version('3.0.0');
      const invalidVersion = new Version('invalid');

      // isGreater should handle this gracefully
      expect(() => {
        validVersion.isGreater(invalidVersion);
      }).not.toThrow();
    });

    test('should compare versions with different patch levels', () => {
      const v301 = new Version('3.0.1');
      const v300 = new Version('3.0.0');

      expect(v301.isGreater(v300)).toBe(true);
      expect(v300.isGreater(v301)).toBe(false);
    });

    test('should handle cross-major version comparisons', () => {
      const v2 = new Version('2.99.99');
      const v3 = new Version('3.0.0');

      expect(v3.isGreater(v2)).toBe(true);
      expect(v2.isGreater(v3)).toBe(false);
    });
  });

  describe('Future OpenSearch versions', () => {
    test('should support OpenSearch 4.x and beyond', () => {
      const v4 = new Version('4.0.0');
      const v5 = new Version('5.0.0');
      const v10 = new Version('10.0.0');

      expect(v4.isOpenSearch2OrLater()).toBe(true);
      expect(v4.isOpenSearch3OrLater()).toBe(true);

      expect(v5.isOpenSearch2OrLater()).toBe(true);
      expect(v5.isOpenSearch3OrLater()).toBe(true);

      expect(v10.isOpenSearch2OrLater()).toBe(true);
      expect(v10.isOpenSearch3OrLater()).toBe(true);
    });

    test('should compare future versions correctly', () => {
      const v3 = new Version('3.0.0');
      const v4 = new Version('4.0.0');
      const v5 = new Version('5.0.0');

      expect(v4.isGreater(v3)).toBe(true);
      expect(v5.isGreater(v4)).toBe(true);
    });
  });
});
