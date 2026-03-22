/**
 * Tests for QueryDslContextParser, ClusterMapping (getFields/getAllFields),
 * and createQueryDslCompleter.
 */

var fs = require('fs');
var path = require('path');

// Load source files in dependency order (plain JS globals, not modules)
var utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
var clusterMappingCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/cluster_mapping.js'),
  'utf8'
);
var queryDslCompleterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/query_dsl_completer.js'),
  'utf8'
);

eval(utilCode);
eval(clusterMappingCode);
eval(queryDslCompleterCode);

// ===========================================================================
// QueryDslContextParser
// ===========================================================================

describe('QueryDslContextParser', function() {

  // --- Basic path detection ---

  it('should return empty path for root of empty object', function() {
    var ctx = new QueryDslContextParser('{\n  \n}', 1, 2);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
    expect(ctx.isInArray).toBe(false);
  });

  it('should return ["query"] when inside query object', function() {
    var text = '{\n  "query": {\n    \n  }\n}';
    var ctx = new QueryDslContextParser(text, 2, 4);
    expect(ctx.path).toEqual(['query']);
    expect(ctx.isKey).toBe(true);
  });

  it('should return ["query", "bool"] inside bool', function() {
    var text = '{\n  "query": {\n    "bool": {\n      \n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 3, 6);
    expect(ctx.path).toEqual(['query', 'bool']);
    expect(ctx.isKey).toBe(true);
  });

  it('should track aggs context', function() {
    var text = '{\n  "aggs": {\n    "my_agg": {\n      \n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 3, 6);
    expect(ctx.path).toEqual(['aggs', 'my_agg']);
    expect(ctx.isKey).toBe(true);
  });

  it('should track nested aggregation parameters', function() {
    var text =
      '{\n  "aggs": {\n    "by_status": {\n      "terms": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 4, 8);
    expect(ctx.path).toEqual(['aggs', 'by_status', 'terms']);
    expect(ctx.isKey).toBe(true);
  });

  it('should track highlight.fields path', function() {
    var text =
      '{\n  "highlight": {\n    "fields": {\n      \n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 3, 6);
    expect(ctx.path).toEqual(['highlight', 'fields']);
    expect(ctx.isKey).toBe(true);
  });

  it('should track _source object context', function() {
    var text = '{\n  "_source": {\n    \n  }\n}';
    var ctx = new QueryDslContextParser(text, 2, 4);
    expect(ctx.path).toEqual(['_source']);
    expect(ctx.isKey).toBe(true);
  });

  // --- Deep nesting (4+ levels) ---

  it('should track deeply nested path (4 levels)', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "must": [\n        ' +
      '{\n          "nested": {\n            \n          }\n        ' +
      '}\n      ]\n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 6, 12);
    expect(ctx.path).toEqual(['query', 'bool', 'must', 'nested']);
    expect(ctx.isKey).toBe(true);
  });

  it('should track nested aggs within aggs', function() {
    var text =
      '{\n  "aggs": {\n    "outer": {\n      "terms": {\n' +
      '        "field": "status"\n      },\n' +
      '      "aggs": {\n        "inner": {\n          \n' +
      '        }\n      }\n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 8, 10);
    expect(ctx.path).toEqual(['aggs', 'outer', 'aggs', 'inner']);
    expect(ctx.isKey).toBe(true);
  });

  // --- Array contexts ---

  it('should detect array context in must', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "must": [\n        ' +
      '{\n          \n        }\n      ]\n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 5, 10);
    expect(ctx.path).toEqual(['query', 'bool', 'must']);
    expect(ctx.isKey).toBe(true);
  });

  it('should set isInArray for sort array', function() {
    var text = '{\n  "sort": [\n    \n  ]\n}';
    var ctx = new QueryDslContextParser(text, 2, 4);
    expect(ctx.isInArray).toBe(true);
    expect(ctx.path).toEqual(['sort']);
  });

  it('should detect sort array with object inside', function() {
    var text = '{\n  "sort": [\n    {\n      \n    }\n  ]\n}';
    var ctx = new QueryDslContextParser(text, 3, 6);
    expect(ctx.path).toEqual(['sort']);
    expect(ctx.isKey).toBe(true);
  });

  it('should set isInArray=false inside object within array', function() {
    var text = '{\n  "sort": [\n    {\n      \n    }\n  ]\n}';
    var ctx = new QueryDslContextParser(text, 3, 6);
    // Cursor is inside an object within the array, so isInArray should be
    // false (the immediate parent is an object, not the array).
    expect(ctx.isInArray).toBe(false);
  });

  it('should handle comma between array elements', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "must": [\n' +
      '        {"match": {"title": "foo"}},\n' +
      '        \n' +
      '      ]\n    }\n  }\n}';
    var ctx = new QueryDslContextParser(text, 5, 8);
    expect(ctx.path).toEqual(['query', 'bool', 'must']);
    expect(ctx.isInArray).toBe(true);
  });

  // --- Key vs value position ---

  it('should detect value position after colon', function() {
    var text = '{\n  "size": ';
    var ctx = new QueryDslContextParser(text, 1, 10);
    expect(ctx.isKey).toBe(false);
  });

  it('should return to key position after comma in object', function() {
    var text = '{\n  "size": 10,\n  ';
    var ctx = new QueryDslContextParser(text, 2, 2);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
  });

  it('should detect value position for nested object value', function() {
    var text = '{\n  "query": {\n    "match": {\n      "title": ';
    var ctx = new QueryDslContextParser(text, 3, 16);
    expect(ctx.isKey).toBe(false);
  });

  it('should be key position after closing brace then comma', function() {
    var text = '{\n  "query": {"match_all": {}},\n  ';
    var ctx = new QueryDslContextParser(text, 2, 2);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
  });

  it('should be value position right after closing brace', function() {
    var text = '{\n  "query": {"match_all": {}}';
    var ctx = new QueryDslContextParser(text, 1, 30);
    expect(ctx.isKey).toBe(false);
  });

  it('should detect key position for second key in object', function() {
    var text = '{\n  "size": 10,\n  "from": 0,\n  ';
    var ctx = new QueryDslContextParser(text, 3, 2);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
  });

  // --- String handling edge cases ---

  it('should skip braces inside string values', function() {
    var text =
      '{\n  "query": {\n    "query_string": {\n      ' +
      '"query": "{test}",\n      ';
    var ctx = new QueryDslContextParser(text, 4, 6);
    expect(ctx.path).toEqual(['query', 'query_string']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle escaped quotes in strings', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      ' +
      '"field": "value with \\"quotes\\"",\n      ';
    var ctx = new QueryDslContextParser(text, 4, 6);
    expect(ctx.path).toEqual(['query', 'match']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle colons inside string values', function() {
    var text =
      '{\n  "query": {\n    "query_string": {\n      ' +
      '"query": "status:active AND type:doc",\n      ';
    var ctx = new QueryDslContextParser(text, 4, 6);
    expect(ctx.path).toEqual(['query', 'query_string']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle commas inside string values', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      ' +
      '"title": "hello, world",\n      ';
    var ctx = new QueryDslContextParser(text, 4, 6);
    expect(ctx.path).toEqual(['query', 'match']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle brackets inside string values', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      ' +
      '"title": "[1,2,3]",\n      ';
    var ctx = new QueryDslContextParser(text, 4, 6);
    expect(ctx.path).toEqual(['query', 'match']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle backslash at end of text', function() {
    var text = '{\n  "query": "test\\';
    var ctx = new QueryDslContextParser(text, 1, 19);
    // Should not crash
    expect(ctx.path).toEqual([]);
  });

  // --- Incomplete / malformed JSON ---

  it('should handle incomplete JSON', function() {
    var text = '{\n  "query": {\n    "match": {\n      ';
    var ctx = new QueryDslContextParser(text, 3, 6);
    expect(ctx.path).toEqual(['query', 'match']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle empty text', function() {
    var ctx = new QueryDslContextParser('', 0, 0);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
    expect(ctx.isInArray).toBe(false);
  });

  it('should handle single opening brace', function() {
    var ctx = new QueryDslContextParser('{', 0, 1);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle single line JSON', function() {
    var text = '{"query": {"match_all": {}}}';
    // Cursor right after "match_all":, inside the {}
    var ctx = new QueryDslContextParser(text, 0, 25);
    expect(ctx.path).toEqual(['query', 'match_all']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle cursor at row 0', function() {
    var text = '{"query": {}}';
    var ctx = new QueryDslContextParser(text, 0, 11);
    expect(ctx.path).toEqual(['query']);
    expect(ctx.isKey).toBe(true);
  });

  it('should handle cursor beyond text length', function() {
    var text = '{\n  \n}';
    var ctx = new QueryDslContextParser(text, 1, 100);
    // Should not crash; cursor col > line length just takes full line
    expect(ctx.path).toEqual([]);
  });

  it('should handle trailing comma (invalid JSON)', function() {
    var text = '{\n  "size": 10,\n  "from": 5,\n  ';
    var ctx = new QueryDslContextParser(text, 3, 2);
    expect(ctx.path).toEqual([]);
    expect(ctx.isKey).toBe(true);
  });

  // --- partial property ---

  it('should capture partial key being typed inside string', function() {
    var text = '{\n  "que';
    var ctx = new QueryDslContextParser(text, 1, 6);
    // Cursor is still inside the string "que (no closing quote)
    expect(ctx.partial).toBe('que');
  });

  it('should capture completed key as partial', function() {
    var text = '{\n  "query"';
    var ctx = new QueryDslContextParser(text, 1, 9);
    expect(ctx.partial).toBe('query');
  });

  it('should return empty partial at start of empty object', function() {
    var text = '{\n  "query": {\n    \n  }\n}';
    var ctx = new QueryDslContextParser(text, 2, 4);
    expect(ctx.partial).toBe('');
  });
});

// ===========================================================================
// ClusterMapping - getFields / getAllFields
// ===========================================================================

describe('ClusterMapping', function() {

  describe('getFields', function() {

    it('should extract flat fields from typeless mapping', function() {
      var data = {
        'my_index': {
          mappings: {
            properties: {
              title: {type: 'text'},
              count: {type: 'integer'}
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('my_index');
      expect(fields).toContain('title');
      expect(fields).toContain('count');
      expect(fields.length).toBe(2);
    });

    it('should extract nested fields with dot notation', function() {
      var data = {
        'my_index': {
          mappings: {
            properties: {
              user: {
                type: 'object',
                properties: {
                  name: {type: 'text'},
                  age: {type: 'integer'}
                }
              }
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('my_index');
      expect(fields).toContain('user');
      expect(fields).toContain('user.name');
      expect(fields).toContain('user.age');
      expect(fields.length).toBe(3);
    });

    it('should extract deeply nested fields (3+ levels)', function() {
      var data = {
        'my_index': {
          mappings: {
            properties: {
              company: {
                type: 'object',
                properties: {
                  address: {
                    type: 'object',
                    properties: {
                      city: {type: 'keyword'},
                      zip: {type: 'keyword'}
                    }
                  },
                  name: {type: 'text'}
                }
              }
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('my_index');
      expect(fields).toContain('company');
      expect(fields).toContain('company.address');
      expect(fields).toContain('company.address.city');
      expect(fields).toContain('company.address.zip');
      expect(fields).toContain('company.name');
      expect(fields.length).toBe(5);
    });

    it('should extract fields from legacy typed mappings', function() {
      var data = {
        'my_index': {
          mappings: {
            _doc: {
              properties: {
                title: {type: 'text'},
                body: {type: 'text'}
              }
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('my_index');
      expect(fields).toContain('title');
      expect(fields).toContain('body');
    });

    it('should return empty array for non-existent index', function() {
      var data = {
        'my_index': {
          mappings: {
            properties: {
              title: {type: 'text'}
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('non_existent');
      expect(fields).toEqual([]);
    });

    it('should return empty array for index with empty mappings', function() {
      var data = {
        'empty_index': {
          mappings: {}
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('empty_index');
      expect(fields).toEqual([]);
    });

    it('should handle multiple types in legacy mapping', function() {
      var data = {
        'my_index': {
          mappings: {
            type1: {
              properties: {
                field_a: {type: 'text'}
              }
            },
            type2: {
              properties: {
                field_b: {type: 'keyword'}
              }
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getFields('my_index');
      expect(fields).toContain('field_a');
      expect(fields).toContain('field_b');
    });
  });

  describe('getAllFields', function() {

    it('should deduplicate fields across indices', function() {
      var data = {
        'index1': {
          mappings: {
            properties: {
              title: {type: 'text'},
              body: {type: 'text'}
            }
          }
        },
        'index2': {
          mappings: {
            properties: {
              title: {type: 'text'},
              author: {type: 'keyword'}
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getAllFields();
      expect(fields).toEqual(['author', 'body', 'title']);
    });

    it('should return sorted fields', function() {
      var data = {
        'idx': {
          mappings: {
            properties: {
              zebra: {type: 'keyword'},
              alpha: {type: 'text'},
              middle: {type: 'integer'}
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      expect(mapping.getAllFields()).toEqual(['alpha', 'middle', 'zebra']);
    });

    it('should return empty array for empty data', function() {
      var mapping = new ClusterMapping({});
      expect(mapping.getAllFields()).toEqual([]);
    });

    it('should include nested fields in sorted order', function() {
      var data = {
        'idx': {
          mappings: {
            properties: {
              name: {type: 'text'},
              address: {
                type: 'object',
                properties: {
                  city: {type: 'keyword'}
                }
              }
            }
          }
        }
      };
      var mapping = new ClusterMapping(data);
      var fields = mapping.getAllFields();
      expect(fields).toEqual(['address', 'address.city', 'name']);
    });
  });
});

// ===========================================================================
// Helper functions (loaded as globals via eval)
// ===========================================================================

describe('isFieldNameContext', function() {

  it('should return true for query.match', function() {
    expect(isFieldNameContext('query.match')).toBe(true);
  });

  it('should return true for query.term', function() {
    expect(isFieldNameContext('query.term')).toBe(true);
  });

  it('should return true for query.range', function() {
    expect(isFieldNameContext('query.range')).toBe(true);
  });

  it('should return true for query.match_phrase', function() {
    expect(isFieldNameContext('query.match_phrase')).toBe(true);
  });

  it('should return true for query.wildcard', function() {
    expect(isFieldNameContext('query.wildcard')).toBe(true);
  });

  it('should return true for query.prefix', function() {
    expect(isFieldNameContext('query.prefix')).toBe(true);
  });

  it('should return true for query.fuzzy', function() {
    expect(isFieldNameContext('query.fuzzy')).toBe(true);
  });

  it('should return true for query.regexp', function() {
    expect(isFieldNameContext('query.regexp')).toBe(true);
  });

  it('should return true for highlight.fields', function() {
    expect(isFieldNameContext('highlight.fields')).toBe(true);
  });

  it('should return false for query', function() {
    expect(isFieldNameContext('query')).toBe(false);
  });

  it('should return false for query.bool', function() {
    expect(isFieldNameContext('query.bool')).toBe(false);
  });

  it('should return false for aggs', function() {
    expect(isFieldNameContext('aggs')).toBe(false);
  });

  it('should return false for empty string', function() {
    expect(isFieldNameContext('')).toBe(false);
  });

  it('should return false for query.match.title (too deep)', function() {
    expect(isFieldNameContext('query.match.title')).toBe(false);
  });
});

describe('isQueryArrayContext', function() {

  it('should return true for must array context', function() {
    var ctx = {isInArray: true, path: ['query', 'bool', 'must']};
    expect(isQueryArrayContext(ctx)).toBe(true);
  });

  it('should return true for should array context', function() {
    var ctx = {isInArray: true, path: ['query', 'bool', 'should']};
    expect(isQueryArrayContext(ctx)).toBe(true);
  });

  it('should return true for filter array context', function() {
    var ctx = {isInArray: true, path: ['query', 'bool', 'filter']};
    expect(isQueryArrayContext(ctx)).toBe(true);
  });

  it('should return true for must_not array context', function() {
    var ctx = {isInArray: true, path: ['query', 'bool', 'must_not']};
    expect(isQueryArrayContext(ctx)).toBe(true);
  });

  it('should return false when not in array', function() {
    var ctx = {isInArray: false, path: ['query', 'bool', 'must']};
    expect(isQueryArrayContext(ctx)).toBe(false);
  });

  it('should return false for sort array', function() {
    var ctx = {isInArray: true, path: ['sort']};
    expect(isQueryArrayContext(ctx)).toBe(false);
  });

  it('should return false for root', function() {
    var ctx = {isInArray: false, path: []};
    expect(isQueryArrayContext(ctx)).toBe(false);
  });
});

describe('lookupSuggestions', function() {

  it('should return exact match for root', function() {
    var result = lookupSuggestions('');
    expect(result).toContain('query');
    expect(result).toContain('size');
  });

  it('should return exact match for query', function() {
    var result = lookupSuggestions('query');
    expect(result).toContain('match');
    expect(result).toContain('bool');
  });

  it('should return exact match for query.bool', function() {
    var result = lookupSuggestions('query.bool');
    expect(result).toContain('must');
    expect(result).toContain('should');
  });

  it('should resolve wildcard for aggs with user-defined name', function() {
    var result = lookupSuggestions('aggs.my_custom_agg');
    // Should match aggs.*
    expect(result).toContain('terms');
    expect(result).toContain('avg');
  });

  it('should resolve wildcard for aggs.*.terms', function() {
    var result = lookupSuggestions('aggs.my_agg.terms');
    expect(result).toContain('field');
    expect(result).toContain('size');
  });

  it('should resolve wildcard for query.match.fieldname', function() {
    var result = lookupSuggestions('query.match.my_field');
    expect(result).toContain('query');
    expect(result).toContain('operator');
  });

  it('should resolve wildcard for query.term.fieldname', function() {
    var result = lookupSuggestions('query.term.status');
    expect(result).toContain('value');
    expect(result).toContain('boost');
  });

  it('should resolve wildcard for query.range.fieldname', function() {
    var result = lookupSuggestions('query.range.age');
    expect(result).toContain('gte');
    expect(result).toContain('lte');
  });

  it('should resolve wildcard for sort.fieldname', function() {
    var result = lookupSuggestions('sort.price');
    expect(result).toContain('order');
    expect(result).toContain('mode');
  });

  it('should resolve wildcard for aggs.*.date_histogram', function() {
    var result = lookupSuggestions('aggs.my_agg.date_histogram');
    expect(result).toContain('field');
    expect(result).toContain('calendar_interval');
  });

  it('should resolve wildcard for aggs.*.histogram', function() {
    var result = lookupSuggestions('aggs.my_agg.histogram');
    expect(result).toContain('field');
    expect(result).toContain('interval');
  });

  it('should resolve wildcard for aggs.*.range', function() {
    var result = lookupSuggestions('aggs.my_agg.range');
    expect(result).toContain('field');
    expect(result).toContain('ranges');
  });

  it('should resolve wildcard for aggs.*.composite', function() {
    var result = lookupSuggestions('aggs.my_agg.composite');
    expect(result).toContain('size');
    expect(result).toContain('sources');
  });

  it('should return empty for unknown path', function() {
    var result = lookupSuggestions('completely.unknown.path');
    expect(result).toEqual([]);
  });

  it('should return empty for deeply unknown nesting', function() {
    var result = lookupSuggestions('query.bool.must.match.title.extra');
    expect(result).toEqual([]);
  });
});

describe('getMetaLabel', function() {

  it('should return "property" for root', function() {
    expect(getMetaLabel('')).toBe('property');
  });

  it('should return "query" for query context', function() {
    expect(getMetaLabel('query')).toBe('query');
  });

  it('should return "clause" for query.bool context', function() {
    expect(getMetaLabel('query.bool')).toBe('clause');
  });

  it('should return "aggregation" for aggs path', function() {
    expect(getMetaLabel('aggs')).toBe('aggregation');
  });

  it('should return "aggregation" for aggs.myagg path', function() {
    expect(getMetaLabel('aggs.my_agg')).toBe('aggregation');
  });

  it('should return "parameter" for aggs.*.terms path', function() {
    expect(getMetaLabel('aggs.my_agg.terms')).toBe('parameter');
  });

  it('should return "parameter" for highlight', function() {
    expect(getMetaLabel('highlight')).toBe('parameter');
  });

  it('should return "parameter" for _source', function() {
    expect(getMetaLabel('_source')).toBe('parameter');
  });

  it('should return "parameter" for query.match.field', function() {
    expect(getMetaLabel('query.match.title')).toBe('parameter');
  });
});

describe('normalizeAggsAlias', function() {

  it('should replace aggregations with aggs', function() {
    expect(normalizeAggsAlias('aggregations')).toBe('aggs');
  });

  it('should replace nested aggregations', function() {
    expect(normalizeAggsAlias('aggregations.my_agg')).toBe('aggs.my_agg');
  });

  it('should replace deeply nested aggregations', function() {
    expect(normalizeAggsAlias('aggregations.x.aggregations.y'))
      .toBe('aggs.x.aggs.y');
  });

  it('should not modify paths without aggregations', function() {
    expect(normalizeAggsAlias('query.bool')).toBe('query.bool');
  });

  it('should not modify aggs (already normalized)', function() {
    expect(normalizeAggsAlias('aggs.my_agg')).toBe('aggs.my_agg');
  });

  it('should handle empty string', function() {
    expect(normalizeAggsAlias('')).toBe('');
  });
});

describe('extractIndicesFromPath', function() {

  it('should extract single index from index/_search path', function() {
    expect(extractIndicesFromPath('my_index/_search'))
      .toEqual(['my_index']);
  });

  it('should extract index from path with leading slash', function() {
    expect(extractIndicesFromPath('/my_index/_search'))
      .toEqual(['my_index']);
  });

  it('should return empty for cluster-wide _search', function() {
    expect(extractIndicesFromPath('_search')).toEqual([]);
  });

  it('should return empty for empty path', function() {
    expect(extractIndicesFromPath('')).toEqual([]);
  });

  it('should return empty for null path', function() {
    expect(extractIndicesFromPath(null)).toEqual([]);
  });

  it('should return empty for undefined path', function() {
    expect(extractIndicesFromPath(undefined)).toEqual([]);
  });

  it('should extract index from index/type/_search path', function() {
    expect(extractIndicesFromPath('my_index/my_type/_search'))
      .toEqual(['my_index']);
  });

  it('should return empty for _cat/indices', function() {
    expect(extractIndicesFromPath('_cat/indices')).toEqual([]);
  });

  it('should extract comma-separated indices', function() {
    expect(extractIndicesFromPath('index_a,index_b/_search'))
      .toEqual(['index_a', 'index_b']);
  });

  it('should extract three comma-separated indices', function() {
    expect(extractIndicesFromPath('a,b,c/_search'))
      .toEqual(['a', 'b', 'c']);
  });
});

describe('matchIndexPattern', function() {

  it('should match exact name', function() {
    expect(matchIndexPattern('logs', 'logs')).toBe(true);
  });

  it('should not match different name', function() {
    expect(matchIndexPattern('logs', 'metrics')).toBe(false);
  });

  it('should match wildcard *', function() {
    expect(matchIndexPattern('*', 'anything')).toBe(true);
  });

  it('should match prefix wildcard logs-*', function() {
    expect(matchIndexPattern('logs-*', 'logs-2026')).toBe(true);
  });

  it('should not match non-matching prefix', function() {
    expect(matchIndexPattern('logs-*', 'metrics-2026')).toBe(false);
  });

  it('should match middle wildcard', function() {
    expect(matchIndexPattern('logs-*-prod', 'logs-2026-prod')).toBe(true);
  });

  it('should not match middle wildcard partial', function() {
    expect(matchIndexPattern('logs-*-prod', 'logs-2026-dev')).toBe(false);
  });
});

describe('resolveTargetIndices', function() {

  it('should resolve exact matches', function() {
    var result = resolveTargetIndices(['a', 'b'], ['a', 'b', 'c']);
    expect(result.sort()).toEqual(['a', 'b']);
  });

  it('should resolve wildcard patterns', function() {
    var result = resolveTargetIndices(
      ['logs-*'], ['logs-2025', 'logs-2026', 'metrics']
    );
    expect(result.sort()).toEqual(['logs-2025', 'logs-2026']);
  });

  it('should handle exclusion patterns', function() {
    var result = resolveTargetIndices(
      ['logs-*', '-logs-debug'], ['logs-2025', 'logs-2026', 'logs-debug']
    );
    expect(result.sort()).toEqual(['logs-2025', 'logs-2026']);
  });

  it('should return empty for no matches', function() {
    var result = resolveTargetIndices(['nonexistent'], ['a', 'b']);
    expect(result).toEqual([]);
  });

  it('should deduplicate matched indices', function() {
    var result = resolveTargetIndices(
      ['a', 'a*'], ['a', 'ab', 'c']
    );
    expect(result.sort()).toEqual(['a', 'ab']);
  });
});

describe('resolveFields', function() {

  function makeMappingData(indices) {
    var data = {};
    for (var idx in indices) {
      if (indices.hasOwnProperty(idx)) {
        var props = {};
        for (var f = 0; f < indices[idx].length; f++) {
          props[indices[idx][f]] = {type: 'text'};
        }
        data[idx] = {mappings: {properties: props}};
      }
    }
    return data;
  }

  it('should return all fields when no request path', function() {
    var data = makeMappingData({idx: ['title', 'body']});
    var provider = function() {
      return {mapping: new ClusterMapping(data), requestPath: ''};
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('title');
    expect(fields).toContain('body');
  });

  it('should scope fields to target index', function() {
    var data = makeMappingData({
      index_a: ['field_a1', 'field_a2'],
      index_b: ['field_b1', 'field_b2']
    });
    var provider = function() {
      return {
        mapping: new ClusterMapping(data),
        requestPath: 'index_a/_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('field_a1');
    expect(fields).toContain('field_a2');
    expect(fields).not.toContain('field_b1');
    expect(fields).not.toContain('field_b2');
  });

  it('should return all fields for cluster-wide path', function() {
    var data = makeMappingData({
      idx1: ['field1'],
      idx2: ['field2']
    });
    var provider = function() {
      return {
        mapping: new ClusterMapping(data),
        requestPath: '_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('field1');
    expect(fields).toContain('field2');
  });

  it('should return all fields when target index not in mapping', function() {
    var data = makeMappingData({idx: ['title']});
    var provider = function() {
      return {
        mapping: new ClusterMapping(data),
        requestPath: 'unknown_index/_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('title');
  });

  it('should support legacy provider (raw ClusterMapping)', function() {
    var data = makeMappingData({idx: ['title']});
    var provider = function() {
      return new ClusterMapping(data);
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('title');
  });

  it('should return empty for null provider', function() {
    expect(resolveFields(null)).toEqual([]);
  });

  it('should return empty for provider returning null', function() {
    expect(resolveFields(function() { return null; })).toEqual([]);
  });

  it('should cache results for same mapping+path (no extra getFields calls)',
    function() {
      var data = makeMappingData({idx: ['title']});
      var mapping = new ClusterMapping(data);
      var provider = function() {
        return {mapping: mapping, requestPath: 'idx/_search'};
      };
      var fields1 = resolveFields(provider);
      var fields2 = resolveFields(provider);
      expect(fields1).toBe(fields2); // Same array reference (cached)
    }
  );

  it('should scope to multiple comma-separated indices', function() {
    var data = makeMappingData({
      index_a: ['field_a'],
      index_b: ['field_b'],
      index_c: ['field_c']
    });
    var mapping = new ClusterMapping(data);
    var provider = function() {
      return {
        mapping: mapping,
        requestPath: 'index_a,index_b/_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('field_a');
    expect(fields).toContain('field_b');
    expect(fields).not.toContain('field_c');
  });

  it('should invalidate cache when mapping object changes', function() {
    var data1 = makeMappingData({idx: ['title']});
    var mapping1 = new ClusterMapping(data1);
    var provider1 = function() {
      return {mapping: mapping1, requestPath: 'idx/_search'};
    };
    resolveFields(provider1);

    var data2 = makeMappingData({idx: ['status']});
    var mapping2 = new ClusterMapping(data2);
    var provider2 = function() {
      return {mapping: mapping2, requestPath: 'idx/_search'};
    };
    var fields = resolveFields(provider2);
    expect(fields).toContain('status');
    expect(fields).not.toContain('title');
  });

  it('should invalidate cache when request path changes', function() {
    var data = makeMappingData({
      idx_a: ['field_a'],
      idx_b: ['field_b']
    });
    var mapping = new ClusterMapping(data);
    var providerA = function() {
      return {mapping: mapping, requestPath: 'idx_a/_search'};
    };
    var providerB = function() {
      return {mapping: mapping, requestPath: 'idx_b/_search'};
    };
    var fieldsA = resolveFields(providerA);
    expect(fieldsA).toContain('field_a');
    var fieldsB = resolveFields(providerB);
    expect(fieldsB).toContain('field_b');
    expect(fieldsB).not.toContain('field_a');
  });

  it('should deduplicate fields across multiple target indices', function() {
    var data = makeMappingData({
      idx1: ['title', 'body'],
      idx2: ['title', 'author']
    });
    var mapping = new ClusterMapping(data);
    var provider = function() {
      return {
        mapping: mapping,
        requestPath: 'idx1,idx2/_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toEqual(['author', 'body', 'title']);
  });

  it('should resolve wildcard index patterns', function() {
    var data = makeMappingData({
      'logs-2025': ['field_a'],
      'logs-2026': ['field_b'],
      'metrics-2026': ['field_c']
    });
    var mapping = new ClusterMapping(data);
    var provider = function() {
      return {mapping: mapping, requestPath: 'logs-*/_search'};
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('field_a');
    expect(fields).toContain('field_b');
    expect(fields).not.toContain('field_c');
  });

  it('should resolve mixed exact and wildcard patterns', function() {
    var data = makeMappingData({
      'logs-2026': ['log_field'],
      'metrics-2026': ['metric_field'],
      'other': ['other_field']
    });
    var mapping = new ClusterMapping(data);
    var provider = function() {
      return {
        mapping: mapping,
        requestPath: 'logs-2026,metrics-*/_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('log_field');
    expect(fields).toContain('metric_field');
    expect(fields).not.toContain('other_field');
  });

  it('should handle exclusion patterns', function() {
    var data = makeMappingData({
      'logs-2025': ['f1'],
      'logs-2026': ['f2'],
      'logs-debug': ['f3']
    });
    var mapping = new ClusterMapping(data);
    var provider = function() {
      return {
        mapping: mapping,
        requestPath: 'logs-*,-logs-debug/_search'
      };
    };
    var fields = resolveFields(provider);
    expect(fields).toContain('f1');
    expect(fields).toContain('f2');
    expect(fields).not.toContain('f3');
  });

  it('should not call getFields on cache hit', function() {
    var data = makeMappingData({idx: ['title']});
    var mapping = new ClusterMapping(data);
    var callCount = 0;
    var origGetFields = mapping.getFields;
    mapping.getFields = function(idx) {
      callCount++;
      return origGetFields.call(mapping, idx);
    };
    var provider = function() {
      return {mapping: mapping, requestPath: 'idx/_search'};
    };
    resolveFields(provider);
    var firstCalls = callCount;
    resolveFields(provider);
    expect(callCount).toBe(firstCalls); // No extra calls on cache hit
  });
});

describe('getSuggestionScore', function() {

  it('should return root priority for root context items', function() {
    expect(getSuggestionScore('query', '')).toBe(1000);
    expect(getSuggestionScore('aggs', '')).toBe(900);
    expect(getSuggestionScore('size', '')).toBe(880);
  });

  it('should return query priority for query context items', function() {
    expect(getSuggestionScore('match', 'query')).toBe(1000);
    expect(getSuggestionScore('bool', 'query')).toBe(980);
    expect(getSuggestionScore('term', 'query')).toBe(970);
  });

  it('should return agg priority for aggs context items', function() {
    expect(getSuggestionScore('terms', 'aggs.my_agg')).toBe(1000);
    expect(getSuggestionScore('date_histogram', 'aggs.my_agg')).toBe(990);
  });

  it('should return base score for non-prioritized items', function() {
    expect(getSuggestionScore('terminate_after', '')).toBe(500);
    expect(getSuggestionScore('span_term', 'query')).toBe(500);
  });

  it('should return base score for unknown context', function() {
    expect(getSuggestionScore('field', 'some.unknown.path')).toBe(500);
  });
});

// ===========================================================================
// createQueryDslCompleter
// ===========================================================================

describe('createQueryDslCompleter', function() {

  // Reset the field cache between tests to avoid cross-test interference.
  beforeEach(function() {
    _fieldCache.mapping = null;
    _fieldCache.requestPath = '';
    _fieldCache.fields = [];
  });

  function mockSession(text) {
    return {getValue: function() { return text; }};
  }

  function getCompletions(text, row, col, prefix, mappingProvider) {
    var completer = createQueryDslCompleter(mappingProvider || null);
    var results = null;
    completer.getCompletions(
      {},  // editor (unused)
      mockSession(text),
      {row: row, column: col},
      prefix,
      function(err, completions) { results = completions; }
    );
    return results;
  }

  function captions(results) {
    return results.map(function(r) { return r.caption; });
  }

  // --- completer object structure ---

  it('should have identifierRegexps property', function() {
    var completer = createQueryDslCompleter(null);
    expect(completer.identifierRegexps).toBeDefined();
    expect(completer.identifierRegexps.length).toBe(1);
  });

  it('should have getCompletions function', function() {
    var completer = createQueryDslCompleter(null);
    expect(typeof completer.getCompletions).toBe('function');
  });

  // --- Root level ---

  it('should suggest top-level keys at root', function() {
    var results = getCompletions('{\n  \n}', 1, 2, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('size');
    expect(c).toContain('from');
    expect(c).toContain('sort');
    expect(c).toContain('aggs');
    expect(c).toContain('aggregations');
    expect(c).toContain('_source');
    expect(c).toContain('highlight');
    expect(c).toContain('post_filter');
    expect(c).toContain('suggest');
    expect(c).toContain('track_total_hits');
    expect(c).toContain('timeout');
    expect(c).toContain('min_score');
  });

  it('should have correct completion entry structure', function() {
    var results = getCompletions('{\n  \n}', 1, 2, '');
    var queryItem = results.find(function(r) { return r.caption === 'query'; });
    expect(queryItem).toBeDefined();
    expect(queryItem.caption).toBe('query');
    expect(queryItem.value).toBe('query');
    expect(typeof queryItem.score).toBe('number');
    expect(typeof queryItem.meta).toBe('string');
  });

  // --- Query types ---

  it('should suggest query types inside query', function() {
    var text = '{\n  "query": {\n    \n  }\n}';
    var results = getCompletions(text, 2, 4, '');
    var c = captions(results);
    expect(c).toContain('match');
    expect(c).toContain('match_all');
    expect(c).toContain('match_phrase');
    expect(c).toContain('bool');
    expect(c).toContain('term');
    expect(c).toContain('terms');
    expect(c).toContain('range');
    expect(c).toContain('exists');
    expect(c).toContain('wildcard');
    expect(c).toContain('nested');
    expect(c).toContain('multi_match');
    expect(c).toContain('function_score');
    expect(c).toContain('boosting');
    expect(c).toContain('constant_score');
    expect(c).toContain('dis_max');
  });

  it('should have meta "query" for query context', function() {
    var text = '{\n  "query": {\n    \n  }\n}';
    var results = getCompletions(text, 2, 4, '');
    var matchItem = results.find(function(r) { return r.caption === 'match'; });
    expect(matchItem.meta).toBe('query');
  });

  // --- Bool clauses ---

  it('should suggest bool clauses inside bool', function() {
    var text = '{\n  "query": {\n    "bool": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('must');
    expect(c).toContain('must_not');
    expect(c).toContain('should');
    expect(c).toContain('filter');
    expect(c).toContain('minimum_should_match');
    expect(c).toContain('boost');
  });

  it('should have meta "clause" for bool context', function() {
    var text = '{\n  "query": {\n    "bool": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var mustItem = results.find(function(r) { return r.caption === 'must'; });
    expect(mustItem.meta).toBe('clause');
  });

  // --- Bool array contexts ---

  it('should suggest query types inside bool.must array', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "must": [\n        ' +
      '\n      ]\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('match');
    expect(c).toContain('term');
    expect(c).toContain('bool');
    expect(c).toContain('range');
  });

  it('should suggest query types inside bool.should array', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "should": [\n        ' +
      '\n      ]\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('match');
    expect(c).toContain('term');
  });

  it('should suggest query types inside bool.filter array', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "filter": [\n        ' +
      '\n      ]\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('term');
    expect(c).toContain('range');
    expect(c).toContain('exists');
  });

  it('should suggest query types inside bool.must_not array', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "must_not": [\n        ' +
      '\n      ]\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('match');
    expect(c).toContain('term');
  });

  it('should have meta "query" for bool array context', function() {
    var text =
      '{\n  "query": {\n    "bool": {\n      "must": [\n        ' +
      '\n      ]\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var item = results.find(function(r) { return r.caption === 'match'; });
    expect(item.meta).toBe('query');
  });

  // --- Query type parameters ---

  it('should suggest match parameters inside match field', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      "title": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('operator');
    expect(c).toContain('analyzer');
    expect(c).toContain('fuzziness');
    expect(c).toContain('boost');
    expect(c).toContain('lenient');
  });

  it('should suggest match_phrase parameters', function() {
    var text =
      '{\n  "query": {\n    "match_phrase": {\n      "title": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('analyzer');
    expect(c).toContain('slop');
  });

  it('should suggest range parameters inside range field', function() {
    var text =
      '{\n  "query": {\n    "range": {\n      "age": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('gte');
    expect(c).toContain('gt');
    expect(c).toContain('lte');
    expect(c).toContain('lt');
    expect(c).toContain('format');
    expect(c).toContain('time_zone');
    expect(c).toContain('boost');
    expect(c).toContain('relation');
  });

  it('should suggest term parameters inside term field', function() {
    var text =
      '{\n  "query": {\n    "term": {\n      "status": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('value');
    expect(c).toContain('boost');
  });

  it('should suggest fuzzy parameters inside fuzzy field', function() {
    var text =
      '{\n  "query": {\n    "fuzzy": {\n      "title": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('value');
    expect(c).toContain('fuzziness');
    expect(c).toContain('transpositions');
  });

  it('should suggest wildcard parameters inside wildcard field', function() {
    var text =
      '{\n  "query": {\n    "wildcard": {\n      "title": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('value');
    expect(c).toContain('boost');
    expect(c).toContain('case_insensitive');
  });

  it('should suggest multi_match parameters', function() {
    var text =
      '{\n  "query": {\n    "multi_match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('fields');
    expect(c).toContain('type');
    expect(c).toContain('tie_breaker');
  });

  it('should suggest query_string parameters', function() {
    var text =
      '{\n  "query": {\n    "query_string": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('default_field');
    expect(c).toContain('fields');
    expect(c).toContain('default_operator');
  });

  it('should suggest simple_query_string parameters', function() {
    var text =
      '{\n  "query": {\n    "simple_query_string": {\n      ' +
      '\n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('fields');
    expect(c).toContain('flags');
  });

  it('should suggest function_score parameters', function() {
    var text =
      '{\n  "query": {\n    "function_score": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).toContain('functions');
    expect(c).toContain('score_mode');
    expect(c).toContain('boost_mode');
  });

  it('should suggest nested query parameters', function() {
    var text =
      '{\n  "query": {\n    "nested": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('path');
    expect(c).toContain('query');
    expect(c).toContain('score_mode');
    expect(c).toContain('inner_hits');
  });

  it('should suggest boosting parameters', function() {
    var text =
      '{\n  "query": {\n    "boosting": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('positive');
    expect(c).toContain('negative');
    expect(c).toContain('negative_boost');
  });

  it('should suggest constant_score parameters', function() {
    var text =
      '{\n  "query": {\n    "constant_score": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('filter');
    expect(c).toContain('boost');
  });

  it('should suggest dis_max parameters', function() {
    var text =
      '{\n  "query": {\n    "dis_max": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('queries');
    expect(c).toContain('tie_breaker');
  });

  it('should suggest exists parameters', function() {
    var text =
      '{\n  "query": {\n    "exists": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('field');
  });

  it('should suggest ids parameters', function() {
    var text =
      '{\n  "query": {\n    "ids": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('values');
  });

  // --- Aggregation types ---

  it('should suggest aggregation types for named agg', function() {
    var text =
      '{\n  "aggs": {\n    "my_agg": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var c = captions(results);
    expect(c).toContain('terms');
    expect(c).toContain('avg');
    expect(c).toContain('sum');
    expect(c).toContain('min');
    expect(c).toContain('max');
    expect(c).toContain('cardinality');
    expect(c).toContain('date_histogram');
    expect(c).toContain('histogram');
    expect(c).toContain('range');
    expect(c).toContain('filter');
    expect(c).toContain('top_hits');
    expect(c).toContain('composite');
    expect(c).toContain('aggs');
    expect(c).toContain('aggregations');
  });

  it('should have meta "aggregation" for agg types', function() {
    var text =
      '{\n  "aggs": {\n    "my_agg": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    var termsItem = results.find(function(r) { return r.caption === 'terms'; });
    expect(termsItem.meta).toBe('aggregation');
  });

  // --- Aggregation parameters ---

  it('should suggest terms agg parameters', function() {
    var text =
      '{\n  "aggs": {\n    "by_status": {\n      "terms": {\n        ' +
      '\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('field');
    expect(c).toContain('size');
    expect(c).toContain('order');
    expect(c).toContain('min_doc_count');
    expect(c).toContain('missing');
  });

  it('should suggest date_histogram agg parameters', function() {
    var text =
      '{\n  "aggs": {\n    "by_date": {\n      "date_histogram": {\n' +
      '        \n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('field');
    expect(c).toContain('calendar_interval');
    expect(c).toContain('fixed_interval');
    expect(c).toContain('format');
    expect(c).toContain('time_zone');
  });

  it('should suggest histogram agg parameters', function() {
    var text =
      '{\n  "aggs": {\n    "by_price": {\n      "histogram": {\n' +
      '        \n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('field');
    expect(c).toContain('interval');
    expect(c).toContain('min_doc_count');
  });

  it('should suggest top_hits agg parameters', function() {
    var text =
      '{\n  "aggs": {\n    "top": {\n      "top_hits": {\n' +
      '        \n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('size');
    expect(c).toContain('sort');
    expect(c).toContain('_source');
  });

  it('should have meta "parameter" for agg params', function() {
    var text =
      '{\n  "aggs": {\n    "x": {\n      "terms": {\n' +
      '        \n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var fieldItem = results.find(function(r) { return r.caption === 'field'; });
    expect(fieldItem.meta).toBe('parameter');
  });

  // --- Nested aggs ---

  it('should suggest agg types for nested aggs', function() {
    var text =
      '{\n  "aggs": {\n    "outer": {\n      "terms": {\n' +
      '        "field": "status"\n      },\n' +
      '      "aggs": {\n        "inner": {\n          \n' +
      '        }\n      }\n    }\n  }\n}';
    var results = getCompletions(text, 8, 10, '');
    var c = captions(results);
    expect(c).toContain('terms');
    expect(c).toContain('avg');
    expect(c).toContain('sum');
  });

  // --- Highlight ---

  it('should suggest highlight parameters', function() {
    var text = '{\n  "highlight": {\n    \n  }\n}';
    var results = getCompletions(text, 2, 4, '');
    var c = captions(results);
    expect(c).toContain('fields');
    expect(c).toContain('pre_tags');
    expect(c).toContain('post_tags');
    expect(c).toContain('type');
    expect(c).toContain('fragment_size');
    expect(c).toContain('number_of_fragments');
  });

  // --- _source ---

  it('should suggest _source sub-properties', function() {
    var text = '{\n  "_source": {\n    \n  }\n}';
    var results = getCompletions(text, 2, 4, '');
    var c = captions(results);
    expect(c).toContain('includes');
    expect(c).toContain('excludes');
  });

  // --- Sort ---

  it('should suggest sort field parameters', function() {
    var text =
      '{\n  "sort": [\n    {\n      "price": {\n        ' +
      '\n      }\n    }\n  ]\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('order');
    expect(c).toContain('mode');
    expect(c).toContain('missing');
    expect(c).toContain('unmapped_type');
  });

  // --- Prefix filtering ---

  it('should filter suggestions by prefix', function() {
    var results = getCompletions('{\n  \n}', 1, 2, 'qu');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).not.toContain('size');
    expect(c).not.toContain('aggs');
  });

  it('should filter with longer prefix', function() {
    var text = '{\n  "query": {\n    \n  }\n}';
    var results = getCompletions(text, 2, 4, 'match_');
    var c = captions(results);
    expect(c).toContain('match_all');
    expect(c).toContain('match_phrase');
    expect(c).toContain('match_phrase_prefix');
    expect(c).toContain('match_bool_prefix');
    expect(c).not.toContain('match');
    expect(c).not.toContain('bool');
  });

  it('should strip leading quote from prefix', function() {
    var results = getCompletions('{\n  \n}', 1, 2, '"qu');
    var c = captions(results);
    expect(c).toContain('query');
    expect(c).not.toContain('size');
  });

  it('should return all suggestions with empty prefix', function() {
    var text = '{\n  "query": {\n    "bool": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    expect(results.length).toBe(6); // must, must_not, should, filter,
                                    // minimum_should_match, boost
  });

  // --- Value position ---

  it('should return empty for value positions', function() {
    var text = '{\n  "size": ';
    var results = getCompletions(text, 1, 10, '');
    expect(results).toEqual([]);
  });

  it('should return empty for value after nested key', function() {
    var text = '{\n  "query": {\n    "match": {\n      "title": ';
    var results = getCompletions(text, 3, 16, '');
    expect(results).toEqual([]);
  });

  // --- Field name suggestions ---

  it('should suggest field names when mapping is available', function() {
    var mappingData = {
      'my_index': {
        mappings: {
          properties: {
            title: {type: 'text'},
            content: {type: 'text'},
            status: {type: 'keyword'}
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var c = captions(results);
    expect(c).toContain('title');
    expect(c).toContain('content');
    expect(c).toContain('status');
  });

  it('should have meta "field" for field name suggestions', function() {
    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            title: {type: 'text'}
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var titleItem = results.find(function(r) { return r.caption === 'title'; });
    expect(titleItem.meta).toBe('field');
  });

  it('should filter field names by prefix', function() {
    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            title: {type: 'text'},
            tags: {type: 'keyword'},
            body: {type: 'text'}
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, 't', provider);
    var c = captions(results);
    expect(c).toContain('title');
    expect(c).toContain('tags');
    expect(c).not.toContain('body');
  });

  it('should suggest field names in term context', function() {
    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            status: {type: 'keyword'}
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "query": {\n    "term": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var c = captions(results);
    expect(c).toContain('status');
  });

  it('should suggest field names in range context', function() {
    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            age: {type: 'integer'},
            timestamp: {type: 'date'}
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "query": {\n    "range": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var c = captions(results);
    expect(c).toContain('age');
    expect(c).toContain('timestamp');
  });

  it('should suggest field names in highlight.fields context', function() {
    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            title: {type: 'text'},
            body: {type: 'text'}
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "highlight": {\n    "fields": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var c = captions(results);
    expect(c).toContain('title');
    expect(c).toContain('body');
  });

  it('should suggest nested field names', function() {
    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            user: {
              type: 'object',
              properties: {
                name: {type: 'text'}
              }
            }
          }
        }
      }
    };
    var provider = function() { return new ClusterMapping(mappingData); };
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var c = captions(results);
    expect(c).toContain('user');
    expect(c).toContain('user.name');
  });

  // --- Mapping provider edge cases ---

  it('should handle null mapping provider gracefully', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', null);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle undefined mapping provider', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', undefined);
    expect(results).toBeDefined();
  });

  it('should handle mapping provider returning null', function() {
    var provider = function() { return null; };
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    expect(results).toBeDefined();
  });

  it('should handle mapping provider returning object without getAllFields',
    function() {
      var provider = function() { return {getIndices: function() {return [];}}; };
      var text =
        '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '', provider);
      expect(results).toBeDefined();
    }
  );

  // --- Score priorities ---

  it('should have higher score for query than terminate_after', function() {
    var results = getCompletions('{\n  \n}', 1, 2, '');
    var queryItem = results.find(function(r) { return r.caption === 'query'; });
    var terminateItem = results.find(function(r) {
      return r.caption === 'terminate_after';
    });
    expect(queryItem.score).toBeGreaterThan(terminateItem.score);
  });

  it('should have higher score for match than span_term in query context',
    function() {
      var text = '{\n  "query": {\n    \n  }\n}';
      var results = getCompletions(text, 2, 4, '');
      var matchItem = results.find(function(r) {
        return r.caption === 'match';
      });
      var spanItem = results.find(function(r) {
        return r.caption === 'span_term';
      });
      expect(matchItem.score).toBeGreaterThan(spanItem.score);
    }
  );

  it('should have higher score for terms than scripted_metric in agg context',
    function() {
      var text =
        '{\n  "aggs": {\n    "x": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var termsItem = results.find(function(r) {
        return r.caption === 'terms';
      });
      var scriptedItem = results.find(function(r) {
        return r.caption === 'scripted_metric';
      });
      expect(termsItem.score).toBeGreaterThan(scriptedItem.score);
    }
  );

  // --- Meta labels ---

  it('should have "property" meta for root context', function() {
    var results = getCompletions('{\n  \n}', 1, 2, '');
    var sizeItem = results.find(function(r) { return r.caption === 'size'; });
    expect(sizeItem.meta).toBe('property');
  });

  // --- Empty / edge cases ---

  it('should return empty for unknown context', function() {
    var text =
      '{\n  "unknown_key": {\n    "another": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '');
    expect(results).toEqual([]);
  });

  it('should handle empty document', function() {
    var results = getCompletions('', 0, 0, '');
    expect(results).toBeDefined();
  });

  it('should handle single brace document', function() {
    var results = getCompletions('{', 0, 1, '');
    var c = captions(results);
    expect(c).toContain('query');
  });

  // --- aggregations alias ---

  it('should suggest agg types when using "aggregations" spelling',
    function() {
      var text =
        '{\n  "aggregations": {\n    "my_agg": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('terms');
      expect(c).toContain('avg');
      expect(c).toContain('date_histogram');
    }
  );

  it('should suggest terms params under aggregations spelling', function() {
    var text =
      '{\n  "aggregations": {\n    "x": {\n      "terms": {\n' +
      '        \n      }\n    }\n  }\n}';
    var results = getCompletions(text, 4, 8, '');
    var c = captions(results);
    expect(c).toContain('field');
    expect(c).toContain('size');
  });

  it('should suggest nested agg types under aggregations spelling',
    function() {
      var text =
        '{\n  "aggregations": {\n    "outer": {\n' +
        '      "terms": {"field": "x"},\n' +
        '      "aggregations": {\n        "inner": {\n          \n' +
        '        }\n      }\n    }\n  }\n}';
      var results = getCompletions(text, 6, 10, '');
      var c = captions(results);
      expect(c).toContain('terms');
      expect(c).toContain('avg');
    }
  );

  // --- Request-scoped field suggestions ---

  it('should scope field names to target index from request path',
    function() {
      var mappingData = {
        'index_a': {
          mappings: {
            properties: {
              field_a: {type: 'text'}
            }
          }
        },
        'index_b': {
          mappings: {
            properties: {
              field_b: {type: 'keyword'}
            }
          }
        }
      };
      var provider = function() {
        return {
          mapping: new ClusterMapping(mappingData),
          requestPath: 'index_a/_search'
        };
      };
      var text =
        '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '', provider);
      var c = captions(results);
      expect(c).toContain('field_a');
      expect(c).not.toContain('field_b');
    }
  );

  it('should return all fields for cluster-wide request path', function() {
    var mappingData = {
      'idx1': {
        mappings: {properties: {f1: {type: 'text'}}}
      },
      'idx2': {
        mappings: {properties: {f2: {type: 'text'}}}
      }
    };
    var provider = function() {
      return {
        mapping: new ClusterMapping(mappingData),
        requestPath: '_search'
      };
    };
    var text =
      '{\n  "query": {\n    "match": {\n      \n    }\n  }\n}';
    var results = getCompletions(text, 3, 6, '', provider);
    var c = captions(results);
    expect(c).toContain('f1');
    expect(c).toContain('f2');
  });

  // =========================================================================
  // Value position field completions (integration)
  // =========================================================================

  describe('value position field completions', function() {

    var mappingData = {
      'idx': {
        mappings: {
          properties: {
            status: {type: 'keyword'},
            title: {type: 'text'},
            timestamp: {type: 'date'}
          }
        }
      }
    };

    var provider = function() { return new ClusterMapping(mappingData); };

    it('should suggest field names at value position inside aggs.*.terms',
      function() {
        var text =
          '{\n  "aggs": {\n    "x": {\n      "terms": {\n' +
          '        "field": \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 17, '', provider);
        var c = captions(results);
        expect(c).toContain('status');
        expect(c).toContain('title');
        expect(c).toContain('timestamp');
      }
    );

    it('should suggest field names at value position inside query.exists',
      function() {
        var text =
          '{\n  "query": {\n    "exists": {\n      "field": \n    }\n  }\n}';
        var results = getCompletions(text, 3, 15, '', provider);
        var c = captions(results);
        expect(c).toContain('status');
        expect(c).toContain('title');
        expect(c).toContain('timestamp');
      }
    );

    it('should return empty at value position for "size" at root (regression)',
      function() {
        var text = '{\n  "size": ';
        var results = getCompletions(text, 1, 10, '', provider);
        expect(results).toEqual([]);
      }
    );

    it('should return empty at value position for field inside query.match',
      function() {
        var text =
          '{\n  "query": {\n    "match": {\n      "title": ';
        var results = getCompletions(text, 3, 16, '', provider);
        expect(results).toEqual([]);
      }
    );

    it('should return empty for value field context without mapping',
      function() {
        var text =
          '{\n  "aggs": {\n    "x": {\n      "terms": {\n' +
          '        "field": \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 17, '');
        expect(results).toEqual([]);
      }
    );

    it('should filter value field completions by prefix', function() {
      var text =
        '{\n  "aggs": {\n    "x": {\n      "terms": {\n' +
        '        "field": \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 17, 'st', provider);
      var c = captions(results);
      expect(c).toContain('status');
      expect(c).not.toContain('title');
      expect(c).not.toContain('timestamp');
    });

    it('should suggest field names for date_histogram field value',
      function() {
        var text =
          '{\n  "aggs": {\n    "x": {\n      "date_histogram": {\n' +
          '        "field": \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 17, '', provider);
        var c = captions(results);
        expect(c).toContain('status');
        expect(c).toContain('timestamp');
      }
    );

    it('should suggest field names using "aggregations" spelling',
      function() {
        var text =
          '{\n  "aggregations": {\n    "x": {\n      "terms": {\n' +
          '        "field": \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 17, '', provider);
        var c = captions(results);
        expect(c).toContain('status');
        expect(c).toContain('title');
      }
    );
  });

  // =========================================================================
  // Value position enum completions (integration)
  // =========================================================================

  describe('value position enum completions', function() {

    it('should suggest enum values for operator inside query.match.title',
      function() {
        var text =
          '{\n  "query": {\n    "match": {\n      "title": {\n' +
          '        "operator": \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 20, '');
        var c = captions(results);
        expect(c).toContain('and');
        expect(c).toContain('or');
        expect(c.length).toBe(2);
      }
    );

    it('should suggest enum values for order inside sort.price', function() {
      var text =
        '{\n  "sort": [\n    {\n      "price": {\n' +
        '        "order": \n      }\n    }\n  ]\n}';
      var results = getCompletions(text, 4, 17, '');
      var c = captions(results);
      expect(c).toContain('asc');
      expect(c).toContain('desc');
    });

    it('should have meta "value" for enum completions', function() {
      var text =
        '{\n  "query": {\n    "match": {\n      "title": {\n' +
        '        "operator": \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 20, '');
      var item = results.find(function(r) { return r.caption === 'and'; });
      expect(item).toBeDefined();
      expect(item.meta).toBe('value');
    });

    it('should filter enum values by prefix', function() {
      var text =
        '{\n  "query": {\n    "multi_match": {\n' +
        '      "type": \n    }\n  }\n}';
      var results = getCompletions(text, 3, 14, 'ph');
      var c = captions(results);
      expect(c).toContain('phrase');
      expect(c).toContain('phrase_prefix');
      expect(c).not.toContain('best_fields');
      expect(c).not.toContain('cross_fields');
    });

    it('should suggest function_score score_mode values', function() {
      var text =
        '{\n  "query": {\n    "function_score": {\n' +
        '      "score_mode": \n    }\n  }\n}';
      var results = getCompletions(text, 3, 20, '');
      var c = captions(results);
      expect(c).toContain('multiply');
      expect(c).toContain('sum');
      expect(c).toContain('avg');
      expect(c).toContain('first');
      expect(c).toContain('max');
      expect(c).toContain('min');
    });

    it('should suggest range relation values', function() {
      var text =
        '{\n  "query": {\n    "range": {\n      "age": {\n' +
        '        "relation": \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 20, '');
      var c = captions(results);
      expect(c).toContain('INTERSECTS');
      expect(c).toContain('CONTAINS');
      expect(c).toContain('WITHIN');
    });
  });

  // =========================================================================
  // post_filter completions (integration)
  // =========================================================================

  describe('post_filter completions', function() {

    it('should suggest query types inside post_filter', function() {
      var text = '{\n  "post_filter": {\n    \n  }\n}';
      var results = getCompletions(text, 2, 4, '');
      var c = captions(results);
      expect(c).toContain('match');
      expect(c).toContain('bool');
      expect(c).toContain('term');
      expect(c).toContain('range');
      expect(c).toContain('exists');
    });

    it('should suggest field names inside post_filter.match with mapping',
      function() {
        var mappingData = {
          'idx': {
            mappings: {
              properties: {
                status: {type: 'keyword'},
                title: {type: 'text'}
              }
            }
          }
        };
        var provider = function() {
          return new ClusterMapping(mappingData);
        };
        var text =
          '{\n  "post_filter": {\n    "match": {\n      \n    }\n  }\n}';
        var results = getCompletions(text, 3, 6, '', provider);
        var c = captions(results);
        expect(c).toContain('status');
        expect(c).toContain('title');
      }
    );

    it('should suggest bool clauses inside post_filter.bool', function() {
      var text =
        '{\n  "post_filter": {\n    "bool": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('must');
      expect(c).toContain('should');
      expect(c).toContain('filter');
      expect(c).toContain('must_not');
    });

    it('should suggest enum values inside post_filter via alias', function() {
      var text =
        '{\n  "post_filter": {\n    "match": {\n' +
        '      "title": {\n        "operator": \n' +
        '      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 20, '');
      var c = captions(results);
      expect(c).toContain('and');
      expect(c).toContain('or');
    });

    it('should suggest query types in post_filter.bool.must array context',
      function() {
        var text =
          '{\n  "post_filter": {\n    "bool": {\n' +
          '      "must": [\n        \n      ]\n    }\n  }\n}';
        var results = getCompletions(text, 4, 8, '');
        var c = captions(results);
        expect(c).toContain('match');
        expect(c).toContain('term');
        expect(c).toContain('range');
      }
    );
  });

  // =========================================================================
  // Sort array field completions (integration)
  // =========================================================================

  describe('sort array field completions', function() {

    it('should suggest field names plus _score and _doc inside sort array',
      function() {
        var mappingData = {
          'idx': {
            mappings: {
              properties: {
                price: {type: 'float'},
                name: {type: 'text'}
              }
            }
          }
        };
        var provider = function() {
          return new ClusterMapping(mappingData);
        };
        var text = '{\n  "sort": [\n    {\n      \n    }\n  ]\n}';
        // cursor inside the object within the sort array — but the parser
        // puts isInArray=false because the immediate parent is an object.
        // So the sort-array branch requires isInArray=true at path 'sort'.
        // We need the cursor to be directly inside the array (not inside
        // a nested object) for the sort-array branch.
        var textDirect = '{\n  "sort": [\n    \n  ]\n}';
        var results = getCompletions(textDirect, 2, 4, '', provider);
        var c = captions(results);
        expect(c).toContain('_score');
        expect(c).toContain('_doc');
        expect(c).toContain('price');
        expect(c).toContain('name');
      }
    );

    it('should give _score higher score than regular fields in sort array',
      function() {
        var mappingData = {
          'idx': {
            mappings: {
              properties: {
                price: {type: 'float'}
              }
            }
          }
        };
        var provider = function() {
          return new ClusterMapping(mappingData);
        };
        var textDirect = '{\n  "sort": [\n    \n  ]\n}';
        var results = getCompletions(textDirect, 2, 4, '', provider);
        var scoreItem = results.find(function(r) {
          return r.caption === '_score';
        });
        var priceItem = results.find(function(r) {
          return r.caption === 'price';
        });
        expect(scoreItem).toBeDefined();
        expect(priceItem).toBeDefined();
        expect(scoreItem.score).toBeGreaterThan(priceItem.score);
      }
    );

    it('should filter sort array fields by prefix', function() {
      var mappingData = {
        'idx': {
          mappings: {
            properties: {
              price: {type: 'float'},
              name: {type: 'text'}
            }
          }
        }
      };
      var provider = function() {
        return new ClusterMapping(mappingData);
      };
      var textDirect = '{\n  "sort": [\n    \n  ]\n}';
      var results = getCompletions(textDirect, 2, 4, '_', provider);
      var c = captions(results);
      expect(c).toContain('_score');
      expect(c).toContain('_doc');
      expect(c).not.toContain('price');
      expect(c).not.toContain('name');
    });

    it('should fall back to DSL sort params without mapping', function() {
      var text = '{\n  "sort": [\n    {\n      \n    }\n  ]\n}';
      var results = getCompletions(text, 3, 6, '');
      // Without mapping, sort array should still show something
      // (falls through to standard DSL lookup — sort.* keys)
      expect(results).toBeDefined();
    });
  });

  // =========================================================================
  // New DSL definitions (integration)
  // =========================================================================

  describe('new DSL definitions', function() {

    it('should suggest collapse parameters', function() {
      var text = '{\n  "collapse": {\n    \n  }\n}';
      var results = getCompletions(text, 2, 4, '');
      var c = captions(results);
      expect(c).toContain('field');
      expect(c).toContain('inner_hits');
      expect(c).toContain('max_concurrent_group_searches');
    });

    it('should suggest suggest types for named suggest', function() {
      var text =
        '{\n  "suggest": {\n    "my_suggest": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('text');
      expect(c).toContain('term');
      expect(c).toContain('phrase');
      expect(c).toContain('completion');
    });

    it('should suggest span_near parameters', function() {
      var text =
        '{\n  "query": {\n    "span_near": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('clauses');
      expect(c).toContain('slop');
      expect(c).toContain('in_order');
    });

    it('should suggest match_phrase_prefix parameters inside field',
      function() {
        var text =
          '{\n  "query": {\n    "match_phrase_prefix": {\n' +
          '      "title": {\n        \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 8, '');
        var c = captions(results);
        expect(c).toContain('query');
        expect(c).toContain('analyzer');
        expect(c).toContain('slop');
        expect(c).toContain('max_expansions');
      }
    );

    it('should suggest match_bool_prefix parameters inside field',
      function() {
        var text =
          '{\n  "query": {\n    "match_bool_prefix": {\n' +
          '      "title": {\n        \n      }\n    }\n  }\n}';
        var results = getCompletions(text, 4, 8, '');
        var c = captions(results);
        expect(c).toContain('query');
        expect(c).toContain('operator');
        expect(c).toContain('fuzziness');
        expect(c).toContain('max_expansions');
      }
    );

    it('should suggest span_term parameters inside field', function() {
      var text =
        '{\n  "query": {\n    "span_term": {\n' +
        '      "title": {\n        \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 8, '');
      var c = captions(results);
      expect(c).toContain('value');
      expect(c).toContain('boost');
    });

    it('should suggest span_or parameters', function() {
      var text =
        '{\n  "query": {\n    "span_or": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('clauses');
    });

    it('should suggest span_first parameters', function() {
      var text =
        '{\n  "query": {\n    "span_first": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('match');
      expect(c).toContain('end');
    });

    it('should suggest span_not parameters', function() {
      var text =
        '{\n  "query": {\n    "span_not": {\n      \n    }\n  }\n}';
      var results = getCompletions(text, 3, 6, '');
      var c = captions(results);
      expect(c).toContain('include');
      expect(c).toContain('exclude');
      expect(c).toContain('pre');
      expect(c).toContain('post');
      expect(c).toContain('dist');
    });

    it('should suggest suggest.*.term parameters', function() {
      var text =
        '{\n  "suggest": {\n    "my_suggest": {\n' +
        '      "term": {\n        \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 8, '');
      var c = captions(results);
      expect(c).toContain('field');
      expect(c).toContain('size');
      expect(c).toContain('suggest_mode');
      expect(c).toContain('analyzer');
    });

    it('should suggest suggest.*.phrase parameters', function() {
      var text =
        '{\n  "suggest": {\n    "my_suggest": {\n' +
        '      "phrase": {\n        \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 8, '');
      var c = captions(results);
      expect(c).toContain('field');
      expect(c).toContain('size');
      expect(c).toContain('gram_size');
      expect(c).toContain('confidence');
    });

    it('should suggest suggest.*.completion parameters', function() {
      var text =
        '{\n  "suggest": {\n    "my_suggest": {\n' +
        '      "completion": {\n        \n      }\n    }\n  }\n}';
      var results = getCompletions(text, 4, 8, '');
      var c = captions(results);
      expect(c).toContain('field');
      expect(c).toContain('size');
      expect(c).toContain('skip_duplicates');
      expect(c).toContain('fuzzy');
    });
  });
});

// ===========================================================================
// QueryDslContextParser.lastKey
// ===========================================================================

describe('QueryDslContextParser.lastKey', function() {

  it('should set lastKey to key name when cursor is at value position',
    function() {
      var text = '{\n  "size": ';
      var ctx = new QueryDslContextParser(text, 1, 10);
      expect(ctx.isKey).toBe(false);
      expect(ctx.lastKey).toBe('size');
    }
  );

  it('should set lastKey to empty string when cursor is at key position',
    function() {
      var text = '{\n  \n}';
      var ctx = new QueryDslContextParser(text, 1, 2);
      expect(ctx.isKey).toBe(true);
      expect(ctx.lastKey).toBe('');
    }
  );

  it('should set lastKey for nested value position', function() {
    var text =
      '{\n  "query": {\n    "match": {\n      "title": {\n' +
      '        "operator": ';
    var ctx = new QueryDslContextParser(text, 4, 20);
    expect(ctx.isKey).toBe(false);
    expect(ctx.lastKey).toBe('operator');
  });

  it('should set lastKey to empty after comma (key position)', function() {
    var text = '{\n  "size": 10,\n  ';
    var ctx = new QueryDslContextParser(text, 2, 2);
    expect(ctx.isKey).toBe(true);
    expect(ctx.lastKey).toBe('');
  });

  it('should set lastKey for field value in aggs terms', function() {
    var text =
      '{\n  "aggs": {\n    "x": {\n      "terms": {\n' +
      '        "field": ';
    var ctx = new QueryDslContextParser(text, 4, 17);
    expect(ctx.isKey).toBe(false);
    expect(ctx.lastKey).toBe('field');
  });
});

// ===========================================================================
// isValueFieldContext
// ===========================================================================

describe('isValueFieldContext', function() {

  it('should return true for aggs.my_agg.terms with field (wildcard match)',
    function() {
      expect(isValueFieldContext('aggs.my_agg.terms', 'field')).toBe(true);
    }
  );

  it('should return false for aggs.my_agg.terms with size', function() {
    expect(isValueFieldContext('aggs.my_agg.terms', 'size')).toBe(false);
  });

  it('should return true for query.exists with field (exact match)',
    function() {
      expect(isValueFieldContext('query.exists', 'field')).toBe(true);
    }
  );

  it('should return true for query.nested with path', function() {
    expect(isValueFieldContext('query.nested', 'path')).toBe(true);
  });

  it('should return true for query.query_string with default_field',
    function() {
      expect(isValueFieldContext('query.query_string', 'default_field'))
        .toBe(true);
    }
  );

  it('should return true for collapse with field', function() {
    expect(isValueFieldContext('collapse', 'field')).toBe(true);
  });

  it('should return true for nested aggs (aggs.x.aggs.y.terms with field)',
    function() {
      expect(isValueFieldContext('aggs.x.aggs.y.terms', 'field')).toBe(true);
    }
  );

  it('should return false for empty path with field', function() {
    expect(isValueFieldContext('', 'field')).toBe(false);
  });

  it('should return false for query.match with title (not a value field)',
    function() {
      expect(isValueFieldContext('query.match', 'title')).toBe(false);
    }
  );

  it('should return false when lastKey is empty', function() {
    expect(isValueFieldContext('aggs.my_agg.terms', '')).toBe(false);
  });

  it('should resolve via aggregations alias (normalizeAggsAlias)',
    function() {
      expect(isValueFieldContext('aggregations.my_agg.terms', 'field'))
        .toBe(true);
    }
  );
});

// ===========================================================================
// lookupValueEnums
// ===========================================================================

describe('lookupValueEnums', function() {

  it('should return [and, or] for query.match.title with operator',
    function() {
      var result = lookupValueEnums('query.match.title', 'operator');
      expect(result).toEqual(['and', 'or']);
    }
  );

  it('should return [none, all] for query.match.title with zero_terms_query',
    function() {
      var result = lookupValueEnums('query.match.title', 'zero_terms_query');
      expect(result).toEqual(['none', 'all']);
    }
  );

  it('should return multi_match type enums', function() {
    var result = lookupValueEnums('query.multi_match', 'type');
    expect(result).toContain('best_fields');
    expect(result).toContain('most_fields');
    expect(result).toContain('cross_fields');
    expect(result).toContain('phrase');
    expect(result).toContain('phrase_prefix');
    expect(result).toContain('bool_prefix');
  });

  it('should return [asc, desc] for sort.price with order', function() {
    var result = lookupValueEnums('sort.price', 'order');
    expect(result).toEqual(['asc', 'desc']);
  });

  it('should return sort mode enums for sort.price with mode', function() {
    var result = lookupValueEnums('sort.price', 'mode');
    expect(result).toContain('min');
    expect(result).toContain('max');
    expect(result).toContain('sum');
    expect(result).toContain('avg');
    expect(result).toContain('median');
  });

  it('should return highlight type enums', function() {
    var result = lookupValueEnums('highlight', 'type');
    expect(result).toEqual(['unified', 'plain', 'fvh']);
  });

  it('should return empty for query.match.title with query (not enum)',
    function() {
      var result = lookupValueEnums('query.match.title', 'query');
      expect(result).toEqual([]);
    }
  );

  it('should return empty for empty path with size', function() {
    var result = lookupValueEnums('', 'size');
    expect(result).toEqual([]);
  });

  it('should return empty when lastKey is empty', function() {
    var result = lookupValueEnums('query.match.title', '');
    expect(result).toEqual([]);
  });

  it('should resolve via aggregations alias (normalizeAggsAlias)',
    function() {
      var result = lookupValueEnums('sort.price', 'missing');
      expect(result).toContain('_last');
      expect(result).toContain('_first');
    }
  );
});

// ===========================================================================
// resolvePathAlias
// ===========================================================================

describe('resolvePathAlias', function() {

  it('should resolve post_filter to query', function() {
    expect(resolvePathAlias('post_filter')).toBe('query');
  });

  it('should resolve post_filter.match.title to query.match.title',
    function() {
      expect(resolvePathAlias('post_filter.match.title'))
        .toBe('query.match.title');
    }
  );

  it('should resolve post_filter.bool to query.bool', function() {
    expect(resolvePathAlias('post_filter.bool')).toBe('query.bool');
  });

  it('should return null for query (no alias)', function() {
    expect(resolvePathAlias('query')).toBeNull();
  });

  it('should return null for aggs (no alias)', function() {
    expect(resolvePathAlias('aggs')).toBeNull();
  });

  it('should return null for empty string', function() {
    expect(resolvePathAlias('')).toBeNull();
  });
});

// ===========================================================================
// lookupSuggestions with aliases
// ===========================================================================

describe('lookupSuggestions with aliases', function() {

  it('should return query types for post_filter', function() {
    var result = lookupSuggestions('post_filter');
    expect(result).toContain('match');
    expect(result).toContain('bool');
    expect(result).toContain('term');
    expect(result).toContain('range');
    expect(result).toContain('exists');
  });

  it('should return match parameters for post_filter.match.title',
    function() {
      var result = lookupSuggestions('post_filter.match.title');
      expect(result).toContain('query');
      expect(result).toContain('operator');
      expect(result).toContain('analyzer');
    }
  );

  it('should return bool clauses for post_filter.bool', function() {
    var result = lookupSuggestions('post_filter.bool');
    expect(result).toContain('must');
    expect(result).toContain('should');
    expect(result).toContain('filter');
    expect(result).toContain('must_not');
  });
});

// ===========================================================================
// isFieldNameContext with aliases
// ===========================================================================

describe('isFieldNameContext with aliases', function() {

  it('should return true for post_filter.match', function() {
    expect(isFieldNameContext('post_filter.match')).toBe(true);
  });

  it('should return true for post_filter.term', function() {
    expect(isFieldNameContext('post_filter.term')).toBe(true);
  });

  it('should return true for post_filter.range', function() {
    expect(isFieldNameContext('post_filter.range')).toBe(true);
  });

  it('should return false for post_filter alone', function() {
    expect(isFieldNameContext('post_filter')).toBe(false);
  });

  it('should return false for post_filter.bool (not a field context)',
    function() {
      expect(isFieldNameContext('post_filter.bool')).toBe(false);
    }
  );
});
