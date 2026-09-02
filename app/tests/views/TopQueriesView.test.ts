import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import TopQueriesView from '@/views/TopQueriesView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {resetDialogsForTest, useDialogs} from '@/composables/useDialogs';
import {chooseInSelect} from '../support/naive';

const alerts = useAlerts();
const dialogs = useDialogs();

const SOURCE = {query: {match: {content: 'fess'}}};

const TOP_QUERIES = {
  top_queries: [
    {
      id: 'slow',
      timestamp: 1788355136118,
      indices: ['fess.20260902'],
      search_type: 'query_then_fetch',
      total_shards: 5,
      node_id: 'n1',
      source: SOURCE,
      measurements: {
        latency: {number: 480},
        cpu: {number: 35695708},
        memory: {number: 11537856},
      },
    },
    {
      id: 'quick',
      timestamp: 1788355136000,
      indices: ['fess.20260902'],
      search_type: 'query_then_fetch',
      total_shards: 5,
      node_id: 'n1',
      source: SOURCE,
      measurements: {latency: {number: 12}, cpu: {number: 99999999}, memory: {number: 1024}},
    },
  ],
};

function stubTopQueries(body: unknown = TOP_QUERIES): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(body), {status: 200}));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(() => {
  resetSettingsForTest();
  resetDialogsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('TopQueriesView', () => {
  it('asks for latency first and ranks the slowest query at the top', async () => {
    const fetcher = stubTopQueries();
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(String(fetcher.mock.calls[0][0])).toContain('/_insights/top_queries?type=latency');
    const measurements = wrapper
      .findAll('tbody tr td:nth-child(2)')
      .map((cell) => cell.text());
    expect(measurements).toEqual(['480 ms', '12 ms']);
  });

  it('re-ranks when the measurement changes, and asks the cluster again', async () => {
    const fetcher = stubTopQueries();
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    await chooseInSelect(wrapper, 'tq-metric', 'cpu');
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some((call) => String(call[0]).includes('type=cpu')),
      ).toBe(true),
    );
    await vi.waitFor(() =>
      expect(wrapper.findAll('tbody tr td:nth-child(2)')[0].text()).toBe('100.0 ms'),
    );
  });

  it('shows the query DSL the cluster recorded', async () => {
    stubTopQueries();
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    await wrapper.findAll('tbody tr')[0].find('button').trigger('click');
    expect(dialogs.infoRequest.value?.content).toEqual(SOURCE);
  });

  it('explains an empty listing instead of leaving it blank', async () => {
    // 2.19.1 records nothing until the setting is enabled, so empty is
    // ambiguous and the screen has to say which setting to look at.
    stubTopQueries({top_queries: []});
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('.k-empty').exists()).toBe(true));

    expect(wrapper.find('.k-empty').text()).toContain('no queries recorded');
    expect(wrapper.find('.k-empty').text()).toContain(
      'search.insights.top_queries.latency.enabled',
    );
  });

  it('names the setting for the measurement being shown', async () => {
    stubTopQueries({top_queries: []});
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('.k-empty').exists()).toBe(true));

    await chooseInSelect(wrapper, 'tq-metric', 'memory');
    await vi.waitFor(() =>
      expect(wrapper.find('.k-empty').text()).toContain(
        'search.insights.top_queries.memory.enabled',
      ),
    );
  });

  it('reports a failure rather than an empty table', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({error: 'nope'}), {status: 500})),
    );
    mount(TopQueriesView);
    await vi.waitFor(() => expect(alerts.alerts.value).toHaveLength(1));
    expect(alerts.alerts.value[0].message).toBe('Error while fetching top queries');
  });
});
