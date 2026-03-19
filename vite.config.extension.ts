/**
 * Vite build configuration for the browser extension.
 *
 * Produces three artefacts in `extension-dist/`:
 *
 * 1. `content.js`   — IIFE content script (injected into rageshakes listing pages)
 * 2. `content.css`  — Styles injected alongside the content script (copied as-is)
 * 3. `background.js` — ES module service worker
 * 4. `viewer.html` + `assets/` — Full React app served as an extension page;
 *    the `useExtensionFile` hook auto-loads the log on open.
 *
 * The `extension/manifest.json` is copied verbatim into `extension-dist/`, so
 * loading `extension-dist/` as an unpacked extension in Chrome/Firefox is all
 * that is needed for development.
 *
 * Run: `npm run build:extension`
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

const root = resolve(__dirname);
const outDir = resolve(root, 'extension-dist');

export default defineConfig({
  plugins: [
    react(),
    // Copy manifest.json and content.css into the output directory after build.
    {
      name: 'copy-extension-assets',
      closeBundle() {
        mkdirSync(outDir, { recursive: true });
        copyFileSync(
          resolve(root, 'extension/manifest.json'),
          resolve(outDir, 'manifest.json')
        );
        copyFileSync(
          resolve(root, 'extension/src/content.css'),
          resolve(outDir, 'content.css')
        );
      },
    },
  ],
  // Resolve `../../src/...` imports inside extension/src/ correctly.
  resolve: {
    alias: {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Vite alias convention uses @-prefix paths
      '@app': resolve(root, 'src'),
    },
  },
  // Use the extension viewer.html as the root HTML entry so Vite bundles the
  // full React app into extension-dist/viewer.html + assets/.
  root: resolve(root, 'extension'),
  base: './',
  build: {
    outDir,
    emptyOutDir: true,
    // Build both the viewer SPA and the two extension scripts in one pass.
    rollupOptions: {
      input: {
        // Viewer page — bundles the full React app (entry: extension/viewer.html).
        viewer: resolve(root, 'extension/viewer.html'),
        // Background service worker.
        background: resolve(root, 'extension/src/background.ts'),
        // Content script — must be IIFE so it runs immediately without a module loader.
        content: resolve(root, 'extension/src/content.ts'),
      },
      output: {
        // Flat filenames for background and content scripts so manifest.json
        // references stay simple (no hashed filenames needed for these).
        entryFileNames: (chunk) => {
          if (chunk.name === 'background' || chunk.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // IIFE format for content script so it executes in the page context
        // without needing a module loader. background and viewer keep ESM.
        format: 'es',
      },
    },
  },
});
