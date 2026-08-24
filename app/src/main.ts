import {createApp} from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App.vue';
import {router} from './router';
import {getSettings, loadSettings} from './api/settings';
import {useAlerts} from './composables/useAlerts';
import './styles.css';

/**
 * Settings are loaded before mount because the REST base URL depends on them:
 * mounting first would let the first poll fire against the wrong host.
 */
async function bootstrap(): Promise<void> {
  const {ok, error} = await loadSettings();
  // Bootstrap 5.3 reads data-bs-theme; 'fess' and 'light' are both light.
  const theme = getSettings().theme;
  document.documentElement.dataset.kopfTheme = theme;
  document.documentElement.dataset.bsTheme = theme === 'dark' ? 'dark' : 'light';
  createApp(App).use(router).mount('#app');
  if (!ok) {
    // Raised after mount so there is something on screen to raise it on. The
    // defaults are still usable, so this is a warning rather than a failure.
    useAlerts().warn('Could not read kopf_external_settings.json; using defaults', error);
  }
}

void bootstrap();
