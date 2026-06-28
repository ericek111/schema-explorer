import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageFetchClient } from '../src/client/services/PageFetchClient';

describe('PageFetchClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the server fetch API response shape', async () => {
    const fetchMock = vi.fn(async () => Response.json({ url: 'https://example.com/final', status: 200, text: '<html></html>' }));
    vi.stubGlobal('fetch', fetchMock);

    const page = await new PageFetchClient('api/fetch').fetchPage('https://example.com');

    expect(fetchMock).toHaveBeenCalledWith('api/fetch?url=https%3A%2F%2Fexample.com');
    expect(page).toEqual({ url: 'https://example.com/final', status: 200, text: '<html></html>' });
  });

  it('supports an app-base-qualified schema API endpoint', async () => {
    const fetchMock = vi.fn(async () => Response.json({ url: 'https://example.com/final', status: 200, text: '<html></html>' }));
    vi.stubGlobal('fetch', fetchMock);

    const page = await new PageFetchClient('/schema/api/fetch').fetchPage('https://example.com');

    expect(fetchMock).toHaveBeenCalledWith('/schema/api/fetch?url=https%3A%2F%2Fexample.com');
    expect(page).toEqual({ url: 'https://example.com/final', status: 200, text: '<html></html>' });
  });
});
