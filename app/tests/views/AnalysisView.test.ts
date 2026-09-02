import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import AnalysisView from '@/views/AnalysisView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {chooseInSelect, optionLabels, selectById, setCheckbox} from '../support/naive';
import {okRoutes, stubFetch} from '../api/routes';

const alerts = useAlerts();

const METADATA = {
  metadata: {
    indices: {
      'test-index': {
        mappings: {_doc: {properties: {content: {type: 'text'}, boost: {type: 'float'}}}},
        settings: {
          index: {
            analysis: {
              analyzer: {japanese_analyzer: {}},
              tokenizer: {japanese_tokenizer: {}},
              filter: {japanese_stop: {}, japanese_pos_filter: {}},
              char_filter: {mapping_ja_filter: {}},
            },
          },
        },
      },
    },
  },
};

const TOKENS = {
  tokens: [
    {token: '検索', start_offset: 0, end_offset: 2, position: 0, type: 'word'},
    {token: 'エンジン', start_offset: 2, end_offset: 6, position: 1, type: 'word'},
  ],
};

/**
 * The explain shape, measured on 2.19.1 and 3.8.0 alike: two char filters,
 * a tokenizer, then each token filter with what it left behind.
 */
const EXPLAINED = {
  detail: {
    custom_analyzer: true,
    charfilters: [{name: 'mapping_ja_filter', filtered_text: ['検索エンジンは a']}],
    tokenizer: {
      name: 'japanese_tokenizer',
      tokens: [
        {token: '検索', start_offset: 0, end_offset: 2, position: 0, type: 'word'},
        {token: 'エンジン', start_offset: 2, end_offset: 6, position: 1, type: 'word'},
        {token: 'は', start_offset: 6, end_offset: 7, position: 2, type: 'word'},
        {token: 'a', start_offset: 8, end_offset: 9, position: 3, type: 'word'},
      ],
    },
    tokenfilters: [
      {
        name: 'japanese_stop',
        tokens: [
          {token: '検索', start_offset: 0, end_offset: 2, position: 0, type: 'word'},
          {token: 'エンジン', start_offset: 2, end_offset: 6, position: 1, type: 'word'},
          {token: 'a', start_offset: 8, end_offset: 9, position: 3, type: 'word'},
        ],
      },
      {
        name: 'lowercase',
        tokens: [
          {token: '検索', start_offset: 0, end_offset: 2, position: 0, type: 'word'},
          {token: 'エンジン', start_offset: 2, end_offset: 6, position: 1, type: 'word'},
          {token: 'a', start_offset: 8, end_offset: 9, position: 3, type: 'word'},
        ],
      },
    ],
  },
};

/** Answers metadata and _analyze; anything else 404s. */
function stubAnalysis(analyzeBody: unknown = TOKENS): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/_cluster/state/metadata/')) {
      return new Response(JSON.stringify(METADATA), {status: 200});
    }
    if (url.includes('/_analyze')) {
      return new Response(JSON.stringify(analyzeBody), {status: 200});
    }
    return new Response(JSON.stringify({init}), {status: 404});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

/** Picks one of the segmented source buttons by its label. */
async function chooseSource(
  wrapper: ReturnType<typeof mount>,
  name: string,
): Promise<void> {
  const button = wrapper.findAll('#an-source label').find((l) => l.text() === name);
  if (button === undefined) {
    throw new Error(`no source button "${name}"`);
  }
  await button.find('input').setValue(true);
}

/** Fills the field form, which is what the screen opens on. */
async function chooseField(wrapper: ReturnType<typeof mount>): Promise<void> {
  await chooseInSelect(wrapper, 'an-index', 'test-index');
  await vi.waitFor(() => expect(optionLabels(wrapper, 'an-field')).toHaveLength(1));
  await chooseInSelect(wrapper, 'an-field', 'content');
}

