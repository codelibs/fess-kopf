import {ClusterChanges} from './cluster-changes';
import {ClusterNode, type NodeInfo} from './cluster-node';
import {Index, type ClusterState, type IndexAliases} from './opensearch-index';
import {Shard} from './shard';
import {getProperty, getTimeString, isDefined} from './util';

export interface ClusterHealth {
  status: string;
  initializing_shards: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  unassigned_shards: number;
  number_of_nodes: number;
  number_of_data_nodes: number;
  timed_out: boolean;
}

export interface ClusterSettingsResponse {
  persistent?: Record<string, unknown>;
  transient?: Record<string, unknown>;
}

export interface IndicesStats {
  indices: Record<string, unknown>;
  _all: {primaries: Record<string, unknown>; total: Record<string, unknown>};
}

export interface NodesResponse {
  nodes: Record<string, NodeInfo>;
}

export interface NodesStatsResponse {
  nodes: Record<string, unknown>;
}

/** INDEX_CLOSED_BLOCK; see ClusterBlock(4, "index closed", ...) in OpenSearch. */
const INDEX_CLOSED_BLOCK = '4';

/**
 * The cluster as one poll saw it: health, topology, indices and shards.
 * Ported from src/kopf/opensearch/cluster.js.
 */
export class Cluster {
  readonly created_at = new Date().getTime();
  readonly clientName: string;
  /**
   * Engine version, from the same GET / that supplies clientName. The
   * AngularJS app issued a second request to / just to read this.
   */
  readonly version: string | undefined;
  readonly status: string;
  readonly initializing_shards: number;
  readonly active_primary_shards: number;
  readonly active_shards: number;
  readonly relocating_shards: number;
  readonly unassigned_shards: number;
  readonly number_of_data_nodes: number;
  readonly timed_out: boolean;
  readonly shards: number;
  readonly fetched_at: string;
  readonly name: string;
  readonly master_node: string;
  readonly disableAllocation: 'true' | 'false';
  readonly settings: ClusterSettingsResponse | undefined;
  readonly settingsAvailable: boolean;
  readonly nodes: ClusterNode[];
  readonly number_of_nodes: number;
  readonly indices: Index[];
  readonly special_indices: number;
  readonly closedIndices: number;
  readonly num_docs: number;
  readonly total_size_in_bytes: number;
  readonly total_indices: number;
  changes: ClusterChanges | null = null;

  private readonly assignedShards: Record<string, Shard[]> = {};
  private readonly unassignedShardsByIndex: Record<string, Shard[]> = {};

