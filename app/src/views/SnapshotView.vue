<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {NButton, NCard, NCheckbox, NInput, NSelect, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {
  createRepository,
  createSnapshot,
  deleteRepository,
  deleteSnapshot,
  fetchRepositories,
  fetchSnapshots,
  restoreSnapshot,
} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {confirm} from '@/composables/useDialogs';
import {Paginator} from '@/model/paginator';
import {
  REPOSITORY_SETTINGS,
  REPOSITORY_TYPES,
  Repository,
  Snapshot,
  SnapshotFilter,
} from '@/model/snapshot';

const alerts = useAlerts();
const {cluster} = useCluster();

const repositories = ref<Repository[]>([]);
const snapshots = ref<Snapshot[]>([]);
const selectedRepository = ref('');
const selected = ref<Snapshot | null>(null);
const loadingSnapshots = ref(false);
const showSpecialIndices = ref(false);
const filter = ref(new SnapshotFilter(''));
const page = ref(1);

const repositoryForm = ref(new Repository('', {type: '', settings: {}}));
const newSnapshot = ref({name: '', repository: '', indices: [] as string[],
  include_global_state: false, ignore_unavailable: false});
const restore = ref({indices: [] as string[], include_global_state: false,
  include_aliases: false, ignore_unavailable: false, rename_pattern: '',
  rename_replacement: ''});

const indices = computed(() =>
  (cluster.value?.indices ?? [])
    .filter((index) => showSpecialIndices.value || !index.special)
    .map((index) => index.name),
);

const repositorySettings = computed(() => REPOSITORY_SETTINGS[repositoryForm.value.type] ?? []);

/** Naive UI takes {label, value} pairs; these lists are all plain strings. */
function asOptions(values: readonly string[]): {label: string; value: string}[] {
  return values.map((value) => ({label: value, value}));
}

const typeOptions = computed(() => asOptions(REPOSITORY_TYPES));
const repositoryOptions = computed(() => asOptions(repositories.value.map((r) => r.name)));
const indexOptions = computed(() => asOptions(indices.value));
const restorableOptions = computed(() => asOptions(selected.value?.indices ?? []));

/** Snapshot states are worth reading at a glance. */
const STATE_TYPE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  SUCCESS: 'success',
  IN_PROGRESS: 'warning',
  PARTIAL: 'warning',
  FAILED: 'error',
};

const paginator = computed(() => {
  const p = new Paginator<Snapshot>(page.value, 10, [], filter.value);
  p.setCollection(snapshots.value);
  return p;
});
const currentPage = computed(() => paginator.value.getPage());

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

async function loadRepositories(): Promise<void> {
  try {
    repositories.value = await fetchRepositories();
  } catch (error) {
    repositories.value = [];
    alerts.error('Error while reading snapshot', describe(error));
  }
}

async function loadSnapshots(): Promise<void> {
  if (selectedRepository.value === '') {
    snapshots.value = [];
    return;
  }
  loadingSnapshots.value = true;
  try {
    snapshots.value = await fetchSnapshots(selectedRepository.value);
  } catch (error) {
    snapshots.value = [];
    alerts.error('Error while fetching snapshots', describe(error));
  } finally {
    loadingSnapshots.value = false;
  }
}

async function reload(): Promise<void> {
  await loadRepositories();
  await loadSnapshots();
}

onMounted(reload);
watch(selectedRepository, () => {
  selected.value = null;
  page.value = 1;
  void loadSnapshots();
});

async function submitRepository(): Promise<void> {
  try {
    repositoryForm.value.validate();
  } catch (error) {
    alerts.error(error instanceof Error ? error.message : String(error));
    return;
  }
  try {
    await createRepository(repositoryForm.value.name, repositoryForm.value.asJson());
    alerts.success('Repository created');
    await loadRepositories();
  } catch (error) {
    alerts.error('Error while creating repository', describe(error));
  }
}

async function removeRepository(repository: Repository): Promise<void> {
  const ok = await confirm(
    `are you sure you want to delete repository ${repository.name}?`,
    JSON.stringify(repository.settings, undefined, 2),
    'Delete',
  );
  if (!ok) {
    return;
  }
  try {
    const response = await deleteRepository(repository.name);
    alerts.success('Repository successfully deleted', response);
    if (selectedRepository.value === repository.name) {
      selectedRepository.value = '';
    }
    await reload();
  } catch (error) {
    alerts.error('Error while deleting repository', describe(error));
  }
}

/** Optional parameters are left out entirely when not set, as before. */
function optionalBody(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  keys.forEach((key) => {
    const value = source[key];
    if (value !== undefined && value !== '' && value !== false) {
      body[key] = value;
    }
  });
  return body;
}

