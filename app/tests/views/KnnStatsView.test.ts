import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import KnnStatsView from '@/views/KnnStatsView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';

const alerts = useAlerts();

/** The response a 3.8.0 node gave with one faiss index loaded. */
const STATS = {
  circuit_breaker_triggered: false,
  model_index_status: null,
  nodes: {
    n1: {
      graph_memory_usage: 1297,
      graph_memory_usage_percentage: 0.005382331,
      cache_capacity_reached: false,
      indices_in_cache: {'fess.20260902': {graph_count: 2}},
      hit_count: 3,
      miss_count: 2,
      eviction_count: 0,
      load_exception_count: 0,
      knn_query_requests: 5,
      graph_index_errors: 0,
      graph_query_errors: 0,
    },
  },
};

function stubStats(body: unknown = STATS, status = 200): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(body), {status}));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(() => {
  resetSettingsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('KnnStatsView', () => {
  it('asks the plugin and shows the per-node cache', async () => {
    const fetcher = stubStats();
    const wrapper = mount(KnnStatsView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(String(fetcher.mock.calls[0][0])).toContain('/_plugins/_knn/stats');
    const cells = wrapper.findAll('tbody tr td').map((cell) => cell.text());
    expect(cells[0]).toBe('n1');
    // 1297 kB, rendered by the shared byte formatter.
    expect(cells[1]).toBe('1.27MB');
    expect(cells[3]).toBe('3 / 2');
    expect(cells[7]).toBe('fess.20260902');
  });

  it('shows a closed breaker as success and says nothing more', async () => {
    stubStats();
    const wrapper = mount(KnnStatsView);
    await vi.waitFor(() => expect(wrapper.find('#knn-breaker').exists()).toBe(true));

    expect(wrapper.find('#knn-breaker').text()).toBe('false');
    expect(wrapper.text()).not.toContain('The circuit breaker is open');
  });

  it('spells out what an open breaker means', async () => {
    stubStats({...STATS, circuit_breaker_triggered: true});
    const wrapper = mount(KnnStatsView);
    await vi.waitFor(() => expect(wrapper.find('#knn-breaker').exists()).toBe(true));

    expect(wrapper.find('#knn-breaker').text()).toBe('true');
    expect(wrapper.text()).toContain('The circuit breaker is open');
  });

  it('reports a full cache on any node', async () => {
    stubStats({
      ...STATS,
      nodes: {n1: STATS.nodes.n1, n2: {cache_capacity_reached: true}},
    });
    const wrapper = mount(KnnStatsView);
    await vi.waitFor(() => expect(wrapper.find('#knn-cache').exists()).toBe(true));
    expect(wrapper.find('#knn-cache').text()).toBe('true');
  });

  it('reports a failure rather than an empty page', async () => {
    stubStats({error: 'nope'}, 500);
    mount(KnnStatsView);
    await vi.waitFor(() => expect(alerts.alerts.value).toHaveLength(1));
    expect(alerts.alerts.value[0].message).toBe('Error while fetching k-NN statistics');
  });
});
