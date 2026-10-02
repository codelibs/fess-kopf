import {describe, expect, it} from 'vitest';
import {
  ALL_FIELDS,
  DocStats,
  LARGEST_SIZE,
  SIZE_RANGES,
  TERMS_SIZE,
  buildDocStatsQuery,
  parseFieldCaps,
  type FieldCapsResponse,
} from '@/model/doc-stats';

/** `_field_caps` for a document index built from the current Fess mapping. */
function currentCaps(): FieldCapsResponse {
  const keyword = {keyword: {type: 'keyword', searchable: true, aggregatable: true}};
  const date = {date: {type: 'date', searchable: true, aggregatable: true}};
  return {
    indices: ['fess.20261002000000000'],
    fields: {
      filetype: keyword,
      mimetype: keyword,
      host: keyword,
      label: keyword,
      owner: keyword,
      last_modifier: keyword,
      last_modified: date,
      created: date,
      content_length: {long: {type: 'long', searchable: true, aggregatable: true}},
    },
  };
}

type Aggs = Record<string, Record<string, unknown>>;

function aggsOf(query: Record<string, unknown>): Aggs {
  return query.aggs as Aggs;
}

describe('parseFieldCaps', () => {
  it('accepts every field of the current mapping', () => {
    const states = parseFieldCaps(currentCaps());
    expect([...states.values()].every((state) => state.status === 'ok')).toBe(true);
    expect([...states.keys()]).toEqual([...ALL_FIELDS]);
  });

  it('reports a field no index has as unmapped', () => {
    const caps = currentCaps();
    delete caps.fields!.owner;
    expect(parseFieldCaps(caps).get('owner')).toEqual({field: 'owner', status: 'unmapped'});
  });

  it('refuses a field an older index holds as dynamic text', () => {
    // Before owner was in the mapping, the first document to carry it made
    // it text -- and a terms aggregation on text fails the whole search.
    const caps = currentCaps();
    caps.fields!.owner = {text: {type: 'text', searchable: true, aggregatable: false}};
    expect(parseFieldCaps(caps).get('owner')).toEqual({
      field: 'owner',
      status: 'unaggregatable',
      types: ['text'],
    });
  });

  it('refuses a field whose type differs between the indices behind an alias', () => {
    const caps = currentCaps();
    caps.fields!.owner = {
      keyword: {type: 'keyword', aggregatable: true},
      text: {type: 'text', aggregatable: false},
    };
    const state = parseFieldCaps(caps).get('owner');
    expect(state?.status).toBe('unaggregatable');
  });

  it('refuses a field of the wrong family even when it could be aggregated', () => {
    const caps = currentCaps();
    caps.fields!.last_modified = {keyword: {type: 'keyword', aggregatable: true}};
    expect(parseFieldCaps(caps).get('last_modified')?.status).toBe('unaggregatable');
  });
});

describe('buildDocStatsQuery', () => {
  it('asks for counts only, with an exact total', () => {
    const query = buildDocStatsQuery(parseFieldCaps(currentCaps()), 'Asia/Tokyo');
    expect(query.size).toBe(0);
    expect(query.track_total_hits).toBe(true);
  });

  it('asks for every panel and its missing count when every field is usable', () => {
    const aggs = aggsOf(buildDocStatsQuery(parseFieldCaps(currentCaps()), 'Asia/Tokyo'));
    expect(aggs.terms_filetype).toEqual({terms: {field: 'filetype', size: TERMS_SIZE}});
    expect(aggs.missing_owner).toEqual({missing: {field: 'owner'}});
    expect(aggs.year_last_modified).toEqual({
      date_histogram: {
        field: 'last_modified',
        calendar_interval: 'year',
        format: 'yyyy',
        time_zone: 'Asia/Tokyo',
        min_doc_count: 1,
      },
    });
    expect(aggs.size_ranges).toEqual({range: {field: 'content_length', ranges: SIZE_RANGES}});
    expect((aggs.largest.top_hits as {size: number}).size).toBe(LARGEST_SIZE);
  });

  it('leaves out a field that cannot be aggregated, rather than failing the search', () => {
    const caps = currentCaps();
    caps.fields!.owner = {text: {type: 'text', aggregatable: false}};
    delete caps.fields!.content_length;
    const aggs = aggsOf(buildDocStatsQuery(parseFieldCaps(caps), 'UTC'));
    expect(aggs.terms_owner).toBeUndefined();
    expect(aggs.missing_owner).toBeUndefined();
    expect(aggs.size_ranges).toBeUndefined();
    expect(aggs.largest).toBeUndefined();
    expect(aggs.terms_last_modifier).toBeDefined();
  });

  it('keeps the size bands contiguous', () => {
    for (let i = 1; i < SIZE_RANGES.length; i++) {
      expect(SIZE_RANGES[i].from).toBe(SIZE_RANGES[i - 1].to);
    }
    expect(SIZE_RANGES[0].from).toBeUndefined();
    expect(SIZE_RANGES[SIZE_RANGES.length - 1].to).toBeUndefined();
  });
});

