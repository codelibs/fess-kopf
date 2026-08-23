<script setup lang="ts">
import {useAlerts} from '@/composables/useAlerts';

const {alerts, remove, toggle} = useAlerts();

const CLASSES: Record<string, string> = {
  error: 'alert-danger',
  warn: 'alert-warning',
  info: 'alert-info',
  success: 'alert-success',
};

function bodyOf(response: unknown): string {
  return typeof response === 'string' ? response : JSON.stringify(response, undefined, 2);
}
</script>

<template>
  <div v-if="alerts.length" class="container-fluid mt-2" aria-live="polite">
    <div
      v-for="alert in alerts"
      :key="alert.id"
      class="alert alert-dismissible"
      :class="CLASSES[alert.level]"
      role="alert"
    >
      <div class="d-flex align-items-start gap-2">
        <span class="text-body-secondary small">{{ alert.timestamp }}</span>
        <span class="flex-grow-1">{{ alert.message }}</span>
        <button
          v-if="alert.response !== undefined"
          type="button"
          class="btn btn-sm btn-link p-0"
          @click="toggle(alert.id)"
        >
          {{ alert.expanded ? 'hide details' : 'show details' }}
        </button>
      </div>
      <pre v-if="alert.expanded && alert.response !== undefined" class="mt-2 mb-0 small">{{
        bodyOf(alert.response)
      }}</pre>
      <button type="button" class="btn-close" aria-label="Close" @click="remove(alert.id)" />
    </div>
  </div>
</template>
