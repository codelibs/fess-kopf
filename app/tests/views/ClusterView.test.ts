import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import ClusterView from '@/views/ClusterView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
import {useAlerts} from '@/composables/useAlerts';
import {okRoutes, stubFetch} from '../api/routes';
import {isChecked, setCheckbox} from '../support/naive';
import {shardRouting} from '../model/fixtures';
import {router} from '@/router';

const alerts = useAlerts();
const dialogs = useDialogs();

/** Two indices so paging and bulk selection have something to work with. */
function twoIndexRoutes(): Record<string, unknown> {
  return {
    ...okRoutes(),
    '/_cluster/state/master_node,cluster_manager_node,routing_table,blocks/': {
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

/** jsdom lays nothing out, so a menu's geometry has to be supplied. */
function stubRect(element: Element, rect: Partial<DOMRect>): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

/**
 * Opens one shard menu, having given its summary and its panel the geometry
 * the assertion is about. The panels are placed by script, so `toggle` is
 * what triggers placement.
 */
async function openShardMenu(
  wrapper: ReturnType<typeof mount>,
  summaryRect: Partial<DOMRect> = {},
  panelRect: Partial<DOMRect> = {},
  at = 0,
) {
  const details = wrapper.findAll('tbody details.k-menu')[at];
  expect(details, 'no shard menu rendered').toBeTruthy();
  const panel = details.find('.k-menu-items');
  stubRect(details.find('summary').element, summaryRect);
  stubRect(panel.element, panelRect);
  (details.element as HTMLDetailsElement).open = true;
  await details.trigger('toggle');
  return {details, panel: panel.element as HTMLElement};
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

/**
 * The grid scrolls horizontally, which makes it clip on both axes: a panel
 * laid out inside it is cut off, and on the shard row it never appears at all.
 */
describe('ClusterView menus escape the scrolling grid', () => {
  it('places a shard menu against its summary', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    const {panel} = await openShardMenu(
      wrapper,
      {left: 300, top: 500, bottom: 520},
      {width: 192, height: 60},
    );
    expect(panel.style.left).toBe('300px');
    expect(panel.style.top).toBe('524px');
    wrapper.unmount();
  });

  it('flips a menu above its summary rather than off the bottom', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    // 768 tall in jsdom: 730 + 4 + 60 would run past the bottom edge.
    const {panel} = await openShardMenu(
      wrapper,
      {left: 300, top: 700, bottom: 730},
      {width: 192, height: 60},
    );
    expect(panel.style.top).toBe('636px');
    wrapper.unmount();
  });

  it('keeps a menu inside the right edge', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    // 1024 wide in jsdom, less the 8px margin, less the panel's 192.
    const {panel} = await openShardMenu(
      wrapper,
      {left: 1000, top: 100, bottom: 120},
      {width: 192, height: 60},
    );
    expect(panel.style.left).toBe('824px');
    wrapper.unmount();
  });

  it('closes the open menu when another opens', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    const first = await openShardMenu(wrapper, {}, {}, 0);
    const second = await openShardMenu(wrapper, {}, {}, 1);
    expect((first.details.element as HTMLDetailsElement).open).toBe(false);
    expect((second.details.element as HTMLDetailsElement).open).toBe(true);
    wrapper.unmount();
  });

  it('closes the menu once one of its actions is taken', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    const {details, panel} = await openShardMenu(wrapper);
    panel.querySelector('button')!.click();
    expect((details.element as HTMLDetailsElement).open).toBe(false);
    wrapper.unmount();
  });

  it('closes the menu on a click outside it', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    const {details} = await openShardMenu(wrapper);
    document.body.click();
    expect((details.element as HTMLDetailsElement).open).toBe(false);
    wrapper.unmount();
  });

  it('closes the menu when the grid scrolls out from under it', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}, attachTo: document.body});
    const {details} = await openShardMenu(wrapper);
    wrapper.find('.k-scroll-x').element.dispatchEvent(new Event('scroll', {bubbles: false}));
    expect((details.element as HTMLDetailsElement).open).toBe(false);
    wrapper.unmount();
  });
});

