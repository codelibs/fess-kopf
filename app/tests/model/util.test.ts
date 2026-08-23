import {describe, expect, it} from 'vitest';
import {getProperty, getTimeString, isDefined, notEmpty, readablizeBytes} from '@/model/util';

/** Ported from tests/util.test.js. */

describe('isDefined', () => {
  it.each([
    [null, false],
    [undefined, false],
    ['foobar', true],
    [1, true],
    [0, true],
    [{}, true],
    [false, true],
  ])('%p -> %s', (value, expected) => {
    expect(isDefined(value)).toBe(expected);
  });

  it('treats a missing argument as undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('notEmpty', () => {
  it.each([
    [null, false],
    [undefined, false],
    ['', false],
    ['   ', false],
    ['foobar', true],
    [1, true],
    // 0 stringifies to '0', which has length -- the original says true.
    [0, true],
  ])('%p -> %s', (value, expected) => {
    expect(notEmpty(value)).toBe(expected);
  });
});

describe('getProperty', () => {
  it('walks a dotted path', () => {
    expect(getProperty({foo: {bar: {property: 'foobar'}}}, 'foo.bar.property')).toBe('foobar');
  });

  it('prefers a literal key equal to the whole path', () => {
    // OpenSearch really does return keys containing dots, e.g. index settings
    // such as index.number_of_shards.
    const object = {'foo.bar.property': 'literal', foo: {bar: {property: 'walked'}}};
    expect(getProperty(object, 'foo.bar.property')).toBe('literal');
  });

  it('returns the default when the path is missing', () => {
    expect(getProperty({foo: {}}, 'foo.bar.property', 'default')).toBe('default');
  });

  it('returns undefined when the path is missing and no default is given', () => {
    expect(getProperty({foo: {}}, 'foo.bar.property')).toBeUndefined();
  });

  it('returns the default for a null or undefined object', () => {
    expect(getProperty(null, 'a.b', 'default')).toBe('default');
    expect(getProperty(undefined, 'a.b', 'default')).toBe('default');
  });

  it('returns the default when the value found is null', () => {
    expect(getProperty({a: {b: null}}, 'a.b', 'default')).toBe('default');
  });

  it('returns a falsy value rather than the default', () => {
    expect(getProperty({a: {b: 0}}, 'a.b', 99)).toBe(0);
    expect(getProperty({a: {b: false}}, 'a.b', true)).toBe(false);
  });
});

describe('readablizeBytes', () => {
  it.each([
    [1, '1.00b'],
    [10, '10.00b'],
    [100, '100.00b'],
    [1000, '1000.00b'],
    [10000, '9.77KB'],
    [100000, '97.66KB'],
    [1000000, '976.56KB'],
    [10000000, '9.54MB'],
    [100000000, '95.37MB'],
    [1000000000, '953.67MB'],
    [10000000000, '9.31GB'],
    [100000000000, '93.13GB'],
    [10000000000000, '9.09TB'],
    [100000000000000, '90.95TB'],
    [10000000000000000, '8.88PB'],
    [100000000000000000, '88.82PB'],
  ])('%d -> %s', (bytes, expected) => {
    expect(readablizeBytes(bytes)).toBe(expected);
  });

  it('returns the number 0, not a string, for zero', () => {
    // Asserted by the original suite; screens rely on the falsy value.
    expect(readablizeBytes(0)).toBe(0);
  });

  it('returns 0 for a negative count', () => {
    expect(readablizeBytes(-1)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(readablizeBytes(undefined)).toBe(0);
  });
});

describe('getTimeString', () => {
  it('formats as hh:MM:ss', () => {
    expect(getTimeString(new Date(2026, 0, 1, 9, 5, 3))).toBe('09:05:03');
  });

  it('does not pad values that are already two digits', () => {
    expect(getTimeString(new Date(2026, 0, 1, 23, 59, 59))).toBe('23:59:59');
  });
});
