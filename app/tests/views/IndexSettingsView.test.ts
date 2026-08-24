import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import IndexSettingsView from '@/views/IndexSettingsView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {router} from '@/router';

const alerts = useAlerts();

const METADATA = {
  metadata: {
    indices: {
      'idx-a': {
        mappings: {},
        settings: {
          index: {number_of_replicas: 1, refresh_interval: '1s', codec: 'best_compression'},
        },
      },
    },
  },
};

function stubMetadata(): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      return new Response('{"acknowledged":true}', {status: 200});
    }
    return new Response(JSON.stringify(METADATA), {status: 200});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

async function mountFor(index: string | undefined) {
  await router.push({name: 'indexSettings', query: index === undefined ? {} : {index}});
  await router.isReady();
  const wrapper = mount(IndexSettingsView, {global: {plugins: [router]}});
  await vi.waitFor(() => expect(wrapper.text()).not.toBe(''));
  return wrapper;
}

beforeEach(() => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('IndexSettingsView', () => {
  it('loads the index named in the query string', async () => {
    const fetcher = stubMetadata();
    const wrapper = await mountFor('idx-a');
    await vi.waitFor(() => expect(wrapper.text()).toContain('settings for idx-a'));
    expect(fetcher.mock.calls[0][0]).toContain('/_cluster/state/metadata/idx-a');
  });

  it('fills the fields from the index settings', async () => {
    stubMetadata();
    const wrapper = await mountFor('idx-a');
    await vi.waitFor(() => expect(wrapper.find('#index\\.number_of_replicas').exists()).toBe(true));
    const replicas = wrapper.find('#index\\.number_of_replicas').element as HTMLInputElement;
    expect(replicas.value).toBe('1');
  });

  it('marks a create-time setting read-only', async () => {
    stubMetadata();
    const wrapper = await mountFor('idx-a');
    await vi.waitFor(() => expect(wrapper.find('#index\\.codec').exists()).toBe(true));
    const codec = wrapper.find('#index\\.codec').element as HTMLInputElement;
    expect(codec.value).toBe('best_compression');
    expect(codec.readOnly).toBe(true);
  });

  it('saves only the updatable settings, leaving index.codec out', async () => {
    const fetcher = stubMetadata();
    const wrapper = await mountFor('idx-a');
    await vi.waitFor(() => expect(wrapper.find('#index\\.refresh_interval').exists()).toBe(true));
    await wrapper.find('#index\\.refresh_interval').setValue('30s');
    await wrapper.findAll('button').find((b) => b.text() === 'save')!.trigger('click');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true),
    );

    const put = fetcher.mock.calls.find((c) => c[1]?.method === 'PUT')!;
    expect(String(put[0])).toContain('/idx-a/_settings');
    const body = JSON.parse(put[1]!.body as string);
    expect(body).not.toHaveProperty('index.codec');
    expect(body['index.refresh_interval']).toBe('30s');
    expect(body['index.number_of_replicas']).toBe('1');
  });

  it('switches between the setting groups', async () => {
    stubMetadata();
    const wrapper = await mountFor('idx-a');
    await vi.waitFor(() => expect(wrapper.find('#index\\.number_of_replicas').exists()).toBe(true));
    expect(wrapper.find('#index\\.blocks\\.read_only').exists()).toBe(false);
    await wrapper.findAll('button').find((b) => b.text() === 'block operations')!.trigger('click');
    expect(wrapper.find('#index\\.blocks\\.read_only').exists()).toBe(true);
  });

  it('reports a failed load naming the index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 404})),
    );
    await mountFor('missing');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error while loading index settings for [missing]');
  });

  it('says so when no index was given', async () => {
    stubMetadata();
    await mountFor(undefined);
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('No index was given');
  });

  it('reports a failed save', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? new Response('{"error":"boom"}', {status: 400})
        : new Response(JSON.stringify(METADATA), {status: 200}),
    );
    vi.stubGlobal('fetch', fetcher);
    const wrapper = await mountFor('idx-a');
    await vi.waitFor(() => expect(wrapper.find('#index\\.refresh_interval').exists()).toBe(true));
    await wrapper.findAll('button').find((b) => b.text() === 'save')!.trigger('click');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error while updating index settings');
  });
});
