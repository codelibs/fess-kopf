import {getProperty, isDefined} from './util';
import type {ShardRouting} from './shard';

export interface RoutingTable {
  indices: Record<string, {shards: Record<string, ShardRouting[]>}>;
}

export interface ClusterState {
  cluster_name: string;
  /**
   * The elected node, under both names.
   *
   * OpenSearch renamed "master" to "cluster manager" and answers with both
   * fields -- verified on 2.19.1 and 3.8.0 -- but `master` is already gone
   * from the list `GET /_cat` publishes, so the current name is read first
   * and the old one is only the fallback.
   */
  cluster_manager_node?: string;
  master_node?: string;
  routing_table: RoutingTable;
  blocks: {indices?: Record<string, Record<string, unknown>>};
}

/** The elected node, whichever name this version answers with. */
export function clusterManagerNode(state: {
  cluster_manager_node?: string;
  master_node?: string;
}): string {
  return state.cluster_manager_node ?? state.master_node ?? '';
}

/** The per-index shape /_aliases returns; not the editable model. */
export interface IndexAliasesResponse {
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
  /**
   * How many documents are being written into this index at this instant.
   *
   * The one number that says a crawl is actually reaching the index, which
   * is why the poll asks for `indexing` and `search` alongside `docs` and
   * `store` -- it costs no extra call.
   */
  readonly indexing_current: number;
  readonly indexing_total: number;
  readonly search_query_total: number;
  readonly search_query_time_ms: number;
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
    aliases: IndexAliasesResponse | undefined,
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
    this.indexing_current = getProperty(indexStats, 'total.indexing.index_current', 0);
    this.indexing_total = getProperty(indexStats, 'total.indexing.index_total', 0);
    this.search_query_total = getProperty(indexStats, 'total.search.query_total', 0);
    this.search_query_time_ms = getProperty(indexStats, 'total.search.query_time_in_millis', 0);

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

  /**
   * Mean time per query since the node started.
   *
   * A cumulative average, not a rate: it needs no second sample, and it is
   * the honest thing a single poll can say.
   */
  get avg_query_time_ms(): number {
    return this.search_query_total === 0
      ? 0
      : this.search_query_time_ms / this.search_query_total;
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
