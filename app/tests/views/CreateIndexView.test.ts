import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import CreateIndexView from '@/views/CreateIndexView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {okRoutes, stubFetch} from '../api/routes';

const alerts = useAlerts();

function stubCreate(status = 200): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      return new Response(status === 200 ? '{"acknowledged":true}' : '{"error":"boom"}', {status});
    }
    if (url.includes('/_cluster/state/metadata/')) {
      return new Response(
        JSON.stringify({
          metadata: {indices: {'test-index': {mappings: {_doc: {}}, settings: {index: {}}}}},
        }),
        {status: 200},
      );
    }
    return new Response('{}', {status: 200});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const putCall = (fetcher: ReturnType<typeof vi.fn>) =>
  fetcher.mock.calls.find((c) => c[1]?.method === 'PUT');

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  stubFetch({routes: okRoutes()});
  await refresh();
});

afterEach(() => vi.unstubAllGlobals());

describe('CreateIndexView', () => {
  it('refuses an empty name without calling the cluster', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe('You must specify a valid index name');
    expect(putCall(fetcher)).toBeUndefined();
  });

  it('refuses a name that is only whitespace', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('   ');
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe('You must specify a valid index name');
    expect(putCall(fetcher)).toBeUndefined();
  });

  it('refuses an unparseable body', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('new-index');
    await wrapper.find('#ci-body').setValue('{not json');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toContain('Invalid JSON');
    expect(putCall(fetcher)).toBeUndefined();
  });

  it('builds the body from the shard and replica boxes when the editor is empty', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('new-index');
    await wrapper.find('#ci-shards').setValue('3');
    await wrapper.find('#ci-replicas').setValue('1');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(putCall(fetcher)).toBeDefined());

    const call = putCall(fetcher)!;
    expect(String(call[0])).toContain('/new-index');
    expect(JSON.parse(call[1]!.body as string)).toEqual({
      settings: {index: {number_of_shards: '3', number_of_replicas: '1'}},
    });
  });

  it('omits a box that was left empty', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('new-index');
    await wrapper.find('#ci-shards').setValue('2');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(putCall(fetcher)).toBeDefined());
    expect(JSON.parse(putCall(fetcher)![1]!.body as string)).toEqual({
      settings: {index: {number_of_shards: '2'}},
    });
  });

  it('sends the editor body verbatim, ignoring the boxes', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('new-index');
    await wrapper.find('#ci-shards').setValue('9');
    await wrapper.find('#ci-body').setValue('{"settings":{"index":{"number_of_shards":"1"}}}');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(putCall(fetcher)).toBeDefined());
    expect(JSON.parse(putCall(fetcher)![1]!.body as string)).toEqual({
      settings: {index: {number_of_shards: '1'}},
    });
  });

  it('copies settings and mappings from a chosen source index', async () => {
    stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-source').setValue('test-index');
    await vi.waitFor(() =>
      expect((wrapper.find('#ci-body').element as HTMLTextAreaElement).value).toContain('settings'),
    );
    const body = JSON.parse((wrapper.find('#ci-body').element as HTMLTextAreaElement).value);
    expect(body).toHaveProperty('settings');
    expect(body).toHaveProperty('mappings');
  });

  it('clears the form after a successful create', async () => {
    const fetcher = stubCreate();
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('new-index');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(putCall(fetcher)).toBeDefined());
    await vi.waitFor(() =>
      expect((wrapper.find('#ci-name').element as HTMLInputElement).value).toBe(''),
    );
  });

  it('reports a failed create and keeps what was typed', async () => {
    const fetcher = stubCreate(400);
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('new-index');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error while creating index');
    expect((wrapper.find('#ci-name').element as HTMLInputElement).value).toBe('new-index');
    expect(putCall(fetcher)).toBeDefined();
  });
});
