import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  BROKEN_CLUSTER_PATHS,
  CLUSTER_PATHS,
  ClusterUnavailableError,
  fetchBrokenCluster,
  cancelTask,
  explainAllocation,
  fetchCatApis,
  fetchCluster,
  fetchInstalledPlugins,
  fetchTasks,
  fetchTemplates,
  createTemplate,
  deleteTemplate,
  TEMPLATE_PATHS,
  analyzeText,
} from '@/api/opensearch';
import {RequestError} from '@/api/client';
import {resetSettingsForTest} from '@/api/settings';
import {stubFetch} from './routes';

beforeEach(() => {
  resetSettingsForTest();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('fetchCluster', () => {
  it('issues exactly the eight documented calls', () => {
    const calls = stubFetch();
    return fetchCluster().then(() => {
      expect(calls.sort()).toEqual(Object.values(CLUSTER_PATHS).sort());
    });
  });

  it('builds a cluster from the responses', async () => {
    stubFetch();
    const cluster = await fetchCluster();
    expect(cluster.name).toBe('fess-search');
    expect(cluster.clientName).toBe('search01');
    expect(cluster.version).toBe('3.8.0');
    expect(cluster.nodes).toHaveLength(1);
    expect(cluster.indices.map((i) => i.name)).toEqual(['test-index']);
  });

  it('tolerates cluster settings failing', async () => {
    // Settings are the one response the UI can do without; a denied
    // /_cluster/settings must not blank every screen.
    stubFetch({failing: {[CLUSTER_PATHS.settings]: 403}});
    const cluster = await fetchCluster();
    expect(cluster.settingsAvailable).toBe(false);
    expect(cluster.name).toBe('fess-search');
  });

  it.each([
    ['state', CLUSTER_PATHS.state],
    ['health', CLUSTER_PATHS.health],
    ['nodes', CLUSTER_PATHS.nodes],
    ['index stats', CLUSTER_PATHS.indexStats],
  ])('fails when %s is unavailable', async (_label, path) => {
    stubFetch({failing: {[path]: 500}});
    await expect(fetchCluster()).rejects.toBeInstanceOf(ClusterUnavailableError);
  });

  it('collects every failure rather than only the first', async () => {
    stubFetch({failing: {[CLUSTER_PATHS.state]: 500, [CLUSTER_PATHS.health]: 503}});
    const error = (await fetchCluster().catch((e: unknown) => e)) as ClusterUnavailableError;
    expect(error.causes.map((c) => c.status).sort()).toEqual([500, 503]);
  });

  it('classifies an all-401 failure as an auth failure', async () => {
    stubFetch({
      failing: Object.fromEntries(Object.values(CLUSTER_PATHS).map((path) => [path, 401])),
    });
    const error = (await fetchCluster().catch((e: unknown) => e)) as ClusterUnavailableError;
    expect(error.isAuthFailure).toBe(true);
  });

  it('does not call a failure mixed with a 500 an auth failure', async () => {
    stubFetch({failing: {[CLUSTER_PATHS.state]: 401, [CLUSTER_PATHS.health]: 500}});
    const error = (await fetchCluster().catch((e: unknown) => e)) as ClusterUnavailableError;
    expect(error.isAuthFailure).toBe(false);
  });
});

describe('fetchBrokenCluster', () => {
  it('issues the reduced, local=true set', async () => {
    const calls = stubFetch();
    await fetchBrokenCluster();
    expect(calls.sort()).toEqual(Object.values(BROKEN_CLUSTER_PATHS).sort());
  });

  it('builds the reduced view', async () => {
    stubFetch();
    const cluster = await fetchBrokenCluster();
    expect(cluster.name).toBe('fess-search');
    expect(cluster.indices).toEqual([]);
    expect(cluster.nodes).toHaveLength(1);
  });

  it('tolerates settings failing here too', async () => {
    stubFetch({failing: {[BROKEN_CLUSTER_PATHS.settings]: 403}});
    await expect(fetchBrokenCluster()).resolves.toBeDefined();
  });

  it('fails when health is unavailable', async () => {
    stubFetch({failing: {[BROKEN_CLUSTER_PATHS.health]: 500}});
    await expect(fetchBrokenCluster()).rejects.toBeInstanceOf(ClusterUnavailableError);
  });
});

describe('fetchCatApis', () => {
  it('asks GET /_cat and returns the runnable API names', async () => {
    const calls = stubFetch({routes: {'/_cat': '=^.^=\n/_cat/health\n/_cat/shards\n'}});
    expect(await fetchCatApis()).toEqual(['health', 'shards']);
    expect(calls).toEqual(['/_cat']);
  });

  it('returns nothing for a body that is not the cat index', async () => {
    // An intermediary answering with JSON, or with an error page.
    stubFetch({routes: {'/_cat': {acknowledged: true}}});
    expect(await fetchCatApis()).toEqual([]);
  });
});

describe('fetchInstalledPlugins', () => {
  it('unions the plugin names over every node', async () => {
    stubFetch({
      routes: {
        '/_nodes/_all/plugins': {
          nodes: {
            a: {plugins: [{name: 'opensearch-knn'}, {name: 'query-insights'}]},
            b: {plugins: [{name: 'opensearch-knn'}, {name: 'analysis-fess'}]},
          },
        },
      },
    });
    expect(await fetchInstalledPlugins()).toEqual([
      'analysis-fess',
      'opensearch-knn',
      'query-insights',
    ]);
  });

  it('tolerates a node that reports no plugins', async () => {
    stubFetch({routes: {'/_nodes/_all/plugins': {nodes: {a: {}}}}});
    expect(await fetchInstalledPlugins()).toEqual([]);
  });
});

describe('explainAllocation', () => {
  /** The shape 2.19.1 and 3.8.0 both answer with, cut to what is read. */
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

  it('posts, because naming a shard needs a body', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(EXPLANATION), {status: 200}));
    vi.stubGlobal('fetch', fetcher);

    const explanation = await explainAllocation({index: 'fess.20260902', shard: 0, primary: false});

    expect(fetcher.mock.calls[0][0]).toContain('/_cluster/allocation/explain');
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      index: 'fess.20260902',
      shard: 0,
      primary: false,
    });
    expect(explanation?.can_allocate).toBe('no');
  });

  it('asks about any unassigned shard when given no target', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(EXPLANATION), {status: 200}));
    vi.stubGlobal('fetch', fetcher);

    await explainAllocation();
    expect((fetcher.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });

  it('resolves null when there is nothing to explain', async () => {
    // A green cluster answers the explain API with 400, not with a body.
    const body = {
      error: {
        type: 'illegal_argument_exception',
        reason: 'unable to find any unassigned shards to explain [ClusterAllocationExplainRequest]',
      },
      status: 400,
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), {status: 400})));

    await expect(explainAllocation()).resolves.toBeNull();
  });

  it('still reports a 400 that means something else', async () => {
    const body = {error: {type: 'illegal_argument_exception', reason: 'index [nope] not found'}};
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), {status: 400})));

    await expect(explainAllocation()).rejects.toBeInstanceOf(RequestError);
  });
});

