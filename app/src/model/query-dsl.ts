/**
 * What the REST screen knows about the OpenSearch query DSL.
 *
 * Ported from src/kopf/models/query_dsl_completer.js, which shipped with the
 * AngularJS screen's ace editor. The definitions are data only; the parsing
 * and the lookups live in query-dsl-completer.ts.
 *
 * A key is a dot-joined path through the request body. `*` stands for a name
 * the user chose -- a field, an aggregation -- rather than a DSL keyword.
 */

/** Every query type a `query` object accepts. */
export const QUERY_TYPES = [
  'match', 'match_all', 'match_none', 'match_phrase', 'match_phrase_prefix',
  'match_bool_prefix', 'term', 'terms', 'terms_set', 'bool', 'range', 'exists',
  'wildcard', 'prefix', 'fuzzy', 'nested', 'multi_match', 'query_string',
  'simple_query_string', 'ids', 'regexp', 'function_score', 'boosting',
  'constant_score', 'dis_max', 'more_like_this', 'script_score', 'wrapper',
  'span_term', 'span_near', 'span_or', 'span_first', 'span_not',
  'knn', 'neural', 'neural_sparse', 'hybrid',
];

export const QUERY_DSL_DEFINITIONS: Record<string, string[]> = {
  '': [
    'query', 'size', 'from', 'sort', 'aggs', 'aggregations', '_source',
    'highlight', 'post_filter', 'suggest', 'script_fields', 'stored_fields',
    'docvalue_fields', 'collapse', 'search_after', 'pit', 'track_total_hits',
    'track_scores', 'rescore', 'timeout', 'terminate_after', 'min_score',
    'seq_no_primary_term', 'version', 'explain', 'profile', 'indices_boost',
    'ext',
  ],
  'query': QUERY_TYPES,
  'query.bool': [
    'must', 'must_not', 'should', 'filter', 'minimum_should_match', 'boost',
  ],
  // A clause holds either one query object or an array of them. Both land on
  // the same path, so one entry covers both spellings.
  'query.bool.must': QUERY_TYPES,
  'query.bool.must_not': QUERY_TYPES,
  'query.bool.should': QUERY_TYPES,
  'query.bool.filter': QUERY_TYPES,
  'query.dis_max.queries': QUERY_TYPES,
  'query.hybrid.queries': QUERY_TYPES,
  'query.constant_score.filter': QUERY_TYPES,
  'query.nested.query': QUERY_TYPES,
  'query.boosting.positive': QUERY_TYPES,
  'query.boosting.negative': QUERY_TYPES,
  'query.function_score.query': QUERY_TYPES,
  'query.knn.*.filter': QUERY_TYPES,
  'query.neural.*.filter': QUERY_TYPES,
  'query.match.*': [
    'query', 'operator', 'analyzer', 'fuzziness', 'prefix_length',
    'max_expansions', 'zero_terms_query', 'boost', 'lenient',
    'auto_generate_synonyms_phrase_query',
  ],
  'query.match_phrase.*': [
    'query', 'analyzer', 'slop', 'boost', 'zero_terms_query',
  ],
  'query.match_phrase_prefix.*': [
    'query', 'analyzer', 'slop', 'boost', 'zero_terms_query', 'max_expansions',
  ],
  'query.match_bool_prefix.*': [
    'query', 'operator', 'analyzer', 'fuzziness', 'prefix_length',
    'max_expansions', 'boost',
  ],
  'query.term.*': ['value', 'boost', 'case_insensitive'],
  'query.range.*': [
    'gte', 'gt', 'lte', 'lt', 'format', 'time_zone', 'boost', 'relation',
  ],
  'query.multi_match': [
    'query', 'fields', 'type', 'operator', 'analyzer', 'fuzziness',
    'prefix_length', 'max_expansions', 'zero_terms_query', 'boost',
    'tie_breaker', 'minimum_should_match', 'lenient',
  ],
  'query.query_string': [
    'query', 'default_field', 'fields', 'default_operator', 'analyzer',
    'allow_leading_wildcard', 'analyze_wildcard', 'boost', 'fuzziness',
    'minimum_should_match', 'lenient',
  ],
  'query.simple_query_string': [
    'query', 'fields', 'default_operator', 'analyzer', 'flags', 'boost',
    'minimum_should_match', 'lenient', 'analyze_wildcard',
  ],
  'query.function_score': [
    'query', 'functions', 'score_mode', 'boost_mode', 'max_boost',
    'min_score', 'boost',
  ],
  'query.nested': [
    'path', 'query', 'score_mode', 'ignore_unmapped', 'inner_hits',
  ],
  'query.boosting': ['positive', 'negative', 'negative_boost'],
  'query.constant_score': ['filter', 'boost'],
  'query.dis_max': ['queries', 'tie_breaker', 'boost'],
  'query.exists': ['field'],
  'query.ids': ['values'],
  'query.fuzzy.*': [
    'value', 'fuzziness', 'prefix_length', 'max_expansions',
    'transpositions', 'boost',
  ],
  'query.wildcard.*': ['value', 'boost', 'case_insensitive'],
  'query.prefix.*': ['value', 'boost', 'case_insensitive'],
  'query.regexp.*': ['value', 'flags', 'max_determinized_states', 'boost'],
  'query.span_term.*': ['value', 'boost'],
  'query.span_near': ['clauses', 'slop', 'in_order'],
  'query.span_or': ['clauses'],
  'query.span_first': ['match', 'end'],
  'query.span_not': ['include', 'exclude', 'pre', 'post', 'dist'],
  // The vector and hybrid queries: what a Fess cluster running semantic
  // search is asked for from this screen.
  'query.knn.*': [
    'vector', 'k', 'filter', 'min_score', 'max_distance', 'method_parameters',
    'rescore', 'boost',
  ],
  'query.neural.*': [
    'query_text', 'query_image', 'model_id', 'k', 'min_score', 'max_distance',
    'filter', 'method_parameters', 'rescore',
  ],
  'query.neural_sparse.*': [
    'query_text', 'model_id', 'query_tokens', 'max_token_score', 'boost',
  ],
  'query.hybrid': ['queries', 'filter', 'pagination_depth'],
  'highlight': [
    'fields', 'pre_tags', 'post_tags', 'type', 'fragment_size',
    'number_of_fragments', 'order', 'encoder', 'require_field_match',
    'boundary_scanner', 'no_match_size',
  ],
  '_source': ['includes', 'excludes'],
  'aggs.*': [
    'terms', 'avg', 'sum', 'min', 'max', 'cardinality', 'value_count',
    'stats', 'extended_stats', 'percentiles', 'percentile_ranks',
    'date_histogram', 'histogram', 'range', 'date_range', 'filter',
    'filters', 'nested', 'reverse_nested', 'significant_terms',
    'significant_text', 'sampler', 'diversified_sampler', 'top_hits',
    'top_metrics', 'aggs', 'aggregations', 'geo_bounds', 'geo_centroid',
    'scripted_metric', 'composite', 'adjacency_matrix',
    'auto_date_histogram', 'missing', 'global', 'children', 'parent',
  ],
  'aggs.*.terms': [
    'field', 'size', 'order', 'min_doc_count', 'shard_min_doc_count',
    'missing', 'include', 'exclude', 'script', 'show_term_doc_count_error',
  ],
  'aggs.*.date_histogram': [
    'field', 'calendar_interval', 'fixed_interval', 'format', 'time_zone',
    'offset', 'min_doc_count', 'extended_bounds', 'hard_bounds', 'order',
    'keyed', 'missing', 'script',
  ],
  'aggs.*.histogram': [
    'field', 'interval', 'min_doc_count', 'extended_bounds', 'hard_bounds',
    'order', 'keyed', 'offset', 'missing', 'script',
  ],
  'aggs.*.range': ['field', 'ranges', 'keyed', 'script'],
  'aggs.*.date_range': [
    'field', 'ranges', 'format', 'time_zone', 'keyed', 'script',
  ],
  'aggs.*.filter': ['term', 'terms', 'range', 'bool', 'match', 'exists'],
  'aggs.*.top_hits': ['size', 'sort', '_source', 'from'],
  'aggs.*.composite': ['size', 'sources', 'after'],
  'sort.*': ['order', 'mode', 'missing', 'nested', 'unmapped_type'],
  'collapse': ['field', 'inner_hits', 'max_concurrent_group_searches'],
  'suggest.*': ['text', 'term', 'phrase', 'completion'],
  'suggest.*.term': [
    'field', 'size', 'suggest_mode', 'sort', 'string_distance', 'analyzer',
  ],
  'suggest.*.phrase': [
    'field', 'size', 'gram_size', 'real_word_error_likelihood', 'confidence',
    'max_errors', 'analyzer',
  ],
  'suggest.*.completion': ['field', 'size', 'skip_duplicates', 'fuzzy'],
};

