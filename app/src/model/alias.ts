import {isDefined, notEmpty} from './util';

/** One alias binding, as the _aliases API describes it. */
export class Alias {
  readonly alias: string;
  readonly index: string;
  readonly filter: string | Record<string, unknown>;
  readonly index_routing: string;
  readonly search_routing: string;

  constructor(
    alias?: string,
    index?: string,
    filter?: string | Record<string, unknown>,
    indexRouting?: string,
    searchRouting?: string,
  ) {
    // Both are lower-cased on the way in: OpenSearch treats index names as
    // lower-case, and the original did the same.
    this.alias = isDefined(alias) ? alias!.toLowerCase() : '';
    this.index = isDefined(index) ? index!.toLowerCase() : '';
    this.filter = isDefined(filter) ? filter! : '';
    this.index_routing = isDefined(indexRouting) ? indexRouting! : '';
    this.search_routing = isDefined(searchRouting) ? searchRouting! : '';
  }

  /** Throws with the message the screen shows. */
  validate(): void {
    if (!notEmpty(this.alias)) {
      throw new Error('Alias must have a non empty name');
    }
    if (!notEmpty(this.index)) {
      throw new Error('Alias must have a valid index name');
    }
  }

  equals(other: Alias): boolean {
    return (
      this.alias === other.alias &&
      this.index === other.index &&
      this.filter === other.filter &&
      this.index_routing === other.index_routing &&
      this.search_routing === other.search_routing
    );
  }

  /** The action body for /_aliases. Empty optional fields are left out. */
  info(): Record<string, unknown> {
    const info: Record<string, unknown> = {index: this.index, alias: this.alias};
    if (typeof this.filter === 'string') {
      if (notEmpty(this.filter)) {
        info.filter = JSON.parse(this.filter);
      }
    } else if (isDefined(this.filter)) {
      info.filter = this.filter;
    }
    if (notEmpty(this.index_routing)) {
      info.index_routing = this.index_routing;
    }
    if (notEmpty(this.search_routing)) {
      info.search_routing = this.search_routing;
    }
    return info;
  }

  clone(): Alias {
    return new Alias(
      this.alias,
      this.index,
      this.filter,
      this.index_routing,
      this.search_routing,
    );
  }
}

/** The aliases bound to one index. */
export class IndexAliases {
  constructor(
    readonly index: string,
    public aliases: Alias[],
  ) {}

  clone(): IndexAliases {
    return new IndexAliases(
      this.index,
      this.aliases.map((alias) => alias.clone()),
    );
  }

  /**
   * Aliases present in `modified` but not in `original`.
   *
   * Called both ways round: additions are diff(original, modified) and
   * removals are diff(modified, original).
   */
  static diff(original: IndexAliases[], modified: IndexAliases[]): Alias[] {
    const differences: Alias[] = [];
    modified.forEach((current) => {
      const previous = original.filter((entry) => entry.index === current.index);
      if (previous.length === 0) {
        differences.push(...current.aliases);
        return;
      }
      previous.forEach((entry) => {
        current.aliases.forEach((alias) => {
          if (!entry.aliases.some((existing) => alias.equals(existing))) {
            differences.push(alias);
          }
        });
      });
    });
    return differences;
  }
}
