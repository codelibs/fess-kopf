<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from 'vue';
import {NButton, NCard, NRadioButton, NRadioGroup, NSelect, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {cancelTask, fetchLiveQueries, fetchTopQueries} from '@/api/opensearch';
import {getSettings} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {confirm, showInfo} from '@/composables/useDialogs';
import {t} from '@/i18n';
import {fessIndexInfo} from '@/model/fess-index';
import {bytes} from '@/model/format';
import {parseLiveQueries, type LiveQuery} from '@/model/live-query';
import {
  parseTopQueries,
  TOP_QUERY_METRICS,
  type TopQuery,
  type TopQueryMetric,
} from '@/model/top-query';

const alerts = useAlerts();

/**
 * How far back to look. `live` is the plugin's live queries endpoint, `top N`
 * its in-memory listing, and the rest its history, which the local index
 * exporter writes by default and keeps for seven days.
 */
const RANGES = ['live', 'top N', '1h', '24h', '7d'] as const;
type Range = (typeof RANGES)[number];

const HOURS: Partial<Record<Range, number>> = {'1h': 1, '24h': 24, '7d': 24 * 7};

/**
 * The history has no size parameter -- a week of five-minute windows can be
 * thousands of records -- so the table shows the costliest and says so.
 */
const MAX_ROWS = 100;

const range = ref<Range>('top N');
const metric = ref<TopQueryMetric>('latency');
const queries = ref<TopQuery[]>([]);
const live = ref<LiveQuery[]>([]);
const loading = ref(false);
const loaded = ref(false);
const unsupported = ref(false);

let poller: ReturnType<typeof setInterval> | null = null;

const metricOptions = computed(() =>
  TOP_QUERY_METRICS.map((name) => ({label: name, value: name})),
);

const total = computed(() => (range.value === 'live' ? live.value.length : queries.value.length));
const rows = computed(() => queries.value.slice(0, MAX_ROWS));
const liveRows = computed(() => live.value.slice(0, MAX_ROWS));

/**
 * 2.19.1 has the plugin but not the route, and says so in the body rather
 * than in the status line -- every other 400 from this endpoint is a real
 * error and still belongs in an alert.
 */
function routeMissing(error: unknown): boolean {
  return (
    error instanceof RequestError &&
    error.status === 400 &&
    JSON.stringify(error.body ?? '').includes('no handler found')
  );
}

function stopPolling(): void {
  if (poller !== null) {
    clearInterval(poller);
    poller = null;
  }
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    if (range.value === 'live') {
      live.value = parseLiveQueries(await fetchLiveQueries(metric.value), metric.value);
      unsupported.value = false;
    } else {
      const hours = HOURS[range.value];
      const to = new Date();
      queries.value = parseTopQueries(
        await fetchTopQueries(
          metric.value,
          hours === undefined
            ? undefined
            : {from: new Date(to.getTime() - hours * 3600_000), to},
        ),
        metric.value,
      );
    }
    loaded.value = true;
  } catch (error) {
    if (range.value === 'live' && routeMissing(error)) {
      unsupported.value = true;
      live.value = [];
      loaded.value = true;
      return;
    }
    alerts.error(
      t('topQueries.failed'),
      error instanceof RequestError ? error.body : String(error),
    );
    queries.value = [];
    live.value = [];
  } finally {
    loading.value = false;
  }
}

/** Only the live listing changes between refreshes; history does not. */
watch(
  [range, metric],
  () => {
    stopPolling();
    void load();
    if (range.value === 'live') {
      poller = setInterval(() => void load(), getSettings().refresh_rate);
    }
  },
  {immediate: true},
);

onBeforeUnmount(stopPolling);

/**
 * A live query's id is `<node>:<taskId>`, so the tasks endpoint cancels it
 * directly -- and the search really does stop, with a
 * `task_cancelled_exception` going back to whoever asked for it. The wording
 * is the tasks screen's, because this is the same action on the same API.
 */
async function promptCancel(query: LiveQuery): Promise<void> {
  const confirmed = await confirm(
    t('tasks.cancelHeader'),
    t('tasks.cancelBody', {action: query.indices.join(', ') || 'search', id: query.id}),
    t('tasks.cancelConfirm'),
  );
  if (!confirmed) {
    return;
  }
  try {
    await cancelTask(query.id);
    alerts.success(t('tasks.cancelled', {id: query.id}));
    await load();
  } catch (error) {
    alerts.error(
      t('tasks.cancelFailed', {id: query.id}),
      error instanceof RequestError ? error.body : String(error),
    );
  }
}

