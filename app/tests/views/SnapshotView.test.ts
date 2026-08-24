import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import SnapshotView from '@/views/SnapshotView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest} from '@/composables/useCluster';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
import {useAlerts} from '@/composables/useAlerts';
import {chooseInSelect, optionLabels, setCheckbox} from '../support/naive';
import {okRoutes, stubFetch} from '../api/routes';

const alerts = useAlerts();
const dialogs = useDialogs();

const REPOSITORIES = {backups: {type: 'fs', settings: {location: '/backup'}}};
const SNAPSHOTS = {
  snapshots: [
    {snapshot: 'snap-1', indices: ['idx'], state: 'SUCCESS'},
    {snapshot: 'snap-2', indices: [], state: 'IN_PROGRESS'},
  ],
};

function stubSnapshot(): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method !== undefined && init.method !== 'GET') {
      return new Response('{"acknowledged":true}', {status: 200});
    }
    if (url.includes('/_snapshot/_all')) {
      return new Response(JSON.stringify(REPOSITORIES), {status: 200});
    }
    if (url.includes('/_all')) {
      return new Response(JSON.stringify(SNAPSHOTS), {status: 200});
    }
    return new Response('{}', {status: 200});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const callOf = (fetcher: ReturnType<typeof vi.fn>, method: string) =>
  fetcher.mock.calls.find((c) => c[1]?.method === method);

async function mountLoaded() {
  const fetcher = stubSnapshot();
  const wrapper = mount(SnapshotView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('backups'));
  return {wrapper, fetcher};
}

beforeEach(async () => {
  resetSettingsForTest();
  resetClusterForTest();
  resetDialogsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
  stubFetch({routes: okRoutes()});
  await refresh();
});

afterEach(() => vi.unstubAllGlobals());

