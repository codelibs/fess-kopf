import {ClusterNode} from './cluster-node';
import type {
  ClusterHealth,
  ClusterSettingsResponse,
  NodesResponse,
  NodesStatsResponse,
} from './cluster';
import type {Index, ClusterState} from './opensearch-index';
import {getTimeString, isDefined, readablizeBytes} from './util';

/**
 * What can still be shown when the calls that describe the indices fail.
 *
 * Health, topology and settings survive; indices do not, so the screens that
 * need them degrade instead of the whole page going blank.
 */
export class BrokenCluster {
  readonly status: string;
  readonly initializing_shards: number;
  readonly active_primary_shards: number;
  readonly active_shards: number;
  readonly relocating_shards: number;
  readonly unassigned_shards: number;
  readonly number_of_nodes: number;
  readonly number_of_data_nodes: number;
  readonly timed_out: boolean;
  readonly shards: number;
  readonly fetched_at: string;
  readonly name: string;
  readonly master_node: string;
  readonly settings: ClusterSettingsResponse | undefined;
  readonly settingsAvailable: boolean;
  readonly nodes: ClusterNode[];
  /** Always 0: there are no index stats to total up. */
  readonly total_size: string | number;
  readonly total_size_in_bytes = 0;
  readonly indices: Index[] = [];

  constructor(
    health: ClusterHealth,
    state: ClusterState,
    nodesStats: NodesStatsResponse,
    settings: ClusterSettingsResponse | undefined,
    nodes: NodesResponse,
  ) {
    this.status = health.status;
    this.initializing_shards = health.initializing_shards;
    this.active_primary_shards = health.active_primary_shards;
    this.active_shards = health.active_shards;
    this.relocating_shards = health.relocating_shards;
    this.unassigned_shards = health.unassigned_shards;
    this.number_of_nodes = health.number_of_nodes;
    this.number_of_data_nodes = health.number_of_data_nodes;
    this.timed_out = health.timed_out;
    this.shards =
      this.active_shards +
      this.relocating_shards +
      this.unassigned_shards +
      this.initializing_shards;

    this.fetched_at = getTimeString(new Date());
    this.name = state.cluster_name;
    this.master_node = state.master_node;

    this.settings = settings;
    // Byte-identical to Cluster's predicate on purpose: a screen must not
    // decide settings are available on one and not the other.
    this.settingsAvailable =
      isDefined(settings) && (isDefined(settings!.persistent) || isDefined(settings!.transient));

    this.nodes = Object.keys(nodes.nodes).map((nodeId) => {
      const node = new ClusterNode(nodeId, nodesStats.nodes[nodeId], nodes.nodes[nodeId]);
      if (nodeId === state.master_node) {
        node.setCurrentMaster();
      }
      return node;
    });

    this.total_size = readablizeBytes(this.total_size_in_bytes);
  }

  getNodes(): ClusterNode[] {
    return this.nodes;
  }
}
