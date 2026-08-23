import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import AnalysisView from '@/views/AnalysisView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {okRoutes, stubFetch} from '../api/routes';

const alerts = useAlerts();

const METADATA = {
  metadata: {
    indices: {
      'test-index': {
        mappings: {_doc: {properties: {content: {type: 'text'}, boost: {type: 'float'}}}},
        settings: {index: {analysis: {analyzer: {japanese_analyzer: {}}}}},
      },
    },
  },
};

const TOKENS = {
  tokens: [
    {token: '検索', start_offset: 0, end_offset: 2, position: 0},
    {token: 'エンジン', start_offset: 2, end_offset: 6, position: 1},
  ],
};

/** Answers metadata and _analyze; anything else 404s. */
function stubAnalysis(): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/_cluster/state/metadata/')) {
      return new Response(JSON.stringify(METADATA), {status: 200});
    }
    if (url.includes('/_analyze')) {
      return new Response(JSON.stringify(TOKENS), {status: 200});
    }
    return new Response(JSON.stringify({init}), {status: 404});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  stubFetch({routes: okRoutes()});
  await refresh();
});

afterEach(() => vi.unstubAllGlobals());

describe('AnalysisView', () => {
  it('offers the cluster open indices in both forms', () => {
    const wrapper = mount(AnalysisView);
    const options = wrapper.findAll('#an-field-index option').map((o) => o.text());
    expect(options).toEqual(['select index', 'test-index']);
    expect(wrapper.findAll('#an-an-index option').map((o) => o.text())).toEqual(options);
  });

  it('loads types and analyzable fields when an index is chosen', async () => {
    stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.find('#an-field-index').setValue('test-index');
    await vi.waitFor(() =>
      expect(wrapper.findAll('#an-field-type option')).toHaveLength(2),
    );
    expect(wrapper.findAll('#an-field-type option').map((o) => o.text())).toEqual([
      'select type',
      '_doc',
    ]);

    await wrapper.find('#an-field-type').setValue('_doc');
    // boost is a float, so it is not offered.
    expect(wrapper.findAll('#an-field-field option').map((o) => o.text())).toEqual([
      'select field',
      'content',
    ]);
  });

  it('loads analyzers for the analyzer form', async () => {
    stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.find('#an-an-index').setValue('test-index');
    await vi.waitFor(() =>
      expect(wrapper.findAll('#an-an-analyzer option')).toHaveLength(2),
    );
    expect(wrapper.findAll('#an-an-analyzer option').map((o) => o.text())).toEqual([
      'select analyzer',
      'japanese_analyzer',
    ]);
  });

  it('posts the field form and renders the tokens', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.find('#an-field-index').setValue('test-index');
    await vi.waitFor(() => expect(wrapper.findAll('#an-field-type option')).toHaveLength(2));
    await wrapper.find('#an-field-type').setValue('_doc');
    await wrapper.find('#an-field-field').setValue('content');
    await wrapper.find('#an-field-text').setValue('検索エンジン');
    await wrapper.findAll('form')[0].trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('検索'));

    const analyzeCall = fetcher.mock.calls.find((c) => String(c[0]).includes('/_analyze'));
    expect(analyzeCall?.[0]).toContain('/test-index/_analyze');
    expect((analyzeCall?.[1] as RequestInit).method).toBe('POST');
    expect(JSON.parse((analyzeCall?.[1] as RequestInit).body as string)).toEqual({
      text: '検索エンジン',
      field: 'content',
    });
  });

  it('posts the analyzer form with the analyzer name', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.find('#an-an-index').setValue('test-index');
    await vi.waitFor(() => expect(wrapper.findAll('#an-an-analyzer option')).toHaveLength(2));
    await wrapper.find('#an-an-analyzer').setValue('japanese_analyzer');
    await wrapper.find('#an-an-text').setValue('検索エンジン');
    await wrapper.findAll('form')[1].trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('エンジン'));

    const analyzeCall = fetcher.mock.calls.find((c) => String(c[0]).includes('/_analyze'));
    expect(JSON.parse((analyzeCall?.[1] as RequestInit).body as string)).toEqual({
      text: '検索エンジン',
      analyzer: 'japanese_analyzer',
    });
  });

  it('does not call the cluster when the form is incomplete', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.findAll('form')[0].trigger('submit');
    await wrapper.findAll('form')[1].trigger('submit');
    expect(fetcher.mock.calls.filter((c) => String(c[0]).includes('/_analyze'))).toHaveLength(0);
  });

  it('reports a metadata failure and clears the chosen index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    const wrapper = mount(AnalysisView);
    await wrapper.find('#an-field-index').setValue('test-index');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error loading index types');
    expect((wrapper.find('#an-field-index').element as HTMLSelectElement).value).toBe('');
  });

  it('reports an analyze failure', async () => {
    stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.find('#an-field-index').setValue('test-index');
    await vi.waitFor(() => expect(wrapper.findAll('#an-field-type option')).toHaveLength(2));
    await wrapper.find('#an-field-type').setValue('_doc');
    await wrapper.find('#an-field-field').setValue('content');
    await wrapper.find('#an-field-text').setValue('text');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 400})),
    );
    await wrapper.findAll('form')[0].trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error analyzing text by field');
  });
});