async function submitSnapshot(): Promise<void> {
  if (newSnapshot.value.repository === '') {
    alerts.warn('Repository is required');
    return;
  }
  if (newSnapshot.value.name.trim() === '') {
    alerts.warn('Snapshot name is required');
    return;
  }
  const body: Record<string, unknown> = optionalBody(
    newSnapshot.value as unknown as Record<string, unknown>,
    ['include_global_state', 'ignore_unavailable'],
  );
  if (newSnapshot.value.indices.length > 0) {
    body.indices = newSnapshot.value.indices.join(',');
  }
  try {
    await createSnapshot(
      newSnapshot.value.repository,
      newSnapshot.value.name,
      JSON.stringify(body),
    );
    alerts.success('Snapshot created');
    await reload();
  } catch (error) {
    alerts.error('Error while creating snapshot', describe(error));
  }
}

async function removeSnapshot(snapshot: Snapshot): Promise<void> {
  const ok = await confirm(
    `are you sure you want to delete snapshot ${snapshot.name}?`,
    JSON.stringify(snapshot, undefined, 2),
    'Delete',
  );
  if (!ok) {
    return;
  }
  try {
    const response = await deleteSnapshot(selectedRepository.value, snapshot.name);
    alerts.success('Snapshot successfully deleted', response);
    await reload();
  } catch (error) {
    alerts.error('Error while deleting snapshot', describe(error));
  }
}

