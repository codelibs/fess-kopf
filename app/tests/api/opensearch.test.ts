import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  BROKEN_CLUSTER_PATHS,
  CLUSTER_PATHS,
  ClusterUnavailableError,
  fetchBrokenCluster,
  fetchCluster,
} from '@/api/opensearch';
import {resetSettingsForTest} from '@/api/settings';
import {stubFetch} from './routes';

beforeEach(() => {
  resetSettingsForTest();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('fetchCluster', () => {
  it('issues exactly the eight documented calls', () => {
    const calls = stubFetch();
    return fetchCluster().then(() => {
      expect(calls.sort()).toEqual(Object.values(CLUSTER_PATHS).sort());
    });
  });

  it('builds a cluster from the responses', async () => {
    stubFetch();
    const cluster = await fetchCluster();
    expect(cluster.name).toBe('fess-search');
    expect(cluster.clientName).toBe('search01');
    expect(cluster.version).toBe('3.8.0');
    expect(cluster.nodes).toHaveLength(1);
    expect(cluster.indices.map((i) => i.name)).toEqual(['test-index']);
  });

  it('tolerates cluster settings failing', async () => {
    // Settings are the one response the UI can do without; a denied
    // /_cluster/settings must not blank every screen.
    stubFetch({failing: {[CLUSTER_PATHS.settings]: 403}});
    const cluster = await fetchCluster();
    expect(cluster.settingsAvailable).toBe(false);
    expect(cluster.name).toBe('fess-search');
  });

  it.each([
    ['state', CLUSTER_PATHS.state],
    ['health', CLUSTER_PATHS.health],
    ['nodes', CLUSTER_PATHS.nodes],
    ['index stats', CLUSTER_PATHS.indexStats],
  ])('fails when %s is unavailable', async (_label, path) => {
    stubFetch({failing: {[path]: 500}});
    await expect(fetchCluster()).rejects.toBeInstanceOf(ClusterUnavailableError);
  });

  it('collects every failure rather than only the first', async () => {
    stubFetch({failing: {[CLUSTER_PATHS.state]: 500, [CLUSTER_PATHS.health]: 503}});
    const error = (await fetchCluster().catch((e: unknown) => e)) as ClusterUnavailableError;
    expect(error.causes.map((c) => c.status).sort()).toEqual([500, 503]);
  });

  it('classifies an all-401 failure as an auth failure', async () => {
    stubFetch({
      failing: Object.fromEntries(Object.values(CLUSTER_PATHS).map((path) => [path, 401])),
    });
    const error = (await fetchCluster().catch((e: unknown) => e)) as ClusterUnavailableError;
    expect(error.isAuthFailure).toBe(true);
  });

  it('does not call a failure mixed with a 500 an auth failure', async () => {
    stubFetch({failing: {[CLUSTER_PATHS.state]: 401, [CLUSTER_PATHS.health]: 500}});
    const error = (await fetchCluster().catch((e: unknown) => e)) as ClusterUnavailableError;
    expect(error.isAuthFailure).toBe(false);
  });
});

describe('fetchBrokenCluster', () => {
  it('issues the reduced, local=true set', async () => {
    const calls = stubFetch();
    await fetchBrokenCluster();
    expect(calls.sort()).toEqual(Object.values(BROKEN_CLUSTER_PATHS).sort());
  });

  it('builds the reduced view', async () => {
    stubFetch();
    const cluster = await fetchBrokenCluster();
    expect(cluster.name).toBe('fess-search');
    expect(cluster.indices).toEqual([]);
    expect(cluster.nodes).toHaveLength(1);
  });

  it('tolerates settings failing here too', async () => {
    stubFetch({failing: {[BROKEN_CLUSTER_PATHS.settings]: 403}});
    await expect(fetchBrokenCluster()).resolves.toBeDefined();
  });

  it('fails when health is unavailable', async () => {
    stubFetch({failing: {[BROKEN_CLUSTER_PATHS.health]: 500}});
    await expect(fetchBrokenCluster()).rejects.toBeInstanceOf(ClusterUnavailableError);
  });
});
