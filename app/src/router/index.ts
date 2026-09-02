import {createRouter, createWebHashHistory, type RouteRecordRaw} from 'vue-router';

/**
 * Hash routing is not a style choice. Fess serves these files through
 * SearchEngineApiManager.processPluginRequest, which resolves index.html only
 * for paths that exist on disk as a directory and 404s everything else -- there
 * is no SPA fallback, so a real path would break on reload.
 */

/** Shown in the navigation bar, in this order. */
export const NAV_ROUTES = [
  'cluster',
  'nodes',
  'rest',
  'createIndex',
  'aliases',
  'analysis',
  'snapshot',
  'indexTemplates',
  'cat',
  'tasks',
  'hotthreads',
] as const;

export const ROUTE_LABELS: Record<string, string> = {
  cluster: 'cluster',
  nodes: 'nodes',
  rest: 'rest',
  createIndex: 'create index',
  aliases: 'aliases',
  analysis: 'analysis',
  snapshot: 'snapshot',
  indexTemplates: 'index templates',
  cat: 'cat',
  tasks: 'tasks',
  hotthreads: 'hot threads',
  indexSettings: 'index settings',
};

const routes: RouteRecordRaw[] = [
  {path: '/cluster', name: 'cluster', component: () => import('@/views/ClusterView.vue')},
  {path: '/nodes', name: 'nodes', component: () => import('@/views/NodesView.vue')},
  {path: '/rest', name: 'rest', component: () => import('@/views/RestView.vue')},
  {path: '/aliases', name: 'aliases', component: () => import('@/views/AliasesView.vue')},
  {path: '/analysis', name: 'analysis', component: () => import('@/views/AnalysisView.vue')},
  {path: '/snapshot', name: 'snapshot', component: () => import('@/views/SnapshotView.vue')},
  {
    path: '/createIndex',
    name: 'createIndex',
    component: () => import('@/views/CreateIndexView.vue'),
  },
  {
    path: '/indexSettings',
    name: 'indexSettings',
    component: () => import('@/views/IndexSettingsView.vue'),
  },
  {
    path: '/indexTemplates',
    name: 'indexTemplates',
    component: () => import('@/views/IndexTemplatesView.vue'),
  },
  {path: '/cat', name: 'cat', component: () => import('@/views/CatView.vue')},
  {path: '/tasks', name: 'tasks', component: () => import('@/views/TasksView.vue')},
  {path: '/hotthreads', name: 'hotthreads', component: () => import('@/views/HotThreadsView.vue')},
  // /clusterHealth and /clusterSettings are deliberately absent: nothing in the
  // shipped UI ever linked to them, and both failed against a default
  // OpenSearch install. See the migration design for the evidence.
  {path: '/:pathMatch(.*)*', redirect: '/cluster'},
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
