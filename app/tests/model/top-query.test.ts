import {describe, expect, it} from 'vitest';
import {parseTopQueries, TopQuery, type TopQueryResponse} from '@/model/top-query';

/**
 * One entry as GET /_insights/top_queries?type=latency returns it. Taken
 * from 3.8.0; 2.19.1 returns the same fields minus `failed`,
 * `source_truncated` and `wlm_group_id`, none of which are read.
 */
function query(overrides: Partial<TopQueryResponse> = {}): TopQueryResponse {
  return {
    id: '7186062f-ceaa-462f-ad24-2dbdaa404d41',
    timestamp: 1788355136118,
    indices: ['fess.20260902'],
    search_type: 'query_then_fetch',
    total_shards: 1,
    node_id: 'rZrUM42eQ1mRLB4USOB1SA',
    source: {query: {match: {content: 'fess'}}},
    measurements: {
      latency: {number: 48, count: 1, aggregationType: 'NONE'},
      cpu: {number: 35695708, count: 1, aggregationType: 'NONE'},
      memory: {number: 11537856, count: 1, aggregationType: 'NONE'},
    },
    ...overrides,
  };
}

describe('TopQuery', () => {
  it('reads each measurement out of the shape both versions share', () => {
    const parsed = new TopQuery(query());
    expect(parsed.latencyMs).toBe(48);
    expect(parsed.cpuNanos).toBe(35695708);
    expect(parsed.memoryBytes).toBe(11537856);
    expect(parsed.indices).toEqual(['fess.20260902']);
    expect(parsed.searchType).toBe('query_then_fetch');
  });

  it('survives a response with no measurements at all', () => {
    const parsed = new TopQuery(query({measurements: undefined, indices: undefined}));
    expect(parsed.latencyMs).toBe(0);
    expect(parsed.indices).toEqual([]);
  });

  it('returns the measurement the listing was ranked by', () => {
    const parsed = new TopQuery(query());
    expect(parsed.measurement('latency')).toBe(48);
    expect(parsed.measurement('cpu')).toBe(35695708);
    expect(parsed.measurement('memory')).toBe(11537856);
  });
});

describe('parseTopQueries', () => {
  it('ranks by the chosen measurement, highest first', () => {
    const raw = [
      query({id: 'a', measurements: {latency: {number: 10}, cpu: {number: 900}}}),
      query({id: 'b', measurements: {latency: {number: 90}, cpu: {number: 100}}}),
    ];
    expect(parseTopQueries(raw, 'latency').map((q) => q.id)).toEqual(['b', 'a']);
    expect(parseTopQueries(raw, 'cpu').map((q) => q.id)).toEqual(['a', 'b']);
  });

  it('returns nothing for an empty listing', () => {
    expect(parseTopQueries([], 'latency')).toEqual([]);
  });
});
