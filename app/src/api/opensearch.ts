import {RequestError, request, requestAll} from './client';
import {BrokenCluster} from '@/model/broken-cluster';
import {
  Cluster,
  type ClusterHealth,
  type ClusterSettingsResponse,
  type IndicesStats,
  type NodesResponse,
  type NodesStatsResponse,
} from '@/model/cluster';
import type {ClusterState, IndexAliases} from '@/model/opensearch-index';

/**
 * The eight calls one cluster poll makes. Kept as named constants so the
 * screens and the tests refer to the same paths.
 */
export const CLUSTER_PATHS = {
  state: '/_cluster/state/master_node,routing_table,blocks/',
  indexStats: '/_stats/docs,store',
  nodesStats: '/_nodes/stats/jvm,fs,os,process',
  settings: '/_cluster/settings',
  aliases: '/_aliases',
  health: '/_cluster/health',
  nodes: '/_nodes/_all/os,jvm',
  main: '/',
} as const;

/** The reduced set used when the full poll cannot be assembled. */
export const BROKEN_CLUSTER_PATHS = {
  state: '/_cluster/state/master_node,blocks?local=true',
  nodesStats: '/_nodes/stats/jvm,fs,os',
  settings: '/_cluster/settings?local=true',
  health: '/_cluster/health?local=true',
  nodes: '/_nodes/_all/os,jvm',
} as const;

export class ClusterUnavailableError extends Error {
  constructor(readonly causes: RequestError[]) {
    super(ClusterUnavailableError.describe(causes));
    this.name = 'ClusterUnavailableError';
  }

  private static describe(causes: RequestError[]): string {
    const first = causes[0];
    return first === undefined ? 'The cluster could not be read' : first.message;
  }

  /** True when every failure was an authentication one. */
  get isAuthFailure(): boolean {
    return this.causes.length > 0 && this.causes.every((cause) => cause.isAuthFailure);
  }
}

/**
 * Assembles a full cluster view.
 *
 * Cluster settings are the one response the UI can do without: a denied or
 * failing /_cluster/settings resolves to {} rather than sinking the poll.
 * Every other failure is collected and reported together, so the caller can
 * decide to fall back rather than being handed a single arbitrary error.
 */
export async function fetchCluster(signal?: AbortSignal): Promise<Cluster> {
  const results = await requestAll({
    state: request<ClusterState>(CLUSTER_PATHS.state, {signal}),
    indexStats: request<IndicesStats>(CLUSTER_PATHS.indexStats, {signal}),
    nodesStats: request<NodesStatsResponse>(CLUSTER_PATHS.nodesStats, {signal}),
    settings: request<ClusterSettingsResponse>(CLUSTER_PATHS.settings, {signal}),
    aliases: request<Record<string, IndexAliases>>(CLUSTER_PATHS.aliases, {signal}),
    health: request<ClusterHealth>(CLUSTER_PATHS.health, {signal}),
    nodes: request<NodesResponse>(CLUSTER_PATHS.nodes, {signal}),
    main: request<{name: string; version?: {number?: string}}>(CLUSTER_PATHS.main, {signal}),
  });

  const required = [
    results.state,
    results.indexStats,
    results.nodesStats,
    results.aliases,
    results.health,
    results.nodes,
    results.main,
  ];
  const failures = required
    .map((result) => result.error)
    .filter((error): error is RequestError => error !== undefined);
  if (failures.length > 0) {
    throw new ClusterUnavailableError(failures);
  }

  return new Cluster(
    results.health.value!,
    results.state.value!,
    results.indexStats.value!,
    results.nodesStats.value!,
    results.settings.value,
    results.aliases.value!,
    results.nodes.value!,
    results.main.value!,
  );
}

/**
 * The reduced view: health, topology and settings, read with local=true so it
 * answers even when the cluster has no elected master.
 */
export async function fetchBrokenCluster(signal?: AbortSignal): Promise<BrokenCluster> {
  const results = await requestAll({
    state: request<ClusterState>(BROKEN_CLUSTER_PATHS.state, {signal}),
    nodesStats: request<NodesStatsResponse>(BROKEN_CLUSTER_PATHS.nodesStats, {signal}),
    settings: request<ClusterSettingsResponse>(BROKEN_CLUSTER_PATHS.settings, {signal}),
    health: request<ClusterHealth>(BROKEN_CLUSTER_PATHS.health, {signal}),
    nodes: request<NodesResponse>(BROKEN_CLUSTER_PATHS.nodes, {signal}),
  });

  const failures = [results.state, results.nodesStats, results.health, results.nodes]
    .map((result) => result.error)
    .filter((error): error is RequestError => error !== undefined);
  if (failures.length > 0) {
    throw new ClusterUnavailableError(failures);
  }

  return new BrokenCluster(
    results.health.value!,
    results.state.value!,
    results.nodesStats.value!,
    results.settings.value,
    results.nodes.value!,
  );
}
