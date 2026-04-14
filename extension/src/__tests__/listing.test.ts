import { describe, expect, it } from 'vitest';
import { parseListingHtml } from '../listing';

describe('parseListingHtml', () => {
  it('parses relative and absolute listing anchors', () => {
    const html = `
      <pre>
        <a href="details.json">details.json</a>
        <a href="console.2026-03-04-09.log.gz">console.2026-03-04-09.log.gz</a>
        <a href="https://rageshakes.example.com/api/listing/demo/screenshot.png">screenshot.png</a>
      </pre>
    `;

    const result = parseListingHtml(
      html,
      'https://rageshakes.example.com/api/listing/demo/'
    );

    expect(result.detailsUrl).toBe('https://rageshakes.example.com/api/listing/demo/details.json');
    expect(result.entries).toEqual([
      {
        name: 'details.json',
        url: 'https://rageshakes.example.com/api/listing/demo/details.json',
      },
      {
        name: 'console.2026-03-04-09.log.gz',
        url: 'https://rageshakes.example.com/api/listing/demo/console.2026-03-04-09.log.gz',
      },
      {
        name: 'screenshot.png',
        url: 'https://rageshakes.example.com/api/listing/demo/screenshot.png',
      },
    ]);
  });

  it('ignores parent-directory links', () => {
    const html = `
      <pre>
        <a href="../">../</a>
        <a href="logs.log.gz">logs.log.gz</a>
      </pre>
    `;

    const result = parseListingHtml(
      html,
      'https://rageshakes.example.com/api/listing/demo/'
    );

    expect(result.entries).toEqual([
      {
        name: 'logs.log.gz',
        url: 'https://rageshakes.example.com/api/listing/demo/logs.log.gz',
      },
    ]);
  });
});