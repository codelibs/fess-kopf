/**
 * Query DSL autocomplete for OpenSearch in Ace Editor.
 *
 * Provides context-aware suggestions while editing JSON query bodies.
 */

// --- DSL definitions ---

var QUERY_DSL_DEFINITIONS = {
  '': [
    'query', 'size', 'from', 'sort', 'aggs', 'aggregations', '_source',
    'highlight', 'post_filter', 'suggest', 'script_fields', 'stored_fields',
    'collapse', 'search_after', 'pit', 'track_total_hits', 'timeout',
    'terminate_after', 'min_score', 'seq_no_primary_term', 'version',
    'explain', 'profile', 'indices_boost'
  ],
  'query': [
    'match', 'match_all', 'match_phrase', 'match_phrase_prefix',
    'match_bool_prefix', 'term', 'terms', 'bool', 'range', 'exists',
    'wildcard', 'prefix', 'fuzzy', 'nested', 'multi_match', 'query_string',
    'simple_query_string', 'ids', 'regexp', 'function_score', 'boosting',
    'constant_score', 'dis_max', 'more_like_this', 'script_score',
    'percolate', 'wrapper', 'span_term', 'span_near', 'span_or',
    'span_first', 'span_not'
  ],
  'query.bool': [
    'must', 'must_not', 'should', 'filter', 'minimum_should_match', 'boost'
  ],
  'query.match.*': [
    'query', 'operator', 'analyzer', 'fuzziness', 'prefix_length',
    'max_expansions', 'zero_terms_query', 'boost', 'lenient',
    'auto_generate_synonyms_phrase_query'
  ],
  'query.match_phrase.*': [
    'query', 'analyzer', 'slop', 'boost', 'zero_terms_query'
  ],
  'query.term.*': ['value', 'boost'],
  'query.range.*': [
    'gte', 'gt', 'lte', 'lt', 'format', 'time_zone', 'boost', 'relation'
  ],
  'query.multi_match': [
    'query', 'fields', 'type', 'operator', 'analyzer', 'fuzziness',
    'prefix_length', 'max_expansions', 'zero_terms_query', 'boost',
    'tie_breaker', 'minimum_should_match', 'lenient'
  ],
  'query.query_string': [
    'query', 'default_field', 'fields', 'default_operator', 'analyzer',
    'allow_leading_wildcard', 'analyze_wildcard', 'boost', 'fuzziness',
    'minimum_should_match', 'lenient'
  ],
  'query.simple_query_string': [
    'query', 'fields', 'default_operator', 'analyzer', 'flags', 'boost',
    'minimum_should_match', 'lenient', 'analyze_wildcard'
  ],
  'query.function_score': [
    'query', 'functions', 'score_mode', 'boost_mode', 'max_boost',
    'min_score', 'boost'
  ],
  'query.nested': [
    'path', 'query', 'score_mode', 'ignore_unmapped', 'inner_hits'
  ],
  'query.boosting': ['positive', 'negative', 'negative_boost'],
  'query.constant_score': ['filter', 'boost'],
  'query.dis_max': ['queries', 'tie_breaker', 'boost'],
  'query.exists': ['field'],
  'query.ids': ['values'],
  'query.fuzzy.*': [
    'value', 'fuzziness', 'prefix_length', 'max_expansions',
    'transpositions', 'boost'
  ],
  'query.wildcard.*': ['value', 'boost', 'case_insensitive'],
  'query.prefix.*': ['value', 'boost'],
  'query.regexp.*': [
    'value', 'flags', 'max_determinized_states', 'boost'
  ],
  'highlight': [
    'fields', 'pre_tags', 'post_tags', 'type', 'fragment_size',
    'number_of_fragments', 'order', 'encoder', 'require_field_match',
    'boundary_scanner', 'no_match_size'
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
    'auto_date_histogram', 'missing', 'global', 'children', 'parent'
  ],
  'aggs.*.terms': [
    'field', 'size', 'order', 'min_doc_count', 'shard_min_doc_count',
    'missing', 'include', 'exclude', 'script', 'show_term_doc_count_error'
  ],
  'aggs.*.date_histogram': [
    'field', 'calendar_interval', 'fixed_interval', 'format', 'time_zone',
    'offset', 'min_doc_count', 'extended_bounds', 'hard_bounds', 'order',
    'keyed', 'missing', 'script'
  ],
  'aggs.*.histogram': [
    'field', 'interval', 'min_doc_count', 'extended_bounds', 'hard_bounds',
    'order', 'keyed', 'offset', 'missing', 'script'
  ],
  'aggs.*.range': ['field', 'ranges', 'keyed', 'script'],
  'aggs.*.date_range': [
    'field', 'ranges', 'format', 'time_zone', 'keyed', 'script'
  ],
  'aggs.*.filter': [
    'term', 'terms', 'range', 'bool', 'match', 'exists'
  ],
  'aggs.*.top_hits': ['size', 'sort', '_source', 'from'],
  'aggs.*.composite': ['size', 'sources', 'after'],
  'sort.*': ['order', 'mode', 'missing', 'nested', 'unmapped_type']
};

