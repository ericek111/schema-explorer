import type { FetchResult, FetchServiceOptions } from './FetchTypes.js';
import { LimitedResponseReader } from './LimitedResponseReader.js';

const defaultMaxBytes = 1_500_000;
const defaultTimeoutMs = 8_000;

export class HtmlFetchService {
  private readonly fetchImpl: typeof fetch;
  private readonly maxBytes: number;
  private readonly timeoutMs: number;

  constructor(
    options: FetchServiceOptions = {},
    private readonly reader = new LimitedResponseReader()
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxBytes = options.maxBytes ?? defaultMaxBytes;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  async fetch(url: URL): Promise<FetchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent': 'SchemaExplorer/1.0'
        }
      });

      return {
        url: response.url || url.toString(),
        status: response.status,
        text: await this.reader.read(response, this.maxBytes)
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Fetch timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
