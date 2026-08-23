import {describe, expect, it} from 'vitest';
import {ClusterNode, NodeStats, type NodeInfo} from '@/model/cluster-node';

/** Ported from tests/opensearch/node.test.js. */

function nodeInfo(overrides: Partial<NodeInfo> = {}): NodeInfo {
  return {
    name: 'test-node',
    version: '2.11.1',
    transport_address: '127.0.0.1:9300',
    host: '127.0.0.1',
    roles: ['master', 'data', 'ingest'],
    jvm: {version: '17.0.2'},
    os: {available_processors: 8},
    ...overrides,
  };
}

function nodeStats(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    jvm: {
      uptime_in_millis: 86400000,
      mem: {
        heap_used_in_bytes: 1073741824,
        heap_committed_in_bytes: 2147483648,
        heap_used_percent: 50,
        heap_max_in_bytes: 4294967296,
      },
    },
    fs: {total: {total_in_bytes: 500000000000, free_in_bytes: 250000000000}},
    process: {cpu: {percent: 25}},
    os: {cpu: {load_average: {'1m': 1.5}}},
    ...overrides,
  };
}

describe('ClusterNode', () => {
  describe('initialization', () => {
    it('reads the basic info', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo());
      expect(node.id).toBe('node1');
      expect(node.name).toBe('test-node');
      expect(node.version).toBe('2.11.1');
      expect(node.jvmVersion).toBe('17.0.2');
      expect(node.availableProcessors).toBe(8);
      expect(node.transportAddress).toBe('127.0.0.1:9300');
      expect(node.host).toBe('127.0.0.1');
    });

    it('detects the master role', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo({roles: ['master']}));
      expect(node.master).toBe(true);
      expect(node.data).toBe(false);
    });

    it('detects cluster_manager as master', () => {
      // The role OpenSearch actually reports. Reading only 'master' is why no
      // node ever showed the master marker.
      const node = new ClusterNode('node1', nodeStats(), nodeInfo({roles: ['cluster_manager']}));
      expect(node.master).toBe(true);
      expect(node.client).toBe(false);
    });

    it('classifies a real OpenSearch 3.x role set', () => {
      const node = new ClusterNode(
        'node1',
        nodeStats(),
        nodeInfo({roles: ['cluster_manager', 'data', 'ingest', 'ml']}),
      );
      expect(node.master).toBe(true);
      expect(node.data).toBe(true);
      expect(node.client).toBe(false);
    });

    it.each(['data', 'data_content', 'data_hot', 'data_warm', 'data_cold'])(
      'treats %s as a data role',
      (role) => {
        const node = new ClusterNode('node1', nodeStats(), nodeInfo({roles: [role]}));
        expect(node.data).toBe(true);
      },
    );

    it('detects a node with neither master nor data as a client', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo({roles: ['ingest']}));
      expect(node.master).toBe(false);
      expect(node.data).toBe(false);
      expect(node.client).toBe(true);
    });

    it('treats a missing roles list as no roles', () => {
      const info = nodeInfo();
      delete info.roles;
      const node = new ClusterNode('node1', nodeStats(), info);
      expect(node.master).toBe(false);
      expect(node.data).toBe(false);
      expect(node.client).toBe(true);
    });

    it('is not the current master until told', () => {
      expect(new ClusterNode('node1', nodeStats(), nodeInfo()).current_master).toBe(false);
    });
  });

  describe('statistics', () => {
    it('formats heap usage', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo());
      expect(node.heap_used).toBe('1.00GB');
      expect(node.heap_committed).toBe('2.00GB');
      expect(node.heap_max).toBe('4.00GB');
      expect(node.heap_used_percent).toBe(50);
    });

    it('computes disk usage', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo());
      expect(node.disk_total_in_bytes).toBe(500000000000);
      expect(node.disk_free_in_bytes).toBe(250000000000);
      expect(node.disk_used_percent).toBe(50);
    });

    it('reads cpu percent and load average', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo());
      expect(node.cpu).toBe(25);
      expect(node.load_average).toBe(1.5);
    });

    it('falls back to 0 when load average is absent', () => {
      const node = new ClusterNode('node1', nodeStats({os: {cpu: {}}}), nodeInfo());
      expect(node.load_average).toBe(0);
    });

    it('reads uptime', () => {
      expect(new ClusterNode('node1', nodeStats(), nodeInfo()).uptime).toBe(86400000);
    });
  });

  describe('identity', () => {
    it('marks the current master', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo());
      node.setCurrentMaster();
      expect(node.current_master).toBe(true);
    });

    it('compares by id', () => {
      const node = new ClusterNode('node1', nodeStats(), nodeInfo());
      expect(node.equals({id: 'node1'})).toBe(true);
      expect(node.equals({id: 'node2'})).toBe(false);
    });
  });
});

describe('NodeStats', () => {
  it('lifts the name out of the stats payload', () => {
    const stats = new NodeStats('node1', {name: 'test-node'});
    expect(stats.id).toBe('node1');
    expect(stats.name).toBe('test-node');
  });
});
