import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A fresh database per run: tests never touch a developer's saved projects.
const testData = mkdtempSync(join(tmpdir(), 'duo-e2e-'));
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5183', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'python3 app.py',
      cwd: '../steamprofiler-duo-api',
      env: {
        DUO_ENV: 'development',
        DUO_ORIGIN: 'http://127.0.0.1:5183',
        DUO_DEV_LOGIN: '1',
        DUO_DB: join(testData, 'duo.sqlite3'),
        DUO_PORT: '16301',
        DUO_BIND: '127.0.0.1',
      },
      url: 'http://127.0.0.1:16301/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5183',
      env: { DUO_API_TARGET: 'http://127.0.0.1:16301' },
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: false,
    },
  ],
});
