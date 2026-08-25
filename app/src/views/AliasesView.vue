<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {NButton, NCard, NInput, NSelect, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {fetchAliases, updateAliases} from '@/api/opensearch';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';
import {Alias, IndexAliases} from '@/model/alias';
import {AliasFilter} from '@/model/alias-filter';
import {Paginator} from '@/model/paginator';

const alerts = useAlerts();
const {cluster} = useCluster();

const filter = ref(new AliasFilter('', ''));
const collection = ref<IndexAliases[]>([]);
/** What the cluster last reported, to diff the pending edits against. */
const original = ref<IndexAliases[]>([]);
const page = ref(1);
const loading = ref(false);

const draft = ref({alias: '', index: '', filter: '', indexRouting: '', searchRouting: ''});
const draftFilter = ref('');
const editor = ref<InstanceType<typeof JsonEditor> | null>(null);

const indices = computed(() => (cluster.value?.indices ?? []).map((index) => index.name));
const indexOptions = computed(() => indices.value.map((name) => ({label: name, value: name})));

const paginator = computed(() => {
  const p = new Paginator<IndexAliases>(page.value, 10, [], filter.value);
  p.setCollection(collection.value);
  return p;
});
const currentPage = computed(() => paginator.value.getPage());

/** True while the table differs from what the cluster reported. */
const dirty = computed(
  () =>
    IndexAliases.diff(original.value, collection.value).length > 0 ||
    IndexAliases.diff(collection.value, original.value).length > 0,
);

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const loaded = await fetchAliases();
    original.value = loaded.map((entry) => entry.clone());
    collection.value = loaded;
    page.value = 1;
  } catch (error) {
    alerts.error(t('aliases.fetchFailed'), describe(error));
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function addAlias(): void {
  if (editor.value?.error != null) {
    alerts.error(t('aliases.invalidFilter'), editor.value.error);
    return;
  }
  const alias = new Alias(
    draft.value.alias,
    draft.value.index,
    draftFilter.value,
    draft.value.indexRouting,
    draft.value.searchRouting,
  );
  try {
    alias.validate();
    const existing = collection.value.find((entry) => entry.index === alias.index);
    if (existing === undefined) {
      collection.value = [...collection.value, new IndexAliases(alias.index, [alias])];
    } else if (existing.aliases.some((a) => a.alias === alias.alias)) {
      throw new Error(t('aliases.duplicate'));
    } else {
      existing.aliases = [...existing.aliases, alias];
      collection.value = [...collection.value];
    }
    draft.value = {alias: '', index: '', filter: '', indexRouting: '', searchRouting: ''};
    draftFilter.value = '';
    alerts.success(t('aliases.added'));
  } catch (error) {
    alerts.error(error instanceof Error ? error.message : String(error));
  }
}

function removeIndexAliases(index: string): void {
  collection.value = collection.value.filter((entry) => entry.index !== index);
  alerts.success(t('aliases.removedAllFor', {index}));
}

function removeIndexAlias(index: string, aliasName: string): void {
  collection.value = collection.value
    .map((entry) =>
      entry.index === index
        ? new IndexAliases(
            entry.index,
            entry.aliases.filter((alias) => alias.alias !== aliasName),
          )
        : entry,
    )
    .filter((entry) => entry.aliases.length > 0);
  alerts.success(t('aliases.dissociated'));
}

async function save(): Promise<void> {
  const adds = IndexAliases.diff(original.value, collection.value);
  const deletes = IndexAliases.diff(collection.value, original.value);
  if (adds.length === 0 && deletes.length === 0) {
    alerts.warn(t('aliases.nothingToSave'));
    return;
  }
  try {
    const response = await updateAliases(adds, deletes);
    alerts.success(t('aliases.updated'), response);
    await load();
  } catch (error) {
    alerts.error(t('aliases.updateFailed'), describe(error));
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('aliases.title') }}</h1>
      <p class="k-page-sub">
        {{ t('aliases.sub') }}
      </p>
    </div>
    <div class="k-row">
      <NTag v-if="dirty" size="small" type="warning" :bordered="false">
        {{ t('aliases.unsaved') }}
      </NTag>
      <NButton size="small" type="primary" @click="save">{{ t('aliases.saveChanges') }}</NButton>
    </div>
  </div>

  <div class="k-aliases">
    <NCard :title="t('aliases.newAlias')">
      <form class="k-stack" @submit.prevent="addAlias">
        <div>
          <span id="al-index-label" class="k-label">index</span>
          <NSelect
            id="al-index"
            v-model:value="draft.index"
            aria-labelledby="al-index-label"
            :options="indexOptions"
            :placeholder="t('aliases.selectIndex')"
            filterable
          />
        </div>
        <div>
          <label class="k-label" for="al-alias">alias</label>
          <NInput v-model:value="draft.alias" :input-props="{id: 'al-alias'}" />
        </div>
        <div>
          <label class="k-label" for="al-filter">filter</label>
          <JsonEditor id="al-filter" ref="editor" v-model="draftFilter" :rows="4" />
        </div>
        <div>
          <label class="k-label" for="al-irouting">index routing</label>
          <NInput v-model:value="draft.indexRouting" :input-props="{id: 'al-irouting'}" />
        </div>
        <div>
          <label class="k-label" for="al-srouting">search routing</label>
          <NInput v-model:value="draft.searchRouting" :input-props="{id: 'al-srouting'}" />
        </div>
        <div>
          <NButton attr-type="submit" type="primary">{{ t('common.add') }}</NButton>
        </div>
      </form>
    </NCard>

    <NCard :title="t('aliases.list')">
      <div class="k-row k-wrap" style="margin-bottom: 12px">
        <NInput
          v-model:value="filter.index"
          class="k-grow"
          :placeholder="t('aliases.filterByIndex')"
          clearable
          :aria-label="t('aliases.filterByIndex')"
          :input-props="{id: 'al-f-index'}"
        />
        <NInput
          v-model:value="filter.alias"
          class="k-grow"
          :placeholder="t('aliases.filterByAlias')"
          clearable
          :aria-label="t('aliases.filterByAlias')"
          :input-props="{id: 'al-f-alias'}"
        />
      </div>

      <!-- data-test, not a positional card lookup: index names also appear in
           the picker's options on the other card. -->
      <div data-test="alias-table">
        <p v-if="loading" class="k-muted k-small">{{ t('common.loading') }}</p>
        <p v-else-if="currentPage.total === 0" class="k-empty">{{ t('aliases.empty') }}</p>

        <div
          v-for="entry in currentPage.elements.filter(Boolean)"
          :key="entry!.index"
          class="k-alias-group"
        >
          <div class="k-row">
            <span class="k-strong k-grow">{{ entry!.index }}</span>
            <NButton text size="tiny" type="error" @click="removeIndexAliases(entry!.index)">
              {{ t('aliases.removeAll') }}
            </NButton>
          </div>
          <ul class="k-alias-list">
            <li v-for="alias in entry!.aliases" :key="alias.alias">
              <span class="k-grow">
                <NTag size="tiny" :bordered="false">{{ alias.alias }}</NTag>
                <code v-if="alias.filter" class="k-mono" style="margin-left: 6px">
                  {{ alias.filter }}
                </code>
              </span>
              <NButton
                text
                size="tiny"
                type="error"
                @click="removeIndexAlias(entry!.index, alias.alias)"
              >
                {{ t('common.remove') }}
              </NButton>
            </li>
          </ul>
        </div>
      </div>

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
.k-aliases {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

@media (min-width: 1000px) {
  .k-aliases {
    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
    align-items: start;
  }
}

.k-alias-group + .k-alias-group {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--k-border);
}

.k-alias-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0 0 0 10px;
}

.k-alias-list > li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
</style>
