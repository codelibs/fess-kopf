import {readonly, ref} from 'vue';

interface ConfirmRequest {
  header: string;
  body: string;
  confirmText: string;
}

interface InfoRequest {
  title: string;
  content: unknown;
}

const confirmRequest = ref<ConfirmRequest | null>(null);
const infoRequest = ref<InfoRequest | null>(null);
let settle: ((confirmed: boolean) => void) | null = null;

/**
 * Asks the user to confirm a destructive action.
 *
 * Resolves true only when they accept. The AngularJS ConfirmDialogService took
 * a callback; a promise keeps the caller's control flow in one place, which
 * matters when the action is "delete this index".
 */
export function confirm(header: string, body: string, confirmText: string): Promise<boolean> {
  // A second request while one is open would strand the first promise.
  settle?.(false);
  confirmRequest.value = {header, body, confirmText};
  return new Promise<boolean>((resolve) => {
    settle = resolve;
  });
}

export function resolveConfirm(confirmed: boolean): void {
  confirmRequest.value = null;
  settle?.(confirmed);
  settle = null;
}

/** Shows a read-only JSON payload, e.g. index settings or node stats. */
export function showInfo(title: string, content: unknown): void {
  infoRequest.value = {title, content};
}

export function closeInfo(): void {
  infoRequest.value = null;
}

/** Test seam. */
export function resetDialogsForTest(): void {
  settle?.(false);
  settle = null;
  confirmRequest.value = null;
  infoRequest.value = null;
}

export function useDialogs() {
  return {
    confirmRequest: readonly(confirmRequest),
    infoRequest: readonly(infoRequest),
    confirm,
    resolveConfirm,
    showInfo,
    closeInfo,
  };
}
