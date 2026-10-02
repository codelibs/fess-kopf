<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {NButton, NCard, NSelect} from 'naive-ui';
import {RequestError} from '@/api/client';
import {fetchDocumentStats} from '@/api/opensearch';
import DocBreakdown from '@/components/DocBreakdown.vue';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';
import {bytes} from '@/model/format';
import type {DocStats} from '@/model/doc-stats';
import {SEARCH_ALIAS, fessIndexInfo} from '@/model/fess-index';

const alerts = useAlerts();
const route = useRoute();
const router = useRouter();
const {cluster} = useCluster();

/**
 * The alias by default: it is the index users are searching right now. A
 * previous generation, which Fess leaves behind when it moves the aliases,
 * can be picked by name -- the cluster grid links here with `?index=`.
 */
function requested(): string {
  const value = route.query.index;
  return typeof value === 'string' && value !== '' ? value : SEARCH_ALIAS;
}

const index = ref(requested());
const stats = ref<DocStats | null>(null);
const loading = ref(false);
let inFlight: AbortController | null = null;

const indexOptions = computed(() => {
  const names = (cluster.value?.indices ?? [])
    .filter((i) => i.open && fessIndexInfo(i).role === 'document')
    .map((i) => i.name)
    .sort();
  const values = [SEARCH_ALIAS, ...names];
  if (!values.includes(index.value)) {
    values.push(index.value);
  }
  return values.map((value) => ({label: value, value}));
});

async function load(): Promise<void> {
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;
  loading.value = true;
  try {
    stats.value = await fetchDocumentStats(index.value, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    alerts.error(t('documents.failed'), error instanceof RequestError ? error.body : String(error));
    stats.value = null;
  } finally {
    if (inFlight === controller) {
      inFlight = null;
      loading.value = false;
    }
  }
}

watch(index, (name) => {
  void router.replace({query: name === SEARCH_ALIAS ? {} : {index: name}});
  void load();
});

onMounted(() => void load());
onBeforeUnmount(() => inFlight?.abort());

/** The largest documents are the one list where an address says more than a name. */
function where(doc: {url: string; filename: string}): string {
  return doc.url || doc.filename || '—';
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('documents.title') }}</h1>
      <p class="k-page-sub">{{ t('documents.sub') }}</p>
    </div>
    <div class="k-row">
      <span id="ds-index-label" class="k-label" style="margin: 0">index</span>
      <NSelect
        id="ds-index"
        v-model:value="index"
        aria-labelledby="ds-index-label"
        :options="indexOptions"
        filterable
        style="min-width: 16rem"
      />
      <NButton :loading="loading" @click="load()">{{ t('common.refresh') }}</NButton>
    </div>
  </div>

  <template v-if="stats">
    <NCard size="small">
      <div class="k-row k-wrap k-gap-lg">
        <div>
          <span class="k-label">docs</span>
          <span id="ds-total" class="k-metric">
            {{ stats.totalIsLowerBound ? '≥ ' : '' }}{{ stats.total.toLocaleString() }}
          </span>
        </div>
        <template v-if="stats.sizeSummary">
          <div>
            <span class="k-label">content_length sum</span>
            <span class="k-metric">{{ bytes(stats.sizeSummary.sum) }}</span>
          </div>
          <div>
            <span class="k-label">content_length avg</span>
            <span class="k-metric">{{ bytes(stats.sizeSummary.avg) }}</span>
          </div>
          <div>
            <span class="k-label">content_length max</span>
            <span class="k-metric">{{ bytes(stats.sizeSummary.max) }}</span>
          </div>
        </template>
      </div>
    </NCard>

    <p v-if="stats.total === 0" class="k-empty">{{ t('documents.empty') }}</p>

    <div v-else class="k-doc-grid">
      <DocBreakdown :breakdown="stats.terms[0]" :total="stats.total" />
      <DocBreakdown :breakdown="stats.sizes" :total="stats.total" />
      <DocBreakdown
        v-for="year in stats.years"
        :key="year.state.field"
        :breakdown="year"
        :total="stats.total"
        :note="year.state.field === 'created' ? t('documents.createdNote') : undefined"
      />
      <DocBreakdown
        v-for="term in stats.terms.slice(1)"
        :key="term.state.field"
        :breakdown="term"
        :total="stats.total"
      />

      <NCard
        v-if="stats.largest.length"
        class="k-doc-wide"
        size="small"
        :title="t('documents.largest')"
      >
        <div class="k-scroll-x">
          <table id="ds-largest" class="k-table">
            <thead>
              <tr>
                <th scope="col">url</th>
                <th scope="col">content_length</th>
                <th scope="col">last_modified</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(doc, i) in stats.largest" :key="i">
                <td class="k-mono k-small" style="word-break: break-all">{{ where(doc) }}</td>
                <td class="k-mono" style="white-space: nowrap">{{ bytes(doc.size) }}</td>
                <td class="k-mono k-small" style="white-space: nowrap">
                  {{ doc.lastModified || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </NCard>
    </div>
  </template>
</template>

<style scoped>
/* Cards side by side when the iframe is wide, stacked when it is not. */
.k-doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 26rem), 1fr));
  gap: 16px;
  align-items: start;
}

/* Addresses need the width: in one column of three they break every line. */
.k-doc-wide {
  grid-column: 1 / -1;
}
</style>
