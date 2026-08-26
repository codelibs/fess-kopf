/**
 * Query DSL completions for the REST screen's body editor.
 *
 * Nothing here touches the DOM: the editor hands over the text and where the
 * caret is, and gets back what to offer and what the text becomes when one of
 * them is accepted. Ported from the ace completer the AngularJS screen used,
 * with the definitions in query-dsl.ts.
 */
import {
  AGGS_PRIORITY,
  DSL_KEYWORDS,
  FIELD_ARRAY_CONTEXTS,
  FIELD_KEY_CONTEXTS,
  PATH_ALIASES,
  QUERY_DSL_DEFINITIONS,
  QUERY_PRIORITY,
  QUERY_TYPES,
  ROOT_PRIORITY,
  VALUE_ENUM_DEFINITIONS,
  VALUE_FIELD_CONTEXTS,
} from './query-dsl';

/** What sorting accepts besides a field name. */
const SORT_PSEUDO_FIELDS = ['_score', '_doc'];

export type CompletionMeta =
  'property' | 'query' | 'clause' | 'aggregation' | 'parameter' | 'field' | 'value';

export interface Completion {
  /** The word offered. */
  label: string;
  /** What kind of thing it is, shown beside the label. */
  meta: CompletionMeta;
}

export interface CompletionContext {
  /** Keys of the objects the caret sits inside, outermost first. */
  path: string[];
  /** True where an object key belongs, false where its value belongs. */
  isKey: boolean;
  /** True when the caret's immediate container is an array. */
  isInArray: boolean;
  /** The key whose value the caret is in; empty in key position. */
  lastKey: string;
  /** True when the caret is inside a string literal. */
  inString: boolean;
  /** What has been typed of the current word. */
  prefix: string;
  /** Where that word starts, so accepting a completion can replace it. */
  from: number;
  /** Where the caret is. */
  cursor: number;
}

export interface CompletionSources {
  /** Field names of the indices the request path addresses. */
  fields?: string[];
}

/** A word outside a string: what a JSON key or value can be built from. */
const BARE_WORD = /[\w.@*-]+$/;

/**
 * Reads the text up to the caret and works out where in the request body it
 * leaves us.
 *
 * This is a scanner, not a parser: the text is being typed and is invalid
 * more often than not, so it tracks only enough state -- the open brackets,
 * whether a key or a value is expected -- to answer that question.
 */
export function contextAt(text: string, cursor: number): CompletionContext {
  const upto = text.slice(0, cursor);
  const stack: {key: string; isArray: boolean}[] = [];
  let inString = false;
  let stringIsKey = true;
  let stringStart = 0;
  let buffer = '';
  let expectKey = true;
  let lastKey = '';

  for (let i = 0; i < upto.length; i++) {
    const ch = upto[i];
    if (inString) {
      if (ch === '\\') {
        i += 1;
        buffer += upto[i] ?? '';
      } else if (ch === '"') {
        inString = false;
        if (stringIsKey) {
          lastKey = buffer;
        }
      } else {
        buffer += ch;
      }
      continue;
    }
    switch (ch) {
      case '"':
        inString = true;
        stringIsKey = expectKey;
        stringStart = i + 1;
        buffer = '';
        break;
      case '{':
      case '[':
        stack.push({key: lastKey, isArray: ch === '['});
        // An array's elements are not keyed, but a string in one is read the
        // same way a key is -- which is what makes a sort array complete.
        expectKey = true;
        lastKey = '';
        break;
      case '}':
      case ']':
        stack.pop();
        expectKey = false;
        break;
      case ':':
        expectKey = false;
        break;
      case ',':
        expectKey = true;
        lastKey = '';
        break;
      default:
        break;
    }
  }

  const isKey = inString ? stringIsKey : expectKey;
  const bare = inString ? null : BARE_WORD.exec(upto);
  const prefix = inString ? buffer : (bare?.[0] ?? '');
  return {
    path: stack.map((frame) => frame.key).filter((key) => key !== ''),
    isKey,
    isInArray: stack.length > 0 && stack[stack.length - 1].isArray,
    lastKey: isKey ? '' : lastKey,
    inString,
    prefix,
    from: inString ? stringStart : cursor - prefix.length,
    cursor,
  };
}

/** `aggregations` is a spelling of `aggs`; the definitions carry only one. */
function normalize(path: string): string {
  if (!path.includes('aggregations')) {
    return path;
  }
  return path
    .split('.')
    .map((segment) => (segment === 'aggregations' ? 'aggs' : segment))
    .join('.');
}

/**
 * The path with every segment the definitions do not know replaced by `*`.
 * Those are the names the user chose: field names, aggregation names.
 */
function wildcarded(parts: string[]): string {
  return parts.map((segment) => (DSL_KEYWORDS.has(segment) ? segment : '*')).join('.');
}

/** `aggs.a.aggs.b` resolves as `aggs.b`, so nesting needs no definitions. */
function collapseNestedAggs(parts: string[]): string | null {
  const last = parts.lastIndexOf('aggs');
  return last > 0 ? parts.slice(last).join('.') : null;
}

function resolveAlias(path: string): string | null {
  const [head, ...rest] = path.split('.');
  const alias = PATH_ALIASES[head];
  return alias === undefined ? null : [alias, ...rest].join('.');
}

/**
 * Every pattern the path could be looked up under, most specific first.
 */
