<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {NAutoComplete, NButton, NCard, NSelect, NTag} from 'naive-ui';
import {RequestError, restRoot} from '@/api/client';
import {BODYLESS_METHODS, fetchIndexMetadata, restRequest} from '@/api/opensearch';
import ExplanationTree from '@/components/ExplanationTree.vue';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';
import {toCsv} from '@/model/csv';
import {isExplainPath, normalizeExplainResponse, type ExplainHit} from '@/model/explain';
import {
  HTTP_METHODS,
  Request,
  loadHistory,
  rememberRequest,
  type HttpMethod,
} from '@/model/request';
import {completeQueryDsl, type Completion} from '@/model/query-dsl-completer';
import {QUERY_SNIPPETS, suggestPaths, targetIndices} from '@/model/rest-suggestions';

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
const targets = computed(() => targetIndices(path.value, indices.value));
const methodOptions = computed(() => HTTP_METHODS.map((m) => ({label: m, value: m})));

/**
 * Field names for the indices the path addresses, so the body editor can
 * complete them.
 *
 * Fetched once per index and kept for as long as the screen is open. A path
 * that names no index -- a cluster-wide `_search` -- fetches nothing and
 * leaves the editor completing the DSL keys alone.
 */
const mappedFields = new Map<string, string[]>();
const fields = ref<string[]>([]);

async function loadFields(): Promise<void> {
  const wanted = targets.value;
  await Promise.all(wanted.filter((index) => !mappedFields.has(index)).map(async (index) => {
    try {
      mappedFields.set(index, (await fetchIndexMetadata(index)).getAllFields());
    } catch {
      // A mapping that cannot be read costs the field completions for that
      // index and nothing else, so it is remembered as empty rather than
      // alerted on and retried at every keystroke.
      mappedFields.set(index, []);
    }
  }));
  const names = wanted.flatMap((index) => mappedFields.get(index) ?? []);
  fields.value = [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

watch(() => targets.value.join(','), () => void loadFields(), {immediate: true});

function complete(text: string, cursor: number): Completion[] {
  return completeQueryDsl(text, cursor, {fields: fields.value});
}

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
    alerts.warn(t('rest.emptyPath'));
    return;
  }
  if (editor.value?.error != null) {
    alerts.error(t('common.invalidJson', {message: editor.value.error}));
    return;
  }
  if (BODYLESS_METHODS.includes(method.value) && body.value.trim() !== '' &&
      body.value.trim() !== '{}') {
    alerts.info(t('rest.bodyIgnored', {method: method.value}));
  }
  if (explain && !isExplainPath(path.value)) {
    alerts.info(t('rest.noExplain'));
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
      alerts.error(t('rest.unreachable',
        {url: `${restRoot()}/${path.value.replace(/^\//, '')}`}));
    } else {
      alerts.error(t('rest.failed'), describe(error));
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
    alerts.info(t('rest.curlCopied'));
  } catch {
    alerts.error(t('rest.curlCopyFailed'), curl);
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
      <h1 class="k-page-title">{{ t('rest.title') }}</h1>
      <p class="k-page-sub">{{ t('rest.sub') }}</p>
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
            <JsonEditor
              id="rest-body" ref="editor" v-model="body" :rows="12" :complete="complete"
            />
          </div>

          <div class="k-row k-wrap">
            <NButton attr-type="submit" type="primary" :loading="running" :disabled="running">
              {{ running ? t('rest.sending') : t('rest.send') }}
            </NButton>
            <NButton :disabled="running" @click="send(true)">{{ t('rest.explain') }}</NButton>
            <NButton @click="copyAsCurl">{{ t('rest.copyAsCurl') }}</NButton>
            <NButton :disabled="!canExport" @click="exportCsv">{{ t('rest.exportCsv') }}</NButton>
            <span class="k-push k-small k-muted">{{ t('rest.snippets') }}</span>
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

      <NCard v-if="explanations.length" :title="t('rest.explanations')">
        <div
          v-for="hit in explanations" :key="hit.documentId" class="k-stack-tight"
          style="margin-bottom: 12px"
        >
          <div class="k-strong k-small">{{ hit.documentId }} — {{ hit._score }}</div>
          <ExplanationTree v-if="hit._explanation" :node="hit._explanation" />
        </div>
      </NCard>

      <NCard v-if="response !== null" :title="t('rest.response')">
        <pre id="rest-response" class="k-pre" style="max-height: 32rem">{{ responseText }}</pre>
      </NCard>
    </div>

    <NCard :title="t('rest.history')">
      <p v-if="history.length === 0" class="k-muted k-small">{{ t('rest.noHistory') }}</p>
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
