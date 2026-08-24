import {beforeEach, describe, expect, it} from 'vitest';
import {
  closeInfo,
  confirm,
  resetDialogsForTest,
  resolveConfirm,
  showInfo,
  useDialogs,
} from '@/composables/useDialogs';

const dialogs = useDialogs();

beforeEach(() => resetDialogsForTest());

describe('confirm', () => {
  it('exposes the request while it is open', () => {
    void confirm('header', 'body', 'Delete');
    expect(dialogs.confirmRequest.value).toEqual({
      header: 'header',
      body: 'body',
      confirmText: 'Delete',
    });
  });

  it('resolves true when accepted and clears the request', async () => {
    const answer = confirm('h', 'b', 'ok');
    resolveConfirm(true);
    await expect(answer).resolves.toBe(true);
    expect(dialogs.confirmRequest.value).toBeNull();
  });

  it('resolves false when declined', async () => {
    const answer = confirm('h', 'b', 'ok');
    resolveConfirm(false);
    await expect(answer).resolves.toBe(false);
  });

  it('never leaves a caller waiting when a second request arrives', async () => {
    // A stranded promise here would leave a destructive action half-issued.
    const first = confirm('first', 'b', 'ok');
    const second = confirm('second', 'b', 'ok');
    await expect(first).resolves.toBe(false);
    resolveConfirm(true);
    await expect(second).resolves.toBe(true);
  });
});

describe('info', () => {
  it('carries the title and content, and clears on close', () => {
    showInfo('settings for idx', {a: 1});
    expect(dialogs.infoRequest.value).toEqual({title: 'settings for idx', content: {a: 1}});
    closeInfo();
    expect(dialogs.infoRequest.value).toBeNull();
  });
});
