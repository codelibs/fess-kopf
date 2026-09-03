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

describe('TopQuery, as the history returns it', () => {
  /**
   * The same record read back out of the local index is not shaped quite
   * like the in-memory one: on 3.8.0 the source comes back as a JSON string
   * rather than an object. Measured on both -- 2.19.1's history keeps it an
   * object -- so the reader has to take either.
   */
  it('parses a source the history handed back as a string', () => {
    const parsed = new TopQuery(
      query({source: '{"size":0,"track_total_hits":2147483647}'}),
    );
    expect(parsed.source).toEqual({size: 0, track_total_hits: 2147483647});
  });

  it('keeps a source string it cannot parse as it stands', () => {
    const parsed = new TopQuery(query({source: 'not json at all'}));
    expect(parsed.source).toBe('not json at all');
  });

  it('reads where the time went', () => {
    const parsed = new TopQuery(query({phase_latency_map: {expand: 0, query: 29, fetch: 1}}));
    expect(parsed.phases).toEqual([
      {phase: 'query', ms: 29},
      {phase: 'fetch', ms: 1},
      {phase: 'expand', ms: 0},
    ]);
  });

  it('has no phases when the record carries none', () => {
    expect(new TopQuery(query()).phases).toEqual([]);
  });
});
