import {notEmpty} from './util';

export interface IndexTemplateBody {
  /** Current field. `template` was removed in Elasticsearch 7.0. */
  index_patterns?: string[];
  /** Legacy single-pattern field, kept for templates created long ago. */
  template?: string;
  [key: string]: unknown;
}

/** One legacy (_template) index template. */
export class IndexTemplate {
  constructor(
    readonly name: string,
    readonly body: IndexTemplateBody,
  ) {}

  /** The patterns this template applies to, whichever field carries them. */
  get patterns(): string[] {
    if (Array.isArray(this.body.index_patterns)) {
      return this.body.index_patterns;
    }
    return typeof this.body.template === 'string' ? [this.body.template] : [];
  }
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