function analyzeBodyOf(fetcher: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const call = fetcher.mock.calls.find((c) => String(c[0]).includes('/_analyze'));
  return JSON.parse((call?.[1] as RequestInit).body as string);
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
  it('offers the cluster open indices', () => {
    const wrapper = mount(AnalysisView);
    expect(optionLabels(wrapper, 'an-index')).toEqual(['test-index']);
  });

  it('chooses the only mapping type itself and offers the analyzable fields', async () => {
    // Every OpenSearch index is typeless, so `_doc` is the only answer the
    // type question ever has. Asking it was a step with one possible reply.
    stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseInSelect(wrapper, 'an-index', 'test-index');
    await vi.waitFor(() => expect(optionLabels(wrapper, 'an-field')).toHaveLength(1));

    // boost is a float, so it is not offered.
    expect(optionLabels(wrapper, 'an-field')).toEqual(['content']);
    expect(wrapper.find('#an-type').exists()).toBe(false);
  });

  it('posts the field, and renders the tokens with their position and offsets', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('検索エンジン');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    const call = fetcher.mock.calls.find((c) => String(c[0]).includes('/_analyze'));
    expect(String(call?.[0])).toContain('/test-index/_analyze');
    expect((call?.[1] as RequestInit).method).toBe('POST');
    expect(analyzeBodyOf(fetcher)).toEqual({
      text: '検索エンジン',
      field: 'content',
      explain: true,
    });

    const cells = wrapper.findAll('tbody tr')[0].findAll('td').map((c) => c.text());
    expect(cells).toEqual(['検索', 'word', '0', '0–2']);
  });

  it('asks for the chain by default, and stops asking when unchecked', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('検索');

    await setCheckbox(wrapper, 'an-explain', false);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => String(c[0]).includes('/_analyze'))).toBe(true),
    );
    expect(analyzeBodyOf(fetcher)).not.toHaveProperty('explain');
  });

  it('posts an analyzer by name', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseSource(wrapper, 'analyzer');
    await chooseInSelect(wrapper, 'an-index', 'test-index');
    await vi.waitFor(() => expect(optionLabels(wrapper, 'an-analyzer')).toHaveLength(1));
    expect(optionLabels(wrapper, 'an-analyzer')).toEqual(['japanese_analyzer']);

    await chooseInSelect(wrapper, 'an-analyzer', 'japanese_analyzer');
    await wrapper.find('#an-text').setValue('検索エンジン');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.text()).toContain('エンジン'));

    expect(analyzeBodyOf(fetcher)).toEqual({
      text: '検索エンジン',
      analyzer: 'japanese_analyzer',
      explain: true,
    });
  });

  it('does not call the cluster while the form is incomplete', async () => {
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await wrapper.find('form').trigger('submit');
    expect(fetcher.mock.calls.filter((c) => String(c[0]).includes('/_analyze'))).toHaveLength(0);
  });

  it('reports a metadata failure and clears the chosen index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    const wrapper = mount(AnalysisView);
    await chooseInSelect(wrapper, 'an-index', 'test-index');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error loading index types');
    expect(selectById(wrapper, 'an-index').props('value')).toBe('');
  });

  it('reports a failed analysis', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes('/_analyze')
        ? new Response('{"error":"boom"}', {status: 400})
        : new Response(JSON.stringify(METADATA), {status: 200}),
    );
    vi.stubGlobal('fetch', fetcher);

    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('x');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error analyzing text');
  });
});

