import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// The Angular suite still runs under Jest (npm test runs both). This config
// covers the Vue app only; it goes away with src/ at the end of the migration.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {'@': fileURLToPath(new URL('./app/src', import.meta.url))},
  },
  test: {
    environment: 'jsdom',
    include: ['app/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/src/**/*.{ts,vue}'],
    },
  },
});
