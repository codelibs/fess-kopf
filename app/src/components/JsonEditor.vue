<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue';
import {NButton, NInput} from 'naive-ui';
import {caretPosition} from './caret';
import {
  applyCompletion,
  contextAt,
  type Completion,
  type CompletionContext,
} from '@/model/query-dsl-completer';
import {t} from '@/i18n';

/** How many completions the popup renders; typing narrows the rest away. */
const MAX_ITEMS = 50;

const model = defineModel<string>({required: true});
const props = defineProps<{
  id: string;
  rows?: number;
  /**
   * What to offer at a caret. Without it the editor is a plain JSON
   * textarea, which is what every screen but the REST client wants.
   */
  complete?: (text: string, cursor: number) => Completion[];
}>();

const input = ref<InstanceType<typeof NInput> | null>(null);
const items = ref<Completion[]>([]);
const active = ref(0);
const anchor = ref({top: 0, left: 0});
/** The text and caret the offered completions were read from. */
const source = ref<{text: string; context: CompletionContext} | null>(null);

/** Null when the text parses, otherwise the parser's complaint. */
const error = computed<string | null>(() => {
  if (model.value.trim() === '') {
    return null;
  }
  try {
    JSON.parse(model.value);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
});

defineExpose({error});

const popupStyle = computed(() => ({
  top: `${anchor.value.top}px`,
  left: `${anchor.value.left}px`,
}));

function textarea(): HTMLTextAreaElement | null {
  return input.value?.textareaElRef ?? null;
}

function close(): void {
  items.value = [];
  source.value = null;
}

/**
 * Offers what fits the caret, or closes.
 *
 * Typing opens the popup once there is a prefix to narrow by, or as soon as a
 * quote is typed -- the point at which a key or a value is about to be named.
 * Ctrl+Space forces it open wherever the caret is.
 */
function refresh(text: string, cursor: number, typed: string, forced: boolean): void {
  const element = textarea();
  if (element === null || props.complete === undefined) {
    close();
    return;
  }
  const context = contextAt(text, cursor);
  if (!forced && context.prefix === '' && typed !== '"') {
    close();
    return;
  }
  const found = props.complete(text, cursor);
  if (found.length === 0) {
    close();
    return;
  }
  const caret = caretPosition(element, cursor);
  const box = element.getBoundingClientRect();
  anchor.value = {top: box.top + caret.top + caret.lineHeight, left: box.left + caret.left};
  items.value = found.slice(0, MAX_ITEMS);
  active.value = 0;
  source.value = {text, context};
}

function accept(index: number): void {
  const chosen = items.value[index];
  const from = source.value;
  close();
  if (chosen === undefined || from === null) {
    return;
  }
  const applied = applyCompletion(from.text, from.context, chosen.label);
  model.value = applied.text;
  void nextTick(() => {
    const element = textarea();
    element?.focus();
    element?.setSelectionRange(applied.cursor, applied.cursor);
  });
}

function highlight(index: number): void {
  active.value = index;
  void nextTick(() => {
    const option = document.getElementById(`${props.id}-completion-${index}`);
    if (typeof option?.scrollIntoView === 'function') {
      option.scrollIntoView({block: 'nearest'});
    }
  });
}

function onInput(value: string): void {
  const cursor = textarea()?.selectionStart ?? value.length;
  refresh(value, cursor, cursor > 0 ? value.charAt(cursor - 1) : '', false);
}

function onKeydown(event: KeyboardEvent): void {
  if (props.complete === undefined) {
    return;
  }
  if (event.ctrlKey && event.code === 'Space') {
    event.preventDefault();
    const element = textarea();
    refresh(model.value, element?.selectionStart ?? model.value.length, '', true);
    return;
  }
  if (items.value.length === 0) {
    return;
  }
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlight((active.value + 1) % items.value.length);
      break;
    case 'ArrowUp':
      event.preventDefault();
      highlight((active.value + items.value.length - 1) % items.value.length);
      break;
    case 'Enter':
    case 'Tab':
      event.preventDefault();
      accept(active.value);
      break;
    case 'Escape':
      event.preventDefault();
      close();
      break;
    default:
      break;
  }
}

// The popup is placed against the viewport, so anything that moves the
// textarea under it leaves it behind; closing is both simpler and less
// surprising than following.
function onViewportChange(): void {
  if (items.value.length > 0) {
    close();
  }
}

onMounted(() => window.addEventListener('scroll', onViewportChange, true));
onBeforeUnmount(() => window.removeEventListener('scroll', onViewportChange, true));

function format(): void {
  if (error.value !== null || model.value.trim() === '') {
    return;
  }
  close();
  model.value = JSON.stringify(JSON.parse(model.value), undefined, 2);
}
</script>

<template>
  <div>
    <!-- The id goes on the textarea itself, not on NInput's wrapper: callers
         label it, and the tests drive it. -->
    <NInput
      ref="input"
      v-model:value="model"
      type="textarea"
      :status="error === null ? undefined : 'error'"
      :rows="props.rows ?? 4"
      :input-props="{id: props.id, spellcheck: 'false'}"
      :style="{fontFamily: 'var(--k-mono)'}"
      @input="onInput"
      @keydown="onKeydown"
      @click="close"
      @input-blur="close"
    />
    <ul v-if="items.length > 0" class="k-completions" role="listbox" :style="popupStyle">
      <li
        v-for="(item, index) in items"
        :id="`${props.id}-completion-${index}`"
        :key="item.label"
        role="option"
        :aria-selected="index === active"
        :class="{'is-active': index === active}"
        @mousedown.prevent="accept(index)"
      >
        <span class="k-completion-label">{{ item.label }}</span>
        <span class="k-completion-meta">{{ item.meta }}</span>
      </li>
    </ul>
    <div class="k-row k-row-top" style="margin-top: 4px">
      <span v-if="error" class="k-small k-grow" style="color: var(--k-error)">{{ error }}</span>
      <span v-else class="k-grow" />
      <NButton text size="tiny" type="primary" @click="format">{{ t('editor.format') }}</NButton>
    </div>
  </div>
</template>

<style scoped>
.k-completions {
  position: fixed;
  z-index: 20;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  min-width: 12rem;
  max-width: 24rem;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--k-surface);
  border: 1px solid var(--k-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 14%);
}

.k-completions > li {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
  padding: 3px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.k-completions > li.is-active,
.k-completions > li:hover {
  background: var(--k-surface-muted);
}

.k-completion-label {
  font-family: var(--k-mono);
  font-size: 12px;
}

.k-completion-meta {
  font-size: 11px;
  color: var(--k-text-muted);
}
</style>
