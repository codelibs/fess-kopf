<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {RequestError} from '@/api/client';
import {fetchAliases, updateAliases} from '@/api/opensearch';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
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
    alerts.error('Error while fetching aliases', describe(error));
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function addAlias(): void {
  if (editor.value?.error != null) {
    alerts.error('Invalid filter defined for alias', editor.value.error);
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
      throw new Error('Alias is already associated with this index');
    } else {
      existing.aliases = [...existing.aliases, alias];
      collection.value = [...collection.value];
    }
    draft.value = {alias: '', index: '', filter: '', indexRouting: '', searchRouting: ''};
    draftFilter.value = '';
    alerts.success(
      'Alias successfully added. Note that changes made will only be persisted ' +
        'after saving changes',
    );
  } catch (error) {
    alerts.error(error instanceof Error ? error.message : String(error));
  }
}

function removeIndexAliases(index: string): void {
  collection.value = collection.value.filter((entry) => entry.index !== index);
  alerts.success(`All aliases were removed for ${index}`);
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
  alerts.success(
    'Alias successfully dissociated from index. ' +
      'Note that changes made will only be persisted after saving changes',
  );
}

async function save(): Promise<void> {
  const adds = IndexAliases.diff(original.value, collection.value);
  const deletes = IndexAliases.diff(collection.value, original.value);
  if (adds.length === 0 && deletes.length === 0) {
    alerts.warn('No changes were made: nothing to save');
    return;
  }
  try {
    const response = await updateAliases(adds, deletes);
    alerts.success('Aliases were successfully updated', response);
    await load();
  } catch (error) {
    alerts.error('Error while updating aliases', describe(error));
  }
}
</script>

<template>
  <div class="row g-3">
    <div class="col-lg-5">
      <div class="card">
        <div class="card-header">new alias</div>
        <div class="card-body">
          <form @submit.prevent="addAlias">
            <div class="mb-2">
              <label class="form-label small mb-0" for="al-index">index</label>
              <select id="al-index" v-model="draft.index" class="form-select form-select-sm">
                <option value="">select index</option>
                <option v-for="name in indices" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="al-alias">alias</label>
              <input id="al-alias" v-model="draft.alias" class="form-control form-control-sm">
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="al-filter">filter</label>
              <JsonEditor id="al-filter" ref="editor" v-model="draftFilter" :rows="4" />
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="al-irouting">index routing</label>
              <input
                id="al-irouting"
                v-model="draft.indexRouting"
                class="form-control form-control-sm"
              >
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="al-srouting">search routing</label>
              <input
                id="al-srouting"
                v-model="draft.searchRouting"
                class="form-control form-control-sm"
              >
            </div>
            <button type="submit" class="btn btn-sm btn-primary">add</button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-lg-7">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>aliases</span>
          <span>
            <span v-if="dirty" class="badge text-bg-warning me-2">unsaved changes</span>
            <button type="button" class="btn btn-sm btn-primary" @click="save">save changes</button>
          </span>
        </div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col">
              <label class="visually-hidden" for="al-f-index">filter by index</label>
              <input
                id="al-f-index"
                v-model="filter.index"
                class="form-control form-control-sm"
                placeholder="filter by index"
              >
            </div>
            <div class="col">
              <label class="visually-hidden" for="al-f-alias">filter by alias</label>
              <input
                id="al-f-alias"
                v-model="filter.alias"
                class="form-control form-control-sm"
                placeholder="filter by alias"
              >
            </div>
          </div>

          <p v-if="loading" class="text-body-secondary small">loading…</p>
          <p v-else-if="currentPage.total === 0" class="text-body-secondary small">
            no aliases defined
          </p>

          <div
            v-for="entry in currentPage.elements.filter(Boolean)"
            :key="entry!.index"
            class="mb-2"
          >
            <div class="d-flex justify-content-between align-items-center">
              <strong class="small">{{ entry!.index }}</strong>
              <button
                type="button"
                class="btn btn-link btn-sm p-0 text-danger"
                @click="removeIndexAliases(entry!.index)"
              >
                remove all
              </button>
            </div>
            <ul class="list-unstyled ms-3 mb-0">
              <li
                v-for="alias in entry!.aliases"
                :key="alias.alias"
                class="d-flex justify-content-between align-items-center small"
              >
                <span>
                  🏷 {{ alias.alias }}
                  <code v-if="alias.filter" class="ms-1">{{ alias.filter }}</code>
                </span>
                <button
                  type="button"
                  class="btn btn-link btn-sm p-0 text-danger"
                  @click="removeIndexAlias(entry!.index, alias.alias)"
                >
                  remove
                </button>
              </li>
            </ul>
          </div>

          <div v-if="currentPage.total > 0" class="d-flex gap-2 align-items-center small mt-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="!currentPage.previous"
              @click="page -= 1"
            >
              previous
            </button>
            <span>{{ currentPage.first }}-{{ currentPage.last }} of {{ currentPage.total }}</span>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="!currentPage.next"
              @click="page += 1"
            >
              next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
