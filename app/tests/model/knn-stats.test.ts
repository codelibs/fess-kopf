import {describe, expect, it} from 'vitest';
import {KnnStats, type KnnStatsResponse} from '@/model/knn-stats';

/**
 * What GET /_plugins/_knn/stats answered with on a 3.8.0 node holding one
 * faiss index of 2,000 vectors. 2.19.1 reports the same node keys.
 */
function response(overrides: Partial<KnnStatsResponse> = {}): KnnStatsResponse {
  return {
    circuit_breaker_triggered: false,
    model_index_status: null,
    nodes: {
      'rZrUM42eQ1mRLB4USOB1SA': {
        graph_memory_usage: 1297,
        graph_memory_usage_percentage: 0.005382331,
        cache_capacity_reached: false,
        indices_in_cache: {'kopf-knn-scratch': {graph_count: 2}},
        hit_count: 0,
        miss_count: 2,
        eviction_count: 0,
        load_success_count: 2,
        load_exception_count: 0,
        knn_query_requests: 1,
        graph_index_errors: 0,
        graph_query_errors: 0,
      },
    },
    ...overrides,
  };
}

describe('KnnStats', () => {
  it('reads the graph memory as kilobytes', () => {
    // Verified against the cluster: 1297 at 0.005382% of a limit that is
    // half of a node reporting 49,243,308 kB only resolves in kilobytes.
    expect(new KnnStats(response()).nodes[0].graphMemoryBytes).toBe(1297 * 1024);
  });

  it('carries the per-node counters the screen shows', () => {
    const node = new KnnStats(response()).nodes[0];
    expect(node.nodeId).toBe('rZrUM42eQ1mRLB4USOB1SA');
    expect(node.graphMemoryPercent).toBeCloseTo(0.005382331);
    expect(node.hitCount).toBe(0);
    expect(node.missCount).toBe(2);
    expect(node.queryRequests).toBe(1);
    expect(node.indicesInCache).toEqual(['kopf-knn-scratch']);
  });

  it('reports the breaker, which is the reason this screen exists', () => {
    expect(new KnnStats(response()).circuitBreakerTriggered).toBe(false);
    expect(
      new KnnStats(response({circuit_breaker_triggered: true})).circuitBreakerTriggered,
    ).toBe(true);
  });

  it('reports a full cache on any node, not only the first', () => {
    const two = response({
      nodes: {
        a: {cache_capacity_reached: false},
        b: {cache_capacity_reached: true},
      },
    });
    expect(new KnnStats(two).anyCacheFull).toBe(true);
    expect(new KnnStats(response()).anyCacheFull).toBe(false);
  });

  it('sorts nodes by id, so the table does not reshuffle between polls', () => {
    const shuffled = response({nodes: {n2: {}, n1: {}, n3: {}}});
    expect(new KnnStats(shuffled).nodes.map((n) => n.nodeId)).toEqual(['n1', 'n2', 'n3']);
  });

  it('survives a response with no nodes and no model index', () => {
    const empty = new KnnStats({});
    expect(empty.nodes).toEqual([]);
    expect(empty.modelIndexStatus).toBe('');
    expect(empty.circuitBreakerTriggered).toBe(false);
  });
});
