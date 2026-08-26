import {describe, expect, it} from 'vitest';
import {applyCompletion, completeQueryDsl, contextAt} from '@/model/query-dsl-completer';

/**
 * Fixtures carry the caret as `|`, which reads far better than counting
 * offsets by hand.
 */
function split(marked: string): {text: string; at: number} {
  const at = marked.indexOf('|');
  expect(at, `no caret in ${marked}`).toBeGreaterThanOrEqual(0);
  return {text: marked.slice(0, at) + marked.slice(at + 1), at};
}

function labels(marked: string, fields: string[] = []): string[] {
  const {text, at} = split(marked);
  return completeQueryDsl(text, at, {fields}).map((completion) => completion.label);
}

function context(marked: string) {
  const {text, at} = split(marked);
  return contextAt(text, at);
}

function accept(marked: string, label: string): string {
  const {text, at} = split(marked);
  const applied = applyCompletion(text, contextAt(text, at), label);
  return `${applied.text.slice(0, applied.cursor)}|${applied.text.slice(applied.cursor)}`;
}

describe('contextAt', () => {
  it('reports the root object as the empty path, in key position', () => {
    const parsed = context('{|}');
    expect(parsed.path).toEqual([]);
    expect(parsed.isKey).toBe(true);
  });

  it('tracks the path down through nested objects', () => {
    expect(context('{"query": {"bool": {|}}}').path).toEqual(['query', 'bool']);
  });

  it('leaves key position once a colon is seen', () => {
    const parsed = context('{"size": |}');
    expect(parsed.isKey).toBe(false);
    expect(parsed.lastKey).toBe('size');
  });

  it('returns to key position after a comma', () => {
    expect(context('{"size": 10, |}').isKey).toBe(true);
  });

  it('reads what has been typed of a key', () => {
    const parsed = context('{"que|');
    expect(parsed.prefix).toBe('que');
    expect(parsed.inString).toBe(true);
    expect(parsed.isKey).toBe(true);
  });

  it('reads what has been typed of a value', () => {
    const parsed = context('{"query": {"match": {"title": {"operator": "a|"}}}}');
    expect(parsed.prefix).toBe('a');
    expect(parsed.isKey).toBe(false);
    expect(parsed.lastKey).toBe('operator');
  });

  it('reads a bare word outside a string as the prefix', () => {
    expect(context('{quer|').prefix).toBe('quer');
  });

  it('does not end a string on an escaped quote', () => {
    const parsed = context('{"query": {"match": {"title": "a \\" b|"}}}');
    expect(parsed.inString).toBe(true);
    expect(parsed.lastKey).toBe('title');
  });

  it('skips the anonymous object an array element opens', () => {
    expect(context('{"query": {"bool": {"must": [{|}]}}}').path)
      .toEqual(['query', 'bool', 'must']);
  });

  it('reports the immediate container being an array', () => {
    expect(context('{"sort": [|]}').isInArray).toBe(true);
    expect(context('{"sort": [{|}]}').isInArray).toBe(false);
  });

  it('pops back out of a closed object', () => {
    expect(context('{"query": {"match_all": {}}, |}').path).toEqual([]);
  });
});

describe('key completions', () => {
  it('offers the search body keys at the root, most useful first', () => {
    const offered = labels('{|}');
    expect(offered).toContain('query');
    expect(offered).toContain('size');
    expect(offered).toContain('aggs');
    expect(offered[0]).toBe('query');
  });

  it('offers query types under query', () => {
    const offered = labels('{"query": {|}}');
    expect(offered).toContain('match');
    expect(offered).toContain('bool');
    expect(offered).toContain('range');
  });

  it('offers the vector and hybrid query types Fess clusters use', () => {
    const offered = labels('{"query": {|}}');
    expect(offered).toContain('knn');
    expect(offered).toContain('neural');
    expect(offered).toContain('neural_sparse');
    expect(offered).toContain('hybrid');
  });

  it('offers the bool clauses under bool', () => {
    const offered = labels('{"query": {"bool": {|}}}');
    expect(offered).toEqual(expect.arrayContaining([
      'must', 'must_not', 'should', 'filter', 'minimum_should_match',
    ]));
  });

  it('offers query types inside a bool clause array', () => {
    expect(labels('{"query": {"bool": {"must": [|]}}}')).toContain('match');
  });

  it('offers query types inside an object in a bool clause array', () => {
    expect(labels('{"query": {"bool": {"must": [{|}]}}}')).toContain('match');
  });

  it('offers query types inside a bool clause written as an object', () => {
    expect(labels('{"query": {"bool": {"filter": {|}}}}')).toContain('range');
  });

  it('offers query types inside hybrid queries', () => {
    expect(labels('{"query": {"hybrid": {"queries": [{|}]}}}')).toContain('neural');
  });

  it('offers match parameters under a match field', () => {
    const offered = labels('{"query": {"match": {"content": {|}}}}');
    expect(offered).toContain('query');
    expect(offered).toContain('operator');
    expect(offered).toContain('fuzziness');
  });

  it('offers knn parameters under a knn field', () => {
    const offered = labels('{"query": {"knn": {"content_chunk_vector": {|}}}}');
    expect(offered).toContain('vector');
    expect(offered).toContain('k');
    expect(offered).toContain('filter');
  });

  it('offers neural parameters under a neural field', () => {
    const offered = labels('{"query": {"neural": {"content_chunk_vector": {|}}}}');
    expect(offered).toContain('query_text');
    expect(offered).toContain('model_id');
  });

  it('offers aggregation types under an aggregation name', () => {
    const offered = labels('{"aggs": {"by_host": {|}}}');
    expect(offered).toContain('terms');
    expect(offered).toContain('date_histogram');
  });

  it('offers terms parameters under a terms aggregation', () => {
    const offered = labels('{"aggs": {"by_host": {"terms": {|}}}}');
    expect(offered).toContain('field');
    expect(offered).toContain('size');
  });

  it('resolves a nested aggregation against the same definitions', () => {
    const offered = labels(
      '{"aggs": {"outer": {"terms": {"field": "host"}, "aggs": {"inner": {|}}}}}');
    expect(offered).toContain('terms');
  });

  it('treats aggregations as a spelling of aggs', () => {
    expect(labels('{"aggregations": {"by_host": {|}}}')).toContain('terms');
  });

  it('resolves post_filter as a query', () => {
    expect(labels('{"post_filter": {|}}')).toContain('term');
  });

  it('filters by what has been typed', () => {
    const offered = labels('{"query": {"ma|');
    expect(offered).toContain('match');
    expect(offered).toContain('match_phrase');
    expect(offered).not.toContain('bool');
  });

  it('offers nothing for a path it has no definitions for', () => {
    expect(labels('{"query": {"match": {"content": {"query": {|}}}}}')).toEqual([]);
  });
});

