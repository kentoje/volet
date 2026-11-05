import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.ts',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  // Each test launches its own Chromium with the extension; keep them sequential.
  workers: 1,
  reporter: [['list']],
});
