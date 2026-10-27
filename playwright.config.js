import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  outputDir: 'docs/verification/2026-10-26-phase4/browser-results',
  reporter: [['list'], ['json', { outputFile: 'docs/verification/2026-10-26-phase4/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
})
