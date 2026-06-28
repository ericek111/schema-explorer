export interface FetchResult {
  url: string;
  status: number;
  text: string;
}

export interface FetchServiceOptions {
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
}
