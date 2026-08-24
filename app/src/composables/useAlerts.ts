import {readonly, ref} from 'vue';

export type AlertLevel = 'error' | 'warn' | 'info' | 'success';

export interface Alert {
  id: number;
  level: AlertLevel;
  message: string;
  /** Parsed response body, shown when the user expands the alert. */
  response?: unknown;
  timestamp: string;
  expanded: boolean;
}

/** Matches the Angular service: only the three most recent alerts are kept. */
const MAX_ALERTS = 3;

/** Per level, in ms. Errors linger because they are the ones worth reading. */
const TIMEOUTS: Record<AlertLevel, number> = {
  error: 30000,
  warn: 5000,
  info: 2500,
  success: 2500,
};

const alerts = ref<Alert[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let sequence = 0;

function add(level: AlertLevel, message: string, response?: unknown, timeout?: number): number {
  const id = ++sequence;
  const at = new Date();
  alerts.value = [
    {
      id,
      level,
      message,
      response,
      timestamp: at.toTimeString().substring(0, 8),
      // An error worth reporting is worth showing the body of straight away.
      expanded: level === 'error' && response !== undefined,
    },
    ...alerts.value,
  ].slice(0, MAX_ALERTS);

  const ms = timeout ?? TIMEOUTS[level];
  timers.set(
    id,
    setTimeout(() => remove(id), ms),
  );
  return id;
}

function remove(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
  alerts.value = alerts.value.filter((a) => a.id !== id);
}

function clear(): void {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  alerts.value = [];
}

function toggle(id: number): void {
  alerts.value = alerts.value.map((a) => (a.id === id ? {...a, expanded: !a.expanded} : a));
}

export function useAlerts() {
  return {
    alerts: readonly(alerts),
    error: (message: string, response?: unknown, timeout?: number) =>
      add('error', message, response, timeout),
    warn: (message: string, response?: unknown, timeout?: number) =>
      add('warn', message, response, timeout),
    info: (message: string, response?: unknown, timeout?: number) =>
      add('info', message, response, timeout),
    success: (message: string, response?: unknown, timeout?: number) =>
      add('success', message, response, timeout),
    remove,
    clear,
    toggle,
  };
}
