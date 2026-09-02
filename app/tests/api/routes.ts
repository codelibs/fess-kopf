import {vi} from 'vitest';
import {emptyStats, health, nodes, nodesStats, state} from '../model/fixtures';

/** Bodies that make a full cluster poll succeed, keyed by request path. */
export function okRoutes(): Record<string, unknown> {
  return {
    '/_cluster/state/master_node,cluster_manager_node,routing_table,blocks/': state(),
    '/_stats/docs,store,indexing,search': emptyStats(),
    '/_nodes/stats/jvm,fs,os,process': nodesStats(),
    '/_cluster/settings': {persistent: {}, transient: {}},
    '/_aliases': {},
    '/_cluster/health': health(),
    '/_nodes/_all/os,jvm': nodes(),
    '/': {name: 'search01', version: {number: '3.8.0'}},
    // The reduced set.
    '/_cluster/state/master_node,cluster_manager_node,blocks?local=true': state(),
    '/_nodes/stats/jvm,fs,os': nodesStats(),
    '/_cluster/settings?local=true': {persistent: {}},
    '/_cluster/health?local=true': health(),
  };
}

export interface StubOptions {
  /** Paths that should fail, mapped to the status to answer with. */
  failing?: Record<string, number>;
  routes?: Record<string, unknown>;
}

/** Replaces fetch with one that answers from a path table. Returns the calls. */
export function stubFetch(options: StubOptions = {}): string[] {
  const routes = options.routes ?? okRoutes();
  const failing = options.failing ?? {};
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = url.replace(/^.*?\/admin\/server_[^/]*/, '') || '/';
      calls.push(path);
      const status = failing[path];
      if (status !== undefined) {
        return new Response(JSON.stringify({error: path}), {status});
      }
      const body = routes[path];
      if (body === undefined) {
        return new Response('not found', {status: 404});
      }
      return new Response(JSON.stringify(body), {status: 200});
    }),
  );
  return calls;
}
