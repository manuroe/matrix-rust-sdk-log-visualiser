import { defineConfig, mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import codspeedPlugin from '@codspeed/vitest-plugin'

// https://vite.dev/config/
export default mergeConfig(
  defineConfig({
    plugins: [react()],
    base: process.env.VITE_BASE || '/matrix-rust-sdk-log-visualiser/',
  }),
  defineVitestConfig({
    plugins: [codspeedPlugin()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      globals: true,
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.perf.test.ts'],
      benchmark: {
        include: ['**/*.perf.test.ts'],
      },
      coverage: {
        provider: 'istanbul',
        all: true,
        include: ['src/**/*.{ts,tsx}'],
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        exclude: [
          'src/test/**',
          '**/__tests__/**',
          '**/*.test.ts',
          '**/*.test.tsx',
          'scripts/**',
          'vite.config.ts',
          'eslint.config.js',
        ],
      },
    },
  })
);
