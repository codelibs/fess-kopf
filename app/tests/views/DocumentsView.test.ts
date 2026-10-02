import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import DocumentsView from '@/views/DocumentsView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {resetClusterForTest} from '@/composables/useCluster';
import {router} from '@/router';
import {chooseInSelect} from '../support/naive';

const alerts = useAlerts();

const KEYWORD = {keyword: {type: 'keyword', searchable: true, aggregatable: true}};
const DATE = {date: {type: 'date', searchable: true, aggregatable: true}};

/** `_field_caps` for an index whose owner fields predate the mapping. */
const CAPS = {
  indices: ['fess.20261002000000000'],
  fields: {
    filetype: KEYWORD,
    mimetype: KEYWORD,
    host: KEYWORD,
    label: KEYWORD,
    owner: {text: {type: 'text', searchable: true, aggregatable: false}},
    last_modifier: KEYWORD,
    last_modified: DATE,
    created: DATE,
    content_length: {long: {type: 'long', searchable: true, aggregatable: true}},
  },
};

const SEARCH = {
  hits: {total: {value: 1000, relation: 'eq'}, hits: []},
  aggregations: {
    terms_filetype: {
      sum_other_doc_count: 0,
      buckets: [
        {key: 'pdf', doc_count: 600},
        {key: 'excel', doc_count: 400},
      ],
    },
    missing_filetype: {doc_count: 0},
    year_created: {buckets: [{key: 1767225600000, key_as_string: '2026', doc_count: 1000}]},
    size_ranges: {buckets: [{key: '< 10KB', doc_count: 250}]},
    size_stats: {count: 1000, min: 1, max: 1048576, avg: 4096, sum: 4096000},
    missing_last_modifier: {doc_count: 1000},
    largest: {
      hits: {
        hits: [{_source: {url: 'file:///srv/share/big.xlsx', content_length: 1048576}}],
      },
    },
  },
};

interface Call {
  url: string;
  method: string;
  body: unknown;
}

function stubStats(options: {searchStatus?: number} = {}): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      calls.push({url, method: init?.method ?? 'GET', body});
      if (url.includes('/_field_caps')) {
        return new Response(JSON.stringify(CAPS), {status: 200});
      }
      if (url.includes('/_search')) {
        const status = options.searchStatus ?? 200;
        return new Response(JSON.stringify(status === 200 ? SEARCH : {error: 'nope'}), {status});
      }
      return new Response('not found', {status: 404});
    }),
  );
  return calls;
}

function mountView() {
  return mount(DocumentsView, {global: {plugins: [router]}});
}

function panel(wrapper: ReturnType<typeof mountView>, field: string) {
  return wrapper.find(`[data-field="${field}"]`);
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  await router.push('/documents');
  await router.isReady();
});

afterEach(() => vi.unstubAllGlobals());

describe('DocumentsView', () => {
  it('asks the search alias, field capabilities first', async () => {
    const calls = stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-total').exists()).toBe(true));

    expect(calls[0].url).toContain('/fess.search/_field_caps?fields=filetype,');
    expect(calls[1].url).toContain('/fess.search/_search');
    expect(calls[1].method).toBe('POST');
    expect((calls[1].body as {size: number}).size).toBe(0);
    expect(wrapper.find('#ds-total').text()).toBe((1000).toLocaleString());
  });

  it('never asks to count a field the index holds as text', async () => {
    const calls = stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-total').exists()).toBe(true));

    const aggs = (calls[1].body as {aggs: Record<string, unknown>}).aggs;
    expect(aggs.terms_owner).toBeUndefined();
    expect(aggs.terms_last_modifier).toBeDefined();
    expect(panel(wrapper, 'owner').text()).toContain('Mapped as text, which cannot be counted');
  });

  it('lists each value with its share of the index', async () => {
    stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-total').exists()).toBe(true));

    const rows = panel(wrapper, 'filetype').findAll('tbody tr');
    expect(rows).toHaveLength(2);
    const cells = rows[0].findAll('td').map((cell) => cell.text());
    expect(cells[0]).toBe('pdf');
    expect(cells[3]).toBe('60.0%');
    expect(panel(wrapper, 'last_modifier').text()).toContain(
      `${(1000).toLocaleString()} without a value`,
    );
  });

  it('says what created means in Fess', async () => {
    stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-total').exists()).toBe(true));

    expect(panel(wrapper, 'created').text()).toContain('When Fess indexed the document');
    expect(panel(wrapper, 'last_modified').text()).not.toContain('When Fess indexed');
  });

  it('lists the largest documents', async () => {
    stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-largest').exists()).toBe(true));

    const cells = wrapper.findAll('#ds-largest tbody td').map((cell) => cell.text());
    expect(cells[0]).toBe('file:///srv/share/big.xlsx');
    expect(cells[1]).toBe('1.00MB');
  });

  it('reads the index named in the route', async () => {
    await router.push({name: 'documents', query: {index: 'fess.20250101000000000'}});
    const calls = stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-total').exists()).toBe(true));

    expect(calls[0].url).toContain('/fess.20250101000000000/_field_caps');
  });

  it('reloads when another index is chosen', async () => {
    const calls = stubStats();
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.find('#ds-total').exists()).toBe(true));

    await chooseInSelect(wrapper, 'ds-index', 'fess.20250101000000000');
    await vi.waitFor(() => expect(calls).toHaveLength(4));
    expect(calls[2].url).toContain('/fess.20250101000000000/_field_caps');
    await flushPromises();
    expect(router.currentRoute.value.query.index).toBe('fess.20250101000000000');
  });

  it('reports a failure rather than an empty page', async () => {
    stubStats({searchStatus: 500});
    const wrapper = mountView();
    await vi.waitFor(() => expect(alerts.alerts.value).toHaveLength(1));
    expect(alerts.alerts.value[0].message).toBe('Error while fetching document statistics');
    expect(wrapper.find('#ds-total').exists()).toBe(false);
  });
});
