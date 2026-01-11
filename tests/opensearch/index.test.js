/**
 * Tests for Index class
 * Tests index data model
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load Index
const indexCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/index.js'),
  'utf8'
);
eval(indexCode);

describe('Index', () => {
  // Helper to create mock cluster state
  function createMockClusterState(indexName, numShards = 5, numReplicas = 1) {
    const shards = {};
    for (let i = 0; i < numShards; i++) {
      shards[i] = [];
      // Primary
      shards[i].push({
        primary: true,
        shard: i,
        state: 'STARTED',
        node: 'node1',
        index: indexName
      });
      // Replicas
      for (let r = 0; r < numReplicas; r++) {
        shards[i].push({
          primary: false,
          shard: i,
          state: 'STARTED',
          node: `node${r + 2}`,
          index: indexName
        });
      }
    }

    return {
      routing_table: {
        indices: {
          [indexName]: { shards }
        }
      }
    };
  }

  function createMockIndexStats() {
    return {
      primaries: {
        docs: {
          count: 1000,
          deleted: 50
        },
        store: {
          size_in_bytes: 1048576
        }
      },
      total: {
        store: {
          size_in_bytes: 2097152
        }
      }
    };
  }

  function createMockAliases(aliases = ['alias1', 'alias2']) {
    const aliasObj = {};
    aliases.forEach(a => aliasObj[a] = {});
    return { aliases: aliasObj };
  }

  describe('initialization', () => {
    test('should create index with name only (closed index)', () => {
      const index = new Index('test-index');

      expect(index.name).toBe('test-index');
      expect(index.state).toBe('close');
      expect(index.closed).toBe(true);
      expect(index.open).toBe(false);
    });

    test('should create open index with cluster state', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.name).toBe('test-index');
      expect(index.state).toBe('open');
      expect(index.closed).toBe(false);
      expect(index.open).toBe(true);
    });

    test('should parse shard configuration', () => {
      const clusterState = createMockClusterState('test-index', 5, 1);
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.num_of_shards).toBe(5);
      expect(index.num_of_replicas).toBe(1);
    });

    test('should parse document counts', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.num_docs).toBe(1000);
      expect(index.deleted_docs).toBe(50);
    });

    test('should parse storage sizes', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.size_in_bytes).toBe(1048576);
      expect(index.total_size_in_bytes).toBe(2097152);
    });

    test('should parse aliases', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();
      const aliases = createMockAliases(['my-alias', 'another-alias']);

      const index = new Index('test-index', clusterState, indexStats, aliases);

      expect(index.aliases).toContain('my-alias');
      expect(index.aliases).toContain('another-alias');
      expect(index.aliases.length).toBe(2);
    });

    test('should handle index without aliases', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.aliases).toEqual([]);
    });
  });

  describe('special indices', () => {
    test('should detect indices starting with dot as special', () => {
      const index = new Index('.kibana');

      expect(index.special).toBe(true);
    });

    test('should detect indices starting with underscore as special', () => {
      const index = new Index('_internal');

      expect(index.special).toBe(true);
    });

    test('should not mark regular indices as special', () => {
      const index = new Index('my-data');

      expect(index.special).toBe(false);
    });

    test('should handle .security index', () => {
      const index = new Index('.security-7');

      expect(index.special).toBe(true);
    });
  });

  describe('health status', () => {
    test('should be healthy when all shards are STARTED', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.unhealthy).toBe(false);
    });

    test('should be unhealthy when shards are not STARTED', () => {
      const clusterState = createMockClusterState('test-index');
      // Modify one shard to be INITIALIZING
      clusterState.routing_table.indices['test-index'].shards[0][0].state = 'INITIALIZING';
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.unhealthy).toBe(true);
    });

    test('should be unhealthy when shards are UNASSIGNED', () => {
      const clusterState = createMockClusterState('test-index');
      clusterState.routing_table.indices['test-index'].shards[0][1].state = 'UNASSIGNED';
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.unhealthy).toBe(true);
    });
  });

  describe('equality', () => {
    test('should be equal to index with same name', () => {
      const index1 = new Index('test-index');
      const index2 = new Index('test-index');

      expect(index1.equals(index2)).toBe(true);
    });

    test('should not be equal to index with different name', () => {
      const index1 = new Index('test-index-1');
      const index2 = new Index('test-index-2');

      expect(index1.equals(index2)).toBe(false);
    });

    test('should handle null comparison', () => {
      const index = new Index('test-index');

      expect(index.equals(null)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle index with no stats', () => {
      const clusterState = createMockClusterState('test-index');

      const index = new Index('test-index', clusterState, undefined, null);

      expect(index.num_docs).toBe(0);
      expect(index.deleted_docs).toBe(0);
      expect(index.size_in_bytes).toBe(0);
    });

    test('should handle index with empty aliases object', () => {
      const clusterState = createMockClusterState('test-index');
      const indexStats = createMockIndexStats();
      const aliases = { aliases: {} };

      const index = new Index('test-index', clusterState, indexStats, aliases);

      expect(index.aliases).toEqual([]);
    });

    test('should handle high shard count', () => {
      const clusterState = createMockClusterState('test-index', 100, 2);
      const indexStats = createMockIndexStats();

      const index = new Index('test-index', clusterState, indexStats, null);

      expect(index.num_of_shards).toBe(100);
      expect(index.num_of_replicas).toBe(2);
    });
  });
});
