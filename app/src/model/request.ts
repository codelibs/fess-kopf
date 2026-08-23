import {getTimeString} from './util';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'];

interface StoredRequest {
  /** Older entries stored a full URL rather than a path. */
  url?: string;
  path?: string;
  method?: string;
  body?: string;
  timestamp?: string;
}

/** One REST request, as issued and as remembered. */
export class Request {
  timestamp: string;

  constructor(
    public path = '',
    public method: HttpMethod = 'GET',
    public body = '{}',
    timestamp?: string,
  ) {
    this.timestamp = timestamp ?? getTimeString(new Date());
  }

  equals(other: Request): boolean {
    return (
      this.path === other.path &&
      this.method.toUpperCase() === other.method.toUpperCase() &&
      this.body === other.body
    );
  }

  /**
   * Rebuilds a remembered request.
   *
   * History written by older versions stored `url` -- a full
   * http://host/path string -- so the path is recovered from it.
   */
  static fromJSON(json: StoredRequest): Request {
    let path = json.path ?? '';
    if (json.url !== undefined) {
      const withoutScheme = json.url.substring(json.url.indexOf('://') + 3);
      const slash = withoutScheme.indexOf('/');
      path = slash >= 0 ? withoutScheme.substring(slash) : '';
    }
    const method = (json.method ?? 'GET').toUpperCase() as HttpMethod;
    return new Request(path, method, json.body ?? '{}', json.timestamp);
  }
}

const HISTORY_KEY = 'kopf_request_history';
const HISTORY_LIMIT = 30;

/** Reads the remembered requests. A malformed store is discarded, not thrown. */
export function loadHistory(): Request[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredRequest[];
    return Array.isArray(parsed) ? parsed.map((entry) => Request.fromJSON(entry)) : [];
  } catch {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Storage is unavailable; nothing to clean up.
    }
    return [];
  }
}

/** Adds a request to the front, ignoring an exact repeat. Keeps 30. */
export function rememberRequest(history: Request[], request: Request): Request[] {
  if (history.some((entry) => entry.equals(request))) {
    return history;
  }
  const next = [request, ...history].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Storage is unavailable; the list still applies for this page view.
  }
  return next;
}
