import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import NodesView from '@/views/NodesView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {okRoutes, stubFetch} from '../api/routes';
import type {NodeInfo} from '@/model/cluster-node';

const alerts = useAlerts();

function nodeInfo(name: string, roles: string[]): NodeInfo {
  return {
    name,
    version: '3.8.0',
    transport_address: '127.0.0.1:9300',
    host: '127.0.0.1',
    roles,
    jvm: {version: '21'},
    os: {available_processors: 4},
  };
}

const STATS = {
  jvm: {uptime_in_millis: 90000000, mem: {heap_used_percent: 42}},
  fs: {total: {total_in_bytes: 1000, free_in_bytes: 400}},
  process: {cpu: {percent: 7}},
  os: {cpu: {load_average: {'1m': 1.55}}},
};

/** Three nodes: one master-only, one data, one neither. */
function threeNodeRoutes(): Record<string, unknown> {
  return {
    ...okRoutes(),
    '/_nodes/_all/os,jvm': {
      nodes: {
        n1: nodeInfo('alpha', ['cluster_manager']),
        n2: nodeInfo('beta', ['data']),
        n3: nodeInfo('gamma', ['ingest']),
      },
    },
    '/_nodes/stats/jvm,fs,os,process': {nodes: {n1: STATS, n2: STATS, n3: STATS}},
  };
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

async function mountWithNodes() {
  stubFetch({routes: threeNodeRoutes()});
  await refresh();
  return mount(NodesView);
}

describe('NodesView', () => {
  it('lists every node when nothing is filtered out', async () => {
    const wrapper = await mountWithNodes();
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });

  it('filters by name, case-insensitively', async () => {
    const wrapper = await mountWithNodes();
    await wrapper.find('#node-name-filter').setValue('BET');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.find('tbody tr').text()).toContain('beta');
  });

  it('filters by node type', async () => {
    const wrapper = await mountWithNodes();
    await wrapper.find('#f-data').setValue(false);
    await wrapper.find('#f-client').setValue(false);
    // Only the cluster_manager node is left.
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.find('tbody tr').text()).toContain('alpha');
  });

  it('says so when the filter matches nothing', async () => {
    const wrapper = await mountWithNodes();
    await wrapper.find('#node-name-filter').setValue('nothing-here');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.text()).toContain('No nodes found matching the current filter');
  });

  it('sorts by name and reverses when the same column is chosen again', async () => {
    const wrapper = await mountWithNodes();
    const names = () =>
      wrapper.findAll('tbody tr').map((r) => r.text().match(/alpha|beta|gamma/)?.[0]);
    expect(names()).toEqual(['alpha', 'beta', 'gamma']);
    await wrapper.findAll('thead button')[0].trigger('click');
    expect(names()).toEqual(['gamma', 'beta', 'alpha']);
  });

  it('marks the current master', async () => {
    const wrapper = await mountWithNodes();
    // fixtures name n1 as master_node, and it is the cluster_manager node.
    expect(wrapper.find('tbody tr').html()).toContain('★');
  });

  it('says client nodes have no disk info', async () => {
    const wrapper = await mountWithNodes();
    const gamma = wrapper.findAll('tbody tr')[2];
    expect(gamma.text()).toContain('no disk info for client nodes');
  });

  it('formats uptime and load average', async () => {
    const wrapper = await mountWithNodes();
    const row = wrapper.find('tbody tr').text();
    expect(row).toContain('1d.');
    expect(row).toContain('1.6');
  });

  it('requests stats for the node whose name was clicked', async () => {
    const wrapper = await mountWithNodes();
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({nodes: {n2: {name: 'beta', jvm: {}}}}), {status: 200}),
    );
    vi.stubGlobal('fetch', fetcher);
    await wrapper.findAll('tbody tr')[1].find('button').trigger('click');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][0]).toContain('/_nodes/n2/stats?human');
  });

  it('reports a failed stats request', async () => {
    const wrapper = await mountWithNodes();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    await wrapper.find('tbody tr').find('button').trigger('click');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error while loading node stats');
  });
});
