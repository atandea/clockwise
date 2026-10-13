import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: {
      src: resolve(process.cwd(), 'src'),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
  },
});