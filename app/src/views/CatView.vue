<script setup lang="ts">
import {ref} from 'vue';
import {CAT_APIS, fetchCat} from '@/api/opensearch';
import {RequestError} from '@/api/client';
import {useAlerts} from '@/composables/useAlerts';
import type {CatResult} from '@/model/cat-result';

const alerts = useAlerts();

const api = ref('');
const result = ref<CatResult | null>(null);
const running = ref(false);

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
  <div class="card">
    <div class="card-header">cat apis</div>
    <div class="card-body">
      <form class="row row-cols-lg-auto g-2 align-items-center mb-3" @submit.prevent="execute">
        <div class="col-12">
          <label class="visually-hidden" for="cat-api">API</label>
          <select id="cat-api" v-model="api" class="form-select form-select-sm">
            <option value="">select api</option>
            <option v-for="name in CAT_APIS" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="col-12">
          <button type="submit" class="btn btn-sm btn-primary" :disabled="running">
            {{ running ? 'running…' : 'execute' }}
          </button>
        </div>
      </form>

      <div v-if="result" class="table-responsive">
        <table class="table table-sm table-bordered table-striped align-middle">
          <thead>
            <tr>
              <th v-for="column in result.columns" :key="column" scope="col">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, row) in result.lines" :key="row">
              <td v-for="(value, cell) in line" :key="cell">{{ value }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="result.lines.length === 0" class="text-body-secondary mb-0">no data available</p>
      </div>
    </div>
  </div>
</template>
