<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {NButton, NCard, NSelect, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {fetchTopQueries} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {showInfo} from '@/composables/useDialogs';
import {t} from '@/i18n';
import {bytes} from '@/model/format';
import {
  parseTopQueries,
  TOP_QUERY_METRICS,
  type TopQuery,
  type TopQueryMetric,
} from '@/model/top-query';

const alerts = useAlerts();

const metric = ref<TopQueryMetric>('latency');
const queries = ref<TopQuery[]>([]);
const loading = ref(false);
const loaded = ref(false);

const metricOptions = computed(() =>
  TOP_QUERY_METRICS.map((name) => ({label: name, value: name})),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    queries.value = parseTopQueries(await fetchTopQueries(metric.value), metric.value);
    loaded.value = true;
  } catch (error) {
    alerts.error(
      t('topQueries.failed'),
      error instanceof RequestError ? error.body : String(error),
    );
    queries.value = [];
  } finally {
    loading.value = false;
  }
}

watch(metric, () => void load(), {immediate: true});

/** The ranked measurement, in the unit the plugin reports it in. */
function measurement(query: TopQuery): string {
  if (metric.value === 'latency') {
    return `${query.latencyMs} ms`;
  }
  if (metric.value === 'cpu') {
    return `${(query.cpuNanos / 1e6).toFixed(1)} ms`;
  }
  return bytes(query.memoryBytes);
}

function when(timestamp: number): string {
  return new Date(timestamp).toTimeString().substring(0, 8);
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('topQueries.title') }}</h1>
      <p class="k-page-sub">{{ t('topQueries.sub') }}</p>
    </div>
    <NButton :loading="loading" @click="load()">{{ t('common.refresh') }}</NButton>
  </div>

  <NCard>
    <div class="k-row k-wrap k-gap-lg">
      <span id="tq-metric-label" class="k-label" style="margin: 0">metric</span>
      <NSelect
        id="tq-metric"
        v-model:value="metric"
        aria-labelledby="tq-metric-label"
        :options="metricOptions"
        style="width: 10rem"
      />
    </div>

    <div class="k-scroll-x" style="margin-top: 16px">
      <table v-if="queries.length" class="k-matrix">
        <thead>
          <tr>
            <th scope="col">time</th>
            <th scope="col">{{ metric }}</th>
            <th scope="col">indices</th>
            <th scope="col">shards</th>
            <th scope="col">search_type</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="query in queries" :key="query.id">
            <td class="k-mono">{{ when(query.timestamp) }}</td>
            <td class="k-mono k-strong">{{ measurement(query) }}</td>
            <td class="k-mono k-small">{{ query.indices.join(', ') }}</td>
            <td class="k-mono">{{ query.totalShards }}</td>
            <td class="k-mono k-small">{{ query.searchType }}</td>
            <td>
              <NButton
                v-if="query.source !== undefined"
                text
                size="tiny"
                type="primary"
                @click="showInfo(t('topQueries.sourceTitle'), query.source)"
              >
                {{ t('topQueries.showSource') }}
              </NButton>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Empty is ambiguous here, and the ambiguity is worth spelling out:
           3.8.0 records without configuration, 2.19.1 records nothing until
           the setting is enabled. -->
      <div v-else-if="loaded" class="k-empty">
        <p>{{ t('topQueries.empty') }}</p>
        <p class="k-small">
          {{ t('topQueries.notCollecting') }}
          <NTag size="tiny" :bordered="false" class="k-mono">
            search.insights.top_queries.{{ metric }}.enabled
          </NTag>
        </p>
      </div>
    </div>
  </NCard>
</template>
