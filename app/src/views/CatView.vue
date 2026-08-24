<script setup lang="ts">
import {computed, ref} from 'vue';
import {NButton, NCard, NSelect} from 'naive-ui';
import {CAT_APIS, fetchCat} from '@/api/opensearch';
import {RequestError} from '@/api/client';
import {useAlerts} from '@/composables/useAlerts';
import type {CatResult} from '@/model/cat-result';

const alerts = useAlerts();

const api = ref('');
const result = ref<CatResult | null>(null);
const running = ref(false);

const apiOptions = computed(() => CAT_APIS.map((name) => ({label: name, value: name})));

async function execute(): Promise<void> {
  if (api.value === '') {
    alerts.error('You must select an API');
    return;
  }
  running.value = true;
  try {
    result.value = await fetchCat(api.value);
  } catch (error) {
    alerts.error(
      'Error while fetching data',
      error instanceof RequestError ? error.body : String(error),
    );
    result.value = null;
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">Cat APIs</h1>
      <p class="k-page-sub">Compact, human-readable views of cluster internals.</p>
    </div>
  </div>

  <NCard>
    <form class="k-row k-wrap" @submit.prevent="execute">
      <!-- A non-filterable NSelect renders no input, so the visible text is
           tied to it with aria-labelledby rather than <label for>. -->
      <span id="cat-api-label" class="k-label" style="margin: 0">API</span>
      <NSelect
        id="cat-api"
        v-model:value="api"
        aria-labelledby="cat-api-label"
        :options="apiOptions"
        placeholder="select api"
        style="width: 14rem"
      />
      <NButton attr-type="submit" type="primary" :loading="running" :disabled="running">
        {{ running ? 'running…' : 'execute' }}
      </NButton>
    </form>

    <div v-if="result" class="k-scroll-x" style="margin-top: 16px">
      <table v-if="result.lines.length" class="k-matrix">
        <thead>
          <tr>
            <th v-for="column in result.columns" :key="column" scope="col">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, row) in result.lines" :key="row">
            <td v-for="(value, cell) in line" :key="cell" class="k-mono">{{ value }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="k-empty">no data available</p>
    </div>
  </NCard>
</template>
