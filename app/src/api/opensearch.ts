import {RequestError, request, requestAll} from './client';
import {CatResult} from '@/model/cat-result';
import {HotThreads, type NodeHotThreads} from '@/model/hot-threads';
import {NodeStats} from '@/model/cluster-node';
import {ShardStats} from '@/model/shard';
import {
  IndexMetadata,
  Token,
  type IndexMetadataResponse,
} from '@/model/index-metadata';
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

/**
 * The _cat APIs the screen offers.
 *
 * Nine more exist and are deliberately absent here, matching what the
 * AngularJS screen shipped; restoring indices/nodes/shards/health is its own
 * change, not part of the port.
 */
export const CAT_APIS = ['aliases', 'count', 'master', 'plugins', 'recovery'] as const;

export type CatApi = (typeof CAT_APIS)[number];

/** Runs one _cat call. ?v asks for the header row the parser needs. */
export async function fetchCat(api: string, signal?: AbortSignal): Promise<CatResult> {
  const text = await request<string>(`/_cat/${encodeURIComponent(api)}?v`, {signal});
  // request() parses JSON when it can; _cat without format=json is plain text,
  // and comes back as the string it already is.
  return new CatResult(typeof text === 'string' ? text : JSON.stringify(text));
}

export interface HotThreadsOptions {
  /** Node id, or empty for every node. */
  node?: string;
  type: 'cpu' | 'wait' | 'block';
  threads: number;
  interval: string;
  ignoreIdleThreads: boolean;
}

/** Samples hot threads. The response is plain text, one section per node. */
export async function fetchHotThreads(
  options: HotThreadsOptions,
  signal?: AbortSignal,
): Promise<NodeHotThreads[]> {
  const target = options.node ? `/${encodeURIComponent(options.node)}` : '';
  const query = new URLSearchParams({
    type: options.type,
    threads: String(options.threads),
    ignore_idle_threads: String(options.ignoreIdleThreads),
    interval: options.interval,
  });
  const body = await request<string>(`/_nodes${target}/hot_threads?${query}`, {signal});
  return new HotThreads(typeof body === 'string' ? body : JSON.stringify(body)).nodes_hot_threads;
}

/**
 * Full stats for one node, for the details dialog.
 *
 * ?human asks OpenSearch to add the readable variants beside the raw numbers.
 * The AngularJS version built NodeStats with an undefined `name` identifier
 * that resolved to window.name, so the id it carried was the window's, not the
 * node's; the node id is passed here.
 */
export async function fetchNodeStats(
  nodeId: string,
  signal?: AbortSignal,
): Promise<NodeStats> {
  const response = await request<{nodes: Record<string, {name: string}>}>(
    `/_nodes/${encodeURIComponent(nodeId)}/stats?human`,
    {signal},
  );
  return new NodeStats(nodeId, response.nodes[nodeId]);
}

/** Mappings and settings for one index, for the analysis screen. */
export async function fetchIndexMetadata(
  index: string,
  signal?: AbortSignal,
): Promise<IndexMetadata> {
  const response = await request<{
    metadata: {indices: Record<string, IndexMetadataResponse>};
  }>(`/_cluster/state/metadata/${encodeURIComponent(index)}?human`, {signal});
  return new IndexMetadata(index, response.metadata.indices[index]);
}

async function analyze(
  index: string,
  body: Record<string, string>,
  signal?: AbortSignal,
): Promise<Token[]> {
  const response = await request<{tokens: Token[]}>(
    `/${encodeURIComponent(index)}/_analyze`,
    {method: 'POST', body, signal},
  );
  return response.tokens.map(
    (t) => new Token(t.token, t.start_offset, t.end_offset, t.position),
  );
}

/** Tokenises text with the analyzer configured for one field. */
export function analyzeByField(
  index: string,
  field: string,
  text: string,
  signal?: AbortSignal,
): Promise<Token[]> {
  return analyze(index, {text, field}, signal);
}

/** Tokenises text with a named analyzer. */
export function analyzeByAnalyzer(
  index: string,
  analyzer: string,
  text: string,
  signal?: AbortSignal,
): Promise<Token[]> {
  return analyze(index, {text, analyzer}, signal);
}

/* ---------------------------------------------------------------------------
 * Index operations. Every one of these changes the cluster; the screens gate
 * them behind a confirmation dialog.
 * ------------------------------------------------------------------------ */

/** Accepts a comma-separated list, which is how the bulk actions are issued. */
export function deleteIndex(index: string): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}`, {method: 'DELETE'});
}

export function optimizeIndex(index: string): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}/_forcemerge`, {method: 'POST'});
}

export function refreshIndex(index: string): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}/_refresh`, {method: 'POST'});
}

export function clearIndexCache(index: string): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}/_cache/clear`, {method: 'POST'});
}

export function openIndex(index: string): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}/_open`, {method: 'POST'});
}

export function closeIndex(index: string): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}/_close`, {method: 'POST'});
}

/** Transient, so it does not survive a full cluster restart. */
export function setShardAllocation(enabled: boolean): Promise<unknown> {
  return request('/_cluster/settings', {
    method: 'PUT',
    body: {transient: {'cluster.routing.allocation.enable': enabled ? 'all' : 'none'}},
  });
}

export function relocateShard(
  shard: number,
  index: string,
  fromNode: string,
  toNode: string,
): Promise<unknown> {
  return request('/_cluster/reroute', {
    method: 'POST',
    body: {commands: [{move: {shard, index, from_node: fromNode, to_node: toNode}}]},
  });
}

interface ShardsStatsResponse {
  indices: Record<string, {shards: Record<string, {routing: {node: string}}[]>}>;
}

interface RecoveryResponse {
  [index: string]: {shards: {id: number; target: {id: string}}[]};
}

/**
 * Stats for one shard copy.
 *
 * A started shard is described by _stats; one that is still recovering is not,
 * so _recovery answers for it instead. Both are requested together because
 * which one applies is only known from the first response.
 */
export async function fetchShardStats(
  shard: number,
  index: string,
  nodeId: string,
  signal?: AbortSignal,
): Promise<ShardStats> {
  const results = await requestAll({
    stats: request<ShardsStatsResponse>(
      `/${encodeURIComponent(index)}/_stats?level=shards&human`,
      {signal},
    ),
    recovery: request<RecoveryResponse>(
      `/${encodeURIComponent(index)}/_recovery?active_only=true&human`,
      {signal},
    ),
  });
  if (results.stats.error !== undefined) {
    throw results.stats.error;
  }

  const copies = results.stats.value!.indices[index]?.shards[String(shard)] ?? [];
  const started = copies.filter((copy) => copy.routing.node === nodeId);
  if (started.length === 1) {
    return new ShardStats(shard, index, started[0]);
  }

  if (results.recovery.error !== undefined) {
    throw results.recovery.error;
  }
  const recovering = (results.recovery.value![index]?.shards ?? []).filter(
    (entry) => entry.target.id === nodeId && entry.id === shard,
  );
  return new ShardStats(shard, index, recovering[0]);
}
