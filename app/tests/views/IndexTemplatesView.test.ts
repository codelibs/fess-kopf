import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import IndexTemplatesView from '@/views/IndexTemplatesView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
import {useAlerts} from '@/composables/useAlerts';
import {chooseInSelect} from '../support/naive';

const alerts = useAlerts();
const dialogs = useDialogs();

/**
 * What each endpoint answers with. Taken from 3.8.0 and confirmed identical
 * on 2.19.1: the composable pair returns an array of
 * {name, <kind>_template}, the legacy endpoint an object keyed by name.
 */
const INDEX_TEMPLATES = {
  index_templates: [
    {
      name: 'fess-tpl',
      index_template: {
        index_patterns: ['fess-*'],
        composed_of: ['fess-comp'],
        priority: 200,
        template: {settings: {index: {number_of_replicas: '0'}}},
      },
    },
    {
      name: 'other-tpl',
      index_template: {index_patterns: ['other-*'], composed_of: []},
    },
  ],
};

const COMPONENT_TEMPLATES = {
  component_templates: [
    {
      name: 'fess-comp',
      component_template: {
        template: {settings: {index: {number_of_shards: '1'}}},
        version: 3,
      },
    },
  ],
};

const LEGACY_TEMPLATES = {
  'legacy-tpl': {index_patterns: ['legacy-*'], settings: {}},
};

function bodyFor(url: string): unknown {
  if (url.includes('/_component_template')) {
    return COMPONENT_TEMPLATES;
  }
  if (url.includes('/_index_template')) {
    return INDEX_TEMPLATES;
  }
  return LEGACY_TEMPLATES;
}

function stubTemplates(): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT' || init?.method === 'DELETE') {
      return new Response('{"acknowledged":true}', {status: 200});
    }
    return new Response(JSON.stringify(bodyFor(url)), {status: 200});
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
  it('opens on the composable index templates, which is the current form', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    expect(String(fetcher.mock.calls[0][0])).toContain('/_index_template');
    expect(wrapper.text()).toContain('fess-tpl');
    expect(wrapper.text()).toContain('fess-*');
  });

  it('shows what an index template is composed of', async () => {
    const {wrapper} = await mountLoaded();
    expect(wrapper.text()).toContain('fess-comp');
  });

  it('starts from a body shaped for the kind on screen', async () => {
    const {wrapper} = await mountLoaded();
    const parsed = JSON.parse((wrapper.find('#it-body').element as HTMLTextAreaElement).value);
    expect(parsed).toHaveProperty('index_patterns');
    expect(parsed).toHaveProperty('composed_of');
    // Settings live under `template` on a composable template, not beside it.
    expect(parsed.template).toHaveProperty('settings');
  });

  it('filters by name and by index pattern', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.find('#it-f-name').setValue('fess');
    expect(wrapper.text()).not.toContain('other-tpl');
    await wrapper.find('#it-f-name').setValue('');
    await wrapper.find('#it-f-pattern').setValue('other');
    expect(wrapper.text()).toContain('other-tpl');
    expect(wrapper.text()).not.toContain('fess-*');
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

  it('creates at the endpoint for the kind on screen', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await wrapper.find('#it-name').setValue('new-tpl');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true),
    );
    const put = fetcher.mock.calls.find((c) => c[1]?.method === 'PUT')!;
    expect(String(put[0])).toContain('/_index_template/new-tpl');
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

  it('deletes at the endpoint the template came from', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text() === 'delete')!.trigger('click');
    resolveConfirm(true);
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(true),
    );
    const call = fetcher.mock.calls.find((c) => c[1]?.method === 'DELETE')!;
    expect(String(call[0])).toContain('/_index_template/fess-tpl');
  });

  it('reports a failed load, and empties the list rather than keeping stale rows', async () => {
    const {wrapper} = await mountLoaded();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    await chooseInSelect(wrapper, 'it-kind', 'legacy');
    await vi.waitFor(() => expect(alerts.alerts.value.length).toBeGreaterThan(0));

    expect(alerts.alerts.value[0].message).toBe('Error while loading templates');
    expect(wrapper.text()).not.toContain('fess-tpl');
  });
});

describe('IndexTemplatesView, switching kind', () => {
  it('reads the component endpoint and drops the pattern filter', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    expect(wrapper.find('#it-f-pattern').exists()).toBe(true);

    await chooseInSelect(wrapper, 'it-kind', 'component');
    // Not `toContain('fess-comp')`: that string is already on screen as
    // the index template's composed_of, so it would pass before the
    // switch had loaded anything.
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('fess-tpl'));

    expect(
      fetcher.mock.calls.some((c) => String(c[0]).includes('/_component_template')),
    ).toBe(true);
    // A component template has no index patterns, so filtering by one could
    // only ever empty the list.
    expect(wrapper.find('#it-f-pattern').exists()).toBe(false);
  });

  it('still reads the deprecated endpoint, which older clusters carry', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await chooseInSelect(wrapper, 'it-kind', 'legacy');
    await vi.waitFor(() => expect(wrapper.text()).toContain('legacy-tpl'));

    const listed = fetcher.mock.calls.map((c) => String(c[0]));
    expect(listed.some((url) => url.endsWith('/_template'))).toBe(true);
  });

  it('swaps the starting body, because the three shapes are not interchangeable', async () => {
    const {wrapper} = await mountLoaded();
    await chooseInSelect(wrapper, 'it-kind', 'component');
    await wrapper.vm.$nextTick();

    const parsed = JSON.parse((wrapper.find('#it-body').element as HTMLTextAreaElement).value);
    expect(parsed).not.toHaveProperty('index_patterns');
    expect(parsed.template).toHaveProperty('mappings');
  });

  it('keeps a body the user has edited', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.find('#it-body').setValue('{"mine": true}');
    await wrapper.vm.$nextTick();

    await chooseInSelect(wrapper, 'it-kind', 'component');
    await wrapper.vm.$nextTick();

    expect((wrapper.find('#it-body').element as HTMLTextAreaElement).value).toBe('{"mine": true}');
  });

  it('creates and deletes at the component endpoint once switched', async () => {
    const {wrapper, fetcher} = await mountLoaded();
    await chooseInSelect(wrapper, 'it-kind', 'component');
    // Not `toContain('fess-comp')`: that string is already on screen as
    // the index template's composed_of, so it would pass before the
    // switch had loaded anything.
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('fess-tpl'));

    await wrapper.find('#it-name').setValue('new-comp');
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true),
    );
    const put = fetcher.mock.calls.find((c) => c[1]?.method === 'PUT')!;
    expect(String(put[0])).toContain('/_component_template/new-comp');

    await wrapper.findAll('button').find((b) => b.text() === 'delete')!.trigger('click');
    resolveConfirm(true);
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(true),
    );
    const del = fetcher.mock.calls.find((c) => c[1]?.method === 'DELETE')!;
    expect(String(del[0])).toContain('/_component_template/fess-comp');
  });
});
