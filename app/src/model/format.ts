/**
 * Display formatters, ported from src/kopf/filters/.
 *
 * bytes() is deliberately not readablizeBytes(): the filter renders '0b' for a
 * zero count where the model helper returns the number 0. Both are asserted by
 * the existing suite, so both survive.
 */

const BYTE_UNITS = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function bytes(value: number | undefined): string {
  if (value !== undefined && value > 0) {
    const exponent = Math.floor(Math.log(value) / Math.log(1024));
    return (value / Math.pow(1024, exponent)).toFixed(2) + BYTE_UNITS[exponent];
  }
  return `0${BYTE_UNITS[0]}`;
}

const INTERVAL_UNITS = ['yr', 'mo', 'd', 'h', 'min'] as const;

const INTERVAL_MS: Record<string, number> = {
  yr: 31536000000,
  mo: 2678400000,
  wk: 604800000,
  d: 86400000,
  h: 3600000,
  min: 60000,
};

/** Coarsest non-zero unit only, e.g. '3d.'. The input is milliseconds. */
export function timeInterval(value: number | undefined): string {
  for (const unit of INTERVAL_UNITS) {
    const amount = Math.floor((value ?? 0) / INTERVAL_MS[unit]);
    if (amount) {
      return `${amount}${unit}.`;
    }
  }
  return 'less than a minute';
}

/** Fixed-decimal rendering, standing in for AngularJS's number:1 filter. */
export function decimal(value: number | undefined, places = 1): string {
  return value === undefined || Number.isNaN(value) ? '' : value.toFixed(places);
}
