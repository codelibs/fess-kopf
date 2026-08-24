import {createApp} from 'vue';
import App from './App.vue';
import {router} from './router';
import {getSettings, loadSettings} from './api/settings';
import {useAlerts} from './composables/useAlerts';
import {applyPalette, DARK, LIGHT} from './theme';
import './styles.css';

/**
 * Settings are loaded before mount because the REST base URL depends on them:
 * mounting first would let the first poll fire against the wrong host.
 */
async function bootstrap(): Promise<void> {
  const {ok, error} = await loadSettings();
  // 'fess' and 'light' are both the light palette; only 'dark' is not.
  const theme = getSettings().theme;
  const dark = theme === 'dark';
  document.documentElement.dataset.kopfTheme = theme;
  applyPalette(dark ? DARK : LIGHT, document.documentElement);
  createApp(App).use(router).mount('#app');
  if (!ok) {
    // Raised after mount so there is something on screen to raise it on. The
    // defaults are still usable, so this is a warning rather than a failure.
    useAlerts().warn('Could not read kopf_external_settings.json; using defaults', error);
  }
}

void bootstrap();
