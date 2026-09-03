import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import TopQueriesView from '@/views/TopQueriesView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
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

/** One in-flight search, as 3.8.0's live queries endpoint returns it. */
const LIVE_QUERIES = {
  live_queries: [
    {
      id: 'n1:245',
      status: 'running',
      start_time: 1788410792393,
      total_latency_millis: 3005,
      total_cpu_nanos: 3002903322,
      total_memory_bytes: 216072,
      coordinator_task: {
        task_id: 'n1:245',
        node_id: 'n1',
        action: 'indices:data/read/search',
        description:
          'indices[fess.search], search_type[QUERY_THEN_FETCH], source[{"size":0}]',
      },
      shard_tasks: [{task_id: 'n1:246', node_id: 'n1'}],
    },
  ],
};

/** Picks one of the segmented range buttons by its label. */
async function chooseRange(
  wrapper: ReturnType<typeof mount>,
  name: string,
): Promise<void> {
  const button = wrapper.findAll('#tq-range label').find((l) => l.text() === name);
  if (button === undefined) {
    throw new Error(`no range button "${name}"`);
  }
  await button.find('input').setValue(true);
}

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
    // A search is only recorded when its collection window closes, so an
    // empty table usually means "not yet" rather than "nothing was slow" --
    // and if it never fills, the setting is the thing to look at.
    stubTopQueries({top_queries: []});
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('.k-empty').exists()).toBe(true));

    expect(wrapper.find('.k-empty').text()).toContain('no queries recorded');
    expect(wrapper.find('.k-empty').text()).toContain('collection window closes');
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

describe('TopQueriesView, over a range', () => {
  it('asks the history for a window when one is chosen', async () => {
    const fetcher = stubTopQueries();
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));
    // The in-memory listing is the default, and carries no range at all.
    expect(String(fetcher.mock.calls[0][0])).not.toContain('from=');

    await chooseRange(wrapper, '24h');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((call) => String(call[0]).includes('from='))).toBe(true),
    );

    const url = new URL(
      String(fetcher.mock.calls[fetcher.mock.calls.length - 1][0]),
      'http://localhost',
    );
    // ISO 8601 with milliseconds; epoch millis are rejected with a 400.
    const from = url.searchParams.get('from') ?? '';
    const to = url.searchParams.get('to') ?? '';
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Date.parse(to) - Date.parse(from)).toBe(24 * 3600_000);
  });

  it('caps the table and says how much it left out', async () => {
    // A week of five-minute windows is thousands of records and the endpoint
    // takes no size, so the screen keeps the costliest and admits the rest.
    stubTopQueries({
      top_queries: Array.from({length: 140}, (_, i) => ({
        ...TOP_QUERIES.top_queries[0],
        id: `q${i}`,
        measurements: {latency: {number: i}},
      })),
    });
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(wrapper.findAll('tbody tr')).toHaveLength(100);
    expect(wrapper.text()).toContain('Showing the 100 costliest of 140.');
    // The ones kept are the costliest, not the first hundred returned.
    expect(wrapper.find('tbody tr td:nth-child(2)').text()).toBe('139 ms');
  });

  it('reads a source the history handed back as a string', async () => {
    stubTopQueries({
      top_queries: [
        {...TOP_QUERIES.top_queries[0], source: '{"query":{"match":{"content":"fess"}}}'},
      ],
    });
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    await wrapper.findAll('tbody tr')[0].find('button').trigger('click');
    expect(dialogs.infoRequest.value?.content).toEqual(SOURCE);
  });

  it('shows where the time went, and what the index is to Fess', async () => {
    stubTopQueries({
      top_queries: [
        {
          ...TOP_QUERIES.top_queries[0],
          indices: ['fess.search'],
          phase_latency_map: {expand: 0, query: 29, fetch: 1},
        },
      ],
    });
    const wrapper = mount(TopQueriesView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    const row = wrapper.find('tbody tr');
    // The phases run query then fetch, and a phase that took no time is not
    // worth a column inch.
    expect(row.findAll('td')[2].text()).toBe('query 29 · fetch 1');
    expect(row.findAll('td')[3].text()).toContain('document');
  });
});

describe('TopQueriesView, live', () => {
  it('asks the live endpoint, sorted by the chosen measurement', async () => {
    const fetcher = stubTopQueries(LIVE_QUERIES);
    const wrapper = mount(TopQueriesView);
    await chooseRange(wrapper, 'live');
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some((call) =>
          String(call[0]).includes('/_insights/live_queries?sort=latency'),
        ),
      ).toBe(true),
    );
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));
    expect(wrapper.find('tbody tr').text()).toContain('3.0 s');
    expect(wrapper.find('tbody tr').text()).toContain('fess.search');
  });

  it('cancels a running search by the id the endpoint gave it', async () => {
    const fetcher = stubTopQueries(LIVE_QUERIES);
    const wrapper = mount(TopQueriesView);
    await chooseRange(wrapper, 'live');
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    const buttons = wrapper.find('tbody tr').findAll('button');
    await buttons[buttons.length - 1].trigger('click');
    expect(dialogs.confirmRequest.value).not.toBeNull();
    resolveConfirm(true);
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some(
          (call) => String(call[0]).includes('/_tasks/n1%3A245/_cancel'),
        ),
      ).toBe(true),
    );
  });

  /**
   * 2.19.1 ships the plugin but not the route, and says so in the body with
   * a 400. That is a fact about the cluster, not a failure worth an alert.
   */
  it('says the cluster is too old rather than raising an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: 'no handler found for uri [/_insights/live_queries] and method [GET]',
            }),
            {status: 400},
          ),
      ),
    );
    const wrapper = mount(TopQueriesView);
    await chooseRange(wrapper, 'live');
    await vi.waitFor(() => expect(wrapper.find('.k-empty').exists()).toBe(true));

    expect(wrapper.find('.k-empty').text()).toContain('no live queries endpoint');
    expect(alerts.alerts.value).toHaveLength(0);
  });
});
