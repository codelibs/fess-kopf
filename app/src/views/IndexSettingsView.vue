<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {RouterLink, useRoute} from 'vue-router';
import {RequestError} from '@/api/client';
import {fetchIndexMetadata, updateIndexSettings} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {refresh as refreshCluster} from '@/composables/useCluster';
import {EditableIndexSettings, SETTING_GROUPS} from '@/model/editable-index-settings';

const alerts = useAlerts();
const route = useRoute();

const index = ref('');
const settings = ref<EditableIndexSettings | null>(null);
const activeGroup = ref(SETTING_GROUPS[0].label);
const saving = ref(false);

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

onMounted(async () => {
  const name = String(route.query.index ?? '');
  if (name === '') {
    alerts.error('No index was given');
    return;
  }
  try {
    const metadata = await fetchIndexMetadata(name);
    index.value = name;
    settings.value = new EditableIndexSettings(metadata.settings);
  } catch (error) {
    alerts.error(`Error while loading index settings for [${name}]`, describe(error));
  }
});

async function save(): Promise<void> {
  if (settings.value === null) {
    return;
  }
  saving.value = true;
  try {
    const response = await updateIndexSettings(index.value, settings.value.getUpdatable());
    alerts.success('Index settings were successfully updated', response);
    await refreshCluster();
  } catch (error) {
    alerts.error('Error while updating index settings', describe(error));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="card">
    <div class="card-header">settings for {{ index }}</div>
    <div v-if="settings" class="card-body">
      <div class="row">
        <div class="col-sm-3">
          <ul class="nav nav-pills flex-column">
            <li v-for="group in SETTING_GROUPS" :key="group.label" class="nav-item">
              <button
                type="button"
                class="nav-link w-100 text-start"
                :class="{active: activeGroup === group.label}"
                @click="activeGroup = group.label"
              >
                {{ group.label }}
              </button>
            </li>
          </ul>
        </div>
        <div class="col-sm-9">
          <div v-for="group in SETTING_GROUPS" :key="group.label">
            <template v-if="activeGroup === group.label">
              <div v-for="setting in group.settings" :key="setting" class="mb-2">
                <label class="form-label small mb-0" :for="setting">
                  {{ setting }}
                  <span
                    v-if="EditableIndexSettings.isStatic(setting)"
                    class="badge text-bg-secondary"
                    title="Set when the index is created; shown but never sent back"
                  >read-only</span>
                </label>
                <input
                  :id="setting"
                  v-model="settings.values[setting]"
                  class="form-control form-control-sm"
                  :readonly="EditableIndexSettings.isStatic(setting)"
                >
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <RouterLink class="btn btn-sm btn-secondary" :to="{name: 'cluster'}">back</RouterLink>
        <button type="button" class="btn btn-sm btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'saving…' : 'save' }}
        </button>
      </div>
    </div>
  </div>
</template>