/** Paths whose object keys are field names. */
export const FIELD_KEY_CONTEXTS = [
  'query.match', 'query.match_phrase', 'query.match_phrase_prefix',
  'query.match_bool_prefix', 'query.term', 'query.terms', 'query.range',
  'query.wildcard', 'query.prefix', 'query.fuzzy', 'query.regexp',
  'query.span_term', 'query.knn', 'query.neural', 'query.neural_sparse',
  'highlight.fields', 'sort',
];

/** Paths whose array elements are field names. */
export const FIELD_ARRAY_CONTEXTS = [
  'sort', '_source', '_source.includes', '_source.excludes',
  'stored_fields', 'docvalue_fields',
  'query.multi_match.fields', 'query.query_string.fields',
  'query.simple_query_string.fields',
];

/** Paths whose value is a field name. */
export const VALUE_FIELD_CONTEXTS = [
  'aggs.*.terms.field',
  'aggs.*.date_histogram.field',
  'aggs.*.histogram.field',
  'aggs.*.range.field',
  'aggs.*.date_range.field',
  'aggs.*.top_metrics.field',
  'query.exists.field',
  'query.nested.path',
  'query.query_string.default_field',
  'suggest.*.term.field',
  'suggest.*.phrase.field',
  'suggest.*.completion.field',
  'collapse.field',
];

