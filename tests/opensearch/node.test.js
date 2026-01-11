/**
 * Tests for Node class
 * Tests node data model and statistics
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load Node
const nodeCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/node.js'),
  'utf8'
);
eval(nodeCode);

describe('Node', () => {
  // Helper to create mock node data
  function createMockNodeInfo(overrides = {}) {
    return {
      name: 'test-node',
      version: '2.11.1',
      transport_address: '127.0.0.1:9300',
      host: '127.0.0.1',
      roles: ['master', 'data', 'ingest'],
      jvm: {
        version: '17.0.2'
      },
      os: {
        available_processors: 8
      },
      ...overrides
    };
  }

  function createMockNodeStats(overrides = {}) {
    return {
      jvm: {
        uptime_in_millis: 86400000,
        mem: {
          heap_used_in_bytes: 1073741824,
          heap_committed_in_bytes: 2147483648,
          heap_used_percent: 50,
          heap_max_in_bytes: 4294967296
        }
      },
      fs: {
        total: {
          total_in_bytes: 500000000000,
          free_in_bytes: 250000000000
        }
      },
      process: {
        cpu: {
          percent: 25
        }
      },
      os: {
        cpu: {
          load_average: {
            '1m': 1.5
          }
        }
      },
      ...overrides
    };
  }

  describe('initialization', () => {
    test('should create node with basic info', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.id).toBe('node1');
      expect(node.name).toBe('test-node');
      expect(node.elasticVersion).toBe('2.11.1');
      expect(node.jvmVersion).toBe('17.0.2');
      expect(node.availableProcessors).toBe(8);
      expect(node.transportAddress).toBe('127.0.0.1:9300');
      expect(node.host).toBe('127.0.0.1');
    });

    test('should detect master role', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['master'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.master).toBe(true);
      expect(node.data).toBe(false);
    });

    test('should detect data role', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['data'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.master).toBe(false);
      expect(node.data).toBe(true);
    });

    test('should detect data_content role as data node', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['data_content'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.data).toBe(true);
    });

    test('should detect data_hot role as data node', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['data_hot'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.data).toBe(true);
    });

    test('should detect data_warm role as data node', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['data_warm'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.data).toBe(true);
    });

    test('should detect data_cold role as data node', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['data_cold'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.data).toBe(true);
    });

    test('should detect client node (no master or data roles)', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['ingest'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.master).toBe(false);
      expect(node.data).toBe(false);
      expect(node.client).toBe(true);
    });

    test('should not be current master by default', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.current_master).toBe(false);
    });
  });

  describe('statistics', () => {
    test('should calculate heap usage', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.heap_used).toBe('1.00GB');
      expect(node.heap_committed).toBe('2.00GB');
      expect(node.heap_max).toBe('4.00GB');
      expect(node.heap_used_percent).toBe(50);
    });

    test('should calculate disk usage', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.disk_total_in_bytes).toBe(500000000000);
      expect(node.disk_free_in_bytes).toBe(250000000000);
      expect(node.disk_used_percent).toBe(50);
    });

    test('should get CPU percent', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.cpu).toBe(25);
    });

    test('should get load average', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.load_average).toBe(1.5);
    });

    test('should handle missing load average', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats({
        os: { cpu: {} }
      });

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.load_average).toBe(0);
    });

    test('should get uptime', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.uptime).toBe(86400000);
    });
  });

  describe('master operations', () => {
    test('should set current master', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);
      node.setCurrentMaster();

      expect(node.current_master).toBe(true);
    });
  });

  describe('equality', () => {
    test('should be equal to node with same id', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node1 = new Node('node1', nodeStats, nodeInfo);
      const node2 = new Node('node1', nodeStats, nodeInfo);

      expect(node1.equals(node2)).toBe(true);
    });

    test('should not be equal to node with different id', () => {
      const nodeInfo = createMockNodeInfo();
      const nodeStats = createMockNodeStats();

      const node1 = new Node('node1', nodeStats, nodeInfo);
      const node2 = new Node('node2', nodeStats, nodeInfo);

      expect(node1.equals(node2)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle empty roles array', () => {
      const nodeInfo = createMockNodeInfo({ roles: [] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.master).toBe(false);
      expect(node.data).toBe(false);
      expect(node.client).toBe(true);
    });

    test('should handle combined master and data roles', () => {
      const nodeInfo = createMockNodeInfo({ roles: ['master', 'data'] });
      const nodeStats = createMockNodeStats();

      const node = new Node('node1', nodeStats, nodeInfo);

      expect(node.master).toBe(true);
      expect(node.data).toBe(true);
      expect(node.client).toBe(false);
    });
  });
});
