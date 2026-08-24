import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import {NAutoComplete} from 'naive-ui';
import RestView from '@/views/RestView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {chooseInSelect, selectById} from '../support/naive';
import {router} from '@/router';
import {okRoutes, stubFetch} from '../api/routes';

const alerts = useAlerts();

function stubRest(body = '{"hits":{"hits":[]}}', status = 200): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(body, {status}));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

async function mountAt(query: Record<string, string> = {}) {
  await router.push({name: 'rest', query});
  await router.isReady();
  return mount(RestView, {global: {plugins: [router]}});
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  localStorage.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  stubFetch({routes: okRoutes()});
  await refresh();
});

afterEach(() => vi.unstubAllGlobals());

describe('RestView', () => {
  it('refuses an empty path without calling the cluster', async () => {
    const wrapper = await mountAt();
    const fetcher = stubRest();
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe('Path is empty');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends the request and shows the response', async () => {
    const wrapper = await mountAt();
    const fetcher = stubRest('{"count":7}');
    await wrapper.find('#rest-path').setValue('_count');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('#rest-response').exists()).toBe(true));
    expect(String(fetcher.mock.calls[0][0])).toContain('/_count');
    expect(wrapper.find('#rest-response').text()).toContain('"count": 7');
  });

  it('adds a leading slash to the path', async () => {
    const wrapper = await mountAt();
    const fetcher = stubRest();
    await wrapper.find('#rest-path').setValue('idx/_search');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(String(fetcher.mock.calls[0][0])).toContain('/idx/_search');
  });

  it('does not attach a body to a GET, and says so', async () => {
    // fetch() rejects a body on GET outright, where the XHR the AngularJS
    // client used would send it.
    const wrapper = await mountAt();
    const fetcher = stubRest();
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('#rest-body').setValue('{"query":{"match_all":{}}}');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][1]?.body).toBeUndefined();
    expect(alerts.alerts.value.some((a) => a.message.includes('cannot carry a body'))).toBe(true);
  });

  it('attaches the body to a POST', async () => {
    const wrapper = await mountAt();
    const fetcher = stubRest();
    await chooseInSelect(wrapper, 'rest-method', 'POST');
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('#rest-body').setValue('{"query":{"match_all":{}}}');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][1]?.body).toBe('{"query":{"match_all":{}}}');
  });

  it('refuses an unparseable body', async () => {
    const wrapper = await mountAt();
    const fetcher = stubRest();
    await chooseInSelect(wrapper, 'rest-method', 'POST');
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('#rest-body').setValue('{not json');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toContain('Invalid JSON');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows the error body when the cluster refuses', async () => {
    const wrapper = await mountAt();
    stubRest('{"error":"bad request"}', 400);
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Request was not successful');
    expect(wrapper.find('#rest-response').text()).toContain('bad request');
  });

  it('remembers a successful request and can replay it', async () => {
    const wrapper = await mountAt();
    stubRest();
    await chooseInSelect(wrapper, 'rest-method', 'POST');
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('_search'));

    await wrapper.find('#rest-path').setValue('_count');
    const entry = wrapper.findAll('button').find((b) => b.text().includes('POST'));
    await entry!.trigger('click');
    expect((wrapper.find('#rest-path').element as HTMLInputElement).value).toBe('_search');
    expect(selectById(wrapper, 'rest-method').props('value')).toBe('POST');
  });

  it('does not remember a failed request', async () => {
    const wrapper = await mountAt();
    stubRest('{"error":"nope"}', 500);
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain('no requests yet');
  });

  it('warns when explaining a path that asks for no explanation', async () => {
    const wrapper = await mountAt();
    stubRest();
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.findAll('button').find((b) => b.text() === 'explain')!.trigger('click');
    await vi.waitFor(() =>
      expect(alerts.alerts.value.some((a) => a.message.includes('without _explain'))).toBe(true),
    );
  });

  it('renders the explanation tree', async () => {
    const wrapper = await mountAt();
    stubRest(
      JSON.stringify({
        hits: {
          hits: [
            {
              _index: 'idx',
              _id: '1',
              _explanation: {
                value: 2.5,
                description: 'sum of',
                details: [{value: 1.5, description: 'weight(content:fess)'}],
              },
            },
          ],
        },
      }),
    );
    await wrapper.find('#rest-path').setValue('idx/_search?explain=true');
    await wrapper.findAll('button').find((b) => b.text() === 'explain')!.trigger('click');
    await vi.waitFor(() => expect(wrapper.text()).toContain('sum of'));
    expect(wrapper.text()).toContain('weight(content:fess)');
    expect(wrapper.text()).toContain('idx/1');
  });

  it('inserts a query snippet into the body', async () => {
    const wrapper = await mountAt();
    await wrapper.findAll('button').find((b) => b.text() === 'knn')!.trigger('click');
    const body = (wrapper.find('#rest-body').element as HTMLTextAreaElement).value;
    expect(JSON.parse(body).query).toHaveProperty('knn');
  });

  it('starts from the query string when linked to', async () => {
    const wrapper = await mountAt({path: '_cluster/health', method: 'GET'});
    expect((wrapper.find('#rest-path').element as HTMLInputElement).value).toBe('_cluster/health');
  });

  it('offers path suggestions built from the cluster indices', async () => {
    const wrapper = await mountAt();
    await wrapper.find('#rest-path').setValue('test-index/');
    const options = wrapper.findComponent(NAutoComplete).props('options') as string[];
    expect(options).toContain('test-index/_search');
  });

  it('copies a cURL command with the body for a POST', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    const wrapper = await mountAt();
    await chooseInSelect(wrapper, 'rest-method', 'POST');
    await wrapper.find('#rest-path').setValue('_search');
    await wrapper.find('#rest-body').setValue('{"a":1}');
    await wrapper.vm.$nextTick();
    await wrapper.findAll('button').find((b) => b.text() === 'copy as cURL')!.trigger('click');
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const curl = writeText.mock.calls[0][0] as string;
    expect(curl).toContain('-XPOST');
    expect(curl).toContain("-d '{\"a\":1}'");
  });
});
