import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import AliasesView from '@/views/AliasesView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {chooseInSelect} from '../support/naive';
import {okRoutes, stubFetch} from '../api/routes';
import {shardRouting} from '../model/fixtures';

const alerts = useAlerts();

const ALIASES = {
  'idx-a': {aliases: {'alias-one': {}, 'alias-two': {}}},
  'idx-b': {aliases: {'alias-three': {}}},
  'idx-c': {aliases: {}},
};

function stubAliases(): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return new Response('{"acknowledged":true}', {status: 200});
    }
    return new Response(JSON.stringify(ALIASES), {status: 200});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

async function mountLoaded() {
  const fetcher = stubAliases();
  const wrapper = mount(AliasesView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('alias-one'));
  return {wrapper, fetcher};
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  // The index picker lists the cluster's indices, so they must exist there.
  stubFetch({
    routes: {
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
    },
  });
  await refresh();
});

afterEach(() => vi.unstubAllGlobals());

describe('AliasesView', () => {
  /** The alias table only; index names also appear in the picker's options. */
  const table = (wrapper: ReturnType<typeof mount>) =>
    wrapper.get('[data-test="alias-table"]').text();

  it('lists only indices that actually have aliases', async () => {
    const {wrapper} = await mountLoaded();
    expect(table(wrapper)).toContain('idx-a');
    expect(table(wrapper)).toContain('idx-b');
    expect(table(wrapper)).not.toContain('idx-c');
  });

  it('filters by index and by alias', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.find('#al-f-index').setValue('idx-b');
    expect(table(wrapper)).not.toContain('idx-a');
    await wrapper.find('#al-f-index').setValue('');
    await wrapper.find('#al-f-alias').setValue('three');
    expect(table(wrapper)).toContain('idx-b');
    expect(table(wrapper)).not.toContain('idx-a');
  });

  it('adds an alias locally and says it is not saved yet', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    const before = fetcher.mock.calls.length;
    await chooseInSelect(wrapper, 'al-index', 'idx-b');
    await wrapper.find('#al-alias').setValue('new-alias');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('new-alias');
    expect(alerts.alerts.value[0].message).toContain('only be persisted after saving');
    // Nothing has been sent: the change is pending.
    expect(fetcher.mock.calls).toHaveLength(before);
    expect(wrapper.text()).toContain('unsaved changes');
  });

  it('refuses an alias with no name', async () => {
    const {wrapper} = await mountLoaded();
    await chooseInSelect(wrapper, 'al-index', 'idx-b');
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe('Alias must have a non empty name');
  });

  it('refuses an alias already bound to that index', async () => {
    const {wrapper} = await mountLoaded();
    await chooseInSelect(wrapper, 'al-index', 'idx-a');
    await wrapper.find('#al-alias').setValue('alias-one');
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe('Alias is already associated with this index');
  });

  it('refuses an invalid filter without touching the cluster', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    const before = fetcher.mock.calls.length;
    await chooseInSelect(wrapper, 'al-index', 'idx-b');
    await wrapper.find('#al-alias').setValue('with-filter');
    await wrapper.find('#al-filter').setValue('{not json');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe('Invalid filter defined for alias');
    expect(fetcher.mock.calls).toHaveLength(before);
  });

  it('sends adds and removes in one _aliases call', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await chooseInSelect(wrapper, 'al-index', 'idx-b');
    await wrapper.find('#al-alias').setValue('added');
    await wrapper.find('form').trigger('submit');
    const remove = wrapper.findAll('button').find((b) => b.text() === 'remove');
    await remove!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'save changes')!.trigger('click');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(true),
    );

    const post = fetcher.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(String(post[0])).toContain('/_aliases');
    const actions = JSON.parse(post[1]!.body as string).actions as Record<string, unknown>[];
    expect(actions.some((a) => 'add' in a)).toBe(true);
    expect(actions.some((a) => 'remove' in a)).toBe(true);
  });

  it('never sends a filter on a remove action', async () => {
    // OpenSearch matches a removal by index and alias; a filter it does not
    // have makes the action fail.
    const withFilter = {'idx-a': {aliases: {filtered: {filter: {term: {x: 1}}}}}};
    const fetcher = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? new Response('{}', {status: 200})
        : new Response(JSON.stringify(withFilter), {status: 200}),
    );
    vi.stubGlobal('fetch', fetcher);
    const wrapper = mount(AliasesView);
    await vi.waitFor(() => expect(wrapper.text()).toContain('filtered'));
    await wrapper.findAll('button').find((b) => b.text() === 'remove')!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'save changes')!.trigger('click');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(true),
    );
    const post = fetcher.mock.calls.find((c) => c[1]?.method === 'POST')!;
    const actions = JSON.parse(post[1]!.body as string).actions as Record<string, never>[];
    const removal = actions.find((a) => 'remove' in a)!.remove;
    expect(removal).not.toHaveProperty('filter');
  });

  it('says so when there is nothing to save', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    const before = fetcher.mock.calls.length;
    await wrapper.findAll('button').find((b) => b.text() === 'save changes')!.trigger('click');
    expect(alerts.alerts.value[0].message).toBe('No changes were made: nothing to save');
    expect(fetcher.mock.calls).toHaveLength(before);
  });

  it('removes every alias of an index at once', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text() === 'remove all')!.trigger('click');
    expect(table(wrapper)).not.toContain('idx-a');
    expect(alerts.alerts.value[0].message).toBe('All aliases were removed for idx-a');
  });

  it('reports a failed load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    mount(AliasesView);
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error while fetching aliases');
  });
});