describe('value completions', () => {
  it('offers the enum a key accepts', () => {
    expect(labels('{"query": {"match": {"content": {"operator": "|"}}}}'))
      .toEqual(['and', 'or']);
  });

  it('offers a score mode under nested', () => {
    expect(labels('{"query": {"nested": {"score_mode": "|"}}}'))
      .toContain('avg');
  });

  it('offers sort orders', () => {
    expect(labels('{"sort": [{"created": {"order": "|"}}]}')).toEqual(['asc', 'desc']);
  });

  it('filters an enum by what has been typed', () => {
    expect(labels('{"query": {"match": {"content": {"operator": "a|"}}}}'))
      .toEqual(['and']);
  });

  it('offers nothing for a value it has no enum for', () => {
    expect(labels('{"query": {"match": {"content": {"query": "|"}}}}')).toEqual([]);
  });
});

describe('field completions', () => {
  const fields = ['content', 'title', 'created', 'host'];

  it('offers field names where a query names its field', () => {
    expect(labels('{"query": {"match": {|}}}', fields)).toEqual(fields);
  });

  it('offers field names in a term query', () => {
    expect(labels('{"query": {"term": {|}}}', fields)).toEqual(fields);
  });

  it('offers field names as the value of a field key', () => {
    expect(labels('{"aggs": {"by_host": {"terms": {"field": "|"}}}}', fields))
      .toEqual(fields);
  });

  it('offers field names in a sort array, with the two pseudo fields first', () => {
    const offered = labels('{"sort": [|]}', fields);
    expect(offered.slice(0, 2)).toEqual(['_score', '_doc']);
    expect(offered).toContain('created');
  });

  it('offers field names in a multi_match fields array', () => {
    expect(labels('{"query": {"multi_match": {"fields": [|]}}}', fields))
      .toEqual(fields);
  });

  it('offers field names under _source', () => {
    expect(labels('{"_source": [|]}', fields)).toEqual(fields);
  });

  it('filters field names by what has been typed', () => {
    expect(labels('{"query": {"match": {"c|', fields)).toEqual(['content', 'created']);
  });

  it('falls back to the DSL keys when no mapping is at hand', () => {
    expect(labels('{"query": {"match": {|}}}')).toEqual([]);
  });

  it('marks a field completion as a field', () => {
    const {text, at} = split('{"query": {"match": {|}}}');
    expect(completeQueryDsl(text, at, {fields})[0].meta).toBe('field');
  });
});

describe('applyCompletion', () => {
  it('closes the quote and opens the value for a key', () => {
    expect(accept('{"que|', 'query')).toBe('{"query": |');
  });

  it('keeps a closing quote that is already there', () => {
    expect(accept('{"que|"', 'query')).toBe('{"query": |');
  });

  it('keeps a colon that is already there', () => {
    expect(accept('{"que|": {}}', 'query')).toBe('{"query"|: {}}');
  });

  it('quotes a key typed without one', () => {
    expect(accept('{que|', 'query')).toBe('{"query": |');
  });

  it('inserts a key at a caret that has typed nothing', () => {
    expect(accept('{|}', 'query')).toBe('{"query": |}');
  });

  it('does not open a value for an array element', () => {
    expect(accept('{"sort": ["_sc|', '_score')).toBe('{"sort": ["_score"|');
  });

  it('replaces a value inside its quotes', () => {
    expect(accept('{"operator": "a|"}', 'and')).toBe('{"operator": "and"|}');
  });

  it('quotes a value the caret has not opened a string for', () => {
    expect(accept('{"operator": |}', 'and')).toBe('{"operator": "and"|}');
  });

  it('replaces only the typed token, leaving the rest of the line', () => {
    expect(accept('{"que|, "size": 10}', 'query')).toBe('{"query": |, "size": 10}');
  });
});
