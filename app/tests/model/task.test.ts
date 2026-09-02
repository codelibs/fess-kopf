import {describe, expect, it} from 'vitest';
import {ClusterTask, isListing, parseTasks} from '@/model/task';
import type {TaskResponse} from '@/api/opensearch';

/** One entry as GET /_tasks?detailed&group_by=none returns it on 3.8.0. */
function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    node: 'rZrUM42eQ1mRLB4USOB1SA',
    id: 32,
    action: 'indices:data/write/reindex',
    description: 'reindex from [fess.20260101] to [fess.20260902]',
    start_time_in_millis: 1788355131755,
    running_time_in_nanos: 2309917000,
    cancellable: true,
    cancelled: false,
    parent_task_id: 'rZrUM42eQ1mRLB4USOB1SA:31',
    ...overrides,
  };
}

describe('ClusterTask', () => {
  it('joins the node and the id into the id a cancel needs', () => {
    expect(new ClusterTask(task()).taskId).toBe('rZrUM42eQ1mRLB4USOB1SA:32');
  });

  it('reports the running time in milliseconds', () => {
    expect(new ClusterTask(task()).runningTimeMs).toBe(2310);
  });

  it('treats a missing description and parent as absent, not as "undefined"', () => {
    const bare = new ClusterTask(
      task({description: undefined, parent_task_id: undefined}),
    );
    expect(bare.description).toBe('');
    expect(bare.parentTaskId).toBeNull();
  });

  it('is stoppable only while it is cancellable and not already cancelled', () => {
    expect(new ClusterTask(task()).stoppable).toBe(true);
    expect(new ClusterTask(task({cancelled: true})).stoppable).toBe(false);
    expect(new ClusterTask(task({cancellable: false})).stoppable).toBe(false);
  });

  it('reads a response that omits cancelled as not cancelled', () => {
    expect(new ClusterTask(task({cancelled: undefined})).cancelled).toBe(false);
  });
});

describe('parseTasks', () => {
  it('puts the longest-running task first', () => {
    const parsed = parseTasks([
      task({id: 1, running_time_in_nanos: 1_000_000}),
      task({id: 2, running_time_in_nanos: 9_000_000}),
      task({id: 3, running_time_in_nanos: 5_000_000}),
    ]);
    expect(parsed.map((t) => t.taskId.split(':')[1])).toEqual(['2', '3', '1']);
  });

  it('returns nothing for an empty listing', () => {
    expect(parseTasks([])).toEqual([]);
  });
});

describe('isListing', () => {
  it('recognises the tasks call itself and the children it fans out to', () => {
    // Every /_tasks response contains these; they are not what the screen is for.
    expect(isListing(new ClusterTask(task({action: 'cluster:monitor/tasks/lists'})))).toBe(true);
    expect(isListing(new ClusterTask(task({action: 'cluster:monitor/tasks/lists[n]'})))).toBe(
      true,
    );
  });

  it('leaves real work alone', () => {
    expect(isListing(new ClusterTask(task()))).toBe(false);
    expect(isListing(new ClusterTask(task({action: 'indices:admin/forcemerge'})))).toBe(false);
  });
});
