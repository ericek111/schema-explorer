import { describe, expect, it } from 'vitest';
import { SchemaExplorerApp } from '../src/server/SchemaExplorerApp';

const html = '<!doctype html><title>ok</title>';
const createTestApp = (options: ConstructorParameters<typeof SchemaExplorerApp>[0] = {}) => new SchemaExplorerApp(options).hono();

describe('/schema/api/fetch', () => {
  it('requires a valid http or https URL', async () => {
    const app = createTestApp();
    expect((await app.request('/schema/api/fetch')).status).toBe(400);
    expect((await app.request('/schema/api/fetch?url=ftp%3A%2F%2Fexample.com')).status).toBe(400);
  });

  it('returns fetched text, final URL, and upstream status', async () => {
    const app = createTestApp({
      fetchImpl: async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })
    });
    const response = await app.request('/schema/api/fetch?url=https%3A%2F%2Fexample.com');
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ status: 200, text: html });
  });

  it('maps failed upstream responses to a proxy error while preserving upstream status', async () => {
    const app = createTestApp({
      fetchImpl: async () => new Response('not found', { status: 404 })
    });
    const response = await app.request('/schema/api/fetch?url=https%3A%2F%2Fexample.com%2Fmissing');
    const payload = await response.json();
    expect(response.status).toBe(502);
    expect(payload).toMatchObject({ status: 404, text: 'not found' });
  });

  it('enforces the response size limit', async () => {
    const app = createTestApp({
      maxBytes: 4,
      fetchImpl: async () => new Response('too large')
    });
    const response = await app.request('/schema/api/fetch?url=https%3A%2F%2Fexample.com');
    expect(response.status).toBe(413);
  });

  it('enforces the fetch timeout', async () => {
    const app = createTestApp({
      timeoutMs: 1,
      fetchImpl: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    });
    const response = await app.request('/schema/api/fetch?url=https%3A%2F%2Fexample.com');
    expect(response.status).toBe(504);
  });

  it('mounts the fetch API under a configured subdirectory', async () => {
    const app = createTestApp({
      basePath: '/explorer',
      fetchImpl: async () => new Response(html, { status: 200 })
    });

    expect((await app.request('/schema/api/fetch?url=https%3A%2F%2Fexample.com')).status).toBe(404);
    expect((await app.request('/explorer/api/fetch?url=https%3A%2F%2Fexample.com')).status).toBe(200);
  });

  it('can mount the fetch API at the site root', async () => {
    const app = createTestApp({
      basePath: '/',
      fetchImpl: async () => new Response(html, { status: 200 })
    });

    expect((await app.request('/api/fetch?url=https%3A%2F%2Fexample.com')).status).toBe(200);
  });
});
