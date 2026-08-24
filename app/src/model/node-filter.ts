import {notEmpty} from './util';

export interface FilterableNode {
  name: string;
  data: boolean;
  master: boolean;
  client: boolean;
}

/** The nodes screen's filter: a name substring plus the three type toggles. */
export class NodeFilter {
  constructor(
    public name: string,
    public data: boolean,
    public master: boolean,
    public client: boolean,
    public timestamp: number = 0,
  ) {}

  clone(): NodeFilter {
    // Matches the original, which left timestamp at its default rather than
    // copying it.
    return new NodeFilter(this.name, this.data, this.master, this.client);
  }

  equals(other: NodeFilter | null): boolean {
    return (
      other !== null &&
      this.name === other.name &&
      this.data === other.data &&
      this.master === other.master &&
      this.client === other.client &&
      this.timestamp === other.timestamp
    );
  }

  /** No name and every type shown: nothing is being filtered out. */
  isBlank(): boolean {
    return !notEmpty(this.name) && this.data && this.master && this.client;
  }

  matches(node: FilterableNode): boolean {
    return this.isBlank() || (this.matchesName(node.name) && this.matchesType(node));
  }

  matchesType(node: FilterableNode): boolean {
    return (
      (node.data && this.data) || (node.master && this.master) || (node.client && this.client)
    );
  }

  matchesName(name: string): boolean {
    return notEmpty(this.name) ? name.toLowerCase().includes(this.name.toLowerCase()) : true;
  }

  static sortByName(a: FilterableNode, b: FilterableNode): number {
    return a.name.localeCompare(b.name);
  }
}
