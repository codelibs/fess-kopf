import {computed, readonly, ref} from 'vue';
import {RequestError, request, requestAll} from '@/api/client';
import {getSettings} from '@/api/settings';
import {Version} from '@/model/version';
import {useAlerts} from './useAlerts';

/** kopf targets OpenSearch. Anything older is not supported. */
const MIN_MAJOR = 2;

export interface ClusterHealth {
  cluster_name: string;
  status: 'green' | 'yellow' | 'red';
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
}

interface RootResponse {
  cluster_name?: string;
  version?: {number?: string};
}

const version = ref<Version | null>(null);
const clusterName = ref<string | null>(null);
const health = ref<ClusterHealth | null>(null);
const connected = ref(false);
const lastError = ref<RequestError | null>(null);
let poller: ReturnType<typeof setInterval> | null = null;
let versionWarned = false;

const alerts = useAlerts();

/**
 * One poll. Both calls are issued together and reported separately: a failing
 * health check must not also blank the version banner, and vice versa.
 */
async function refresh(): Promise<void> {
  const results = await requestAll({
    root: request<RootResponse>('/'),
    health: request<ClusterHealth>('/_cluster/health'),
  });

  if (results.root.value !== undefined) {
    const number = results.root.value.version?.number;
    clusterName.value = results.root.value.cluster_name ?? null;
    if (number !== undefined) {
      const parsed = new Version(number);
      version.value = parsed;
      // Warn once per page view, not once per poll.
      if (!versionWarned && parsed.valid && parsed.major < MIN_MAJOR) {
        versionWarned = true;
        alerts.warn('This version of kopf supports OpenSearch 2.x and later', `Detected ${number}`);
      }
    }
  }

  if (results.health.value !== undefined) {
    health.value = results.health.value;
  }

  const failure = results.root.error ?? results.health.error;
  connected.value = failure === undefined;
  lastError.value = failure ?? null;
  if (failure !== undefined) {
    reportOnce(failure);
  }
}

/**
 * The poll repeats every few seconds; without this an unreachable cluster
 * would push a fresh alert onto the stack forever.
 */
let reportedSignature: string | null = null;

function reportOnce(error: RequestError): void {
  const signature = `${error.status}:${error.message}`;
  if (signature === reportedSignature) {
    return;
  }
  reportedSignature = signature;
  alerts.error(
    error.isAuthFailure
      ? 'Not authorised to reach the search engine. Sign in to Fess again.'
      : error.message,
    error.body,
  );
}

export function startPolling(): void {
  if (poller !== null) {
    return;
  }
  void refresh();
  poller = setInterval(() => void refresh(), getSettings().refresh_rate);
}

export function stopPolling(): void {
  if (poller !== null) {
    clearInterval(poller);
    poller = null;
  }
}

export function useCluster() {
  return {
    version: readonly(version),
    clusterName: readonly(clusterName),
    health: readonly(health),
    connected: readonly(connected),
    lastError: readonly(lastError),
    hasConnection: computed(() => connected.value && health.value !== null),
    refresh,
  };
}
