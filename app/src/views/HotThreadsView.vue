<script setup lang="ts">
import {ref} from 'vue';
import {RequestError} from '@/api/client';
import {fetchHotThreads, type HotThreadsOptions} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
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
      'Error while fetching hot threads',
      error instanceof RequestError ? error.body : String(error),
    );
    results.value = null;
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="card">
    <div class="card-header">hot threads</div>
    <div class="card-body">
      <form class="row g-2 align-items-end mb-3" @submit.prevent="execute">
        <div class="col-auto">
          <label class="form-label mb-0 small" for="ht-threads">number of threads</label>
          <select id="ht-threads" v-model.number="threads" class="form-select form-select-sm">
            <option v-for="count in THREAD_COUNTS" :key="count" :value="count">{{ count }}</option>
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label mb-0 small" for="ht-node">node</label>
          <select id="ht-node" v-model="node" class="form-select form-select-sm">
            <option value="">all nodes</option>
            <option v-for="n in cluster?.nodes ?? []" :key="n.id" :value="n.id">
              {{ n.name }}
            </option>
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label mb-0 small" for="ht-type">type</label>
          <select id="ht-type" v-model="type" class="form-select form-select-sm">
            <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label mb-0 small" for="ht-interval">sampling interval</label>
          <input
            id="ht-interval"
            v-model="interval"
            class="form-control form-control-sm"
            placeholder="sampling interval"
          >
        </div>
        <div class="col-auto">
          <div class="form-check">
            <input
              id="ht-idle"
              v-model="ignoreIdleThreads"
              class="form-check-input"
              type="checkbox"
            >
            <label class="form-check-label small" for="ht-idle">ignore idle threads</label>
          </div>
        </div>
        <div class="col-auto">
          <button type="submit" class="btn btn-sm btn-primary" :disabled="running">
            {{ running ? 'sampling…' : 'execute' }}
          </button>
        </div>
      </form>

      <div v-if="results">
        <p v-if="results.length === 0" class="text-body-secondary">no nodes reported</p>
        <details v-for="(nodeThreads, i) in results" :key="i" class="mb-3" open>
          <summary>
            <span class="font-monospace small">:::{{ nodeThreads.header }}</span>
          </summary>
          <pre v-if="nodeThreads.subHeader" class="small mb-1">{{ nodeThreads.subHeader }}</pre>
          <p v-if="nodeThreads.threads.length === 0" class="text-body-secondary small mb-0">
            no busy threads on this node
          </p>
          <div v-for="(thread, t) in nodeThreads.threads" :key="t" class="mb-2">
            <pre class="small mb-0">{{ thread.header }}</pre>
            <pre v-if="thread.subHeader" class="small mb-0">{{ thread.subHeader }}</pre>
            <pre v-if="thread.stack.length" class="small mb-0">{{ thread.stack.join('\n') }}</pre>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>