/** The ranked measurement, in the unit the plugin reports it in. */
function measurement(query: TopQuery | LiveQuery): string {
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

function duration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Where the time went, in the order the phases ran. A phase that took no
 * time is not worth a column inch -- `query` against `fetch` is the whole
 * point, because one blames the query and the other blames the documents.
 */
function phases(query: TopQuery): string {
  return query.phases
    .filter((phase) => phase.ms > 0)
    .map((phase) => `${phase.phase} ${phase.ms}`)
    .join(' · ');
}

/**
 * What the index is to Fess, in the cluster overview's vocabulary. A slow
 * `fess.search` is a user waiting; a slow `fess_crawler.queue` is the
 * crawler, and the two lead to different places.
 */
function role(index: string): string {
  const named = fessIndexInfo({name: index, aliases: []}).role;
  return named === 'other' ? '' : named;
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
      <div class="k-row">
        <span id="tq-range-label" class="k-label" style="margin: 0">when</span>
        <NRadioGroup
          id="tq-range"
          v-model:value="range"
          aria-labelledby="tq-range-label"
          size="small"
        >
          <NRadioButton v-for="name in RANGES" :key="name" :value="name">
            {{ name }}
          </NRadioButton>
        </NRadioGroup>
      </div>
      <div class="k-row">
        <span id="tq-metric-label" class="k-label" style="margin: 0">metric</span>
        <NSelect
          id="tq-metric"
          v-model:value="metric"
          aria-labelledby="tq-metric-label"
          :options="metricOptions"
          style="width: 9rem"
        />
      </div>
    </div>

    <p v-if="total > MAX_ROWS" class="k-small k-muted" style="margin: 12px 0 0">
      {{ t('topQueries.showingTop', {shown: MAX_ROWS, total}) }}
    </p>

    <!-- The searches running at this instant: what to kill, and why. -->
    <div v-if="range === 'live'" class="k-scroll-x" style="margin-top: 16px">
      <table v-if="liveRows.length" class="k-matrix">
        <thead>
          <tr>
            <th scope="col">started</th>
            <th scope="col">running</th>
            <th scope="col">cpu</th>
            <th scope="col">memory</th>
            <th scope="col">indices</th>
            <th scope="col">shards</th>
            <th scope="col">status</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="query in liveRows" :key="query.id">
            <td class="k-mono">{{ when(query.startTime) }}</td>
            <td class="k-mono k-strong">{{ duration(query.latencyMs) }}</td>
            <td class="k-mono">{{ (query.cpuNanos / 1e6).toFixed(1) }} ms</td>
            <td class="k-mono">{{ bytes(query.memoryBytes) }}</td>
            <td class="k-small">
              <span class="k-mono">{{ query.indices.join(', ') }}</span>
              <NTag
                v-for="index in query.indices.filter((name) => role(name))"
                :key="index"
                size="tiny"
                :bordered="false"
                style="margin-left: 6px"
              >
                {{ role(index) }}
              </NTag>
            </td>
            <td class="k-mono">{{ query.shards }}</td>
            <td class="k-mono k-small">{{ query.status }}</td>
            <td class="k-row">
              <NButton
                v-if="query.source !== undefined"
                text
                size="tiny"
                type="primary"
                @click="showInfo(t('topQueries.sourceTitle'), query.source)"
              >
                {{ t('topQueries.showSource') }}
              </NButton>
              <NButton size="tiny" type="error" ghost @click="promptCancel(query)">
                {{ t('tasks.cancel') }}
              </NButton>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="unsupported" class="k-empty">
        <p>{{ t('topQueries.liveUnsupported') }}</p>
      </div>
      <div v-else-if="loaded" class="k-empty">
        <p>{{ t('topQueries.liveEmpty') }}</p>
      </div>
    </div>

    <div v-else class="k-scroll-x" style="margin-top: 16px">
      <table v-if="rows.length" class="k-matrix">
        <thead>
          <tr>
            <th scope="col">time</th>
            <th scope="col">{{ metric }}</th>
            <th scope="col">phases</th>
            <th scope="col">indices</th>
            <th scope="col">shards</th>
            <th scope="col">search_type</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="query in rows" :key="query.id">
            <td class="k-mono">{{ when(query.timestamp) }}</td>
            <td class="k-mono k-strong">{{ measurement(query) }}</td>
            <!-- query vs fetch says whether the analyser or the documents
                 are the cost, which is the next question after "how slow". -->
            <td class="k-mono k-small">{{ phases(query) }}</td>
            <td class="k-small">
              <span class="k-mono">{{ query.indices.join(', ') }}</span>
              <NTag
                v-for="index in query.indices.filter((name) => role(name))"
                :key="index"
                size="tiny"
                :bordered="false"
                style="margin-left: 6px"
              >
                {{ role(index) }}
              </NTag>
            </td>
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
           a search is only recorded when its collection window closes. -->
      <div v-else-if="loaded" class="k-empty">
        <p>{{ t('topQueries.empty') }}</p>
        <p class="k-small">{{ t('topQueries.windowNote') }}</p>
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
