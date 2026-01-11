/**
 * Tests for timeInterval filter
 * Tests time interval formatting functionality
 */

const fs = require('fs');
const path = require('path');

// Load the filter code and extract the filter function
const filterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/filters/time_interval.js'),
  'utf8'
);

// Mock the kopf.filter to capture the filter function
let timeIntervalFilter;
const kopf = {
  filter: (name, fn) => {
    if (name === 'timeInterval') {
      timeIntervalFilter = fn();
    }
  }
};

eval(filterCode);

describe('timeIntervalFilter', () => {
  // Constants from the filter
  const MINUTE = 60000;
  const HOUR = 3600000;
  const DAY = 86400000;
  const MONTH = 2678400000; // 31 days
  const YEAR = 31536000000;

  describe('less than a minute', () => {
    test('should format 0 ms', () => {
      expect(timeIntervalFilter(0)).toBe('less than a minute');
    });

    test('should format 1000 ms (1 second)', () => {
      expect(timeIntervalFilter(1000)).toBe('less than a minute');
    });

    test('should format 30000 ms (30 seconds)', () => {
      expect(timeIntervalFilter(30000)).toBe('less than a minute');
    });

    test('should format 59999 ms (< 1 minute)', () => {
      expect(timeIntervalFilter(59999)).toBe('less than a minute');
    });
  });

  describe('minutes', () => {
    test('should format 1 minute', () => {
      expect(timeIntervalFilter(MINUTE)).toBe('1min.');
    });

    test('should format 5 minutes', () => {
      expect(timeIntervalFilter(5 * MINUTE)).toBe('5min.');
    });

    test('should format 30 minutes', () => {
      expect(timeIntervalFilter(30 * MINUTE)).toBe('30min.');
    });

    test('should format 59 minutes', () => {
      expect(timeIntervalFilter(59 * MINUTE)).toBe('59min.');
    });
  });

  describe('hours', () => {
    test('should format 1 hour', () => {
      expect(timeIntervalFilter(HOUR)).toBe('1h.');
    });

    test('should format 2 hours', () => {
      expect(timeIntervalFilter(2 * HOUR)).toBe('2h.');
    });

    test('should format 12 hours', () => {
      expect(timeIntervalFilter(12 * HOUR)).toBe('12h.');
    });

    test('should format 23 hours', () => {
      expect(timeIntervalFilter(23 * HOUR)).toBe('23h.');
    });
  });

  describe('days', () => {
    test('should format 1 day', () => {
      expect(timeIntervalFilter(DAY)).toBe('1d.');
    });

    test('should format 7 days', () => {
      expect(timeIntervalFilter(7 * DAY)).toBe('7d.');
    });

    test('should format 15 days', () => {
      expect(timeIntervalFilter(15 * DAY)).toBe('15d.');
    });

    test('should format 30 days', () => {
      expect(timeIntervalFilter(30 * DAY)).toBe('30d.');
    });
  });

  describe('months', () => {
    test('should format 1 month', () => {
      expect(timeIntervalFilter(MONTH)).toBe('1mo.');
    });

    test('should format 3 months', () => {
      expect(timeIntervalFilter(3 * MONTH)).toBe('3mo.');
    });

    test('should format 6 months', () => {
      expect(timeIntervalFilter(6 * MONTH)).toBe('6mo.');
    });

    test('should format 11 months', () => {
      expect(timeIntervalFilter(11 * MONTH)).toBe('11mo.');
    });
  });

  describe('years', () => {
    test('should format 1 year', () => {
      expect(timeIntervalFilter(YEAR)).toBe('1yr.');
    });

    test('should format 2 years', () => {
      expect(timeIntervalFilter(2 * YEAR)).toBe('2yr.');
    });

    test('should format 5 years', () => {
      expect(timeIntervalFilter(5 * YEAR)).toBe('5yr.');
    });

    test('should format 10 years', () => {
      expect(timeIntervalFilter(10 * YEAR)).toBe('10yr.');
    });
  });

  describe('edge cases', () => {
    test('should handle very small values', () => {
      expect(timeIntervalFilter(1)).toBe('less than a minute');
    });

    test('should handle exactly 1 hour boundary', () => {
      expect(timeIntervalFilter(HOUR - 1)).toBe('59min.');
      expect(timeIntervalFilter(HOUR)).toBe('1h.');
    });

    test('should handle exactly 1 day boundary', () => {
      expect(timeIntervalFilter(DAY - 1)).toBe('23h.');
      expect(timeIntervalFilter(DAY)).toBe('1d.');
    });

    test('should use largest applicable unit', () => {
      // 1 day and 12 hours should show as 1d, not hours
      expect(timeIntervalFilter(DAY + 12 * HOUR)).toBe('1d.');
    });
  });

  describe('real-world scenarios', () => {
    test('should format typical uptime (1 day 5 hours)', () => {
      const uptime = DAY + 5 * HOUR;
      expect(timeIntervalFilter(uptime)).toBe('1d.');
    });

    test('should format server uptime (30 days)', () => {
      const uptime = 30 * DAY;
      // 30 days is less than 1 month (31 days), so shows as days
      expect(timeIntervalFilter(uptime)).toBe('30d.');
    });

    test('should format server uptime (31+ days = 1 month)', () => {
      const uptime = MONTH; // 31 days
      expect(timeIntervalFilter(uptime)).toBe('1mo.');
    });

    test('should format long running cluster (1 year)', () => {
      expect(timeIntervalFilter(YEAR)).toBe('1yr.');
    });
  });
});