var FIELD_NAME_CONTEXTS = [
  'query.match', 'query.match_phrase', 'query.match_phrase_prefix',
  'query.match_bool_prefix', 'query.term', 'query.terms', 'query.range',
  'query.wildcard', 'query.prefix', 'query.fuzzy', 'query.regexp',
  'highlight.fields'
];

var QUERY_CONTEXTS = [
  'query.bool.must', 'query.bool.must_not', 'query.bool.should',
  'query.bool.filter'
];

// --- Known DSL keywords (used to distinguish user-defined names from
//     DSL structure when resolving wildcard patterns) ---

var DSL_KEYWORDS = (function() {
  var keywords = {};
  var key;
  for (key in QUERY_DSL_DEFINITIONS) {
    if (QUERY_DSL_DEFINITIONS.hasOwnProperty(key)) {
      var parts = key.split('.');
      for (var p = 0; p < parts.length; p++) {
        if (parts[p] !== '*' && parts[p] !== '') {
          keywords[parts[p]] = true;
        }
      }
      var values = QUERY_DSL_DEFINITIONS[key];
      for (var v = 0; v < values.length; v++) {
        keywords[values[v]] = true;
      }
    }
  }
  return keywords;
})();

// --- Priority scores for common items ---

var ROOT_PRIORITY = {
  'query': 1000,
  'aggs': 900,
  'aggregations': 890,
  'size': 880,
  'from': 870,
  'sort': 860,
  '_source': 850,
  'highlight': 840,
  'post_filter': 830,
  'suggest': 820
};

var QUERY_PRIORITY = {
  'match': 1000,
  'match_all': 990,
  'bool': 980,
  'term': 970,
  'terms': 960,
  'range': 950,
  'match_phrase': 940,
  'multi_match': 930,
  'nested': 920,
  'exists': 910,
  'query_string': 900,
  'function_score': 890,
  'wildcard': 880,
  'prefix': 870,
  'fuzzy': 860
};

var AGGS_PRIORITY = {
  'terms': 1000,
  'date_histogram': 990,
  'histogram': 980,
  'avg': 970,
  'sum': 960,
  'min': 950,
  'max': 940,
  'cardinality': 930,
  'filter': 920,
  'filters': 910,
  'nested': 900,
  'range': 890,
  'top_hits': 880,
  'aggs': 870,
  'aggregations': 860,
  'composite': 850
};

// --- Context parser ---

/**
 * Parses JSON text up to the cursor position and determines the current
 * context path within the document structure.
 *
 * @param {string} text   Full text of the editor.
 * @param {number} cursorRow  Zero-based row of the cursor.
 * @param {number} cursorCol  Zero-based column of the cursor.
 * @constructor
 */
