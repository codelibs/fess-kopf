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
  phase_latency_map?: Record<string, number>;
  measurements?: Partial<Record<TopQueryMetric, Measurement>>;
}

/** One phase of a search, and the milliseconds it took. */
export interface PhaseLatency {
  phase: string;
  ms: number;
}

/**
 * The order the phases run in, so the breakdown reads as a sequence rather
 * than as whatever order the map happened to serialise in. Anything the
 * cluster reports that is not listed here follows, alphabetically.
 */
const PHASE_ORDER = ['can_match', 'dfs_pre_query', 'query', 'fetch', 'expand'];

function orderPhases(map: Record<string, number>): PhaseLatency[] {
  return Object.entries(map)
    .map(([phase, ms]) => ({phase, ms}))
    .sort((a, b) => {
      const left = PHASE_ORDER.indexOf(a.phase);
      const right = PHASE_ORDER.indexOf(b.phase);
      if (left !== right) {
        const first = left === -1 ? PHASE_ORDER.length : left;
        const second = right === -1 ? PHASE_ORDER.length : right;
        return first - second;
      }
      return a.phase.localeCompare(b.phase);
    });
}

/**
 * The history hands the source back as a JSON string on 3.8.0 and as an
 * object on 2.19.1, while the in-memory listing gives an object on both.
 * Parsing here means the dialog that shows it, and any code that reads it,
 * only ever sees the one shape -- and a string that is not JSON is kept as
 * it stands rather than thrown away.
 */
function readSource(source: unknown): unknown {
  if (typeof source !== 'string') {
    return source;
  }
  try {
    return JSON.parse(source);
  } catch {
    return source;
  }
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
  /** Where the time went, in the order the phases ran. */
  readonly phases: PhaseLatency[];
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
    this.source = readSource(raw.source);
    this.phases = orderPhases(raw.phase_latency_map ?? {});
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
