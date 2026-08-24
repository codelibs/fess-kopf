import {describe, expect, it} from 'vitest';
import {Version} from '@/model/version';

/**
 * Ported from tests/version.test.js. The Angular model exposed getMajor() and
 * friends; the TypeScript one uses readonly fields, so the assertions move but
 * the behaviour they pin does not.
 */
describe('Version', () => {
  it.each([
    ['2.11.1', 2, 11, 1],
    ['2.17.0', 2, 17, 0],
    ['3.1.0', 3, 1, 0],
    ['3.10.15', 3, 10, 15],
    ['3.99.99', 3, 99, 99],
  ])('parses %s', (value, major, minor, patch) => {
    const version = new Version(value);
    expect(version.valid).toBe(true);
    expect(version.major).toBe(major);
    expect(version.minor).toBe(minor);
    expect(version.patch).toBe(patch);
    expect(version.value).toBe(value);
  });

  it('parses a version carrying a suffix', () => {
    const version = new Version('3.8.0-SNAPSHOT');
    expect(version.valid).toBe(true);
    expect(version.major).toBe(3);
    expect(version.patch).toBe(0);
  });

  it.each(['', 'unknown', '3.8'])('rejects %s', (value) => {
    expect(new Version(value).valid).toBe(false);
  });

  describe('isAtLeast', () => {
    it('is true for an identical version', () => {
      // The comparison is >= on the patch component; versionCheck relies on it.
      expect(new Version('2.11.1').isAtLeast(new Version('2.11.1'))).toBe(true);
    });

    it.each([
      ['3.0.0', '2.19.9', true],
      ['2.19.9', '3.0.0', false],
      ['2.17.0', '2.11.1', true],
      ['2.11.1', '2.17.0', false],
      ['2.11.2', '2.11.1', true],
      ['2.11.0', '2.11.1', false],
    ])('%s isAtLeast %s -> %s', (a, b, expected) => {
      expect(new Version(a).isAtLeast(new Version(b))).toBe(expected);
    });

    it('compares minor numerically, not as text', () => {
      // '10' < '9' as strings; 10 > 9 as numbers.
      expect(new Version('2.10.0').isAtLeast(new Version('2.9.0'))).toBe(true);
    });
  });
});
