export class LimitedResponseReader {
  async read(response: Response, maxBytes: number): Promise<string> {
    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Response body is too large. Limit is ${maxBytes} bytes.`);
      }

      chunks.push(value);
    }

    return new TextDecoder().decode(this.concat(chunks, total));
  }

  private concat(chunks: Uint8Array[], total: number): Uint8Array {
    const output = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return output;
  }
}
