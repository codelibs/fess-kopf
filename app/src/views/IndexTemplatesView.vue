<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {RequestError} from '@/api/client';
import {createIndexTemplate, deleteIndexTemplate, fetchIndexTemplates} from '@/api/opensearch';
import JsonEditor from '@/components/JsonEditor.vue';
import {useAlerts} from '@/composables/useAlerts';
import {confirm} from '@/composables/useDialogs';
import {IndexTemplate, IndexTemplateFilter} from '@/model/index-template';
import {Paginator} from '@/model/paginator';

const alerts = useAlerts();

/**
 * The starting document. index_patterns, not template: the latter was removed
 * in Elasticsearch 7.0, and a template created from that shape always failed.
 */
const TEMPLATE_BASE = JSON.stringify(
  {index_patterns: ['index*'], settings: {}, mappings: {}, aliases: {}},
  undefined,
  2,
);

const templates = ref<IndexTemplate[]>([]);
const filter = ref(new IndexTemplateFilter('', ''));
const page = ref(1);
const name = ref('');
const body = ref(TEMPLATE_BASE);
const editor = ref<InstanceType<typeof JsonEditor> | null>(null);

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
    templates.value = await fetchIndexTemplates();
  } catch (error) {
    alerts.error('Error while loading templates', describe(error));
  }
}

onMounted(load);

async function create(): Promise<void> {
  if (name.value.trim() === '') {
    alerts.error("Template name can't be empty");
    return;
  }
  if (body.value.trim() === '') {
    alerts.error("Template body can't be empty");
    return;
  }
  if (editor.value?.error != null) {
    alerts.error(`Invalid JSON: ${editor.value.error}`);
    return;
  }
  try {
    const response = await createIndexTemplate(name.value, body.value);
    alerts.success('Template successfully created', response);
    await load();
  } catch (error) {
    alerts.error('Error while creating template', describe(error));
  }
}

async function remove(template: IndexTemplate): Promise<void> {
  const ok = await confirm(
    `are you sure you want to delete template ${template.name}?`,
    JSON.stringify(template.body, undefined, 2),
    'Delete',
  );
  if (!ok) {
    return;
  }
  try {
    const response = await deleteIndexTemplate(template.name);
    alerts.success('Template successfully deleted', response);
    await load();
  } catch (error) {
    alerts.error('Error while deleting template', describe(error));
  }
}

function edit(template: IndexTemplate): void {
  name.value = template.name;
  body.value = JSON.stringify(template.body, undefined, 2);
}
</script>

<template>
  <div class="row g-3">
    <div class="col-lg-6">
      <div class="card">
        <div class="card-header">create template</div>
        <div class="card-body">
          <form @submit.prevent="create">
            <div class="mb-2">
              <label class="form-label small mb-0" for="it-name">name</label>
              <input id="it-name" v-model="name" class="form-control form-control-sm">
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="it-body">body</label>
              <JsonEditor id="it-body" ref="editor" v-model="body" :rows="14" />
            </div>
            <button type="submit" class="btn btn-sm btn-primary">create</button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card">
        <div class="card-header">templates</div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col">
              <label class="visually-hidden" for="it-f-name">filter by name</label>
              <input
                id="it-f-name"
                v-model="filter.name"
                class="form-control form-control-sm"
                placeholder="filter by name"
              >
            </div>
            <div class="col">
              <label class="visually-hidden" for="it-f-pattern">filter by index pattern</label>
              <input
                id="it-f-pattern"
                v-model="filter.template"
                class="form-control form-control-sm"
                placeholder="filter by index pattern"
              >
            </div>
          </div>

          <p v-if="currentPage.total === 0" class="text-body-secondary small">
            no templates match
          </p>
          <ul class="list-unstyled mb-0">
            <li
              v-for="template in currentPage.elements.filter(Boolean)"
              :key="template!.name"
              class="d-flex justify-content-between align-items-center border-bottom py-1"
            >
              <span class="small">
                <strong>{{ template!.name }}</strong>
                <span class="text-body-secondary ms-2">{{ template!.patterns.join(', ') }}</span>
              </span>
              <span>
                <button type="button" class="btn btn-link btn-sm p-0" @click="edit(template!)">
                  edit
                </button>
                <button
                  type="button"
                  class="btn btn-link btn-sm p-0 text-danger ms-2"
                  @click="remove(template!)"
                >
                  delete
                </button>
              </span>
            </li>
          </ul>

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
