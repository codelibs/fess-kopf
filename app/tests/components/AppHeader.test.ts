import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import AppHeader from '@/components/AppHeader.vue';
import {resetSettingsForTest} from '@/api/settings';
import {probeCapabilities, resetCapabilitiesForTest} from '@/composables/useCapabilities';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {router} from '@/router';
import {okRoutes, stubFetch} from '../api/routes';

function probeRoutes(plugins: string[]): Record<string, unknown> {
  return {
    '/_cat': '=^.^=\n/_cat/health\n',
    '/_nodes/_all/plugins': {
      nodes: {n1: {plugins: plugins.map((name) => ({name}))}},
    },
  };
}

function links(): string[] {
  const wrapper = mount(AppHeader, {global: {plugins: [router]}});
  return wrapper.findAll('nav a').map((a) => a.text());
}

beforeEach(async () => {
  resetSettingsForTest();
  resetCapabilitiesForTest();
  resetClusterForTest();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  await router.push('/cluster');
  await router.isReady();
});

afterEach(() => vi.unstubAllGlobals());

describe('AppHeader navigation', () => {
  it('offers no plugin-backed screen before the cluster has been probed', () => {
    // An absent link is better than one that can only 404.
    expect(links()).not.toContain('query insights');
    expect(links()).not.toContain('k-NN');
    expect(links()).toContain('cluster');
    expect(links()).toContain('tasks');
  });

  it('offers each screen once its plugin is found', async () => {
    stubFetch({routes: probeRoutes(['query-insights', 'opensearch-knn'])});
    await probeCapabilities();

    expect(links()).toContain('query insights');
    expect(links()).toContain('k-NN');
  });

  it('offers only the screens whose plugins are installed', async () => {
    stubFetch({routes: probeRoutes(['opensearch-knn'])});
    await probeCapabilities();

    expect(links()).not.toContain('query insights');
    expect(links()).toContain('k-NN');
  });

  it('offers neither when the plugin probe was denied', async () => {
    stubFetch({
      routes: probeRoutes(['query-insights', 'opensearch-knn']),
      failing: {'/_nodes/_all/plugins': 403},
    });
    await probeCapabilities();

    expect(links()).not.toContain('query insights');
    expect(links()).not.toContain('k-NN');
    // The rest of the navigation is unaffected.
    expect(links()).toContain('cluster');
  });
});

describe('AppHeader Fess document routes', () => {
  it('offers the document screen once the poll has seen fess.search', async () => {
    stubFetch({
      routes: {
        ...okRoutes(),
        '/_aliases': {'test-index': {aliases: {'fess.search': {}, 'fess.update': {}}}},
      },
    });
    await refresh();

    expect(links()).toContain('documents');
  });

  it('does not offer it on a cluster without a Fess document index', async () => {
    stubFetch();
    await refresh();

    expect(links()).not.toContain('documents');
    expect(links()).toContain('cluster');
  });

  it('does not offer it before the first poll', () => {
    expect(links()).not.toContain('documents');
  });
});
