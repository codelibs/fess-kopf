import {describe, expect, it} from 'vitest';
import {parseLiveQueries} from '@/model/live-query';

/**
 * One in-flight search, taken verbatim from a 3.8.0 cluster while a
 * deliberately slow script query was running. 2.19.1 has no live queries
 * endpoint at all, so there is nothing to compare it against.
 */
const RUNNING = {
  id: '9dqLYlbpRfS7OOTHNAWbmA:245',
  status: 'running',
  start_time: 1788410792393,
  wlm_group_id: 'DEFAULT_WORKLOAD_GROUP',
  total_latency_millis: 3005,
  total_cpu_nanos: 3002903322,
  total_memory_bytes: 216072,
  coordinator_task: {
    task_id: '9dqLYlbpRfS7OOTHNAWbmA:245',
    node_id: '9dqLYlbpRfS7OOTHNAWbmA',
    action: 'indices:data/read/search',
    status: 'running',
    description:
      'indices[kopf-qi], search_type[QUERY_THEN_FETCH], source[{"size":0,"query":' +
      '{"bool":{"filter":[{"script":{"script":{"source":"return s>0;","lang":"painless"}}}]}}}]',
    start_time: 1788410792393,
    running_time_nanos: 3005411752,
    cpu_nanos: 0,
    memory_bytes: 0,
  },
  shard_tasks: [
    {
      task_id: '9dqLYlbpRfS7OOTHNAWbmA:246',
      node_id: '9dqLYlbpRfS7OOTHNAWbmA',
      action: 'indices:data/read/search[phase/query]',
      description: 'shardId[[kopf-qi][0]]',
      start_time: 1788410792393,
      running_time_nanos: 3004984252,
      cpu_nanos: 3002903322,
      memory_bytes: 216072,
    },
  ],
};

describe('parseLiveQueries', () => {
  it('reads what the query is costing so far', () => {
    const [query] = parseLiveQueries([RUNNING], 'latency');
    expect(query.id).toBe('9dqLYlbpRfS7OOTHNAWbmA:245');
    expect(query.status).toBe('running');
    expect(query.latencyMs).toBe(3005);
    expect(query.cpuNanos).toBe(3002903322);
    expect(query.memoryBytes).toBe(216072);
    expect(query.nodeId).toBe('9dqLYlbpRfS7OOTHNAWbmA');
    expect(query.shards).toBe(1);
  });

  /**
   * The indices and the DSL are only in the coordinator task's description,
   * which is a formatted string rather than fields -- and the two things an
   * operator needs to decide whether to kill a query.
   */
  it('takes the indices and the search type out of the description', () => {
    const [query] = parseLiveQueries([RUNNING], 'latency');
    expect(query.indices).toEqual(['kopf-qi']);
    expect(query.searchType).toBe('QUERY_THEN_FETCH');
  });

  it('parses the source out of the description, brackets and all', () => {
    const [query] = parseLiveQueries([RUNNING], 'latency');
    // The DSL itself contains "]", so the reader cannot stop at the first one.
    expect(query.source).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [{script: {script: {source: 'return s>0;', lang: 'painless'}}}],
        },
      },
    });
  });

  it('keeps a description it cannot read rather than dropping the row', () => {
    const [query] = parseLiveQueries(
      [
        {
          ...RUNNING,
          coordinator_task: {...RUNNING.coordinator_task, description: 'shardId[[x][0]]'},
        },
      ],
      'latency',
    );
    expect(query.indices).toEqual([]);
    expect(query.source).toBeUndefined();
    expect(query.latencyMs).toBe(3005);
  });

  it('survives a response with no coordinator task', () => {
    const [query] = parseLiveQueries([{id: 'n:1', total_latency_millis: 7}], 'latency');
    expect(query.indices).toEqual([]);
    expect(query.nodeId).toBe('');
    expect(query.shards).toBe(0);
    expect(query.latencyMs).toBe(7);
  });

  it('ranks by the metric asked for, costliest first', () => {
    const cheap = {...RUNNING, id: 'n:1', total_latency_millis: 10, total_cpu_nanos: 900};
    const slow = {...RUNNING, id: 'n:2', total_latency_millis: 900, total_cpu_nanos: 10};
    expect(parseLiveQueries([cheap, slow], 'latency').map((q) => q.id)).toEqual(['n:2', 'n:1']);
    expect(parseLiveQueries([cheap, slow], 'cpu').map((q) => q.id)).toEqual(['n:1', 'n:2']);
  });
});