function QueryDslContextParser(text, cursorRow, cursorCol) {
  var lines = text.split('\n');

  // Collect text from the beginning up to the cursor position.
  var textToCursor = '';
  for (var i = 0; i <= cursorRow && i < lines.length; i++) {
    if (i === cursorRow) {
      textToCursor += lines[i].substring(0, cursorCol);
    } else {
      textToCursor += lines[i] + '\n';
    }
  }

  // Stack-based parsing state.
  var stack = [];    // entries: {key: string, isArray: boolean}
  var currentKey = '';
  var inString = false;
  var isKey = true;  // JSON objects start expecting a key after '{'
  var lastKey = '';
  var partial = '';

  for (var c = 0; c < textToCursor.length; c++) {
    var ch = textToCursor[c];

    // --- Inside a string literal ---
    if (inString) {
      if (ch === '\\') {
        c++; // skip escaped character
        if (isKey && c < textToCursor.length) {
          currentKey += textToCursor[c];
        }
        continue;
      }
      if (ch === '"') {
        inString = false;
        if (isKey) {
          lastKey = currentKey;
        }
        continue;
      }
      if (isKey) {
        currentKey += ch;
      }
      continue;
    }

    // --- Outside a string ---
    if (ch === '"') {
      inString = true;
      currentKey = '';
      continue;
    }

    if (ch === '{') {
      stack.push({key: lastKey, isArray: false});
      isKey = true;
      lastKey = '';
      currentKey = '';
      continue;
    }

    if (ch === '}') {
      stack.pop();
      isKey = false;
      continue;
    }

    if (ch === '[') {
      stack.push({key: lastKey, isArray: true});
      isKey = true;
      lastKey = '';
      currentKey = '';
      continue;
    }

    if (ch === ']') {
      stack.pop();
      isKey = false;
      continue;
    }

    if (ch === ':') {
      isKey = false;
      continue;
    }

    if (ch === ',') {
      if (stack.length > 0 && !stack[stack.length - 1].isArray) {
        isKey = true;
      } else if (stack.length === 0) {
        isKey = true;
      } else {
        // Inside an array – the next element might be a primitive or an
        // object.  We keep isKey = true so that if an object follows, we
        // are ready for its first key.  The '{' handler will push a new
        // frame regardless.
        isKey = true;
      }
      lastKey = '';
      currentKey = '';
      continue;
    }
  }

  // Build the context path from the stack (skip entries with empty keys,
  // which correspond to the root object or anonymous array wrappers).
  this.path = [];
  for (var s = 0; s < stack.length; s++) {
    if (stack[s].key) {
      this.path.push(stack[s].key);
    }
  }

  this.isKey = isKey;
  this.isInArray = stack.length > 0 && stack[stack.length - 1].isArray;
  this.partial = inString ? currentKey : (lastKey || currentKey);
}

// --- Helper functions ---

/**
 * Returns true when the context path matches one of the field-name
 * contexts (i.e. the user should be offered field names from the mapping).
 *
 * @param {string} pathStr  Dot-joined context path.
 * @return {boolean}
 */
