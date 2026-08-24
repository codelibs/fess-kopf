import {beforeEach, describe, expect, it} from 'vitest';
import {ClusterChanges} from '@/model/cluster-changes';
import type {ClusterNode} from '@/model/cluster-node';
import type {Index} from '@/model/opensearch-index';

/** Ported from tests/opensearch/cluster-changes.test.js. */

const node = {id: 'n1'} as ClusterNode;
const otherNode = {id: 'n2'} as ClusterNode;
const index = {name: 'i1'} as Index;
const otherIndex = {name: 'i2'} as Index;

let changes: ClusterChanges;

beforeEach(() => {
  changes = new ClusterChanges();
});

describe('ClusterChanges', () => {
  describe('initial state', () => {
    it('starts with null collections, not empty arrays', () => {
      // hasChanges() distinguishes "nothing happened" from "an empty list",
      // so the null must survive the port.
      expect(changes.nodeJoins).toBeNull();
      expect(changes.nodeLeaves).toBeNull();
      expect(changes.indicesCreated).toBeNull();
      expect(changes.indicesDeleted).toBeNull();
    });

    it('starts with zero deltas and no changes', () => {
      expect(changes.docDelta).toBe(0);
      expect(changes.dataDelta).toBe(0);
      expect(changes.hasChanges()).toBe(false);
    });
  });

  describe('nodes', () => {
    it('tracks a joining node', () => {
      changes.addJoiningNode(node);
      expect(changes.hasJoins()).toBe(true);
      expect(changes.nodeJoins).toContain(node);
    });

    it('tracks several joining nodes', () => {
      changes.addJoiningNode(node);
      changes.addJoiningNode(otherNode);
      expect(changes.nodeJoins?.length).toBe(2);
    });

    it('tracks a leaving node', () => {
      changes.addLeavingNode(node);
      expect(changes.hasLeaves()).toBe(true);
      expect(changes.nodeLeaves).toContain(node);
    });

    it('tracks several leaving nodes', () => {
      changes.addLeavingNode(node);
      changes.addLeavingNode(otherNode);
      expect(changes.nodeLeaves?.length).toBe(2);
    });

    it.each([
      ['joins', (c: ClusterChanges) => c.addJoiningNode(node)],
      ['leaves', (c: ClusterChanges) => c.addLeavingNode(node)],
    ])('reports changes on node %s', (_label, act) => {
      act(changes);
      expect(changes.hasChanges()).toBe(true);
    });
  });

  describe('indices', () => {
    it('tracks a created index', () => {
      changes.addCreatedIndex(index);
      expect(changes.hasCreatedIndices()).toBe(true);
      expect(changes.indicesCreated).toContain(index);
    });

    it('tracks several created indices', () => {
      changes.addCreatedIndex(index);
      changes.addCreatedIndex(otherIndex);
      expect(changes.indicesCreated?.length).toBe(2);
    });

    it('tracks a deleted index', () => {
      changes.addDeletedIndex(index);
      expect(changes.hasDeletedIndices()).toBe(true);
      expect(changes.indicesDeleted).toContain(index);
    });

    it('tracks several deleted indices', () => {
      changes.addDeletedIndex(index);
      changes.addDeletedIndex(otherIndex);
      expect(changes.indicesDeleted?.length).toBe(2);
    });

    it.each([
      ['created', (c: ClusterChanges) => c.addCreatedIndex(index)],
      ['deleted', (c: ClusterChanges) => c.addDeletedIndex(index)],
    ])('reports changes on indices %s', (_label, act) => {
      act(changes);
      expect(changes.hasChanges()).toBe(true);
    });
  });

  describe('deltas', () => {
    it('stores and returns the doc delta', () => {
      changes.setDocDelta(100);
      expect(changes.getDocDelta()).toBe(100);
    });

    it('keeps a negative doc delta signed but reports it absolute on demand', () => {
      changes.setDocDelta(-50);
      expect(changes.getDocDelta()).toBe(-50);
      expect(changes.absDocDelta()).toBe(50);
    });

    it('stores and returns the data delta', () => {
      changes.setDataDelta(1048576);
      expect(changes.getDataDelta()).toBe(1048576);
    });

    it('keeps a negative data delta signed', () => {
      changes.setDataDelta(-1048576);
      expect(changes.getDataDelta()).toBe(-1048576);
    });

    it('formats the absolute data delta', () => {
      changes.setDataDelta(-1048576);
      expect(changes.absDataDelta()).toBe('1.00MB');
    });

    it('does not count a delta alone as a change', () => {
      changes.setDocDelta(100);
      changes.setDataDelta(100);
      expect(changes.hasChanges()).toBe(false);
    });
  });
});
