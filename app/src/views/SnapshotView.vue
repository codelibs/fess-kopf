<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
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
  <div class="row g-3">
    <div class="col-lg-4">
      <div class="card mb-3">
        <div class="card-header">repositories</div>
        <div class="card-body">
          <p v-if="repositories.length === 0" class="text-body-secondary small">
            no repositories registered
          </p>
          <ul class="list-unstyled mb-0">
            <li
              v-for="repository in repositories"
              :key="repository.name"
              class="d-flex justify-content-between align-items-center border-bottom py-1 small"
            >
              <button
                type="button"
                class="btn btn-link btn-sm p-0"
                :class="{'fw-bold': selectedRepository === repository.name}"
                @click="selectedRepository = repository.name"
              >
                {{ repository.name }}
                <span class="text-body-secondary">({{ repository.type }})</span>
              </button>
              <button
                type="button"
                class="btn btn-link btn-sm p-0 text-danger"
                @click="removeRepository(repository)"
              >
                delete
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header">new repository</div>
        <div class="card-body">
          <form @submit.prevent="submitRepository">
            <div class="mb-2">
              <label class="form-label small mb-0" for="sn-repo-name">name</label>
              <input
                id="sn-repo-name"
                v-model="repositoryForm.name"
                class="form-control form-control-sm"
              >
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="sn-repo-type">type</label>
              <select
                id="sn-repo-type"
                v-model="repositoryForm.type"
                class="form-select form-select-sm"
              >
                <option value="">select type</option>
                <option v-for="type in REPOSITORY_TYPES" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </div>
            <div v-for="setting in repositorySettings" :key="setting" class="mb-2">
              <label class="form-label small mb-0" :for="`sn-set-${setting}`">{{ setting }}</label>
              <input
                :id="`sn-set-${setting}`"
                v-model="repositoryForm.settings[setting]"
                class="form-control form-control-sm"
              >
            </div>
            <button type="submit" class="btn btn-sm btn-primary">create</button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-lg-8">
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>snapshots{{ selectedRepository ? ` in ${selectedRepository}` : '' }}</span>
          <input
            id="sn-filter"
            v-model="filter.name"
            class="form-control form-control-sm w-auto"
            placeholder="filter by name"
          >
        </div>
        <div class="card-body">
          <p v-if="selectedRepository === ''" class="text-body-secondary small">
            select a repository
          </p>
          <p v-else-if="loadingSnapshots" class="text-body-secondary small">loading…</p>
          <p v-else-if="currentPage.total === 0" class="text-body-secondary small">
            no snapshots
          </p>
          <ul class="list-unstyled mb-0">
            <li
              v-for="snapshot in currentPage.elements.filter(Boolean)"
              :key="snapshot!.name"
              class="d-flex justify-content-between align-items-center border-bottom py-1 small"
            >
              <span>
                <button
                  type="button"
                  class="btn btn-link btn-sm p-0"
                  @click="selected = snapshot"
                >
                  {{ snapshot!.name }}
                </button>
                <span class="badge text-bg-secondary ms-2">{{ snapshot!.state }}</span>
                <span class="text-body-secondary ms-2">{{ snapshot!.indices.length }} indices</span>
              </span>
              <button
                type="button"
                class="btn btn-link btn-sm p-0 text-danger"
                @click="removeSnapshot(snapshot!)"
              >
                delete
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header">new snapshot</div>
        <div class="card-body">
          <form @submit.prevent="submitSnapshot">
            <div class="row g-2">
              <div class="col-sm-6">
                <label class="form-label small mb-0" for="sn-new-repo">repository</label>
                <select
                  id="sn-new-repo"
                  v-model="newSnapshot.repository"
                  class="form-select form-select-sm"
                >
                  <option value="">select repository</option>
                  <option v-for="r in repositories" :key="r.name" :value="r.name">
                    {{ r.name }}
                  </option>
                </select>
              </div>
              <div class="col-sm-6">
                <label class="form-label small mb-0" for="sn-new-name">name</label>
                <input
                  id="sn-new-name"
                  v-model="newSnapshot.name"
                  class="form-control form-control-sm"
                >
              </div>
            </div>
            <div class="mt-2">
              <label class="form-label small mb-0" for="sn-new-indices">
                indices (none selected means all)
              </label>
              <select
                id="sn-new-indices"
                v-model="newSnapshot.indices"
                class="form-select form-select-sm"
                multiple
                size="5"
              >
                <option v-for="index in indices" :key="index" :value="index">{{ index }}</option>
              </select>
            </div>
            <div class="form-check mt-2">
              <input
                id="sn-special"
                v-model="showSpecialIndices"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label small" for="sn-special">show special indices</label>
            </div>
            <div class="form-check">
              <input
                id="sn-global"
                v-model="newSnapshot.include_global_state"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label small" for="sn-global">include global state</label>
            </div>
            <div class="form-check mb-2">
              <input
                id="sn-ignore"
                v-model="newSnapshot.ignore_unavailable"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label small" for="sn-ignore">ignore unavailable</label>
            </div>
            <button type="submit" class="btn btn-sm btn-primary">create snapshot</button>
          </form>
        </div>
      </div>

      <div v-if="selected" class="card">
        <div class="card-header">restore {{ selected.name }}</div>
        <div class="card-body">
          <form @submit.prevent="submitRestore">
            <div class="mb-2">
              <label class="form-label small mb-0" for="sn-r-indices">
                indices (none selected means all)
              </label>
              <select
                id="sn-r-indices"
                v-model="restore.indices"
                class="form-select form-select-sm"
                multiple
                size="5"
              >
                <option v-for="index in selected.indices" :key="index" :value="index">
                  {{ index }}
                </option>
              </select>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-sm-6">
                <label class="form-label small mb-0" for="sn-r-pattern">rename pattern</label>
                <input
                  id="sn-r-pattern"
                  v-model="restore.rename_pattern"
                  class="form-control form-control-sm"
                >
              </div>
              <div class="col-sm-6">
                <label class="form-label small mb-0" for="sn-r-replacement">
                  rename replacement
                </label>
                <input
                  id="sn-r-replacement"
                  v-model="restore.rename_replacement"
                  class="form-control form-control-sm"
                >
              </div>
            </div>
            <div class="form-check">
              <input
                id="sn-r-global"
                v-model="restore.include_global_state"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label small" for="sn-r-global">include global state</label>
            </div>
            <div class="form-check">
              <input
                id="sn-r-aliases"
                v-model="restore.include_aliases"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label small" for="sn-r-aliases">include aliases</label>
            </div>
            <div class="form-check mb-2">
              <input
                id="sn-r-ignore"
                v-model="restore.ignore_unavailable"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label small" for="sn-r-ignore">ignore unavailable</label>
            </div>
            <button type="submit" class="btn btn-sm btn-warning">restore</button>
            <button type="button" class="btn btn-sm btn-link" @click="selected = null">
              cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
