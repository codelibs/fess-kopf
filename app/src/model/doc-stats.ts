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

/**
 * The `keyword` subfield OpenSearch's dynamic mapping adds beside a `text`
 * field. An index built before Fess mapped a field holds it that way, and
 * the subfield can still be counted.
 */
function subfield(field: TermField): string {
  return `${field}.keyword`;
}

/** Everything `_field_caps` is asked about: each field, and each terms field's subfield. */
export const CAPS_FIELDS: readonly string[] = [...ALL_FIELDS, ...TERM_FIELDS.map(subfield)];

/** How many values a terms panel lists before the rest become "other". */
export const TERMS_SIZE = 20;

/** How many of the largest documents are listed. */
export const LARGEST_SIZE = 10;

const KB = 1024;
const MB = 1024 * KB;

/**
 * The size bands. They follow the Fess size facet's steps (10KB, 100KB,
 * 500KB, 1MB) and split what that facet lumps together as "1MB and over",
 * which is where a file server's weight is. The bounds are binary, like
 * every size kopf prints through `bytes()`: with decimal bounds a file
 * shown as 976.56KB would be counted under "1MB – 10MB".
 */
export const SIZE_RANGES: readonly {key: string; from?: number; to?: number}[] = [
  {key: '< 10KB', to: 10 * KB},
  {key: '10KB – 100KB', from: 10 * KB, to: 100 * KB},
  {key: '100KB – 500KB', from: 100 * KB, to: 500 * KB},
  {key: '500KB – 1MB', from: 500 * KB, to: MB},
  {key: '1MB – 10MB', from: MB, to: 10 * MB},
  {key: '10MB – 100MB', from: 10 * MB, to: 100 * MB},
  {key: '≥ 100MB', from: 100 * MB},
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

type FieldCaps = Record<string, {type?: string; aggregatable?: boolean}>;

export interface FieldCapsResponse {
  indices?: string[];
  fields?: Record<string, FieldCaps>;
}

/**
 * Whether a field can be aggregated, and if not, why.
 *
 * `ok`: `source` is what the aggregation reads -- the field itself, or its
 * `keyword` subfield when the field is `text`.
 * `unmapped`: no index behind the name has the field at all.
 * `unaggregatable`: it is mapped, but as a type this page cannot count --
 * `text` with no subfield every index shares, or a different type in
 * different indices behind an alias.
 */
export type FieldState =
  | {field: StatsField; status: 'ok'; source: string}
  | {field: StatsField; status: 'unmapped'}
  | {field: StatsField; status: 'unaggregatable'; types: string[]};

/** The mapped types, leaving out the `unmapped` entry `include_unmapped` adds. */
function mappedTypes(caps: FieldCaps | undefined): string[] {
  return caps === undefined ? [] : Object.keys(caps).filter((type) => type !== 'unmapped');
}

/**
 * One type, of the right family, and aggregatable. Two types behind one
 * alias means at least one index cannot answer. An index that lacks the
 * field altogether is fine: its documents are counted as missing a value.
 */
function countable(caps: FieldCaps | undefined, family: readonly string[]): boolean {
  const types = mappedTypes(caps);
  return types.length === 1 && family.includes(types[0]) && caps![types[0]].aggregatable === true;
}

/** Reads `_field_caps` into one verdict per field this page asks about. */
export function parseFieldCaps(response: FieldCapsResponse): Map<StatsField, FieldState> {
  const states = new Map<StatsField, FieldState>();
  for (const field of ALL_FIELDS) {
    const caps = response.fields?.[field];
    const types = mappedTypes(caps);
    const family = TYPE_FAMILIES[familyOf(field)];
    if (types.length === 0) {
      states.set(field, {field, status: 'unmapped'});
    } else if (countable(caps, family)) {
      states.set(field, {field, status: 'ok', source: field});
    } else if (familyOf(field) === 'terms' && sharedSubfield(response, field as TermField)) {
      states.set(field, {field, status: 'ok', source: subfield(field as TermField)});
    } else {
      states.set(field, {field, status: 'unaggregatable', types: types.sort()});
    }
  }
  return states;
}

/**
 * Whether the `keyword` subfield can stand in for a field. Unlike the field
 * itself it must exist in every index behind the name: an alias over a new
 * index (field mapped as keyword, no subfield) and an old one (text plus
 * subfield) would otherwise be counted from the old index alone.
 */
function sharedSubfield(response: FieldCapsResponse, field: TermField): boolean {
  const caps = response.fields?.[subfield(field)];
  return caps?.unmapped === undefined && countable(caps, TYPE_FAMILIES.terms);
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
    const state = states.get(field);
    if (state?.status === 'ok') {
      aggs[`terms_${field}`] = {terms: {field: state.source, size: TERMS_SIZE}};
      aggs[`missing_${field}`] = {missing: {field: state.source}};
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
