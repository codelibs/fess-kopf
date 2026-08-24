import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import HotThreadsView from '@/views/HotThreadsView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {chooseInSelect, isChecked, optionLabels, selectById, setCheckbox} from '../support/naive';
import {stubFetch} from '../api/routes';

const alerts = useAlerts();

// Real output shape, assembled so no source line exceeds the length rule.
const OUTPUT = [
  '::: {search01}{HTsFSGtD}{172.20.0.3:9300}{dimml}',
  '   Hot threads at 2026-08-23T18:08:40.562Z, interval=500ms, busiestThreads=3:',
  '',
  "   12.3% (61.5ms out of 500ms) cpu usage by thread 'opensearch[search01][write]'",
  '     2/10 snapshots sharing following 2 elements',
  '       app//org.apache.lucene.index.IndexWriter.addDocument(IndexWriter.java:1)',
  '',
  '',
].join('\n');

function stubHotThreads(body = OUTPUT, status = 200): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () => new Response(body, {status}));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(() => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('HotThreadsView', () => {
  it('starts on the shipped defaults', () => {
    const wrapper = mount(HotThreadsView);
    expect(selectById(wrapper, 'ht-threads').props('value')).toBe(3);
    expect(selectById(wrapper, 'ht-type').props('value')).toBe('cpu');
    expect((wrapper.find('#ht-interval').element as HTMLInputElement).value).toBe('500ms');
    expect(isChecked(wrapper, 'ht-idle')).toBe(true);
    expect(selectById(wrapper, 'ht-node').props('value')).toBe('');
  });

  it('offers the cluster nodes once a poll has run', async () => {
    stubFetch();
    await refresh();
    const wrapper = mount(HotThreadsView);
    expect(optionLabels(wrapper, 'ht-node')).toEqual(['all nodes', 'search01']);
  });

  it('samples every node when none is chosen', async () => {
    const fetcher = stubHotThreads();
    const wrapper = mount(HotThreadsView);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('/_nodes/hot_threads?');
    expect(url).toContain('type=cpu');
    expect(url).toContain('threads=3');
    expect(url).toContain('interval=500ms');
    expect(url).toContain('ignore_idle_threads=true');
  });

  it('targets one node when chosen, and encodes its id', async () => {
    stubFetch();
    await refresh();
    const fetcher = stubHotThreads();
    const wrapper = mount(HotThreadsView);
    await chooseInSelect(wrapper, 'ht-node', 'n1');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][0]).toContain('/_nodes/n1/hot_threads?');
  });

  it('carries the chosen options into the request', async () => {
    const fetcher = stubHotThreads();
    const wrapper = mount(HotThreadsView);
    await chooseInSelect(wrapper, 'ht-type', 'block');
    await chooseInSelect(wrapper, 'ht-threads', 7);
    await wrapper.find('#ht-interval').setValue('1s');
    await setCheckbox(wrapper, 'ht-idle', false);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('type=block');
    expect(url).toContain('threads=7');
    expect(url).toContain('interval=1s');
    expect(url).toContain('ignore_idle_threads=false');
  });

  it('renders the sampled thread', async () => {
    stubHotThreads();
    const wrapper = mount(HotThreadsView);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('details').exists()).toBe(true));
    expect(wrapper.text()).toContain('search01');
    expect(wrapper.text()).toContain('12.3% (61.5ms out of 500ms) cpu usage');
    expect(wrapper.text()).toContain('IndexWriter.addDocument');
  });

  it('says so when a node has no busy threads', async () => {
    stubHotThreads(`::: {search01}{HTsFSGtD}
   Hot threads at 2026-08-23T18:08:40.562Z, interval=500ms:

`);
    const wrapper = mount(HotThreadsView);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('details').exists()).toBe(true));
    expect(wrapper.text()).toContain('no busy threads on this node');
  });

  it('reports a failure and clears the previous result', async () => {
    stubHotThreads();
    const wrapper = mount(HotThreadsView);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.find('details').exists()).toBe(true));

    stubHotThreads('{"error":"boom"}', 500);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(wrapper.find('details').exists()).toBe(false);
    expect(alerts.alerts.value[0].message).toBe('Error while fetching hot threads');
  });
});
