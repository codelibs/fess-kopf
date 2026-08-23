import {getProperty, notEmpty} from './util';

/**
 * Settings OpenSearch only accepts when the index is created. Resending one on
 * an update makes the whole _settings call fail, so they are shown but never
 * sent back.
 */
export const STATIC_INDEX_SETTINGS = ['index.codec'];

/**
 * The settings the screen offers, grouped as the tabs present them.
 *
 * Every key was verified against OpenSearch 3.8.0. Keys that answer "unknown
 * setting" are deliberately absent: rendering them as form fields only produced
 * HTTP 400 on save.
 */
export const SETTING_GROUPS: {label: string; settings: string[]}[] = [
  {
    label: 'index',
    settings: [
      'index.number_of_replicas',
      'index.refresh_interval',
      'index.gc_deletes',
      'index.codec',
      'index.auto_expand_replicas',
      'index.compound_format',
    ],
  },
  {
    label: 'block operations',
    settings: [
      'index.blocks.read_only',
      'index.blocks.read',
      'index.blocks.write',
      'index.blocks.metadata',
    ],
  },
  {label: 'translog', settings: ['index.translog.flush_threshold_size']},
  {label: 'routing', settings: ['index.routing.allocation.total_shards_per_node']},
  {
    label: 'slow log',
    settings: [
      'index.search.slowlog.threshold.query.warn',
      'index.search.slowlog.threshold.query.info',
      'index.search.slowlog.threshold.query.debug',
      'index.search.slowlog.threshold.query.trace',
      'index.search.slowlog.threshold.fetch.warn',
      'index.search.slowlog.threshold.fetch.info',
      'index.search.slowlog.threshold.fetch.debug',
      'index.search.slowlog.threshold.fetch.trace',
      'index.indexing.slowlog.threshold.index.warn',
      'index.indexing.slowlog.threshold.index.info',
      'index.indexing.slowlog.threshold.index.debug',
      'index.indexing.slowlog.threshold.index.trace',
    ],
  },
];

/** Flattened, in the order the AngularJS model listed them. */
export const VALID_SETTINGS = SETTING_GROUPS.flatMap((group) => group.settings);

/** The editable view of one index's settings. */
export class EditableIndexSettings {
  readonly values: Record<string, string> = {};

  constructor(settings: Record<string, unknown>) {
    VALID_SETTINGS.forEach((setting) => {
      const value = getProperty<unknown>(settings, setting);
      this.values[setting] = value === undefined || value === null ? '' : String(value);
    });
  }

  /** Only the settings that have a value and are not create-time settings. */
  getUpdatable(): Record<string, string> {
    const updatable: Record<string, string> = {};
    VALID_SETTINGS.forEach((setting) => {
      if (!STATIC_INDEX_SETTINGS.includes(setting) && notEmpty(this.values[setting])) {
        updatable[setting] = this.values[setting];
      }
    });
    return updatable;
  }

  static isStatic(setting: string): boolean {
    return STATIC_INDEX_SETTINGS.includes(setting);
  }
}
