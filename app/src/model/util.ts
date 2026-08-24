/**
 * Helpers ported from src/kopf/util.js. tests/util.test.js pins their
 * behaviour, including the parts that look like accidents; the port keeps
 * them so screens read the same numbers before and after the migration.
 */

/** Non-null and not undefined. */
export function isDefined(value: unknown): boolean {
  return value !== null && typeof value !== 'undefined';
}

/** Defined, and its string form has non-whitespace content. */
export function notEmpty(value: unknown): boolean {
  return isDefined(value) && String(value).trim().length > 0;
}

/**
 * Reads a nested property by dotted path.
 *
 * A literal key equal to the whole path wins over the dotted walk -- that is
 * what the original does, and OpenSearch does return keys containing dots
 * (index settings such as `index.number_of_shards`).
 */
export function getProperty<T>(object: unknown, propertyPath: string, defaultValue: T): T;
export function getProperty<T = unknown>(object: unknown, propertyPath: string): T | undefined;
export function getProperty(object: unknown, propertyPath: string, defaultValue?: unknown) {
  let current = object;
  if (isDefined(current)) {
    const direct = (current as Record<string, unknown>)[propertyPath];
    if (isDefined(direct)) {
      return direct;
    }
    const parts = propertyPath.split('.');
    for (let i = 0; i < parts.length && isDefined(current); i++) {
      current = (current as Record<string, unknown>)[parts[i]];
    }
  }
  return isDefined(current) ? current : defaultValue;
}

const UNITS = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Formats a byte count.
 *
 * Returns the number 0 -- not the string '0b' -- for anything not above zero.
 * That is the original's behaviour and tests/util.test.js asserts it, so the
 * return type is a union rather than a string.
 */
export function readablizeBytes(bytes: number | undefined): string | number {
  if (bytes !== undefined && bytes > 0) {
    const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, exponent)).toFixed(2) + UNITS[exponent];
  }
  return 0;
}

/** hh:MM:ss. */
export function getTimeString(date: Date): string {
  const hh = `0${date.getHours()}`.slice(-2);
  const mm = `0${date.getMinutes()}`.slice(-2);
  const ss = `0${date.getSeconds()}`.slice(-2);
  return `${hh}:${mm}:${ss}`;
}