function isFieldNameContext(pathStr) {
  for (var i = 0; i < FIELD_NAME_CONTEXTS.length; i++) {
    if (pathStr === FIELD_NAME_CONTEXTS[i]) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true when the cursor is inside an array that expects query
 * objects (e.g. must, should, filter, must_not arrays inside bool).
 *
 * @param {QueryDslContextParser} context  Parsed context.
 * @return {boolean}
 */
function isQueryArrayContext(context) {
  if (!context.isInArray) {
    return false;
  }
  var pathStr = normalizeAggsAlias(context.path.join('.'));
  for (var i = 0; i < QUERY_CONTEXTS.length; i++) {
    if (pathStr === QUERY_CONTEXTS[i]) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes 'aggregations' segments to 'aggs' so that both spellings
 * resolve against the same definition entries.
 *
 * @param {string} pathStr  Dot-joined context path.
 * @return {string}  Normalized path string.
 */
function normalizeAggsAlias(pathStr) {
  if (pathStr.indexOf('aggregations') === -1) {
    return pathStr;
  }
  return pathStr.split('.').map(function(segment) {
    return segment === 'aggregations' ? 'aggs' : segment;
  }).join('.');
}

/**
 * Attempts to find suggestions for the given path string by first trying
 * an exact match, then falling back to wildcard patterns.
 *
 * When resolving wildcards, each segment of the path is checked against
 * known DSL keywords.  Segments that are NOT keywords (i.e. user-defined
 * names such as aggregation names or field names) are replaced with '*'
 * before the lookup.
 *
 * @param {string} pathStr  Dot-joined context path.
 * @return {Array.<string>}  List of suggestion strings (may be empty).
 */
function lookupSuggestions(pathStr) {
  // 0. Normalize 'aggregations' to 'aggs' so both spellings resolve
  //    against the same definition entries.
  pathStr = normalizeAggsAlias(pathStr);

  // 1. Exact match.
  if (QUERY_DSL_DEFINITIONS.hasOwnProperty(pathStr)) {
    return QUERY_DSL_DEFINITIONS[pathStr];
  }

  // 2. Try replacing non-keyword segments with '*'.
  var parts = pathStr.split('.');
  var candidates = buildWildcardCandidates(parts, 0);

  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    if (QUERY_DSL_DEFINITIONS.hasOwnProperty(candidate)) {
      return QUERY_DSL_DEFINITIONS[candidate];
    }
  }

  // 3. Handle nested aggs: collapse repeated aggs/aggregations segments.
  //    e.g. "aggs.*.aggs.*" -> "aggs.*",
  //         "aggs.*.aggs.*.terms" -> "aggs.*.terms"
  var collapsed = collapseNestedAggs(parts);
  if (collapsed) {
    return lookupSuggestions(collapsed);
  }

  return [];
}

/**
 * Builds a list of candidate pattern strings by selectively replacing
 * non-keyword segments with '*'.  Candidates are ordered so that patterns
 * with fewer wildcards come first (preferring more specific matches).
 *
 * @param {Array.<string>} parts  Path segments.
 * @param {number} startIndex     Index to start processing from.
 * @return {Array.<string>}
 */
function buildWildcardCandidates(parts, startIndex) {
  var results = [];
  var wildParts = parts.slice();

  // Replace each non-keyword segment with '*' one at a time, building
  // progressively more general patterns.
  for (var i = startIndex; i < wildParts.length; i++) {
    if (!DSL_KEYWORDS.hasOwnProperty(wildParts[i])) {
      wildParts[i] = '*';
    }
  }

  var pattern = wildParts.join('.');
  if (pattern !== parts.join('.')) {
    results.push(pattern);
  }

  // Also try replacing only the last non-keyword segment.
  var singleWild = parts.slice();
  for (var j = singleWild.length - 1; j >= 0; j--) {
    if (!DSL_KEYWORDS.hasOwnProperty(singleWild[j])) {
      singleWild[j] = '*';
      var singlePattern = singleWild.join('.');
      if (singlePattern !== pattern && results.indexOf(singlePattern) === -1) {
        results.push(singlePattern);
      }
      break;
    }
  }

  return results;
}

/**
 * Collapses repeated aggs/aggregations segments in a path so that
 * nested aggregation definitions can be resolved against the same
 * patterns as top-level ones.
 *
 * For example:
 *   ["aggs","x","aggs","y"] -> "aggs.y"
 *   ["aggs","x","aggs","y","terms"] -> "aggs.y.terms"
 *
 * @param {Array.<string>} parts  Original path segments.
 * @return {string|null}  Collapsed path string, or null if not applicable.
 */
function collapseNestedAggs(parts) {
  // Find the last occurrence of 'aggs' or 'aggregations' in the path.
  var lastAggsIdx = -1;
  for (var i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 'aggs' || parts[i] === 'aggregations') {
      lastAggsIdx = i;
      break;
    }
  }
  // Only collapse if there is more than one aggs segment.
  if (lastAggsIdx > 0) {
    var tail = parts.slice(lastAggsIdx);
    var collapsed = tail.join('.');
    if (collapsed !== parts.join('.')) {
      return collapsed;
    }
  }
  return null;
}

/**
 * Determines the appropriate meta label for a suggestion given the
 * context path.
 *
 * @param {string} pathStr  Dot-joined context path.
 * @return {string}
 */
function getMetaLabel(pathStr) {
  if (pathStr === '') {
    return 'property';
  }
  if (pathStr === 'query') {
    return 'query';
  }
  if (pathStr === 'query.bool') {
    return 'clause';
  }
  if (pathStr.indexOf('aggs') === 0) {
    var depth = pathStr.split('.').length;
    // aggs.* level lists aggregation types
    if (depth === 1 || (depth === 2 && pathStr.indexOf('*') !== -1) ||
        pathStr.match(/^aggs\.[^.]+$/)) {
      return 'aggregation';
    }
    return 'parameter';
  }
  if (pathStr === 'aggregations') {
    return 'aggregation';
  }
  return 'parameter';
}

/**
 * Returns a numeric score for a suggestion based on the context.  Higher
 * scores appear first in the completion list.
 *
 * @param {string} suggestion  The suggestion string.
 * @param {string} pathStr     Dot-joined context path.
 * @return {number}
 */
function getSuggestionScore(suggestion, pathStr) {
  var base = 500;

  if (pathStr === '' && ROOT_PRIORITY.hasOwnProperty(suggestion)) {
    return ROOT_PRIORITY[suggestion];
  }
  if (pathStr === 'query' && QUERY_PRIORITY.hasOwnProperty(suggestion)) {
    return QUERY_PRIORITY[suggestion];
  }
  if (pathStr.indexOf('aggs') === 0 &&
      AGGS_PRIORITY.hasOwnProperty(suggestion)) {
    return AGGS_PRIORITY[suggestion];
  }
  return base;
}

// --- Field resolution with request-path scoping and caching ---

/**
 * Extracts target indices from a REST request path.
 * Handles comma-separated indices (e.g. "index_a,index_b/_search").
 * Returns empty array if the path is cluster-wide (e.g. _search).
 *
 * @param {string} requestPath  REST path.
 * @return {Array.<string>}  Target index names (may be empty).
 */
function extractIndicesFromPath(requestPath) {
  if (!requestPath || requestPath.length === 0) {
    return [];
  }
  var parts = requestPath.replace(/^\//, '').split('/');
  if (parts.length === 0 || parts[0].charAt(0) === '_') {
    return [];
  }
  // Split by comma for multi-index targets.
  return parts[0].split(',').filter(function(s) { return s.length > 0; });
}

/**
 * Matches an index name against a pattern that may contain wildcards (*).
 *
 * @param {string} pattern  Pattern string (e.g. "logs-*").
 * @param {string} name     Index name to test.
 * @return {boolean}
 */
function matchIndexPattern(pattern, name) {
  if (pattern === name || pattern === '*') {
    return true;
  }
  if (pattern.indexOf('*') === -1) {
    return false;
  }
  // Convert glob to regex: escape regex chars, replace * with .*
  var escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  var regex = new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
  return regex.test(name);
}

/**
 * Resolves target index patterns against actual index names from the
 * mapping.  Supports exact names, wildcards (logs-*), and exclusion
 * patterns (-index_name).
 *
 * @param {Array.<string>} targets  Target patterns from the request path.
 * @param {Array.<string>} indices  Available index names from mapping.
 * @return {Array.<string>}  Matched index names.
 */
function resolveTargetIndices(targets, indices) {
  var included = {};
  var excluded = {};
  var hasIncludes = false;

  for (var t = 0; t < targets.length; t++) {
    var target = targets[t];
    if (target.charAt(0) === '-') {
      // Exclusion pattern.
      var exPattern = target.substring(1);
      for (var e = 0; e < indices.length; e++) {
        if (matchIndexPattern(exPattern, indices[e])) {
          excluded[indices[e]] = true;
        }
      }
    } else {
      hasIncludes = true;
      for (var i = 0; i < indices.length; i++) {
        if (matchIndexPattern(target, indices[i])) {
          included[indices[i]] = true;
        }
      }
    }
  }

  if (!hasIncludes) {
    return [];
  }

  var result = [];
  for (var idx in included) {
    if (included.hasOwnProperty(idx) && !excluded[idx]) {
      result.push(idx);
    }
  }
  return result;
}

// Simple cache to avoid recomputing field lists on every keystroke.
// Keyed by mapping object identity + request path.  Invalidated when
// the mapping object changes (which happens on cluster refresh).
var _fieldCache = {mapping: null, requestPath: '', fields: []};

/**
 * Resolves the list of fields to suggest, scoped to the current request
 * path's index set when possible.  Results are cached so that live
 * autocomplete does not recompute on every keystroke.
 *
 * The mappingProvider can return either:
 *   (a) a ClusterMapping object (legacy), or
 *   (b) {mapping: ClusterMapping, requestPath: string}
 *
 * @param {Function} mappingProvider  Provider function.
 * @return {Array.<string>}  Sorted field names.
 */
function resolveFields(mappingProvider) {
  if (!mappingProvider) {
    return [];
  }
  var providerResult = mappingProvider();
  if (!providerResult) {
    return [];
  }

  // Unwrap the provider result.
  var mapping = null;
  var requestPath = '';
  if (typeof providerResult.getAllFields === 'function') {
    // Legacy: raw ClusterMapping object.
    mapping = providerResult;
  } else if (providerResult.mapping &&
      typeof providerResult.mapping.getAllFields === 'function') {
    mapping = providerResult.mapping;
    requestPath = providerResult.requestPath || '';
  } else {
    return [];
  }

  // Check cache: same mapping object + same request path = same fields.
  // The mapping object is replaced by the controller on cluster refresh,
  // so object identity is a reliable invalidation signal.
  if (_fieldCache.mapping === mapping &&
      _fieldCache.requestPath === requestPath) {
    return _fieldCache.fields;
  }

  // Determine the target indices from the request path.
  var targetPatterns = extractIndicesFromPath(requestPath);
  var indices = mapping.getIndices();

  // Resolve fields, scoped to target indices if available.
  var fields;
  if (targetPatterns.length > 0) {
    var matchedIndices = resolveTargetIndices(targetPatterns, indices);
    if (matchedIndices.length > 0) {
      var allFields = [];
      for (var i = 0; i < matchedIndices.length; i++) {
        var idxFields = mapping.getFields(matchedIndices[i]);
        for (var f = 0; f < idxFields.length; f++) {
          if (allFields.indexOf(idxFields[f]) === -1) {
            allFields.push(idxFields[f]);
          }
        }
      }
      fields = allFields.sort();
    } else {
      fields = mapping.getAllFields();
    }
  } else {
    fields = mapping.getAllFields();
  }

  _fieldCache = {mapping: mapping, requestPath: requestPath, fields: fields};
  return fields;
}

// --- Completer factory ---

/**
 * Creates an Ace Editor completer for OpenSearch Query DSL.
 *
 * @param {Function} mappingProvider  Optional function that returns either
 *     a ClusterMapping object (with getAllFields/getFields) or an object
 *     {mapping: ClusterMapping, requestPath: string} for request-scoped
 *     field suggestions.
 * @return {Object}  An Ace completer object.
 */
function createQueryDslCompleter(mappingProvider) {
  return {
    identifierRegexps: [/[a-zA-Z_0-9.]/],

    /**
     * @param {Object} editor   Ace editor instance.
     * @param {Object} session  Ace edit session.
     * @param {Object} pos      Cursor position ({row, column}).
     * @param {string} prefix   Current word prefix detected by Ace.
     * @param {Function} callback  Completion callback(err, results).
     */
    getCompletions: function(editor, session, pos, prefix, callback) {
      var text = session.getValue();
      var context = new QueryDslContextParser(text, pos.row, pos.column);

      // Strip a leading quote that Ace may include in the prefix.
      var cleanPrefix = prefix.replace(/^"/, '');

      // Only suggest keys, not values (for now).
      if (!context.isKey) {
        callback(null, []);
        return;
      }

      var pathStr = normalizeAggsAlias(context.path.join('.'));
      var suggestions = [];
      var meta = 'property';

      // 1. Bool array contexts (must, should, filter, must_not) expect
      //    query type objects.
      if (isQueryArrayContext(context)) {
        suggestions = QUERY_DSL_DEFINITIONS.query || [];
        meta = 'query';
      }
      // 2. Contexts that expect field names.
      else if (isFieldNameContext(pathStr)) {
        var fields = resolveFields(mappingProvider);
        if (fields.length > 0) {
          var fieldCompletions = [];
          for (var f = 0; f < fields.length; f++) {
            var fieldName = fields[f];
            if (cleanPrefix.length === 0 ||
                fieldName.indexOf(cleanPrefix) === 0) {
              fieldCompletions.push({
                caption: fieldName,
                value: fieldName,
                score: 1000 - f,
                meta: 'field'
              });
            }
          }
          callback(null, fieldCompletions);
          return;
        }
        // No mapping available – fall through to DSL definitions so the
        // user still gets some completions.
        suggestions = lookupSuggestions(pathStr);
        meta = getMetaLabel(pathStr);
      }
      // 3. Standard DSL lookup (exact then wildcard).
      else {
        suggestions = lookupSuggestions(pathStr);
        meta = getMetaLabel(pathStr);
      }

      // Filter by prefix and build completion entries.
      var completions = [];
      for (var i = 0; i < suggestions.length; i++) {
        var s = suggestions[i];
        if (cleanPrefix.length === 0 || s.indexOf(cleanPrefix) === 0) {
          completions.push({
            caption: s,
            value: s,
            score: getSuggestionScore(s, pathStr),
            meta: meta
          });
        }
      }

      callback(null, completions);
    }
  };
}
