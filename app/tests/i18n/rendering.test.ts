import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import CatView from '@/views/CatView.vue';
import CreateIndexView from '@/views/CreateIndexView.vue';
import App from '@/App.vue';
import {NConfigProvider} from 'naive-ui';
import {NAIVE_LOCALES} from '@/i18n/naive';
import {SUPPORTED} from '@/i18n/locale';
import {router} from '@/router';
import ja from '@/i18n/messages/ja.json';
import {resetSettingsForTest} from '@/api/settings';
import {useAlerts} from '@/composables/useAlerts';
import {loadLocale, resetI18nForTest} from '@/i18n';

/**
 * The catalogue tests prove the translations exist; these prove the wiring
 * reaches the screen. Without them a t() call that was never added to a
 * template would still pass every other test in the suite.
 */
const alerts = useAlerts();

beforeEach(() => {
  resetSettingsForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/');
});

afterEach(() => {
  resetI18nForTest();
  vi.unstubAllGlobals();
});

describe('a view rendered under a loaded locale', () => {
  it('renders headings and buttons from the active catalogue', async () => {
    await loadLocale('ja');
    const wrapper = mount(CatView);
    expect(wrapper.text()).toContain(ja['cat.title']);
    expect(wrapper.text()).toContain(ja['cat.sub']);
    expect(wrapper.text()).toContain(ja['common.execute']);
  });

  it('renders English when nothing asked for another language', () => {
    const wrapper = mount(CatView);
    expect(wrapper.text()).toContain('Cat APIs');
    expect(wrapper.text()).toContain('execute');
  });

  it('leaves the navigation and API vocabulary in the original', async () => {
    await loadLocale('ja');
    const wrapper = mount(CreateIndexView);
    // Field labels name OpenSearch parameters; translating them would break
    // the correspondence with the API the operator is reading beside this.
    expect(wrapper.text()).toContain('index name');
    expect(wrapper.text()).toContain('shards');
    expect(wrapper.text()).toContain('replicas');
  });

  it('substitutes into a translated alert', async () => {
    await loadLocale('ja');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"acknowledged":true}', {status: 200})),
    );
    const wrapper = mount(CreateIndexView);
    await wrapper.find('#ci-name').setValue('fess.20260101');
    await wrapper.find('form').trigger('submit');
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Not [0]: the cluster refresh that follows a successful create raises
    // its own alert against this stubbed response, and alerts are prepended.
    const messages = alerts.alerts.value.map((alert) => alert.message);
    expect(messages).toContain('インデックス fess.20260101 を作成しました');
  });
});

describe("Naive UI's own strings", () => {
  it('follow the resolved locale, so a form is not half English', async () => {
    await loadLocale('ja');
    await router.push('/cluster');
    await router.isReady();
    const wrapper = mount(App, {global: {plugins: [router]}});
    // NInput's placeholder is Naive UI's, not kopf's: without NConfigProvider
    // receiving a locale it reads "Please Input" inside a Japanese form.
    expect(NAIVE_LOCALES.ja.Input.placeholder).not.toBe(NAIVE_LOCALES.en.Input.placeholder);
    expect(wrapper.findComponent(NConfigProvider).props('locale')).toBe(NAIVE_LOCALES.ja);
  });

  it('covers every locale Fess ships a bundle for', () => {
    expect(Object.keys(NAIVE_LOCALES).sort()).toEqual([...SUPPORTED].sort());
  });
});
