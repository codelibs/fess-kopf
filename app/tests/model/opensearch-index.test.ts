import {describe, expect, it} from 'vitest';
import {Index, type ClusterState} from '@/model/opensearch-index';
import {shardRouting, state} from './fixtures';

/** Ported from tests/opensearch/index.test.js. */

function stateWithShards(shards: Record<string, ReturnType<typeof shardRouting>[]>): ClusterState {
  return state({routing_table: {indices: {'test-index': {shards}}}});
}

/** n shards, each with the given number of copies (1 primary + replicas). */
function shardMap(count: number, copies = 2) {
  const shards: Record<string, ReturnType<typeof shardRouting>[]> = {};
  for (let i = 0; i < count; i++) {
    shards[i] = Array.from({length: copies}, (_unused, copy) =>
      shardRouting({shard: i, primary: copy === 0}),
    );
  }
  return shards;
}

describe('Index', () => {
  describe('state', () => {
    it('is closed when built without a cluster state', () => {
      const index = new Index('test-index', undefined, undefined, undefined);
      expect(index.name).toBe('test-index');
      expect(index.state).toBe('close');
      expect(index.closed).toBe(true);
      expect(index.open).toBe(false);
    });

    it('is open when built with a cluster state', () => {
      const index = new Index('test-index', state(), undefined, undefined);
      expect(index.state).toBe('open');
      expect(index.closed).toBe(false);
      expect(index.open).toBe(true);
    });

    it('moves state and both derived flags together when marked closed', () => {
      // index_filter and the overview partials read closed/open, not state,
      // so these must not be left stale.
      const index = new Index('test-index', state(), undefined, undefined);
      index.markClosed();
      expect(index.state).toBe('close');
      expect(index.closed).toBe(true);
      expect(index.open).toBe(false);
    });
  });

  describe('shards', () => {
    it('counts shards and derives replicas from shard 0', () => {
      const index = new Index('test-index', stateWithShards(shardMap(5, 2)), undefined, undefined);
      expect(index.num_of_shards).toBe(5);
      expect(index.num_of_replicas).toBe(1);
    });

    it('handles a high shard count', () => {
      const index = new Index(
        'test-index',
        stateWithShards(shardMap(100, 3)),
        undefined,
        undefined,
      );
      expect(index.num_of_shards).toBe(100);
      expect(index.num_of_replicas).toBe(2);
    });

    it('is healthy when every shard is STARTED', () => {
      const index = new Index('test-index', stateWithShards(shardMap(2)), undefined, undefined);
      expect(index.unhealthy).toBe(false);
    });

    it.each(['INITIALIZING', 'UNASSIGNED', 'RELOCATING'])(
      'is unhealthy when a shard is %s',
      (shardState) => {
        const index = new Index(
          'test-index',
          stateWithShards({0: [shardRouting({state: shardState})]}),
          undefined,
          undefined,
        );
        expect(index.unhealthy).toBe(true);
      },
    );
  });

  describe('stats', () => {
    const stats = {
      primaries: {docs: {count: 1000, deleted: 50}, store: {size_in_bytes: 1048576}},
      total: {store: {size_in_bytes: 2097152}},
    };

    it('reads document counts', () => {
      const index = new Index('test-index', state(), stats, undefined);
      expect(index.num_docs).toBe(1000);
      expect(index.deleted_docs).toBe(50);
    });

    it('reads storage sizes', () => {
      const index = new Index('test-index', state(), stats, undefined);
      expect(index.size_in_bytes).toBe(1048576);
      expect(index.total_size_in_bytes).toBe(2097152);
    });

    it('defaults every count to 0 when there are no stats', () => {
      const index = new Index('test-index', state(), undefined, undefined);
      expect(index.num_docs).toBe(0);
      expect(index.deleted_docs).toBe(0);
      expect(index.size_in_bytes).toBe(0);
      expect(index.total_size_in_bytes).toBe(0);
    });
  });

  describe('aliases', () => {
    it('lists alias names', () => {
      const index = new Index('test-index', state(), undefined, {
        aliases: {'my-alias': {}, 'another-alias': {}},
      });
      expect(index.aliases).toContain('my-alias');
      expect(index.aliases).toContain('another-alias');
      expect(index.aliases.length).toBe(2);
    });

    it('is empty when the index has none', () => {
      expect(new Index('test-index', state(), undefined, undefined).aliases).toEqual([]);
      expect(new Index('test-index', state(), undefined, {}).aliases).toEqual([]);
      expect(new Index('test-index', state(), undefined, {aliases: {}}).aliases).toEqual([]);
    });
  });

  describe('special', () => {
    it.each(['.kibana', '.security', '_internal'])('marks %s as special', (name) => {
      expect(new Index(name, undefined, undefined, undefined).special).toBe(true);
    });

    it('does not mark a regular index as special', () => {
      expect(new Index('fess.search', undefined, undefined, undefined).special).toBe(false);
    });
  });

  describe('equals', () => {
    it('compares by name', () => {
      const index = new Index('a', undefined, undefined, undefined);
      expect(index.equals(new Index('a', undefined, undefined, undefined))).toBe(true);
      expect(index.equals(new Index('b', undefined, undefined, undefined))).toBe(false);
    });

    it('is false against null', () => {
      expect(new Index('a', undefined, undefined, undefined).equals(null)).toBe(false);
    });
  });
});
