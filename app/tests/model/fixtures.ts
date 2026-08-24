import type {
  ClusterHealth,
  IndicesStats,
  NodesResponse,
  NodesStatsResponse,
} from '@/model/cluster';
import type {ClusterState} from '@/model/opensearch-index';
import type {ShardRouting} from '@/model/shard';

export function health(overrides: Partial<ClusterHealth> = {}): ClusterHealth {
  return {
    status: 'green',
    initializing_shards: 0,
    active_primary_shards: 0,
    active_shards: 0,
    relocating_shards: 0,
    unassigned_shards: 0,
    number_of_nodes: 1,
    number_of_data_nodes: 1,
    timed_out: false,
    ...overrides,
  };
}

export function emptyStats(): IndicesStats {
  return {indices: {}, _all: {primaries: {}, total: {}}};
}

export function nodes(): NodesResponse {
  return {
    nodes: {
      n1: {
        name: 'search01',
        version: '3.8.0',
        transport_address: '127.0.0.1:9300',
        host: '127.0.0.1',
        roles: ['cluster_manager', 'data'],
        jvm: {version: '21'},
        os: {available_processors: 4},
      },
    },
  };
}

export function nodesStats(): NodesStatsResponse {
  return {
    nodes: {
      n1: {
        jvm: {uptime_in_millis: 1, mem: {}},
        fs: {total: {}},
        process: {cpu: {}},
        os: {cpu: {}},
      },
    },
  };
}

export function shardRouting(overrides: Partial<ShardRouting> = {}): ShardRouting {
  return {primary: true, shard: 0, state: 'STARTED', node: 'n1', index: 'test-index', ...overrides};
}

/** A cluster state with one index, whose routing table has one started shard. */
export function state(overrides: Partial<ClusterState> = {}): ClusterState {
  return {
    cluster_name: 'fess-search',
    master_node: 'n1',
    routing_table: {
      indices: {'test-index': {shards: {0: [shardRouting()]}}},
    },
    blocks: {},
    ...overrides,
  };
}
