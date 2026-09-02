<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {NButton, NCard, NInput, NSelect, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {createTemplate, deleteTemplate, fetchTemplates} from '@/api/opensearch';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {confirm} from '@/composables/useDialogs';
import {t} from '@/i18n';
import {
  IndexTemplate,
  IndexTemplateFilter,
  TEMPLATE_KINDS,
  type TemplateKind,
} from '@/model/index-template';
import {Paginator} from '@/model/paginator';

const alerts = useAlerts();

/**
 * The starting document for each kind. They are not interchangeable: a
 * component template carries no index_patterns, and a composable index
 * template puts settings and mappings under `template` rather than beside
 * it. The legacy shape uses index_patterns, not the `template` string that
 * Elasticsearch 7.0 removed -- a template created from that always failed.
 */
const TEMPLATE_BASES: Record<TemplateKind, string> = {
  component: JSON.stringify(
    {template: {settings: {}, mappings: {}, aliases: {}}},
    undefined,
    2,
  ),
  index: JSON.stringify(
    {
      index_patterns: ['index*'],
      composed_of: [],
      priority: 100,
      template: {settings: {}, mappings: {}, aliases: {}},
    },
    undefined,
    2,
  ),
  legacy: JSON.stringify(
    {index_patterns: ['index*'], settings: {}, mappings: {}, aliases: {}},
    undefined,
    2,
  ),
};

const SKELETONS = Object.values(TEMPLATE_BASES);

const kind = ref<TemplateKind>('index');
const templates = ref<IndexTemplate[]>([]);
const filter = ref(new IndexTemplateFilter('', ''));
const page = ref(1);
const name = ref('');
const body = ref(TEMPLATE_BASES.index);
const editor = ref<InstanceType<typeof JsonEditor> | null>(null);

const kindOptions = computed(() => TEMPLATE_KINDS.map((k) => ({label: k, value: k})));

const paginator = computed(() => {
  const p = new Paginator<IndexTemplate>(page.value, 10, [], filter.value);
  p.setCollection(templates.value);
  return p;
});
const currentPage = computed(() => paginator.value.getPage());

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

async function load(): Promise<void> {
  try {
    templates.value = await fetchTemplates(kind.value);
  } catch (error) {
    templates.value = [];
    alerts.error(t('templates.loadFailed'), describe(error));
  }
}

onMounted(load);

// Switching kind reloads the list and, unless the editor holds work, swaps
// the starting document: the three shapes are not interchangeable, and
// carrying one over would only produce a rejected request.
watch(kind, () => {
  page.value = 1;
  filter.value = new IndexTemplateFilter('', '');
  if (SKELETONS.includes(body.value)) {
    body.value = TEMPLATE_BASES[kind.value];
  }
  void load();
});

async function create(): Promise<void> {
  if (name.value.trim() === '') {
    alerts.error(t('templates.nameRequired'));
    return;
  }
  if (body.value.trim() === '') {
    alerts.error(t('templates.bodyRequired'));
    return;
  }
  if (editor.value?.error != null) {
    alerts.error(t('common.invalidJson', {message: editor.value.error}));
    return;
  }
  try {
    const response = await createTemplate(kind.value, name.value, body.value);
    alerts.success(t('templates.created'), response);
    await load();
  } catch (error) {
    alerts.error(t('templates.createFailed'), describe(error));
  }
}

async function remove(template: IndexTemplate): Promise<void> {
  const ok = await confirm(
    t('templates.confirmDelete', {template: template.name}),
    JSON.stringify(template.body, undefined, 2),
    t('cluster.confirm.deleteAction'),
  );
  if (!ok) {
    return;
  }
  try {
    const response = await deleteTemplate(template.kind, template.name);
    alerts.success(t('templates.deleted'), response);
    await load();
  } catch (error) {
    alerts.error(t('templates.deleteFailed'), describe(error));
  }
}

function edit(template: IndexTemplate): void {
  name.value = template.name;
  body.value = JSON.stringify(template.body, undefined, 2);
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('templates.title') }}</h1>
      <p class="k-page-sub">{{ t('templates.sub') }}</p>
    </div>
  </div>

  <NCard style="margin-bottom: 16px">
    <div class="k-row k-wrap k-gap-lg">
      <!-- The endpoint names, so they match what the cluster and its docs
           call these. `component` and `index` are the composable pair;
           `legacy` is the deprecated _template endpoint. -->
      <span id="it-kind-label" class="k-label" style="margin: 0">kind</span>
      <NSelect
        id="it-kind"
        v-model:value="kind"
        aria-labelledby="it-kind-label"
        :options="kindOptions"
        style="width: 12rem"
      />
      <span class="k-small k-muted">{{ t(`templates.kind.${kind}`) }}</span>
    </div>
  </NCard>

  <div class="k-split k-split-even">
    <NCard :title="t('templates.create')">
      <form class="k-stack" @submit.prevent="create">
        <div>
          <label class="k-label" for="it-name">name</label>
          <NInput v-model:value="name" :input-props="{id: 'it-name'}" />
        </div>
        <div>
          <label class="k-label" for="it-body">body</label>
          <JsonEditor id="it-body" ref="editor" v-model="body" :rows="14" />
        </div>
        <div>
          <NButton attr-type="submit" type="primary">{{ t('common.create') }}</NButton>
        </div>
      </form>
    </NCard>

    <NCard :title="t('templates.list')">
      <div class="k-row k-wrap" style="margin-bottom: 12px">
        <NInput
          v-model:value="filter.name"
          class="k-grow"
          :placeholder="t('templates.filterByName')"
          clearable
          :aria-label="t('templates.filterByName')"
          :input-props="{id: 'it-f-name'}"
        />
        <!-- A component template has no index patterns, so filtering by one
             there could only ever empty the list. -->
        <NInput
          v-if="kind !== 'component'"
          v-model:value="filter.template"
          class="k-grow"
          :placeholder="t('templates.filterByPattern')"
          clearable
          :aria-label="t('templates.filterByPattern')"
          :input-props="{id: 'it-f-pattern'}"
        />
      </div>

      <p v-if="currentPage.total === 0" class="k-empty">{{ t('templates.empty') }}</p>
      <ul v-else class="k-list">
        <li v-for="template in currentPage.elements.filter(Boolean)" :key="template!.name">
          <div class="k-grow k-stack-tight">
            <span class="k-strong">{{ template!.name }}</span>
            <div class="k-row k-wrap">
              <NTag v-for="p in template!.patterns" :key="p" size="tiny" :bordered="false">
                {{ p }}
              </NTag>
              <NTag
                v-for="c in template!.composedOf"
                :key="c"
                size="tiny"
                type="info"
                :bordered="false"
                title="composed_of"
              >
                {{ c }}
              </NTag>
            </div>
          </div>
          <div class="k-row">
            <NButton text size="tiny" type="primary" @click="edit(template!)">
              {{ t('common.edit') }}
            </NButton>
            <NButton text size="tiny" type="error" @click="remove(template!)">
              {{ t('common.delete') }}
            </NButton>
          </div>
        </li>
      </ul>

      <div v-if="currentPage.total > 0" class="k-row k-small" style="margin-top: 12px">
        <NButton size="tiny" :disabled="!currentPage.previous" @click="page -= 1">
          {{ t('common.previous') }}
        </NButton>
        <span class="k-muted">
          {{ t('common.range', {first: currentPage.first, last: currentPage.last,
                                total: currentPage.total}) }}
        </span>
        <NButton size="tiny" :disabled="!currentPage.next" @click="page += 1">
          {{ t('common.next') }}
        </NButton>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.k-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.k-list > li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--k-border);
}

.k-list > li:last-child {
  border-bottom: 0;
}
</style>
