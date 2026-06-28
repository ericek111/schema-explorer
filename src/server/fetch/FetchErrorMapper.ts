import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class FetchErrorMapper {
  toStatus(error: unknown): ContentfulStatusCode {
    const message = this.toMessage(error);
    if (message.includes('too large')) {
      return 413;
    }
    if (message.includes('timed out')) {
      return 504;
    }
    return 502;
  }

  toMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Fetch failed';
  }
}