describe('fetchTasks', () => {
  it('asks for the flat, detailed listing', async () => {
    const calls = stubFetch({
      routes: {'/_tasks?detailed&group_by=none': {tasks: [{node: 'n1', id: 1}]}},
    });
    const tasks = await fetchTasks();
    expect(calls).toEqual(['/_tasks?detailed&group_by=none']);
    expect(tasks).toHaveLength(1);
  });

  it('returns nothing when the cluster reports no tasks', async () => {
    stubFetch({routes: {'/_tasks?detailed&group_by=none': {}}});
    expect(await fetchTasks()).toEqual([]);
  });
});

describe('cancelTask', () => {
  it('posts to the task, with the node prefix intact', async () => {
    const fetcher = vi.fn(async () => new Response('{}', {status: 200}));
    vi.stubGlobal('fetch', fetcher);

    await cancelTask('rZrUM42eQ1mRLB4USOB1SA:32');

    expect(fetcher.mock.calls[0][0]).toContain(
      '/_tasks/rZrUM42eQ1mRLB4USOB1SA%3A32/_cancel',
    );
    expect((fetcher.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });
});

describe('templates', () => {
  it('reads each kind from its own endpoint', async () => {
    const calls = stubFetch({
      routes: {
        [TEMPLATE_PATHS.component]: {
          component_templates: [{name: 'c', component_template: {}}],
        },
        [TEMPLATE_PATHS.index]: {
          index_templates: [{name: 'i', index_template: {index_patterns: ['i-*']}}],
        },
        [TEMPLATE_PATHS.legacy]: {l: {index_patterns: ['l-*']}},
      },
    });

    expect((await fetchTemplates('component')).map((t) => t.name)).toEqual(['c']);
    expect((await fetchTemplates('index')).map((t) => t.name)).toEqual(['i']);
    expect((await fetchTemplates('legacy')).map((t) => t.name)).toEqual(['l']);
    expect(calls).toEqual([
      '/_component_template',
      '/_index_template',
      '/_template',
    ]);
  });

  it('creates and deletes under the endpoint for the kind', async () => {
    const fetcher = vi.fn(async () => new Response('{"acknowledged":true}', {status: 200}));
    vi.stubGlobal('fetch', fetcher);

    await createTemplate('component', 'my comp', '{"template":{}}');
    await deleteTemplate('index', 'my/idx');

    expect(String(fetcher.mock.calls[0][0])).toContain('/_component_template/my%20comp');
    expect((fetcher.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect(String(fetcher.mock.calls[1][0])).toContain('/_index_template/my%2Fidx');
    expect((fetcher.mock.calls[1][1] as RequestInit).method).toBe('DELETE');
  });
});

describe('analyzeText', () => {
  function stubAnalyze(): ReturnType<typeof vi.fn> {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({tokens: []}), {status: 200}));
    vi.stubGlobal('fetch', fetcher);
    return fetcher;
  }

  function sent(fetcher: ReturnType<typeof vi.fn>): Record<string, unknown> {
    return JSON.parse((fetcher.mock.calls[0][1] as RequestInit).body as string);
  }

  it('posts a field to the index endpoint', async () => {
    const fetcher = stubAnalyze();
    await analyzeText({index: 'fess.20260902', field: 'content', text: 'x'});

    expect(String(fetcher.mock.calls[0][0])).toContain('/fess.20260902/_analyze');
    expect((fetcher.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect(sent(fetcher)).toEqual({text: 'x', field: 'content'});
  });

  it('goes to the cluster endpoint when no index is named', async () => {
    // Without an index only the built-in components exist, which is exactly
    // what someone trying a chain out wants.
    const fetcher = stubAnalyze();
    await analyzeText({tokenizer: 'standard', text: 'x'});

    expect(String(fetcher.mock.calls[0][0])).toMatch(/\/_analyze$/);
    expect(sent(fetcher)).toEqual({text: 'x', tokenizer: 'standard'});
  });

  it('sends a composed chain under the names _analyze uses', async () => {
    const fetcher = stubAnalyze();
    await analyzeText({
      index: 'i',
      charFilters: ['html_strip'],
      tokenizer: 'standard',
      filters: ['lowercase', 'asciifolding'],
      text: 'x',
      explain: true,
    });

    expect(sent(fetcher)).toEqual({
      text: 'x',
      char_filter: ['html_strip'],
      tokenizer: 'standard',
      filter: ['lowercase', 'asciifolding'],
      explain: true,
    });
  });

  it('leaves out every part that was not asked for', async () => {
    const fetcher = stubAnalyze();
    await analyzeText({
      index: '',
      field: '',
      analyzer: 'standard',
      charFilters: [],
      filters: [],
      text: 'x',
      explain: false,
    });

    expect(sent(fetcher)).toEqual({text: 'x', analyzer: 'standard'});
  });

  it('parses the chain out of an explained response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            detail: {
              custom_analyzer: true,
              tokenizer: {name: 'standard', tokens: [{token: 'a', start_offset: 0,
                end_offset: 1, position: 0, type: 'word'}]},
              tokenfilters: [{name: 'lowercase', tokens: []}],
            },
          }),
          {status: 200},
        ),
      ),
    );

    const result = await analyzeText({tokenizer: 'standard', text: 'A', explain: true});
    expect(result.explained).toBe(true);
    expect(result.steps.map((s) => s.name)).toEqual(['standard', 'lowercase']);
    expect(result.steps[1].delta).toBe(-1);
  });
});
