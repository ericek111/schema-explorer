import type { JsonLdBlock, JsonValue } from '../SchemaTypes';
import { HtmlEntityDecoder } from './HtmlEntityDecoder';

export class JsonLdExtractor {
  private readonly scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  private readonly typePattern = /\btype\s*=\s*["']application\/ld\+json["']/i;

  constructor(private readonly decoder = new HtmlEntityDecoder()) {}

  extract(html: string): JsonLdBlock[] {
    const blocks: JsonLdBlock[] = [];
    let match: RegExpExecArray | null;
    let index = 0;

    this.scriptPattern.lastIndex = 0;
    while ((match = this.scriptPattern.exec(html))) {
      const attrs = match[1] ?? '';
      if (!this.typePattern.test(attrs)) {
        continue;
      }

      blocks.push(this.parseBlock(index, match[2].trim()));
      index += 1;
    }

    return blocks;
  }

  private parseBlock(index: number, encodedRaw: string): JsonLdBlock {
    const raw = this.decoder.decode(encodedRaw);
    try {
      return { index, raw, value: JSON.parse(raw) as JsonValue };
    } catch (error) {
      return { index, raw, error: error instanceof Error ? error.message : 'Invalid JSON' };
    }
  }
}
