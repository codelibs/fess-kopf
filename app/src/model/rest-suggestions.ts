/** Paths offered as completions, with {index} filled in from the cluster. */
const PATHS = [
  '_search',
  '{index}/_search',
  '_msearch',
  '{index}/_msearch',
  '_search/template',
  '{index}/_search/template',
  '{index}/_count',
  '_count',
  '{index}/_mapping',
  '_mapping',
  '{index}/_settings',
  '_settings',
  '{index}/_analyze',
  '_analyze',
  '_cluster/health',
  '_cluster/state',
  '_cluster/settings',
  '_nodes/stats',
  '_cat/indices?v',
  '_alias',
  '{index}/_alias',
];

/**
 * Path completions for what has been typed so far.
 *
 * Index names come from the cluster poll. The AngularJS screen fetched every
 * index's mappings through /_mapping just to learn the names and types; types
 * no longer exist, and the names are already in hand.
 */
export function suggestPaths(typed: string, indices: string[], limit = 10): string[] {
  const prefix = typed.replace(/^\//, '');
  const expanded = new Set<string>();
  PATHS.forEach((path) => {
    if (!path.includes('{index}')) {
      expanded.add(path);
      return;
    }
    indices.forEach((index) => expanded.add(path.replace('{index}', index)));
  });
  return [...expanded]
    .filter((path) => path.startsWith(prefix) && path !== prefix)
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, limit);
}

/** Query skeletons worth having at hand when operating a Fess cluster. */
export const QUERY_SNIPPETS: {label: string; body: string}[] = [
  {
    label: 'match',
    body: JSON.stringify({query: {match: {content: 'TEXT'}}}, undefined, 2),
  },
  {
    label: 'knn',
    body: JSON.stringify(
      {query: {knn: {content_chunk_vector: {vector: [0.1, 0.2], k: 10}}}},
      undefined,
      2,
    ),
  },
  {
    label: 'neural',
    body: JSON.stringify(
      {
        query: {
          neural: {content_chunk_vector: {query_text: 'TEXT', model_id: 'MODEL_ID', k: 10}},
        },
      },
      undefined,
      2,
    ),
  },
  {
    label: 'neural_sparse',
    body: JSON.stringify(
      {query: {neural_sparse: {content_sparse: {query_text: 'TEXT', model_id: 'MODEL_ID'}}}},
      undefined,
      2,
    ),
  },
  {
    label: 'hybrid',
    body: JSON.stringify(
      {
        query: {
          hybrid: {
            queries: [
              {match: {content: 'TEXT'}},
              {neural: {content_chunk_vector: {query_text: 'TEXT', model_id: 'MODEL_ID', k: 10}}},
            ],
          },
        },
      },
      undefined,
      2,
    ),
  },
];
