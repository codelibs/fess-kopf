import {describe, expect, it} from 'vitest';
import {Shard, ShardStats} from '@/model/shard';
import {shardRouting} from './fixtures';

/** Ported from tests/opensearch/shard.test.js. */
describe('Shard', () => {
  it('reads the routing entry', () => {
    const shard = new Shard(shardRouting({node: 'node1'}));
    expect(shard.primary).toBe(true);
    expect(shard.shard).toBe(0);
    expect(shard.state).toBe('STARTED');
    expect(shard.node).toBe('node1');
    expect(shard.index).toBe('test-index');
  });

  it('builds its id from node, shard number and index', () => {
    const shard = new Shard(shardRouting({node: 'node1', shard: 2, index: 'my-index'}));
    expect(shard.id).toBe('node1_2_my-index');
  });

  it('keeps shard number 0 in the id rather than dropping it', () => {
    const shard = new Shard(shardRouting({node: 'node1', shard: 0, index: 'test'}));
    expect(shard.id).toBe('node1_0_test');
  });

  it('handles high shard numbers', () => {
    const shard = new Shard(shardRouting({node: 'node1', shard: 99, index: 'test'}));
    expect(shard.shard).toBe(99);
    expect(shard.id).toBe('node1_99_test');
  });

  it('handles a replica', () => {
    expect(new Shard(shardRouting({primary: false})).primary).toBe(false);
  });

  it.each(['UNASSIGNED', 'INITIALIZING', 'RELOCATING'])('carries the %s state', (state) => {
    expect(new Shard(shardRouting({state})).state).toBe(state);
  });

  it('keeps a null node for an unassigned shard', () => {
    const shard = new Shard(shardRouting({state: 'UNASSIGNED', node: null}));
    expect(shard.state).toBe('UNASSIGNED');
    expect(shard.node).toBeNull();
  });

  it('handles an index name with leading punctuation', () => {
    const shard = new Shard(shardRouting({node: 'node1', shard: 0, index: '.kibana_1'}));
    expect(shard.index).toBe('.kibana_1');
    expect(shard.id).toBe('node1_0_.kibana_1');
  });
});

describe('ShardStats', () => {
  it('carries the shard number, its index and the stats payload', () => {
    // The number, not a Shard: getShardStats is the only constructor site and
    // that is what it passes.
    const stats = new ShardStats(2, 'test-index', {docs: 1});
    expect(stats.shard).toBe(2);
    expect(stats.index).toBe('test-index');
    expect(stats.stats).toEqual({docs: 1});
  });
});
