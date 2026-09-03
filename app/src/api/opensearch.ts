import {RequestError, request, requestAll} from './client';
import {CatResult} from '@/model/cat-result';
import {HotThreads, type NodeHotThreads} from '@/model/hot-threads';
import {NodeStats} from '@/model/cluster-node';
import {ShardStats} from '@/model/shard';
import {Alias, IndexAliases} from '@/model/alias';
import {parseTemplates, type IndexTemplate, type TemplateKind} from '@/model/index-template';
import {Repository, Snapshot, type SnapshotInfo} from '@/model/snapshot';
import {IndexMetadata, type IndexMetadataResponse} from '@/model/index-metadata';
import {
  parseAnalysis,
  type AnalysisResult,
  type AnalyzeResponse,
} from '@/model/analysis';
import {BrokenCluster} from '@/model/broken-cluster';
import {parseCatApis} from '@/model/cat-apis';
import {KnnStats, type KnnStatsResponse} from '@/model/knn-stats';
import type {LiveQueryResponse} from '@/model/live-query';
import type {TopQueryMetric, TopQueryResponse} from '@/model/top-query';
import {
  Cluster,
  type ClusterHealth,
  type ClusterSettingsResponse,
  type IndicesStats,
  type NodesResponse,
  type NodesStatsResponse,
} from '@/model/cluster';
import type {ClusterState, IndexAliasesResponse} from '@/model/opensearch-index';

/**
 * The eight calls one cluster poll makes. Kept as named constants so the
 * screens and the tests refer to the same paths.
 */
export const CLUSTER_PATHS = {
  state: '/_cluster/state/master_node,cluster_manager_node,routing_table,blocks/',
  indexStats: '/_stats/docs,store,indexing,search',
  nodesStats: '/_nodes/stats/jvm,fs,os,process',
  settings: '/_cluster/settings',
  aliases: '/_aliases',
  health: '/_cluster/health',
  nodes: '/_nodes/_all/os,jvm',
  main: '/',
} as const;