describe('AnalysisView, the chain', () => {
  it('shows every stage in the order it ran, with what it left behind', async () => {
    stubAnalysis(EXPLAINED);
    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('検索エンジンは a');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('.k-steps').exists()).toBe(true));

    const steps = wrapper.findAll('.k-steps > li').map((li) => li.text());
    expect(steps).toHaveLength(4);
    expect(steps[0]).toContain('char_filter');
    expect(steps[0]).toContain('mapping_ja_filter');
    expect(steps[1]).toContain('tokenizer');
    expect(steps[1]).toContain('japanese_tokenizer');
    expect(steps[2]).toContain('japanese_stop');
    expect(steps[3]).toContain('lowercase');
  });

  it('marks the stage that dropped a token, and only that one', async () => {
    stubAnalysis(EXPLAINED);
    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('検索エンジンは a');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('.k-steps').exists()).toBe(true));

    const steps = wrapper.findAll('.k-steps > li').map((li) => li.text());
    // japanese_stop took は out; lowercase changed nothing.
    expect(steps[2]).toContain('−1');
    expect(steps[3]).not.toContain('−');
    expect(steps[3]).not.toContain('+');
  });

  it('shows the text a char filter produced, not tokens', async () => {
    stubAnalysis(EXPLAINED);
    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('検索エンジンは a');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('.k-steps').exists()).toBe(true));

    expect(wrapper.find('.k-filtered').text()).toBe('検索エンジンは a');
  });

  it('reports the last stage as the result', async () => {
    stubAnalysis(EXPLAINED);
    const wrapper = mount(AnalysisView);
    await chooseField(wrapper);
    await wrapper.find('#an-text').setValue('検索エンジンは a');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });
});

describe('AnalysisView, composing a chain', () => {
  it('offers the index tokenizers, filters and char filters', async () => {
    stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseSource(wrapper, 'custom');
    await chooseInSelect(wrapper, 'an-index', 'test-index');
    await vi.waitFor(() => expect(optionLabels(wrapper, 'an-tokenizer')).toHaveLength(1));

    expect(optionLabels(wrapper, 'an-tokenizer')).toEqual(['japanese_tokenizer']);
    expect(optionLabels(wrapper, 'an-filters')).toEqual([
      'japanese_pos_filter',
      'japanese_stop',
    ]);
    expect(optionLabels(wrapper, 'an-char-filters')).toEqual(['mapping_ja_filter']);
  });

  it('sends the chain as the request fields _analyze names them', async () => {
    const fetcher = stubAnalysis(EXPLAINED);
    const wrapper = mount(AnalysisView);
    await chooseSource(wrapper, 'custom');
    await chooseInSelect(wrapper, 'an-index', 'test-index');
    await vi.waitFor(() => expect(optionLabels(wrapper, 'an-tokenizer')).toHaveLength(1));

    await chooseInSelect(wrapper, 'an-tokenizer', 'japanese_tokenizer');
    await chooseInSelect(wrapper, 'an-char-filters', ['mapping_ja_filter']);
    await chooseInSelect(wrapper, 'an-filters', ['japanese_stop', 'lowercase']);
    await wrapper.find('#an-text').setValue('検索エンジンは a');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('.k-steps').exists()).toBe(true));

    expect(analyzeBodyOf(fetcher)).toEqual({
      text: '検索エンジンは a',
      tokenizer: 'japanese_tokenizer',
      char_filter: ['mapping_ja_filter'],
      filter: ['japanese_stop', 'lowercase'],
      explain: true,
    });
  });

  it('runs against the cluster when no index is chosen', async () => {
    // Built-ins only, which is what /_analyze without an index knows.
    const fetcher = stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseSource(wrapper, 'custom');
    await chooseInSelect(wrapper, 'an-tokenizer', 'standard');
    await wrapper.find('#an-text').setValue('Fess');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => String(c[0]).includes('/_analyze'))).toBe(true),
    );

    const call = fetcher.mock.calls.find((c) => String(c[0]).includes('/_analyze'))!;
    expect(String(call[0])).toMatch(/server_tok\/_analyze$/);
    expect(analyzeBodyOf(fetcher)).toEqual({
      text: 'Fess',
      tokenizer: 'standard',
      explain: true,
    });
  });

  it('says that only the built-ins are available without an index', async () => {
    stubAnalysis();
    const wrapper = mount(AnalysisView);
    await chooseSource(wrapper, 'custom');
    expect(wrapper.text()).toContain('only the built-in analysis components');

    await chooseInSelect(wrapper, 'an-index', 'test-index');
    await vi.waitFor(() =>
      expect(wrapper.text()).not.toContain('only the built-in analysis components'),
    );
  });
});
