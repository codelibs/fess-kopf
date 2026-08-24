import {getProperty, isDefined} from './util';

export interface MappingField {
  type?: string;
  path?: string;
  fields?: Record<string, MappingField>;
  properties?: Record<string, MappingField>;
}

export interface IndexMetadataResponse {
  mappings: Record<string, {properties?: Record<string, MappingField>}>;
  settings: Record<string, unknown>;
}

/** Types _analyze cannot tokenise. */
const NOT_ANALYZABLE = ['float', 'double', 'byte', 'short', 'integer', 'long', 'nested', 'object'];

function isAnalyzable(type: string): boolean {
  return !NOT_ANALYZABLE.includes(type);
}

const byName = (a: string, b: string): number => a.localeCompare(b);

/**
 * An index's mappings and settings, as the analysis screen consumes them.
 * Ported from src/kopf/opensearch/index_metadata.js.
 */
export class IndexMetadata {
  readonly mappings: IndexMetadataResponse['mappings'];
  readonly settings: Record<string, unknown>;

  constructor(
    readonly index: string,
    metadata: IndexMetadataResponse,
  ) {
    this.mappings = metadata.mappings;
    this.settings = metadata.settings;
  }

  /**
   * The mapping type names.
   *
   * On a typeless index this is the single '_doc' key, which is what
   * OpenSearch returns; presenting it as a type is a limitation carried over
   * from the AngularJS screen, not something introduced here.
   */
  getTypes(): string[] {
    return Object.keys(this.mappings).sort(byName);
  }

  /**
   * Analyzer names. Reads the nested settings tree first, then falls back to
   * flattened `index.analysis.analyzer.<name>.…` keys, which is the shape
   * ?flat_settings would produce.
   */
  getAnalyzers(): string[] {
    const nested = Object.keys(
      getProperty<Record<string, unknown>>(this.settings, 'index.analysis.analyzer', {}),
    );
    if (nested.length > 0) {
      return nested.sort(byName);
    }

    const prefix = 'index.analysis.analyzer.';
    const flattened: string[] = [];
    Object.keys(this.settings).forEach((setting) => {
      if (!setting.startsWith('index.analysis.analyzer')) {
        return;
      }
      const rest = setting.substring(prefix.length);
      const name = rest.substring(0, rest.indexOf('.'));
      if (!flattened.includes(name)) {
        flattened.push(name);
      }
    });
    return flattened.sort(byName);
  }

  /** Analyzable field paths under one mapping type. */
  getFields(type: string): string[] {
    const mapping = this.mappings[type];
    const fields = isDefined(mapping) ? this.getProperties('', mapping.properties) : [];
    return fields.sort(byName);
  }

  getProperties(parent: string, fields: Record<string, MappingField> | undefined): string[] {
    const prefix = parent !== '' ? `${parent}.` : '';
    const valid: string[] = [];
    Object.entries(fields ?? {}).forEach(([name, field]) => {
      // Multi-fields: 'just_name' means the sub-field is addressed without
      // its parent's path.
      if (isDefined(field.fields)) {
        const multiPrefix = field.path !== 'just_name' ? prefix + name : prefix;
        valid.push(...this.getProperties(multiPrefix, field.fields));
      }
      // Containers carry no analyzable value of their own; recurse instead.
      if (field.type === 'nested' || field.type === 'object' || !isDefined(field.type)) {
        valid.push(...this.getProperties(prefix + name, field.properties));
      }
      if (isDefined(field.type) && isAnalyzable(field.type!)) {
        valid.push(prefix + name);
      }
    });
    return valid;
  }
}

/** One token from an _analyze response. */
export class Token {
  constructor(
    readonly token: string,
    readonly start_offset: number,
    readonly end_offset: number,
    readonly position: number,
  ) {}
}
