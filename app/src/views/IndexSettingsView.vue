<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {RouterLink, useRoute} from 'vue-router';
import {NButton, NCard, NInput, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {fetchIndexMetadata, updateIndexSettings} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {refresh as refreshCluster} from '@/composables/useCluster';
import {t} from '@/i18n';
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
    alerts.error(t('indexSettings.noIndex'));
    return;
  }
  try {
    const metadata = await fetchIndexMetadata(name);
    index.value = name;
    settings.value = new EditableIndexSettings(metadata.settings);
  } catch (error) {
    alerts.error(t('indexSettings.loadFailed', {index: name}), describe(error));
  }
});

async function save(): Promise<void> {
  if (settings.value === null) {
    return;
  }
  saving.value = true;
  try {
    const response = await updateIndexSettings(index.value, settings.value.getUpdatable());
    alerts.success(t('indexSettings.updated'), response);
    await refreshCluster();
  } catch (error) {
    alerts.error(t('indexSettings.updateFailed'), describe(error));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('indexSettings.title') }}</h1>
      <p class="k-page-sub">{{ t('indexSettings.sub', {index}) }}</p>
    </div>
    <div class="k-row">
      <RouterLink :to="{name: 'cluster'}" style="text-decoration: none">
        <NButton size="small">{{ t('common.back') }}</NButton>
      </RouterLink>
      <NButton size="small" type="primary" :loading="saving" :disabled="saving" @click="save">
        {{ saving ? t('common.saving') : t('common.save') }}
      </NButton>
    </div>
  </div>

  <NCard v-if="settings">
    <div class="k-split">
      <nav class="k-stack-tight" :aria-label="t('indexSettings.groups')">
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
                  :title="t('indexSettings.readOnlyHint')"
                >
                  {{ t('indexSettings.readOnly') }}
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
