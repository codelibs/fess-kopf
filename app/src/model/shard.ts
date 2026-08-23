export interface ShardRouting {
  primary: boolean;
  shard: number;
  state: string;
  node: string | null;
  index: string;
}

/** One shard copy as it appears in the cluster state's routing table. */
export class Shard {
  readonly primary: boolean;
  readonly shard: number;
  readonly state: string;
  readonly node: string | null;
  readonly index: string;
  readonly id: string;

  constructor(routing: ShardRouting) {
    this.primary = routing.primary;
    this.shard = routing.shard;
    this.state = routing.state;
    this.node = routing.node;
    this.index = routing.index;
    this.id = `${this.node}_${this.shard}_${this.index}`;
  }
}

/**
 * Statistics for one shard copy.
 *
 * `shard` is the shard number, not a Shard: that is what getShardStats passes,
 * and it is the only place this is constructed.
 */
export class ShardStats {
  constructor(
    readonly shard: number,
    readonly index: string,
    readonly stats: unknown,
  ) {}
}
