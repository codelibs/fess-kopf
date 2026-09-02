import {describe, expect, it} from 'vitest';
import {parseCatApis} from '@/model/cat-apis';

/** The body GET /_cat answers with. Measured on 3.8.0; 2.19.1 is identical. */
const CAT_INDEX = [
  '=^.^=',
  '/_cat/allocation',
  '/_cat/segment_replication',
  '/_cat/segment_replication/{index}',
  '/_cat/shards',
  '/_cat/shards/{index}',
  '/_cat/cluster_manager',
  '/_cat/nodes',
  '/_cat/tasks',
  '/_cat/indices',
  '/_cat/indices/{index}',
  '/_cat/segments',
  '/_cat/segments/{index}',
  '/_cat/count',
  '/_cat/count/{index}',
  '/_cat/recovery',
  '/_cat/recovery/{index}',
  '/_cat/health',
  '/_cat/pending_tasks',
  '/_cat/aliases',
  '/_cat/aliases/{alias}',
  '/_cat/thread_pool',
  '/_cat/thread_pool/{thread_pools}',
  '/_cat/plugins',
  '/_cat/fielddata',
  '/_cat/fielddata/{fields}',
  '/_cat/nodeattrs',
  '/_cat/repositories',
  '/_cat/snapshots/{repository}',
  '/_cat/templates',
  '/_cat/pit_segments',
  '/_cat/pit_segments/{pit_id}',
  '',
].join('\n');

describe('parseCatApis', () => {
  it('returns the twenty APIs that take no argument, sorted', () => {
    expect(parseCatApis(CAT_INDEX)).toEqual([
      'aliases',
      'allocation',
      'cluster_manager',
      'count',
      'fielddata',
      'health',
      'indices',
      'nodeattrs',
      'nodes',
      'pending_tasks',
      'pit_segments',
      'plugins',
      'recovery',
      'repositories',
      'segment_replication',
      'segments',
      'shards',
      'tasks',
      'templates',
      'thread_pool',
    ]);
  });

  it('drops the cat face banner', () => {
    expect(parseCatApis('=^.^=\n/_cat/health\n')).toEqual(['health']);
  });

  it('drops entries that need an argument', () => {
    // /_cat/snapshots exists only as /_cat/snapshots/{repository}, and the
    // screen has no repository to give it.
    expect(parseCatApis('/_cat/snapshots/{repository}\n')).toEqual([]);
  });

  it('returns nothing for a body that is not the cat index', () => {
    expect(parseCatApis('')).toEqual([]);
    expect(parseCatApis('<html>502 Bad Gateway</html>')).toEqual([]);
  });
});
