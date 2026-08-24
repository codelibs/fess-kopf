import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {'@': fileURLToPath(new URL('./app/src', import.meta.url))},
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['app/tests/support/setup.ts'],
    include: ['app/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/src/**/*.{ts,vue}'],
    },
  },
});
