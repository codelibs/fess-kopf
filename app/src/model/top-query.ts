/** The measurement the listing is ranked by. */
export type TopQueryMetric = 'latency' | 'cpu' | 'memory';

export const TOP_QUERY_METRICS: TopQueryMetric[] = ['latency', 'cpu', 'memory'];

interface Measurement {
  number: number;
  count?: number;
  aggregationType?: string;
}

export interface TopQueryResponse {
  id: string;
  timestamp: number;
  indices?: string[];
  node_id?: string;
  total_shards?: number;
  search_type?: string;
  source?: unknown;
  measurements?: Partial<Record<TopQueryMetric, Measurement>>;
}

/**
 * One of the searches the Query Insights plugin kept.
 *
 * The units are the plugin's, and they differ per measurement: latency is
 * milliseconds, CPU is nanoseconds, memory is bytes. Converting them here
 * keeps the screen from having to remember which is which.
 *
 * 2.19.1 and 3.8.0 answer with the same `measurements` shape; 3.8.0 adds
 * `failed`, `source_truncated` and `wlm_group_id`, which are not read, and
 * that is what makes one screen serve both.
 */
export class TopQuery {
  readonly id: string;
  readonly timestamp: number;
  readonly indices: string[];
  readonly nodeId: string;
  readonly totalShards: number;
  readonly searchType: string;
  readonly source: unknown;
  readonly latencyMs: number;
  readonly cpuNanos: number;
  readonly memoryBytes: number;

  constructor(raw: TopQueryResponse) {
    this.id = raw.id;
    this.timestamp = raw.timestamp;
    this.indices = raw.indices ?? [];
    this.nodeId = raw.node_id ?? '';
    this.totalShards = raw.total_shards ?? 0;
    this.searchType = raw.search_type ?? '';
    this.source = raw.source;
    this.latencyMs = raw.measurements?.latency?.number ?? 0;
    this.cpuNanos = raw.measurements?.cpu?.number ?? 0;
    this.memoryBytes = raw.measurements?.memory?.number ?? 0;
  }

  /** The value the listing was ranked by, for the column that shows it. */
  measurement(metric: TopQueryMetric): number {
    if (metric === 'latency') {
      return this.latencyMs;
    }
    return metric === 'cpu' ? this.cpuNanos : this.memoryBytes;
  }
}

/** Highest measurement first: the listing is a "top N", so it reads that way. */
export function parseTopQueries(
  raw: TopQueryResponse[],
  metric: TopQueryMetric,
): TopQuery[] {
  return raw
    .map((query) => new TopQuery(query))
    .sort((a, b) => b.measurement(metric) - a.measurement(metric));
}
