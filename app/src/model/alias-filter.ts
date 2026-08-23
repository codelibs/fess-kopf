import {notEmpty} from './util';
import type {IndexAliases} from './alias';

/** Filters the alias table by index name and alias name, both substrings. */
export class AliasFilter {
  constructor(
    public index: string,
    public alias: string,
  ) {}

  clone(): AliasFilter {
    return new AliasFilter(this.index, this.alias);
  }

  getSorting(): (a: IndexAliases, b: IndexAliases) => number {
    return (a, b) => a.index.localeCompare(b.index);
  }

  equals(other: AliasFilter | null): boolean {
    return other !== null && this.index === other.index && this.alias === other.alias;
  }

  isBlank(): boolean {
    return !notEmpty(this.index) && !notEmpty(this.alias);
  }

  matches(indexAlias: IndexAliases): boolean {
    if (this.isBlank()) {
      return true;
    }
    if (notEmpty(this.index) && !indexAlias.index.includes(this.index)) {
      return false;
    }
    if (notEmpty(this.alias)) {
      return indexAlias.aliases.some((alias) => alias.alias.includes(this.alias));
    }
    return true;
  }
}
