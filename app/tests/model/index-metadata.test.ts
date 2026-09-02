import {describe, expect, it} from 'vitest';
import {IndexMetadata, type IndexMetadataResponse} from '@/model/index-metadata';

/** Ported from the behaviour of src/kopf/opensearch/index_metadata.js. */

function metadata(overrides: Partial<IndexMetadataResponse> = {}): IndexMetadata {
  return new IndexMetadata('idx', {
    mappings: {_doc: {properties: {}}},
    settings: {},
    ...overrides,
  });
}

describe('IndexMetadata', () => {
  describe('getTypes', () => {
    it('returns the mapping keys, sorted', () => {
      const m = metadata({mappings: {b: {}, a: {}}});
      expect(m.getTypes()).toEqual(['a', 'b']);
    });

    it("reports '_doc' on a typeless index, which is what OpenSearch returns", () => {
      // Presenting _doc as a type is a limitation inherited from the
      // AngularJS screen, not something the port introduced.
      expect(metadata().getTypes()).toEqual(['_doc']);
    });
  });

  describe('getAnalyzers', () => {
    it('reads the nested settings tree', () => {
      const m = metadata({
        settings: {index: {analysis: {analyzer: {japanese_analyzer: {}, arabic_analyzer: {}}}}},
      });
      expect(m.getAnalyzers()).toEqual(['arabic_analyzer', 'japanese_analyzer']);
    });

    it('falls back to flattened keys', () => {
      const m = metadata({
        settings: {
          'index.analysis.analyzer.custom_one.type': 'custom',
          'index.analysis.analyzer.custom_one.tokenizer': 'standard',
          'index.analysis.analyzer.custom_two.type': 'custom',
        },
      });
      expect(m.getAnalyzers()).toEqual(['custom_one', 'custom_two']);
    });

    it('is empty when the index defines none', () => {
      expect(metadata().getAnalyzers()).toEqual([]);
    });
  });

  describe('getFields', () => {
    it('lists analyzable fields, sorted', () => {
      const m = metadata({
        mappings: {
          _doc: {
            properties: {
              title: {type: 'text'},
              anchor: {type: 'keyword'},
              boost: {type: 'float'},
              click_count: {type: 'long'},
            },
          },
        },
      });
      // float and long are not analyzable.
      expect(m.getFields('_doc')).toEqual(['anchor', 'title']);
    });

    it('descends into object and nested types', () => {
      const m = metadata({
        mappings: {
          _doc: {
            properties: {
              meta: {type: 'object', properties: {author: {type: 'text'}}},
              items: {type: 'nested', properties: {label: {type: 'keyword'}}},
            },
          },
        },
      });
      expect(m.getFields('_doc')).toEqual(['items.label', 'meta.author']);
    });

    it('descends into a property with no type at all', () => {
      const m = metadata({
        mappings: {_doc: {properties: {group: {properties: {leaf: {type: 'text'}}}}}},
      });
      expect(m.getFields('_doc')).toEqual(['group.leaf']);
    });

    it('includes multi-fields under their parent path', () => {
      const m = metadata({
        mappings: {
          _doc: {properties: {title: {type: 'text', fields: {raw: {type: 'keyword'}}}}},
        },
      });
      expect(m.getFields('_doc')).toEqual(['title', 'title.raw']);
    });

    it("drops the parent path for a just_name multi-field", () => {
      const m = metadata({
        mappings: {
          _doc: {
            properties: {
              title: {type: 'text', path: 'just_name', fields: {raw: {type: 'keyword'}}},
            },
          },
        },
      });
      expect(m.getFields('_doc')).toEqual(['raw', 'title']);
    });

    it('returns nothing for a type the index does not have', () => {
      expect(metadata().getFields('absent')).toEqual([]);
    });
  });
});

describe('getAllFields', () => {
  it('lists every mapped field whatever its type', () => {
    const m = metadata({
      mappings: {
        _doc: {
          properties: {
            title: {type: 'text'},
            boost: {type: 'float'},
            created: {type: 'date'},
          },
        },
      },
    });
    expect(m.getAllFields()).toEqual(['boost', 'created', 'title']);
  });

  it('names a nested field by its full path, and the container too', () => {
    const m = metadata({
      mappings: {
        _doc: {
          properties: {
            author: {type: 'object', properties: {name: {type: 'text'}}},
          },
        },
      },
    });
    expect(m.getAllFields()).toEqual(['author', 'author.name']);
  });

  it('names a multi-field by its full path', () => {
    const m = metadata({
      mappings: {
        _doc: {properties: {title: {type: 'text', fields: {keyword: {type: 'keyword'}}}}},
      },
    });
    expect(m.getAllFields()).toEqual(['title', 'title.keyword']);
  });

  it('merges the types of an index that still has more than one', () => {
    const m = metadata({
      mappings: {
        a: {properties: {shared: {type: 'text'}, only_a: {type: 'text'}}},
        b: {properties: {shared: {type: 'text'}, only_b: {type: 'text'}}},
      },
    });
    expect(m.getAllFields()).toEqual(['only_a', 'only_b', 'shared']);
  });

  it('is empty when the index maps nothing', () => {
    expect(metadata().getAllFields()).toEqual([]);
  });
});

describe('IndexMetadata, the other analysis sections', () => {
  /** What a Fess document index carries, cut to a few of each. */
  const fess = new IndexMetadata('fess.20260902', {
    mappings: {},
    settings: {
      index: {
        analysis: {
          analyzer: {japanese_analyzer: {}, english_analyzer: {}},
          tokenizer: {japanese_tokenizer: {}, bigram_tokenizer: {}},
          filter: {japanese_stop: {}, truncate10_filter: {}, lowercase: {}},
          char_filter: {mapping_ja_filter: {}},
        },
      },
    },
  } as never);

  it('offers each section, sorted', () => {
    expect(fess.getAnalyzers()).toEqual(['english_analyzer', 'japanese_analyzer']);
    expect(fess.getTokenizers()).toEqual(['bigram_tokenizer', 'japanese_tokenizer']);
    expect(fess.getFilters()).toEqual(['japanese_stop', 'lowercase', 'truncate10_filter']);
    expect(fess.getCharFilters()).toEqual(['mapping_ja_filter']);
  });

  it('reads the flattened shape ?flat_settings would produce', () => {
    const flat = new IndexMetadata('i', {
      mappings: {},
      settings: {
        'index.analysis.tokenizer.japanese_tokenizer.type': 'fess_japanese',
        'index.analysis.tokenizer.japanese_tokenizer.mode': 'normal',
        'index.analysis.filter.japanese_stop.type': 'ja_stop',
      },
    } as never);
    expect(flat.getTokenizers()).toEqual(['japanese_tokenizer']);
    expect(flat.getFilters()).toEqual(['japanese_stop']);
  });

  it('reports nothing for a section the index does not define', () => {
    const bare = new IndexMetadata('i', {mappings: {}, settings: {}} as never);
    expect(bare.getTokenizers()).toEqual([]);
    expect(bare.getCharFilters()).toEqual([]);
  });
});
