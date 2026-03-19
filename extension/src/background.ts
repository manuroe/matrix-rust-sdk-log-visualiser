/**
 * Extension background service worker.
 *
 * Handles two message types from the content script:
 *
 * - `fetchAndSummarize`: Fetches a `.log.gz` URL, decompresses it via the
 *   native `DecompressionStream` API, runs `summarizeLog`, and replies with
 *   the resulting `LogSummary`.
 *
 * - `fetchAndStore`: Fetches the raw (compressed) gz bytes for a given URL,
 *   encodes them as base64, stores them in `chrome.storage.session` under the
 *   provided key, and replies with `{ ok: true }`. The viewer page later reads
 *   this key, reconstructs a `File` object, and passes it to the existing app
 *   upload flow which already handles gz decompression.
 *
 * Both fetch calls use `credentials: 'include'` so that the user's existing
 * rageshakes session cookies are forwarded — allowing authenticated access to
 * private listing pages without requiring the user to re-authenticate.
 *
 * Note: This service worker runs with broad host_permissions so it can fetch
 * log files from any rageshake server deployment, which is what allows the
 * credentialed cross-origin fetch to succeed.
 */

import { summarizeLog } from './summarize';
import type { LogSummary } from './summarize';

// ── Message types ──────────────────────────────────────────────────────────

/** Request the background to fetch, decompress, parse, and summarise a log. */
interface FetchAndSummarizeMessage {
  readonly type: 'fetchAndSummarize';
  readonly url: string;
}

/**
 * Request the background to fetch raw gz bytes, encode as base64, and store
 * in `chrome.storage.session` under `key`. Used by the "Open in Visualizer"
 * flow: the viewer page retrieves this key and reconstructs a File object.
 */
interface FetchAndStoreMessage {
  readonly type: 'fetchAndStore';
  readonly url: string;
  /** Storage key under which the base64 gz data is stored. */
  readonly key: string;
}

type BackgroundMessage = FetchAndSummarizeMessage | FetchAndStoreMessage;

/** Successful response for `fetchAndSummarize`. */
interface SummarizeResponse {
  readonly ok: true;
  readonly summary: LogSummary;
}

/** Successful response for `fetchAndStore`. */
interface StoreResponse {
  readonly ok: true;
}

/** Error response for any message type. */
interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
}

type BackgroundResponse = SummarizeResponse | StoreResponse | ErrorResponse;

// ── Helpers ────────────────────────────────────────────────────────────────

const GZIP_MAGIC_BYTE_1 = 0x1f;
const GZIP_MAGIC_BYTE_2 = 0x8b;

function isGzipBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 2 &&
    bytes[0] === GZIP_MAGIC_BYTE_1 &&
    bytes[1] === GZIP_MAGIC_BYTE_2
  );
}

/**
 * Decompress gzip bytes and return plain-text content.
 * Uses the native `DecompressionStream` — no external dependencies needed.
 */
async function decompressGzipBytes(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  // TypeScript infers `Uint8Array<ArrayBufferLike>` but Blob only accepts
  // `ArrayBufferView<ArrayBuffer>`; the cast is safe in all browser runtimes.
  const decompressedStream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(ds);
  const reader = decompressedStream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8').decode(merged);
}

async function decodeLogTextFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (isGzipBytes(bytes)) {
    return decompressGzipBytes(bytes);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Encode an `ArrayBuffer` as a base64 string.
 * Works in service worker contexts (no `btoa` length limit issue since we
 * use chunked conversion).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Process in 64 KB chunks to avoid call-stack overflow on large files.
  const CHUNK = 65536;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse: (r: BackgroundResponse) => void) => {
    if (message.type === 'fetchAndSummarize') {
      handleFetchAndSummarize(message.url).then(sendResponse).catch((err: unknown) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
      });
      // Return true to keep the message channel open for the async response.
      return true;
    }

    if (message.type === 'fetchAndStore') {
      handleFetchAndStore(message.url, message.key).then(sendResponse).catch((err: unknown) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
      });
      return true;
    }

    return false;
  }
);

async function handleFetchAndSummarize(url: string): Promise<SummarizeResponse | ErrorResponse> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status} fetching ${url}` };
  }
  const buffer = await response.arrayBuffer();
  const text = await decodeLogTextFromBuffer(buffer);
  const summary = summarizeLog(text);
  return { ok: true, summary };
}

async function handleFetchAndStore(url: string, key: string): Promise<StoreResponse | ErrorResponse> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status} fetching ${url}` };
  }
  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  // Extract plain filename from URL (e.g. "console.2026-03-04-09.log.gz")
  const fileName = url.split('/').pop() ?? 'log.gz';
  await chrome.storage.session.set({ [key]: { base64, fileName } });
  return { ok: true };
}
