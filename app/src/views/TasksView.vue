<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {NButton, NCard, NCheckbox, NInput, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {cancelTask, fetchTasks} from '@/api/opensearch';
import {getSettings} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {confirm} from '@/composables/useDialogs';
import {t} from '@/i18n';
import {isListing, parseTasks, type ClusterTask} from '@/model/task';

const alerts = useAlerts();

const tasks = ref<ClusterTask[]>([]);
const filter = ref('');
const showListing = ref(false);
const loading = ref(false);
const loaded = ref(false);

let poller: ReturnType<typeof setInterval> | null = null;

const visible = computed(() =>
  tasks.value
    .filter((task) => showListing.value || !isListing(task))
    .filter((task) => {
      const needle = filter.value.trim().toLowerCase();
      return (
        needle === '' ||
        task.action.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle)
      );
    }),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    tasks.value = parseTasks(await fetchTasks());
    loaded.value = true;
  } catch (error) {
    alerts.error(t('tasks.failed'), error instanceof RequestError ? error.body : String(error));
  } finally {
    loading.value = false;
  }
}

/** Cancelling is a destructive action, so it goes through the dialog. */
async function promptCancel(task: ClusterTask): Promise<void> {
  const confirmed = await confirm(
    t('tasks.cancelHeader'),
    t('tasks.cancelBody', {action: task.action, id: task.taskId}),
    t('tasks.cancelConfirm'),
  );
  if (!confirmed) {
    return;
  }
  try {
    await cancelTask(task.taskId);
    alerts.success(t('tasks.cancelled', {id: task.taskId}));
    await load();
  } catch (error) {
    alerts.error(
      t('tasks.cancelFailed', {id: task.taskId}),
      error instanceof RequestError ? error.body : String(error),
    );
  }
}

/** Seconds when a task has been running long enough for that to read better. */
function duration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

onMounted(() => {
  void load();
  poller = setInterval(() => void load(), getSettings().refresh_rate);
});

onBeforeUnmount(() => {
  if (poller !== null) {
    clearInterval(poller);
    poller = null;
  }
});
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('tasks.title') }}</h1>
      <p class="k-page-sub">{{ t('tasks.sub') }}</p>
    </div>
    <NButton :loading="loading" @click="load()">{{ t('common.refresh') }}</NButton>
  </div>

  <NCard>
    <div class="k-row k-wrap k-gap-lg">
      <NInput
        v-model:value="filter"
        :placeholder="t('tasks.filter')"
        clearable
        :aria-label="t('tasks.filter')"
        style="max-width: 24rem"
        :input-props="{id: 'task-filter'}"
      />
      <!-- Every /_tasks call reports itself and its per-node children. That
           is noise on a screen whose point is what else is running. -->
      <NCheckbox id="f-listing" v-model:checked="showListing">
        {{ t('tasks.showListing') }}
      </NCheckbox>
    </div>

    <div class="k-scroll-x" style="margin-top: 16px">
      <table v-if="visible.length" class="k-matrix">
        <thead>
          <tr>
            <th scope="col">action</th>
            <th scope="col">description</th>
            <th scope="col">node</th>
            <th scope="col">running</th>
            <th scope="col">task_id</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in visible" :key="task.taskId">
            <td class="k-mono">{{ task.action }}</td>
            <td class="k-mono k-small">{{ task.description }}</td>
            <td class="k-mono">{{ task.node }}</td>
            <td class="k-mono">{{ duration(task.runningTimeMs) }}</td>
            <td class="k-mono k-small">{{ task.taskId }}</td>
            <td>
              <NTag v-if="task.cancelled" size="tiny" type="warning" :bordered="false">
                cancelled
              </NTag>
              <NButton
                v-else-if="task.stoppable"
                size="tiny"
                type="error"
                @click="promptCancel(task)"
              >
                {{ t('tasks.cancel') }}
              </NButton>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="loaded" class="k-empty">{{ t('tasks.empty') }}</p>
    </div>
  </NCard>
</template>
