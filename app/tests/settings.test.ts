import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getSettings, loadSettings, resetSettingsForTest, updateSetting} from '@/api/settings';

const STORAGE = 'kopfSettings';

beforeEach(() => {
  resetSettingsForTest();
  localStorage.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

function serves(body: string, status = 200): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, {status})));
}

describe('loadSettings', () => {
  it('reads the shipped file', async () => {
    serves('{"theme":"dark","refresh_rate":1000}');
    await expect(loadSettings()).resolves.toEqual({ok: true});
    expect(getSettings().theme).toBe('dark');
    expect(getSettings().refresh_rate).toBe(1000);
  });

  it('fetches it from the kopf root, not the app directory', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    await loadSettings();
    expect(fetcher.mock.calls[0][0]).toBe(
      `${window.location.origin}/admin/server_tok/_plugin/kopf/kopf_external_settings.json`,
    );
  });

  it('keeps the defaults for keys the file omits', async () => {
    serves('{"theme":"dark"}');
    await loadSettings();
    expect(getSettings().refresh_rate).toBe(5000);
    expect(getSettings().with_credentials).toBe(false);
  });

  it('reports failure but still leaves usable defaults', async () => {
    serves('not found', 404);
    const result = await loadSettings();
    expect(result.ok).toBe(false);
    expect(getSettings().refresh_rate).toBe(5000);
  });

  it('survives a malformed file rather than refusing to boot', async () => {
    serves('{ this is not json');
    const result = await loadSettings();
    expect(result.ok).toBe(false);
    expect(getSettings().theme).toBe('fess');
  });

  it('lets a stored preference win over the shipped file', async () => {
    localStorage.setItem(STORAGE, JSON.stringify({theme: 'light'}));
    serves('{"theme":"dark"}');
    await loadSettings();
    expect(getSettings().theme).toBe('light');
  });

  it('ignores stored values for settings the user may not change', async () => {
    // location decides which cluster is administered; letting localStorage
    // set it would be a redirection primitive.
    localStorage.setItem(STORAGE, JSON.stringify({location: 'http://evil.example'}));
    serves('{}');
    await loadSettings();
    expect(getSettings().location).toBe('');
  });
});

describe('updateSetting', () => {
  it('persists only the updatable keys', () => {
    resetSettingsForTest({location: 'http://es.example'});
    updateSetting('theme', 'dark');
    expect(JSON.parse(localStorage.getItem(STORAGE) as string)).toEqual({
      refresh_rate: 5000,
      theme: 'dark',
    });
  });

  it('applies the change even when storage throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(() => updateSetting('refresh_rate', 2000)).not.toThrow();
    expect(getSettings().refresh_rate).toBe(2000);
    setItem.mockRestore();
  });
});
