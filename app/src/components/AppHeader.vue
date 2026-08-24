<script setup lang="ts">
import {RouterLink} from 'vue-router';
import {NTag} from 'naive-ui';
import {NAV_ROUTES, ROUTE_LABELS} from '@/router';
import {useCluster} from '@/composables/useCluster';

// No product name in the bar: kopf only ever renders inside the Fess admin
// dashboard, which already says whose page this is. The row is for navigation
// and for which cluster you are pointed at.
const {clusterName, connected} = useCluster();
</script>

<template>
  <header class="k-header">
    <nav class="k-nav" aria-label="Sections">
      <RouterLink v-for="name in NAV_ROUTES" :key="name" :to="{name}">
        {{ ROUTE_LABELS[name] }}
      </RouterLink>
    </nav>
    <div class="k-row k-push">
      <span v-if="clusterName" class="k-strong" style="color: var(--k-chrome-text)">
        {{ clusterName }}
      </span>
      <NTag size="small" :type="connected ? 'success' : 'error'" round :bordered="false">
        <span role="status">{{ connected ? 'connected' : 'disconnected' }}</span>
      </NTag>
    </div>
  </header>
</template>
