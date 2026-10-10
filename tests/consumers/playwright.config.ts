import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
const consumers = JSON.parse(readFileSync('output/packed-consumers.json', 'utf8'));
process.env.VARIANTHUB_RUNNER_CLI = consumers.cli;
export default defineConfig({
  testDir: '..', testMatch: ['e2e/local-runner.spec.ts', 'consumers/react.spec.ts'],
  workers: 1, timeout: 30_000, expect: { timeout: 7500 },
  outputDir: '../../output/packed-tests', reporter: 'list',
  use: { ...devices['Desktop Chrome'], ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {}),
    baseURL: 'http://127.0.0.1:4321', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm start', cwd: consumers.react, url: 'http://127.0.0.1:4321', reuseExistingServer: false },
});
