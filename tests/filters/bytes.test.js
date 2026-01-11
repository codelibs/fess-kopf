/**
 * Tests for bytes filter
 * Tests byte formatting functionality
 */

const fs = require('fs');
const path = require('path');

// Load the filter code and extract the filter function
const filterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/filters/bytes.js'),
  'utf8'
);

// Mock the kopf.filter to capture the filter function
let bytesFilter;
const kopf = {
  filter: (name, fn) => {
    if (name === 'bytes') {
      bytesFilter = fn();
    }
  }
};

eval(filterCode);

describe('bytesFilter', () => {
  describe('bytes (< 1KB)', () => {
    test('should format 0 bytes', () => {
      expect(bytesFilter(0)).toBe('0b');
    });

    test('should format 1 byte', () => {
      expect(bytesFilter(1)).toBe('1.00b');
    });

    test('should format 10 bytes', () => {
      expect(bytesFilter(10)).toBe('10.00b');
    });

    test('should format 100 bytes', () => {
      expect(bytesFilter(100)).toBe('100.00b');
    });

    test('should format 1000 bytes', () => {
      expect(bytesFilter(1000)).toBe('1000.00b');
    });

    test('should format 1023 bytes', () => {
      expect(bytesFilter(1023)).toBe('1023.00b');
    });
  });

  describe('kilobytes (KB)', () => {
    test('should format 1024 bytes as 1KB', () => {
      expect(bytesFilter(1024)).toBe('1.00KB');
    });

    test('should format 1234 bytes', () => {
      expect(bytesFilter(1234)).toBe('1.21KB');
    });

    test('should format 12345 bytes', () => {
      expect(bytesFilter(12345)).toBe('12.06KB');
    });

    test('should format 123456 bytes', () => {
      expect(bytesFilter(123456)).toBe('120.56KB');
    });

    test('should format 1MB - 1 bytes', () => {
      expect(bytesFilter(1048575)).toBe('1024.00KB');
    });
  });

  describe('megabytes (MB)', () => {
    test('should format 1MB', () => {
      expect(bytesFilter(1048576)).toBe('1.00MB');
    });

    test('should format 1234567 bytes', () => {
      expect(bytesFilter(1234567)).toBe('1.18MB');
    });

    test('should format 12345678 bytes', () => {
      expect(bytesFilter(12345678)).toBe('11.77MB');
    });

    test('should format 123456789 bytes', () => {
      expect(bytesFilter(123456789)).toBe('117.74MB');
    });
  });

  describe('gigabytes (GB)', () => {
    test('should format 1GB', () => {
      expect(bytesFilter(1073741824)).toBe('1.00GB');
    });

    test('should format 1234567890 bytes', () => {
      expect(bytesFilter(1234567890)).toBe('1.15GB');
    });

    test('should format 10GB', () => {
      expect(bytesFilter(10737418240)).toBe('10.00GB');
    });

    test('should format 100GB', () => {
      expect(bytesFilter(107374182400)).toBe('100.00GB');
    });
  });

  describe('terabytes (TB)', () => {
    test('should format 1TB', () => {
      expect(bytesFilter(1099511627776)).toBe('1.00TB');
    });

    test('should format 10TB', () => {
      expect(bytesFilter(10995116277760)).toBe('10.00TB');
    });
  });

  describe('petabytes (PB)', () => {
    test('should format 1PB', () => {
      expect(bytesFilter(1125899906842624)).toBe('1.00PB');
    });

    test('should format 1234567890000000 bytes', () => {
      expect(bytesFilter(1234567890000000)).toBe('1.10PB');
    });
  });

  describe('edge cases', () => {
    test('should handle negative values as 0b', () => {
      expect(bytesFilter(-1)).toBe('0b');
    });

    test('should handle very large values', () => {
      // Should handle exabyte range
      const result = bytesFilter(1125899906842624000);
      expect(result).toContain('PB');
    });

    test('should handle floating point input', () => {
      expect(bytesFilter(1024.5)).toBe('1.00KB');
    });
  });
});
