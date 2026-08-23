import {describe, expect, it} from 'vitest';
import {bytes, decimal, timeInterval} from '@/model/format';

/** Ported from tests/filters/bytes.test.js and time-interval.test.js. */

describe('bytes', () => {
  it.each([
    [0, '0b'],
    [1, '1.00b'],
    [10, '10.00b'],
    [100, '100.00b'],
    [1000, '1000.00b'],
    [1023, '1023.00b'],
    [1024, '1.00KB'],
    [1234, '1.21KB'],
    [12345, '12.06KB'],
    [123456, '120.56KB'],
    [1048575, '1024.00KB'],
    [1048576, '1.00MB'],
    [1234567, '1.18MB'],
    [12345678, '11.77MB'],
    [123456789, '117.74MB'],
  ])('%d -> %s', (value, expected) => {
    expect(bytes(value)).toBe(expected);
  });

  it("renders zero as '0b', unlike readablizeBytes which returns the number 0", () => {
    expect(bytes(0)).toBe('0b');
    expect(bytes(-1)).toBe('0b');
    expect(bytes(undefined)).toBe('0b');
  });
});

describe('timeInterval', () => {
  it('reports the coarsest non-zero unit only', () => {
    expect(timeInterval(31536000000)).toBe('1yr.');
    expect(timeInterval(2678400000)).toBe('1mo.');
    expect(timeInterval(86400000)).toBe('1d.');
    expect(timeInterval(3600000)).toBe('1h.');
    expect(timeInterval(60000)).toBe('1min.');
  });

  it('rounds down', () => {
    expect(timeInterval(86400000 * 2 + 3600000)).toBe('2d.');
    expect(timeInterval(3600000 * 25)).toBe('1d.');
  });

  it('falls through to a phrase below a minute', () => {
    expect(timeInterval(59999)).toBe('less than a minute');
    expect(timeInterval(0)).toBe('less than a minute');
    expect(timeInterval(undefined)).toBe('less than a minute');
  });

  it('never reports weeks, because they are not in the unit list', () => {
    // UNIT_MEASURE defines wk but UNITS does not include it.
    expect(timeInterval(604800000)).toBe('7d.');
  });
});

describe('decimal', () => {
  it('renders to one place by default', () => {
    expect(decimal(1.55)).toBe('1.6');
    expect(decimal(25)).toBe('25.0');
  });

  it('renders nothing for a missing value', () => {
    expect(decimal(undefined)).toBe('');
    expect(decimal(Number.NaN)).toBe('');
  });
});
