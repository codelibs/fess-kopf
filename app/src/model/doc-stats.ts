/**
 * What the Fess document index holds, in the shape an operator asks about it:
 * which file types, how large, how old, from which hosts, owned by whom.
 *
 * Everything here comes from one `_search` with `size: 0` and a set of
 * aggregations, so the page costs a single request against the index and no
 * document bodies. The field names are Fess's own (`fess_indices/fess/doc.json`
 * in the fess repository); kopf does not invent any.
 *
 * Which aggregations go into that request is decided by `_field_caps` first.
 * A terms aggregation on a field mapped as `text` fails the whole search, and
 * an index Fess created before `owner` and `last_modifier` were added to the
 * mapping holds them as dynamic text until it is rebuilt. Asking the cluster
 * which fields can be aggregated keeps one such field from blanking the page.
 */

/** Fields counted by value, most frequent first. */
export const TERM_FIELDS = [
  'filetype',
  'mimetype',
  'host',
  'label',
  'owner',
  'last_modifier',
] as const;

/** Fields counted by calendar year. */
export const YEAR_FIELDS = ['last_modified', 'created'] as const;

export const SIZE_FIELD = 'content_length';

export type TermField = (typeof TERM_FIELDS)[number];
export type YearField = (typeof YEAR_FIELDS)[number];
export type StatsField = TermField | YearField | typeof SIZE_FIELD;

export const ALL_FIELDS: readonly StatsField[] = [...TERM_FIELDS, ...YEAR_FIELDS, SIZE_FIELD];

/** How many values a terms panel lists before the rest become "other". */
export const TERMS_SIZE = 20;

/** How many of the largest documents are listed. */
export const LARGEST_SIZE = 10;

/**
 * The size bands. The first five are the ones the Fess search page offers
 * as its size facet (`query.facet.queries` in fess_config.properties), so the
 * numbers here and there can be compared; the last two split what Fess
 * lumps together as "1MB and over", which is where a file server's weight is.
 */
export const SIZE_RANGES: readonly {key: string; from?: number; to?: number}[] = [
  {key: '< 10KB', to: 10000},
  {key: '10KB – 100KB', from: 10000, to: 100000},
  {key: '100KB – 500KB', from: 100000, to: 500000},
  {key: '500KB – 1MB', from: 500000, to: 1000000},
  {key: '1MB – 10MB', from: 1000000, to: 10000000},
  {key: '10MB – 100MB', from: 10000000, to: 100000000},
  {key: '≥ 100MB', from: 100000000},
];

const TYPE_FAMILIES: Record<'terms' | 'date' | 'number', readonly string[]> = {
  terms: ['keyword', 'constant_keyword'],
  date: ['date', 'date_nanos'],
  number: [
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'scaled_float',
    'unsigned_long',
  ],
};

function familyOf(field: StatsField): keyof typeof TYPE_FAMILIES {
  if ((YEAR_FIELDS as readonly string[]).includes(field)) {
    return 'date';
  }
  return field === SIZE_FIELD ? 'number' : 'terms';
}

export interface FieldCapsResponse {
  indices?: string[];
  fields?: Record<string, Record<string, {type?: string; aggregatable?: boolean}>>;
}

/**
 * Whether a field can be aggregated, and if not, why.
 *
 * `unmapped`: no index behind the name has the field at all.
 * `unaggregatable`: it is mapped, but as a type this page cannot count --
 * `text`, or a different type in different indices behind an alias.
 */
export type FieldState =
  | {field: StatsField; status: 'ok'}
  | {field: StatsField; status: 'unmapped'}
  | {field: StatsField; status: 'unaggregatable'; types: string[]};

/** Reads `_field_caps` into one verdict per field this page asks about. */
export function parseFieldCaps(response: FieldCapsResponse): Map<StatsField, FieldState> {
  const states = new Map<StatsField, FieldState>();
  for (const field of ALL_FIELDS) {
    const caps = response.fields?.[field];
    const types = caps === undefined ? [] : Object.keys(caps).filter((t) => t !== 'unmapped');
    if (types.length === 0) {
      states.set(field, {field, status: 'unmapped'});
      continue;
    }
    const family = TYPE_FAMILIES[familyOf(field)];
    // One type across every index, of the right family, and aggregatable.
    // Two types behind one alias means at least one index cannot answer.
    const usable =
      types.length === 1 &&
      family.includes(types[0]) &&
      caps![types[0]].aggregatable === true;
    states.set(
      field,
      usable ? {field, status: 'ok'} : {field, status: 'unaggregatable', types: types.sort()},
    );
  }
  return states;
}

/**
 * The search body. Only fields `parseFieldCaps` found usable get an
 * aggregation; every one of them also gets a `missing` count, because "how
 * many documents have no owner" is as much an answer as the owners are.
 *
 * Years are bucketed in the viewer's time zone, so a document modified at
 * 00:30 on 1 January lands in the year the operator would say it did.
 */