  constructor(
    health: ClusterHealth,
    state: ClusterState,
    stats: IndicesStats,
    nodesStats: NodesStatsResponse,
    settings: ClusterSettingsResponse | undefined,
    aliases: Record<string, IndexAliases>,
    nodes: NodesResponse,
    main: {name: string; version?: {number?: string}},
  ) {
    this.clientName = main.name;
    this.version = main.version?.number;

    this.status = health.status;
    this.initializing_shards = health.initializing_shards;
    this.active_primary_shards = health.active_primary_shards;
    this.active_shards = health.active_shards;
    this.relocating_shards = health.relocating_shards;
    this.unassigned_shards = health.unassigned_shards;
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

    // A transient setting overrides a persistent one; only an explicit 'all'
    // counts as allocation being enabled.
    const persistent = getProperty(
      settings,
      'persistent.cluster.routing.allocation.enable',
      'all',
    );
    const transient = getProperty(settings, 'transient.cluster.routing.allocation.enable', '');
    if (transient !== '') {
      this.disableAllocation = transient === 'all' ? 'false' : 'true';
    } else {
      this.disableAllocation = persistent !== 'all' ? 'true' : 'false';
    }

    this.settings = settings;
    this.settingsAvailable =
      isDefined(settings) && (isDefined(settings!.persistent) || isDefined(settings!.transient));

    this.nodes = Object.keys(nodes.nodes).map((nodeId) => {
      const node = new ClusterNode(nodeId, nodesStats.nodes[nodeId], nodes.nodes[nodeId]);
      if (nodeId === state.master_node) {
        node.setCurrentMaster();
      }
      return node;
    });
    this.number_of_nodes = this.nodes.length;

    const indicesNames = Object.keys(state.routing_table.indices);
    const indicesByName: Record<string, Index> = {};
    let specialIndices = 0;
    let closedIndices = 0;

    this.indices = indicesNames.map((indexName) => {
      const index = new Index(indexName, state, stats.indices[indexName], aliases[indexName]);
      if (index.special) {
        specialIndices++;
      }
      indicesByName[indexName] = index;
      return index;
    });

    if (isDefined(state.blocks.indices)) {
      Object.keys(state.blocks.indices!).forEach((indexName) => {
        if (!state.blocks.indices![indexName][INDEX_CLOSED_BLOCK]) {
          return;
        }
        const known = indicesByName[indexName];
        if (isDefined(known)) {
          // Already built from the routing table; mark it rather than adding
          // a second Index for the same name.
          known.markClosed();
        } else {
          // Absent from the routing table: build it without the cluster
          // state, which leaves it closed by default.
          const closed = new Index(indexName, undefined, undefined, aliases[indexName]);
          if (closed.special) {
            specialIndices++;
          }
          this.indices.push(closed);
          indicesByName[indexName] = closed;
        }
        closedIndices++;
      });
    }

    this.special_indices = specialIndices;
    this.closedIndices = closedIndices;

    const hasData = Object.keys(stats._all.primaries).length > 0;
    this.num_docs = hasData ? getProperty(stats._all, 'primaries.docs.count', 0) : 0;
    this.total_size_in_bytes = hasData
      ? getProperty(stats._all, 'total.store.size_in_bytes', 0)
      : 0;
    this.total_indices = this.indices.length;

    const indicesRouting = state.routing_table.indices;
    indicesNames.forEach((indexName) => {
      Object.keys(indicesRouting[indexName].shards).forEach((shardNum) => {
        indicesRouting[indexName].shards[shardNum].forEach((shardData) => {
          const shard = new Shard(shardData);
          if (shardData.state === 'UNASSIGNED') {
            (this.unassignedShardsByIndex[shardData.index] ??= []).push(shard);
          } else {
            (this.assignedShards[`${shard.node}_${shard.index}`] ??= []).push(shard);
          }
        });
      });
    });
  }

  getNodes(): ClusterNode[] {
    return this.nodes;
  }

  open_indices(): Index[] {
    return this.indices.filter((index) => index.state === 'open');
  }

  getShards(nodeId: string, indexName: string): Shard[] {
    return this.assignedShards[`${nodeId}_${indexName}`] ?? [];
  }

  getUnassignedShards(indexName: string): Shard[] {
    return this.unassignedShardsByIndex[indexName] ?? [];
  }

  /** Diffs this poll against the previous one, if it was the same cluster. */
  computeChanges(oldCluster: Cluster | undefined): void {
    const changes = new ClusterChanges();
    if (isDefined(oldCluster) && this.name === oldCluster!.name) {
      const old = oldCluster!;

      old.nodes
        .filter((node) => !this.nodes.some((current) => current.equals(node)))
        .forEach((node) => changes.addLeavingNode(node));

      if (old.nodes.length !== this.nodes.length || !changes.hasJoins()) {
        this.nodes
          .filter((node) => !old.nodes.some((previous) => previous.equals(node)))
          .forEach((node) => changes.addJoiningNode(node));
      }

      old.indices
        .filter((index) => !this.indices.some((current) => current.equals(index)))
        .forEach((index) => changes.addDeletedIndex(index));

      if (old.indices.length !== this.indices.length || !changes.hasCreatedIndices()) {
        this.indices
          .filter((index) => !old.indices.some((previous) => previous.equals(index)))
          .forEach((index) => changes.addCreatedIndex(index));
      }

      changes.setDocDelta(this.num_docs - old.num_docs);
      changes.setDataDelta(this.total_size_in_bytes - old.total_size_in_bytes);
    }
    this.changes = changes;
  }
}