/** The reduced set used when the full poll cannot be assembled. */
export const BROKEN_CLUSTER_PATHS = {
  state: '/_cluster/state/master_node,cluster_manager_node,blocks?local=true',
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
    aliases: request<Record<string, IndexAliasesResponse>>(CLUSTER_PATHS.aliases, {signal}),
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

/**
 * The _cat APIs this cluster publishes.
 *
 * GET /_cat answers with its own index, so the list does not have to be
 * hard-coded per OpenSearch version -- 2.19.1 and 3.8.0 return the same
 * thirty-one entries, and a later version's list arrives without a release
 * here. A body that is not the cat index yields nothing, which the caller
 * turns into the CAT_APIS fallback.
 */
export async function fetchCatApis(signal?: AbortSignal): Promise<string[]> {
  const body = await request<string>('/_cat', {signal});
  return typeof body === 'string' ? parseCatApis(body) : [];
}

interface NodesPluginsResponse {
  nodes?: Record<string, {plugins?: {name: string}[]}>;
}

/**
 * Every plugin installed anywhere in the cluster, sorted.
 *
 * This is what decides whether a plugin-backed screen exists at all, which
 * is the only honest way to support 2.x and 3.x from one build: the
 * difference between them is not a version number, it is what is installed.
 *
 * Deliberately not part of the cluster poll -- the answer changes when a
 * node restarts, not every few seconds.
 */
export async function fetchInstalledPlugins(signal?: AbortSignal): Promise<string[]> {
  const response = await request<NodesPluginsResponse>('/_nodes/_all/plugins', {signal});
  const names = new Set<string>();
  Object.values(response.nodes ?? {}).forEach((node) => {
    (node.plugins ?? []).forEach((plugin) => names.add(plugin.name));
  });
  return [...names].sort();
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

/**
 * One _analyze call, however the caller wants the text analysed.
 *
 * `index` is optional: without one the request goes to the cluster-wide
 * /_analyze, which knows the built-in analyzers and nothing an index
 * defines. Everything else is a choice between naming a field, naming an
 * analyzer, or composing a chain out of a tokenizer and filters.
 */
export interface AnalyzeRequest {
  index?: string;
  field?: string;
  analyzer?: string;
  charFilters?: string[];
  tokenizer?: string;
  filters?: string[];
  text: string;
  /** Ask for the chain rather than only its result. */
  explain?: boolean;
}

/** Tokenises text, and with `explain` reports every stage that touched it. */
export async function analyzeText(
  options: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const body: Record<string, unknown> = {text: options.text};
  if (options.field !== undefined && options.field !== '') {
    body.field = options.field;
  }
  if (options.analyzer !== undefined && options.analyzer !== '') {
    body.analyzer = options.analyzer;
  }
  if (options.tokenizer !== undefined && options.tokenizer !== '') {
    body.tokenizer = options.tokenizer;
  }
  if (options.charFilters !== undefined && options.charFilters.length > 0) {
    body.char_filter = options.charFilters;
  }
  if (options.filters !== undefined && options.filters.length > 0) {
    body.filter = options.filters;
  }
  if (options.explain === true) {
    body.explain = true;
  }

  const index = options.index ?? '';
  const path = index === '' ? '/_analyze' : `/${encodeURIComponent(index)}/_analyze`;
  return parseAnalysis(await request<AnalyzeResponse>(path, {method: 'POST', body, signal}));
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

/**
 * Writes index settings.
 *
 * The body carries only the updatable settings: create-time settings such as
 * index.codec make the whole call fail if they are resent.
 */
export function updateIndexSettings(
  index: string,
  settings: Record<string, string>,
): Promise<unknown> {
  return request(`/${encodeURIComponent(index)}/_settings`, {method: 'PUT', body: settings});
}

interface AliasesResponse {
  [index: string]: {
    aliases?: Record<
      string,
      {filter?: Record<string, unknown>; index_routing?: string; search_routing?: string}
    >;
  };
}

/** Every index that has at least one alias. */
export async function fetchAliases(signal?: AbortSignal): Promise<IndexAliases[]> {
  const response = await request<AliasesResponse>('/_aliases', {signal});
  return Object.keys(response)
    .filter((index) => Object.keys(response[index].aliases ?? {}).length > 0)
    .map((index) => {
      const aliases = Object.entries(response[index].aliases!).map(
        ([name, info]) =>
          new Alias(name, index, info.filter, info.index_routing, info.search_routing),
      );
      return new IndexAliases(index, aliases);
    });
}

/**
 * Applies alias changes in one atomic call.
 *
 * A removal carries no filter: OpenSearch matches the binding by index and
 * alias name, and sending a filter it does not have makes the action fail.
 */
export function updateAliases(add: Alias[], remove: Alias[]): Promise<unknown> {
  const actions: Record<string, unknown>[] = [];
  add.forEach((alias) => actions.push({add: alias.info()}));
  remove.forEach((alias) => {
    const info = alias.info();
    delete info.filter;
    actions.push({remove: info});
  });
  return request('/_aliases', {method: 'POST', body: {actions}});
}

/** Creates an index. The body is the settings/mappings document, as text. */
export function createIndex(name: string, body: string): Promise<unknown> {
  return request(`/${encodeURIComponent(name)}`, {method: 'PUT', body});
}

/**
 * Where each kind of template lives.
 *
 * All three are answered by 2.19.1 and 3.8.0. The composable pair is what
 * current OpenSearch documents; `_template` is deprecated but still served,
 * and reading only it -- which this screen used to do -- reports "no
 * templates" on a cluster whose templates were all made the modern way.
 */
export const TEMPLATE_PATHS: Record<TemplateKind, string> = {
  component: '/_component_template',
  index: '/_index_template',
  legacy: '/_template',
} as const;

/** Every template of one kind. */
export async function fetchTemplates(
  kind: TemplateKind,
  signal?: AbortSignal,
): Promise<IndexTemplate[]> {
  const response = await request<Parameters<typeof parseTemplates>[1]>(
    TEMPLATE_PATHS[kind],
    {signal},
  );
  return parseTemplates(kind, response);
}

/** Creates or replaces a template. The body is sent as the text that was typed. */
export function createTemplate(kind: TemplateKind, name: string, body: string): Promise<unknown> {
  return request(`${TEMPLATE_PATHS[kind]}/${encodeURIComponent(name)}`, {method: 'PUT', body});
}

export function deleteTemplate(kind: TemplateKind, name: string): Promise<unknown> {
  return request(`${TEMPLATE_PATHS[kind]}/${encodeURIComponent(name)}`, {method: 'DELETE'});
}

/** Every registered snapshot repository. */
export async function fetchRepositories(signal?: AbortSignal): Promise<Repository[]> {
  type RepositoryInfo = {type?: string; settings?: Record<string, string>};
  const response = await request<Record<string, RepositoryInfo>>('/_snapshot/_all', {signal});
  return Object.keys(response).map((name) => new Repository(name, response[name]));
}

export function createRepository(name: string, body: string): Promise<unknown> {
  return request(`/_snapshot/${encodeURIComponent(name)}`, {method: 'POST', body});
}

export function deleteRepository(name: string): Promise<unknown> {
  return request(`/_snapshot/${encodeURIComponent(name)}`, {method: 'DELETE'});
}

/** Every snapshot in one repository. */
export async function fetchSnapshots(
  repository: string,
  signal?: AbortSignal,
): Promise<Snapshot[]> {
  const response = await request<{snapshots: SnapshotInfo[]}>(
    `/_snapshot/${encodeURIComponent(repository)}/_all`,
    {signal},
  );
  return response.snapshots.map((info) => new Snapshot(info));
}

export function createSnapshot(
  repository: string,
  snapshot: string,
  body: string,
): Promise<unknown> {
  return request(
    `/_snapshot/${encodeURIComponent(repository)}/${encodeURIComponent(snapshot)}`,
    {method: 'PUT', body},
  );
}

export function deleteSnapshot(repository: string, snapshot: string): Promise<unknown> {
  return request(
    `/_snapshot/${encodeURIComponent(repository)}/${encodeURIComponent(snapshot)}`,
    {method: 'DELETE'},
  );
}

export function restoreSnapshot(
  repository: string,
  snapshot: string,
  body: string,
): Promise<unknown> {
  return request(
    `/_snapshot/${encodeURIComponent(repository)}/${encodeURIComponent(snapshot)}/_restore`,
    {method: 'POST', body},
  );
}

/** Methods the Fetch API refuses to give a body to. */
export const BODYLESS_METHODS = ['GET', 'HEAD'];

/**
 * Issues an arbitrary request from the REST client.
 *
 * GET and HEAD go out without a body whatever is in the editor: fetch()
 * rejects one outright ("Request with GET/HEAD method cannot have body"),
 * where the XHR the AngularJS client used would send it. The screen says so
 * rather than letting the request fail.
 */
export function restRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
  path: string,
  body: string,
): Promise<unknown> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const options: {method: typeof method; body?: string} = {method};
  if (!BODYLESS_METHODS.includes(method) && body.trim() !== '') {
    options.body = body;
  }
  return request(encodeURI(normalized), options);
}

/* ---------------------------------------------------------------------------
 * Diagnostics: why a shard is not allocated, and what the cluster is doing.
 * ------------------------------------------------------------------------ */

export interface AllocationDecider {
  decider: string;
  decision: string;
  explanation: string;
}

export interface NodeAllocationDecision {
  node_id: string;
  node_name: string;
  node_decision: string;
  deciders?: AllocationDecider[];
}

export interface AllocationExplanation {
  index: string;
  shard: number;
  primary: boolean;
  current_state?: string;
  unassigned_info?: {reason?: string; at?: string; details?: string};
  can_allocate?: string;
  allocate_explanation?: string;
  node_allocation_decisions?: NodeAllocationDecision[];
}

/** The one shard to explain, or nothing for "any unassigned shard". */
export interface AllocationTarget {
  index: string;
  shard: number;
  primary: boolean;
}

/**
 * A healthy cluster answers the explain API with 400, not with an empty
 * body. Distinguishing that from a real failure is the whole reason this
 * check exists.
 */
const NO_UNASSIGNED = 'unable to find any unassigned shards';

function isNothingToExplain(error: RequestError): boolean {
  if (error.status !== 400) {
    return false;
  }
  const reason = (error.body as {error?: {reason?: string}} | undefined)?.error?.reason ?? '';
  return reason.includes(NO_UNASSIGNED);
}

/**
 * Asks why a shard is where it is -- or why it is nowhere.
 *
 * POST, not GET: naming a shard needs a body, and fetch() refuses to give
 * one to a GET. Resolves null when the cluster has nothing to explain, which
 * is what a green cluster answers with a 400.
 */
export async function explainAllocation(
  target?: AllocationTarget,
  signal?: AbortSignal,
): Promise<AllocationExplanation | null> {
  try {
    return await request<AllocationExplanation>('/_cluster/allocation/explain', {
      method: 'POST',
      body: target,
      signal,
    });
  } catch (error) {
    if (error instanceof RequestError && isNothingToExplain(error)) {
      return null;
    }
    throw error;
  }
}

export interface TaskResponse {
  node: string;
  id: number;
  action: string;
  description?: string;
  start_time_in_millis: number;
  running_time_in_nanos: number;
  cancellable: boolean;
  cancelled?: boolean;
  parent_task_id?: string;
}

/** Every task running anywhere in the cluster, flattened and detailed. */
export async function fetchTasks(signal?: AbortSignal): Promise<TaskResponse[]> {
  const response = await request<{tasks?: TaskResponse[]}>(
    '/_tasks?detailed&group_by=none',
    {signal},
  );
  return response.tasks ?? [];
}

/** Asks one task to stop. Only tasks that report themselves cancellable. */
export function cancelTask(taskId: string): Promise<unknown> {
  return request(`/_tasks/${encodeURIComponent(taskId)}/_cancel`, {method: 'POST'});
}

/* ---------------------------------------------------------------------------
 * Plugin-backed endpoints. Each screen that uses one is only offered when
 * useCapabilities found the plugin installed.
 * ------------------------------------------------------------------------ */

/**
 * The searches the Query Insights plugin kept, ranked by one measurement.
 *
 * Collection is not on by default everywhere: 3.8.0 records without any
 * configuration, 2.19.1 answers with an empty list until
 * `search.insights.top_queries.<metric>.enabled` is set. An empty response
 * is therefore not necessarily "nothing was slow", and the screen says so.
 */
export async function fetchTopQueries(
  metric: TopQueryMetric,
  range?: {from: Date; to: Date},
  signal?: AbortSignal,
): Promise<TopQueryResponse[]> {
  // ISO 8601 with milliseconds, which is what toISOString() already emits and
  // the only format the endpoint accepts -- epoch millis are rejected with a
  // 400 naming the expected pattern. Measured on 2.19.1 and 3.8.0 alike.
  const window =
    range === undefined
      ? ''
      : `&from=${encodeURIComponent(range.from.toISOString())}` +
        `&to=${encodeURIComponent(range.to.toISOString())}`;
  const response = await request<{top_queries?: TopQueryResponse[]}>(
    `/_insights/top_queries?type=${encodeURIComponent(metric)}${window}`,
    {signal},
  );
  return response.top_queries ?? [];
}

/**
 * The searches running at this instant, costliest first.
 *
 * 3.x only: 2.19.1's Query Insights has no such route and answers
 * `no handler found for uri [/_insights/live_queries]` with a 400, which the
 * screen reports as "this cluster's plugin is older" rather than as a
 * failure. There is no capability probe for it -- the plugin is installed
 * either way, and the endpoint's own answer is the only thing that knows.
 */
export async function fetchLiveQueries(
  metric: TopQueryMetric,
  signal?: AbortSignal,
): Promise<LiveQueryResponse[]> {
  const response = await request<{live_queries?: LiveQueryResponse[]}>(
    `/_insights/live_queries?sort=${encodeURIComponent(metric)}`,
    {signal},
  );
  return response.live_queries ?? [];
}

/** The k-NN plugin's view of the vector cache, cluster-wide and per node. */
export async function fetchKnnStats(signal?: AbortSignal): Promise<KnnStats> {
  const response = await request<KnnStatsResponse>('/_plugins/_knn/stats', {signal});
  return new KnnStats(response);
}