describe('ClusterView, on a Fess cluster', () => {
  /** The three families a Fess cluster always has, with their real aliases. */
  function fessRoutes(): Record<string, unknown> {
    return {
      ...okRoutes(),
      '/_cluster/state/master_node,cluster_manager_node,routing_table,blocks/': {
        cluster_name: 'fess-search',
        master_node: 'n1',
        routing_table: {
          indices: {
            'fess.20260902134052541': {
              shards: {0: [shardRouting({index: 'fess.20260902134052541'})]},
            },
            'fess_log.search_log': {
              shards: {0: [shardRouting({index: 'fess_log.search_log'})]},
            },
            'top_queries-2026.09.02': {
              shards: {0: [shardRouting({index: 'top_queries-2026.09.02'})]},
            },
          },
        },
        blocks: {},
      },
      '/_aliases': {
        'fess.20260902134052541': {aliases: {'fess.search': {}, 'fess.update': {}}},
      },
    };
  }

  beforeEach(async () => {
    resetClusterForTest();
    stubFetch({routes: fessRoutes()});
    await refresh();
  });

  it('names what each index is to Fess, and which one is live', () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const headers = wrapper.findAll('thead th');

    const fessDoc = headers.find((h) => h.text().includes('fess.20260902134052541'));
    expect(fessDoc?.text()).toContain('document');
    expect(fessDoc?.text()).toContain('search');
    expect(fessDoc?.text()).toContain('update');

    const log = headers.find((h) => h.text().includes('fess_log.search_log'));
    expect(log?.text()).toContain('log');
  });

  it('shows a crawl reaching the index, and only while it is', async () => {
    resetClusterForTest();
    const routes = fessRoutes();
    stubFetch({
      routes: {
        ...routes,
        '/_stats/docs,store,indexing,search': {
          _all: {primaries: {}, total: {}},
          indices: {
            'fess.20260902134052541': {
              total: {indexing: {index_current: 7, index_total: 100}},
            },
          },
        },
      },
    });
    await refresh();

    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const headers = wrapper.findAll('thead th');
    const busy = headers.find((h) => h.text().includes('fess.20260902134052541'));
    expect(busy?.find('.k-indexing').text()).toContain('7 indexing');

    // A quiet index says nothing, rather than a zero on every column.
    const quiet = headers.find((h) => h.text().includes('fess_log.search_log'));
    expect(quiet?.find('.k-indexing').exists()).toBe(false);
  });

  it('says nothing about an index Fess does not own', () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const other = wrapper
      .findAll('thead th')
      .find((h) => h.text().includes('top_queries-2026.09.02'));
    expect(other?.find('.k-fess-roles').exists()).toBe(false);
  });

  it('hides everything but Fess when the filter is on', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const names = () =>
      wrapper
        .findAll('thead th .k-index-name summary')
        .map((s) => s.text())
        .sort();
    expect(names()).toEqual([
      'fess.20260902134052541',
      'fess_log.search_log',
      'top_queries-2026.09.02',
    ]);

    expect(isChecked(wrapper, 'f-fess')).toBe(false);
    await setCheckbox(wrapper, 'f-fess', true);
    expect(names()).toEqual(['fess.20260902134052541', 'fess_log.search_log']);
  });
});

describe('ClusterView, explaining an unassigned shard', () => {
  /** One unassigned replica, which is what puts the cluster in yellow. */
  function unassignedRoutes(): Record<string, unknown> {
    return {
      ...okRoutes(),
      '/_cluster/state/master_node,cluster_manager_node,routing_table,blocks/': {
        cluster_name: 'fess-search',
        master_node: 'n1',
        routing_table: {
          indices: {
            'fess.20260902': {
              shards: {
                0: [
                  shardRouting({index: 'fess.20260902'}),
                  shardRouting({
                    index: 'fess.20260902',
                    primary: false,
                    state: 'UNASSIGNED',
                    node: null,
                  }),
                ],
              },
            },
          },
        },
        blocks: {},
      },
      '/_cluster/health': {...(okRoutes()['/_cluster/health'] as object), unassigned_shards: 1},
    };
  }

  const EXPLANATION = {
    index: 'fess.20260902',
    shard: 0,
    primary: false,
    current_state: 'unassigned',
    unassigned_info: {reason: 'INDEX_CREATED'},
    can_allocate: 'no',
    allocate_explanation: 'cannot allocate because allocation is not permitted to any of the nodes',
    node_allocation_decisions: [
      {
        node_id: 'n1',
        node_name: 'search01',
        node_decision: 'no',
        deciders: [{decider: 'same_shard', decision: 'NO', explanation: 'a copy is here'}],
      },
    ],
  };

  beforeEach(async () => {
    resetClusterForTest();
    stubFetch({routes: unassignedRoutes()});
    await refresh();
  });

  /** Answers the explain call with `body`, and reports every call made. */
  function stubExplain(body: unknown, status = 200): ReturnType<typeof vi.fn> {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(body), {status}));
    vi.stubGlobal('fetch', fetcher);
    return fetcher;
  }

  it('offers the explanation only while something is unassigned', () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    expect(wrapper.find('#explain-allocation').exists()).toBe(true);
  });

  it('shows what the cluster said, in the info dialog', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    const fetcher = stubExplain(EXPLANATION);

    await wrapper.find('#explain-allocation').trigger('click');
    await vi.waitFor(() => expect(dialogs.infoRequest.value).not.toBeNull());

    expect(String(fetcher.mock.calls[0][0])).toContain('/_cluster/allocation/explain');
    expect((fetcher.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect(dialogs.infoRequest.value?.title).toBe('Allocation of fess.20260902 shard 0');
    expect(dialogs.infoRequest.value?.content).toEqual(EXPLANATION);
  });

  it('treats the 400 a healthy cluster answers with as good news', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    stubExplain(
      {
        error: {
          type: 'illegal_argument_exception',
          reason: 'unable to find any unassigned shards to explain [x]',
        },
      },
      400,
    );

    await wrapper.find('#explain-allocation').trigger('click');
    await vi.waitFor(() => expect(alerts.alerts.value).toHaveLength(1));

    expect(alerts.alerts.value[0].level).toBe('info');
    expect(alerts.alerts.value[0].message).toBe('No unassigned shards to explain');
    expect(dialogs.infoRequest.value).toBeNull();
  });

  it('reports a real failure as an error', async () => {
    const wrapper = mount(ClusterView, {global: {plugins: [router]}});
    stubExplain({error: 'nope'}, 500);

    await wrapper.find('#explain-allocation').trigger('click');
    await vi.waitFor(() => expect(alerts.alerts.value).toHaveLength(1));

    expect(alerts.alerts.value[0].level).toBe('error');
    expect(alerts.alerts.value[0].message).toBe('Error while explaining allocation');
  });
});