describe('SnapshotView', () => {
  it('lists repositories with their type', async () => {
    const {wrapper} = await mountLoaded();
    expect(wrapper.text()).toContain('backups');
    expect(wrapper.text()).toContain('(fs)');
    expect(wrapper.text()).toContain('select a repository');
  });

  it('loads the snapshots of the repository that was picked', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text().includes('backups'))!.trigger('click');
    await vi.waitFor(() => expect(wrapper.text()).toContain('snap-1'));
    expect(wrapper.text()).toContain('SUCCESS');
    expect(wrapper.text()).toContain('1 indices');
  });

  it('filters snapshots by name', async () => {
    const {wrapper} = await mountLoaded();
    await wrapper.findAll('button').find((b) => b.text().includes('backups'))!.trigger('click');
    await vi.waitFor(() => expect(wrapper.text()).toContain('snap-1'));
    await wrapper.find('#sn-filter').setValue('snap-2');
    expect(wrapper.text()).not.toContain('snap-1');
    expect(wrapper.text()).toContain('snap-2');
  });

  describe('repository form', () => {
    it('shows only the settings the chosen type takes', async () => {
      const {wrapper} = await mountLoaded();
      expect(wrapper.find('#sn-set-location').exists()).toBe(false);
      await chooseInSelect(wrapper, 'sn-repo-type', 'fs');
      expect(wrapper.find('#sn-set-location').exists()).toBe(true);
      expect(wrapper.find('#sn-set-bucket').exists()).toBe(false);
      await chooseInSelect(wrapper, 'sn-repo-type', 's3');
      expect(wrapper.find('#sn-set-bucket').exists()).toBe(true);
      expect(wrapper.find('#sn-set-location').exists()).toBe(false);
    });

    it('refuses to create without the required setting', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await wrapper.find('#sn-repo-name').setValue('r');
      await chooseInSelect(wrapper, 'sn-repo-type', 'fs');
      await wrapper.findAll('form')[0].trigger('submit');
      expect(alerts.alerts.value[0].message).toContain('location is required');
      expect(callOf(fetcher, 'POST')).toBeUndefined();
    });

    it('creates the repository with only its own settings', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await wrapper.find('#sn-repo-name').setValue('r');
      await chooseInSelect(wrapper, 'sn-repo-type', 'fs');
      await wrapper.find('#sn-set-location').setValue('/backup');
      await wrapper.findAll('form')[0].trigger('submit');
      await vi.waitFor(() => expect(callOf(fetcher, 'POST')).toBeDefined());
      const call = callOf(fetcher, 'POST')!;
      expect(String(call[0])).toContain('/_snapshot/r');
      expect(JSON.parse(call[1]!.body as string)).toEqual({
        type: 'fs',
        settings: {location: '/backup'},
      });
    });

    it('asks before deleting a repository', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await wrapper.findAll('button').find((b) => b.text() === 'delete')!.trigger('click');
      expect(dialogs.confirmRequest.value?.header).toContain('backups');
      const before = fetcher.mock.calls.length;
      resolveConfirm(false);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(fetcher.mock.calls).toHaveLength(before);
    });
  });

  describe('snapshot form', () => {
    it('requires a repository and a name', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await wrapper.findAll('form')[1].trigger('submit');
      expect(alerts.alerts.value[0].message).toBe('Repository is required');

      await chooseInSelect(wrapper, 'sn-new-repo', 'backups');
      await wrapper.findAll('form')[1].trigger('submit');
      expect(alerts.alerts.value[0].message).toBe('Snapshot name is required');
      expect(callOf(fetcher, 'PUT')).toBeUndefined();
    });

    it('sends an empty body when nothing optional is chosen', async () => {
      // The optional parameters are left out entirely rather than sent false.
      const {wrapper, fetcher} = await mountLoaded();
      await chooseInSelect(wrapper, 'sn-new-repo', 'backups');
      await wrapper.find('#sn-new-name').setValue('nightly');
      await wrapper.findAll('form')[1].trigger('submit');
      await vi.waitFor(() => expect(callOf(fetcher, 'PUT')).toBeDefined());
      const call = callOf(fetcher, 'PUT')!;
      expect(String(call[0])).toContain('/_snapshot/backups/nightly');
      expect(JSON.parse(call[1]!.body as string)).toEqual({});
    });

    it('includes the options that were ticked', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await chooseInSelect(wrapper, 'sn-new-repo', 'backups');
      await wrapper.find('#sn-new-name').setValue('nightly');
      await setCheckbox(wrapper, 'sn-global', true);
      await wrapper.findAll('form')[1].trigger('submit');
      await vi.waitFor(() => expect(callOf(fetcher, 'PUT')).toBeDefined());
      expect(JSON.parse(callOf(fetcher, 'PUT')![1]!.body as string)).toEqual({
        include_global_state: true,
      });
    });

    it('hides special indices until asked', async () => {
      const {wrapper} = await mountLoaded();
      const options = () => optionLabels(wrapper, 'sn-new-indices');
      expect(options()).toEqual(['test-index']);
      await setCheckbox(wrapper, 'sn-special', true);
      expect(options()).toEqual(['test-index']);
    });
  });

  describe('restore', () => {
    it('appears only after a snapshot is selected, and posts to _restore', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await wrapper.findAll('button').find((b) => b.text().includes('backups'))!.trigger('click');
      await vi.waitFor(() => expect(wrapper.text()).toContain('snap-1'));
      expect(wrapper.text()).not.toContain('restore snap-1');

      await wrapper.findAll('button').find((b) => b.text() === 'snap-1')!.trigger('click');
      expect(wrapper.text()).toContain('restore snap-1');

      await wrapper.findAll('form').at(-1)!.trigger('submit');
      await vi.waitFor(() => expect(callOf(fetcher, 'POST')).toBeDefined());
      expect(String(callOf(fetcher, 'POST')![0])).toContain('/_snapshot/backups/snap-1/_restore');
    });

    it('carries rename options only when filled in', async () => {
      const {wrapper, fetcher} = await mountLoaded();
      await wrapper.findAll('button').find((b) => b.text().includes('backups'))!.trigger('click');
      await vi.waitFor(() => expect(wrapper.text()).toContain('snap-1'));
      await wrapper.findAll('button').find((b) => b.text() === 'snap-1')!.trigger('click');
      await wrapper.find('#sn-r-pattern').setValue('(.+)');
      await wrapper.find('#sn-r-replacement').setValue('restored_$1');
      await wrapper.findAll('form').at(-1)!.trigger('submit');
      await vi.waitFor(() => expect(callOf(fetcher, 'POST')).toBeDefined());
      expect(JSON.parse(callOf(fetcher, 'POST')![1]!.body as string)).toEqual({
        rename_pattern: '(.+)',
        rename_replacement: 'restored_$1',
      });
    });
  });

  it('reports a failed repository read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"boom"}', {status: 500})),
    );
    mount(SnapshotView);
    // Not alerts[0]: a previous test's reload() can still be in flight when
    // this one starts, so assert the message is present rather than newest.
    await vi.waitFor(() =>
      expect(alerts.alerts.value.some((a) => a.message === 'Error while reading snapshot')).toBe(
        true,
      ),
    );
  });
});
