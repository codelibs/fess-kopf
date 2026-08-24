import {getSettings} from './settings';
import {searchEngineBaseUrl} from './location';

/**
 * An HTTP failure that carries its status. The Angular client dropped the
 * status on the floor (clusterRequest passed one argument to a handler that
 * expected two), which made every failure look identical to the UI.
 */
export class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: unknown,
    readonly method: string,
    readonly path: string,
  ) {
    super(RequestError.describe(status, statusText, method, path));
    this.name = 'RequestError';
  }

  private static describe(
    status: number,
    statusText: string,
    method: string,
    path: string,
  ): string {
    if (status === 0) {
      return `${method} ${path} did not reach the server`;
    }
    if (status === 401) {
      return `${method} ${path} was rejected: not authenticated (401)`;
    }
    if (status === 403) {
      return `${method} ${path} was rejected: not authorised (403)`;
    }
    return `${method} ${path} failed with ${status} ${statusText}`.trimEnd();
  }

  /** True when re-authenticating with Fess is what the user needs to do. */
  get isAuthFailure(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** True when the request never got an HTTP response at all. */
  get isUnreachable(): boolean {
    return this.status === 0;
  }
}

/**
 * Base URL for REST calls. Precedence matches the Angular implementation:
 * an explicit `location` in the settings file wins (that is how `vite dev`
 * reaches a cluster), otherwise it is derived from where this page is served
 * from, and `opensearch_root_path` is appended in both cases.
 */
export function restRoot(): string {
  const settings = getSettings();
  const configured = settings.location.trim();
  const host = configured !== '' ? configured : (searchEngineBaseUrl() ?? window.location.origin);
  return `${host.replace(/\/$/, '')}${settings.opensearch_root_path}`;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Issues one REST call and parses the response as JSON.
 *
 * Note what is deliberately absent: request headers are never attached to the
 * thrown error. The Angular version handed the whole request config to the
 * alert service, which put the Authorization header -- credentials included --
 * on screen.
 */
export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const url = `${restRoot()}${path}`;
  const init: RequestInit = {
    method,
    signal: options.signal,
    // Same-origin under Fess, so the session cookie rides along by default.
    // `with_credentials` only matters when `location` points elsewhere.
    credentials: getSettings().with_credentials ? 'include' : 'same-origin',
  };
  if (options.body !== undefined) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    init.headers = {'Content-Type': 'application/json'};
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw e;
    }
    throw new RequestError(0, '', e instanceof Error ? e.message : String(e), method, path);
  }

  const text = await response.text();
  const parsed = parseJson(text);
  if (!response.ok) {
    throw new RequestError(response.status, response.statusText, parsed, method, path);
  }
  return parsed as T;
}

function parseJson(text: string): unknown {
  if (text === '') {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    // OpenSearch answers _cat without format=json as plain text, and error
    // pages from an intermediary are HTML. Hand back what arrived.
    return text;
  }
}

export interface Settled<T> {
  value?: T;
  error?: RequestError;
}

/**
 * Runs requests together and reports each outcome separately, so one failing
 * call cannot blank the whole screen. The Angular version used $q.all, where a
 * single rejection left `cluster` undefined and the page empty -- repeatedly,
 * because the poll re-ran every few seconds.
 */
export async function requestAll<T extends Record<string, Promise<unknown>>>(
  requests: T,
): Promise<{[K in keyof T]: Settled<Awaited<T[K]>>}> {
  const keys = Object.keys(requests) as (keyof T)[];
  const results = await Promise.allSettled(keys.map((k) => requests[k]));
  const out = {} as {[K in keyof T]: Settled<Awaited<T[K]>>};
  keys.forEach((key, i) => {
    const result = results[i];
    out[key] =
      result.status === 'fulfilled'
        ? {value: result.value as Awaited<T[typeof key]>}
        : {error: asRequestError(result.reason)};
  });
  return out;
}

function asRequestError(reason: unknown): RequestError {
  if (reason instanceof RequestError) {
    return reason;
  }
  const message = reason instanceof Error ? reason.message : String(reason);
  return new RequestError(0, '', message, 'GET', '');
}
