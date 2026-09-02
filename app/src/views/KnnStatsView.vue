<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {NButton, NCard, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {fetchKnnStats} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {t} from '@/i18n';
import {bytes} from '@/model/format';
import type {KnnStats} from '@/model/knn-stats';

const alerts = useAlerts();

const stats = ref<KnnStats | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    stats.value = await fetchKnnStats();
  } catch (error) {
    alerts.error(t('knn.failed'), error instanceof RequestError ? error.body : String(error));
    stats.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('knn.title') }}</h1>
      <p class="k-page-sub">{{ t('knn.sub') }}</p>
    </div>
    <NButton :loading="loading" @click="load()">{{ t('common.refresh') }}</NButton>
  </div>

  <NCard v-if="stats">
    <!-- The two facts worth reading before any table: a tripped breaker
         stops vector writes, and a full cache turns every query into a
         reload from disk. -->
    <div class="k-row k-wrap k-gap-lg">
      <div>
        <span class="k-label">circuit_breaker_triggered</span>
        <NTag
          id="knn-breaker"
          size="small"
          :bordered="false"
          :type="stats.circuitBreakerTriggered ? 'error' : 'success'"
        >
          {{ stats.circuitBreakerTriggered }}
        </NTag>
      </div>
      <div>
        <span class="k-label">cache_capacity_reached</span>
        <NTag
          id="knn-cache"
          size="small"
          :bordered="false"
          :type="stats.anyCacheFull ? 'warning' : 'success'"
        >
          {{ stats.anyCacheFull }}
        </NTag>
      </div>
      <div v-if="stats.modelIndexStatus">
        <span class="k-label">model_index_status</span>
        <span class="k-mono">{{ stats.modelIndexStatus }}</span>
      </div>
    </div>

    <p v-if="stats.circuitBreakerTriggered" class="k-small" style="color: var(--k-error)">
      {{ t('knn.breakerTripped') }}
    </p>

    <div class="k-scroll-x" style="margin-top: 16px">
      <table v-if="stats.nodes.length" class="k-matrix">
        <thead>
          <tr>
            <th scope="col">node</th>
            <th scope="col">graph memory</th>
            <th scope="col">% of limit</th>
            <th scope="col">hit / miss</th>
            <th scope="col">evictions</th>
            <th scope="col">queries</th>
            <th scope="col">errors</th>
            <th scope="col">indices in cache</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in stats.nodes" :key="node.nodeId">
            <td class="k-mono k-small">{{ node.nodeId }}</td>
            <td class="k-mono">{{ bytes(node.graphMemoryBytes) }}</td>
            <td class="k-mono">{{ node.graphMemoryPercent.toFixed(3) }}%</td>
            <td class="k-mono">{{ node.hitCount }} / {{ node.missCount }}</td>
            <td class="k-mono">{{ node.evictionCount }}</td>
            <td class="k-mono">{{ node.queryRequests }}</td>
            <td class="k-mono">
              {{ node.indexErrors + node.queryErrors + node.loadExceptionCount }}
            </td>
            <td class="k-mono k-small">{{ node.indicesInCache.join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="k-empty">{{ t('knn.empty') }}</p>
    </div>
  </NCard>
</template>
