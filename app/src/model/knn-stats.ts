export interface KnnNodeResponse {
  graph_memory_usage?: number;
  graph_memory_usage_percentage?: number;
  cache_capacity_reached?: boolean;
  indices_in_cache?: Record<string, unknown>;
  hit_count?: number;
  miss_count?: number;
  eviction_count?: number;
  load_success_count?: number;
  load_exception_count?: number;
  knn_query_requests?: number;
  graph_index_errors?: number;
  graph_query_errors?: number;
}

export interface KnnStatsResponse {
  circuit_breaker_triggered?: boolean;
  model_index_status?: string | null;
  nodes?: Record<string, KnnNodeResponse>;
}

/** One node's share of the vector cache. */
export class KnnNodeStats {
  readonly nodeId: string;
  readonly graphMemoryBytes: number;
  readonly graphMemoryPercent: number;
  readonly cacheCapacityReached: boolean;
  readonly indicesInCache: string[];
  readonly hitCount: number;
  readonly missCount: number;
  readonly evictionCount: number;
  readonly loadExceptionCount: number;
  readonly queryRequests: number;
  readonly indexErrors: number;
  readonly queryErrors: number;

  constructor(nodeId: string, raw: KnnNodeResponse) {
    this.nodeId = nodeId;
    // Kilobytes, not bytes. Measured: 1297 reported against a 0.005382%
    // share, on a node whose /proc/meminfo says 49,243,308 kB -- which only
    // resolves if the number is kB and the percentage is of the k-NN
    // circuit breaker limit (50% of system memory by default), not of the
    // JVM heap. The graphs live off-heap, which is why.
    this.graphMemoryBytes = (raw.graph_memory_usage ?? 0) * 1024;
    this.graphMemoryPercent = raw.graph_memory_usage_percentage ?? 0;
    this.cacheCapacityReached = raw.cache_capacity_reached === true;
    this.indicesInCache = Object.keys(raw.indices_in_cache ?? {}).sort();
    this.hitCount = raw.hit_count ?? 0;
    this.missCount = raw.miss_count ?? 0;
    this.evictionCount = raw.eviction_count ?? 0;
    this.loadExceptionCount = raw.load_exception_count ?? 0;
    this.queryRequests = raw.knn_query_requests ?? 0;
    this.indexErrors = raw.graph_index_errors ?? 0;
    this.queryErrors = raw.graph_query_errors ?? 0;
  }
}

/**
 * What the k-NN plugin reports about the vector cache.
 *
 * This is the screen for one question Fess 15.8 made real: semantic search
 * stores vectors, and when the cache fills or the circuit breaker trips,
 * indexing and search start failing with nothing in the Fess logs that says
 * why. `circuit_breaker_triggered` is that answer.
 */
export class KnnStats {
  readonly circuitBreakerTriggered: boolean;
  readonly modelIndexStatus: string;
  readonly nodes: KnnNodeStats[];

  constructor(raw: KnnStatsResponse) {
    this.circuitBreakerTriggered = raw.circuit_breaker_triggered === true;
    this.modelIndexStatus = raw.model_index_status ?? '';
    this.nodes = Object.entries(raw.nodes ?? {})
      .map(([nodeId, node]) => new KnnNodeStats(nodeId, node))
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  /** True when any node is at the cache ceiling: the warning worth showing. */
  get anyCacheFull(): boolean {
    return this.nodes.some((node) => node.cacheCapacityReached);
  }
}
