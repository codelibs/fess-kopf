import {describe, expect, it} from 'vitest';
import {REPOSITORY_TYPES, Repository, Snapshot, SnapshotFilter} from '@/model/snapshot';

/** Ported from tests/opensearch/repository.test.js and snapshot-filter.test.js. */

describe('Repository', () => {
  it('offers the five repository types', () => {
    expect(REPOSITORY_TYPES).toEqual(['fs', 'url', 's3', 'hdfs', 'azure']);
  });

  describe('validate', () => {
    it('requires a name and a type', () => {
      expect(() => new Repository('', {type: 'fs'}).validate()).toThrow('name is required');
      expect(() => new Repository('r', {type: ''}).validate()).toThrow('type is required');
    });

    it.each([
      ['fs', 'location'],
      ['url', 'url'],
      ['s3', 'bucket'],
      ['hdfs', 'path'],
    ])('requires %s to have %s', (type, setting) => {
      expect(() => new Repository('r', {type, settings: {}}).validate()).toThrow(
        `${setting} is required for snapshot of type ${type}`,
      );
      const complete = new Repository('r', {type, settings: {[setting]: 'x'}});
      expect(() => complete.validate()).not.toThrow();
    });

    it('asks nothing extra of an azure repository', () => {
      expect(() => new Repository('r', {type: 'azure', settings: {}}).validate()).not.toThrow();
    });
  });

  describe('asJson', () => {
    it('sends only settings the type recognises', () => {
      const repository = new Repository('r', {
        type: 'fs',
        settings: {location: '/backup', bucket: 'ignored', compress: 'true'},
      });
      expect(JSON.parse(repository.asJson())).toEqual({
        type: 'fs',
        settings: {location: '/backup', compress: 'true'},
      });
    });

    it('drops settings with no value', () => {
      const repository = new Repository('r', {
        type: 'fs',
        settings: {location: '/b', chunk_size: ''},
      });
      expect(JSON.parse(repository.asJson()).settings).toEqual({location: '/b'});
    });

    it('carries the s3 settings the form offers', () => {
      const repository = new Repository('r', {
        type: 's3',
        settings: {bucket: 'b', region: 'r', base_path: 'p'},
      });
      expect(JSON.parse(repository.asJson()).settings).toEqual({
        bucket: 'b',
        region: 'r',
        base_path: 'p',
      });
    });

    it('carries only the type when it is unknown', () => {
      expect(JSON.parse(new Repository('r', {type: 'nope'}).asJson())).toEqual({type: 'nope'});
    });
  });
});

describe('Snapshot', () => {
  it('renames the snapshot field to name and defaults the rest', () => {
    const snapshot = new Snapshot({snapshot: 'snap-1'});
    expect(snapshot.name).toBe('snap-1');
    expect(snapshot.indices).toEqual([]);
    expect(snapshot.failures).toEqual([]);
  });

  it('carries the fields the list shows', () => {
    const snapshot = new Snapshot({
      snapshot: 'snap-1',
      indices: ['a', 'b'],
      state: 'SUCCESS',
      duration_in_millis: 1200,
    });
    expect(snapshot.indices).toEqual(['a', 'b']);
    expect(snapshot.state).toBe('SUCCESS');
    expect(snapshot.duration_in_millis).toBe(1200);
  });
});

describe('SnapshotFilter', () => {
  const snapshot = new Snapshot({snapshot: 'Nightly-2026'});

  it('matches everything when blank', () => {
    expect(new SnapshotFilter('').isBlank()).toBe(true);
    expect(new SnapshotFilter('').matches(snapshot)).toBe(true);
  });

  it('matches case-insensitively on a substring', () => {
    expect(new SnapshotFilter('nightly').matches(snapshot)).toBe(true);
    expect(new SnapshotFilter('2026').matches(snapshot)).toBe(true);
    expect(new SnapshotFilter('weekly').matches(snapshot)).toBe(false);
  });

  it('sorts by name, clones and compares', () => {
    const filter = new SnapshotFilter('n');
    expect(filter.equals(filter.clone())).toBe(true);
    expect(filter.equals(new SnapshotFilter('m'))).toBe(false);
    expect(filter.equals(null)).toBe(false);
    const list = [new Snapshot({snapshot: 'b'}), new Snapshot({snapshot: 'a'})];
    expect(list.sort(filter.getSorting()).map((s) => s.name)).toEqual(['a', 'b']);
  });
});
