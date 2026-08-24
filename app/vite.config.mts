import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';

// .mts, not .ts: the repo's package.json has no "type": "module" because
// Gruntfile.js, jest.config.js, eslint.config.js and scripts/ are CommonJS.

// Fess serves this bundle from a path that is only known at runtime:
// <context>/admin/server_<per-request token>/_plugin/kopf/... . Every asset
// reference therefore has to be document-relative, which is what base: './'
// produces (Vite resolves dynamic chunks through import.meta.url).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {'@': fileURLToPath(new URL('./src', import.meta.url))},
  },
  // favicon.ico and kopf_external_settings.json are copied verbatim from here,
  // so _site is entirely build output and emptyOutDir cannot delete something
  // that is not regenerated.
  publicDir: 'public',
  build: {
    outDir: '../_site',
    emptyOutDir: true,
    // Fess sets no Content-Type for extensions outside its own map, and .map
    // is not in it. Shipping source maps would also re-add the ~478 kB the
    // Grunt build currently ships untyped.
    sourcemap: false,
  },
});
