import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import ClusterView from '@/views/ClusterView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
import {useAlerts} from '@/composables/useAlerts';
import {okRoutes, stubFetch} from '../api/routes';
import {shardRouting} from '../model/fixtures';
import {router} from '@/router';

const alerts = useAlerts();
const dialogs = useDialogs();

/** Two indices so paging and bulk selection have something to work with. */
function twoIndexRoutes(): Record<string, unknown> {
  return {
    ...okRoutes(),
    '/_cluster/state/master_node,routing_table,blocks/': {
      cluster_name: 'fess-search',
      master_node: 'n1',
      routing_table: {
        indices: {
          'idx-a': {shards: {0: [shardRouting({index: 'idx-a'})]}},
          'idx-b': {shards: {0: [shardRouting({index: 'idx-b'})]}},
        },
      },
      blocks: {},
    },
  };
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  resetDialogsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  stubFetch({routes: twoIndexRoutes()});
  await refresh();
  // The index header links to /indexSettings, so RouterLink needs a router.
  await router.push('/cluster');
  await router.isReady();
});

afterEach(() => vi.unstubAllGlobals());

/** Captures calls made after mount, so the initial poll is not counted. */
function captureCalls(): {url: string; method: string}[] {
  const calls: {url: string; method: string}[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({url, method: init?.method ?? 'GET'});
      return new Response('{}', {status: 200});
    }),
  );
  return calls;
}

async function openIndexMenuAction(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper
    .findAll('thead button')
    .find((b) => b.text() === label);
  expect(button, `no action labelled ${label}`).toBeTruthy();
  await button!.trigger('click');
}

describe('ClusterView', () => {
  it('renders one column per index and one row per node', () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    expect(wrapper.findAll('thead th')).length.greaterThan(2);
    expect(wrapper.text()).toContain('idx-a');
    expect(wrapper.text()).toContain('idx-b');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.find('tbody tr').text()).toContain('search01');
  });

  it.each([
    ['delete index', 'DELETE', '/idx-a'],
    ['optimize index', 'POST', '/idx-a/_forcemerge'],
    ['refresh index', 'POST', '/idx-a/_refresh'],
    ['clear cache', 'POST', '/idx-a/_cache/clear'],
    ['close index', 'POST', '/idx-a/_close'],
  ])('asks before %s, then issues %s %s', async (label, method, path) => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const calls = captureCalls();
    await openIndexMenuAction(wrapper, label);

    // Nothing has been sent yet -- the dialog is open.
    expect(calls).toHaveLength(0);
    expect(dialogs.confirmRequest.value).not.toBeNull();

    resolveConfirm(true);
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0].method).toBe(method);
    expect(calls[0].url).toContain(path);
  });

  it('sends nothing when the confirmation is declined', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const calls = captureCalls();
    await openIndexMenuAction(wrapper, 'delete index');
    resolveConfirm(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toHaveLength(0);
  });

  it('names the index in the confirmation it shows', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    captureCalls();
    await openIndexMenuAction(wrapper, 'delete index');
    expect(dialogs.confirmRequest.value?.header).toContain('idx-a');
    expect(dialogs.confirmRequest.value?.body).toContain('cannot be undone');
    expect(dialogs.confirmRequest.value?.confirmText).toBe('Delete');
  });

  it('targets every selected index in a bulk action, and lists them', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const calls = captureCalls();
    const bulk = wrapper.findAll('thead button').find((b) => b.text() === 'delete selected');
    await bulk!.trigger('click');
    expect(dialogs.confirmRequest.value?.body).toContain('idx-a');
    expect(dialogs.confirmRequest.value?.body).toContain('idx-b');
    resolveConfirm(true);
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(decodeURIComponent(calls[0].url)).toContain('/idx-a,idx-b');
  });

  it('toggles shard allocation through a transient cluster setting', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const calls = captureCalls();
    await wrapper.find('thead button').trigger('click');
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toContain('/_cluster/settings');
  });

  it('filters indices by name', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    await wrapper.find('#index-filter').setValue('idx-a');
    expect(wrapper.text()).toContain('idx-a');
    expect(wrapper.text()).not.toContain('idx-b');
  });

  it('filters nodes by name', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    await wrapper.find('#cluster-node-filter').setValue('nothing');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
  });

  it('shows index settings without asking, because it changes nothing', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({metadata: {indices: {'idx-a': {mappings: {}, settings: {a: 1}}}}}),
            {status: 200},
          ),
      ),
    );
    await openIndexMenuAction(wrapper, 'show settings');
    await vi.waitFor(() => expect(dialogs.infoRequest.value).not.toBeNull());
    expect(dialogs.confirmRequest.value).toBeNull();
    expect(dialogs.infoRequest.value?.title).toBe('settings for idx-a');
    expect(dialogs.infoRequest.value?.content).toEqual({a: 1});
  });

  it('links each index to its settings screen', () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const link = wrapper.findAll('a').find((a) => a.text() === 'edit settings');
    expect(link?.attributes('href')).toContain('indexSettings');
    expect(link?.attributes('href')).toContain('idx-a');
  });

  it('reports a failed operation rather than claiming success', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 400})),
    );
    await openIndexMenuAction(wrapper, 'delete index');
    resolveConfirm(true);
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].level).toBe('error');
    expect(alerts.alerts.value[0].message).toBe('Error while deleting index');
  });
});
