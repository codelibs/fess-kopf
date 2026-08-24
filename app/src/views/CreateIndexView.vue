<script setup lang="ts">
import {computed, ref} from 'vue';
import {RequestError} from '@/api/client';
import {createIndex, fetchIndexMetadata} from '@/api/opensearch';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {refresh as refreshCluster, useCluster} from '@/composables/useCluster';

const alerts = useAlerts();
const {cluster} = useCluster();

const name = ref('');
const shards = ref('');
const replicas = ref('');
const sourceIndex = ref('');
const body = ref('{}');
const editor = ref<InstanceType<typeof JsonEditor> | null>(null);
const creating = ref(false);

const indices = computed(() => (cluster.value?.indices ?? []).map((index) => index.name));

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

/** Copies an existing index's settings and mappings into the editor. */
async function loadSource(): Promise<void> {
  if (sourceIndex.value === '') {
    body.value = '{}';
    return;
  }
  try {
    const metadata = await fetchIndexMetadata(sourceIndex.value);
    body.value = JSON.stringify(
      {settings: metadata.settings, mappings: metadata.mappings},
      null,
      2,
    );
  } catch (error) {
    alerts.error('Error while loading index settings', describe(error));
  }
}

async function submit(): Promise<void> {
  if (name.value.trim() === '') {
    alerts.error('You must specify a valid index name');
    return;
  }
  if (editor.value?.error != null) {
    alerts.error(`Invalid JSON: ${editor.value.error}`);
    return;
  }

  let payload = body.value.trim() === '' ? '{}' : body.value;
  // An empty document means "use the shard and replica boxes instead"; they
  // are ignored entirely once the editor holds anything.
  if (Object.keys(JSON.parse(payload)).length === 0) {
    const index: Record<string, string> = {};
    if (shards.value.trim() !== '') {
      index.number_of_shards = shards.value;
    }
    if (replicas.value.trim() !== '') {
      index.number_of_replicas = replicas.value;
    }
    payload = JSON.stringify({settings: {index}});
  }

  creating.value = true;
  try {
    const response = await createIndex(name.value, payload);
    alerts.success(`Index ${name.value} was created`, response);
    name.value = '';
    shards.value = '';
    replicas.value = '';
    sourceIndex.value = '';
    body.value = '{}';
    await refreshCluster();
  } catch (error) {
    alerts.error('Error while creating index', describe(error));
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="card">
    <div class="card-header">create index</div>
    <div class="card-body">
      <form @submit.prevent="submit">
        <div class="row g-2 mb-2">
          <div class="col-sm-4">
            <label class="form-label small mb-0" for="ci-name">index name</label>
            <input id="ci-name" v-model="name" class="form-control form-control-sm">
          </div>
          <div class="col-sm-2">
            <label class="form-label small mb-0" for="ci-shards">shards</label>
            <input id="ci-shards" v-model="shards" class="form-control form-control-sm">
          </div>
          <div class="col-sm-2">
            <label class="form-label small mb-0" for="ci-replicas">replicas</label>
            <input id="ci-replicas" v-model="replicas" class="form-control form-control-sm">
          </div>
          <div class="col-sm-4">
            <label class="form-label small mb-0" for="ci-source">copy from index</label>
            <select
              id="ci-source"
              v-model="sourceIndex"
              class="form-select form-select-sm"
              @change="loadSource"
            >
              <option value="">none</option>
              <option v-for="index in indices" :key="index" :value="index">{{ index }}</option>
            </select>
          </div>
        </div>
        <div class="mb-2">
          <label class="form-label small mb-0" for="ci-body">settings and mappings</label>
          <JsonEditor id="ci-body" ref="editor" v-model="body" :rows="14" />
          <div class="form-text">
            Leave this as <code>{}</code> to use the shard and replica boxes above.
          </div>
        </div>
        <button type="submit" class="btn btn-sm btn-primary" :disabled="creating">
          {{ creating ? 'creating…' : 'create' }}
        </button>
      </form>
    </div>
  </div>
</template>
