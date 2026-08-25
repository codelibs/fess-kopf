<script setup lang="ts">
import {computed, ref} from 'vue';
import {NButton, NCard, NCheckbox, NInput, NSelect} from 'naive-ui';
import {RequestError} from '@/api/client';
import {fetchHotThreads, type HotThreadsOptions} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';
import type {NodeHotThreads} from '@/model/hot-threads';

const alerts = useAlerts();
const {cluster} = useCluster();

const THREAD_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TYPES: HotThreadsOptions['type'][] = ['cpu', 'wait', 'block'];

const node = ref('');
const type = ref<HotThreadsOptions['type']>('cpu');
const threads = ref(3);
const interval = ref('500ms');
const ignoreIdleThreads = ref(true);
const results = ref<NodeHotThreads[] | null>(null);
const running = ref(false);

const threadOptions = computed(() => THREAD_COUNTS.map((n) => ({label: String(n), value: n})));
const typeOptions = computed(() => TYPES.map((name) => ({label: name, value: name})));
const nodeOptions = computed(() => [
  {label: t('hotThreads.allNodes'), value: ''},
  ...(cluster.value?.nodes ?? []).map((n) => ({label: n.name, value: n.id})),
]);

async function execute(): Promise<void> {
  running.value = true;
  try {
    results.value = await fetchHotThreads({
      node: node.value,
      type: type.value,
      threads: threads.value,
      interval: interval.value,
      ignoreIdleThreads: ignoreIdleThreads.value,
    });
  } catch (error) {
    alerts.error(
      t('hotThreads.failed'),
      error instanceof RequestError ? error.body : String(error),
    );
    results.value = null;
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('hotThreads.title') }}</h1>
      <p class="k-page-sub">{{ t('hotThreads.sub') }}</p>
    </div>
  </div>

  <NCard>
    <form class="k-row k-wrap k-gap-lg" style="align-items: flex-end" @submit.prevent="execute">
      <div>
        <span id="ht-threads-label" class="k-label">number of threads</span>
        <NSelect
          id="ht-threads"
          v-model:value="threads"
          aria-labelledby="ht-threads-label"
          :options="threadOptions"
          style="width: 8rem"
        />
      </div>
      <div>
        <span id="ht-node-label" class="k-label">node</span>
        <NSelect
          id="ht-node"
          v-model:value="node"
          aria-labelledby="ht-node-label"
          :options="nodeOptions"
          filterable
          style="width: 14rem"
        />
      </div>
      <div>
        <span id="ht-type-label" class="k-label">type</span>
        <NSelect
          id="ht-type"
          v-model:value="type"
          aria-labelledby="ht-type-label"
          :options="typeOptions"
          style="width: 8rem"
        />
      </div>
      <div>
        <label class="k-label" for="ht-interval">sampling interval</label>
        <NInput
          v-model:value="interval"
          :placeholder="t('hotThreads.intervalPlaceholder')"
          style="width: 10rem"
          :input-props="{id: 'ht-interval'}"
        />
      </div>
      <NCheckbox id="ht-idle" v-model:checked="ignoreIdleThreads">ignore idle threads</NCheckbox>
      <NButton attr-type="submit" type="primary" :loading="running" :disabled="running">
        {{ running ? t('hotThreads.sampling') : t('common.execute') }}
      </NButton>
    </form>
  </NCard>

  <template v-if="results">
    <NCard v-if="results.length === 0">
      <p class="k-empty">{{ t('hotThreads.noNodes') }}</p>
    </NCard>
    <NCard v-for="(nodeThreads, i) in results" v-else :key="i">
      <details class="k-threads" open>
        <summary class="k-mono k-strong">:::{{ nodeThreads.header }}</summary>
        <pre v-if="nodeThreads.subHeader" class="k-pre" style="margin-top: 8px">{{
          nodeThreads.subHeader
        }}</pre>
        <p v-if="nodeThreads.threads.length === 0" class="k-muted k-small" style="margin: 8px 0 0">
          {{ t('hotThreads.noBusyThreads') }}
        </p>
        <div
          v-for="(thread, index) in nodeThreads.threads" :key="index" class="k-stack-tight"
          style="margin-top: 10px"
        >
          <pre class="k-pre">{{ thread.header }}</pre>
          <pre v-if="thread.subHeader" class="k-pre">{{ thread.subHeader }}</pre>
          <pre v-if="thread.stack.length" class="k-pre">{{ thread.stack.join('\n') }}</pre>
        </div>
      </details>
    </NCard>
  </template>
</template>

<style scoped>
.k-threads > summary {
  cursor: pointer;
}
</style>