export function buildDocStatsQuery(
  states: Map<StatsField, FieldState>,
  timeZone: string,
): Record<string, unknown> {
  const usable = (field: StatsField) => states.get(field)?.status === 'ok';
  const aggs: Record<string, unknown> = {};

  for (const field of TERM_FIELDS) {
    if (usable(field)) {
      aggs[`terms_${field}`] = {terms: {field, size: TERMS_SIZE}};
      aggs[`missing_${field}`] = {missing: {field}};
    }
  }
  for (const field of YEAR_FIELDS) {
    if (usable(field)) {
      aggs[`year_${field}`] = {
        date_histogram: {
          field,
          calendar_interval: 'year',
          format: 'yyyy',
          time_zone: timeZone,
          min_doc_count: 1,
        },
      };
      aggs[`missing_${field}`] = {missing: {field}};
    }
  }
  if (usable(SIZE_FIELD)) {
    aggs.size_ranges = {range: {field: SIZE_FIELD, ranges: SIZE_RANGES}};
    aggs.size_stats = {stats: {field: SIZE_FIELD}};
    aggs[`missing_${SIZE_FIELD}`] = {missing: {field: SIZE_FIELD}};
    aggs.largest = {
      top_hits: {
        size: LARGEST_SIZE,
        sort: [{[SIZE_FIELD]: {order: 'desc'}}],
        _source: ['url', 'filename', SIZE_FIELD, 'last_modified'],
      },
    };
  }

  return {size: 0, track_total_hits: true, aggs};
}

export interface Bucket {
  key: string;
  count: number;
}

/** One panel: a field, whether it could be counted, and what was counted. */
export interface FieldBreakdown {
  state: FieldState;
  buckets: Bucket[];
  /** Documents whose value fell outside the listed buckets. */
  other: number;
  /** Documents with no value for the field. */
  missing: number;
}

export interface LargestDocument {
  url: string;
  filename: string;
  size: number;
  lastModified: string;
}

export interface SizeSummary {
  sum: number;
  avg: number;
  max: number;
}

interface BucketResponse {
  key?: string | number;
  key_as_string?: string;
  doc_count?: number;
}

interface AggregationResponse {
  buckets?: BucketResponse[];
  sum_other_doc_count?: number;
  doc_count?: number;
  sum?: number | null;
  avg?: number | null;
  max?: number | null;
  hits?: {hits?: {_source?: Record<string, unknown>}[]};
}

export interface DocStatsResponse {
  hits?: {total?: number | {value?: number; relation?: string}};
  aggregations?: Record<string, AggregationResponse>;
}

function bucketsOf(agg: AggregationResponse | undefined): Bucket[] {
  return (agg?.buckets ?? []).map((bucket) => ({
    key: String(bucket.key_as_string ?? bucket.key ?? ''),
    count: bucket.doc_count ?? 0,
  }));
}

function text(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : '';
  }
  return value === undefined || value === null ? '' : String(value);
}

export class DocStats {
  /** The index or alias that was asked. */
  readonly index: string;
  readonly total: number;
  /** `gte` when the cluster stopped counting; with track_total_hits it never should. */
  readonly totalIsLowerBound: boolean;
  readonly terms: FieldBreakdown[];
  readonly years: FieldBreakdown[];
  readonly sizes: FieldBreakdown;
  readonly sizeSummary: SizeSummary | null;
  readonly largest: LargestDocument[];

  constructor(index: string, states: Map<StatsField, FieldState>, raw: DocStatsResponse) {
    this.index = index;
    const total = raw.hits?.total;
    this.total = typeof total === 'number' ? total : (total?.value ?? 0);
    this.totalIsLowerBound = typeof total === 'object' && total.relation === 'gte';

    const aggs = raw.aggregations ?? {};
    const breakdown = (field: StatsField, key: string): FieldBreakdown => ({
      state: states.get(field) ?? {field, status: 'unmapped'},
      buckets: bucketsOf(aggs[key]),
      other: aggs[key]?.sum_other_doc_count ?? 0,
      missing: aggs[`missing_${field}`]?.doc_count ?? 0,
    });

    this.terms = TERM_FIELDS.map((field) => breakdown(field, `terms_${field}`));
    this.years = YEAR_FIELDS.map((field) => breakdown(field, `year_${field}`));
    this.sizes = breakdown(SIZE_FIELD, 'size_ranges');

    const stats = aggs.size_stats;
    this.sizeSummary =
      stats === undefined || stats.max === null || stats.max === undefined
        ? null
        : {sum: stats.sum ?? 0, avg: stats.avg ?? 0, max: stats.max};

    this.largest = (aggs.largest?.hits?.hits ?? []).map((hit) => {
      const source = hit._source ?? {};
      return {
        url: text(source.url),
        filename: text(source.filename),
        size: Number(text(source[SIZE_FIELD])) || 0,
        lastModified: text(source.last_modified),
      };
    });
  }
}
