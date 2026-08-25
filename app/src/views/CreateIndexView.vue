<script setup lang="ts">
import {computed, ref} from 'vue';
import {NButton, NCard, NInput, NSelect} from 'naive-ui';
import {RequestError} from '@/api/client';
import {createIndex, fetchIndexMetadata} from '@/api/opensearch';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {refresh as refreshCluster, useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';

const alerts = useAlerts();
const {cluster} = useCluster();

const name = ref('');
const shards = ref('');
const replicas = ref('');
const sourceIndex = ref('');
const body = ref('{}');
const editor = ref<InstanceType<typeof JsonEditor> | null>(null);
const creating = ref(false);

const sourceOptions = computed(() => [
  {label: t('createIndex.sourceNone'), value: ''},
  ...(cluster.value?.indices ?? []).map((index) => ({label: index.name, value: index.name})),
]);

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
    alerts.error(t('createIndex.sourceFailed'), describe(error));
  }
}

async function submit(): Promise<void> {
  if (name.value.trim() === '') {
    alerts.error(t('createIndex.invalidName'));
    return;
  }
  if (editor.value?.error != null) {
    alerts.error(t('common.invalidJson', {message: editor.value.error}));
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
    alerts.success(t('createIndex.created', {index: name.value}), response);
    name.value = '';
    shards.value = '';
    replicas.value = '';
    sourceIndex.value = '';
    body.value = '{}';
    await refreshCluster();
  } catch (error) {
    alerts.error(t('createIndex.createFailed'), describe(error));
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('createIndex.title') }}</h1>
      <p class="k-page-sub">{{ t('createIndex.sub') }}</p>
    </div>
  </div>

  <NCard>
    <form class="k-stack" @submit.prevent="submit">
      <div class="k-fields">
        <div>
          <label class="k-label" for="ci-name">index name</label>
          <NInput v-model:value="name" :input-props="{id: 'ci-name'}" />
        </div>
        <div>
          <label class="k-label" for="ci-shards">shards</label>
          <NInput v-model:value="shards" :input-props="{id: 'ci-shards'}" />
        </div>
        <div>
          <label class="k-label" for="ci-replicas">replicas</label>
          <NInput v-model:value="replicas" :input-props="{id: 'ci-replicas'}" />
        </div>
        <div>
          <span id="ci-source-label" class="k-label">copy from index</span>
          <NSelect
            id="ci-source"
            v-model:value="sourceIndex"
            aria-labelledby="ci-source-label"
            :options="sourceOptions"
            filterable
            @update:value="loadSource"
          />
        </div>
      </div>

      <div>
        <label class="k-label" for="ci-body">settings and mappings</label>
        <JsonEditor id="ci-body" ref="editor" v-model="body" :rows="14" />
        <p class="k-small k-muted" style="margin: 6px 0 0">
          {{ t('createIndex.bodyHint') }}
        </p>
      </div>

      <div>
        <NButton attr-type="submit" type="primary" :loading="creating" :disabled="creating">
          {{ creating ? t('createIndex.creating') : t('common.create') }}
        </NButton>
      </div>
    </form>
  </NCard>
</template>

<style scoped>
.k-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 12px;
}
</style>