function candidatePaths(path: string): string[] {
  const found: string[] = [];
  const walk = (raw: string): void => {
    const current = normalize(raw);
    if (found.includes(current)) {
      return;
    }
    found.push(current);
    if (current !== '') {
      const parts = current.split('.');
      const wild = wildcarded(parts);
      if (wild !== current && !found.includes(wild)) {
        found.push(wild);
      }
      const collapsed = collapseNestedAggs(parts);
      if (collapsed !== null) {
        walk(collapsed);
      }
    }
    const aliased = resolveAlias(current);
    if (aliased !== null) {
      walk(aliased);
    }
  };
  walk(path);
  return found;
}

/** The definitions for a path, and the pattern they were found under. */
function lookupKeys(path: string): {keys: string[]; pattern: string} | null {
  for (const candidate of candidatePaths(path)) {
    const keys = QUERY_DSL_DEFINITIONS[candidate];
    if (keys !== undefined) {
      return {keys, pattern: candidate};
    }
  }
  return null;
}

function inContext(path: string, contexts: string[]): boolean {
  return candidatePaths(path).some((candidate) => contexts.includes(candidate));
}

function lookupEnum(path: string): string[] {
  for (const candidate of candidatePaths(path)) {
    const values = VALUE_ENUM_DEFINITIONS[candidate];
    if (values !== undefined) {
      return values;
    }
  }
  return [];
}

function metaFor(pattern: string, keys: string[]): CompletionMeta {
  if (keys === QUERY_TYPES) {
    return 'query';
  }
  if (pattern === '') {
    return 'property';
  }
  if (pattern === 'query.bool') {
    return 'clause';
  }
  if (pattern === 'aggs.*') {
    return 'aggregation';
  }
  return 'parameter';
}

/** Common keys come first; everything else keeps the order it is defined in. */
function scoreFor(label: string, pattern: string, keys: string[]): number {
  if (pattern === '') {
    return ROOT_PRIORITY[label] ?? 500;
  }
  if (keys === QUERY_TYPES) {
    return QUERY_PRIORITY[label] ?? 500;
  }
  if (pattern.startsWith('aggs')) {
    return AGGS_PRIORITY[label] ?? 500;
  }
  return 500;
}

function asFields(names: string[]): Completion[] {
  return names.map((label) => ({label, meta: 'field' as const}));
}

function keyCompletions(context: CompletionContext, path: string, fields: string[]): Completion[] {
  const asArray = context.isInArray && inContext(path, FIELD_ARRAY_CONTEXTS);
  const asKeys = !context.isInArray && inContext(path, FIELD_KEY_CONTEXTS);
  if (asArray || asKeys) {
    const sorting = candidatePaths(path).includes('sort');
    const names = sorting ? [...SORT_PSEUDO_FIELDS, ...fields] : fields;
    if (names.length > 0) {
      return asFields(names);
    }
    if (asArray) {
      // An array of field names holds nothing else, so offering the key
      // definitions of the object form here would only mislead.
      return [];
    }
  }

  const found = lookupKeys(path);
  if (found === null) {
    return [];
  }
  const meta = metaFor(found.pattern, found.keys);
  return found.keys
    .map((label) => ({label, meta, score: scoreFor(label, found.pattern, found.keys)}))
    .sort((a, b) => b.score - a.score)
    .map(({label, meta: itemMeta}) => ({label, meta: itemMeta}));
}

function valueCompletions(
  context: CompletionContext,
  path: string,
  fields: string[],
): Completion[] {
  if (context.lastKey === '') {
    return [];
  }
  const full = path === '' ? context.lastKey : `${path}.${context.lastKey}`;
  if (fields.length > 0 && inContext(full, VALUE_FIELD_CONTEXTS)) {
    return asFields(fields);
  }
  return lookupEnum(full).map((label) => ({label, meta: 'value' as const}));
}

/** What to offer at a caret whose context has already been read. */
export function suggest(
  context: CompletionContext,
  sources: CompletionSources = {},
): Completion[] {
  const fields = sources.fields ?? [];
  const path = normalize(context.path.join('.'));
  const completions = context.isKey
    ? keyCompletions(context, path, fields)
    : valueCompletions(context, path, fields);
  const typed = context.prefix.toLowerCase();
  return completions.filter((completion) => completion.label.toLowerCase().startsWith(typed));
}

/** What to offer at a caret. */
export function completeQueryDsl(
  text: string,
  cursor: number,
  sources: CompletionSources = {},
): Completion[] {
  return suggest(contextAt(text, cursor), sources);
}

/**
 * The text once a completion is accepted, and where the caret lands.
 *
 * A key is quoted and given its colon unless the text already carries one; a
 * value is only quoted. An array element never gets a colon -- an array of
 * field names holds no keys.
 */
export function applyCompletion(
  text: string,
  context: CompletionContext,
  label: string,
): {text: string; cursor: number} {
  const before = text.slice(0, context.from);
  let tail = text.slice(context.cursor);
  if (context.inString && tail.startsWith('"')) {
    tail = tail.slice(1);
  }
  let insert = `${context.inString ? '' : '"'}${label}"`;
  if (context.isKey && !context.isInArray && !/^\s*:/.test(tail)) {
    insert += ': ';
  }
  return {text: `${before}${insert}${tail}`, cursor: before.length + insert.length};
}
