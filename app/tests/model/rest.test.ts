import {beforeEach, describe, expect, it} from 'vitest';
import {toCsv} from '@/model/csv';
import {isExplainPath, normalizeExplainResponse} from '@/model/explain';
import {HTTP_METHODS, Request, loadHistory, rememberRequest} from '@/model/request';
import {QUERY_SNIPPETS, suggestPaths} from '@/model/rest-suggestions';

beforeEach(() => localStorage.clear());

describe('Request', () => {
  it('offers the five methods the screen supports', () => {
    expect(HTTP_METHODS).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'HEAD']);
  });

  it('compares path, method and body, ignoring method case', () => {
    const request = new Request('_search', 'GET', '{}');
    expect(request.equals(new Request('_search', 'GET', '{}'))).toBe(true);
    expect(request.equals(new Request('_count', 'GET', '{}'))).toBe(false);
    expect(request.equals(new Request('_search', 'POST', '{}'))).toBe(false);
  });

  describe('fromJSON', () => {
    it('reads a stored path', () => {
      const request = Request.fromJSON({path: '_search', method: 'post', body: '{"a":1}'});
      expect(request.path).toBe('_search');
      expect(request.method).toBe('POST');
      expect(request.body).toBe('{"a":1}');
    });

    it('recovers the path from an older entry that stored a full URL', () => {
      const request = Request.fromJSON({url: 'http://localhost:9200/idx/_search', method: 'GET'});
      expect(request.path).toBe('/idx/_search');
    });

    it('falls back to sensible values for a partial entry', () => {
      const request = Request.fromJSON({});
      expect(request.path).toBe('');
      expect(request.method).toBe('GET');
      expect(request.body).toBe('{}');
    });
  });
});

describe('history', () => {
  it('is empty when nothing is stored', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('discards a malformed store rather than throwing', () => {
    localStorage.setItem('kopf_request_history', 'not json');
    expect(loadHistory()).toEqual([]);
    expect(localStorage.getItem('kopf_request_history')).toBeNull();
  });

  it('adds to the front and persists', () => {
    const next = rememberRequest([], new Request('_search', 'GET', '{}'));
    expect(next).toHaveLength(1);
    expect(loadHistory()[0].path).toBe('_search');
  });

  it('ignores an exact repeat', () => {
    const first = rememberRequest([], new Request('_search', 'GET', '{}'));
    const second = rememberRequest(first, new Request('_search', 'GET', '{}'));
    expect(second).toHaveLength(1);
  });

  it('keeps at most thirty', () => {
    let history: Request[] = [];
    for (let i = 0; i < 35; i++) {
      history = rememberRequest(history, new Request(`_search/${i}`, 'GET', '{}'));
    }
    expect(history).toHaveLength(30);
    expect(history[0].path).toBe('_search/34');
  });
});

describe('isExplainPath', () => {
  it.each(['idx/_explain/1', 'idx/_search?explain', 'idx/_search?explain=true'])(
    'recognises %s',
    (path) => expect(isExplainPath(path)).toBe(true),
  );

  it('does not recognise a plain search', () => {
    expect(isExplainPath('idx/_search')).toBe(false);
  });
});

describe('normalizeExplainResponse', () => {
  const explanation = {value: 1.5, description: 'weight', details: []};

  it('reads the hits of a search response', () => {
    const hits = normalizeExplainResponse({
      hits: {hits: [{_index: 'idx', _id: '1', _explanation: explanation}]},
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]._score).toBe(1.5);
  });

  it('treats a single-document explain as one hit', () => {
    const hits = normalizeExplainResponse({_index: 'idx', _id: '1', explanation});
    expect(hits).toHaveLength(1);
    expect(hits[0]._explanation).toEqual(explanation);
  });

  it('builds a document id without a type', () => {
    // The AngularJS version built _index/_type/_id, which on a typeless index
    // rendered as "idx/undefined/1".
    const hits = normalizeExplainResponse({hits: {hits: [{_index: 'idx', _id: '1'}]}});
    expect(hits[0].documentId).toBe('idx/1');
  });

  it('keeps an explicit score', () => {
    const hits = normalizeExplainResponse({
      hits: {hits: [{_index: 'i', _id: '1', _score: 9, _explanation: explanation}]},
    });
    expect(hits[0]._score).toBe(9);
  });
});

describe('toCsv', () => {
  it('exports the hits of a search response', () => {
    const csv = toCsv({hits: {hits: [{_id: '1', _source: {title: 'a'}}]}});
    expect(csv.split('\n')[0]).toContain('_source.title');
    expect(csv.split('\n')[1]).toContain('a');
  });

  it('quotes a value containing a comma', () => {
    const csv = toCsv({hits: {hits: [{title: 'a,b'}]}});
    expect(csv.split('\n')[1]).toBe('"a,b"');
  });

  it('doubles an embedded quote', () => {
    const csv = toCsv({hits: {hits: [{title: 'say "hi"'}]}});
    expect(csv.split('\n')[1]).toBe('"say ""hi"""');
  });

  it('falls back to one row for a non-search response', () => {
    const csv = toCsv({acknowledged: true});
    expect(csv).toBe('acknowledged\ntrue');
  });

  it('returns nothing for a non-object', () => {
    expect(toCsv('text')).toBe('');
  });
});

describe('suggestPaths', () => {
  const indices = ['fess.20260101', 'other'];

  it('expands {index} from the cluster indices', () => {
    expect(suggestPaths('fess.20260101/', indices)).toContain('fess.20260101/_search');
  });

  it('offers cluster paths that match what was typed', () => {
    expect(suggestPaths('_cluster/', indices)).toContain('_cluster/health');
  });

  it('never repeats what is already typed exactly', () => {
    expect(suggestPaths('_search', indices)).not.toContain('_search');
  });

  it('tolerates a leading slash', () => {
    expect(suggestPaths('/_cluster/he', indices)).toEqual(['_cluster/health']);
  });

  it('caps the list', () => {
    expect(suggestPaths('', indices, 3)).toHaveLength(3);
  });
});

describe('QUERY_SNIPPETS', () => {
  it('covers the query types a Fess cluster is operated with', () => {
    expect(QUERY_SNIPPETS.map((s) => s.label)).toEqual([
      'match',
      'knn',
      'neural',
      'neural_sparse',
      'hybrid',
    ]);
  });

  it('is valid JSON in every case', () => {
    QUERY_SNIPPETS.forEach((snippet) => {
      expect(() => JSON.parse(snippet.body)).not.toThrow();
    });
  });
});
