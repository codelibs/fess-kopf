import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {CAT_APIS} from '@/api/opensearch';
import {resetSettingsForTest} from '@/api/settings';
import {
  hasCat,
  hasPlugin,
  probeCapabilities,
  resetCapabilitiesForTest,
  useCapabilities,
} from '@/composables/useCapabilities';
import {stubFetch} from '../api/routes';

const PROBE_ROUTES = {
  '/_cat': '=^.^=\n/_cat/health\n/_cat/thread_pool\n',
  '/_nodes/_all/plugins': {nodes: {a: {plugins: [{name: 'opensearch-knn'}]}}},
};

beforeEach(() => {
  resetSettingsForTest();
  resetCapabilitiesForTest();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('probeCapabilities', () => {
  it('asks the cluster once and records what it found', async () => {
    const calls = stubFetch({routes: PROBE_ROUTES});
    await probeCapabilities();

    expect(calls.sort()).toEqual(['/_cat', '/_nodes/_all/plugins']);
    expect(useCapabilities().probed.value).toBe(true);
    expect(hasCat('thread_pool')).toBe(true);
    expect(hasPlugin('opensearch-knn')).toBe(true);
    expect(hasPlugin('query-insights')).toBe(false);
  });

  it('does not ask twice', async () => {
    const calls = stubFetch({routes: PROBE_ROUTES});
    await probeCapabilities();
    await probeCapabilities();
    expect(calls).toHaveLength(2);
  });

  it('shares one probe between concurrent callers', async () => {
    const calls = stubFetch({routes: PROBE_ROUTES});
    await Promise.all([probeCapabilities(), probeCapabilities()]);
    expect(calls).toHaveLength(2);
  });

  it('falls back to the shipped CAT list when GET /_cat fails', async () => {
    stubFetch({routes: PROBE_ROUTES, failing: {'/_cat': 403}});
    await probeCapabilities();

    expect(useCapabilities().catApis.value).toEqual([...CAT_APIS]);
    // The two halves are independent: the plugin probe still answered.
    expect(hasPlugin('opensearch-knn')).toBe(true);
  });

  it('reports no plugins when that probe fails, hiding what depends on them', async () => {
    stubFetch({routes: PROBE_ROUTES, failing: {'/_nodes/_all/plugins': 403}});
    await probeCapabilities();

    expect(hasPlugin('opensearch-knn')).toBe(false);
    expect(hasCat('thread_pool')).toBe(true);
  });

  it('tries again after a cluster that could not be reached', async () => {
    // kopf's first render can precede the cluster's first response. Marking
    // the probe done there would hide the plugin screens for the life of the
    // page.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await probeCapabilities();
    expect(useCapabilities().probed.value).toBe(false);
    expect(hasPlugin('opensearch-knn')).toBe(false);

    const calls = stubFetch({routes: PROBE_ROUTES});
    await probeCapabilities();

    expect(useCapabilities().probed.value).toBe(true);
    expect(hasPlugin('opensearch-knn')).toBe(true);
    expect(calls.sort()).toEqual(['/_cat', '/_nodes/_all/plugins']);
  });

  it('does not try again after a denial, which is an answer', async () => {
    const calls = stubFetch({
      routes: PROBE_ROUTES,
      failing: {'/_cat': 403, '/_nodes/_all/plugins': 403},
    });
    await probeCapabilities();
    expect(useCapabilities().probed.value).toBe(true);

    await probeCapabilities();
    expect(calls).toHaveLength(2);
  });

  it('reports the shipped CAT list before anything has been probed', () => {
    expect(useCapabilities().catApis.value).toEqual([...CAT_APIS]);
    expect(useCapabilities().probed.value).toBe(false);
    expect(hasPlugin('opensearch-knn')).toBe(false);
  });

  it('offers the CAT list as select options, in the order it came back', async () => {
    stubFetch({routes: PROBE_ROUTES});
    await probeCapabilities();

    expect(useCapabilities().catApiOptions.value).toEqual([
      {label: 'health', value: 'health'},
      {label: 'thread_pool', value: 'thread_pool'},
    ]);
  });
});
