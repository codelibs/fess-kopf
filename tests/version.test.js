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
});
