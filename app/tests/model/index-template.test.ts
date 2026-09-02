import {describe, expect, it} from 'vitest';
import {IndexTemplate, IndexTemplateFilter, parseTemplates} from '@/model/index-template';

/** Ported from tests/models/index-template-filter.test.js. */

const modern = new IndexTemplate('fess-tpl', {index_patterns: ['fess-*', 'other-*']});
const legacy = new IndexTemplate('old-tpl', {template: 'legacy-*'});

describe('IndexTemplate', () => {
  it('reads index_patterns, the field OpenSearch returns', () => {
    expect(modern.patterns).toEqual(['fess-*', 'other-*']);
  });

  it('still reads the legacy single template field', () => {
    expect(legacy.patterns).toEqual(['legacy-*']);
  });

  it('has no patterns when the body carries neither', () => {
    expect(new IndexTemplate('empty', {}).patterns).toEqual([]);
  });
});

describe('IndexTemplateFilter', () => {
  it('matches everything when blank', () => {
    const filter = new IndexTemplateFilter('', '');
    expect(filter.isBlank()).toBe(true);
    expect(filter.matches(modern)).toBe(true);
  });

  it('matches on a name substring', () => {
    expect(new IndexTemplateFilter('fess', '').matches(modern)).toBe(true);
    expect(new IndexTemplateFilter('absent', '').matches(modern)).toBe(false);
  });

  it('matches on an index pattern instead of throwing', () => {
    // The original read body.template -- removed in Elasticsearch 7.0 and
    // absent from every OpenSearch response -- so typing here threw
    // "Cannot read properties of undefined (reading 'indexOf')".
    expect(new IndexTemplateFilter('', 'fess').matches(modern)).toBe(true);
    expect(new IndexTemplateFilter('', 'nothing').matches(modern)).toBe(false);
  });

  it('matches a legacy template by its pattern too', () => {
    expect(new IndexTemplateFilter('', 'legacy').matches(legacy)).toBe(true);
  });

  it('does not throw on a template with no patterns at all', () => {
    const empty = new IndexTemplate('empty', {});
    expect(() => new IndexTemplateFilter('', 'x').matches(empty)).not.toThrow();
    expect(new IndexTemplateFilter('', 'x').matches(empty)).toBe(false);
  });

  it('requires both when both are set', () => {
    expect(new IndexTemplateFilter('fess', 'other').matches(modern)).toBe(true);
    expect(new IndexTemplateFilter('old', 'other').matches(modern)).toBe(false);
  });

  it('sorts by name, clones and compares', () => {
    const filter = new IndexTemplateFilter('n', 't');
    expect(filter.equals(filter.clone())).toBe(true);
    expect(filter.equals(new IndexTemplateFilter('n', 'u'))).toBe(false);
    expect(filter.equals(null)).toBe(false);
    const list = [new IndexTemplate('b', {}), new IndexTemplate('a', {})];
    expect(list.sort(filter.getSorting()).map((t) => t.name)).toEqual(['a', 'b']);
  });

  it('clones the current values, not the originals', () => {
    // The original closed over the constructor arguments, so a clone taken
    // after an edit carried the stale values.
    const filter = new IndexTemplateFilter('a', 'b');
    filter.name = 'edited';
    expect(filter.clone().name).toBe('edited');
  });
});

describe('parseTemplates', () => {
  /** The three listing shapes, measured on 2.19.1 and 3.8.0 alike. */
  const COMPONENT = {
    component_templates: [
      {
        name: 'kopf-comp',
        component_template: {
          template: {settings: {index: {number_of_shards: '1'}}},
          version: 3,
          _meta: {description: 'shared settings'},
        },
      },
    ],
  };

  const INDEX = {
    index_templates: [
      {
        name: 'kopf-idx',
        index_template: {
          index_patterns: ['kopf-logs-*', 'kopf-metrics-*'],
          template: {settings: {index: {number_of_replicas: '0'}}},
          composed_of: ['kopf-comp'],
          priority: 200,
          version: 7,
        },
      },
    ],
  };

  const LEGACY = {'kopf-legacy': {index_patterns: ['old-*'], settings: {}}};

  it('reads a component listing, which carries no patterns', () => {
    const [template] = parseTemplates('component', COMPONENT);
    expect(template.name).toBe('kopf-comp');
    expect(template.kind).toBe('component');
    expect(template.patterns).toEqual([]);
    expect(template.composedOf).toEqual([]);
  });

  it('does not mistake a composable template object for a legacy pattern', () => {
    // Both shapes call the field `template`: a string on the legacy one, an
    // object on a composable one. Reading it blindly would print [object].
    const [template] = parseTemplates('component', COMPONENT);
    expect(template.body.template).toBeTypeOf('object');
    expect(template.patterns).toEqual([]);
  });

  it('reads an index listing with its patterns and components', () => {
    const [template] = parseTemplates('index', INDEX);
    expect(template.name).toBe('kopf-idx');
    expect(template.kind).toBe('index');
    expect(template.patterns).toEqual(['kopf-logs-*', 'kopf-metrics-*']);
    expect(template.composedOf).toEqual(['kopf-comp']);
  });

  it('reads the legacy object-keyed listing', () => {
    const [template] = parseTemplates('legacy', LEGACY);
    expect(template.name).toBe('kopf-legacy');
    expect(template.kind).toBe('legacy');
    expect(template.patterns).toEqual(['old-*']);
  });

  it('returns nothing for an empty listing of any kind', () => {
    expect(parseTemplates('component', {})).toEqual([]);
    expect(parseTemplates('index', {})).toEqual([]);
    expect(parseTemplates('legacy', {})).toEqual([]);
  });
});
