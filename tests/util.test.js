/**
 * Tests for utility functions
 * Tests basic utility functions used throughout fess-kopf
 */

// Load utility code
const fs = require('fs');
const path = require('path');
const utilCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/util.js'),
  'utf8'
);

// Execute the code to define utility functions
eval(utilCode);

describe('Utility Functions', () => {
  describe('isDefined', () => {
    test('should return false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });

    test('should return false with no argument', () => {
      expect(isDefined()).toBe(false);
    });

    test('should return true for defined string', () => {
      expect(isDefined('foobar')).toBe(true);
    });

    test('should return true for defined number', () => {
      expect(isDefined(1)).toBe(true);
      expect(isDefined(0)).toBe(true);
    });

    test('should return true for empty object', () => {
      expect(isDefined({})).toBe(true);
    });

    test('should return true for false boolean', () => {
      expect(isDefined(false)).toBe(true);
    });
  });

  describe('notEmpty', () => {
    test('should return false for null', () => {
      expect(notEmpty(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(notEmpty(undefined)).toBe(false);
    });

    test('should return false with no argument', () => {
      expect(notEmpty()).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(notEmpty('')).toBe(false);
    });

    test('should return true for non-empty string', () => {
      expect(notEmpty('foobar')).toBe(true);
    });

    test('should return true for number', () => {
      expect(notEmpty(1)).toBe(true);
      expect(notEmpty(0)).toBe(true);
    });
  });

  describe('getProperty', () => {
    test('should get property with path as string', () => {
      const obj = {};
      obj['foo.bar.property'] = 'foobar';
      expect(getProperty(obj, 'foo.bar.property')).toBe('foobar');
    });

    test('should get property with nested path', () => {
      const obj = {
        foo: {
          bar: {
            property: 'foobar'
          }
        }
      };
      expect(getProperty(obj, 'foo.bar.property')).toBe('foobar');
    });

    test('should return default value for non-existing property', () => {
      const obj = {};
      expect(getProperty(obj, 'foo.bar.property', 'default')).toBe('default');
    });

    test('should return undefined for non-existing property without default', () => {
      const obj = {};
      expect(getProperty(obj, 'foo.bar.property')).toBeUndefined();
    });
  });

  describe('readablizeBytes', () => {
    test('should format bytes correctly', () => {
      expect(readablizeBytes(1)).toBe('1.00b');
      expect(readablizeBytes(10)).toBe('10.00b');
      expect(readablizeBytes(100)).toBe('100.00b');
      expect(readablizeBytes(1000)).toBe('1000.00b');
    });

    test('should format kilobytes correctly', () => {
      expect(readablizeBytes(10000)).toBe('9.77KB');
      expect(readablizeBytes(100000)).toBe('97.66KB');
      expect(readablizeBytes(1000000)).toBe('976.56KB');
    });

    test('should format megabytes correctly', () => {
      expect(readablizeBytes(10000000)).toBe('9.54MB');
      expect(readablizeBytes(100000000)).toBe('95.37MB');
      expect(readablizeBytes(1000000000)).toBe('953.67MB');
    });

    test('should format gigabytes correctly', () => {
      expect(readablizeBytes(10000000000)).toBe('9.31GB');
      expect(readablizeBytes(100000000000)).toBe('93.13GB');
    });

    test('should format terabytes correctly', () => {
      expect(readablizeBytes(10000000000000)).toBe('9.09TB');
      expect(readablizeBytes(100000000000000)).toBe('90.95TB');
    });

    test('should format petabytes correctly', () => {
      expect(readablizeBytes(10000000000000000)).toBe('8.88PB');
      expect(readablizeBytes(100000000000000000)).toBe('88.82PB');
    });
  });
});
