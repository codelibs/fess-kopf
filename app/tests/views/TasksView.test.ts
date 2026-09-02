import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import TasksView from '@/views/TasksView.vue';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {resetDialogsForTest, resolveConfirm, useDialogs} from '@/composables/useDialogs';
import {setCheckbox} from '../support/naive';

const alerts = useAlerts();
const dialogs = useDialogs();

/**
 * What GET /_tasks?detailed&group_by=none answers with: a real task, its own
 * listing call, and the per-node child that call fans out to.
 */
const TASKS = {
  tasks: [
    {
      node: 'n1',
      id: 42,
      action: 'indices:data/write/reindex',
      description: 'reindex from [fess.20260101] to [fess.20260902]',
      start_time_in_millis: 1788355131755,
      running_time_in_nanos: 12_000_000_000,
      cancellable: true,
      cancelled: false,
    },
    {
      node: 'n1',
      id: 7,
      action: 'indices:admin/forcemerge',
      description: '',
      start_time_in_millis: 1788355131755,
      running_time_in_nanos: 500_000_000,
      cancellable: false,
      cancelled: false,
    },
    {
      node: 'n1',
      id: 99,
      action: 'cluster:monitor/tasks/lists',
      description: '',
      start_time_in_millis: 1788355131755,
      running_time_in_nanos: 200_000,
      cancellable: false,
    },
  ],
};

function stubTasks(body: unknown = TASKS): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    if ((init?.method ?? 'GET') !== 'GET') {
      return new Response('{}', {status: 200});
    }
    return new Response(JSON.stringify(body), {status: 200});
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

async function settle(): Promise<void> {
  await vi.waitFor(() => expect(document.body).toBeDefined());
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  resetSettingsForTest();
  resetDialogsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('TasksView', () => {
  it('lists what is running, longest first, and hides its own listing call', async () => {
    const fetcher = stubTasks();
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    expect(fetcher.mock.calls[0][0]).toContain('/_tasks?detailed&group_by=none');
    const actions = wrapper.findAll('tbody tr td:first-child').map((c) => c.text());
    expect(actions).toEqual(['indices:data/write/reindex', 'indices:admin/forcemerge']);
  });

  it('shows the listing call when asked to', async () => {
    stubTasks();
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    await setCheckbox(wrapper, 'f-listing', true);
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });

  it('filters on the action and on the description', async () => {
    stubTasks();
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    await wrapper.find('#task-filter').setValue('forcemerge');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);

    await wrapper.find('#task-filter').setValue('fess.20260101');
    expect(wrapper.findAll('tbody tr td:first-child')[0].text()).toBe(
      'indices:data/write/reindex',
    );
  });

  it('offers to cancel only the task that reports itself cancellable', async () => {
    stubTasks();
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].find('button').exists()).toBe(true);
    expect(rows[1].find('button').exists()).toBe(false);
  });

  it('asks before cancelling, and sends nothing until the dialog is accepted', async () => {
    const fetcher = stubTasks();
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));
    const before = fetcher.mock.calls.length;

    await wrapper.findAll('tbody tr')[0].find('button').trigger('click');
    expect(dialogs.confirmRequest.value).not.toBeNull();
    expect(fetcher.mock.calls).toHaveLength(before);

    resolveConfirm(false);
    await settle();
    expect(fetcher.mock.calls).toHaveLength(before);
  });

  it('cancels the task by its node-qualified id once accepted', async () => {
    const fetcher = stubTasks();
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('tbody tr').exists()).toBe(true));

    await wrapper.findAll('tbody tr')[0].find('button').trigger('click');
    resolveConfirm(true);
    await vi.waitFor(() =>
      expect(fetcher.mock.calls.some((call) => String(call[0]).includes('_cancel'))).toBe(true),
    );

    const cancel = fetcher.mock.calls.find((call) => String(call[0]).includes('_cancel'))!;
    expect(String(cancel[0])).toContain('/_tasks/n1%3A42/_cancel');
    expect((cancel[1] as RequestInit).method).toBe('POST');
  });

  it('says so when nothing is running', async () => {
    stubTasks({tasks: []});
    const wrapper = mount(TasksView);
    await vi.waitFor(() => expect(wrapper.find('.k-empty').exists()).toBe(true));
    expect(wrapper.find('.k-empty').text()).toBe('no tasks running');
  });

  it('reports a failure instead of rendering an empty table', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({error: 'nope'}), {status: 403})),
    );
    mount(TasksView);
    await vi.waitFor(() => expect(alerts.alerts.value).toHaveLength(1));
    expect(alerts.alerts.value[0].message).toBe('Error while fetching tasks');
  });
});
