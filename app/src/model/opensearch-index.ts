import {getProperty, isDefined} from './util';
import type {ShardRouting} from './shard';

export interface RoutingTable {
  indices: Record<string, {shards: Record<string, ShardRouting[]>}>;
}

export interface ClusterState {
  cluster_name: string;
  master_node: string;
  routing_table: RoutingTable;
  blocks: {indices?: Record<string, Record<string, unknown>>};
}

export interface IndexAliases {
  aliases?: Record<string, unknown>;
}

/** One index, assembled from the cluster state, index stats and aliases. */
export class Index {
  readonly name: string;
  readonly aliases: string[];
  readonly num_of_shards: number = 0;
  readonly num_of_replicas: number = 0;
  readonly num_docs: number;
  readonly deleted_docs: number;
  readonly size_in_bytes: number;
  readonly total_size_in_bytes: number;
  readonly unassigned: ShardRouting[] = [];
  readonly special: boolean;
  unhealthy = false;
  state: 'open' | 'close' = 'close';
  closed: boolean;
  open: boolean;

  constructor(
    indexName: string,
    clusterState: ClusterState | undefined,
    indexStats: unknown,
    aliases: IndexAliases | undefined,
  ) {
    this.name = indexName;
    this.aliases = isDefined(aliases?.aliases) ? Object.keys(aliases!.aliases!) : [];

    if (isDefined(clusterState)) {
      const routing = getProperty<RoutingTable['indices']>(clusterState, 'routing_table.indices');
      this.state = 'open';
      if (isDefined(routing)) {
        const shardMap = routing![indexName].shards;
        this.num_of_shards = Object.keys(shardMap).length;
        this.num_of_replicas = shardMap[0].length - 1;
      }
    }

    this.num_docs = getProperty(indexStats, 'primaries.docs.count', 0);
    this.deleted_docs = getProperty(indexStats, 'primaries.docs.deleted', 0);
    this.size_in_bytes = getProperty(indexStats, 'primaries.store.size_in_bytes', 0);
    this.total_size_in_bytes = getProperty(indexStats, 'total.store.size_in_bytes', 0);

    if (isDefined(clusterState) && isDefined(clusterState!.routing_table)) {
      const shardsMap = clusterState!.routing_table.indices[this.name].shards;
      Object.keys(shardsMap).forEach((shardNum) => {
        shardsMap[shardNum].forEach((shard) => {
          if (shard.state !== 'STARTED') {
            this.unhealthy = true;
          }
        });
      });
    }

    // Indices whose name starts with . or _ are OpenSearch's own.
    this.special = this.name.startsWith('.') || this.name.startsWith('_');

    this.closed = this.state === 'close';
    this.open = this.state === 'open';
  }

  equals(index: {name: string} | null): boolean {
    return index !== null && index.name === this.name;
  }

  /**
   * Closed indices have appeared in the routing table since ES 7.2, so Cluster
   * builds them as open and marks them afterwards. State and the two derived
   * flags move together here so they cannot drift apart.
   */
  markClosed(): void {
    this.state = 'close';
    this.closed = true;
    this.open = false;
  }
}
