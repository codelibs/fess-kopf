import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import CatView from '@/views/CatView.vue';
import {CAT_APIS} from '@/api/opensearch';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';

const alerts = useAlerts();

const ALIASES = [
  'alias             index                       filter',
  'fess.search       fess.20260101               -     ',
  '',
].join('\n');

function stubCat(body: string, status = 200): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(body, {status}));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(() => {
  resetSettingsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('CatView', () => {
  it('offers exactly the shipped API list', () => {
    const wrapper = mount(CatView);
    const options = wrapper.findAll('option').map((o) => o.attributes('value'));
    expect(options).toEqual(['', ...CAT_APIS]);
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
    await wrapper.find('select').setValue('aliases');
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
    await wrapper.find('select').setValue('aliases');
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
    await wrapper.find('select').setValue('count');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('no data available'));
  });
});