async function submitRestore(): Promise<void> {
  if (selected.value === null) {
    return;
  }
  const body: Record<string, unknown> = optionalBody(
    restore.value as unknown as Record<string, unknown>,
    ['include_global_state', 'include_aliases', 'ignore_unavailable', 'rename_pattern',
      'rename_replacement'],
  );
  if (restore.value.indices.length > 0) {
    body.indices = restore.value.indices.join(',');
  }
  try {
    await restoreSnapshot(selectedRepository.value, selected.value.name, JSON.stringify(body));
    alerts.success('Snapshot Restored Started');
    await reload();
  } catch (error) {
    alerts.error('Error while starting restore of snapshot', describe(error));
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">Snapshots</h1>
      <p class="k-page-sub">Register a repository, then take and restore snapshots from it.</p>
    </div>
  </div>

  <div class="k-snap">
    <div class="k-stack">
      <NCard title="repositories">
        <p v-if="repositories.length === 0" class="k-empty">no repositories registered</p>
        <ul v-else class="k-rows">
          <li v-for="repository in repositories" :key="repository.name">
            <NButton
              text
              size="small"
              :type="selectedRepository === repository.name ? 'primary' : 'default'"
              class="k-grow"
              style="justify-content: flex-start"
              @click="selectedRepository = repository.name"
            >
              <span :class="{'k-strong': selectedRepository === repository.name}">
                {{ repository.name }}
              </span>
              <span class="k-muted k-small" style="margin-left: 6px">
                ({{ repository.type }})
              </span>
            </NButton>
            <NButton text size="tiny" type="error" @click="removeRepository(repository)">
              delete
            </NButton>
          </li>
        </ul>
      </NCard>

      <NCard title="new repository">
        <form class="k-stack" @submit.prevent="submitRepository">
          <div>
            <label class="k-label" for="sn-repo-name">name</label>
            <NInput v-model:value="repositoryForm.name" :input-props="{id: 'sn-repo-name'}" />
          </div>
          <div>
            <span id="sn-repo-type-label" class="k-label">type</span>
            <NSelect
              id="sn-repo-type"
              v-model:value="repositoryForm.type"
              aria-labelledby="sn-repo-type-label"
              :options="typeOptions"
              placeholder="select type"
            />
          </div>
          <div v-for="setting in repositorySettings" :key="setting">
            <label class="k-label" :for="`sn-set-${setting}`">{{ setting }}</label>
            <NInput
              v-model:value="repositoryForm.settings[setting]"
              :input-props="{id: `sn-set-${setting}`}"
            />
          </div>
          <div>
            <NButton attr-type="submit" type="primary">create</NButton>
          </div>
        </form>
      </NCard>
    </div>

    <div class="k-stack">
      <NCard>
        <template #header>
          <span>snapshots{{ selectedRepository ? ` in ${selectedRepository}` : '' }}</span>
        </template>
        <template #header-extra>
          <NInput
            v-model:value="filter.name"
            size="small"
            placeholder="filter by name"
            clearable
            aria-label="filter snapshots by name"
            :input-props="{id: 'sn-filter'}"
          />
        </template>
        <p v-if="selectedRepository === ''" class="k-empty">select a repository</p>
        <p v-else-if="loadingSnapshots" class="k-muted k-small">loading…</p>
        <p v-else-if="currentPage.total === 0" class="k-empty">no snapshots</p>
        <ul v-else class="k-rows">
          <li v-for="snapshot in currentPage.elements.filter(Boolean)" :key="snapshot!.name">
            <span class="k-row k-grow">
              <NButton text size="small" type="primary" @click="selected = snapshot">
                {{ snapshot!.name }}
              </NButton>
              <NTag
                size="tiny"
                :bordered="false"
                :type="STATE_TYPE[snapshot!.state ?? ''] ?? 'default'"
              >
                {{ snapshot!.state }}
              </NTag>
              <span class="k-muted k-small">{{ snapshot!.indices.length }} indices</span>
            </span>
            <NButton text size="tiny" type="error" @click="removeSnapshot(snapshot!)">
              delete
            </NButton>
          </li>
        </ul>
      </NCard>

      <NCard title="new snapshot">
        <form class="k-stack" @submit.prevent="submitSnapshot">
          <div class="k-two">
            <div>
              <span id="sn-new-repo-label" class="k-label">repository</span>
              <NSelect
                id="sn-new-repo"
                v-model:value="newSnapshot.repository"
                aria-labelledby="sn-new-repo-label"
                :options="repositoryOptions"
                placeholder="select repository"
              />
            </div>
            <div>
              <label class="k-label" for="sn-new-name">name</label>
              <NInput v-model:value="newSnapshot.name" :input-props="{id: 'sn-new-name'}" />
            </div>
          </div>
          <div>
            <span id="sn-new-indices-label" class="k-label">
              indices (none selected means all)
            </span>
            <NSelect
              id="sn-new-indices"
              v-model:value="newSnapshot.indices"
              aria-labelledby="sn-new-indices-label"
              :options="indexOptions"
              multiple
              filterable
              :max-tag-count="6"
              placeholder="all indices"
            />
          </div>
          <div class="k-row k-wrap">
            <NCheckbox id="sn-special" v-model:checked="showSpecialIndices">
              show special indices
            </NCheckbox>
            <NCheckbox id="sn-global" v-model:checked="newSnapshot.include_global_state">
              include global state
            </NCheckbox>
            <NCheckbox id="sn-ignore" v-model:checked="newSnapshot.ignore_unavailable">
              ignore unavailable
            </NCheckbox>
          </div>
          <div>
            <NButton attr-type="submit" type="primary">create snapshot</NButton>
          </div>
        </form>
      </NCard>

      <NCard v-if="selected" :title="`restore ${selected.name}`">
        <form class="k-stack" @submit.prevent="submitRestore">
          <div>
            <span id="sn-r-indices-label" class="k-label">
              indices (none selected means all)
            </span>
            <NSelect
              id="sn-r-indices"
              v-model:value="restore.indices"
              aria-labelledby="sn-r-indices-label"
              :options="restorableOptions"
              multiple
              filterable
              :max-tag-count="6"
              placeholder="all indices in the snapshot"
            />
          </div>
          <div class="k-two">
            <div>
              <label class="k-label" for="sn-r-pattern">rename pattern</label>
              <NInput
                v-model:value="restore.rename_pattern"
                :input-props="{id: 'sn-r-pattern'}"
              />
            </div>
            <div>
              <label class="k-label" for="sn-r-replacement">rename replacement</label>
              <NInput
                v-model:value="restore.rename_replacement"
                :input-props="{id: 'sn-r-replacement'}"
              />
            </div>
          </div>
          <div class="k-row k-wrap">
            <NCheckbox id="sn-r-global" v-model:checked="restore.include_global_state">
              include global state
            </NCheckbox>
            <NCheckbox id="sn-r-aliases" v-model:checked="restore.include_aliases">
              include aliases
            </NCheckbox>
            <NCheckbox id="sn-r-ignore" v-model:checked="restore.ignore_unavailable">
              ignore unavailable
            </NCheckbox>
          </div>
          <div class="k-row">
            <NButton attr-type="submit" type="warning">restore</NButton>
            <NButton text size="small" @click="selected = null">cancel</NButton>
          </div>
        </form>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.k-snap {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

@media (min-width: 1000px) {
  .k-snap {
    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
    align-items: start;
  }
}

.k-two {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 12px;
}

.k-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.k-rows > li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--k-border);
}

.k-rows > li:last-child {
  border-bottom: 0;
}
</style>
