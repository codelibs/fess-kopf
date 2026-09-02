import {notEmpty} from './util';

/**
 * The three kinds of template OpenSearch keeps, each on its own endpoint.
 *
 * `component` and `index` are the composable pair and are what current
 * OpenSearch documents; `legacy` is `_template`, deprecated but still
 * answered, and still what an old cluster carries. A screen that reads only
 * the legacy endpoint reports "no templates" on a cluster whose templates
 * were all made the modern way, which is what this used to do.
 */
export type TemplateKind = 'component' | 'index' | 'legacy';

export const TEMPLATE_KINDS: TemplateKind[] = ['component', 'index', 'legacy'];

export interface IndexTemplateBody {
  /** Current field. Absent on a component template, which has no patterns. */
  index_patterns?: string[];
  /**
   * Two different things under one name, which is why `patterns` reads it
   * defensively: on a legacy template this was a single pattern string, and
   * on a composable one it is the settings/mappings/aliases object.
   */
  template?: string | Record<string, unknown>;
  /** The component templates an index template is built from. */
  composed_of?: string[];
  priority?: number;
  version?: number;
  [key: string]: unknown;
}

/** One template, of whichever kind the endpoint it came from serves. */
export class IndexTemplate {
  constructor(
    readonly name: string,
    readonly body: IndexTemplateBody,
    readonly kind: TemplateKind = 'legacy',
  ) {}

  /** The patterns this template applies to, whichever field carries them. */
  get patterns(): string[] {
    if (Array.isArray(this.body.index_patterns)) {
      return this.body.index_patterns;
    }
    // Only the legacy shape ever put a pattern in `template`; on a
    // composable template that field is an object.
    return typeof this.body.template === 'string' ? [this.body.template] : [];
  }

  /** The component templates this one is composed of, if it is an index one. */
  get composedOf(): string[] {
    return Array.isArray(this.body.composed_of) ? this.body.composed_of : [];
  }
}

interface ComponentEntry {
  name: string;
  component_template: IndexTemplateBody;
}

interface IndexEntry {
  name: string;
  index_template: IndexTemplateBody;
}

export interface ComponentTemplatesResponse {
  component_templates?: ComponentEntry[];
}

export interface IndexTemplatesResponse {
  index_templates?: IndexEntry[];
}

export type LegacyTemplatesResponse = Record<string, IndexTemplateBody>;

/**
 * Reads whichever listing the endpoint for `kind` returns.
 *
 * The two composable endpoints answer with an array of {name, <kind>_template}
 * entries; the legacy one answers with an object keyed by name. Measured
 * identical on 2.19.1 and 3.8.0.
 */
export function parseTemplates(
  kind: TemplateKind,
  response: ComponentTemplatesResponse | IndexTemplatesResponse | LegacyTemplatesResponse,
): IndexTemplate[] {
  if (kind === 'component') {
    const entries = (response as ComponentTemplatesResponse).component_templates ?? [];
    return entries.map((entry) => new IndexTemplate(entry.name, entry.component_template, kind));
  }
  if (kind === 'index') {
    const entries = (response as IndexTemplatesResponse).index_templates ?? [];
    return entries.map((entry) => new IndexTemplate(entry.name, entry.index_template, kind));
  }
  const legacy = response as LegacyTemplatesResponse;
  return Object.keys(legacy).map((name) => new IndexTemplate(name, legacy[name], kind));
}

/** Filters the template list by name and by index pattern. */
export class IndexTemplateFilter {
  constructor(
    public name: string,
    public template: string,
  ) {}

  clone(): IndexTemplateFilter {
    return new IndexTemplateFilter(this.name, this.template);
  }

  getSorting(): (a: IndexTemplate, b: IndexTemplate) => number {
    return (a, b) => a.name.localeCompare(b.name);
  }

  equals(other: IndexTemplateFilter | null): boolean {
    return other !== null && this.name === other.name && this.template === other.template;
  }

  isBlank(): boolean {
    return !notEmpty(this.name) && !notEmpty(this.template);
  }

  matches(template: IndexTemplate): boolean {
    if (this.isBlank()) {
      return true;
    }
    if (notEmpty(this.name) && !template.name.includes(this.name)) {
      return false;
    }
    if (notEmpty(this.template)) {
      // The original read body.template, a field removed in Elasticsearch 7.0
      // and absent from every response OpenSearch returns -- so typing in this
      // box threw rather than filtering.
      return template.patterns.some((pattern) => pattern.includes(this.template));
    }
    return true;
  }
}
