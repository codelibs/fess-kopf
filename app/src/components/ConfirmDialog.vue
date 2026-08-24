<script setup lang="ts">
import {watch, useTemplateRef} from 'vue';
import {NButton} from 'naive-ui';
import {useDialogs} from '@/composables/useDialogs';

/**
 * A native <dialog> rather than Naive UI's NModal, deliberately: NModal
 * teleports to document.body, which puts the confirmation of a destructive
 * action outside the component tree a test can reach. showModal() gives the
 * same focus trap and Escape handling without that.
 */
const {confirmRequest, resolveConfirm} = useDialogs();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

watch(confirmRequest, (request) => {
  if (request === null) {
    dialog.value?.close();
  } else if (!dialog.value?.open) {
    dialog.value?.showModal();
  }
});
</script>

<template>
  <dialog ref="dialog" class="k-dialog" @cancel.prevent="resolveConfirm(false)">
    <div v-if="confirmRequest" class="k-dialog-body">
      <h2 class="k-dialog-title">{{ confirmRequest.header }}</h2>
      <p class="k-dialog-text">{{ confirmRequest.body }}</p>
      <div class="k-row k-push" style="justify-content: flex-end">
        <NButton size="small" @click="resolveConfirm(false)">cancel</NButton>
        <NButton size="small" type="error" @click="resolveConfirm(true)">
          {{ confirmRequest.confirmText }}
        </NButton>
      </div>
    </div>
  </dialog>
</template>

<style>
/* Not scoped: ::backdrop belongs to the top layer, and both dialogs share it. */
.k-dialog {
  padding: 0;
  border: 1px solid var(--k-border);
  border-radius: 10px;
  background: var(--k-surface);
  color: var(--k-text);
  box-shadow: 0 12px 32px rgb(15 23 42 / 18%);
  max-width: 90vw;
  max-height: 85vh;
}

.k-dialog::backdrop {
  background: rgb(15 23 42 / 45%);
}

.k-dialog-body {
  width: 34rem;
  max-width: 100%;
  max-height: 85vh;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.k-dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

/* A bulk confirmation lists every selected index, so the body scrolls rather
   than pushing the buttons off the bottom of the dialog. */
.k-dialog-text {
  margin: 0;
  min-height: 0;
  overflow: auto;
  white-space: pre-wrap;
  color: var(--k-text-muted);
}
</style>
