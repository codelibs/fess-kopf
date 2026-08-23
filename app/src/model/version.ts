const VERSION = /(\d+)\.(\d+)\.(\d+)/;

/**
 * A parsed OpenSearch version. Ported from src/kopf/opensearch/version.js;
 * tests/version.test.js pins the behaviour and carries over unchanged.
 */
export class Version {
  readonly value: string;
  readonly valid: boolean;
  readonly major: number;
  readonly minor: number;
  readonly patch: number;

  constructor(version: string) {
    this.value = version;
    const parts = VERSION.exec(version);
    this.valid = parts !== null;
    this.major = parts !== null ? parseInt(parts[1], 10) : Number.NaN;
    this.minor = parts !== null ? parseInt(parts[2], 10) : Number.NaN;
    this.patch = parts !== null ? parseInt(parts[3], 10) : Number.NaN;
  }

  /** True when this version is the same as, or newer than, other. */
  isAtLeast(other: Version): boolean {
    if (this.major !== other.major) {
      return this.major > other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor > other.minor;
    }
    return this.patch >= other.patch;
  }
}
