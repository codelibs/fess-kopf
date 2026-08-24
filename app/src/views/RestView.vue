<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {NAutoComplete, NButton, NCard, NSelect, NTag} from 'naive-ui';
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
const methodOptions = computed(() => HTTP_METHODS.map((m) => ({label: m, value: m})));

const canExport = computed(() => response.value !== null && typeof response.value === 'object');

const responseText = computed(() =>
  typeof response.value === 'string'
    ? response.value
    : JSON.stringify(response.value, undefined, 2),
);

/** Colours the history entries the way a REST client does. */
const METHOD_TYPE: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  DELETE: 'error',
  HEAD: 'default',
};

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
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">REST</h1>
      <p class="k-page-sub">Send a request straight to the cluster.</p>
    </div>
  </div>

  <div class="k-rest">
    <div class="k-stack">
      <NCard>
        <form class="k-stack" @submit.prevent="send(false)">
          <div class="k-row k-wrap" style="align-items: flex-end">
            <div>
              <span id="rest-method-label" class="k-label">method</span>
              <NSelect
                id="rest-method"
                v-model:value="method"
                aria-labelledby="rest-method-label"
                :options="methodOptions"
                style="width: 8rem"
              />
            </div>
            <div class="k-grow">
              <label class="k-label" for="rest-path">path</label>
              <NAutoComplete
                v-model:value="path"
                :options="suggestions"
                placeholder="_search"
                :input-props="{id: 'rest-path', autocomplete: 'off'}"
              />
            </div>
          </div>

          <div>
            <label class="k-label" for="rest-body">body</label>
            <JsonEditor id="rest-body" ref="editor" v-model="body" :rows="12" />
          </div>

          <div class="k-row k-wrap">
            <NButton attr-type="submit" type="primary" :loading="running" :disabled="running">
              {{ running ? 'sending…' : 'send' }}
            </NButton>
            <NButton :disabled="running" @click="send(true)">explain</NButton>
            <NButton @click="copyAsCurl">copy as cURL</NButton>
            <NButton :disabled="!canExport" @click="exportCsv">export CSV</NButton>
            <span class="k-push k-small k-muted">snippets:</span>
            <NButton
              v-for="snippet in QUERY_SNIPPETS"
              :key="snippet.label"
              text
              size="tiny"
              type="primary"
              @click="insertSnippet(snippet.body)"
            >
              {{ snippet.label }}
            </NButton>
          </div>
        </form>
      </NCard>

      <NCard v-if="explanations.length" title="explanations">
        <div
          v-for="hit in explanations" :key="hit.documentId" class="k-stack-tight"
          style="margin-bottom: 12px"
        >
          <div class="k-strong k-small">{{ hit.documentId }} — {{ hit._score }}</div>
          <ExplanationTree v-if="hit._explanation" :node="hit._explanation" />
        </div>
      </NCard>

      <NCard v-if="response !== null" title="response">
        <pre id="rest-response" class="k-pre" style="max-height: 32rem">{{ responseText }}</pre>
      </NCard>
    </div>

    <NCard title="history">
      <p v-if="history.length === 0" class="k-muted k-small">no requests yet</p>
      <ul v-else class="k-history">
        <li v-for="(entry, i) in history" :key="i">
          <NButton
            text style="justify-content: flex-start; width: 100%"
            @click="loadFromHistory(entry)"
          >
            <NTag size="tiny" :type="METHOD_TYPE[entry.method] ?? 'default'" :bordered="false">
              {{ entry.method }}
            </NTag>
            <span class="k-small k-mono" style="margin-left: 6px; word-break: break-all">
              {{ entry.path }}
            </span>
          </NButton>
        </li>
      </ul>
    </NCard>
  </div>
</template>

<style scoped>
.k-rest {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

@media (min-width: 1100px) {
  .k-rest {
    grid-template-columns: minmax(0, 1fr) minmax(0, 18rem);
    align-items: start;
  }
}

.k-history {
  list-style: none;
  margin: 0;
  padding: 0;
}

.k-history > li {
  padding: 6px 0;
  border-bottom: 1px solid var(--k-border);
}

.k-history > li:last-child {
  border-bottom: 0;
}
</style>
