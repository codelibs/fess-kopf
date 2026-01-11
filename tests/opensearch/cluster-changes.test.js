/**
 * Tests for ClusterChanges class
 * Tests cluster state change detection (node joins/leaves, index creation/deletion)
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load ClusterChanges
const clusterChangesCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/cluster_changes.js'),
  'utf8'
);
eval(clusterChangesCode);

describe('ClusterChanges', () => {
  let changes;

  beforeEach(() => {
    changes = new ClusterChanges();
  });

  describe('initialization', () => {
    test('should initialize with null values', () => {
      expect(changes.nodeJoins).toBeNull();
      expect(changes.nodeLeaves).toBeNull();
      expect(changes.indicesCreated).toBeNull();
      expect(changes.indicesDeleted).toBeNull();
    });

    test('should initialize with zero deltas', () => {
      expect(changes.docDelta).toBe(0);
      expect(changes.dataDelta).toBe(0);
    });

    test('should have no changes initially', () => {
      expect(changes.hasChanges()).toBe(false);
    });
  });

  describe('node operations', () => {
    const mockNode = { id: 'node1', name: 'test-node' };

    test('should track joining nodes', () => {
      changes.addJoiningNode(mockNode);
      expect(changes.hasJoins()).toBe(true);
      expect(changes.nodeJoins).toContain(mockNode);
    });

    test('should track multiple joining nodes', () => {
      const node2 = { id: 'node2', name: 'test-node-2' };
      changes.addJoiningNode(mockNode);
      changes.addJoiningNode(node2);
      expect(changes.nodeJoins.length).toBe(2);
    });

    test('should track leaving nodes', () => {
      changes.addLeavingNode(mockNode);
      expect(changes.hasLeaves()).toBe(true);
      expect(changes.nodeLeaves).toContain(mockNode);
    });

    test('should track multiple leaving nodes', () => {
      const node2 = { id: 'node2', name: 'test-node-2' };
      changes.addLeavingNode(mockNode);
      changes.addLeavingNode(node2);
      expect(changes.nodeLeaves.length).toBe(2);
    });

    test('should report changes when nodes join', () => {
      changes.addJoiningNode(mockNode);
      expect(changes.hasChanges()).toBe(true);
    });

    test('should report changes when nodes leave', () => {
      changes.addLeavingNode(mockNode);
      expect(changes.hasChanges()).toBe(true);
    });
  });

  describe('index operations', () => {
    const mockIndex = { name: 'test-index' };

    test('should track created indices', () => {
      changes.addCreatedIndex(mockIndex);
      expect(changes.hasCreatedIndices()).toBe(true);
      expect(changes.indicesCreated).toContain(mockIndex);
    });

    test('should track multiple created indices', () => {
      const index2 = { name: 'test-index-2' };
      changes.addCreatedIndex(mockIndex);
      changes.addCreatedIndex(index2);
      expect(changes.indicesCreated.length).toBe(2);
    });

    test('should track deleted indices', () => {
      changes.addDeletedIndex(mockIndex);
      expect(changes.hasDeletedIndices()).toBe(true);
      expect(changes.indicesDeleted).toContain(mockIndex);
    });

    test('should track multiple deleted indices', () => {
      const index2 = { name: 'test-index-2' };
      changes.addDeletedIndex(mockIndex);
      changes.addDeletedIndex(index2);
      expect(changes.indicesDeleted.length).toBe(2);
    });

    test('should report changes when indices created', () => {
      changes.addCreatedIndex(mockIndex);
      expect(changes.hasChanges()).toBe(true);
    });

    test('should report changes when indices deleted', () => {
      changes.addDeletedIndex(mockIndex);
      expect(changes.hasChanges()).toBe(true);
    });
  });

  describe('delta operations', () => {
    test('should set and get doc delta', () => {
      changes.setDocDelta(100);
      expect(changes.getDocDelta()).toBe(100);
    });

    test('should handle negative doc delta', () => {
      changes.setDocDelta(-50);
      expect(changes.getDocDelta()).toBe(-50);
    });

    test('should calculate absolute doc delta', () => {
      changes.setDocDelta(-100);
      expect(changes.absDocDelta()).toBe(100);
    });

    test('should set and get data delta', () => {
      changes.setDataDelta(1048576); // 1MB
      expect(changes.getDataDelta()).toBe(1048576);
    });

    test('should handle negative data delta', () => {
      changes.setDataDelta(-1048576);
      expect(changes.getDataDelta()).toBe(-1048576);
    });

    test('should format absolute data delta as readable bytes', () => {
      changes.setDataDelta(-1048576); // -1MB
      expect(changes.absDataDelta()).toBe('1.00MB');
    });
  });

  describe('combined changes', () => {
    test('should track all types of changes simultaneously', () => {
      const node = { id: 'node1' };
      const index = { name: 'index1' };

      changes.addJoiningNode(node);
      changes.addLeavingNode({ id: 'node2' });
      changes.addCreatedIndex(index);
      changes.addDeletedIndex({ name: 'index2' });
      changes.setDocDelta(1000);
      changes.setDataDelta(1048576);

      expect(changes.hasChanges()).toBe(true);
      expect(changes.hasJoins()).toBe(true);
      expect(changes.hasLeaves()).toBe(true);
      expect(changes.hasCreatedIndices()).toBe(true);
      expect(changes.hasDeletedIndices()).toBe(true);
    });
  });
});
