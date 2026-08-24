import {describe, expect, it} from 'vitest';
import {NodeFilter, type FilterableNode} from '@/model/node-filter';

/** Ported from tests/models/node-filter.test.js. */

function node(name: string, overrides: Partial<FilterableNode> = {}): FilterableNode {
  return {name, data: true, master: false, client: false, ...overrides};
}

describe('NodeFilter', () => {
  it('keeps every constructor argument', () => {
    const filter = new NodeFilter('node1', true, true, true, 12345);
    expect(filter.name).toBe('node1');
    expect(filter.data).toBe(true);
    expect(filter.master).toBe(true);
    expect(filter.client).toBe(true);
    expect(filter.timestamp).toBe(12345);
  });

  describe('isBlank', () => {
    it('is blank with no name and every type shown', () => {
      expect(new NodeFilter('', true, true, true).isBlank()).toBe(true);
    });

    it('is not blank once a name is set', () => {
      expect(new NodeFilter('node', true, true, true).isBlank()).toBe(false);
    });

    it('is not blank when a type is hidden', () => {
      expect(new NodeFilter('', true, true, false).isBlank()).toBe(false);
    });
  });

  describe('matches', () => {
    it('matches everything when blank', () => {
      expect(new NodeFilter('', true, true, true).matches(node('any-node'))).toBe(true);
    });

    it('matches a name substring, case-insensitively', () => {
      expect(new NodeFilter('NODE', true, true, true).matches(node('my-node-1'))).toBe(true);
    });

    it('filters by data type', () => {
      const filter = new NodeFilter('', true, false, false);
      expect(filter.matches(node('n1', {data: true}))).toBe(true);
      expect(filter.matches(node('n2', {data: false, master: true}))).toBe(false);
    });

    it('filters by master type', () => {
      const filter = new NodeFilter('', false, true, false);
      expect(filter.matches(node('n1', {data: false, master: true}))).toBe(true);
      expect(filter.matches(node('n2', {data: true, master: false}))).toBe(false);
    });

    it('filters by client type', () => {
      const filter = new NodeFilter('', false, false, true);
      expect(filter.matches(node('n1', {data: false, client: true}))).toBe(true);
      expect(filter.matches(node('n2', {data: true, client: false}))).toBe(false);
    });

    it('requires both name and type to match', () => {
      const filter = new NodeFilter('prod', true, false, false);
      expect(filter.matches(node('prod-data-1', {data: true}))).toBe(true);
      expect(filter.matches(node('staging-data', {data: true}))).toBe(false);
      expect(filter.matches(node('prod-master', {data: false, master: true}))).toBe(false);
    });

    it('matches a node that satisfies any enabled type', () => {
      const filter = new NodeFilter('', true, true, false);
      expect(filter.matches(node('n', {data: false, master: true}))).toBe(true);
    });
  });

  describe('matchesName', () => {
    it('matches anything when no name is set', () => {
      expect(new NodeFilter('', true, true, true).matchesName('any-name')).toBe(true);
    });

    it('matches a substring case-insensitively', () => {
      expect(new NodeFilter('PROD', true, true, true).matchesName('production-node')).toBe(true);
    });

    it('does not match an absent substring', () => {
      expect(new NodeFilter('staging', true, true, true).matchesName('production-node')).toBe(
        false,
      );
    });
  });

  describe('clone and equals', () => {
    it('copies the name and the type toggles', () => {
      const clone = new NodeFilter('n', true, false, true, 99).clone();
      expect(clone.name).toBe('n');
      expect(clone.data).toBe(true);
      expect(clone.master).toBe(false);
      expect(clone.client).toBe(true);
    });

    it('does not carry the timestamp across, matching the original', () => {
      expect(new NodeFilter('n', true, true, true, 99).clone().timestamp).toBe(0);
    });

    it('compares every field, timestamp included', () => {
      const filter = new NodeFilter('n', true, true, true, 1);
      expect(filter.equals(new NodeFilter('n', true, true, true, 1))).toBe(true);
      expect(filter.equals(new NodeFilter('n', true, true, true, 2))).toBe(false);
      expect(filter.equals(new NodeFilter('m', true, true, true, 1))).toBe(false);
      expect(filter.equals(null)).toBe(false);
    });

    it('is therefore unequal to its own clone when a timestamp was set', () => {
      const filter = new NodeFilter('n', true, true, true, 99);
      expect(filter.equals(filter.clone())).toBe(false);
    });
  });

  it('sorts by name', () => {
    const nodes = [node('c'), node('a'), node('b')];
    expect([...nodes].sort(NodeFilter.sortByName).map((n) => n.name)).toEqual(['a', 'b', 'c']);
  });
});
