import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RequestError, request, requestAll, restRoot} from '@/api/client';
import {resetSettingsForTest} from '@/api/settings';

function at(href: string): void {
  window.history.replaceState({}, '', href);
}

function respondWith(init: {status?: number; statusText?: string; body?: string}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(init.body ?? '', {
        status: init.status ?? 200,
        statusText: init.statusText ?? '',
      }),
    ),
  );
}

beforeEach(() => {
  resetSettingsForTest();
  at('/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('restRoot', () => {
  it('derives the proxy prefix from where the page is served', () => {
    expect(restRoot()).toBe(`${window.location.origin}/admin/server_tok`);
  });

  it('lets the settings file override it, which is how dev mode reaches a cluster', () => {
    resetSettingsForTest({location: 'http://localhost:9200'});
    expect(restRoot()).toBe('http://localhost:9200');
  });

  it('appends opensearch_root_path', () => {
    resetSettingsForTest({location: 'http://es.example', opensearch_root_path: '/search'});
    expect(restRoot()).toBe('http://es.example/search');
  });

  it('does not double the slash when the override has a trailing one', () => {
    resetSettingsForTest({location: 'http://es.example/'});
    expect(restRoot()).toBe('http://es.example');
  });
});

describe('request', () => {
  it('parses a JSON response', async () => {
    respondWith({body: '{"cluster_name":"fess-search"}'});
    await expect(request('/')).resolves.toEqual({cluster_name: 'fess-search'});
  });

  it('hands back plain text when the body is not JSON', async () => {
    // _cat without format=json, or an HTML error page from an intermediary.
    respondWith({body: 'green open fess.search'});
    await expect(request('/_cat/indices')).resolves.toBe('green open fess.search');
  });

  it('carries the HTTP status on failure', async () => {
    // The Angular client passed one argument to a handler expecting
    // (error, status), so every failure reached the UI as an unlabelled one.
    respondWith({status: 400, statusText: 'Bad Request', body: '{"error":"nope"}'});
    const error = await request('/_nodes/stats?all=true').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).status).toBe(400);
    expect((error as RequestError).body).toEqual({error: 'nope'});
  });

  it.each([401, 403])('marks %i as an authentication failure', async (status) => {
    respondWith({status, body: ''});
    const error = (await request('/').catch((e: unknown) => e)) as RequestError;
    expect(error.isAuthFailure).toBe(true);
    expect(error.isUnreachable).toBe(false);
  });

  it('reports a transport failure as status 0 rather than swallowing it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    const error = (await request('/').catch((e: unknown) => e)) as RequestError;
    expect(error.status).toBe(0);
    expect(error.isUnreachable).toBe(true);
  });

  it('never puts request headers into the error it throws', async () => {
    // opensearch.js handed the whole request config to the alert service,
    // which rendered the Authorization header -- credentials included.
    respondWith({status: 500, body: '{"error":"boom"}'});
    const error = (await request('/', {
      method: 'PUT',
      body: {any: 'thing'},
    }).catch((e: unknown) => e)) as RequestError;
    const serialised = JSON.stringify({
      message: error.message,
      body: error.body,
      ...Object.fromEntries(Object.entries(error)),
    });
    expect(serialised.toLowerCase()).not.toContain('authorization');
    expect(serialised.toLowerCase()).not.toContain('content-type');
    // Structural too: a Headers instance serialises to {}, so the string check
    // above would pass vacuously if someone added one to the error.
    expect(Object.keys(error).sort()).toEqual(
      ['body', 'method', 'name', 'path', 'status', 'statusText'],
    );
  });

  it('propagates an abort without dressing it up as a request failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    }));
    await expect(request('/')).rejects.toBeInstanceOf(DOMException);
  });
});

describe('requestAll', () => {
  it('reports each call separately so one failure cannot blank the screen', async () => {
    // $q.all rejected the whole batch, leaving cluster undefined and the page
    // empty -- every few seconds, because the poll kept re-running.
    const results = await requestAll({
      ok: Promise.resolve({value: 1}),
      bad: Promise.reject(new RequestError(500, 'Server Error', null, 'GET', '/_cluster/health')),
    });
    expect(results.ok.value).toEqual({value: 1});
    expect(results.ok.error).toBeUndefined();
    expect(results.bad.value).toBeUndefined();
    expect(results.bad.error?.status).toBe(500);
  });

  it('never rejects, even when every call fails', async () => {
    const results = await requestAll({
      a: Promise.reject(new Error('one')),
      b: Promise.reject(new Error('two')),
    });
    expect(results.a.error).toBeInstanceOf(RequestError);
    expect(results.b.error).toBeInstanceOf(RequestError);
  });
});
