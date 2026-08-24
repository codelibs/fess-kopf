/**
 * External settings, read from kopf_external_settings.json next to index.html
 * and overlaid with the user's own choices from localStorage.
 *
 * The Angular implementation fetched the file with a synchronous jQuery XHR so
 * that the value was available to the controller that ran immediately after.
 * Here the fetch is awaited once, before the app mounts, which gets the same
 * ordering guarantee without blocking the main thread.
 */
import {resolveSiteFile} from './location';

export interface ExternalSettings {
  /** OpenSearch host override. Only set when kopf is not served by Fess. */
  location: string;
  /** Appended to the host to form the REST root. */
  opensearch_root_path: string;
  with_credentials: boolean;
  refresh_rate: number;
  theme: string;
}

const STORAGE_KEY = 'kopfSettings';

/** Only these may be changed by the user and persisted locally. */
const UPDATABLE = ['refresh_rate', 'theme'] as const;
type Updatable = (typeof UPDATABLE)[number];

const DEFAULTS: ExternalSettings = {
  location: '',
  opensearch_root_path: '',
  with_credentials: false,
  refresh_rate: 5000,
  theme: 'fess',
};

let settings: ExternalSettings = {...DEFAULTS};

function loadLocalOverrides(): Partial<ExternalSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Partial<ExternalSettings>;
    const overrides: Partial<ExternalSettings> = {};
    for (const key of UPDATABLE) {
      if (parsed[key] !== undefined) {
        // Widening to the union of value types; each key is checked above.
        (overrides as Record<Updatable, unknown>)[key] = parsed[key];
      }
    }
    return overrides;
  } catch {
    // A private window, cleared site data, or a browser that blocks storage.
    // Falling back to the shipped defaults is correct in every one of those.
    return {};
  }
}

/**
 * Loads settings. Never rejects: a missing or malformed settings file leaves
 * the defaults in place, which is what lets the bundle boot when Fess has not
 * shipped one. The returned flag lets the caller raise a visible alert.
 */
export async function loadSettings(): Promise<{ok: boolean; error?: string}> {
  let ok = true;
  let error: string | undefined;
  try {
    const response = await fetch(resolveSiteFile('kopf_external_settings.json'), {
      headers: {Accept: 'application/json'},
    });
    if (response.ok) {
      settings = {...DEFAULTS, ...((await response.json()) as Partial<ExternalSettings>)};
    } else {
      ok = false;
      error = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : String(e);
  }
  settings = {...settings, ...loadLocalOverrides()};
  return {ok, error};
}

export function getSettings(): Readonly<ExternalSettings> {
  return settings;
}

export function updateSetting<K extends Updatable>(key: K, value: ExternalSettings[K]): void {
  settings = {...settings, [key]: value};
  try {
    const persisted: Partial<ExternalSettings> = {};
    for (const k of UPDATABLE) {
      persisted[k] = settings[k] as never;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage is unavailable; the change still applies for this page view.
  }
}

/** Test seam: resets module state between cases. */
export function resetSettingsForTest(next: Partial<ExternalSettings> = {}): void {
  settings = {...DEFAULTS, ...next};
}
