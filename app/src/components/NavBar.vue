<script setup lang="ts">
import {RouterLink} from 'vue-router';
import {NAV_ROUTES, ROUTE_LABELS} from '@/router';
import {useCluster} from '@/composables/useCluster';

const {clusterName, version, connected} = useCluster();
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container-fluid">
      <span class="navbar-brand">
        Fess KOPF
        <small v-if="version" class="text-body-secondary">{{ version.value }}</small>
      </span>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#kopf-nav"
        aria-controls="kopf-nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon" />
      </button>
      <div id="kopf-nav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li v-for="name in NAV_ROUTES" :key="name" class="nav-item">
            <RouterLink class="nav-link" :to="{name}">{{ ROUTE_LABELS[name] }}</RouterLink>
          </li>
        </ul>
        <span class="navbar-text">
          <span
            class="badge"
            :class="connected ? 'text-bg-success' : 'text-bg-danger'"
            role="status"
          >
            {{ connected ? 'connected' : 'disconnected' }}
          </span>
          <span v-if="clusterName" class="ms-2">{{ clusterName }}</span>
        </span>
      </div>
    </div>
  </nav>
</template>
