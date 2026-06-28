export interface FetchResponse {
  url: string;
  status: number;
  text: string;
  error?: string;
}

export class PageFetchClient {
  constructor(private readonly endpoint = 'api/fetch') {}

  async fetchPage(url: string): Promise<FetchResponse> {
    const response = await fetch(`${this.endpoint}?url=${encodeURIComponent(url)}`);
    const payload = (await response.json()) as FetchResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error ?? `Fetch failed with HTTP ${response.status}`);
    }
    return payload;
  }
}
