import type {TopQueryMetric} from '@/model/top-query';

interface TaskResponse {
  task_id?: string;
  node_id?: string;
  action?: string;
  status?: string;
  description?: string;
  running_time_nanos?: number;
  cpu_nanos?: number;
  memory_bytes?: number;
}

export interface LiveQueryResponse {
  id: string;
  status?: string;
  start_time?: number;
  total_latency_millis?: number;
  total_cpu_nanos?: number;
  total_memory_bytes?: number;
  coordinator_task?: TaskResponse;
  shard_tasks?: TaskResponse[];
}

/**
 * What the coordinator task's description says.
 *
 * The live queries endpoint does not carry the indices or the query as
 * fields the way the recorded ones do: they are only inside the task's
 * formatted description, which reads
 *
 *   indices[fess.search], search_type[QUERY_THEN_FETCH], source[{...}]
 *
 * and those two are exactly what an operator needs before deciding to kill
 * a search. The source is read to its last bracket, not its first: a query
 * DSL contains `]` of its own.
 */
export function parseDescription(description: string): {
  indices: string[];
  searchType: string;
  source?: unknown;
} {
  const indices = /(?:^|\s)indices\[([^\]]*)\]/.exec(description);
  const searchType = /search_type\[([^\]]*)\]/.exec(description);
  const at = description.indexOf('source[');
  let source: unknown;
  if (at !== -1 && description.endsWith(']')) {
    try {
      source = JSON.parse(description.substring(at + 'source['.length, description.length - 1));
    } catch {
      // A description kopf cannot read is still worth a row: the cost, the
      // node and the cancel button do not depend on it.
      source = undefined;
    }
  }
  return {
    indices:
      indices === null || indices[1] === ''
        ? []
        : indices[1].split(',').map((name) => name.trim()),
    searchType: searchType?.[1] ?? '',
    source,
  };
}

/**
 * One search that is running right now.
 *
 * `id` is `<node>:<taskId>`, the same form the tasks screen cancels with,
 * and cancelling it does stop the search -- measured against 3.8.0, where
 * the client gets a `task_cancelled_exception` back.
 */
export class LiveQuery {
  readonly id: string;
  readonly status: string;
  readonly startTime: number;
  readonly latencyMs: number;
  readonly cpuNanos: number;
  readonly memoryBytes: number;
  readonly nodeId: string;
  readonly shards: number;
  readonly indices: string[];
  readonly searchType: string;
  readonly source?: unknown;

  constructor(raw: LiveQueryResponse) {
    this.id = raw.id;
    this.status = raw.status ?? '';
    this.startTime = raw.start_time ?? 0;
    this.latencyMs = raw.total_latency_millis ?? 0;
    this.cpuNanos = raw.total_cpu_nanos ?? 0;
    this.memoryBytes = raw.total_memory_bytes ?? 0;
    this.nodeId = raw.coordinator_task?.node_id ?? '';
    this.shards = (raw.shard_tasks ?? []).length;
    const described = parseDescription(raw.coordinator_task?.description ?? '');
    this.indices = described.indices;
    this.searchType = described.searchType;
    this.source = described.source;
  }

  measurement(metric: TopQueryMetric): number {
    if (metric === 'latency') {
      return this.latencyMs;
    }
    return metric === 'cpu' ? this.cpuNanos : this.memoryBytes;
  }
}

/**
 * Costliest first. The endpoint takes a `sort`, but ordering here as well
 * keeps the table honest when a cluster answers in its own order.
 */
export function parseLiveQueries(
  raw: LiveQueryResponse[],
  metric: TopQueryMetric,
): LiveQuery[] {
  return raw
    .map((query) => new LiveQuery(query))
    .sort((a, b) => b.measurement(metric) - a.measurement(metric));
}
