<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {RouterLink, useRoute} from 'vue-router';
import {NButton, NCard, NInput, NTag} from 'naive-ui';
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
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">Index settings</h1>
      <p class="k-page-sub">settings for {{ index }}</p>
    </div>
    <div class="k-row">
      <RouterLink :to="{name: 'cluster'}" style="text-decoration: none">
        <NButton size="small">back</NButton>
      </RouterLink>
      <NButton size="small" type="primary" :loading="saving" :disabled="saving" @click="save">
        {{ saving ? 'saving…' : 'save' }}
      </NButton>
    </div>
  </div>

  <NCard v-if="settings">
    <div class="k-split">
      <nav class="k-stack-tight" aria-label="Setting groups">
        <NButton
          v-for="group in SETTING_GROUPS"
          :key="group.label"
          :type="activeGroup === group.label ? 'primary' : 'default'"
          :secondary="activeGroup === group.label"
          :quaternary="activeGroup !== group.label"
          style="justify-content: flex-start"
          block
          @click="activeGroup = group.label"
        >
          {{ group.label }}
        </NButton>
      </nav>

      <div>
        <template v-for="group in SETTING_GROUPS" :key="group.label">
          <div v-if="activeGroup === group.label" class="k-stack">
            <div v-for="setting in group.settings" :key="setting" class="k-field">
              <label class="k-label" :for="setting">
                {{ setting }}
                <NTag
                  v-if="EditableIndexSettings.isStatic(setting)"
                  size="tiny"
                  :bordered="false"
                  title="Set when the index is created; shown but never sent back"
                >
                  read-only
                </NTag>
              </label>
              <NInput
                v-model:value="settings.values[setting]"
                size="small"
                :readonly="EditableIndexSettings.isStatic(setting)"
                :input-props="{id: setting}"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </NCard>
</template>
