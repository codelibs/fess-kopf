import {describe, expect, it} from 'vitest';
import {CatResult} from '@/model/cat-result';

/** Ported from the behaviour of src/kopf/opensearch/cat_result.js. */

// Real _cat/aliases?v output, trimmed to two rows.
const ALIASES = [
  'alias               index                             filter routing.index',
  'fess_basic_config   fess_config.related_content       -      -            ',
  'fess.search         fess.20260101                     -      -            ',
  '',
].join('\n');

describe('CatResult', () => {
  it('reads the column names from the header', () => {
    expect(new CatResult(ALIASES).columns).toEqual([
      'alias',
      'index',
      'filter',
      'routing.index',
    ]);
  });

  it('slices each row at the header offsets and trims', () => {
    const result = new CatResult(ALIASES);
    expect(result.lines).toEqual([
      ['fess_basic_config', 'fess_config.related_content', '-', '-'],
      ['fess.search', 'fess.20260101', '-', '-'],
    ]);
  });

  it('keeps the last row when the response has no trailing newline', () => {
    // The original dropped the last element unconditionally.
    const withoutNewline = ALIASES.replace(/\n$/, '');
    expect(new CatResult(withoutNewline).lines).toHaveLength(2);
  });

  it('drops several trailing blank lines rather than data', () => {
    expect(new CatResult(`${ALIASES}\n\n`).lines).toHaveLength(2);
  });

  it('returns no rows for a header-only response', () => {
    const result = new CatResult('epoch      timestamp count\n');
    expect(result.columns).toEqual(['epoch', 'timestamp', 'count']);
    expect(result.lines).toEqual([]);
  });

  it('survives an empty response', () => {
    const result = new CatResult('');
    expect(result.columns).toEqual([]);
    expect(result.lines).toEqual([]);
  });

  it('keeps a value that is wider than its column name', () => {
    // ?v pads the header to the widest value, so offsets still line up.
    const text = ['id                     node', 'HTsFSGtDStypPL4O0OVdxA search01', ''].join('\n');
    expect(new CatResult(text).lines).toEqual([['HTsFSGtDStypPL4O0OVdxA', 'search01']]);
  });
});

describe('CatResult, when a column name occurs inside an earlier one', () => {
  /**
   * The header GET /_cat/thread_pool answers with, on 2.19.1 and 3.8.0.
   * `name` occurs at offset 5, inside `node_name`, which is what used to
   * cut every node name in half.
   */
  const THREAD_POOL = [
    'node_name name                                        active queue rejected',
    'search01  _plugin_geospatial_ip2geo_datasource_update      0     0        0',
    'search01  write                                            1     0       12',
    '',
  ].join('\n');

  it('keeps the node name whole', () => {
    const result = new CatResult(THREAD_POOL);
    expect(result.columns).toEqual(['node_name', 'name', 'active', 'queue', 'rejected']);
    expect(result.lines[0]).toEqual([
      'search01',
      '_plugin_geospatial_ip2geo_datasource_update',
      '0',
      '0',
      '0',
    ]);
  });

  it('reads the rejection count, which is the reason to open this API', () => {
    expect(new CatResult(THREAD_POOL).lines[1]).toEqual(['search01', 'write', '1', '0', '12']);
  });

  it('handles a header where one column is a prefix of the next', () => {
    const table = ['node.role node.roles', 'dim       dim,ingest', ''].join('\n');
    expect(new CatResult(table).lines[0]).toEqual(['dim', 'dim,ingest']);
  });
});
