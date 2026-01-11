/**
 * Tests for Shard class
 * Tests shard data model
 */

const fs = require('fs');
const path = require('path');

// Load Shard
const shardCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/shard.js'),
  'utf8'
);
eval(shardCode);

describe('Shard', () => {
  describe('initialization', () => {
    test('should create shard from routing data', () => {
      const routing = {
        primary: true,
        shard: 0,
        state: 'STARTED',
        node: 'node1',
        index: 'test-index'
      };

      const shard = new Shard(routing);

      expect(shard.primary).toBe(true);
      expect(shard.shard).toBe(0);
      expect(shard.state).toBe('STARTED');
      expect(shard.node).toBe('node1');
      expect(shard.index).toBe('test-index');
    });

    test('should generate unique id from node, shard, and index', () => {
      const routing = {
        primary: true,
        shard: 2,
        state: 'STARTED',
        node: 'node1',
        index: 'my-index'
      };

      const shard = new Shard(routing);

      expect(shard.id).toBe('node1_2_my-index');
    });

    test('should handle replica shard', () => {
      const routing = {
        primary: false,
        shard: 1,
        state: 'STARTED',
        node: 'node2',
        index: 'test-index'
      };

      const shard = new Shard(routing);

      expect(shard.primary).toBe(false);
    });

    test('should handle unassigned shard', () => {
      const routing = {
        primary: true,
        shard: 0,
        state: 'UNASSIGNED',
        node: null,
        index: 'test-index'
      };

      const shard = new Shard(routing);

      expect(shard.state).toBe('UNASSIGNED');
      expect(shard.node).toBeNull();
    });

    test('should handle initializing shard', () => {
      const routing = {
        primary: true,
        shard: 0,
        state: 'INITIALIZING',
        node: 'node1',
        index: 'test-index'
      };

      const shard = new Shard(routing);

      expect(shard.state).toBe('INITIALIZING');
    });

    test('should handle relocating shard', () => {
      const routing = {
        primary: true,
        shard: 0,
        state: 'RELOCATING',
        node: 'node1',
        index: 'test-index'
      };

      const shard = new Shard(routing);

      expect(shard.state).toBe('RELOCATING');
    });
  });

  describe('edge cases', () => {
    test('should handle shard number 0', () => {
      const routing = {
        primary: true,
        shard: 0,
        state: 'STARTED',
        node: 'node1',
        index: 'test'
      };

      const shard = new Shard(routing);

      expect(shard.shard).toBe(0);
      expect(shard.id).toBe('node1_0_test');
    });

    test('should handle high shard numbers', () => {
      const routing = {
        primary: true,
        shard: 99,
        state: 'STARTED',
        node: 'node1',
        index: 'test'
      };

      const shard = new Shard(routing);

      expect(shard.shard).toBe(99);
      expect(shard.id).toBe('node1_99_test');
    });

    test('should handle special characters in index name', () => {
      const routing = {
        primary: true,
        shard: 0,
        state: 'STARTED',
        node: 'node1',
        index: '.kibana_1'
      };

      const shard = new Shard(routing);

      expect(shard.index).toBe('.kibana_1');
      expect(shard.id).toBe('node1_0_.kibana_1');
    });
  });
});
