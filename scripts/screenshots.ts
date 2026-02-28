/**
 * Captures screenshots of the app using the demo log.
 * Requires a build with VITE_BASE=/ (handled automatically by this script).
 * Output: public/demo/screenshot-*.png
 *
 * Usage: npm run screenshots
 */
import { chromium } from '@playwright/test';
import { spawnSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const ROOT = resolve(currentDirPath, '..');
const OUT_DIR = resolve(ROOT, 'public', 'demo');
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const VITE_BIN = resolve(ROOT, 'node_modules', '.bin', 'vite');

// Build the app with VITE_BASE=/ so assets resolve correctly on localhost
console.warn('Building app...');
const buildResult = spawnSync(VITE_BIN, ['build'], {
  cwd: ROOT,
  stdio: 'inherit',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  env: { ...process.env, VITE_BASE: '/' },
});
if (buildResult.status !== 0) {
  console.error('Build failed.');
  process.exit(1);
}


async function waitForServer(url: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      // Any HTTP response means the server is up
      if (res.status) return;
    } catch {
      // Not ready yet
    }
    await new Promise<void>((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

const server = spawn(VITE_BIN, ['preview', '--port', String(PORT), '--base', '/'], {
  cwd: ROOT,
  stdio: 'inherit',
});

async function main(): Promise<void> {
  await waitForServer(BASE_URL);
  console.warn('Preview server ready.');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  async function setTheme(theme: 'light' | 'dark'): Promise<void> {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    // Let CSS transitions settle
    await page.waitForTimeout(300);
  }

  async function shot(name: string): Promise<void> {
    await page.screenshot({ path: `${OUT_DIR}/screenshot-${name}.png` });
    console.warn(`✓ screenshot-${name}.png`);
  }

  // Landing page
  await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle' });
  // Extra wait for React to complete its initial render
  await page.waitForTimeout(800);
  await setTheme('light');
  await shot('landing-light');
  await setTheme('dark');
  await shot('landing-dark');

  // Load demo data.
  await setTheme('light');
  const demoTrigger = page.locator('button, a', { hasText: 'Try with demo logs' }).first();
  await demoTrigger.waitFor({ state: 'visible', timeout: 15_000 });
  await demoTrigger.click();
  await page.waitForURL(/\/#\/summary/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  // Summary
  await shot('summary-light');
  await setTheme('dark');
  await shot('summary-dark');

  // Logs
  await page.goto(`${BASE_URL}/#/logs`);
  await page.waitForTimeout(600);
  await setTheme('light');
  await shot('logs-light');
  await setTheme('dark');
  await shot('logs-dark');

  // HTTP requests
  await page.goto(`${BASE_URL}/#/http_requests`);
  await page.waitForTimeout(600);
  await setTheme('light');
  await shot('http-light');
  await setTheme('dark');
  await shot('http-dark');

  // Sync waterfall
  await page.goto(`${BASE_URL}/#/http_requests/sync`);
  await page.waitForTimeout(600);
  await setTheme('light');
  await shot('sync-light');
  await setTheme('dark');
  await shot('sync-dark');

  await browser.close();
  console.warn('All screenshots captured.');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
  });
