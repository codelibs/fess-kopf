import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import IndexTemplatesView from '@/views/IndexTemplatesView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
import {useAlerts} from '@/composables/useAlerts';

const alerts = useAlerts();
const dialogs = useDialogs();

const TEMPLATES = {
  'fess-tpl': {index_patterns: ['fess-*'], settings: {}},
  'other-tpl': {index_patterns: ['other-*'], settings: {}},
};

function stubTemplates(): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT' || init?.method === 'DELETE') {
      return new Response('{"acknowledged":true}', {status: 200});
    }
    return new Response(JSON.stringify(TEMPLATES), {status: 200});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

async function mountLoaded() {
  const fetcher = stubTemplates();
  const wrapper = mount(IndexTemplatesView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('fess-tpl'));
  return {wrapper, fetcher};
}

beforeEach(() => {
  resetSettingsForTest();
  resetDialogsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('IndexTemplatesView', () => {
  it('lists templates with their index patterns', async () => {
    const {wrapper} = await mountLoaded();
    expect(wrapper.text()).toContain('fess-tpl');
    expect(wrapper.text()).toContain('fess-*');
  });

  it('starts from a body that uses index_patterns', async () => {
    // The AngularJS default used "template", removed in Elasticsearch 7.0, so
    // creating a template without editing the body always failed.
    const {wrapper} = await mountLoaded();
    const body = (wrapper.find('#it-body').element as HTMLTextAreaElement).value;
    expect(JSON.parse(body)).toHaveProperty('index_patterns');
    expect(JSON.parse(body)).not.toHaveProperty('template');
  });

  it('filters by name and by index pattern', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.find('#it-f-name').setValue('fess');
    expect(wrapper.text()).not.toContain('other-tpl');
    await wrapper.find('#it-f-name').setValue('');
    await wrapper.find('#it-f-pattern').setValue('other');
    expect(wrapper.text()).toContain('other-tpl');
    expect(wrapper.text()).not.toContain('fess-tpl');
  });

  it('refuses an empty name and an empty body', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    const before = fetcher.mock.calls.length;
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe("Template name can't be empty");

    await wrapper.find('#it-name').setValue('t');
    await wrapper.find('#it-body').setValue('');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toBe("Template body can't be empty");
    expect(fetcher.mock.calls).toHaveLength(before);
  });

  it('refuses an unparseable body', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    const before = fetcher.mock.calls.length;
    await wrapper.find('#it-name').setValue('t');
    await wrapper.find('#it-body').setValue('{not json');
    await wrapper.vm.$nextTick();
    await wrapper.find('form').trigger('submit');
    expect(alerts.alerts.value[0].message).toContain('Invalid JSON');
    expect(fetcher.mock.calls).toHaveLength(before);
  });

  it('creates a template at /_template/<name>', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await wrapper.find('#it-name').setValue('new-tpl');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true),
    );
    const put = fetcher.mock.calls.find((c) => c[1]?.method === 'PUT')!;
    expect(String(put[0])).toContain('/_template/new-tpl');
    expect(JSON.parse(put[1]!.body as string)).toHaveProperty('index_patterns');
  });

  it('loads a template into the form for editing', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text() === 'edit')!.trigger('click');
    expect((wrapper.find('#it-name').element as HTMLInputElement).value).toBe('fess-tpl');
    expect((wrapper.find('#it-body').element as HTMLTextAreaElement).value).toContain('fess-*');
  });

  it('asks before deleting, and sends nothing if declined', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text() === 'delete')!.trigger('click');
    expect(dialogs.confirmRequest.value?.header).toContain('fess-tpl');
    const before = fetcher.mock.calls.length;
    resolveConfirm(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetcher.mock.calls).toHaveLength(before);
  });

  it('deletes when confirmed', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text() === 'delete')!.trigger('click');
    resolveConfirm(true);
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(true),
    );
    const call = fetcher.mock.calls.find((c) => c[1]?.method === 'DELETE')!;
    expect(String(call[0])).toContain('/_template/fess-tpl');
  });

  it('reports a failed load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    mount(IndexTemplatesView);
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));
    expect(alerts.alerts.value[0].message).toBe('Error while loading templates');
  });
});
