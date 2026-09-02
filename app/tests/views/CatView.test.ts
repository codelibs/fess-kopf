import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import CatView from '@/views/CatView.vue';
import {CAT_APIS} from '@/api/opensearch';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {probeCapabilities, resetCapabilitiesForTest} from '@/composables/useCapabilities';
import {stubFetch} from '../api/routes';
import {chooseInSelect, optionValues} from '../support/naive';

const alerts = useAlerts();

const ALIASES = [
  'alias             index                       filter',
  'fess.search       fess.20260101               -     ',
  '',
].join('\n');

/** The default columns _cat/thread_pool answers with on 2.19.1 and 3.8.0. */
const THREAD_POOL = [
  'node_name name        active queue rejected',
  'search01  write            0     0        0',
  '',
].join('\n');

function stubCat(body: string, status = 200): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(body, {status}));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(() => {
  resetSettingsForTest();
  resetCapabilitiesForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('CatView', () => {
  it('offers the shipped API list before the cluster has been probed', () => {
    const wrapper = mount(CatView);
    expect(optionValues(wrapper, 'cat-api')).toEqual([...CAT_APIS]);
  });

  it('offers what the cluster publishes once it has been probed', async () => {
    stubFetch({
      routes: {
        '/_cat': '=^.^=\n/_cat/health\n/_cat/thread_pool\n/_cat/shards/{index}\n',
        '/_nodes/_all/plugins': {nodes: {}},
      },
    });
    await probeCapabilities();

    const wrapper = mount(CatView);
    expect(optionValues(wrapper, 'cat-api')).toEqual(['health', 'thread_pool']);
  });

  it('can run an API that is not in the shipped list', async () => {
    stubFetch({
      routes: {
        '/_cat': '=^.^=\n/_cat/thread_pool\n',
        '/_nodes/_all/plugins': {nodes: {}},
        '/_cat/thread_pool?v': THREAD_POOL,
      },
    });
    await probeCapabilities();

    const wrapper = mount(CatView);
    await chooseInSelect(wrapper, 'cat-api', 'thread_pool');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(wrapper.findAll('thead th').map((h) => h.text())).toEqual([
      'node_name',
      'name',
      'active',
      'queue',
      'rejected',
    ]);
  });

  it('refuses to run without an API and does not call the cluster', async () => {
    const fetcher = stubCat(ALIASES);
    const wrapper = mount(CatView);
    await wrapper.find('form').trigger('submit');
    expect(fetcher).not.toHaveBeenCalled();
    expect(alerts.alerts.value[0].message).toBe('You must select an API');
  });

  it('requests the selected API with ?v and renders the table', async () => {
    const fetcher = stubCat(ALIASES);
    const wrapper = mount(CatView);
    await chooseInSelect(wrapper, 'cat-api', 'aliases');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(fetcher.mock.calls[0][0]).toContain('/_cat/aliases?v');
    expect(wrapper.findAll('thead th').map((h) => h.text())).toEqual([
      'alias',
      'index',
      'filter',
    ]);
    expect(wrapper.findAll('tbody td').map((d) => d.text())).toEqual([
      'fess.search',
      'fess.20260101',
      '-',
    ]);
  });

  it('reports a failure and clears any previous result', async () => {
    stubCat(ALIASES);
    const wrapper = mount(CatView);
    await chooseInSelect(wrapper, 'cat-api', 'aliases');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    stubCat('{"error":"boom"}', 500);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));

    expect(wrapper.find('table').exists()).toBe(false);
    expect(alerts.alerts.value[0].message).toBe('Error while fetching data');
    expect(alerts.alerts.value[0].response).toEqual({error: 'boom'});
  });

  it('says so when the API answers with no rows', async () => {
    stubCat('epoch      timestamp count\n');
    const wrapper = mount(CatView);
    await chooseInSelect(wrapper, 'cat-api', 'count');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('no data available'));
  });
});
