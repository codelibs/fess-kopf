import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import App from '@/App.vue';
import {resetSettingsForTest} from '@/api/settings';
import {
  probeCapabilities,
  resetCapabilitiesForTest,
  useCapabilities,
} from '@/composables/useCapabilities';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {router} from '@/router';
import {okRoutes, stubFetch} from './api/routes';

function probeRoutes(): Record<string, unknown> {
  return {
    ...okRoutes(),
    '/_cat': '=^.^=\n/_cat/health\n/_cat/thread_pool\n',
    '/_nodes/_all/plugins': {nodes: {n1: {plugins: [{name: 'opensearch-knn'}]}}},
  };
}

beforeEach(async () => {
  resetSettingsForTest();
  resetCapabilitiesForTest();
  resetClusterForTest();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  await router.push('/cluster');
  await router.isReady();
});

afterEach(() => {
  resetClusterForTest();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('probes the cluster once the first poll has connected', async () => {
    // The first render can precede the cluster's first response, so the mount
    // probe may find nothing; the watch on `connected` is what recovers.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    mount(App, {global: {plugins: [router]}});
    await probeCapabilities();
    expect(useCapabilities().probed.value).toBe(false);

    stubFetch({routes: probeRoutes()});
    await refresh();
    await vi.waitFor(() => expect(useCapabilities().probed.value).toBe(true));

    expect(useCapabilities().catApis.value).toEqual(['health', 'thread_pool']);
  });
});
