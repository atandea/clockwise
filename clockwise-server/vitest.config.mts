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
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts'],
      reportsDirectory: './coverage',
    },
  },
});