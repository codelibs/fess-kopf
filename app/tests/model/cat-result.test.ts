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
