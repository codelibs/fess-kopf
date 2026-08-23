export interface Explanation {
  value: number;
  description: string;
  details?: Explanation[];
}

export interface ExplainHit {
  _index?: string;
  _id?: string;
  _score?: number;
  _explanation?: Explanation;
  explanation?: Explanation;
  documentId?: string;
}

/** True when the path asks OpenSearch for an explanation. */
export function isExplainPath(path: string): boolean {
  return (
    path.includes('_explain') || path.includes('?explain') || path.includes('explain=true')
  );
}

/**
 * Normalises a search response or a single-document explain into a list of
 * hits carrying an _explanation.
 *
 * The document id no longer includes a type. The AngularJS version built
 * `_index/_type/_id`, which on a typeless index rendered as
 * "fess.2026/undefined/abc".
 */
export function normalizeExplainResponse(response: {
  hits?: {hits?: ExplainHit[]};
} & ExplainHit): ExplainHit[] {
  const hits: ExplainHit[] = response.hits?.hits ?? [response];
  hits.forEach((hit) => {
    if (hit.explanation !== undefined && hit._explanation === undefined) {
      hit._explanation = hit.explanation;
      delete hit.explanation;
    }
    hit.documentId = [hit._index, hit._id].filter((part) => part !== undefined).join('/');
    if (hit._explanation !== undefined && hit._score === undefined) {
      hit._score = hit._explanation.value;
    }
  });
  return hits;
}
