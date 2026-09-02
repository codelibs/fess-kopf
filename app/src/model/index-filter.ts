import {isFessIndex} from './fess-index';
import {notEmpty} from './util';

export interface FilterableIndex {
  name: string;
  aliases: string[];
  special: boolean;
  closed: boolean;
  unhealthy: boolean;
}

/**
 * The cluster overview's index filter. Ported from
 * src/kopf/models/index_filter.js.
 */
export class IndexFilter {
  sort = 'name';

  constructor(
    public name: string,
    public closed: boolean,
    public special: boolean,
    public healthy: boolean,
    public asc: boolean,
    public timestamp: number = 0,
    /** Show only the indices Fess owns. Off by default, as the screen was. */
    public fessOnly: boolean = false,
  ) {}

  getSorting(): ((a: FilterableIndex, b: FilterableIndex) => number) | undefined {
    if (this.sort !== 'name') {
      return undefined;
    }
    const asc = this.asc;
    return (a, b) => (asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }

  clone(): IndexFilter {
    return new IndexFilter(
      this.name,
      this.closed,
      this.special,
      this.healthy,
      this.asc,
      this.timestamp,
      this.fessOnly,
    );
  }

  equals(other: IndexFilter | null): boolean {
    return (
      other !== null &&
      this.name === other.name &&
      this.closed === other.closed &&
      this.special === other.special &&
      this.healthy === other.healthy &&
      this.asc === other.asc &&
      this.timestamp === other.timestamp &&
      this.fessOnly === other.fessOnly
    );
  }

  isBlank(): boolean {
    return (
      !notEmpty(this.name) &&
      this.closed &&
      this.special &&
      this.healthy &&
      this.asc &&
      !this.fessOnly
    );
  }

  matches(index: FilterableIndex): boolean {
    if (this.fessOnly && !isFessIndex(index)) {
      return false;
    }
    if (!this.special && index.special) {
      return false;
    }
    if (!this.closed && index.closed) {
      return false;
    }
    // Unchecking 'healthy' means "show unhealthy only".
    if (!this.healthy && !index.unhealthy) {
      return false;
    }
    if (!notEmpty(this.name)) {
      return true;
    }
    return this.matchesName(index);
  }

  private matchesName(index: FilterableIndex): boolean {
    try {
      const pattern = new RegExp(this.name.trim(), 'i');
      return pattern.test(index.name) || index.aliases.some((alias) => pattern.test(alias));
    } catch {
      // Not a valid regular expression; fall back to substring matching.
      // The index name is compared as-is against a lower-cased needle, which
      // is what the original did -- aliases are lower-cased on both sides.
      const needle = this.name.toLowerCase();
      return (
        index.name.includes(needle) ||
        index.aliases.some((alias) => alias.toLowerCase().includes(needle))
      );
    }
  }
}