/** Values a key accepts, where the set is closed. */
export const VALUE_ENUM_DEFINITIONS: Record<string, string[]> = {
  'query.match.*.operator': ['and', 'or'],
  'query.match.*.zero_terms_query': ['none', 'all'],
  'query.match_phrase.*.zero_terms_query': ['none', 'all'],
  'query.match_bool_prefix.*.operator': ['and', 'or'],
  'query.multi_match.type': [
    'best_fields', 'most_fields', 'cross_fields',
    'phrase', 'phrase_prefix', 'bool_prefix',
  ],
  'query.multi_match.operator': ['and', 'or'],
  'query.multi_match.zero_terms_query': ['none', 'all'],
  'query.query_string.default_operator': ['AND', 'OR'],
  'query.simple_query_string.default_operator': ['AND', 'OR'],
  'query.nested.score_mode': ['avg', 'max', 'min', 'sum', 'none'],
  'query.function_score.score_mode': [
    'multiply', 'sum', 'avg', 'first', 'max', 'min',
  ],
  'query.function_score.boost_mode': [
    'multiply', 'replace', 'sum', 'avg', 'max', 'min',
  ],
  'query.range.*.relation': ['INTERSECTS', 'CONTAINS', 'WITHIN'],
  'sort.*.order': ['asc', 'desc'],
  'sort.*.mode': ['min', 'max', 'sum', 'avg', 'median'],
  'sort.*.missing': ['_last', '_first'],
  'highlight.type': ['unified', 'plain', 'fvh'],
  'highlight.order': ['score'],
  'highlight.encoder': ['default', 'html'],
  'highlight.boundary_scanner': ['sentence', 'word', 'chars'],
  'suggest.*.term.suggest_mode': ['missing', 'popular', 'always'],
  'suggest.*.term.sort': ['score', 'frequency'],
};

/**
 * Paths that resolve as another path. `post_filter` takes exactly what
 * `query` takes.
 */
export const PATH_ALIASES: Record<string, string> = {
  'post_filter': 'query',
};

/** What is offered first, where some keys are far more used than the rest. */
export const ROOT_PRIORITY: Record<string, number> = {
  'query': 1000, 'aggs': 900, 'aggregations': 890, 'size': 880, 'from': 870,
  'sort': 860, '_source': 850, 'highlight': 840, 'post_filter': 830,
  'suggest': 820,
};

export const QUERY_PRIORITY: Record<string, number> = {
  'match': 1000, 'match_all': 990, 'bool': 980, 'term': 970, 'terms': 960,
  'range': 950, 'match_phrase': 940, 'multi_match': 930, 'nested': 920,
  'exists': 910, 'query_string': 900, 'knn': 895, 'neural': 894,
  'hybrid': 893, 'neural_sparse': 892, 'function_score': 890, 'wildcard': 880,
  'prefix': 870, 'fuzzy': 860,
};

export const AGGS_PRIORITY: Record<string, number> = {
  'terms': 1000, 'date_histogram': 990, 'histogram': 980, 'avg': 970,
  'sum': 960, 'min': 950, 'max': 940, 'cardinality': 930, 'filter': 920,
  'filters': 910, 'nested': 900, 'range': 890, 'top_hits': 880, 'aggs': 870,
  'aggregations': 860, 'composite': 850,
};

/**
 * Every word the definitions themselves use.
 *
 * Resolving a path against the wildcard patterns means telling a DSL keyword
 * from a name the user chose; a segment that appears nowhere in the
 * definitions is the latter.
 */
export const DSL_KEYWORDS: ReadonlySet<string> = new Set(
  Object.entries(QUERY_DSL_DEFINITIONS).flatMap(([path, keys]) => [
    ...path.split('.').filter((segment) => segment !== '' && segment !== '*'),
    ...keys,
  ]),
);
