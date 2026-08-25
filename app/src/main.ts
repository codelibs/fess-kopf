import {createApp} from 'vue';
import App from './App.vue';
import {router} from './router';
import {getSettings, loadSettings} from './api/settings';
import {useAlerts} from './composables/useAlerts';
import {loadLocale, preferredLanguage, t} from './i18n';
import {applyPalette, DARK, LIGHT} from './theme';
import './styles.css';

/**
 * Settings are loaded before mount because the REST base URL depends on them:
 * mounting first would let the first poll fire against the wrong host. The
 * message catalogue is loaded alongside for the same reason -- a screen that
 * renders in English and then swaps to Japanese is worse than one that waits.
 */
async function bootstrap(): Promise<void> {
  const [{ok, error}, locale] = await Promise.all([
    loadSettings(),
    loadLocale(preferredLanguage()),
  ]);
  // Assistive technology and CJK font selection both read this.
  document.documentElement.lang = locale;
  // 'fess' and 'light' are both the light palette; only 'dark' is not.
  const theme = getSettings().theme;
  const dark = theme === 'dark';
  document.documentElement.dataset.kopfTheme = theme;
  applyPalette(dark ? DARK : LIGHT, document.documentElement);
  createApp(App).use(router).mount('#app');
  if (!ok) {
    // Raised after mount so there is something on screen to raise it on. The
    // defaults are still usable, so this is a warning rather than a failure.
    useAlerts().warn(t('common.settingsUnreadable'), error);
  }
}

void bootstrap();
