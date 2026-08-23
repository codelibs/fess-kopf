<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {RequestError, restRoot} from '@/api/client';
import {BODYLESS_METHODS, restRequest} from '@/api/opensearch';
import ExplanationTree from '@/components/ExplanationTree.vue';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {toCsv} from '@/model/csv';
import {isExplainPath, normalizeExplainResponse, type ExplainHit} from '@/model/explain';
import {
  HTTP_METHODS,
  Request,
  loadHistory,
  rememberRequest,
  type HttpMethod,
} from '@/model/request';
import {QUERY_SNIPPETS, suggestPaths} from '@/model/rest-suggestions';

const alerts = useAlerts();
const {cluster} = useCluster();
const route = useRoute();

const path = ref('');
const method = ref<HttpMethod>('GET');
const body = ref('{}');
const response = ref<unknown>(null);
const explanations = ref<ExplainHit[]>([]);
const history = ref<Request[]>([]);
const running = ref(false);
const editor = ref<InstanceType<typeof JsonEditor> | null>(null);

const indices = computed(() => (cluster.value?.indices ?? []).map((index) => index.name));
const suggestions = computed(() => suggestPaths(path.value, indices.value));

const canExport = computed(() => response.value !== null && typeof response.value === 'object');

onMounted(() => {
  // The cluster overview links here with a request already filled in.
  path.value = String(route.query.path ?? '');
  method.value = (String(route.query.method ?? 'GET').toUpperCase() as HttpMethod) ?? 'GET';
  body.value = String(route.query.body ?? '{}');
  history.value = loadHistory();
});

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

async function send(explain = false): Promise<void> {
  if (path.value.trim() === '') {
    alerts.warn('Path is empty');
    return;
  }
  if (editor.value?.error != null) {
    alerts.error(`Invalid JSON: ${editor.value.error}`);
    return;
  }
  if (BODYLESS_METHODS.includes(method.value) && body.value.trim() !== '' &&
      body.value.trim() !== '{}') {
    alerts.info(
      `A ${method.value} request cannot carry a body, so it was not sent. ` +
        'Use POST or PUT if the body matters.',
    );
  }
  if (explain && !isExplainPath(path.value)) {
    alerts.info('You are executing a request without _explain nor ?explain=true');
  }

  running.value = true;
  response.value = null;
  explanations.value = [];
  try {
    const result = await restRequest(method.value, path.value, body.value);
    response.value = result;
    if (explain && result !== null && typeof result === 'object') {
      explanations.value = normalizeExplainResponse(result as never);
    }
    history.value = rememberRequest(
      history.value,
      new Request(path.value, method.value, body.value),
    );
  } catch (error) {
    if (error instanceof RequestError && error.isUnreachable) {
      alerts.error(`${restRoot()}/${path.value.replace(/^\//, '')} is unreachable`);
    } else {
      alerts.error('Request was not successful', describe(error));
      response.value = error instanceof RequestError ? error.body : String(error);
    }
  } finally {
    running.value = false;
  }
}

function loadFromHistory(request: Request): void {
  path.value = request.path;
  method.value = request.method;
  body.value = request.body;
}

function insertSnippet(snippet: string): void {
  body.value = snippet;
}

async function copyAsCurl(): Promise<void> {
  const target = `${restRoot()}/${path.value.replace(/^\//, '')}`;
  let curl = `curl -X${method.value} '${encodeURI(target)}'`;
  if (!BODYLESS_METHODS.includes(method.value) && body.value.trim() !== '') {
    curl += ` -H 'Content-Type: application/json' -d '${body.value}'`;
  }
  try {
    await navigator.clipboard.writeText(curl);
    alerts.info('cURL request successfully copied to clipboard');
  } catch {
    alerts.error('Error while copying request to clipboard', curl);
  }
}

function exportCsv(): void {
  const csv = toCsv(response.value);
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8;'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data.csv';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="row g-3">
    <div class="col-lg-9">
      <div class="card">
        <div class="card-body">
          <form class="row g-2 align-items-end" @submit.prevent="send(false)">
            <div class="col-sm-2">
              <label class="form-label small mb-0" for="rest-method">method</label>
              <select id="rest-method" v-model="method" class="form-select form-select-sm">
                <option v-for="m in HTTP_METHODS" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="col-sm-10">
              <label class="form-label small mb-0" for="rest-path">path</label>
              <input
                id="rest-path"
                v-model="path"
                class="form-control form-control-sm"
                list="rest-path-options"
                placeholder="_search"
                autocomplete="off"
              >
              <datalist id="rest-path-options">
                <option v-for="option in suggestions" :key="option" :value="option" />
              </datalist>
            </div>
            <div class="col-12">
              <label class="form-label small mb-0" for="rest-body">body</label>
              <JsonEditor id="rest-body" ref="editor" v-model="body" :rows="12" />
            </div>
            <div class="col-12 d-flex flex-wrap gap-2 align-items-center">
              <button type="submit" class="btn btn-sm btn-primary" :disabled="running">
                {{ running ? 'sending…' : 'send' }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="running"
                @click="send(true)"
              >
                explain
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="copyAsCurl">
                copy as cURL
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="!canExport"
                @click="exportCsv"
              >
                export CSV
              </button>
              <span class="ms-auto small text-body-secondary">snippets:</span>
              <button
                v-for="snippet in QUERY_SNIPPETS"
                :key="snippet.label"
                type="button"
                class="btn btn-sm btn-link p-0"
                @click="insertSnippet(snippet.body)"
              >
                {{ snippet.label }}
              </button>
            </div>
          </form>

          <div v-if="explanations.length" class="mt-3">
            <h6 class="small">explanations</h6>
            <div v-for="hit in explanations" :key="hit.documentId" class="mb-2">
              <div class="small fw-bold">{{ hit.documentId }} — {{ hit._score }}</div>
              <ExplanationTree v-if="hit._explanation" :node="hit._explanation" />
            </div>
          </div>

          <div v-if="response !== null" class="mt-3">
            <h6 class="small">response</h6>
            <pre id="rest-response" class="small mb-0">{{
              typeof response === 'string' ? response : JSON.stringify(response, undefined, 2)
            }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div class="col-lg-3">
      <div class="card">
        <div class="card-header">history</div>
        <div class="card-body">
          <p v-if="history.length === 0" class="text-body-secondary small">no requests yet</p>
          <ul class="list-unstyled mb-0">
            <li v-for="(entry, i) in history" :key="i" class="border-bottom py-1">
              <button
                type="button"
                class="btn btn-link btn-sm p-0 text-start"
                @click="loadFromHistory(entry)"
              >
                <span class="badge text-bg-secondary">{{ entry.method }}</span>
                <span class="ms-1 small">{{ entry.path }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