describe('DocStats', () => {
  const states = parseFieldCaps(currentCaps());

  it('reads the total, the buckets, and what fell outside them', () => {
    const stats = new DocStats('fess.search', states, {
      hits: {total: {value: 1200, relation: 'eq'}},
      aggregations: {
        terms_filetype: {
          sum_other_doc_count: 30,
          buckets: [
            {key: 'pdf', doc_count: 700},
            {key: 'word', doc_count: 400},
          ],
        },
        missing_filetype: {doc_count: 70},
        year_last_modified: {
          buckets: [{key: 1704067200000, key_as_string: '2024', doc_count: 1100}],
        },
        size_ranges: {buckets: [{key: '< 10KB', doc_count: 900}]},
        size_stats: {count: 1200, min: 0, max: 5242880, avg: 2048, sum: 2457600},
      },
    });

    expect(stats.total).toBe(1200);
    expect(stats.totalIsLowerBound).toBe(false);
    const filetype = stats.terms.find((term) => term.state.field === 'filetype')!;
    expect(filetype.buckets).toEqual([
      {key: 'pdf', count: 700},
      {key: 'word', count: 400},
    ]);
    expect(filetype.other).toBe(30);
    expect(filetype.missing).toBe(70);
    // The year is the formatted key, not the epoch millis of 1 January.
    expect(stats.years[0].buckets).toEqual([{key: '2024', count: 1100}]);
    expect(stats.sizes.buckets).toEqual([{key: '< 10KB', count: 900}]);
    expect(stats.sizeSummary).toEqual({sum: 2457600, avg: 2048, max: 5242880});
  });

  it('has no size summary for an empty index', () => {
    // stats on no documents answers max: null, not 0.
    const stats = new DocStats('fess.search', states, {
      hits: {total: {value: 0, relation: 'eq'}},
      aggregations: {size_stats: {count: 0, min: null, max: null, avg: null, sum: 0}},
    });
    expect(stats.total).toBe(0);
    expect(stats.sizeSummary).toBeNull();
  });

  it('reads a total given as a bare number', () => {
    expect(new DocStats('fess.search', states, {hits: {total: 42}}).total).toBe(42);
  });

  it('lists the largest documents, taking the first of an array value', () => {
    const stats = new DocStats('fess.search', states, {
      hits: {total: {value: 1, relation: 'eq'}},
      aggregations: {
        largest: {
          hits: {
            hits: [
              {
                _source: {
                  url: 'smb://files/share/big.pptx',
                  filename: ['big.pptx'],
                  content_length: 104857600,
                  last_modified: '2025-04-01T00:00:00.000Z',
                },
              },
            ],
          },
        },
      },
    });
    expect(stats.largest).toEqual([
      {
        url: 'smb://files/share/big.pptx',
        filename: 'big.pptx',
        size: 104857600,
        lastModified: '2025-04-01T00:00:00.000Z',
      },
    ]);
  });

  it('carries the verdict for a field that was not asked about', () => {
    const caps = currentCaps();
    caps.fields!.owner = {text: {type: 'text', aggregatable: false}};
    const stats = new DocStats('fess.search', parseFieldCaps(caps), {hits: {total: 1}});
    const owner = stats.terms.find((term) => term.state.field === 'owner')!;
    expect(owner.state.status).toBe('unaggregatable');
    expect(owner.buckets).toEqual([]);
  });
});
