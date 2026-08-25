<script setup lang="ts">
import {NAlert, NButton} from 'naive-ui';
import {useAlerts} from '@/composables/useAlerts';
import {t} from '@/i18n';

const {alerts, remove, toggle} = useAlerts();

/** Alert levels are ours; these are Naive UI's names for the same four. */
const TYPES = {
  error: 'error',
  warn: 'warning',
  info: 'info',
  success: 'success',
} as const;

function bodyOf(response: unknown): string {
  return typeof response === 'string' ? response : JSON.stringify(response, undefined, 2);
}
</script>

<template>
  <div v-if="alerts.length" class="k-stack-tight" style="padding: 12px 16px 0" aria-live="polite">
    <NAlert
      v-for="alert in alerts"
      :key="alert.id"
      :type="TYPES[alert.level]"
      closable
      @close="remove(alert.id)"
    >
      <div class="k-row k-row-top k-wrap">
        <span class="k-small k-muted k-mono">{{ alert.timestamp }}</span>
        <span class="k-grow">{{ alert.message }}</span>
        <NButton
          v-if="alert.response !== undefined"
          text
          size="tiny"
          type="primary"
          @click="toggle(alert.id)"
        >
          {{ alert.expanded ? t('alert.hideDetails') : t('alert.showDetails') }}
        </NButton>
      </div>
      <pre
        v-if="alert.expanded && alert.response !== undefined"
        class="k-pre"
        style="margin-top: 8px"
      >{{ bodyOf(alert.response) }}</pre>
    </NAlert>
  </div>
</template>
