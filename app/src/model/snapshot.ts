import {t} from '@/i18n';
import {notEmpty} from './util';

/** Repository settings offered per type, in the order the form shows them. */
export const REPOSITORY_SETTINGS: Record<string, string[]> = {
  fs: ['location', 'chunk_size', 'max_restore_bytes_per_sec', 'max_snapshot_bytes_per_sec',
    'compress'],
  url: ['url'],
  s3: ['client', 'region', 'bucket', 'base_path', 'access_key', 'secret_key', 'chunk_size',
    'max_retries', 'compress', 'server_side_encryption'],
  hdfs: ['uri', 'path', 'load_defaults', 'conf_location', 'concurrent_streams', 'compress',
    'chunk_size'],
  azure: ['client', 'container', 'base_path', 'concurrent_streams', 'chunk_size', 'compress'],
};

/** Settings without which the repository cannot be registered. */
const REQUIRED_SETTINGS: Record<string, string[]> = {
  fs: ['location'],
  url: ['url'],
  s3: ['bucket'],
  hdfs: ['path'],
};

export const REPOSITORY_TYPES = Object.keys(REPOSITORY_SETTINGS);

/** A snapshot repository, as the form edits it. */
export class Repository {
  type: string;
  settings: Record<string, string>;

  constructor(
    public name: string,
    info: {type?: string; settings?: Record<string, string>},
  ) {
    this.type = info.type ?? '';
    this.settings = info.settings ?? {};
  }

  /** Throws with the message the screen shows. */
  validate(): void {
    if (!notEmpty(this.name)) {
      throw new Error(t('snapshot.nameRequired'));
    }
    if (!notEmpty(this.type)) {
      throw new Error(t('snapshot.typeRequired'));
    }
    (REQUIRED_SETTINGS[this.type] ?? []).forEach((setting) => {
      if (!notEmpty(this.settings[setting])) {
        throw new Error(t('snapshot.settingRequired', {setting, type: this.type}));
      }
    });
  }

  /** Only the settings this type recognises, and only those with a value. */
  getSettings(available: string[]): Record<string, string> {
    const settings: Record<string, string> = {};
    available.forEach((setting) => {
      if (notEmpty(this.settings[setting])) {
        settings[setting] = this.settings[setting];
      }
    });
    return settings;
  }

  asJson(): string {
    const json: Record<string, unknown> = {type: this.type};
    const available = REPOSITORY_SETTINGS[this.type];
    if (available !== undefined) {
      json.settings = this.getSettings(available);
    }
    return JSON.stringify(json);
  }
}

export interface SnapshotInfo {
  snapshot: string;
  indices?: string[];
  state?: string;
  start_time?: string;
  start_time_in_millis?: number;
  end_time?: string;
  end_time_in_millis?: number;
  duration_in_millis?: number;
  failures?: unknown[];
  shards?: Record<string, number>;
}

/** One snapshot in a repository. */
export class Snapshot {
  readonly name: string;
  readonly indices: string[];
  readonly state: string | undefined;
  readonly start_time: string | undefined;
  readonly end_time: string | undefined;
  readonly duration_in_millis: number | undefined;
  readonly failures: unknown[];
  readonly shards: Record<string, number> | undefined;

  constructor(info: SnapshotInfo) {
    this.name = info.snapshot;
    this.indices = info.indices ?? [];
    this.state = info.state;
    this.start_time = info.start_time;
    this.end_time = info.end_time;
    this.duration_in_millis = info.duration_in_millis;
    this.failures = info.failures ?? [];
    this.shards = info.shards;
  }
}

/** Filters the snapshot list by name substring, case-insensitively. */
export class SnapshotFilter {
  constructor(public name: string) {}

  clone(): SnapshotFilter {
    return new SnapshotFilter(this.name);
  }

  getSorting(): (a: Snapshot, b: Snapshot) => number {
    return (a, b) => a.name.localeCompare(b.name);
  }

  equals(other: SnapshotFilter | null): boolean {
    return other !== null && this.name === other.name;
  }

  isBlank(): boolean {
    return !notEmpty(this.name);
  }

  matches(snapshot: Snapshot): boolean {
    return this.isBlank() || snapshot.name.toLowerCase().includes(this.name.toLowerCase());
  }
}
